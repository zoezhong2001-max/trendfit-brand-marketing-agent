import type { BrandAssetBundle, CatalogItem } from "./brand-assets-view";

export type SelectionObjective = "conversion" | "awareness" | "retention";

export interface SelectionTaskInput {
  brandId: string;
  objective: SelectionObjective;
  market: string;
  channel: string;
  scene: string;
  startsOn: string;
  endsOn: string;
  limit: number;
}

export interface ScoredCandidate {
  item: CatalogItem;
  fit: number;
  signals: Array<{ label: string; matched: boolean; points: number; detail: string }>;
}

export interface RejectedCandidate {
  item: CatalogItem;
  reasons: string[];
}

export interface SelectionResult {
  selected: ScoredCandidate[];
  eligible: ScoredCandidate[];
  rejected: RejectedCandidate[];
  evaluatedCount: number;
}

function dateWithinWindow(
  startsOn: string,
  endsOn: string,
  validFrom: string | null,
  validTo: string | null,
) {
  const startsAfterExpiry = validTo ? startsOn > validTo : false;
  const endsBeforeStart = validFrom ? endsOn < validFrom : false;
  return !startsAfterExpiry && !endsBeforeStart;
}

function rejectReasons(bundle: BrandAssetBundle, item: CatalogItem, task: SelectionTaskInput) {
  const reasons: string[] = [];
  if (["retired", "archived"].includes(item.lifecycle.status)) {
    reasons.push("商品生命周期已不可投放");
  }
  if (item.marketing_readiness !== "eligible") {
    reasons.push(
      item.marketing_readiness === "needs_review"
        ? "营销信息仍待补充核验"
        : item.marketing_readiness === "expired"
          ? "营销有效期已结束"
          : "存在营销硬阻断",
    );
  }
  const matchingAvailability = item.availability.find(
    (entry) =>
      entry.market === task.market &&
      entry.channel === task.channel &&
      entry.status === "available" &&
      dateWithinWindow(task.startsOn, task.endsOn, entry.valid_from, entry.valid_to),
  );
  if (!matchingAvailability) {
    reasons.push(`目标市场与渠道没有已确认可用范围（${task.market} · ${task.channel}）`);
  }
  if (item.hard_blockers.length) {
    reasons.push(...item.hard_blockers.map((blocker) => `硬阻断：${blocker}`));
  }
  const claims = item.claim_refs
    .map((claimId) => bundle.claims.find((claim) => claim.id === claimId))
    .filter(Boolean);
  if (claims.length !== item.claim_refs.length || claims.some((claim) => claim?.review_status !== "confirmed")) {
    reasons.push("商品绑定的 Claim 尚未全部确认");
  }
  return Array.from(new Set(reasons));
}

function scoreCandidate(item: CatalogItem, task: SelectionTaskInput): ScoredCandidate {
  const sceneQuery = task.scene.trim().toLocaleLowerCase("zh-CN");
  const sceneMatch = !sceneQuery || item.scene_tags.some((tag) => tag.toLocaleLowerCase("zh-CN").includes(sceneQuery));
  const explicitValue = item.value_proposition.fact_status === "explicit" && item.value_proposition.review_status === "confirmed";
  const evidenceComplete = item.source_refs.length > 0 && item.value_proposition.evidence_refs.length > 0;
  const variantReady = item.variants.length > 0;
  const weights = task.objective === "awareness"
    ? { scene: 40, value: 25, evidence: 25, variant: 10 }
    : task.objective === "retention"
      ? { scene: 35, value: 30, evidence: 25, variant: 10 }
      : { scene: 30, value: 25, evidence: 25, variant: 20 };
  const fit =
    (sceneMatch ? weights.scene : 0) +
    (explicitValue ? weights.value : 0) +
    (evidenceComplete ? weights.evidence : 0) +
    (variantReady ? weights.variant : 0);
  return {
    item,
    fit,
    signals: [
      {
        label: "场景匹配",
        matched: sceneMatch,
        points: sceneMatch ? weights.scene : 0,
        detail: sceneQuery ? `目标“${task.scene}”与商品场景标签比对` : "任务未限定具体场景",
      },
      {
        label: "价值主张已确认",
        matched: explicitValue,
        points: explicitValue ? weights.value : 0,
        detail: explicitValue ? "事实状态明确且已经复核" : "仍包含假设或未复核描述",
      },
      {
        label: "依据链路完整",
        matched: evidenceComplete,
        points: evidenceComplete ? weights.evidence : 0,
        detail: evidenceComplete ? "商品与价值字段均绑定来源" : "关键字段来源引用不完整",
      },
      {
        label: "可执行变体",
        matched: variantReady,
        points: variantReady ? weights.variant : 0,
        detail: variantReady ? `${item.variants.length} 个已结构化变体` : "尚无可执行变体",
      },
    ],
  };
}

export function runSelectionTask(bundle: BrandAssetBundle, task: SelectionTaskInput): SelectionResult {
  const brandItems = bundle.catalog_items.filter((item) => item.brand_id === task.brandId);
  const rejected: RejectedCandidate[] = [];
  const eligible: ScoredCandidate[] = [];
  for (const item of brandItems) {
    const reasons = rejectReasons(bundle, item, task);
    if (reasons.length) rejected.push({ item, reasons });
    else eligible.push(scoreCandidate(item, task));
  }
  eligible.sort((a, b) => b.fit - a.fit || a.item.name.localeCompare(b.item.name, "zh-CN"));
  return {
    selected: eligible.slice(0, Math.max(1, task.limit)),
    eligible,
    rejected,
    evaluatedCount: brandItems.length,
  };
}

export function buildSelectionSnapshot(
  bundle: BrandAssetBundle,
  task: SelectionTaskInput,
  result: SelectionResult,
) {
  const brandSnapshot = bundle.brand_asset_snapshots.find((snapshot) => snapshot.brand_id === task.brandId);
  return {
    schema_version: "0.4.0-selection-v1",
    task: {
      ...task,
      scene: task.scene.trim(),
    },
    input_brand_snapshot_id: brandSnapshot?.id ?? null,
    selected_items: result.selected.map(({ item, fit }) => ({
      id: item.id,
      version: item.version,
      rule_fit: fit,
    })),
    excluded_items: result.rejected.map(({ item, reasons }) => ({
      id: item.id,
      version: item.version,
      reasons,
    })),
  };
}

export function stableSnapshotKey(snapshot: ReturnType<typeof buildSelectionSnapshot>) {
  const input = JSON.stringify(snapshot);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `SEL-${(hash >>> 0).toString(16).padStart(8, "0").toUpperCase()}`;
}
