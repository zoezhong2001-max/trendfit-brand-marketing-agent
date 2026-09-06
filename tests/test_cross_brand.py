import copy
import json
import unittest
from pathlib import Path

from trendfit.cross_brand import validate_cross_brand_run


ROOT = Path(__file__).resolve().parents[1]


class CrossBrandTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / "examples/cross_brand_demo.json").read_text())

    def test_two_categories_share_one_topic_pool(self):
        result = validate_cross_brand_run(self.data)
        self.assertTrue(result["valid"])
        self.assertEqual(result["brands"], 2)
        self.assertEqual(result["categories"], 2)
        self.assertEqual(result["assessments"], 6)

    def test_topic_cannot_embed_a_brand(self):
        self.data["topics"][0]["brand_id"] = "BR-NAIXUE"
        with self.assertRaisesRegex(ValueError, "independent"):
            validate_cross_brand_run(self.data)

    def test_every_brand_topic_pair_is_required(self):
        self.data["assessments"].pop()
        with self.assertRaisesRegex(ValueError, "matrix is incomplete"):
            validate_cross_brand_run(self.data)

    def test_stale_brand_version_is_rejected(self):
        self.data["brands"][0]["version"] = 2
        with self.assertRaisesRegex(ValueError, "stale brand"):
            validate_cross_brand_run(self.data)

    def test_unverified_topic_cannot_produce_ready_brief(self):
        self.data["briefs"][0]["status"] = "ready_for_planning"
        with self.assertRaisesRegex(ValueError, "unverified trend"):
            validate_cross_brand_run(self.data)

    def test_rejected_assessment_cannot_have_a_brief(self):
        rejected = copy.deepcopy(self.data["briefs"][0])
        rejected.update(
            id="BF-PETLIBRO-WORKDAY",
            assessment_id="AS-PETLIBRO-WORKDAY",
            brand_id="BR-PETLIBRO",
        )
        self.data["briefs"].append(rejected)
        with self.assertRaisesRegex(ValueError, "rejected assessment"):
            validate_cross_brand_run(self.data)


if __name__ == "__main__":
    unittest.main()
