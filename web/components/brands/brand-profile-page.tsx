import type { ReactNode } from 'react';
import { Pencil, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LineList } from '@/components/shared/workspace-ui';
import type { Brand, BrandDraft, Store } from '@/lib/data';

export function BrandProfilePage({
  brand,
  profile,
  stale,
  isEditing,
  editor,
  revisions,
  onEdit,
  onRestore,
  formatDate,
}: {
  brand: Brand;
  profile: BrandDraft;
  stale: boolean;
  isEditing: boolean;
  editor: ReactNode;
  revisions: Store['brandRevisions'];
  onEdit: () => void;
  onRestore: () => void;
  formatDate: (value: string) => string;
}) {
  return (
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
                : brand.positioning.status === 'historical_strategy_hypothesis'
                  ? '历史策略假设'
                  : '工作假设'}
            </span>
          </div>
          {isEditing ? (
            editor
          ) : (
            <>
              <h3>品牌定位</h3>
              <p className="lead">{profile.positioning}</p>
              <h3>核心人群</h3>
              <LineList items={profile.audiences.split('\n')} />
              <h3>营销目标</h3>
              <LineList items={profile.goals.split('\n')} />
              <div className="actions">
                <Button className="primary" onClick={onEdit}>
                  <Pencil size={16} />
                  编辑本机副本
                </Button>
                {stale && (
                  <Button className="secondary" onClick={onRestore}>
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
            <LineList items={[...brand.audiences, ...brand.marketing_goals]} />
          </details>
          <details>
            <summary>品牌修改记录 · {revisions.length}</summary>
            {revisions
              .slice()
              .reverse()
              .map((revision) => (
                <div className="event" key={revision.id}>
                  <time>{formatDate(revision.created_at)}</time>
                  <p>{revision.reason}</p>
                  <p>{revision.draft?.positioning || '恢复基准档案'}</p>
                </div>
              ))}
          </details>
        </section>
        <aside className="panel muted-panel">
          <div className="section-label">参与边界</div>
          <h3>品牌可以谈什么</h3>
          <LineList items={brand.permissions} />
          <h3>不能越过的边界</h3>
          <LineList items={brand.constraints} />
          <h3>仍需广告主确认</h3>
          <LineList items={brand.unknowns} />
          <details open>
            <summary>资料与事实状态</summary>
            <LineList items={brand.source_notes} />
            <p className="micro">
              本机编辑仅改变输入副本，在线重新评审将在后续版本接入。
            </p>
          </details>
        </aside>
      </div>
    </>
  );
}
