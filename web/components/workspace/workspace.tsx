'use client';
import { Button } from '@/components/ui/button';
import { type Bundle, type Store, type Opportunity } from '@/lib/data';
import WorkspaceSidebar from '../workspace-sidebar';
import { EmptyState as Empty } from '@/components/shared/workspace-ui';
import { RadarPage } from '@/components/radar/radar-page';
import { BrandProfilePage } from '@/components/brands/brand-profile-page';
import { TrendDetailPage } from '@/components/trends/trend-detail-page';
import { BriefWorkbenchPage } from '@/components/briefs/brief-workbench-page';
import { FeedbackActions } from '@/components/feedback/feedback-actions';
import { AssessmentPanel } from '@/components/trends/assessment-panel';
import { WorkspaceEditor } from '@/components/shared/workspace-editor';
import { WorkspaceDialogs } from '@/components/feedback/workspace-dialogs';
import { WorkspaceHeader } from './workspace-header';
import { useWorkspaceController } from './use-workspace-controller';

const fmt = (s: string) =>
  new Date(s).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
export function Workspace({ data, initial }: { data: Bundle; initial: Store }) {
  const {
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
  } = useWorkspaceController(data, initial);
  const feedbackButtons = (opportunity: Opportunity) => (
    <FeedbackActions opportunity={opportunity} onSelect={openFeedback} />
  );
  const review = (opportunity: Opportunity) => (
    <AssessmentPanel
      opportunity={opportunity}
      brand={brand}
      stale={stale}
      feedback={localFeedback(opportunity)}
      navigate={navigate}
      onFeedback={openFeedback}
      formatDate={fmt}
    />
  );
  function editorForm() {
    if (!editor) return null;
    return (
      <WorkspaceEditor
        editor={editor}
        reason={reason}
        dirty={dirty}
        onEditorChange={setEditor}
        onReasonChange={setReason}
        onSave={() => {
          saveEditor();
        }}
        onCancel={() => {
          if (dirty && !confirm('放弃尚未保存的修改？')) return;
          setEditor(null);
          setReason('');
          setSaveError('');
        }}
      />
    );
  }
  const isHome = route === '/';
  return (
    <div className="shell">
      <WorkspaceSidebar
        active={
          route === '/brands'
            ? 'brand'
            : route.startsWith('/briefs/')
              ? 'decision'
              : 'radar'
        }
        subView={
          route === '/brands'
            ? 'profile'
            : route.startsWith('/briefs/')
              ? 'brief'
              : undefined
        }
        brandId={brand.id}
        feedbackCount={store.feedback.length}
        currentBriefHref={
          route.startsWith('/briefs/') ? `/#${route}` : undefined
        }
      />
      <main className="main">
        <WorkspaceHeader
          route={route}
          brands={data.brands}
          brand={brand}
          saveError={saveError}
          navigate={navigate}
          switchBrand={switchBrand}
          clearSaveError={() => setSaveError('')}
        />
        {isHome ? (
          <RadarPage
            data={data}
            brand={brand}
            opportunities={opportunities}
            stale={stale}
            query={query}
            filter={filter}
            signal={signal}
            kind={kind}
            setQuery={setQuery}
            setFilter={setFilter}
            setSignal={setSignal}
            setKind={setKind}
            navigate={navigate}
            localFeedback={localFeedback}
            formatDate={fmt}
          />
        ) : route === '/brands' ? (
          <BrandProfilePage
            brand={brand}
            profile={profile}
            stale={stale}
            isEditing={editor?.kind === 'brand'}
            editor={editorForm()}
            revisions={store.brandRevisions.filter(
              (item) => item.brand_id === brand.id,
            )}
            onEdit={startBrand}
            onRestore={restoreBrand}
            formatDate={fmt}
          />
        ) : route.startsWith('/trends/') ? (
          <TrendDetailPage
            topicId={route.slice(8)}
            data={data}
            opportunities={opportunities}
            navigate={navigate}
            renderReview={review}
          />
        ) : route.startsWith('/briefs/') ? (
          <BriefWorkbenchPage
            brief={routeBrief}
            data={data}
            store={store}
            brand={brand}
            opportunities={opportunities}
            stale={stale}
            isEditing={editor?.kind === 'brief'}
            editor={editorForm()}
            navigate={navigate}
            onEdit={startBrief}
            onCopied={() => setToast('已复制 Brief，包含来源和待核验状态。')}
            onManualCopy={setManualCopy}
            renderFeedbackButtons={feedbackButtons}
            localFeedback={localFeedback}
            formatDate={fmt}
          />
        ) : (
          <Empty title="这个页面不存在">
            <Button onClick={() => navigate({ route: '/' })}>
              回到热点雷达
            </Button>
          </Empty>
        )}
      </main>
      <WorkspaceDialogs
        toast={toast}
        pending={pending}
        reason={reason}
        saveError={saveError}
        feedback={feedback}
        feedbackReason={feedbackReason}
        history={history}
        manualCopy={manualCopy}
        brand={brand}
        data={data}
        store={store}
        formatDate={fmt}
        setPending={setPending}
        setReason={setReason}
        setFeedback={setFeedback}
        setFeedbackReason={setFeedbackReason}
        setHistory={setHistory}
        setManualCopy={setManualCopy}
        saveAndContinue={saveEditor}
        discardAndContinue={apply}
        submitFeedback={submitFeedback}
      />
    </div>
  );
}
