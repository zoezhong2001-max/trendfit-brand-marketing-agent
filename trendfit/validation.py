"""Deterministic gates for the human-in-the-loop prototype."""
from .evidence import canonical_content_key

DIMENSIONS = {"brand_fit", "audience_need", "brand_memory", "participation", "execution"}
READY_HEAT = {"verified_current"}


def validate_material(material: dict) -> None:
    required = {"id", "url", "role", "published_at", "collected_at", "reading"}
    missing = required - material.keys()
    if missing:
        raise ValueError(f"material missing: {sorted(missing)}")
    reading = material["reading"]
    if reading.get("images_expected") is None:
        if reading.get("images_read", 0):
            raise ValueError("cannot claim complete images when total is unknown")
    elif reading.get("images_read", 0) > reading["images_expected"]:
        raise ValueError("images_read exceeds images_expected")


def validate_bundle(bundle: dict) -> dict:
    materials = bundle["materials"]
    for material in materials:
        validate_material(material)
    ids = [row["id"] for row in materials]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate material IDs")
    known = set(ids)
    topic, assessment, brief = bundle["topic"], bundle["assessment"], bundle["brief"]
    if not topic.get("discovery_material_ids"):
        raise ValueError("topic requires external discovery evidence")
    refs = set(topic["discovery_material_ids"] + topic.get("observed_use_material_ids", []) + brief["material_ids"])
    if not refs <= known:
        raise ValueError("unknown material reference")
    roles = {row["id"]: row["role"] for row in materials}
    if any(roles[item] == "case_method" for item in topic["discovery_material_ids"]):
        raise ValueError("case methods cannot replace a trend source")
    if assessment["topic_id"] != topic["id"] or brief["topic_id"] != topic["id"]:
        raise ValueError("topic lineage mismatch")
    if assessment["topic_version"] != topic["version"] or brief["topic_version"] != topic["version"]:
        raise ValueError("stale topic version")
    if set(assessment["scores"]) != DIMENSIONS:
        raise ValueError("incomplete assessment dimensions")
    if not brief.get("brand_transformation"):
        raise ValueError("brief must explain the brand transformation")
    is_ready = brief["status"] == "ready_for_planning"
    if is_ready and topic["heat_status"] not in READY_HEAT:
        raise ValueError("unverified trend cannot become a ready brief")
    if brief["qualified_hot_brief"] != is_ready:
        raise ValueError("qualification flag conflicts with status")
    if brief.get("automatically_published") is not False:
        raise ValueError("publication is never authorized by model output")
    duplicates = {}
    for row in materials:
        duplicates.setdefault(canonical_content_key(row["url"]), []).append(row["id"])
    return {"valid": True, "topic_id": topic["id"], "brief_status": brief["status"],
            "qualified_hot_brief": is_ready,
            "duplicate_groups": [group for group in duplicates.values() if len(group) > 1],
            "semantic_truth_verified_by_code": False}
