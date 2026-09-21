'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  brandDraft,
  briefDraft,
  persist,
  type Action,
  type Brief,
  type Bundle,
  type Opportunity,
  type Store,
} from '@/lib/data';
import { writeWorkspaceBrand } from '@/lib/workspace-context';
import type { Editor, FeedbackDraft, WorkspaceMove } from './workspace-types';

const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();

export function useWorkspaceController(data: Bundle, initial: Store) {
  const [store, setStore] = useState(initial);
  const [route, setRoute] = useState(() =>
    typeof location === 'undefined' ? '/' : location.hash.slice(1) || '/',
  );
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [signal, setSignal] = useState('all');
  const [kind, setKind] = useState('all');
  const [toast, setToast] = useState('');
  const [saveError, setSaveError] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState<WorkspaceMove | null>(null);
  const [feedback, setFeedback] = useState<FeedbackDraft | null>(null);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [history, setHistory] = useState(
    () =>
      typeof location !== 'undefined' &&
      new URLSearchParams(location.search).get('panel') === 'feedback',
  );
  const [manualCopy, setManualCopy] = useState('');

  const dirty =
    !!editor && JSON.stringify(editor.draft) !== JSON.stringify(editor.initial);
  const routeBrief = route.startsWith('/briefs/')
    ? data.briefs.find((item) => item.id === route.slice(8))
    : null;
  const brand =
    data.brands.find(
      (item) => item.id === (routeBrief?.brand_id || store.selectedBrand),
    ) || data.brands[0];
  const latestBrand = [...store.brandRevisions]
    .reverse()
    .find((item) => item.brand_id === brand.id);
  const stale = !!latestBrand?.draft;
  const profile = latestBrand?.draft || brandDraft(brand);
  const opportunities = data.opportunities.filter(
    (item) => item.brand.id === brand.id,
  );
  const localFeedback = (opportunity: Opportunity) =>
    store.feedback.filter(
      (entry) => entry.assessment_id === opportunity.assessment_id,
    );

  const commit = useCallback(
    (next: Store) => {
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
    },
    [data],
  );

  function apply(move: WorkspaceMove) {
    let nextBrand = move.brand || brand.id;
    const brief = move.route.startsWith('/briefs/')
      ? data.briefs.find((item) => item.id === move.route.slice(8))
      : null;
    if (brief) nextBrand = brief.brand_id;
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

  function navigate(move: WorkspaceMove) {
    if (dirty) return setPending(move);
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
      const brief = next.startsWith('/briefs/')
        ? data.briefs.find((item) => item.id === next.slice(8))
        : null;
      setRoute(next);
      setEditor(null);
      if (brief && brief.brand_id !== store.selectedBrand)
        commit({ ...store, selectedBrand: brief.brand_id });
    };
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, [dirty, route, store, data, commit]);

  useEffect(() => {
    if (!dirty) return;
    const before = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, [dirty]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 5500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    type Context = {
      registerTool: (
        tool: unknown,
        options: { signal: AbortSignal },
      ) => unknown;
    };
    const context = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
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
                assessments: opportunities.map((item) => ({
                  topic: item.trend.title,
                  decision: item.decision,
                  reasons: item.reasons,
                  humanFeedback: store.feedback.filter(
                    (entry) => entry.assessment_id === item.assessment_id,
                  ),
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
  }, [store, brand.id, brand.name, stale, data.runId, opportunities]);

  function switchBrand(brandId: string) {
    if (brandId === brand.id) return;
    writeWorkspaceBrand(brandId);
    let target = route;
    if (routeBrief) {
      const brief = data.briefs.find(
        (item) =>
          item.topic_id === routeBrief.topic_id && item.brand_id === brandId,
      );
      target = brief ? '/briefs/' + brief.id : '/trends/' + routeBrief.topic_id;
    }
    navigate({ route: target, brand: brandId });
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

  function startBrief(brief: Brief) {
    const revision = [...store.briefRevisions]
      .reverse()
      .find((item) => item.brief_id === brief.id);
    const draft = revision?.draft || briefDraft(brief);
    setEditor({
      kind: 'brief',
      target: brief,
      draft: { ...draft },
      initial: { ...draft },
    });
    setReason('');
  }

  function saveEditor(move?: WorkspaceMove) {
    if (!editor) return false;
    if (!reason.trim()) {
      setSaveError('请填写修改理由，再保存副本。');
      return false;
    }
    if (Object.values(editor.draft).some((value) => !value.trim())) {
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
      const assessment = data.opportunities.find(
        (item) => item.assessment_id === editor.target.assessment_id,
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
            assessment_id: assessment.assessment_id,
            brand_version: assessment.brand.version,
            topic_version: assessment.trend.version,
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
      const brief = data.briefs.find(
        (item) => move.route === '/briefs/' + item.id,
      );
      next.selectedBrand = brief?.brand_id || move.brand || brand.id;
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
    const assessment = feedback.a;
    const revision = [...store.briefRevisions]
      .reverse()
      .find((item) => item.brief_id === assessment.brief_id);
    if (
      commit({
        ...store,
        feedback: [
          ...store.feedback,
          {
            id: id(),
            run_id: data.runId,
            assessment_id: assessment.assessment_id,
            brand_version: assessment.brand.version,
            topic_version: assessment.trend.version,
            brand_revision_id: latestBrand?.id || null,
            brief_revision_id: revision?.id || null,
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

  function openFeedback(opportunity: Opportunity, action: Action) {
    setFeedback({ a: opportunity, action });
    setFeedbackReason('');
  }

  return {
    store,
    route,
    query,
    filter,
    signal,
    kind,
    toast,
    saveError,
    editor,
    reason,
    pending,
    feedback,
    feedbackReason,
    history,
    manualCopy,
    dirty,
    routeBrief,
    brand,
    stale,
    profile,
    opportunities,
    setQuery,
    setFilter,
    setSignal,
    setKind,
    setToast,
    setSaveError,
    setEditor,
    setReason,
    setPending,
    setFeedback,
    setFeedbackReason,
    setHistory,
    setManualCopy,
    localFeedback,
    apply,
    navigate,
    switchBrand,
    startBrand,
    startBrief,
    saveEditor,
    restoreBrand,
    submitFeedback,
    openFeedback,
  };
}
