"use client";

import { Building2, MessageSquareText, Radar, Route } from "lucide-react";
import { workspaceHref } from "../lib/workspace-context";
import styles from "./workspace-sidebar.module.css";

export type WorkspaceArea = "radar" | "brand" | "decision" | "feedback";
export type WorkspaceSubView = "profile" | "assets" | "selection" | "brief";

export default function WorkspaceSidebar({
  active,
  subView,
  brandId,
  feedbackCount,
  currentBriefHref,
}: {
  active: WorkspaceArea;
  subView?: WorkspaceSubView;
  brandId?: string;
  feedbackCount?: number;
  currentBriefHref?: string;
}) {
  const hrefs = {
    radar: workspaceHref("/", brandId),
    profile: workspaceHref("/#/brands", brandId),
    assets: workspaceHref("/brand-assets", brandId),
    selection: workspaceHref("/selection-tasks", brandId),
    feedback: workspaceHref("/", brandId, { panel: "feedback" }),
  };

  return (
    <aside className={styles.sidebar}>
      <a className={styles.logo} href={hrefs.radar} aria-label="TrendFit 热点雷达">
        <span className={styles.logoMark} aria-hidden="true">
          <svg viewBox="0 0 40 40" focusable="false">
            <path className={styles.logoSweep} d="M20 20 24.9 7.9A13 13 0 0 1 33 20Z" />
            <circle cx="20" cy="20" r="13" />
            <circle cx="20" cy="20" r="8" />
            <circle cx="20" cy="20" r="3" />
            <path d="M20 5v30M5 20h30" />
            <circle className={styles.logoSignal} cx="27" cy="14" r="1.8" />
          </svg>
        </span>
        <span><strong>TrendFit</strong><small>MARKETING OS</small></span>
      </a>
      <p className={styles.contextLabel}>统一营销工作台</p>
      <nav className={styles.nav} aria-label="主要导航">
        <a className={`${styles.navItem} ${active === "radar" ? styles.navActive : ""}`} href={hrefs.radar} aria-current={active === "radar" ? "page" : undefined}>
          <Radar />热点雷达
        </a>
        <a className={`${styles.navItem} ${active === "brand" ? styles.navActive : ""}`} href={hrefs.profile} aria-current={active === "brand" ? "page" : undefined}>
          <Building2 />品牌中心
        </a>
        {active === "brand" && (
          <div className={styles.subnav} aria-label="品牌中心二级导航">
            <a className={subView === "profile" ? styles.subActive : ""} href={hrefs.profile}>品牌档案</a>
            <a className={subView === "assets" ? styles.subActive : ""} href={hrefs.assets}>商品资产</a>
          </div>
        )}
        <a className={`${styles.navItem} ${active === "decision" ? styles.navActive : ""}`} href={hrefs.selection} aria-current={active === "decision" ? "page" : undefined}>
          <Route />决策中心
        </a>
        {active === "decision" && (
          <div className={styles.subnav} aria-label="决策中心二级导航">
            <a className={subView === "selection" ? styles.subActive : ""} href={hrefs.selection}>智能选品</a>
            {currentBriefHref && <a className={subView === "brief" ? styles.subActive : ""} href={currentBriefHref}>Brief 工作台</a>}
          </div>
        )}
        <a className={`${styles.navItem} ${active === "feedback" ? styles.navActive : ""}`} href={hrefs.feedback} aria-current={active === "feedback" ? "page" : undefined}>
          <MessageSquareText />反馈入口
          {!!feedbackCount && <span className={styles.navCount}>{feedbackCount}</span>}
        </a>
      </nav>
      <div className={styles.boundary}>
        <span>DEMO BOUNDARY</span>
        <p>合成演示数据 · 非实时扫描<br />本机修改不代表云端保存</p>
      </div>
      <p className={styles.version}>CN · v0.4.0</p>
    </aside>
  );
}
