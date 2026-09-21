'use client';

import { ArrowUpRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Brand } from '@/lib/data';
import type { WorkspaceMove } from './workspace-types';

type Props = {
  route: string;
  brands: Brand[];
  brand: Brand;
  saveError: string;
  navigate: (move: WorkspaceMove) => void;
  switchBrand: (brandId: string) => void;
  clearSaveError: () => void;
};

export function WorkspaceHeader({
  route,
  brands,
  brand,
  saveError,
  navigate,
  switchBrand,
  clearSaveError,
}: Props) {
  const pageName =
    route === '/'
      ? '热点雷达'
      : route === '/brands'
        ? '品牌工作区'
        : route.startsWith('/briefs/')
          ? 'Brief 工作台'
          : '话题详情';
  return (
    <>
      <header className="topbar">
        <span>
          工作空间 <b>/</b> {pageName}
        </span>
        <span className="demo-tag">合成演示 · 热度未核验</span>
      </header>
      <div className="brandbar">
        <span>切换品牌</span>
        {brands.map((item) => (
          <Button
            key={item.id}
            aria-pressed={item.id === brand.id}
            className={item.id === brand.id ? 'selected' : ''}
            onClick={() => switchBrand(item.id)}
          >
            {item.name}
            {item.id === brand.id && <Check size={14} />}
          </Button>
        ))}
        <a
          href="#/brands"
          onClick={(event) => {
            event.preventDefault();
            navigate({ route: '/brands' });
          }}
        >
          <span className="brand-profile">
            查看品牌档案 <ArrowUpRight size={14} />
          </span>
        </a>
      </div>
      {saveError && (
        <div className="warning" role="alert">
          {saveError}
          <Button className="text-button" onClick={clearSaveError}>
            关闭提示
          </Button>
        </div>
      )}
    </>
  );
}
