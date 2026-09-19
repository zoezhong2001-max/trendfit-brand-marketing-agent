export const WORKSPACE_BRAND_KEY = "trendfit.workspace.brand.v1";

export function readWorkspaceBrand(validBrandIds: string[], fallback: string) {
  if (typeof window === "undefined") return fallback;
  const fromUrl = new URLSearchParams(window.location.search).get("brand");
  if (fromUrl && validBrandIds.includes(fromUrl)) return fromUrl;
  const saved = window.localStorage.getItem(WORKSPACE_BRAND_KEY);
  return saved && validBrandIds.includes(saved) ? saved : fallback;
}

export function writeWorkspaceBrand(brandId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WORKSPACE_BRAND_KEY, brandId);
  const url = new URL(window.location.href);
  url.searchParams.set("brand", brandId);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function workspaceHref(path: string, brandId?: string, extra?: Record<string, string>) {
  const [pathnameAndSearch, hash = ""] = path.split("#", 2);
  const url = new URL(pathnameAndSearch || "/", "http://trendfit.local");
  if (brandId) url.searchParams.set("brand", brandId);
  Object.entries(extra ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return `${url.pathname}${url.search}${hash ? `#${hash}` : ""}`;
}
