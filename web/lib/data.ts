export const DECISIONS = {
  recommend: '推荐预研',
  rework: '改造后再评',
  needs_evidence: '待补证',
  not_recommend: '不推荐',
} as const;
export const ACTIONS = {
  keep: '保留',
  reject: '淘汰',
  request_evidence: '要求补证',
  edit_brief: '保存修改',
} as const;
export type Decision = keyof typeof DECISIONS;
export type Action = keyof typeof ACTIONS;
export type Brand = {
  id: string;
  version: number;
  name: string;
  category: string;
  market: string;
  scenario: string;
  positioning: { statement: string; status: string };
  audiences: string[];
  marketing_goals: string[];
  permissions: string[];
  constraints: string[];
  unknowns: string[];
  source_refs: string[];
  source_notes: string[];
};
export type Topic = {
  id: string;
  version: number;
  title: string;
  meaning: string;
  market: string;
  brand_independent: boolean;
  signal_layer: string;
  heat_status: string;
  evidence_gaps: string[];
  queue_type: string;
  category_label: string;
  tagline: string;
  data_mode: string;
  source_refs: string[];
  published_at: string | null;
  collected_at: string | null;
  sources: {
    id: string;
    title: string;
    kind: string;
    url: string | null;
    published_at: string | null;
    collected_at: string | null;
    reading_coverage: string;
  }[];
};
export type Opportunity = {
  assessment_id: string;
  brand: { id: string; version: number; name: string };
  trend: { id: string; version: number; title: string; heat_status: string };
  decision: Decision;
  reasons: string[];
  counterargument: string;
  evidence_gap: string;
  brief_id: string | null;
};
export type Brief = {
  id: string;
  assessment_id: string;
  brand_id: string;
  brand_version: number;
  topic_id: string;
  topic_version: number;
  status: string;
  opportunity: string;
  core_idea: string;
  brand_role: string;
  consumer_action: string;
  channels: string[];
  measurement: string[];
  guardrails: string[];
  exit_conditions: string[];
  source_refs: string[];
  hotspot_mechanism: string;
  brand_transformation: string;
  queue_type: string;
  automatically_published: boolean;
};
export type Bundle = {
  runId: string;
  version: string;
  generatedAt: string;
  brands: Brand[];
  topics: Topic[];
  opportunities: Opportunity[];
  briefs: Brief[];
};
const filenames = [
  'brands.json',
  'trends.json',
  'opportunities.json',
  'briefs.json',
  'feedback.json',
  'validation.json',
];
function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function object(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
function strings(v: unknown): v is string[] {
  return (
    Array.isArray(v) && v.every((x) => typeof x === 'string' && x.length > 0)
  );
}
function fields(v: unknown, keys: string[]) {
  assert(object(v), '对象缺失');
  for (const k of keys)
    assert(typeof v[k] === 'string' && v[k].length > 0, `字段缺失：${k}`);
}
function lists(v: Record<string, unknown>, keys: string[]) {
  for (const k of keys) assert(strings(v[k]), `列表错误：${k}`);
}
function unique(rows: { id: string }[]) {
  assert(new Set(rows.map((r) => r.id)).size === rows.length, '重复的记录 ID');
}
export function validateDocuments(
  d: Record<string, Record<string, unknown>>,
  runId: string,
  version: string,
): Bundle {
  assert(version === '0.3.0', '不支持的数据版本');
  for (const n of filenames) {
    assert(
      object(d[n]) && d[n].run_id === runId && d[n].view_version === version,
      '数据混批或版本不一致',
    );
  }
  assert(d['validation.json'].valid === true, '数据包未通过校验');
  const b = d['brands.json'].brands,
    t = d['trends.json'].trends,
    o = d['opportunities.json'].opportunities,
    f = d['briefs.json'].briefs;
  assert(
    Array.isArray(b) &&
      b.length >= 2 &&
      Array.isArray(t) &&
      t.length > 0 &&
      Array.isArray(o) &&
      Array.isArray(f),
    '数据列表缺失',
  );
  for (const v of b) {
    fields(v, ['id', 'name', 'category', 'market', 'scenario']);
    assert(
      object(v) &&
        Number.isInteger(v.version) &&
        Number(v.version) > 0 &&
        v.market === 'CN',
      '品牌版本或市场错误',
    );
    assert(object(v.positioning), '定位缺失');
    fields(v.positioning, ['statement', 'status']);
    lists(v, [
      'audiences',
      'marketing_goals',
      'permissions',
      'constraints',
      'unknowns',
      'source_refs',
      'source_notes',
    ]);
  }
  for (const v of t) {
    fields(v, [
      'id',
      'title',
      'meaning',
      'signal_layer',
      'heat_status',
      'queue_type',
      'category_label',
      'tagline',
    ]);
    assert(
      object(v) &&
        Number.isInteger(v.version) &&
        v.brand_independent === true &&
        v.market === 'CN',
      '话题不独立或版本错误',
    );
    assert(
      v.data_mode === 'synthetic_demo' && v.heat_status === 'unverified',
      '本版仅接受未核验合成演示',
    );
    assert(
      ['trend_candidate', 'calendar', 'evergreen', 'case'].includes(
        String(v.queue_type),
      ),
      '未知话题类型',
    );
    lists(v, ['evidence_gaps', 'source_refs']);
    assert(
      v.published_at === null && v.collected_at === null,
      '合成话题不能伪造时间',
    );
    assert(Array.isArray(v.sources) && v.sources.length > 0, '来源说明缺失');
    for (const s of v.sources) {
      fields(s, ['id', 'title', 'kind', 'reading_coverage']);
      assert(
        object(s) &&
          s.kind === 'synthetic_demo' &&
          s.url === null &&
          s.published_at === null &&
          s.collected_at === null,
        '合成来源不能伪造原文或时间',
      );
    }
    assert(
      (v.source_refs as string[]).join('|') ===
        v.sources.map((s) => s.id).join('|'),
      '来源引用不匹配',
    );
  }
  const brands = b as Brand[],
    topics = t as Topic[],
    opportunities = o as Opportunity[],
    briefs = f as Brief[];
  unique(brands);
  unique(topics);
  unique(briefs);
  const pairs = new Set<string>(),
    ids = new Set<string>();
  for (const a of opportunities) {
    fields(a, ['assessment_id', 'decision', 'counterargument', 'evidence_gap']);
    assert(
      object(a.brand) && object(a.trend) && a.decision in DECISIONS,
      '评估缺失',
    );
    assert(strings(a.reasons) && a.reasons.length, '推荐理由缺失');
    const brand = brands.find((b) => b.id === a.brand.id),
      topic = topics.find((t) => t.id === a.trend.id);
    assert(
      brand &&
        topic &&
        brand.version === a.brand.version &&
        topic.version === a.trend.version &&
        topic.heat_status === a.trend.heat_status,
      '评估关联或版本错误',
    );
    const pair = brand.id + '/' + topic.id;
    assert(!pairs.has(pair) && !ids.has(a.assessment_id), '重复评估');
    pairs.add(pair);
    ids.add(a.assessment_id);
    assert(
      a.brief_id === null || typeof a.brief_id === 'string',
      'Brief引用错误',
    );
  }
  assert(pairs.size === brands.length * topics.length, '跨品牌判断不完整');
  const seen = new Set<string>();
  for (const bf of briefs) {
    fields(bf, [
      'id',
      'assessment_id',
      'brand_id',
      'topic_id',
      'status',
      'opportunity',
      'core_idea',
      'brand_role',
      'consumer_action',
      'hotspot_mechanism',
      'brand_transformation',
    ]);
    lists(bf as unknown as Record<string, unknown>, [
      'channels',
      'measurement',
      'guardrails',
      'exit_conditions',
      'source_refs',
    ]);
    const a = opportunities.find((a) => a.assessment_id === bf.assessment_id),
      t = topics.find((t) => t.id === bf.topic_id);
    assert(
      a &&
        t &&
        !seen.has(a.assessment_id) &&
        ['recommend', 'rework'].includes(a.decision) &&
        a.brief_id === bf.id,
      'Brief与推荐结论冲突',
    );
    assert(
      bf.brand_id === a.brand.id &&
        bf.topic_id === a.trend.id &&
        bf.brand_version === a.brand.version &&
        bf.topic_version === a.trend.version,
      'Brief来源串位',
    );
    assert(
      bf.status === 'draft_unverified' &&
        bf.automatically_published === false &&
        bf.queue_type === t.queue_type &&
        bf.source_refs.join('|') === t.source_refs.join('|'),
      'Brief状态或来源错误',
    );
    seen.add(a.assessment_id);
  }
  for (const a of opportunities)
    assert(
      ['recommend', 'rework'].includes(a.decision)
        ? seen.has(a.assessment_id)
        : a.brief_id === null,
      'Brief数量错误',
    );
  const feedback = d['feedback.json'];
  assert(
    JSON.stringify(feedback.allowed_actions) ===
      JSON.stringify(Object.keys(ACTIONS)) &&
      Array.isArray(feedback.records) &&
      feedback.records.length === 0,
    '反馈合同错误',
  );
  assert(
    typeof d['trends.json'].generated_at === 'string' &&
      d['trends.json'].collected_at === null,
    '时间语义错误',
  );
  return {
    runId,
    version,
    generatedAt: d['trends.json'].generated_at as string,
    brands,
    topics,
    opportunities,
    briefs,
  };
}
export async function loadBundle(): Promise<Bundle> {
  const get = async (path: string) => {
    const r = await fetch('/data/' + path, { cache: 'no-store' });
    if (!r.ok) throw new Error('数据读取失败');
    return r;
  };
  const m = await (await get('manifest.json')).json();
  assert(
    object(m) && typeof m.run_id === 'string' && Array.isArray(m.files),
    '清单格式错误',
  );
  assert(
    m.files.length === filenames.length &&
      m.files
        .map((x: { name: string }) => x.name)
        .sort()
        .join('|') === [...filenames].sort().join('|'),
    '清单文件集合错误',
  );
  const entries = await Promise.all(
    m.files.map(async (f: { name: string; sha256: string; bytes: number }) => {
      const raw = await (await get(f.name)).arrayBuffer();
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', raw)),
      )
        .map((n) => n.toString(16).padStart(2, '0'))
        .join('');
      assert(
        raw.byteLength === f.bytes && hash === f.sha256,
        '文件损坏或哈希不匹配',
      );
      return [f.name, JSON.parse(new TextDecoder().decode(raw))];
    }),
  );
  return validateDocuments(
    Object.fromEntries(entries),
    m.run_id,
    String(m.view_version),
  );
}
export type BrandDraft = {
  positioning: string;
  audiences: string;
  goals: string;
};
export type BriefDraft = {
  core_idea: string;
  opportunity: string;
  brand_role: string;
  consumer_action: string;
  channels: string;
  measurement: string;
  guardrails: string;
  exit_conditions: string;
};
export type BrandRevision = {
  id: string;
  brand_id: string;
  brand_version: number;
  created_at: string;
  reason: string;
  draft: BrandDraft | null;
};
export type BriefRevision = {
  id: string;
  brief_id: string;
  brand_revision_id: string | null;
  created_at: string;
  draft: BriefDraft;
};
export type Feedback = {
  id: string;
  run_id: string;
  assessment_id: string;
  brand_version: number;
  topic_version: number;
  brand_revision_id: string | null;
  brief_revision_id: string | null;
  actor_kind: 'human';
  action: Action;
  reason: string;
  created_at: string;
};
export type Store = {
  version: 1;
  runId: string;
  selectedBrand: string;
  brandRevisions: BrandRevision[];
  briefRevisions: BriefRevision[];
  feedback: Feedback[];
};
export const STORAGE_KEY = 'trendfit:workspace:v1:RUN-CN-WEB-001';
export function emptyStore(data: Bundle): Store {
  return {
    version: 1,
    runId: data.runId,
    selectedBrand:
      data.brands.find((b) => b.id === 'BR-NAIXUE')?.id || data.brands[0].id,
    brandRevisions: [],
    briefRevisions: [],
    feedback: [],
  };
}
export function validateStore(raw: unknown, d: Bundle): Store {
  assert(
    object(raw) &&
      raw.version === 1 &&
      raw.runId === d.runId &&
      d.brands.some((b) => b.id === raw.selectedBrand),
    '本机数据版本错误',
  );
  assert(
    Array.isArray(raw.brandRevisions) &&
      Array.isArray(raw.briefRevisions) &&
      Array.isArray(raw.feedback),
    '本机数据结构错误',
  );
  const s = raw as unknown as Store;
  unique([...s.brandRevisions, ...s.briefRevisions, ...s.feedback]);
  for (const r of s.brandRevisions) {
    fields(r, ['id', 'brand_id', 'reason', 'created_at']);
    assert(
      d.brands.some(
        (b) => b.id === r.brand_id && b.version === r.brand_version,
      ),
      '品牌副本版本错误',
    );
    if (r.draft !== null)
      fields(r.draft, ['positioning', 'audiences', 'goals']);
  }
  for (const r of s.briefRevisions) {
    fields(r, ['id', 'brief_id', 'created_at']);
    const bf = d.briefs.find((b) => b.id === r.brief_id);
    assert(bf, 'Brief副本引用错误');
    fields(r.draft, [
      'core_idea',
      'opportunity',
      'brand_role',
      'consumer_action',
      'channels',
      'measurement',
      'guardrails',
      'exit_conditions',
    ]);
    assert(
      r.brand_revision_id === null ||
        s.brandRevisions.some(
          (b) => b.id === r.brand_revision_id && b.brand_id === bf.brand_id,
        ),
      '副本品牌引用错误',
    );
  }
  for (const e of s.feedback) {
    fields(e, ['id', 'assessment_id', 'reason', 'created_at']);
    const a = d.opportunities.find((a) => a.assessment_id === e.assessment_id);
    assert(
      a &&
        e.run_id === d.runId &&
        e.actor_kind === 'human' &&
        e.action in ACTIONS &&
        e.brand_version === a.brand.version &&
        e.topic_version === a.trend.version,
      '反馈关联错误',
    );
    assert(
      e.brand_revision_id === null ||
        s.brandRevisions.some(
          (b) => b.id === e.brand_revision_id && b.brand_id === a.brand.id,
        ),
      '反馈品牌修订错误',
    );
    assert(
      e.brief_revision_id === null ||
        s.briefRevisions.some(
          (b) => b.id === e.brief_revision_id && b.brief_id === a.brief_id,
        ),
      '反馈Brief修订错误',
    );
    assert(
      e.action !== 'edit_brief' || e.brief_revision_id !== null,
      '修改反馈缺少修订',
    );
    assert(
      !('decision' in e) && !('model_decision' in e),
      '反馈不能覆盖模型结论',
    );
  }
  return s;
}
export function persist(
  s: Store,
  d: Bundle,
  storage: Pick<Storage, 'setItem'> = localStorage,
) {
  validateStore(s, d);
  storage.setItem(STORAGE_KEY, JSON.stringify(s));
}
export function brandDraft(b: Brand): BrandDraft {
  return {
    positioning: b.positioning.statement,
    audiences: b.audiences.join('\n'),
    goals: b.marketing_goals.join('\n'),
  };
}
export function briefDraft(b: Brief): BriefDraft {
  return {
    core_idea: b.core_idea,
    opportunity: b.opportunity,
    brand_role: b.brand_role,
    consumer_action: b.consumer_action,
    channels: b.channels.join('\n'),
    measurement: b.measurement.join('\n'),
    guardrails: b.guardrails.join('\n'),
    exit_conditions: b.exit_conditions.join('\n'),
  };
}
export const briefLabels: Record<keyof BriefDraft, string> = {
  core_idea: '核心创意',
  opportunity: '品牌机会',
  brand_role: '品牌角色',
  consumer_action: '用户参与',
  channels: '推荐渠道',
  measurement: '验证指标',
  guardrails: '风险边界',
  exit_conditions: '退出条件',
};
export function briefMarkdown(
  b: Brief,
  draft: BriefDraft,
  data: Bundle,
  revision: string,
  stale: boolean,
) {
  const t = data.topics.find((t) => t.id === b.topic_id)!,
    brand = data.brands.find((x) => x.id === b.brand_id)!;
  return `# ${draft.core_idea}\n\n${brand.name} · 中国市场 · ${t.queue_type === 'calendar' ? '日历机会支线' : '候选话题'}\n\n状态：合成演示 / 待核验草稿${stale ? ' / 品牌已修改，基于原档案的判断待重评' : ''}\n\n品牌 v${b.brand_version} · 话题 v${b.topic_version} · ${revision}\n\n## 话题起点\n${t.title}\n${t.meaning}\n\n来源：${t.sources.map((s) => s.title + '（合成文本，无原文链接）').join('；')}\n来源ID：${t.source_refs.join(', ')}\n\n## 补证条件\n${t.evidence_gaps.join('\n')}\n\n${(Object.keys(briefLabels) as (keyof BriefDraft)[]).map((k) => '## ' + briefLabels[k] + '\n' + draft[k]).join('\n\n')}\n\n---\n关联：${data.runId} / ${t.id} / ${b.assessment_id} / ${b.id}\n保存副本不等于事实核验或执行授权。\n`;
}
