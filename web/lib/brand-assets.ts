export const ITEM_TYPES = [
  'physical_product',
  'menu_item',
  'service',
  'digital_product',
  'offline_experience',
] as const;
export const READINESS = [
  'needs_review',
  'eligible',
  'blocked',
  'expired',
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
export type MarketingReadiness = (typeof READINESS)[number];

type VersionRef = { id: string; version: number };
type EvidenceField = {
  value: string | null;
  fact_status: 'explicit' | 'inferred' | 'hypothesis' | 'unknown';
  review_status: 'unreviewed' | 'confirmed' | 'corrected' | 'rejected';
  evidence_refs: string[];
};
export type Claim = {
  id: string;
  version: number;
  brand_id: string;
  policy: 'allowed' | 'conditional' | 'prohibited';
  applies_to: string[];
  market_scope: string[];
  evidence_refs: string[];
  review_status: EvidenceField['review_status'];
  valid_to: string | null;
};
export type CatalogItem = {
  id: string;
  version: number;
  brand_id: string;
  type: ItemType;
  name: string;
  lifecycle: {
    status: 'draft' | 'in_review' | 'active' | 'paused' | 'retired';
    valid_from: string | null;
    valid_to: string | null;
  };
  marketing_readiness: MarketingReadiness;
  value_proposition: EvidenceField;
  attributes: Record<string, unknown>;
  availability: {
    market: string;
    channel: string;
    status: 'available' | 'unavailable' | 'unknown';
    evidence_refs: string[];
  }[];
  claim_refs: string[];
  hard_blockers: string[];
  source_refs: string[];
};
export type BrandAssetSnapshot = {
  id: string;
  brand_id: string;
  brand_profile: VersionRef;
  catalog_items: VersionRef[];
  claims: VersionRef[];
  source_batch_ids: string[];
  content_hash: string;
};
export type BrandAssetBundle = {
  run: {
    id: string;
    version: '0.4.0';
    market: 'CN';
    data_mode: 'synthetic_demo';
    generated_at: string;
  };
  brands: { id: string; version: number; name: string; market: string }[];
  evidence_refs: { id: string }[];
  onboarding_batches: { id: string; brand_id: string }[];
  claims: Claim[];
  catalog_items: CatalogItem[];
  brand_asset_snapshots: BrandAssetSnapshot[];
};

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function index<T extends { id: string }>(rows: T[], label: string) {
  assert(
    rows.every((row) => typeof row.id === 'string' && row.id.length > 0),
    `${label} ID 缺失`,
  );
  const result = new Map(rows.map((row) => [row.id, row]));
  assert(result.size === rows.length, `${label} ID 重复`);
  return result;
}
function refsExist(
  refs: string[],
  known: ReadonlyMap<string, unknown>,
  label: string,
) {
  assert(
    Array.isArray(refs) && refs.every((ref) => known.has(ref)),
    `${label}引用缺失`,
  );
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (object(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
function dateOnly(value: string) {
  return value.slice(0, 10);
}

export async function snapshotContentHash(snapshot: BrandAssetSnapshot) {
  const payload = {
    brand_profile: snapshot.brand_profile,
    catalog_items: [...snapshot.catalog_items].sort(
      (a, b) => a.id.localeCompare(b.id) || a.version - b.version,
    ),
    claims: [...snapshot.claims].sort(
      (a, b) => a.id.localeCompare(b.id) || a.version - b.version,
    ),
    source_batch_ids: [...snapshot.source_batch_ids].sort(),
  };
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonical(payload)),
  );
  return (
    'sha256:' +
    [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function deriveMarketingReadiness(
  item: CatalogItem,
  claims: Map<string, Claim>,
  generatedAt: string,
  market = 'CN',
): MarketingReadiness {
  const asOf = dateOnly(generatedAt),
    lifecycle = item.lifecycle;
  if (
    lifecycle.status === 'retired' ||
    (lifecycle.valid_to !== null && lifecycle.valid_to < asOf)
  )
    return 'expired';
  if (lifecycle.status === 'paused' || item.hard_blockers.length)
    return 'blocked';
  if (lifecycle.status === 'draft' || lifecycle.status === 'in_review')
    return 'needs_review';
  if (lifecycle.valid_from !== null && lifecycle.valid_from > asOf)
    return 'needs_review';

  const availability = item.availability.filter((row) => row.market === market);
  if (!availability.length) return 'blocked';
  if (!availability.some((row) => row.status === 'available'))
    return availability.some((row) => row.status === 'unknown')
      ? 'needs_review'
      : 'blocked';
  if (
    !['confirmed', 'corrected'].includes(
      item.value_proposition.review_status,
    ) ||
    ['hypothesis', 'unknown'].includes(item.value_proposition.fact_status)
  )
    return 'needs_review';
  if (item.type === 'menu_item' && lifecycle.valid_to === null)
    return 'needs_review';
  if (
    item.type === 'service' &&
    (!Array.isArray(item.attributes.service_area) ||
      !item.attributes.service_area.length ||
      item.attributes.fulfillment_status !== 'confirmed')
  )
    return 'needs_review';
  if (
    item.type === 'digital_product' &&
    (!item.attributes.platform || item.attributes.subscription_status !== 'active')
  )
    return 'needs_review';
  if (
    item.type === 'offline_experience' &&
    (!item.attributes.venue_or_city || lifecycle.valid_to === null)
  )
    return 'needs_review';
  for (const claimId of item.claim_refs) {
    const claim = claims.get(claimId)!;
    if (
      claim.policy === 'prohibited' ||
      (claim.valid_to !== null && claim.valid_to < asOf)
    )
      return 'blocked';
    if (!['confirmed', 'corrected'].includes(claim.review_status))
      return 'needs_review';
  }
  return 'eligible';
}

export async function validateBrandAssetDocument(
  input: unknown,
): Promise<BrandAssetBundle> {
  assert(object(input) && object(input.run), '品牌资产数据缺失');
  const data = input as unknown as BrandAssetBundle;
  assert(
    data.run.version === '0.4.0' &&
      data.run.market === 'CN' &&
      data.run.data_mode === 'synthetic_demo',
    '品牌资产版本、市场或数据模式错误',
  );
  assert(!Number.isNaN(Date.parse(data.run.generated_at)), '生成时间错误');
  assert(
    Array.isArray(data.brands) &&
      Array.isArray(data.catalog_items) &&
      Array.isArray(data.claims) &&
      Array.isArray(data.evidence_refs) &&
      Array.isArray(data.onboarding_batches) &&
      Array.isArray(data.brand_asset_snapshots),
    '品牌资产列表缺失',
  );
  const brands = index(data.brands, '品牌'),
    evidence = index(data.evidence_refs, '证据'),
    batches = index(data.onboarding_batches, '导入批次'),
    claims = index(data.claims, 'Claim'),
    items = index(data.catalog_items, '商品'),
    snapshots = index(data.brand_asset_snapshots, '快照');
  assert(brands.size >= 3, '至少需要三个跨品类品牌');

  for (const claim of claims.values()) {
    assert(brands.has(claim.brand_id), 'Claim品牌缺失');
    refsExist(claim.evidence_refs, evidence, 'Claim证据');
    for (const itemId of claim.applies_to) {
      const item = items.get(itemId);
      assert(item && item.brand_id === claim.brand_id, 'Claim商品跨品牌或缺失');
    }
  }
  for (const item of items.values()) {
    assert(brands.has(item.brand_id), '商品品牌缺失');
    assert(ITEM_TYPES.includes(item.type), '商品类型错误');
    refsExist(item.source_refs, evidence, '商品来源');
    refsExist(item.value_proposition.evidence_refs, evidence, '价值主张证据');
    for (const claimId of item.claim_refs) {
      const claim = claims.get(claimId);
      assert(
        claim &&
          claim.brand_id === item.brand_id &&
          claim.applies_to.includes(item.id),
        '商品Claim跨品牌、缺失或不适用',
      );
    }
    const derived = deriveMarketingReadiness(
      item,
      claims,
      data.run.generated_at,
    );
    assert(
      derived === item.marketing_readiness,
      `商品 ${item.id} 声明 ${item.marketing_readiness}，规则计算为 ${derived}`,
    );
  }

  const snapshotBrands = new Set<string>();
  for (const snapshot of snapshots.values()) {
    const brand = brands.get(snapshot.brand_id);
    assert(brand && !snapshotBrands.has(brand.id), '品牌快照缺失或重复');
    snapshotBrands.add(brand.id);
    assert(
      snapshot.brand_profile.id === brand.id &&
        snapshot.brand_profile.version === brand.version,
      '品牌档案版本不匹配',
    );
    refsExist(snapshot.source_batch_ids, batches, '快照导入批次');
    const expectedItems = [...items.values()]
        .filter((item) => item.brand_id === brand.id)
        .map((item) => `${item.id}@${item.version}`)
        .sort(),
      actualItems = snapshot.catalog_items
        .map((item) => `${item.id}@${item.version}`)
        .sort(),
      expectedClaims = [...claims.values()]
        .filter((claim) => claim.brand_id === brand.id)
        .map((claim) => `${claim.id}@${claim.version}`)
        .sort(),
      actualClaims = snapshot.claims
        .map((claim) => `${claim.id}@${claim.version}`)
        .sort();
    assert(
      JSON.stringify(actualItems) === JSON.stringify(expectedItems) &&
        JSON.stringify(actualClaims) === JSON.stringify(expectedClaims),
      '快照未精确覆盖品牌资产版本',
    );
    assert(
      snapshot.content_hash === (await snapshotContentHash(snapshot)),
      '快照哈希不匹配',
    );
  }
  assert(snapshotBrands.size === brands.size, '每个品牌都需要资产快照');
  assert(
    ['physical_product', 'menu_item', 'service'].every((type) =>
      data.catalog_items.some((item) => item.type === type),
    ),
    '验收样本未覆盖三种商品形态',
  );
  return data;
}
