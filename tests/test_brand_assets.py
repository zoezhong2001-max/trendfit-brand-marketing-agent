import copy
import json
import unittest
from pathlib import Path

from trendfit.brand_assets import snapshot_content_hash, validate_brand_asset_run


ROOT = Path(__file__).resolve().parents[1]


class BrandAssetTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / "examples/brand_assets_v040.json").read_text())

    def item(self, item_id):
        return next(row for row in self.data["catalog_items"] if row["id"] == item_id)

    def refresh_hashes(self):
        for snapshot in self.data["brand_asset_snapshots"]:
            snapshot["content_hash"] = snapshot_content_hash(snapshot)

    def test_three_product_shapes_share_one_contract(self):
        result = validate_brand_asset_run(self.data)
        self.assertTrue(result["valid"])
        self.assertEqual(result["brands"], 3)
        self.assertEqual(result["catalog_items"], 6)
        self.assertEqual(
            result["item_types"], ["menu_item", "physical_product", "service"]
        )
        self.assertFalse(result["semantic_truth_verified_by_code"])
        self.assertFalse(result["automatically_published"])

    def test_overseas_availability_does_not_make_china_item_eligible(self):
        item = self.item("CI-PETLIBRO-FEEDER")
        self.assertEqual(item["marketing_readiness"], "needs_review")
        item["marketing_readiness"] = "eligible"
        with self.assertRaisesRegex(ValueError, "derives needs_review"):
            validate_brand_asset_run(self.data)

    def test_retired_product_cannot_be_declared_eligible(self):
        self.item("CI-NAIXUE-SUMMER-TEA")["marketing_readiness"] = "eligible"
        with self.assertRaisesRegex(ValueError, "derives expired"):
            validate_brand_asset_run(self.data)

    def test_service_requires_area_and_confirmed_fulfillment(self):
        item = self.item("CI-BREEZECARE-AC-CLEAN")
        item["attributes"]["service_area"] = []
        item["marketing_readiness"] = "needs_review"
        self.refresh_hashes()
        result = validate_brand_asset_run(self.data)
        self.assertTrue(result["valid"])
        item["marketing_readiness"] = "eligible"
        with self.assertRaisesRegex(ValueError, "derives needs_review"):
            validate_brand_asset_run(self.data)

    def test_unknown_fact_cannot_contain_an_invented_value(self):
        item = self.item("CI-NAIXUE-WORKDAY-TEA")
        item["value_proposition"] = {
            "value": "invented",
            "fact_status": "unknown",
            "review_status": "unreviewed",
            "evidence_refs": [],
        }
        with self.assertRaisesRegex(ValueError, "cannot invent"):
            validate_brand_asset_run(self.data)

    def test_cross_brand_claim_is_rejected(self):
        item = self.item("CI-PETLIBRO-FEEDER")
        item["claim_refs"] = ["CL-NAIXUE-SENSORY-REST"]
        with self.assertRaisesRegex(ValueError, "another brand"):
            validate_brand_asset_run(self.data)

    def test_snapshot_requires_exact_asset_versions(self):
        snapshot = copy.deepcopy(self.data["brand_asset_snapshots"][1])
        snapshot["catalog_items"][0]["version"] = 99
        snapshot["content_hash"] = snapshot_content_hash(snapshot)
        self.data["brand_asset_snapshots"][1] = snapshot
        with self.assertRaisesRegex(ValueError, "cover.*exactly"):
            validate_brand_asset_run(self.data)

    def test_snapshot_hash_detects_reference_changes(self):
        snapshot = self.data["brand_asset_snapshots"][0]
        snapshot["content_hash"] = "sha256:" + "0" * 64
        with self.assertRaisesRegex(ValueError, "content hash mismatch"):
            validate_brand_asset_run(self.data)

    def test_missing_evidence_reference_is_rejected(self):
        self.item("CI-NAIXUE-BAKERY-SET")["source_refs"] = ["EV-MISSING"]
        with self.assertRaisesRegex(ValueError, "unknown evidence"):
            validate_brand_asset_run(self.data)

    def test_readiness_summary_is_deterministic(self):
        result = validate_brand_asset_run(self.data)
        self.assertEqual(
            result["readiness_counts"],
            {"blocked": 0, "eligible": 2, "expired": 1, "needs_review": 3},
        )


if __name__ == "__main__":
    unittest.main()
