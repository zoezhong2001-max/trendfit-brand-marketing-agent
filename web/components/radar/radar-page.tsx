import {
  ArrowRight,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ACTIONS,
  DECISIONS,
  type Brand,
  type Bundle,
  type Decision,
  type Opportunity,
  type Store,
} from '@/lib/data';
import { DecisionBadge, EmptyState } from '@/components/shared/workspace-ui';
import type { WorkspaceMove } from '@/components/workspace/workspace-types';

const decisionOrder: Decision[] = [
  'recommend',
  'rework',
  'needs_evidence',
  'not_recommend',
];
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

export function RadarPage({
  data,
  brand,
  opportunities,
  stale,
  query,
  filter,
  signal,
  kind,
  setQuery,
  setFilter,
  setSignal,
  setKind,
  navigate,
  localFeedback,
  formatDate,
}: {
  data: Bundle;
  brand: Brand;
  opportunities: Opportunity[];
  stale: boolean;
  query: string;
  filter: string;
  signal: string;
  kind: string;
  setQuery: (value: string) => void;
  setFilter: (value: string) => void;
  setSignal: (value: string) => void;
  setKind: (value: string) => void;
  navigate: (move: WorkspaceMove) => void;
  localFeedback: (opportunity: Opportunity) => Store['feedback'];
  formatDate: (value: string) => string;
}) {
  const items = opportunities
    .filter((opportunity) => {
      const topic = data.topics.find(
        (item) => item.id === opportunity.trend.id,
      )!;
      return (
        (filter === 'all' || opportunity.decision === filter) &&
        (signal === 'all' || topic.signal_layer === signal) &&
        (kind === 'all' || topic.queue_type === kind) &&
        (topic.title + topic.meaning).includes(query.trim())
      );
    })
    .sort(
      (left, right) =>
        decisionOrder.indexOf(left.decision) -
        decisionOrder.indexOf(right.decision),
    );

  function clearFilters() {
    setQuery('');
    setFilter('all');
    setKind('all');
    setSignal('all');
  }

  return (
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
                  (topic) => topic.queue_type === 'trend_candidate',
                ).length
              }
              <small> 候选</small> <span>+</span>{' '}
              {
                data.topics.filter(
                  (topic) => topic.queue_type !== 'trend_candidate',
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
              .filter((item) => item.decision === 'recommend')
              .length.toString()
              .padStart(2, '0')}
          </strong>
          <span>推荐预研</span>
        </div>
        <div className="overview-count">
          <strong>
            {opportunities
              .filter((item) => item.decision === 'rework')
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
        <div className="search">
          <Search size={17} />
          <Input
            aria-label="搜索话题"
            placeholder="搜索话题、情绪或场景"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div>
          <span className="sr-only">品牌结论</span>
          <select
            aria-label="品牌结论"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">全部结论</option>
            {decisionOrder.map((value) => (
              <option key={value} value={value}>
                {DECISIONS[value]}
              </option>
            ))}
          </select>
        </div>
        <select
          aria-label="信号类型"
          value={signal}
          onChange={(event) => setSignal(event.target.value)}
        >
          <option value="all">全部信号</option>
          {Object.entries(signalLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="机会类型"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
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
      {items.length ? (
        <div className="cards">
          {items.map((opportunity, index) => {
            const topic = data.topics.find(
              (item) => item.id === opportunity.trend.id,
            )!;
            const events = localFeedback(opportunity);
            return (
              <article
                className={`topic-card ${opportunity.decision === 'recommend' ? 'featured' : ''}`}
                key={opportunity.assessment_id}
              >
                <div className="card-top">
                  <span className="card-no">
                    {String(index + 1).padStart(2, '0')} /{' '}
                    {topic.category_label}
                  </span>
                  <ArrowUpRight size={18} />
                </div>
                <div className="chips">
                  <span className="badge subtle">
                    {queueLabels[topic.queue_type]}
                  </span>
                  <span className="micro">
                    {signalLabels[topic.signal_layer]}
                  </span>
                </div>
                <a
                  href={`#/trends/${topic.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    navigate({ route: `/trends/${topic.id}` });
                  }}
                >
                  <h2>{topic.title}</h2>
                </a>
                <p className="meaning">{topic.meaning}</p>
                <div className="fit-line">
                  <DecisionBadge decision={opportunity.decision} />
                  {stale && <span className="micro warning-text">待重评</span>}
                </div>
                <p className="fit-reason">{opportunity.reasons[0]}</p>
                <div className="evidence-mini">热度未核验 · 原帖来源未接入</div>
                {events.length > 0 && (
                  <div className="human-tag">
                    人工：{ACTIONS[events[events.length - 1].action]}
                  </div>
                )}
                <Button
                  className="card-link"
                  onClick={() => navigate({ route: `/trends/${topic.id}` })}
                >
                  查看判断与证据 <ArrowRight size={17} />
                </Button>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="当前筛选没有结果">
          <p>切换品牌保留了筛选条件，可以清除后查看所有判断。</p>
          <Button onClick={clearFilters}>清除筛选</Button>
        </EmptyState>
      )}
      {!opportunities.some((item) => item.decision === 'recommend') && (
        <div className="note">
          暂时没有可直接推荐预研的机会。需要改造与不推荐，也是有价值的判断。
        </div>
      )}
      <footer className="page-footer">
        <span>3 个合成样本验证同一套跨品类工作流</span>
        <span>数据包生成于 {formatDate(data.generatedAt)} · 非采集时间</span>
      </footer>
    </>
  );
}
