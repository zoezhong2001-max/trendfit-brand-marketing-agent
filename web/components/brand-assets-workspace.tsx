"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./brand-assets-workspace.module.css";
import {
  FACT_LABELS,
  READINESS_LABELS,
  TYPE_LABELS,
  filterBrandItems,
  formatLocator,
  getBrandItems,
  resolveClaims,
  resolveEvidence,
  summarizeBrandAssets,
  type BrandAssetBundle,
  type CatalogItem,
  type ItemType,
  type Readiness,
} from "../lib/brand-assets-view";
import { validateBrandAssetDocument } from "../lib/brand-assets";
import WorkspaceSidebar from "./workspace-sidebar";
import { readWorkspaceBrand, workspaceHref, writeWorkspaceBrand } from "../lib/workspace-context";

type DetailTab = "profile" | "evidence" | "history";

const TYPE_OPTIONS: Array<{ value: ItemType | "all"; label: string }> = [
  { value: "all", label: "全部类型" },
  { value: "physical_product", label: "实体商品" },
  { value: "menu_item", label: "菜单商品" },
  { value: "service", label: "服务商品" },
];

const READINESS_OPTIONS: Array<{ value: Readiness | "all"; label: string }> = [
  { value: "all", label: "全部状态" },
  { value: "eligible", label: "可进入营销" },
  { value: "needs_review", label: "待补充核验" },
  { value: "expired", label: "已失效" },
  { value: "blocked", label: "已阻断" },
];

function readinessTone(readiness: Readiness) {
  if (readiness === "eligible") return styles.statusEligible;
  if (readiness === "needs_review") return styles.statusReview;
  return styles.statusUnavailable;
}

