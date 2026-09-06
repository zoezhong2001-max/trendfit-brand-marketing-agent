'use client';
import { useEffect, useState, Component, type ReactNode } from 'react';
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Radar,
  Layers3,
  FileText,
  ScanLine,
  Search,
  SlidersHorizontal,
  Check,
  ShieldCheck,
  AlertTriangle,
  Bookmark,
  History,
  Download,
  Copy,
  Pencil,
  X,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ACTIONS,
  DECISIONS,
  STORAGE_KEY,
  loadBundle,
  emptyStore,
  validateStore,
  persist,
  brandDraft,
  briefDraft,
  briefLabels,
  briefMarkdown,
  type Bundle,
  type Store,
  type Brand,
  type Brief,
  type BrandDraft,
  type BriefDraft,
  type Opportunity,
  type Action,
  type Decision,
  type Topic,
} from '@/lib/data';
const order: Decision[] = [
  'recommend',
  'rework',
  'needs_evidence',
  'not_recommend',
];
const sig: Record<string, string> = {
  broad_culture: '大众文化',
  category_occasion: '品类场景',
  brand_adjacent: '品牌邻近',
};
const queue: Record<string, string> = {
  trend_candidate: '候选话题',
  calendar: '日历机会',
  evergreen: '常青创意',
  case: '案例启发',
};
const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const fmt = (s: string) =>
  new Date(s).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
function saveFile(
  name: string,
  text: string,
  type = 'text/markdown;charset=utf-8',
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Badge({ decision }: { decision: Decision }) {
  return (
    <span className={'badge decision ' + decision}>{DECISIONS[decision]}</span>
  );
}
function Lines({ items }: { items: string[] }) {
  return (
    <ul className="lines">
      {items.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ul>
  );
}
function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <ScanLine size={30} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="boot">
        <h1>页面暂时无法显示</h1>
        <p>已有本机记录不会被删除，请重新加载。</p>
        <Button onClick={() => location.reload()}>重新加载</Button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function TrendFit() {
  const [data, setData] = useState<Bundle | null>(null),
    [store, setStore] = useState<Store | null>(null),
    [error, setError] = useState(''),
    [storageIssue, setStorageIssue] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setError('');
    setData(null);
    setStorageIssue(false);
    loadBundle()
      .then((d) => {
        if (!live) return;
        let s;
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          s = raw ? validateStore(JSON.parse(raw), d) : emptyStore(d);
        } catch {
          setStorageIssue(true);
          throw new Error(
            '本机记录无法读取或版本不匹配。原记录已保留，请先导出备份，再恢复空白工作区。',
          );
        }
        setStore(s);
        setData(d);
      })
      .catch((e) => {
        if (live) setError(e instanceof Error ? e.message : '读取失败');
      });
    return () => {
      live = false;
    };
  }, [attempt]);
  function recover() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saveFile('TrendFit-local-backup.json', raw, 'application/json');
      if (
        !confirm(
          '备份已下载。确定清空当前浏览器的 TrendFit 工作区并重新开始吗？',
        )
      )
        return;
      localStorage.removeItem(STORAGE_KEY);
      setAttempt((a) => a + 1);
    } catch {
      setError('浏览器存储不可用，请允许本站保存本机数据后重新加载。');
    }
  }
  if (error)
    return (
      <div className="boot">
        <div className="logo">◉ TrendFit</div>
        <AlertTriangle />
        <h1>{storageIssue ? '本机记录需要恢复' : '演示数据无法加载'}</h1>
        <p role="alert">{error}</p>
        <p>为避免显示错误判断，工作台已暂停。</p>
        <Button onClick={() => setAttempt((a) => a + 1)}>重试</Button>
        {storageIssue && (
          <Button className="secondary" onClick={recover}>
            备份并恢复工作区
          </Button>
        )}
      </div>
    );
  if (!data || !store)
    return (
      <div className="boot" role="status">
        <Radar className="accent" />
        <h1>正在打开品牌工作台</h1>
        <p>读取演示话题、品牌档案和本机记录。</p>
      </div>
    );
  return (
    <Boundary>
      <Workspace data={data} initial={store} />
    </Boundary>
  );
}
type Editor =
  | { kind: 'brand'; target: Brand; draft: BrandDraft; initial: BrandDraft }
  | { kind: 'brief'; target: Brief; draft: BriefDraft; initial: BriefDraft };
