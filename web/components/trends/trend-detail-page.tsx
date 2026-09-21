import type { ReactNode } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, LineList } from '@/components/shared/workspace-ui';
import type { Bundle, Opportunity } from '@/lib/data';
import type { WorkspaceMove } from '@/components/workspace/workspace-types';

const signalLabels: Record<string, string> = {
  broad_culture: '大众文化',
  category_occasion: '品类场景',
  brand_adjacent: '品牌邻近',
};
const queueLabels: Record<string, string> = {
  trend_candidate: '候选话题',
  calendar: '日历机会',
  evergreen: '常青创意',
  case: '案例启发',
};

export function TrendDetailPage({
  topicId,
  data,
  opportunities,
  navigate,
  renderReview,
}: {
  topicId: string;
  data: Bundle;
  opportunities: Opportunity[];
  navigate: (move: WorkspaceMove) => void;
  renderReview: (opportunity: Opportunity) => ReactNode;
}) {
  const topic = data.topics.find((item) => item.id === topicId);
  if (!topic) {
    return (
      <EmptyState title="未找到这个话题">
        <Button onClick={() => navigate({ route: '/' })}>回到热点雷达</Button>
      </EmptyState>
    );
  }
  const opportunity = opportunities.find((item) => item.trend.id === topic.id)!;
  return (
    <>
      <Button className="back" onClick={() => navigate({ route: '/' })}>
        <ArrowLeft size={16} />
        返回热点雷达
      </Button>
      <section className="heading detail-heading">
        <p className="eyebrow">
          {queueLabels[topic.queue_type]} / {signalLabels[topic.signal_layer]}
        </p>
        <h1>{topic.title}</h1>
        <p>{topic.tagline}</p>
      </section>
      <div className="detail-grid">
        <section className="panel">
          <div className="section-label">
            01 / 话题与证据 <span>独立于品牌</span>
          </div>
          <span className="badge">合成演示 · 热度未核验</span>
          <h2>人们在表达什么？</h2>
          <p className="lead">{topic.meaning}</p>
          {topic.queue_type !== 'trend_candidate' && (
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
          {topic.sources.map((source) => (
            <div className="source" key={source.id}>
              <FileText size={18} />
              <div>
                <strong>{source.title}</strong>
                <p>{source.reading_coverage}</p>
                <span className="micro">无真实原文链接 · 仅用于工作流验证</span>
              </div>
            </div>
          ))}
          <h3>进入策划前的证据缺口</h3>
          <LineList items={topic.evidence_gaps} />
          <details>
            <summary>来源与版本追溯</summary>
            <p className="code">
              {topic.id} · v{topic.version}
              <br />
              {topic.source_refs.join('\n')}
              <br />
              {data.runId}
            </p>
          </details>
        </section>
        <section className="panel">{renderReview(opportunity)}</section>
      </div>
    </>
  );
}