function formatDate(value: string | null) {
  if (!value) return "长期有效 / 未设定";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function AttributeList({ attributes }: { attributes: Record<string, unknown> }) {
  const entries = Object.entries(attributes);
  if (!entries.length) return <p className={styles.muted}>暂无结构化属性。</p>;
  return (
    <dl className={styles.attributeList}>
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt>{key.replaceAll("_", " ")}</dt>
          <dd>{Array.isArray(value) ? value.join("、") || "待补充" : String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function ItemRow({
  item,
  active,
  onSelect,
}: {
  item: CatalogItem;
  active: boolean;
  onSelect: () => void;
}) {
  const availability = item.availability[0];
  return (
    <button
      type="button"
      className={`${styles.itemRow} ${active ? styles.itemRowActive : ""}`}
      onClick={onSelect}
      aria-pressed={active}
    >
      <span className={styles.itemRowTop}>
        <span className={styles.itemName}>{item.name}</span>
        <span className={`${styles.statusPill} ${readinessTone(item.marketing_readiness)}`}>
          {READINESS_LABELS[item.marketing_readiness]}
        </span>
      </span>
      <span className={styles.itemMeta}>
        <span>{TYPE_LABELS[item.type]}</span>
        <span>{item.canonical_category.replaceAll("_", " ")}</span>
      </span>
      <span className={styles.itemFoot}>
        <span>{item.scene_tags.join(" · ") || "待补充场景"}</span>
        <span>{availability?.status === "available" ? "有可用范围" : "范围待确认"}</span>
      </span>
    </button>
  );
}

function OverviewPanel({ bundle, item }: { bundle: BrandAssetBundle; item: CatalogItem }) {
  const claims = resolveClaims(bundle, item);
  return (
    <div className={styles.tabContent}>
      <section className={styles.valueCard}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>VALUE PROPOSITION</span>
            <h3>营销价值主张</h3>
          </div>
          <div className={styles.signalGroup}>
            <span className={`${styles.factPill} ${item.value_proposition.fact_status === "explicit" ? styles.factExplicit : styles.factHypothesis}`}>
              {FACT_LABELS[item.value_proposition.fact_status]}
            </span>
            <span className={styles.reviewPill}>
              {item.value_proposition.review_status === "confirmed" ? "已复核" : "未复核"}
            </span>
          </div>
        </div>
        <p className={styles.valueText}>{item.value_proposition.value}</p>
        {item.value_proposition.fact_status === "hypothesis" && (
          <p className={styles.inlineNotice}>该描述是待验证的工作假设，不能直接进入广告创编。</p>
        )}
      </section>

      <div className={styles.twoColumnGrid}>
        <section className={styles.detailSection}>
          <span className={styles.eyebrow}>AUDIENCE &amp; SCENE</span>
          <h3>人群与场景</h3>
          <div className={styles.tagGroup}>
            {[...item.audience_tags, ...item.scene_tags].map((tag) => (
              <span className={styles.tag} key={tag}>{tag}</span>
            ))}
          </div>
        </section>
        <section className={styles.detailSection}>
          <span className={styles.eyebrow}>LIFECYCLE</span>
          <h3>生命周期</h3>
          <dl className={styles.compactDefinition}>
            <div><dt>状态</dt><dd>{item.lifecycle.status}</dd></div>
            <div><dt>生效</dt><dd>{formatDate(item.lifecycle.valid_from)}</dd></div>
            <div><dt>失效</dt><dd>{formatDate(item.lifecycle.valid_to)}</dd></div>
          </dl>
        </section>
      </div>

      <section className={styles.detailSection}>
        <span className={styles.eyebrow}>AVAILABILITY</span>
        <h3>可售与履约范围</h3>
        <div className={styles.availabilityGrid}>
          {item.availability.map((availability, index) => (
            <article className={styles.availabilityCard} key={`${availability.market}-${availability.channel}-${index}`}>
              <div className={styles.availabilityTop}>
                <strong>{availability.market} · {availability.channel}</strong>
                <span className={availability.status === "available" ? styles.availableDot : styles.unknownDot}>
                  {availability.status === "available" ? "可用" : availability.status === "unavailable" ? "不可用" : "待确认"}
                </span>
              </div>
              <p>{availability.region_scope.join("、") || "未确认具体区域"}</p>
              <small>{formatDate(availability.valid_from)} → {formatDate(availability.valid_to)}</small>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.detailSection}>
        <span className={styles.eyebrow}>CLAIM POLICY</span>
        <h3>可用表达与约束</h3>
        {claims.map((claim) => (
          <article className={styles.claimCard} key={claim.id}>
            <div className={styles.claimTop}>
              <p>“{claim.statement}”</p>
              <span>{claim.review_status === "confirmed" ? "已确认" : "待确认"}</span>
            </div>
            <ul>
              {claim.conditions.map((condition) => <li key={condition}>{condition}</li>)}
            </ul>
          </article>
        ))}
        {item.constraints.length > 0 && (
          <div className={styles.guardrailBox}>
            <strong>执行护栏</strong>
            <ul>{item.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul>
          </div>
        )}
      </section>

      <section className={styles.detailSection}>
        <span className={styles.eyebrow}>VARIANTS &amp; ATTRIBUTES</span>
        <h3>变体与结构化属性</h3>
        {item.variants.length ? (
          <div className={styles.variantGrid}>
            {item.variants.map((variant) => (
              <article className={styles.variantCard} key={variant.id}>
                <strong>{variant.name}</strong>
                <code>{variant.id}</code>
                <AttributeList attributes={variant.attributes} />
              </article>
            ))}
          </div>
        ) : <p className={styles.muted}>当前没有已确认变体。</p>}
      </section>
    </div>
  );
}

function EvidencePanel({ bundle, item }: { bundle: BrandAssetBundle; item: CatalogItem }) {
  const evidenceIds = Array.from(new Set([
    ...item.source_refs,
    ...item.value_proposition.evidence_refs,
    ...resolveClaims(bundle, item).flatMap((claim) => claim.evidence_refs),
  ]));
  const evidence = resolveEvidence(bundle, evidenceIds);
  return (
    <div className={styles.tabContent}>
      <div className={styles.explainBanner}>
        <span>为什么能用？</span>
        <p>每个关键字段都回到来源定位与事实状态，避免 AI 把推断写成事实。</p>
      </div>
      <div className={styles.evidenceList}>
        {evidence.map((ref) => (
          <article className={styles.evidenceCard} key={ref.id}>
            <div className={styles.evidenceCardTop}>
              <span className={`${styles.factPill} ${ref.fact_status === "explicit" ? styles.factExplicit : styles.factHypothesis}`}>
                {FACT_LABELS[ref.fact_status]}
              </span>
              <code>{ref.id}</code>
            </div>
            <blockquote>{ref.excerpt}</blockquote>
            <dl className={styles.evidenceMeta}>
              <div><dt>来源</dt><dd>{ref.source_id}</dd></div>
              <div><dt>定位</dt><dd>{formatLocator(ref.locator)}</dd></div>
              <div><dt>读取方式</dt><dd>{ref.reading_method}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      {!evidence.length && <p className={styles.emptyState}>该商品还没有绑定事实依据。</p>}
    </div>
  );
}

function HistoryPanel({ bundle, item }: { bundle: BrandAssetBundle; item: CatalogItem }) {
  const snapshot = bundle.brand_asset_snapshots.find((entry) => entry.brand_id === item.brand_id);
  return (
    <div className={styles.tabContent}>
      <section className={styles.snapshotCard}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>VERSION LINEAGE</span>
            <h3>版本与快照</h3>
          </div>
          <span className={styles.versionPill}>商品 v{item.version}</span>
        </div>
        {snapshot ? (
          <>
            <dl className={styles.snapshotDefinition}>
              <div><dt>快照 ID</dt><dd>{snapshot.id}</dd></div>
              <div><dt>品牌版本</dt><dd>v{snapshot.brand_profile.version}</dd></div>
              <div><dt>生成时间</dt><dd>{formatDate(snapshot.created_at)}</dd></div>
              <div><dt>来源批次</dt><dd>{snapshot.source_batch_ids.join("、")}</dd></div>
            </dl>
            <div className={styles.hashBox}>
              <span>不可变内容指纹</span>
              <code>{snapshot.content_hash}</code>
            </div>
          </>
        ) : <p className={styles.muted}>当前品牌尚未生成可追溯快照。</p>}
      </section>
      <section className={styles.detailSection}>
        <span className={styles.eyebrow}>ITEM IDENTITY</span>
        <h3>商品标识</h3>
        <dl className={styles.snapshotDefinition}>
          <div><dt>Catalog Item ID</dt><dd>{item.id}</dd></div>
          <div><dt>Family ID</dt><dd>{item.family_id}</dd></div>
          <div><dt>更新时间</dt><dd>{formatDate(item.updated_at)}</dd></div>
        </dl>
      </section>
    </div>
  );
}

export default function BrandAssetsWorkspace() {
  const [bundle, setBundle] = useState<BrandAssetBundle | null>(null);
  const [error, setError] = useState("");
  const [brandId, setBrandId] = useState("BR-NAIXUE");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ItemType | "all">("all");
  const [readiness, setReadiness] = useState<Readiness | "all">("all");
  const [tab, setTab] = useState<DetailTab>("profile");

  useEffect(() => {
    let active = true;
    fetch("/data-v040/brand-assets.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(async (data: unknown) => {
        const validated = await validateBrandAssetDocument(data);
        if (!active) return;
        const nextBundle = validated as unknown as BrandAssetBundle;
        setBundle(nextBundle);
        const requestedItemId = new URLSearchParams(window.location.search).get("item");
        const requestedItem = nextBundle.catalog_items.find((item) => item.id === requestedItemId);
        if (requestedItem) {
          setBrandId(requestedItem.brand_id);
          setSelectedItemId(requestedItem.id);
          writeWorkspaceBrand(requestedItem.brand_id);
        } else {
          const nextBrandId = readWorkspaceBrand(nextBundle.brands.map((brand) => brand.id), "BR-NAIXUE");
          setBrandId(nextBrandId);
          writeWorkspaceBrand(nextBrandId);
        }
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message || "数据加载失败");
      });
    return () => { active = false; };
  }, []);

  const filteredItems = useMemo(
    () => bundle ? filterBrandItems(bundle, brandId, { query, type, readiness }) : [],
    [bundle, brandId, query, type, readiness],
  );
  const stats = useMemo(
    () => bundle ? summarizeBrandAssets(bundle, brandId) : { total: 0, eligible: 0, needsReview: 0, unavailable: 0 },
    [bundle, brandId],
  );
  const selectedItem = bundle?.catalog_items.find((item) => item.id === selectedItemId)
    ?? filteredItems[0]
    ?? null;
  const currentBrand = bundle?.brands.find((brand) => brand.id === brandId);

  function switchBrand(nextBrandId: string) {
    setBrandId(nextBrandId);
    writeWorkspaceBrand(nextBrandId);
    setSelectedItemId("");
    setQuery("");
    setType("all");
    setReadiness("all");
    setTab("profile");
  }

  return (
    <div className={styles.shell}>
      <WorkspaceSidebar active="brand" subView="assets" brandId={brandId} />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>BRAND ASSET OPERATING SYSTEM · v0.4.0</p>
            <h1>品牌资产工作区</h1>
            <p>把品牌资料拆成可管理、可核验、可供营销系统消费的商品资产。</p>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.demoBadge}>SYNTHETIC DEMO</span>
            <span>CN · {bundle?.run.generated_at ? formatDate(bundle.run.generated_at) : "加载中"}</span>
          </div>
        </header>

        {error && (
          <div className={styles.errorState} role="alert">
            <strong>资产数据未能加载</strong>
            <p>{error}。请检查 public/data-v040/brand-assets.json。</p>
          </div>
        )}

        {!bundle && !error && (
          <div className={styles.loadingState} aria-live="polite">
            <span className={styles.loader} />正在装载品牌资产与依据链路…
          </div>
        )}

        {bundle && (
          <>
            <section className={styles.brandStrip} aria-label="切换品牌">
              <div className={styles.brandStripLabel}>
                <span>当前品牌</span>
                <strong>{currentBrand?.name}</strong>
              </div>
              <div className={styles.brandSwitches}>
                {bundle.brands.map((brand) => (
                  <button
                    type="button"
                    key={brand.id}
                    onClick={() => switchBrand(brand.id)}
                    className={brand.id === brandId ? styles.brandButtonActive : ""}
                    aria-pressed={brand.id === brandId}
                  >
                    <span>{brand.name}</span>
                    <small>{getBrandItems(bundle, brand.id).length} 项资产</small>
                  </button>
                ))}
              </div>
              <div className={styles.brandVersion}>
                <span>{currentBrand?.market}</span>
                <strong>Profile v{currentBrand?.version}</strong>
              </div>
            </section>

            <section className={styles.metrics} aria-label="品牌资产概览">
              <article><span>商品资产总数</span><strong>{stats.total}</strong><small>当前品牌</small></article>
              <article><span>可进入营销</span><strong className={styles.metricGood}>{stats.eligible}</strong><small>事实与范围已确认</small></article>
              <article><span>待补充核验</span><strong className={styles.metricWarn}>{stats.needsReview}</strong><small>不可自动进入创编</small></article>
              <article><span>失效 / 阻断</span><strong>{stats.unavailable}</strong><small>仅留作审计</small></article>
            </section>

            <section className={styles.workspace}>
              <div className={styles.catalogPanel}>
                <div className={styles.panelTitle}>
                  <div><span className={styles.eyebrow}>CATALOG</span><h2>泛商品库</h2></div>
                  <span>{filteredItems.length} / {stats.total}</span>
                </div>
                <div className={styles.filters}>
                  <label className={styles.searchBox}>
                    <span>⌕</span>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="搜索商品、场景或 ID"
                      aria-label="搜索商品资产"
                    />
                  </label>
                  <div className={styles.filterRow}>
                    <label>
                      <span className={styles.srOnly}>商品类型</span>
                      <select value={type} onChange={(event) => setType(event.target.value as ItemType | "all")}>
                        {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className={styles.srOnly}>营销就绪状态</span>
                      <select value={readiness} onChange={(event) => setReadiness(event.target.value as Readiness | "all")}>
                        {READINESS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
                <div className={styles.itemList} aria-live="polite">
                  {filteredItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      active={selectedItem?.id === item.id}
                      onSelect={() => { setSelectedItemId(item.id); setTab("profile"); }}
                    />
                  ))}
                  {!filteredItems.length && (
                    <div className={styles.emptyState}>
                      <strong>没有匹配的商品资产</strong>
                      <p>调整关键词或筛选条件后再试。</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.detailPanel}>
                {selectedItem ? (
                  <>
                    <div className={styles.detailHeader}>
                      <div>
                        <div className={styles.detailMeta}>
                          <span>{TYPE_LABELS[selectedItem.type]}</span>
                          <code>{selectedItem.id}</code>
                        </div>
                        <h2>{selectedItem.name}</h2>
                        <p>{selectedItem.canonical_category.replaceAll("_", " ")}</p>
                      </div>
                      <span className={`${styles.statusPill} ${styles.detailStatus} ${readinessTone(selectedItem.marketing_readiness)}`}>
                        {READINESS_LABELS[selectedItem.marketing_readiness]}
                      </span>
                    </div>
                    <div className={styles.flowAction}>
                      <div>
                        <span className={styles.eyebrow}>NEXT DECISION</span>
                        <strong>用当前品牌资产创建选品任务</strong>
                        <p>商品只作为重点评估对象，仍需通过生命周期、渠道和 Claim 硬规则。</p>
                      </div>
                      <a href={workspaceHref("/selection-tasks", brandId, { item: selectedItem.id })}>进入决策中心 →</a>
                    </div>
                    <div className={styles.tabs} role="tablist" aria-label="商品详情视图">
                      {([
                        ["profile", "资产画像"],
                        ["evidence", "依据链路"],
                        ["history", "版本快照"],
                      ] as const).map(([value, label]) => (
                        <button
                          type="button"
                          role="tab"
                          aria-selected={tab === value}
                          className={tab === value ? styles.tabActive : ""}
                          onClick={() => setTab(value)}
                          key={value}
                        >{label}</button>
                      ))}
                    </div>
                    {tab === "profile" && <OverviewPanel bundle={bundle} item={selectedItem} />}
                    {tab === "evidence" && <EvidencePanel bundle={bundle} item={selectedItem} />}
                    {tab === "history" && <HistoryPanel bundle={bundle} item={selectedItem} />}
                  </>
                ) : (
                  <div className={styles.emptyState}>选择一项商品资产查看详情。</div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