type Move = { route: string; brand?: string };
function Workspace({ data, initial }: { data: Bundle; initial: Store }) {
  const [store, setStore] = useState(initial),
    [route, setRoute] = useState('/'),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all'),
    [signal, setSignal] = useState('all'),
    [kind, setKind] = useState('all');
  const [toast, setToast] = useState(''),
    [saveError, setSaveError] = useState(''),
    [editor, setEditor] = useState<Editor | null>(null),
    [reason, setReason] = useState(''),
    [pending, setPending] = useState<Move | null>(null),
    [feedback, setFeedback] = useState<{
      a: Opportunity;
      action: Action;
    } | null>(null),
    [feedbackReason, setFeedbackReason] = useState(''),
    [history, setHistory] = useState(false),
    [manualCopy, setManualCopy] = useState('');
  const dirty =
    !!editor && JSON.stringify(editor.draft) !== JSON.stringify(editor.initial);
  const routeBrief = route.startsWith('/briefs/')
    ? data.briefs.find((b) => b.id === route.slice(8))
    : null;
  const brand =
    data.brands.find(
      (b) => b.id === (routeBrief?.brand_id || store.selectedBrand),
    ) || data.brands[0];
  const latestBrand = [...store.brandRevisions]
    .reverse()
    .find((r) => r.brand_id === brand.id);
  const stale = !!latestBrand?.draft;
  const profile = latestBrand?.draft || brandDraft(brand);
  const opportunities = data.opportunities.filter(
    (a) => a.brand.id === brand.id,
  );
  const localFeedback = (a: Opportunity) =>
    store.feedback.filter((e) => e.assessment_id === a.assessment_id);
  function commit(next: Store) {
    try {
      persist(next, data);
      setStore(next);
      setSaveError('');
      return true;
    } catch {
      setSaveError(
        '未保存：浏览器存储不可用或空间不足。修改仍留在当前页面，请重试或先复制文本。',
      );
      return false;
    }
  }
  function apply(move: Move) {
    let nextBrand = move.brand || brand.id;
    const bf = move.route.startsWith('/briefs/')
      ? data.briefs.find((b) => b.id === move.route.slice(8))
      : null;
    if (bf) nextBrand = bf.brand_id;
    if (
      nextBrand !== store.selectedBrand &&
      !commit({ ...store, selectedBrand: nextBrand })
    )
      return;
    setRoute(move.route);
    window.history.pushState(null, '', '#' + move.route);
    setEditor(null);
    setReason('');
    setPending(null);
    window.scrollTo({ top: 0 });
  }
  function navigate(move: Move) {
    if (dirty) {
      setPending(move);
      return;
    }
    apply(move);
  }
  useEffect(() => {
    const handle = () => {
      const next = location.hash.slice(1) || '/';
      if (dirty) {
        window.history.replaceState(null, '', '#' + route);
        setPending({ route: next });
        return;
      }
      const bf = next.startsWith('/briefs/')
        ? data.briefs.find((b) => b.id === next.slice(8))
        : null;
      setRoute(next);
      setEditor(null);
      if (bf && bf.brand_id !== store.selectedBrand)
        commit({ ...store, selectedBrand: bf.brand_id });
    };
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, [dirty, route, store, data]);
  useEffect(() => {
    setRoute(location.hash.slice(1) || '/');
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, [dirty]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5500);
    return () => clearTimeout(t);
  }, [toast]);
  // Optional browser agent interface: the same read-only workspace state, no hidden writes.
  useEffect(() => {
    type Context = {
      registerTool: (
        tool: unknown,
        options: { signal: AbortSignal },
      ) => unknown;
    };
    const ctx = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!ctx?.registerTool) return;
    const controller = new AbortController();
    try {
      Promise.resolve(
        ctx.registerTool(
          {
            name: 'read_trendfit_workspace',
            description:
              'Read the selected brand, displayed topic assessments and saved human feedback; does not edit or generate data.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute: (input: unknown) => {
              if (
                !input ||
                typeof input !== 'object' ||
                Object.keys(input).length
              )
                throw new Error('Expected an empty object');
              return {
                brand: brand.name,
                brandEdited: stale,
                runId: data.runId,
                mode: 'synthetic_demo',
                assessments: opportunities.map((a) => ({
                  topic: a.trend.title,
                  decision: a.decision,
                  reasons: a.reasons,
                  humanFeedback: localFeedback(a),
                })),
              };
            },
          },
          { signal: controller.signal },
        ),
      ).catch(() => console.warn('WEBMCP_UNAVAILABLE'));
    } catch {
      console.warn('WEBMCP_UNAVAILABLE');
    }
    return () => controller.abort();
  }, [store, brand.id]);
  function switchBrand(b: string) {
    if (b === brand.id) return;
    let target = route;
    if (routeBrief) {
      const bf = data.briefs.find(
        (x) => x.topic_id === routeBrief.topic_id && x.brand_id === b,
      );
      target = bf ? '/briefs/' + bf.id : '/trends/' + routeBrief.topic_id;
    }
    navigate({ route: target, brand: b });
    if (!dirty) setToast('已切换品牌视角，话题事实保持不变。');
  }
  function startBrand() {
    setEditor({
      kind: 'brand',
      target: brand,
      draft: { ...profile },
      initial: { ...profile },
    });
    setReason('');
  }
  function startBrief(b: Brief) {
    const r = [...store.briefRevisions]
      .reverse()
      .find((r) => r.brief_id === b.id);
    const draft = r?.draft || briefDraft(b);
    setEditor({
      kind: 'brief',
      target: b,
      draft: { ...draft },
      initial: { ...draft },
    });
    setReason('');
  }
  function saveEditor(move?: Move) {
    if (!editor) return false;
    if (!reason.trim()) {
      setSaveError('请填写修改理由，再保存副本。');
      return false;
    }
    if (Object.values(editor.draft).some((v) => !v.trim())) {
      setSaveError('请补全编辑字段；每一项都需要可读内容。');
      return false;
    }
    let next: Store;
    const revisionId = id();
    if (editor.kind === 'brand') {
      next = {
        ...store,
        brandRevisions: [
          ...store.brandRevisions,
          {
            id: revisionId,
            brand_id: editor.target.id,
            brand_version: editor.target.version,
            created_at: stamp(),
            reason: reason.trim(),
            draft: editor.draft,
          },
        ],
      };
    } else {
      const a = data.opportunities.find(
        (a) => a.assessment_id === editor.target.assessment_id,
      )!;
      next = {
        ...store,
        briefRevisions: [
          ...store.briefRevisions,
          {
            id: revisionId,
            brief_id: editor.target.id,
            brand_revision_id: latestBrand?.id || null,
            created_at: stamp(),
            draft: editor.draft,
          },
        ],
        feedback: [
          ...store.feedback,
          {
            id: id(),
            run_id: data.runId,
            assessment_id: a.assessment_id,
            brand_version: a.brand.version,
            topic_version: a.trend.version,
            brand_revision_id: latestBrand?.id || null,
            brief_revision_id: revisionId,
            actor_kind: 'human',
            action: 'edit_brief',
            reason: reason.trim(),
            created_at: stamp(),
          },
        ],
      };
    }
    if (move) {
      const bf = data.briefs.find((b) => move.route === '/briefs/' + b.id);
      next.selectedBrand = bf?.brand_id || move.brand || brand.id;
    }
    if (!commit(next)) return false;
    setEditor(null);
    setReason('');
    setToast(
      editor.kind === 'brand'
        ? '品牌副本已保存；原评估待重评。'
        : 'Brief 修改与理由已保存在本机。',
    );
    if (move) {
      setRoute(move.route);
      window.history.pushState(null, '', '#' + move.route);
      setPending(null);
    }
    return true;
  }
  function restoreBrand() {
    if (!confirm('恢复基准品牌档案？已有修改记录仍会保留。')) return;
    const next = {
      ...store,
      brandRevisions: [
        ...store.brandRevisions,
        {
          id: id(),
          brand_id: brand.id,
          brand_version: brand.version,
          created_at: stamp(),
          reason: '恢复基准品牌档案',
          draft: null,
        },
      ],
    };
    if (commit(next)) {
      setToast('已恢复基准品牌档案，历史修改保留。');
      setEditor(null);
    }
  }
  function submitFeedback() {
    if (!feedback || !feedbackReason.trim()) return;
    const a = feedback.a;
    const r = [...store.briefRevisions]
      .reverse()
      .find((r) => r.brief_id === a.brief_id);
    if (
      commit({
        ...store,
        feedback: [
          ...store.feedback,
          {
            id: id(),
            run_id: data.runId,
            assessment_id: a.assessment_id,
            brand_version: a.brand.version,
            topic_version: a.trend.version,
            brand_revision_id: latestBrand?.id || null,
            brief_revision_id: r?.id || null,
            actor_kind: 'human',
            action: feedback.action,
            reason: feedbackReason.trim(),
            created_at: stamp(),
          },
        ],
      })
    ) {
      setFeedback(null);
      setFeedbackReason('');
      setToast('人工选择已保存；模型原判断保持不变。');
    }
  }
  const NavLink = ({ to, children }: { to: string; children: ReactNode }) => (
    <a
      href={'#' + to}
      onClick={(e) => {
        e.preventDefault();
        navigate({ route: to });
      }}
    >
      {children}
    </a>
  );
  const feedbackButtons = (a: Opportunity) => (
    <div className="actions">
      {(['keep', 'reject', 'request_evidence'] as Action[]).map((action) => (
        <Button
          key={action}
          className="secondary"
          onClick={() => {
            setFeedback({ a, action });
            setFeedbackReason('');
          }}
        >
          {action === 'keep' ? (
            <Bookmark size={15} />
          ) : action === 'reject' ? (
            <X size={15} />
          ) : (
            <Search size={15} />
          )}{' '}
          {ACTIONS[action]}
        </Button>
      ))}
    </div>
  );
  const review = (a: Opportunity) => (
    <>
      <div className="section-label">
        02 / 品牌判断 <span>模型辅助评审样本</span>
      </div>
      <div className="review-head">
        <h2>{brand.name}应该参与吗？</h2>
        <Badge decision={a.decision} />
      </div>
      {stale && (
        <div className="warning">
          品牌档案已修改：以下判断基于基准档案 v{brand.version}，待重评。
        </div>
      )}
      <h3>参与理由</h3>
      <Lines items={a.reasons} />
      <div className="counter">
        <ShieldCheck size={18} />
        <div>
          <h3>最强反对意见</h3>
          <p>{a.counterargument}</p>
        </div>
      </div>
      <h3>改判前，需要补什么？</h3>
      <p>{a.evidence_gap}</p>
      {a.brief_id ? (
        <Button
          className="primary wide"
          onClick={() => navigate({ route: '/briefs/' + a.brief_id })}
        >
          打开 Brief 草稿 <ArrowUpRight size={18} />
        </Button>
      ) : (
        <div className="note">
          {a.decision === 'not_recommend'
            ? '当前不推荐参与，因此没有 Brief。'
            : '补充证据后，再决定是否形成 Brief。'}
        </div>
      )}
      {feedbackButtons(a)}
      {localFeedback(a).length > 0 && (
        <details className="history-inline">
          <summary>人工反馈 · {localFeedback(a).length} 条</summary>
          {localFeedback(a)
            .slice()
            .reverse()
            .map((e) => (
              <div className="event" key={e.id}>
                <strong>{ACTIONS[e.action]}</strong>
                <time>{fmt(e.created_at)}</time>
                <p>{e.reason}</p>
              </div>
            ))}
        </details>
      )}
    </>
  );
  function editorForm() {
    if (!editor) return null;
    const labels =
      editor.kind === 'brand'
        ? {
            positioning: '品牌定位',
            audiences: '核心人群（每行一项）',
            goals: '营销目标（每行一项）',
          }
        : briefLabels;
    return (
      <div className="editor">
        <div className="section-label">
          编辑本机副本 <span>原始内容保留</span>
        </div>
        {Object.entries(labels).map(([k, label]) => (
          <label className="field" key={k}>
            {label}
            <Textarea
              value={(editor.draft as unknown as Record<string, string>)[k]}
              maxLength={5000}
              onChange={(e) =>
                setEditor({
                  ...editor,
                  draft: { ...editor.draft, [k]: e.target.value },
                } as Editor)
              }
            />
          </label>
        ))}
        <label className="field">
          修改理由 <span>必填</span>
          <Textarea
            value={reason}
            maxLength={1000}
            onChange={(e) => setReason(e.target.value)}
            placeholder="为什么调整？希望改善什么？"
          />
        </label>
        <div className="actions">
          <Button className="primary" onClick={() => saveEditor()}>
            保存副本
          </Button>
          <Button
            className="secondary"
            onClick={() => {
              if (dirty && !confirm('放弃尚未保存的修改？')) return;
              setEditor(null);
              setReason('');
              setSaveError('');
            }}
          >
            取消编辑
          </Button>
          <span className="micro">
            {dirty ? '有未保存修改' : '尚未修改'} · 仅当前浏览器
          </span>
        </div>
      </div>
    );
  }
  const pageName =
    route === '/'
      ? '热点雷达'
      : route === '/brands'
        ? '品牌工作区'
        : route.startsWith('/briefs/')
          ? 'Brief 工作台'
          : '话题详情';
  const isHome = route === '/';
  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/">
          <div className="logo">
            <Radar size={27} /> TrendFit<span>RADAR ROOM</span>
          </div>
        </NavLink>
        <p className="eyebrow">品牌营销工作台</p>
        <nav>
          <Button
            className={'nav ' + (isHome ? 'active' : '')}
            onClick={() => navigate({ route: '/' })}
          >
            <Radar size={19} /> 热点雷达
          </Button>
          <Button
            className={'nav ' + (route === '/brands' ? 'active' : '')}
            onClick={() => navigate({ route: '/brands' })}
          >
            <Layers3 size={19} /> 品牌工作区
          </Button>
          <Button className="nav" onClick={() => setHistory(true)}>
            <History size={19} /> 决策记录{' '}
            <span className="nav-count">{store.feedback.length}</span>
          </Button>
        </nav>
        <div className="sidebar-story">
          <span className="crosshair">+</span>
          <p>
            不是每个热点，
            <br />
            都值得品牌跟进。
          </p>
          <span>先理解，再参与。</span>
        </div>
        <div className="sidefoot">
          <i /> 中国市场
          <br />
          v0.3.0 · 本机工作区
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>
            工作空间 <b>/</b> {pageName}
          </span>
          <span className="demo-tag">合成演示 · 热度未核验</span>
        </header>
        <div className="brandbar">
          <span>品牌视角</span>
          {data.brands.map((b) => (
            <Button
              key={b.id}
              aria-pressed={b.id === brand.id}
              className={b.id === brand.id ? 'selected' : ''}
              onClick={() => switchBrand(b.id)}
            >
              {b.name}
              {b.id === brand.id && <Check size={14} />}
            </Button>
          ))}
          <NavLink to="/brands">
            <span className="brand-profile">
              查看品牌档案 <ArrowUpRight size={14} />
            </span>
          </NavLink>
        </div>
        {saveError && (
          <div className="warning" role="alert">
            {saveError}
            <Button className="text-button" onClick={() => setSaveError('')}>
              关闭提示
            </Button>
          </div>
        )}
        {isHome ? (
          <>
            <section className="heading">
              <div>
                <p className="eyebrow">SIGNALS → BRAND OPPORTUNITIES</p>
                <h1>找到值得品牌参与的信号。</h1>
                <p>从人们的讨论出发，把相关性变成一个有理由的创意。</p>
              </div>
              <div className="heading-index">
                01<span>DISCOVER</span>
              </div>
            </section>
            <div className="overview">
              <div className="radar-overview">
                <div className="mini-radar" aria-hidden="true">
                  <div />
                  <div />
                  <div />
                  <i />
                  <b />
                  <em />
                </div>
                <div>
                  <p className="eyebrow">共享话题池</p>
                  <strong>
                    {
                      data.topics.filter(
                        (t) => t.queue_type === 'trend_candidate',
                      ).length
                    }
                    <small> 候选</small> <span>+</span>{' '}
                    {
                      data.topics.filter(
                        (t) => t.queue_type !== 'trend_candidate',
                      ).length
                    }
                    <small> 日历</small>
                  </strong>
                  <p className="micro">演示信号示意 · 尚未接入实时采集</p>
                </div>
              </div>
              <div className="overview-count">
                <strong>
                  {opportunities
                    .filter((a) => a.decision === 'recommend')
                    .length.toString()
                    .padStart(2, '0')}
                </strong>
                <span>推荐预研</span>
              </div>
              <div className="overview-count">
                <strong>
                  {opportunities
                    .filter((a) => a.decision === 'rework')
                    .length.toString()
                    .padStart(2, '0')}
                </strong>
                <span>需要改造</span>
              </div>
              <div className="overview-note">
                <span className="accent">{brand.name}</span>
                <p>
                  {stale
                    ? '品牌有本机修改，当前评估待重评。'
                    : '以品牌作用、人群语境与风险边界判断参与价值。'}
                </p>
              </div>
            </div>
            <div className="filters">
              <label className="search">
                <Search size={17} />
                <Input
                  aria-label="搜索话题"
                  placeholder="搜索话题、情绪或场景"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <label>
                <span className="sr-only">品牌结论</span>
                <select
                  aria-label="品牌结论"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">全部结论</option>
                  {order.map((v) => (
                    <option key={v} value={v}>
                      {DECISIONS[v]}
                    </option>
                  ))}
                </select>
              </label>
              <select
                aria-label="信号类型"
                value={signal}
                onChange={(e) => setSignal(e.target.value)}
              >
                <option value="all">全部信号</option>
                {Object.entries(sig).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                aria-label="机会类型"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="all">候选与日历</option>
                <option value="trend_candidate">候选话题</option>
                <option value="calendar">日历机会</option>
              </select>
            </div>
            <div className="list-heading">
              <span>
                <SlidersHorizontal size={15} /> 按品牌机会排序
              </span>
              <span>真实来源：未接入 · 所有候选待核验</span>
            </div>
            {(() => {
              const items = opportunities
                .filter((a) => {
                  const t = data.topics.find((t) => t.id === a.trend.id)!;
                  return (
                    (filter === 'all' || a.decision === filter) &&
                    (signal === 'all' || t.signal_layer === signal) &&
                    (kind === 'all' || t.queue_type === kind) &&
                    (t.title + t.meaning).includes(query.trim())
                  );
                })
                .sort(
                  (a, b) =>
                    order.indexOf(a.decision) - order.indexOf(b.decision),
                );
              return items.length ? (
                <div className="cards">
                  {items.map((a, i) => {
                    const t = data.topics.find((t) => t.id === a.trend.id)!;
                    const events = localFeedback(a);
                    return (
                      <article
                        className={
                          'topic-card ' +
                          (a.decision === 'recommend' ? 'featured' : '')
                        }
                        key={a.assessment_id}
                      >
                        <div className="card-top">
                          <span className="card-no">
                            {String(i + 1).padStart(2, '0')} /{' '}
                            {t.category_label}
                          </span>
                          <ArrowUpRight size={18} />
                        </div>
                        <div className="chips">
                          <span className="badge subtle">
                            {queue[t.queue_type]}
                          </span>
                          <span className="micro">{sig[t.signal_layer]}</span>
                        </div>
                        <NavLink to={'/trends/' + t.id}>
                          <h2>{t.title}</h2>
                        </NavLink>
                        <p className="meaning">{t.meaning}</p>
                        <div className="fit-line">
                          <Badge decision={a.decision} />
                          {stale && (
                            <span className="micro warning-text">待重评</span>
                          )}
                        </div>
                        <p className="fit-reason">{a.reasons[0]}</p>
                        <div className="evidence-mini">
                          热度未核验 · 原帖来源未接入
                        </div>
                        {events.length > 0 && (
                          <div className="human-tag">
                            人工：{ACTIONS[events[events.length - 1].action]}
                          </div>
                        )}
                        <Button
                          className="card-link"
                          onClick={() => navigate({ route: '/trends/' + t.id })}
                        >
                          查看判断与证据 <ArrowRight size={17} />
                        </Button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <Empty title="当前筛选没有结果">
                  <p>切换品牌保留了筛选条件，可以清除后查看所有判断。</p>
                  <Button
                    onClick={() => {
                      setQuery('');
                      setFilter('all');
                      setKind('all');
                      setSignal('all');
                    }}
                  >
                    清除筛选
                  </Button>
                </Empty>
              );
            })()}
            {!opportunities.some((a) => a.decision === 'recommend') && (
              <div className="note">
                暂时没有可直接推荐预研的机会。需要改造与不推荐，也是有价值的判断。
              </div>
            )}
            <footer className="page-footer">
              <span>3 个合成样本验证同一套跨品类工作流</span>
              <span>数据包生成于 {fmt(data.generatedAt)} · 非采集时间</span>
            </footer>
          </>
        ) : route === '/brands' ? (
          <>
            <section className="heading">
              <p className="eyebrow">BRAND LENS / 中国市场</p>
              <h1>每一次判断，都有品牌依据。</h1>
              <p>把定位、目标和参与边界放在同一张品牌档案里。</p>
            </section>
            <div className="detail-grid">
              <section className="panel">
                <div className="brand-title">
                  <div className="brand-monogram">
                    {brand.name === 'Petlibro' ? 'P' : '奈'}
                  </div>
                  <div>
                    <h2>{brand.name}</h2>
                    <p>
                      {brand.category === 'smart_pet_care'
                        ? '智能宠物照护'
                        : '现制茶饮与烘焙'}{' '}
                      · 中国市场
                    </p>
                  </div>
                </div>
                <div className="chips">
                  <span className="badge">
                    {brand.scenario === 'hypothetical_china_entry'
                      ? '假设进入中国'
                      : '中国市场演示'}
                  </span>
                  <span className="badge subtle">
                    {stale
                      ? '本机策略副本'
                      : brand.positioning.status ===
                          'historical_strategy_hypothesis'
                        ? '历史策略假设'
                        : '工作假设'}
                  </span>
                </div>
                {editor?.kind === 'brand' ? (
                  editorForm()
                ) : (
                  <>
                    <h3>品牌定位</h3>
                    <p className="lead">{profile.positioning}</p>
                    <h3>核心人群</h3>
                    <Lines items={profile.audiences.split('\n')} />
                    <h3>营销目标</h3>
                    <Lines items={profile.goals.split('\n')} />
                    <div className="actions">
                      <Button className="primary" onClick={startBrand}>
                        <Pencil size={16} />
                        编辑本机副本
                      </Button>
                      {stale && (
                        <Button className="secondary" onClick={restoreBrand}>
                          <RotateCcw size={16} />
                          恢复基准
                        </Button>
                      )}
                    </div>
                  </>
                )}
                <details>
                  <summary>查看基准档案与版本</summary>
                  <p>
                    基准 v{brand.version} · {brand.positioning.statement}
                  </p>
                  <Lines
                    items={[...brand.audiences, ...brand.marketing_goals]}
                  />
                </details>
                <details>
                  <summary>
                    品牌修改记录 ·{' '}
                    {
                      store.brandRevisions.filter(
                        (r) => r.brand_id === brand.id,
                      ).length
                    }
                  </summary>
                  {store.brandRevisions
                    .filter((r) => r.brand_id === brand.id)
                    .slice()
                    .reverse()
                    .map((r) => (
                      <div className="event" key={r.id}>
                        <time>{fmt(r.created_at)}</time>
                        <p>{r.reason}</p>
                        <p>{r.draft?.positioning || '恢复基准档案'}</p>
                      </div>
                    ))}
                </details>
              </section>
              <aside className="panel muted-panel">
                <div className="section-label">参与边界</div>
                <h3>品牌可以谈什么</h3>
                <Lines items={brand.permissions} />
                <h3>不能越过的边界</h3>
                <Lines items={brand.constraints} />
                <h3>仍需广告主确认</h3>
                <Lines items={brand.unknowns} />
                <details open>
                  <summary>资料与事实状态</summary>
                  <Lines items={brand.source_notes} />
                  <p className="micro">
                    本机编辑仅改变输入副本，在线重新评审将在后续版本接入。
                  </p>
                </details>
              </aside>
            </div>
          </>
        ) : route.startsWith('/trends/') ? (
          (() => {
            const t = data.topics.find((t) => t.id === route.slice(8));
            if (!t)
              return (
                <Empty title="未找到这个话题">
                  <Button onClick={() => navigate({ route: '/' })}>
                    回到热点雷达
                  </Button>
                </Empty>
              );
            const a = opportunities.find((a) => a.trend.id === t.id)!;
            return (
              <>
                <Button
                  className="back"
                  onClick={() => navigate({ route: '/' })}
                >
                  <ArrowLeft size={16} />
                  返回热点雷达
                </Button>
                <section className="heading detail-heading">
                  <p className="eyebrow">
                    {queue[t.queue_type]} / {sig[t.signal_layer]}
                  </p>
                  <h1>{t.title}</h1>
                  <p>{t.tagline}</p>
                </section>
                <div className="detail-grid">
                  <section className="panel">
                    <div className="section-label">
                      01 / 话题与证据 <span>独立于品牌</span>
                    </div>
                    <span className="badge">合成演示 · 热度未核验</span>
                    <h2>人们在表达什么？</h2>
                    <p className="lead">{t.meaning}</p>
                    {t.queue_type !== 'trend_candidate' && (
                      <div className="warning">
                        这是日历机会支线，不能计为实时热点推荐。
                      </div>
                    )}
                    <div className="time-grid">
                      <div>
                        <span>发布时间</span>
                        <strong>未知</strong>
                      </div>
                      <div>
                        <span>采集时间</span>
                        <strong>未采集</strong>
                      </div>
                      <div>
                        <span>传播规模</span>
                        <strong>未核验</strong>
                      </div>
                    </div>
                    <h3>来源与读取范围</h3>
                    {t.sources.map((s) => (
                      <div className="source" key={s.id}>
                        <FileText size={18} />
                        <div>
                          <strong>{s.title}</strong>
                          <p>{s.reading_coverage}</p>
                          <span className="micro">
                            无真实原文链接 · 仅用于工作流验证
                          </span>
                        </div>
                      </div>
                    ))}
                    <h3>进入策划前的证据缺口</h3>
                    <Lines items={t.evidence_gaps} />
                    <details>
                      <summary>来源与版本追溯</summary>
                      <p className="code">
                        {t.id} · v{t.version}
                        <br />
                        {t.source_refs.join('\n')}
                        <br />
                        {data.runId}
                      </p>
                    </details>
                  </section>
                  <section className="panel">{review(a)}</section>
                </div>
              </>
            );
          })()
        ) : route.startsWith('/briefs/') ? (
          (() => {
            const b = routeBrief;
            if (!b)
              return (
                <Empty title="未找到这个 Brief">
                  <Button onClick={() => navigate({ route: '/' })}>
                    回到热点雷达
                  </Button>
                </Empty>
              );
            const t = data.topics.find((t) => t.id === b.topic_id)!;
            const a = opportunities.find(
              (a) => a.assessment_id === b.assessment_id,
            )!;
            const rev = [...store.briefRevisions]
              .reverse()
              .find((r) => r.brief_id === b.id);
            const draft = rev?.draft || briefDraft(b);
            const copy = async () => {
              const text = briefMarkdown(
                b,
                draft,
                data,
                rev ? '本机修订 ' + rev.id : '基准草稿',
                stale,
              );
              try {
                await navigator.clipboard.writeText(text);
                setToast('已复制 Brief，包含来源和待核验状态。');
              } catch {
                setManualCopy(text);
              }
            };
            return (
              <>
                <Button
                  className="back"
                  onClick={() => navigate({ route: '/trends/' + t.id })}
                >
                  <ArrowLeft size={16} />
                  返回话题与判断
                </Button>
                <section className="heading detail-heading">
                  <p className="eyebrow">CREATIVE BRIEF / {brand.name}</p>
                  <h1>{draft.core_idea}</h1>
                  <div className="chips">
                    <span className="badge">待核验草稿</span>
                    <span className="badge subtle">{queue[t.queue_type]}</span>
                    <span className="micro">
                      {rev ? '本机编辑副本' : '模型辅助示例'} · 品牌 v
                      {b.brand_version} / 话题 v{b.topic_version}
                    </span>
                  </div>
                </section>
                {stale && (
                  <div className="warning">
                    品牌档案已修改。这份 Brief 仍基于基准档案，需重新评审。
                  </div>
                )}
                <div className="brief-grid">
                  <section className="panel brief-paper">
                    {editor?.kind === 'brief' ? (
                      editorForm()
                    ) : (
                      <>
                        <div className="section-label">
                          从话题出发{' '}
                          <NavLink to={'/trends/' + t.id}>
                            <span>
                              {t.title} <ArrowUpRight size={13} />
                            </span>
                          </NavLink>
                        </div>
                        <p className="lead">{b.hotspot_mechanism}</p>
                        {(Object.keys(briefLabels) as (keyof BriefDraft)[]).map(
                          (k, i) => (
                            <section className="brief-section" key={k}>
                              <span className="section-number">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <div>
                                <h3>{briefLabels[k]}</h3>
                                <p className="preserve">{draft[k]}</p>
                              </div>
                            </section>
                          ),
                        )}
                        <div className="actions">
                          <Button
                            className="primary"
                            onClick={() => startBrief(b)}
                          >
                            <Pencil size={16} />
                            编辑 Brief
                          </Button>
                          <Button className="secondary" onClick={copy}>
                            <Copy size={16} />
                            复制
                          </Button>
                          <Button
                            className="secondary"
                            onClick={() =>
                              saveFile(
                                'TrendFit-' + b.id + '.md',
                                briefMarkdown(
                                  b,
                                  draft,
                                  data,
                                  rev ? '本机修订 ' + rev.id : '基准草稿',
                                  stale,
                                ),
                              )
                            }
                          >
                            <Download size={16} />
                            导出
                          </Button>
                        </div>
                      </>
                    )}
                    <details>
                      <summary>原始 Brief 与修订记录</summary>
                      <h3>基准草稿</h3>
                      {Object.entries(briefDraft(b)).map(([k, v]) => (
                        <p key={k}>
                          <strong>
                            {briefLabels[k as keyof BriefDraft]}：
                          </strong>
                          {v}
                        </p>
                      ))}
                      {store.briefRevisions
                        .filter((r) => r.brief_id === b.id)
                        .map((r, i) => (
                          <div className="event" key={r.id}>
                            <strong>本机修订 {i + 1}</strong>
                            <time>{fmt(r.created_at)}</time>
                            <p>{r.draft.core_idea}</p>
                            <Button
                              className="text-button"
                              onClick={() =>
                                saveFile(
                                  'TrendFit-revision-' + r.id + '.md',
                                  briefMarkdown(
                                    b,
                                    r.draft,
                                    data,
                                    r.id,
                                    !!r.brand_revision_id,
                                  ),
                                )
                              }
                            >
                              导出这次修订
                            </Button>
                          </div>
                        ))}
                    </details>
                  </section>
                  <aside className="brief-aside">
                    <section className="panel">
                      <div className="section-label">机会卡</div>
                      <Badge decision={a.decision} />
                      <h3>为什么是这个品牌</h3>
                      <Lines items={a.reasons} />
                      <h3>警惕强行参与</h3>
                      <p>{a.counterargument}</p>
                    </section>
                    <section className="panel muted-panel">
                      <div className="section-label">执行前检查</div>
                      <Lines items={[...t.evidence_gaps, a.evidence_gap]} />
                      <p className="micro">
                        合成来源，无真实原文。保存与保留都不会把草稿升级为可执行方案。
                      </p>
                      {feedbackButtons(a)}
                    </section>
                    <section className="panel">
                      <div className="section-label">
                        人工选择 · {localFeedback(a).length}
                      </div>
                      {localFeedback(a).length ? (
                        localFeedback(a)
                          .slice()
                          .reverse()
                          .map((e) => (
                            <div className="event" key={e.id}>
                              <strong>{ACTIONS[e.action]}</strong>
                              <time>{fmt(e.created_at)}</time>
                              <p>{e.reason}</p>
                            </div>
                          ))
                      ) : (
                        <p>还没有反馈。你的选择会与模型判断分别保存。</p>
                      )}
                    </section>
                  </aside>
                </div>
              </>
            );
          })()
        ) : (
          <Empty title="这个页面不存在">
            <Button onClick={() => navigate({ route: '/' })}>
              回到热点雷达
            </Button>
          </Empty>
        )}
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <DialogContent className="modal">
          <DialogTitle>先处理未保存的修改</DialogTitle>
          <DialogDescription>
            切换页面或品牌前，选择保存、放弃，或继续编辑。
          </DialogDescription>
          <label className="field">
            修改理由
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="保存时必填"
            />
          </label>
          {saveError && (
            <p role="alert" className="warning-text">
              {saveError}
            </p>
          )}
          <div className="actions">
            <Button
              className="primary"
              onClick={() => {
                if (pending) saveEditor(pending);
              }}
            >
              保存并继续
            </Button>
            <Button
              className="secondary"
              onClick={() => {
                if (pending) apply(pending);
              }}
            >
              放弃修改
            </Button>
            <Button className="text-button" onClick={() => setPending(null)}>
              继续编辑
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!feedback}
        onOpenChange={(open) => {
          if (!open) setFeedback(null);
        }}
      >
        <DialogContent className="modal">
          <DialogTitle>
            {feedback ? ACTIONS[feedback.action] : ''}这条机会
          </DialogTitle>
          <DialogDescription>
            {feedback?.a.trend.title} · {brand.name}
            。人工选择不会覆盖模型原判断。
          </DialogDescription>
          <label className="field">
            判断理由（必填）
            <Textarea
              value={feedbackReason}
              maxLength={1000}
              onChange={(e) => setFeedbackReason(e.target.value)}
              placeholder="例如：保留情绪洞察，但先补充产品能力和传播证据。"
            />
          </label>
          {saveError && (
            <p role="alert" className="warning-text">
              {saveError}
            </p>
          )}
          <Button
            className="primary"
            disabled={!feedbackReason.trim()}
            onClick={submitFeedback}
          >
            保存人工选择
          </Button>
          <p className="micro">仅保存在当前浏览器，不自动执行营销活动。</p>
        </DialogContent>
      </Dialog>
      <Dialog open={history} onOpenChange={setHistory}>
        <DialogContent className="modal history-modal">
          <DialogTitle>决策记录</DialogTitle>
          <DialogDescription>
            两个品牌的人工反馈。模型建议始终单独保留。
          </DialogDescription>
          {store.feedback.length ? (
            store.feedback
              .slice()
              .reverse()
              .map((e) => {
                const a = data.opportunities.find(
                  (a) => a.assessment_id === e.assessment_id,
                )!;
                return (
                  <div className="event" key={e.id}>
                    <strong>
                      {ACTIONS[e.action]} · {a.brand.name}
                    </strong>
                    <time>{fmt(e.created_at)}</time>
                    <p>{a.trend.title}</p>
                    <p>{e.reason}</p>
                    <span className="micro">
                      原模型判断：{DECISIONS[a.decision]} ·{' '}
                      {e.brand_revision_id
                        ? '参考本机品牌修订'
                        : '基准品牌档案'}
                    </span>
                  </div>
                );
              })
          ) : (
            <Empty title="还没有人工反馈">
              <p>打开话题，保留、淘汰或要求补证，就会出现在这里。</p>
            </Empty>
          )}
          <Button
            className="secondary"
            onClick={() =>
              saveFile(
                'TrendFit-workspace.json',
                JSON.stringify(store, null, 2),
                'application/json',
              )
            }
          >
            <Download size={16} />
            导出本机工作区
          </Button>
          <Button
            className="text-button"
            onClick={() => {
              if (!confirm('清空当前浏览器的品牌副本、Brief 修订和人工反馈？'))
                return;
              localStorage.removeItem(STORAGE_KEY);
              location.reload();
            }}
          >
            <RotateCcw size={16} />
            重置本机演示
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!manualCopy}
        onOpenChange={(open) => {
          if (!open) setManualCopy('');
        }}
      >
        <DialogContent className="modal">
          <DialogTitle>手动复制 Brief</DialogTitle>
          <DialogDescription>
            浏览器未允许自动复制。选中以下文本即可复制。
          </DialogDescription>
          <Textarea
            aria-label="Brief复制文本"
            readOnly
            value={manualCopy}
            onFocus={(e) => e.target.select()}
            className="copy-area"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
