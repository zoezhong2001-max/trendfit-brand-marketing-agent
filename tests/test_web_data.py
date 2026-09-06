import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from trendfit.web_data import build_web_data, export
from trendfit.cross_brand import validate_cross_brand_run
ROOT = Path(__file__).resolve().parents[1]
class WebsiteTests(unittest.TestCase):
    def setUp(self):
        self.data=json.loads((ROOT/'examples/website_run.json').read_text())
    def test_source_and_time_are_not_fabricated(self):
        v=build_web_data(self.data)
        self.assertNotIn('refreshed_at',v['trends.json'])
        self.assertIsNone(v['trends.json']['collected_at'])
        for t in v['trends.json']['trends']:
            self.assertEqual(t['source_count'],0)
            self.assertTrue(all(s['url'] is None for s in t['sources']))
        self.assertEqual(v['trends.json']['trends'][1]['queue_type'],'calendar')
    def test_duplicate_brief_rejected(self):
        b=copy.deepcopy(self.data['briefs'][0]);b['id']='duplicate';self.data['briefs'].append(b)
        with self.assertRaisesRegex(ValueError,'duplicate brief'):
            validate_cross_brand_run(self.data)
    def test_unknown_status_rejected(self):
        self.data['briefs'][0]['status']='published'
        with self.assertRaisesRegex(ValueError,'unsupported brief'):
            validate_cross_brand_run(self.data)
    def test_calendar_cannot_be_ready_even_with_heat(self):
        self.data['topics'][1]['heat_status']='verified_current';self.data['briefs'][1]['status']='ready_for_planning'
        with self.assertRaisesRegex(ValueError,'calendar'):
            validate_cross_brand_run(self.data)
    def test_manifest_matches_export(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'bundle';m=export(self.data,p)
            for f in m['files']:
                raw=(p/f['name']).read_bytes()
                self.assertEqual(hashlib.sha256(raw).hexdigest(),f['sha256'])
                self.assertEqual(len(raw),f['bytes'])
            with self.assertRaises(FileExistsError):export(self.data,p)
