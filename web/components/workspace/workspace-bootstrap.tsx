'use client';

import { Component, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Radar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  STORAGE_KEY,
  emptyStore,
  loadBundle,
  validateStore,
  type Bundle,
  type Store,
} from '@/lib/data';
import {
  readWorkspaceBrand,
  writeWorkspaceBrand,
} from '@/lib/workspace-context';
import { Workspace } from './workspace';

function saveBackup(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

class WorkspaceBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
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

export default function WorkspaceBootstrap() {
  const [data, setData] = useState<Bundle | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState('');
  const [storageIssue, setStorageIssue] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadBundle()
      .then((bundle) => {
        if (!active) return;
        let nextStore: Store;
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          nextStore = raw
            ? validateStore(JSON.parse(raw), bundle)
            : emptyStore(bundle);
        } catch {
          setStorageIssue(true);
          throw new Error(
            '本机记录无法读取或版本不匹配。原记录已保留，请先导出备份，再恢复空白工作区。',
          );
        }
        const selectedBrand = readWorkspaceBrand(
          bundle.brands.map((brand) => brand.id),
          nextStore.selectedBrand,
        );
        if (selectedBrand !== nextStore.selectedBrand)
          nextStore = { ...nextStore, selectedBrand };
        writeWorkspaceBrand(selectedBrand);
        setStore(nextStore);
        setData(bundle);
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : '读取失败');
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  function retry() {
    setError('');
    setData(null);
    setStorageIssue(false);
    setAttempt((value) => value + 1);
  }

  function recover() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saveBackup('TrendFit-local-backup.json', raw);
      if (
        !confirm(
          '备份已下载。确定清空当前浏览器的 TrendFit 工作区并重新开始吗？',
        )
      )
        return;
      localStorage.removeItem(STORAGE_KEY);
      retry();
    } catch {
      setError('浏览器存储不可用，请允许本站保存本机数据后重新加载。');
    }
  }

  if (error) {
    return (
      <div className="boot">
        <div className="logo">◉ TrendFit</div>
        <AlertTriangle />
        <h1>{storageIssue ? '本机记录需要恢复' : '演示数据无法加载'}</h1>
        <p role="alert">{error}</p>
        <p>为避免显示错误判断，工作台已暂停。</p>
        <Button onClick={retry}>重试</Button>
        {storageIssue && (
          <Button className="secondary" onClick={recover}>
            备份并恢复工作区
          </Button>
        )}
      </div>
    );
  }

  if (!data || !store) {
    return (
      <output className="boot">
        <Radar className="accent" />
        <h1>正在打开品牌工作台</h1>
        <p>读取演示话题、品牌档案和本机记录。</p>
      </output>
    );
  }

  return (
    <WorkspaceBoundary>
      <Workspace data={data} initial={store} />
    </WorkspaceBoundary>
  );
}
