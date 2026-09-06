import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  validateDocuments,
  validateStore,
  emptyStore,
  persist,
  loadBundle,
  briefMarkdown,
  briefDraft,
} from '../lib/data.ts';
const dir = new URL('../public/data/', import.meta.url);
const m = JSON.parse(fs.readFileSync(new URL('manifest.json', dir)));
const docs = Object.fromEntries(
  m.files.map((f) => [
    f.name,
    JSON.parse(fs.readFileSync(new URL(f.name, dir))),
  ]),
);
const data = () =>
  validateDocuments(structuredClone(docs), m.run_id, m.view_version);
test('cross-brand matrix and calendar remain independent', () => {
  const d = data();
  assert.equal(
    d.opportunities
      .filter((a) => a.trend.id === 'TP-WORKDAY-RESET')
      .map((a) => a.decision)
      .join(','),
    'not_recommend,recommend',
  );
  assert.equal(d.topics[1].queue_type, 'calendar');
});
test('reject mixed versions and invalid references', () => {
  let d = structuredClone(docs);
  d['briefs.json'].run_id = 'wrong';
  assert.throws(() => validateDocuments(d, m.run_id, m.view_version));
  d = structuredClone(docs);
  d['briefs.json'].briefs[0].brand_id = 'BR-PETLIBRO';
  assert.throws(() => validateDocuments(d, m.run_id, m.view_version));
});
test('reject fake realtime, fake URLs and duplicate briefs', () => {
  for (const mutate of [
    (d) => (d['trends.json'].trends[0].heat_status = 'verified_current'),
    (d) => (d['trends.json'].trends[0].sources[0].url = 'https://example.org'),
    (d) => d['briefs.json'].briefs.push(d['briefs.json'].briefs[0]),
  ]) {
    const d = structuredClone(docs);
    mutate(d);
    assert.throws(() => validateDocuments(d, m.run_id, m.view_version));
  }
});
test('load validates exact bytes before business rendering', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (path) =>
    new Response(fs.readFileSync(new URL(String(path).split('/').pop(), dir)));
  try {
    assert.equal((await loadBundle()).brands.length, 2);
    globalThis.fetch = async (path) =>
      new Response(
        String(path).endsWith('brands.json')
          ? '{}'
          : fs.readFileSync(new URL(String(path).split('/').pop(), dir)),
      );
    await assert.rejects(loadBundle, /哈希/);
  } finally {
    globalThis.fetch = original;
  }
});
test('save failure throws and never mutates source judgments', () => {
  const d = data(),
    s = emptyStore(d);
  const before = JSON.stringify(d);
  assert.throws(
    () =>
      persist(s, d, {
        setItem() {
          throw new Error('quota');
        },
      }),
    /quota/,
  );
  assert.equal(JSON.stringify(d), before);
});
test('feedback with reason, versions and actor is separate; invalid edits rejected', () => {
  const d = data(),
    s = emptyStore(d),
    a = d.opportunities[1];
  s.feedback.push({
    id: 'qa',
    run_id: d.runId,
    assessment_id: a.assessment_id,
    brand_version: a.brand.version,
    topic_version: a.trend.version,
    brand_revision_id: null,
    brief_revision_id: null,
    actor_kind: 'human',
    action: 'reject',
    reason: 'QA: needs evidence',
    created_at: new Date().toISOString(),
  });
  assert.equal(validateStore(s, d).feedback[0].action, 'reject');
  assert.equal(a.decision, 'recommend');
  s.feedback[0].reason = '';
  assert.throws(() => validateStore(s, d));
  s.feedback[0].reason = 'QA';
  s.feedback[0].action = 'edit_brief';
  assert.throws(() => validateStore(s, d));
});
test('corrupt local record never silently accepted', () => {
  for (const bad of [null, {}, [], { ...emptyStore(data()), runId: 'other' }])
    assert.throws(() => validateStore(bad, data()));
});
test('export retains evidence, caveats and lineage', () => {
  const d = data(),
    b = d.briefs[0],
    md = briefMarkdown(b, briefDraft(b), d, 'QA', true);
  assert.match(md, /待核验草稿/);
  assert.match(md, /待重评/);
  assert.match(md, /无原文链接/);
  assert.ok(md.includes(b.assessment_id));
});
