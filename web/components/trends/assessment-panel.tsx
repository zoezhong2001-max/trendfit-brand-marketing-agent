import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ACTIONS, type Brand, type Opportunity, type Store } from '@/lib/data';
import { DecisionBadge, LineList } from '@/components/shared/workspace-ui';
import { FeedbackActions } from '@/components/feedback/feedback-actions';
import type { WorkspaceMove } from '@/components/workspace/workspace-types';

export function AssessmentPanel({
  opportunity,
  brand,
  stale,
  feedback,
  navigate,
  onFeedback,
  formatDate,
}: {
  opportunity: Opportunity;
  brand: Brand;
  stale: boolean;
  feedback: Store['feedback'];
  navigate: (move: WorkspaceMove) => void;
  onFeedback: Parameters<typeof FeedbackActions>[0]['onSelect'];
  formatDate: (value: string) => string;
}) {
  return (
    <>
      <div className="section-label">
        02 / 品牌判断 <span>模型辅助评审样本</span>
      </div>
      <div className="review-head">
        <h2>{brand.name}应该参与吗？</h2>
        <DecisionBadge decision={opportunity.decision} />
      </div>
      {stale && (
        <div className="warning">
          品牌档案已修改：以下判断基于基准档案 v{brand.version}，待重评。
        </div>
      )}
      <h3>参与理由</h3>
      <LineList items={opportunity.reasons} />
      <div className="counter">
        <ShieldCheck size={18} />
        <div>
          <h3>最强反对意见</h3>
          <p>{opportunity.counterargument}</p>
        </div>
      </div>
      <h3>改判前，需要补什么？</h3>
      <p>{opportunity.evidence_gap}</p>
      {opportunity.brief_id ? (
        <Button
          className="primary wide"
          onClick={() => navigate({ route: `/briefs/${opportunity.brief_id}` })}
        >
          打开 Brief 草稿 <ArrowUpRight size={18} />
        </Button>
      ) : (
        <div className="note">
          {opportunity.decision === 'not_recommend'
            ? '当前不推荐参与，因此没有 Brief。'
            : '补充证据后，再决定是否形成 Brief。'}
        </div>
      )}
      <FeedbackActions opportunity={opportunity} onSelect={onFeedback} />
      {feedback.length > 0 && (
        <details className="history-inline">
          <summary>人工反馈 · {feedback.length} 条</summary>
          {feedback
            .slice()
            .reverse()
            .map((event) => (
              <div className="event" key={event.id}>
                <strong>{ACTIONS[event.action]}</strong>
                <time>{formatDate(event.created_at)}</time>
                <p>{event.reason}</p>
              </div>
            ))}
        </details>
      )}
    </>
  );
}
