"""Generate a versioned, complete public website bundle; preserve old fixtures."""
import argparse
import hashlib
import json
from pathlib import Path
from .views import build_views

VERSION = '0.3.0'

def build_web_data(data):
    views = build_views(data)
    views['brands.json']['brands'] = data['brands']
    for view, source in zip(views['trends.json']['trends'], data['topics']):
        view.update(source)
        view['source_count'] = sum(s['url'] is not None for s in source['sources'])
    views['trends.json'].pop('refreshed_at', None)
    views['trends.json']['generated_at'] = data['run']['generated_at']
    views['trends.json']['collected_at'] = None
    for view in views.values():
        view.update(view_version=VERSION, run_id=data['run']['id'])
    views['feedback.json']['records'] = []
    return views

def export(data, output):
    views = build_web_data(data)
    output.mkdir(parents=True, exist_ok=False)
    files = []
    for name, value in views.items():
        raw = (json.dumps(value, ensure_ascii=False, indent=2)+'\n').encode()
        (output/name).write_bytes(raw)
        files.append(dict(name=name, sha256=hashlib.sha256(raw).hexdigest(), bytes=len(raw)))
    manifest = dict(view_version=VERSION, run_id=data['run']['id'], source_run_version=data['run']['version'], files=files)
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return manifest

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, default=Path('examples/website_run.json'))
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(export(json.loads(args.input.read_text()), args.output), indent=2))
