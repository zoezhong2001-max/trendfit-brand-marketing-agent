"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./selection-task-workspace.module.css";
import { validateBrandAssetDocument } from "../lib/brand-assets";
import {
  READINESS_LABELS,
  TYPE_LABELS,
  type BrandAssetBundle,
} from "../lib/brand-assets-view";
import {
  buildSelectionSnapshot,
  runSelectionTask,
  stableSnapshotKey,
  type SelectionObjective,
  type SelectionTaskInput,
} from "../lib/selection-engine";
import WorkspaceSidebar from "./workspace-sidebar";
import { readWorkspaceBrand, workspaceHref, writeWorkspaceBrand } from "../lib/workspace-context";

type ResultView = "selected" | "excluded";

const OBJECTIVES: Array<{ value: SelectionObjective; label: string; note: string }> = [
  { value: "conversion", label: "转化增长", note: "提高可执行变体的权重" },
  { value: "awareness", label: "品牌认知", note: "提高场景匹配的权重" },
  { value: "retention", label: "老客经营", note: "提高价值主张完整度的权重" },
];

const CHANNELS = [
  { value: "store", label: "门店" },
  { value: "ecommerce", label: "电商" },
  { value: "booking", label: "预约服务" },
];

const DEFAULT_TASK: SelectionTaskInput = {
  brandId: "BR-NAIXUE",
  objective: "conversion",
  market: "CN",
  channel: "store",
  scene: "下班",
  startsOn: "2026-09-15",
  endsOn: "2026-10-15",
  limit: 3,
};

function fieldId(name: string) {
  return `selection-${name}`;
}

