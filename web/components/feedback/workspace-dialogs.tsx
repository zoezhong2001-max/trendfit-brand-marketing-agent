'use client';

import { Check, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ACTIONS,
  DECISIONS,
  STORAGE_KEY,
  type Brand,
  type Bundle,
  type Store,
} from '@/lib/data';
import { downloadText } from '@/lib/download';
import { EmptyState } from '@/components/shared/workspace-ui';
import type {
  FeedbackDraft,
  WorkspaceMove,
} from '@/components/workspace/workspace-types';

type Props = {
  toast: string;
  pending: WorkspaceMove | null;
  reason: string;
  saveError: string;
  feedback: FeedbackDraft | null;
  feedbackReason: string;
  history: boolean;
  manualCopy: string;
  brand: Brand;
  data: Bundle;
  store: Store;
  formatDate: (value: string) => string;
  setPending: (value: WorkspaceMove | null) => void;
  setReason: (value: string) => void;
  setFeedback: (value: FeedbackDraft | null) => void;
  setFeedbackReason: (value: string) => void;
  setHistory: (value: boolean) => void;
  setManualCopy: (value: string) => void;
  saveAndContinue: (move: WorkspaceMove) => void;
  discardAndContinue: (move: WorkspaceMove) => void;
  submitFeedback: () => void;
};

export function WorkspaceDialogs(props: Props) {
  const {
    toast,
    pending,
    reason,
    saveError,
    feedback,
    feedbackReason,
    history,
    manualCopy,
    brand,
    data,
    store,
    formatDate,
    setPending,
    setReason,
    setFeedback,
    setFeedbackReason,
    setHistory,
    setManualCopy,
    saveAndContinue,
    discardAndContinue,
    submitFeedback,
  } = props;
  return (
    <>
      {toast && (
        <output className="toast">
          <Check size={17} />
          {toast}
        </output>
      )}
      <Dialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <DialogContent className="modal">
          <DialogTitle>先处理未保存的修改</DialogTitle>
          <DialogDescription>
            切换页面或品牌前，选择保存、放弃，或继续编辑。
          </DialogDescription>
          <div className="field">
            <label htmlFor="pending-change-reason">修改理由</label>
            <Textarea
              id="pending-change-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="保存时必填"
            />
          </div>
          {saveError && (
            <p role="alert" className="warning-text">
              {saveError}
            </p>
          )}
          <div className="actions">
            <Button
              className="primary"
              onClick={() => pending && saveAndContinue(pending)}
            >
              保存并继续
            </Button>
            <Button
              className="secondary"
              onClick={() => pending && discardAndContinue(pending)}
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
        onOpenChange={(open) => !open && setFeedback(null)}
      >
        <DialogContent className="modal">
          <DialogTitle>
            {feedback ? ACTIONS[feedback.action] : ''}这条机会
          </DialogTitle>
          <DialogDescription>
            {feedback?.a.trend.title} · {brand.name}
            。人工选择不会覆盖模型原判断。
          </DialogDescription>
          <div className="field">
            <label htmlFor="feedback-reason">判断理由（必填）</label>
            <Textarea
              id="feedback-reason"
              value={feedbackReason}
              maxLength={1000}
              onChange={(event) => setFeedbackReason(event.target.value)}
              placeholder="例如：保留情绪洞察，但先补充产品能力和传播证据。"
            />
          </div>
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
              .map((entry) => {
                const assessment = data.opportunities.find(
                  (item) => item.assessment_id === entry.assessment_id,
                );
                if (!assessment) return null;
                return (
                  <div className="event" key={entry.id}>
                    <strong>
                      {ACTIONS[entry.action]} · {assessment.brand.name}
                    </strong>
                    <time>{formatDate(entry.created_at)}</time>
                    <p>{assessment.trend.title}</p>
                    <p>{entry.reason}</p>
                    <span className="micro">
                      原模型判断：{DECISIONS[assessment.decision]} ·{' '}
                      {entry.brand_revision_id
                        ? '参考本机品牌修订'
                        : '基准品牌档案'}
                    </span>
                  </div>
                );
              })
          ) : (
            <EmptyState title="还没有人工反馈">
              <p>打开话题，保留、淘汰或要求补证，就会出现在这里。</p>
            </EmptyState>
          )}
          <Button
            className="secondary"
            onClick={() =>
              downloadText(
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
        onOpenChange={(open) => !open && setManualCopy('')}
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
            onFocus={(event) => event.target.select()}
            className="copy-area"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
