import type { ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, Copy, Download, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ACTIONS,
  briefDraft,
  briefLabels,
  briefMarkdown,
  type Brand,
  type Brief,
  type BriefDraft,
  type Bundle,
  type Opportunity,
  type Store,
} from '@/lib/data';
import { downloadText } from '@/lib/download';
import {
  DecisionBadge,
  EmptyState,
  LineList,
} from '@/components/shared/workspace-ui';
import type { WorkspaceMove } from '@/components/workspace/workspace-types';

const queueLabels: Record<string, string> = {
  trend_candidate: '候选话题',
  calendar: '日历机会',
  evergreen: '常青创意',
  case: '案例启发',
};

export function BriefWorkbenchPage({
  brief,
  data,
  store,
  brand,
  opportunities,
  stale,
  isEditing,
  editor,
  navigate,
  onEdit,
  onCopied,
  onManualCopy,
  renderFeedbackButtons,
  localFeedback,
  formatDate,
}: {
  brief: Brief | null | undefined;
  data: Bundle;
  store: Store;
  brand: Brand;
  opportunities: Opportunity[];
  stale: boolean;
  isEditing: boolean;
  editor: ReactNode;
  navigate: (move: WorkspaceMove) => void;
  onEdit: (brief: Brief) => void;
  onCopied: () => void;
  onManualCopy: (text: string) => void;
  renderFeedbackButtons: (opportunity: Opportunity) => ReactNode;
  localFeedback: (opportunity: Opportunity) => Store['feedback'];
  formatDate: (value: string) => string;
}) {
  if (!brief) {
    return (
      <EmptyState title="未找到这个 Brief">
        <Button onClick={() => navigate({ route: '/' })}>回到热点雷达</Button>
      </EmptyState>
    );
  }
  const topic = data.topics.find((item) => item.id === brief.topic_id)!;
  const opportunity = opportunities.find(
    (item) => item.assessment_id === brief.assessment_id,
  )!;
  const revision = [...store.briefRevisions]
    .reverse()
    .find((item) => item.brief_id === brief.id);
  const draft = revision?.draft || briefDraft(brief);
  const feedback = localFeedback(opportunity);

  async function copyBrief() {
    const text = briefMarkdown(
      brief!,
      draft,
      data,
      revision ? `本机修订 ${revision.id}` : '基准草稿',
      stale,
    );
    try {
      await navigator.clipboard.writeText(text);
      onCopied();
    } catch {
      onManualCopy(text);
    }
  }

  return (
    <>
      <Button
        className="back"
        onClick={() => navigate({ route: `/trends/${topic.id}` })}
      >
        <ArrowLeft size={16} />
        返回话题与判断
      </Button>
      <section className="heading detail-heading">
        <p className="eyebrow">CREATIVE BRIEF / {brand.name}</p>
        <h1>{draft.core_idea}</h1>
        <div className="chips">
          <span className="badge">待核验草稿</span>
          <span className="badge subtle">{queueLabels[topic.queue_type]}</span>
          <span className="micro">
            {revision ? '本机编辑副本' : '模型辅助示例'} · 品牌 v
            {brief.brand_version} / 话题 v{brief.topic_version}
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
          {isEditing ? (
            editor
          ) : (
            <>
              <div className="section-label">
                从话题出发{' '}
                <a
                  href={`#/trends/${topic.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    navigate({ route: `/trends/${topic.id}` });
                  }}
                >
                  <span>
                    {topic.title} <ArrowUpRight size={13} />
                  </span>
                </a>
              </div>
              <p className="lead">{brief.hotspot_mechanism}</p>
              {(Object.keys(briefLabels) as (keyof BriefDraft)[]).map(
                (key, index) => (
                  <section className="brief-section" key={key}>
                    <span className="section-number">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3>{briefLabels[key]}</h3>
                      <p className="preserve">{draft[key]}</p>
                    </div>
                  </section>
                ),
              )}
              <div className="actions">
                <Button className="primary" onClick={() => onEdit(brief)}>
                  <Pencil size={16} />
                  编辑 Brief
                </Button>
                <Button className="secondary" onClick={copyBrief}>
                  <Copy size={16} />
                  复制
                </Button>
                <Button
                  className="secondary"
                  onClick={() =>
                    downloadText(
                      `TrendFit-${brief.id}.md`,
                      briefMarkdown(
                        brief,
                        draft,
                        data,
                        revision ? `本机修订 ${revision.id}` : '基准草稿',
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
            {Object.entries(briefDraft(brief)).map(([key, value]) => (
              <p key={key}>
                <strong>{briefLabels[key as keyof BriefDraft]}：</strong>
                {value}
              </p>
            ))}
            {store.briefRevisions
              .filter((item) => item.brief_id === brief.id)
              .map((item, index) => (
                <div className="event" key={item.id}>
                  <strong>本机修订 {index + 1}</strong>
                  <time>{formatDate(item.created_at)}</time>
                  <p>{item.draft.core_idea}</p>
                  <Button
                    className="text-button"
                    onClick={() =>
                      downloadText(
                        `TrendFit-revision-${item.id}.md`,
                        briefMarkdown(
                          brief,
                          item.draft,
                          data,
                          item.id,
                          !!item.brand_revision_id,
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
            <DecisionBadge decision={opportunity.decision} />
            <h3>为什么是这个品牌</h3>
            <LineList items={opportunity.reasons} />
            <h3>警惕强行参与</h3>
            <p>{opportunity.counterargument}</p>
          </section>
          <section className="panel muted-panel">
            <div className="section-label">执行前检查</div>
            <LineList
              items={[...topic.evidence_gaps, opportunity.evidence_gap]}
            />
            <p className="micro">
              合成来源，无真实原文。保存与保留都不会把草稿升级为可执行方案。
            </p>
            {renderFeedbackButtons(opportunity)}
          </section>
          <section className="panel">
            <div className="section-label">人工选择 · {feedback.length}</div>
            {feedback.length ? (
              feedback
                .slice()
                .reverse()
                .map((event) => (
                  <div className="event" key={event.id}>
                    <strong>{ACTIONS[event.action]}</strong>
                    <time>{formatDate(event.created_at)}</time>
                    <p>{event.reason}</p>
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
}
