import copy
import json
import unittest
from pathlib import Path
from trendfit.evidence import canonical_content_key, compare_snapshots
from trendfit.validation import validate_bundle

ROOT = Path(__file__).resolve().parents[1]


class TrendFitTests(unittest.TestCase):
    def setUp(self):
        self.bundle = json.loads((ROOT / "examples/petlibro_demo.json").read_text())

    def test_demo_is_traceable_but_unqualified(self):
        result = validate_bundle(self.bundle)
        self.assertTrue(result["valid"])
        self.assertFalse(result["qualified_hot_brief"])

    def test_case_cannot_replace_external_trend(self):
        self.bundle["materials"][0]["role"] = "case_method"
        with self.assertRaisesRegex(ValueError, "case methods"):
            validate_bundle(self.bundle)

    def test_unknown_heat_blocks_ready_brief(self):
        self.bundle["brief"].update(status="ready_for_planning", qualified_hot_brief=True)
        with self.assertRaisesRegex(ValueError, "unverified trend"):
            validate_bundle(self.bundle)

    def test_stale_topic_version_is_rejected(self):
        self.bundle["topic"]["version"] += 1
        with self.assertRaisesRegex(ValueError, "stale topic"):
            validate_bundle(self.bundle)

    def test_missing_brand_transformation_is_rejected(self):
        self.bundle["brief"]["brand_transformation"] = ""
        with self.assertRaisesRegex(ValueError, "brand transformation"):
            validate_bundle(self.bundle)

    def test_signed_urls_are_one_item(self):
        one = "https://www.xiaohongshu.com/explore/aaaaaaaaaaaaaaaaaaaaaaaa?xsec_token=1"
        two = "https://www.xiaohongshu.com/search_result/aaaaaaaaaaaaaaaaaaaaaaaa?xsec_token=2"
        self.assertEqual(canonical_content_key(one), canonical_content_key(two))

    def test_item_delta_does_not_prove_topic_growth(self):
        base = {"url":"https://www.douyin.com/video/123", "scope":"engagement", "quality":"usable",
                "captured_at":"2026-09-03T10:00:00+08:00", "metrics":{"likes":"10"}}
        later = copy.deepcopy(base)
        later.update(captured_at="2026-09-03T11:00:00+08:00", metrics={"likes":"13"})
        result = compare_snapshots(base, later)
        self.assertEqual(result["deltas"]["likes"]["change"], 3)
        self.assertFalse(result["proves_topic_growth"])


if __name__ == "__main__":
    unittest.main()
