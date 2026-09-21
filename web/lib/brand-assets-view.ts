export type Readiness = 'eligible' | 'needs_review' | 'expired' | 'blocked';
export type ItemType = 'physical_product' | 'menu_item' | 'service';

export interface BrandAssetBrand {
  id: string;
  version: number;
  name: string;
  category: string;
  market: string;
}

export interface EvidenceRef {
  id: string;
  source_id: string;
  source_kind: string;
  locator: Record<string, string | number>;
  excerpt: string;
  field_paths: string[];
  reading_method: string;
  fact_status: 'explicit' | 'hypothesis';
}

export interface Claim {
  id: string;
  version: number;
  brand_id: string;
  statement: string;
  policy: string;
  conditions: string[];
  applies_to: string[];
  market_scope: string[];
  evidence_refs: string[];
  review_status: string;
}

export interface Availability {
  market: string;
  region_scope: string[];
  channel: string;
  status: string;
  valid_from: string | null;
  valid_to: string | null;
  evidence_refs: string[];
}

export interface CatalogItem {
  id: string;
  version: number;
  brand_id: string;
  type: ItemType;
  family_id: string;
  name: string;
  canonical_category: string;
  lifecycle: {
    status: string;
    valid_from: string | null;
    valid_to: string | null;
  };
  marketing_readiness: Readiness;
  value_proposition: {
    value: string;
    fact_status: 'explicit' | 'hypothesis';
    review_status: string;
    evidence_refs: string[];
  };
  audience_tags: string[];
  scene_tags: string[];
  attributes: Record<string, unknown>;
  variants: Array<{
    id: string;
    name: string;
    external_keys: string[];
    attributes: Record<string, unknown>;
  }>;
  availability: Availability[];
  claim_refs: string[];
  constraints: string[];
  hard_blockers: string[];
  creative_refs: string[];
  source_refs: string[];
  updated_at: string;
}

export interface BrandAssetSnapshot {
  id: string;
  brand_id: string;
  created_at: string;
  brand_profile: { id: string; version: number };
  catalog_items: Array<{ id: string; version: number }>;
  claims: Array<{ id: string; version: number }>;
  source_batch_ids: string[];
  content_hash: string;
}

export interface BrandAssetBundle {
  run: {
    id: string;
    version: string;
    market: string;
    data_mode: string;
    generated_at: string;
  };
  brands: BrandAssetBrand[];
  evidence_refs: EvidenceRef[];
  claims: Claim[];
  catalog_items: CatalogItem[];
  brand_asset_snapshots: BrandAssetSnapshot[];
}

export interface AssetFilters {
  query: string;
  type: ItemType | 'all';
  readiness: Readiness | 'all';
}

export const TYPE_LABELS: Record<ItemType, string> = {
  physical_product: '实体商品',
  menu_item: '菜单商品',
  service: '服务商品',
};

export const READINESS_LABELS: Record<Readiness, string> = {
  eligible: '可进入营销',
  needs_review: '待补充核验',
  expired: '已失效',
  blocked: '已阻断',
};

export const FACT_LABELS = {
  explicit: '事实',
  hypothesis: '假设',
} as const;

export function getBrandItems(bundle: BrandAssetBundle, brandId: string) {
  return bundle.catalog_items.filter((item) => item.brand_id === brandId);
}

export function summarizeBrandAssets(
  bundle: BrandAssetBundle,
  brandId: string,
) {
  const items = getBrandItems(bundle, brandId);
  return {
    total: items.length,
    eligible: items.filter((item) => item.marketing_readiness === 'eligible')
      .length,
    needsReview: items.filter(
      (item) => item.marketing_readiness === 'needs_review',
    ).length,
    unavailable: items.filter(
      (item) =>
        item.marketing_readiness === 'expired' ||
        item.marketing_readiness === 'blocked',
    ).length,
  };
}

export function filterBrandItems(
  bundle: BrandAssetBundle,
  brandId: string,
  filters: AssetFilters,
) {
  const query = filters.query.trim().toLocaleLowerCase('zh-CN');
  return getBrandItems(bundle, brandId).filter((item) => {
    const matchesQuery =
      !query ||
      [
        item.name,
        item.id,
        item.canonical_category,
        ...item.audience_tags,
        ...item.scene_tags,
      ]
        .join(' ')
        .toLocaleLowerCase('zh-CN')
        .includes(query);
    const matchesType = filters.type === 'all' || item.type === filters.type;
    const matchesReadiness =
      filters.readiness === 'all' ||
      item.marketing_readiness === filters.readiness;
    return matchesQuery && matchesType && matchesReadiness;
  });
}

export function resolveClaims(bundle: BrandAssetBundle, item: CatalogItem) {
  return item.claim_refs
    .map((claimId) => bundle.claims.find((claim) => claim.id === claimId))
    .filter((claim): claim is Claim => Boolean(claim));
}

export function resolveEvidence(
  bundle: BrandAssetBundle,
  evidenceIds: string[],
) {
  return evidenceIds
    .map((evidenceId) =>
      bundle.evidence_refs.find((evidence) => evidence.id === evidenceId),
    )
    .filter((evidence): evidence is EvidenceRef => Boolean(evidence));
}

export function formatLocator(locator: EvidenceRef['locator']) {
  return Object.entries(locator)
    .map(([key, value]) => `${key} ${value}`)
    .join(' · ');
}