export default function SelectionTaskWorkspace() {
  const [bundle, setBundle] = useState<BrandAssetBundle | null>(null);
  const [task, setTask] = useState<SelectionTaskInput>(DEFAULT_TASK);
  const [resultView, setResultView] = useState<ResultView>("selected");
  const [snapshotKey, setSnapshotKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/data-v040/brand-assets.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(async (raw: unknown) => {
        const validated = await validateBrandAssetDocument(raw);
        if (!active) return;
        const nextBundle = validated as unknown as BrandAssetBundle;
        setBundle(nextBundle);
        const nextBrandId = readWorkspaceBrand(nextBundle.brands.map((brand) => brand.id), DEFAULT_TASK.brandId);
        const channel = nextBrandId === "BR-BREEZECARE" ? "booking" : nextBrandId === "BR-PETLIBRO" ? "ecommerce" : "store";
        const scene = nextBrandId === "BR-BREEZECARE" ? "换季清洁" : nextBrandId === "BR-PETLIBRO" ? "短期离家" : "下班";
        setTask((current) => ({ ...current, brandId: nextBrandId, channel, scene }));
        writeWorkspaceBrand(nextBrandId);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message || "数据加载失败");
      });
    return () => { active = false; };
  }, []);

  const result = useMemo(
    () => bundle ? runSelectionTask(bundle, task) : null,
    [bundle, task],
  );
  const currentBrand = bundle?.brands.find((brand) => brand.id === task.brandId);

  function updateTask<K extends keyof SelectionTaskInput>(key: K, value: SelectionTaskInput[K]) {
    setTask((current) => ({ ...current, [key]: value }));
    setSnapshotKey("");
  }

  function changeBrand(brandId: string) {
    const channel = brandId === "BR-BREEZECARE" ? "booking" : brandId === "BR-PETLIBRO" ? "ecommerce" : "store";
    const scene = brandId === "BR-BREEZECARE" ? "换季清洁" : brandId === "BR-PETLIBRO" ? "短期离家" : "下班";
    setTask((current) => ({ ...current, brandId, channel, scene }));
    writeWorkspaceBrand(brandId);
    setSnapshotKey("");
  }

  function createSnapshot() {
    if (!bundle || !result || !result.selected.length) return;
    const snapshot = buildSelectionSnapshot(bundle, task, result);
    setSnapshotKey(stableSnapshotKey(snapshot));
  }

  return (
    <div className={styles.shell}>
      <WorkspaceSidebar active="decision" subView="selection" brandId={task.brandId} />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>SELECTION TASK · SLICE C</p>
            <h1>智能选品任务</h1>
            <p>根据营销目标和投放边界，生成可解释、可追溯的商品候选。</p>
          </div>
          <div className={styles.headerStatus}>
            <span className={styles.demoBadge}>SYNTHETIC DEMO</span>
            <span>{snapshotKey ? "快照已生成" : "任务配置中"}</span>
          </div>
        </header>

        <section className={styles.briefPaths} aria-label="Brief 决策路径">
          <article>
            <span>BRAND-LED</span>
            <strong>品牌型 Brief</strong>
            <p>热点与品牌调性契合、无需商品承接时，可直接从热点判断形成方案。</p>
            <a href={workspaceHref("/", task.brandId)}>返回热点雷达</a>
          </article>
          <article className={styles.pathActive}>
            <span>PRODUCT-LED · 当前路径</span>
            <strong>商品型 Brief</strong>
            <p>需要种草、促销或转化承接时，必须先通过硬规则并固化选品快照。</p>
          </article>
        </section>

        <ol className={styles.steps} aria-label="选品流程">
          <li className={styles.stepDone}><span>1</span><div><strong>定义任务</strong><small>目标与边界</small></div></li>
          <li className={result ? styles.stepDone : ""}><span>2</span><div><strong>规则过滤</strong><small>生命周期与可用性</small></div></li>
          <li className={result?.selected.length ? styles.stepDone : ""}><span>3</span><div><strong>解释排序</strong><small>透明匹配维度</small></div></li>
          <li className={snapshotKey ? styles.stepDone : ""}><span>4</span><div><strong>固化快照</strong><small>下游消费输入</small></div></li>
        </ol>

        {error && <div className={styles.errorState} role="alert">资产数据加载失败：{error}</div>}
        {!bundle && !error && <div className={styles.loadingState} aria-live="polite"><span />正在校验品牌资产…</div>}

        {bundle && result && (
          <div className={styles.workspace}>
            <section className={styles.taskPanel}>
              <div className={styles.panelHeading}>
                <div><span className={styles.eyebrow}>TASK INPUT</span><h2>营销任务</h2></div>
                <span>本地演示状态</span>
              </div>

              <div className={styles.formBody}>
                <fieldset className={styles.fieldset}>
                  <legend>1. 选择广告主品牌</legend>
                  <div className={styles.brandChoices}>
                    {bundle.brands.map((brand) => (
                      <button
                        type="button"
                        key={brand.id}
                        aria-pressed={brand.id === task.brandId}
                        className={brand.id === task.brandId ? styles.choiceActive : ""}
                        onClick={() => changeBrand(brand.id)}
                      >
                        <strong>{brand.name}</strong>
                        <small>Profile v{brand.version}</small>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend>2. 定义营销目标</legend>
                  <div className={styles.objectiveChoices}>
                    {OBJECTIVES.map((objective) => (
                      <label key={objective.value} className={task.objective === objective.value ? styles.objectiveActive : ""}>
                        <input
                          type="radio"
                          name="objective"
                          value={objective.value}
                          checked={task.objective === objective.value}
                          onChange={() => updateTask("objective", objective.value)}
                        />
                        <span><strong>{objective.label}</strong><small>{objective.note}</small></span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend>3. 设置投放边界</legend>
                  <div className={styles.formGrid}>
                    <label htmlFor={fieldId("market")}><span>目标市场</span>
                      <select id={fieldId("market")} value={task.market} onChange={(event) => updateTask("market", event.target.value)}>
                        <option value="CN">中国大陆（CN）</option>
                        <option value="US">美国（US）</option>
                      </select>
                    </label>
                    <label htmlFor={fieldId("channel")}><span>营销渠道</span>
                      <select id={fieldId("channel")} value={task.channel} onChange={(event) => updateTask("channel", event.target.value)}>
                        {CHANNELS.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}
                      </select>
                    </label>
                    <label htmlFor={fieldId("start")}><span>开始日期</span>
                      <input id={fieldId("start")} type="date" value={task.startsOn} onChange={(event) => updateTask("startsOn", event.target.value)} />
                    </label>
                    <label htmlFor={fieldId("end")}><span>结束日期</span>
                      <input id={fieldId("end")} type="date" min={task.startsOn} value={task.endsOn} onChange={(event) => updateTask("endsOn", event.target.value)} />
                    </label>
                    <label className={styles.wideField} htmlFor={fieldId("scene")}><span>核心营销场景</span>
                      <input id={fieldId("scene")} value={task.scene} onChange={(event) => updateTask("scene", event.target.value)} placeholder="例如：下班、换季清洁" />
                    </label>
                    <label htmlFor={fieldId("limit")}><span>最多推荐数量</span>
                      <select id={fieldId("limit")} value={task.limit} onChange={(event) => updateTask("limit", Number(event.target.value))}>
                        <option value={1}>1 个</option>
                        <option value={2}>2 个</option>
                        <option value={3}>3 个</option>
                      </select>
                    </label>
                  </div>
                </fieldset>

                <section className={styles.ruleBox}>
                  <div><span className={styles.eyebrow}>HARD GATES</span><h3>自动过滤规则</h3></div>
                  <ul>
                    <li><span>01</span>生命周期覆盖任务时间窗口</li>
                    <li><span>02</span>营销状态必须为“可进入营销”</li>
                    <li><span>03</span>目标市场和渠道已有确认范围</li>
                    <li><span>04</span>Claim 已确认且不存在硬阻断</li>
                  </ul>
                </section>
              </div>
            </section>

            <section className={styles.resultPanel}>
              <div className={styles.resultSummary}>
                <div>
                  <span className={styles.eyebrow}>LIVE RESULT</span>
                  <h2>{currentBrand?.name} · 选品结果</h2>
                  <p>{task.market} · {CHANNELS.find((channel) => channel.value === task.channel)?.label} · {task.startsOn} 至 {task.endsOn}</p>
                </div>
                <div className={styles.summaryMetrics}>
                  <div><strong>{result.evaluatedCount}</strong><span>已评估</span></div>
                  <div><strong className={styles.passNumber}>{result.eligible.length}</strong><span>通过硬规则</span></div>
                  <div><strong>{result.rejected.length}</strong><span>已排除</span></div>
                </div>
              </div>

              <div className={styles.resultTabs} role="tablist" aria-label="选品结果分类">
                <button type="button" role="tab" aria-selected={resultView === "selected"} className={resultView === "selected" ? styles.tabActive : ""} onClick={() => setResultView("selected")}>推荐候选 <span>{result.selected.length}</span></button>
                <button type="button" role="tab" aria-selected={resultView === "excluded"} className={resultView === "excluded" ? styles.tabActive : ""} onClick={() => setResultView("excluded")}>未选原因 <span>{result.rejected.length}</span></button>
              </div>

              <div className={styles.resultsBody}>
                {resultView === "selected" && (
                  <>
                    <div className={styles.scoreNotice}>
                      <strong>规则匹配度，不是预测 ROI</strong>
                      <p>分数只来自页面列出的四个确定性维度，用于候选排序，不承诺投放效果。</p>
                    </div>
                    {result.selected.map((candidate, index) => (
                      <article className={styles.candidateCard} key={candidate.item.id}>
                        <div className={styles.candidateTop}>
                          <span className={styles.rank}>#{index + 1}</span>
                          <div className={styles.candidateIdentity}>
                            <span>{TYPE_LABELS[candidate.item.type]} · {candidate.item.id}</span>
                            <h3>{candidate.item.name}</h3>
                            <p>{candidate.item.value_proposition.value}</p>
                          </div>
                          <div className={styles.fitScore}><strong>{candidate.fit}</strong><span>/ 100<br />规则匹配度</span></div>
                        </div>
                        <div className={styles.signalGrid}>
                          {candidate.signals.map((signal) => (
                            <div key={signal.label} className={signal.matched ? styles.signalMatched : styles.signalMissed}>
                              <span>{signal.matched ? `+${signal.points}` : "+0"}</span>
                              <strong>{signal.label}</strong>
                              <small>{signal.detail}</small>
                            </div>
                          ))}
                        </div>
                        <div className={styles.candidateFoot}>
                          <span>{READINESS_LABELS[candidate.item.marketing_readiness]}</span>
                          <span>{candidate.item.source_refs.length} 条来源引用</span>
                          <a href={workspaceHref("/brand-assets", task.brandId, { item: candidate.item.id })}>查看资产依据 →</a>
                        </div>
                      </article>
                    ))}
                    {!result.selected.length && (
                      <div className={styles.emptyResult}>
                        <strong>没有商品通过硬规则</strong>
                        <p>商品型 Brief 暂时被阻断。你可以查看未选原因、调整真实边界，或返回热点判断，独立确认是否适合创建不绑定商品的品牌型 Brief。</p>
                        <a href={workspaceHref("/", task.brandId)}>重新判断品牌型路径 →</a>
                      </div>
                    )}
                  </>
                )}

                {resultView === "excluded" && (
                  <div className={styles.rejectedList}>
                    {result.rejected.map(({ item, reasons }) => (
                      <article key={item.id}>
                        <div><span>{TYPE_LABELS[item.type]} · {item.id}</span><h3>{item.name}</h3></div>
                        <ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                      </article>
                    ))}
                    {!result.rejected.length && <div className={styles.emptyResult}>所有商品均通过硬规则。</div>}
                  </div>
                )}
              </div>

              <footer className={styles.actionBar}>
                <div>
                  {snapshotKey ? (
                    <><span>选品快照</span><strong>{snapshotKey}</strong><small>绑定 {bundle.brand_asset_snapshots.find((entry) => entry.brand_id === task.brandId)?.id}</small></>
                  ) : (
                    <><span>下一步</span><strong>固化本次选择</strong><small>生成可供 Brief / 创编消费的不可变输入</small></>
                  )}
                </div>
                <button type="button" disabled={!result.selected.length} onClick={createSnapshot}>
                  {snapshotKey ? "已生成选品快照" : "生成选品快照"}
                </button>
              </footer>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
