import copy
import json
import tempfile
import unittest
from pathlib import Path

from trendfit.views import build_views, validate_feedback, write_views


ROOT = Path(__file__).resolve().parents[1]


class ViewTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / "examples/cross_brand_demo.json").read_text())
        self.views = build_views(self.data)

    def test_views_cover_frontend_entities(self):
        self.assertEqual(len(self.views["brands.json"]["brands"]), 2)
        self.assertEqual(len(self.views["trends.json"]["trends"]), 3)
        self.assertEqual(len(self.views["opportunities.json"]["opportunities"]), 6)
        self.assertEqual(len(self.views["briefs.json"]["briefs"]), 4)

    def test_brand_switch_uses_one_shared_trend(self):
        trend = self.views["trends.json"]["trends"][0]
        decisions = {row["brand_name"]: row["decision"] for row in trend["brand_results"]}
        self.assertEqual(decisions, {"Petlibro": "not_recommend", "奈雪的茶": "recommend"})

    def test_feedback_is_empty_until_human_acts(self):
        feedback = self.views["feedback.json"]
        self.assertEqual(feedback["records"], [])
        ids = {row["id"] for row in self.data["assessments"]}
        self.assertTrue(validate_feedback(feedback, ids))

    def test_checked_in_views_match_the_generator(self):
        fixture_root = ROOT / "examples" / "web_demo_data"
        for filename, expected in self.views.items():
            actual = json.loads((fixture_root / filename).read_text())
            self.assertEqual(actual, expected, filename)

    def test_feedback_cannot_overwrite_model_decision(self):
        feedback = copy.deepcopy(self.views["feedback.json"])
        feedback["records"].append({
            "id": "FB-001",
            "assessment_id": "AS-NAIXUE-WORKDAY",
            "actor": "human",
            "action": "keep",
            "reason": "demo",
            "created_at": "2026-09-06T16:00:00+08:00",
            "model_decision": "recommend",
        })
        ids = {row["id"] for row in self.data["assessments"]}
        with self.assertRaisesRegex(ValueError, "cannot overwrite"):
            validate_feedback(feedback, ids)

    def test_write_refuses_to_overwrite_a_run(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "views"
            write_views(self.data, output)
            with self.assertRaisesRegex(ValueError, "not overwritten"):
                write_views(self.data, output)


if __name__ == "__main__":
    unittest.main()
