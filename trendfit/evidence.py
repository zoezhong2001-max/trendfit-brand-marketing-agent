"""Evidence normalization and freshness helpers."""
import re
from datetime import datetime
from urllib.parse import urlparse


def canonical_content_key(url: str) -> str:
    """Collapse signed variants of supported content URLs into one identity."""
    parsed = urlparse(url)
    host = parsed.hostname or ""
    if host.endswith("xiaohongshu.com"):
        match = re.search(r"/(?:explore|search_result|discovery/item)/([0-9a-f]{24})(?:/|$)", parsed.path)
        if match:
            return "xiaohongshu:" + match.group(1)
    if host.endswith("douyin.com"):
        match = re.search(r"/(?:video|note)/(\d+)(?:/|$)", parsed.path)
        if match:
            return "douyin:" + match.group(1)
    return parsed._replace(fragment="").geturl()


def parse_display_metric(value):
    """Keep rounded counters as rounded; never invent an exact integer."""
    raw = None if value is None else str(value).strip()
    if raw and re.fullmatch(r"\d+(?:,\d{3})*", raw):
        return {"raw": raw, "exact": int(raw.replace(",", "")), "precision": "exact_display"}
    rounded = bool(raw and re.search(r"[万亿kKmMwW+]", raw))
    return {"raw": raw, "exact": None, "precision": "rounded_display" if rounded else "unknown"}


def compare_snapshots(before: dict, after: dict) -> dict:
    """Compare one item without claiming that the whole topic is growing."""
    result = {"usable": False, "proves_topic_growth": False, "deltas": {}}
    if canonical_content_key(before["url"]) != canonical_content_key(after["url"]):
        return {**result, "reason": "different_material"}
    if before.get("scope") != after.get("scope"):
        return {**result, "reason": "different_metric_scope"}
    if before.get("quality") != "usable" or after.get("quality") != "usable":
        return {**result, "reason": "snapshot_requires_review"}
    start, finish = datetime.fromisoformat(before["captured_at"]), datetime.fromisoformat(after["captured_at"])
    if start.tzinfo is None or finish.tzinfo is None or finish <= start:
        return {**result, "reason": "invalid_observation_times"}
    for name in before["metrics"].keys() & after["metrics"].keys():
        old, new = parse_display_metric(before["metrics"][name]), parse_display_metric(after["metrics"][name])
        delta = new["exact"] - old["exact"] if old["exact"] is not None and new["exact"] is not None else None
        result["deltas"][name] = {"before": old, "after": new, "change": delta}
    result["usable"] = any(row["change"] is not None for row in result["deltas"].values())
    result["elapsed_seconds"] = (finish - start).total_seconds()
    result["reason"] = "observed_item_change_only" if result["usable"] else "no_comparable_exact_counts"
    return result
