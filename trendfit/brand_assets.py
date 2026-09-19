"""Validate the v0.4.0 generalized brand-asset contract.

The validator checks structure, lifecycle, marketing readiness, evidence lineage,
and immutable snapshot coverage. It does not prove that synthetic business facts
are true or authorize any marketing or advertising action.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import date, datetime
from pathlib import Path


VERSION = "0.4.0"
ITEM_TYPES = {
    "physical_product",
    "menu_item",
    "service",
    "digital_product",
    "offline_experience",
}
LIFECYCLE_STATUSES = {"draft", "in_review", "active", "paused", "retired"}
READINESS_STATUSES = {"needs_review", "eligible", "blocked", "expired"}
FACT_STATUSES = {"explicit", "inferred", "hypothesis", "unknown"}
REVIEW_STATUSES = {"unreviewed", "confirmed", "corrected", "rejected"}
AVAILABILITY_STATUSES = {"available", "unavailable", "unknown"}
CLAIM_POLICIES = {"allowed", "conditional", "prohibited"}


def _unique(rows, label):
    indexed = {}
    for row in rows:
        row_id = row.get("id")
        if not isinstance(row_id, str) or not row_id:
            raise ValueError(f"{label} requires a non-empty ID")
        if row_id in indexed:
            raise ValueError(f"duplicate {label} ID: {row_id}")
        indexed[row_id] = row
    return indexed


def _date(value, label):
    if value is None:
        return None
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"invalid {label} date") from error


def _timestamp(value, label):
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"invalid {label} timestamp") from error


def _string_list(value, label, allow_empty=True):
    if not isinstance(value, list) or not all(isinstance(v, str) and v for v in value):
        raise ValueError(f"{label} must be a string list")
    if not allow_empty and not value:
        raise ValueError(f"{label} cannot be empty")
    return value


def _check_evidence_refs(refs, evidence, label, allow_empty=False):
    _string_list(refs, label, allow_empty=allow_empty)
    missing = [ref for ref in refs if ref not in evidence]
    if missing:
        raise ValueError(f"{label} references unknown evidence: {missing}")


def _validate_fact(field, evidence, label):
    if not isinstance(field, dict):
        raise ValueError(f"{label} must be an evidence-backed field")
    if field.get("fact_status") not in FACT_STATUSES:
        raise ValueError(f"{label} has unsupported fact status")
    if field.get("review_status") not in REVIEW_STATUSES:
        raise ValueError(f"{label} has unsupported review status")
    if field.get("fact_status") == "unknown":
        if field.get("value") is not None or field.get("evidence_refs") != []:
            raise ValueError(f"unknown {label} cannot invent a value or evidence")
    elif not isinstance(field.get("value"), str) or not field["value"]:
        raise ValueError(f"{label} requires a value")
    _check_evidence_refs(
        field.get("evidence_refs"),
        evidence,
        f"{label} evidence",
        allow_empty=field.get("fact_status") == "unknown",
    )


def snapshot_content_hash(snapshot):
    """Return the deterministic hash for the version references in a snapshot."""
    payload = {
        "brand_profile": snapshot["brand_profile"],
        "catalog_items": sorted(
            snapshot["catalog_items"], key=lambda row: (row["id"], row["version"])
        ),
        "claims": sorted(snapshot["claims"], key=lambda row: (row["id"], row["version"])),
        "source_batch_ids": sorted(snapshot["source_batch_ids"]),
    }
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return "sha256:" + hashlib.sha256(raw.encode()).hexdigest()


def derive_marketing_readiness(item, claims, as_of, market):
    """Derive readiness from deterministic product facts and review states."""
    lifecycle = item["lifecycle"]
    valid_from = _date(lifecycle.get("valid_from"), "lifecycle valid_from")
    valid_to = _date(lifecycle.get("valid_to"), "lifecycle valid_to")
    if valid_from and valid_to and valid_from > valid_to:
        raise ValueError("lifecycle validity window is reversed")
    if lifecycle["status"] == "retired" or (valid_to and valid_to < as_of):
        return "expired"
    if lifecycle["status"] == "paused" or item["hard_blockers"]:
        return "blocked"
    if lifecycle["status"] in {"draft", "in_review"}:
        return "needs_review"
    if valid_from and valid_from > as_of:
        return "needs_review"

    market_rows = [row for row in item["availability"] if row["market"] == market]
    if not market_rows:
        return "blocked"
    if not any(row["status"] == "available" for row in market_rows):
        return "needs_review" if any(row["status"] == "unknown" for row in market_rows) else "blocked"

    proposition = item["value_proposition"]
    if proposition["review_status"] not in {"confirmed", "corrected"}:
        return "needs_review"
    if proposition["fact_status"] in {"hypothesis", "unknown"}:
        return "needs_review"

    attributes = item["attributes"]
    if item["type"] == "menu_item" and not valid_to:
        return "needs_review"
    if item["type"] == "service":
        if not attributes.get("service_area") or attributes.get("fulfillment_status") != "confirmed":
            return "needs_review"
    if item["type"] == "digital_product":
        if not attributes.get("platform") or attributes.get("subscription_status") != "active":
            return "needs_review"
    if item["type"] == "offline_experience":
        if not attributes.get("venue_or_city") or not valid_to:
            return "needs_review"

    for claim_id in item["claim_refs"]:
        claim = claims[claim_id]
        claim_to = _date(claim.get("valid_to"), "claim valid_to")
        if claim["policy"] == "prohibited" or (claim_to and claim_to < as_of):
            return "blocked"
        if claim["review_status"] not in {"confirmed", "corrected"}:
            return "needs_review"
    return "eligible"


def validate_brand_asset_run(data):
    run = data.get("run", {})
    if run.get("version") != VERSION or run.get("data_mode") != "synthetic_demo":
        raise ValueError("v0.4.0 validator only accepts synthetic demo data")
    if run.get("market") != "CN":
        raise ValueError("v0.4.0 sample market must be CN")
    generated_at = _timestamp(run.get("generated_at"), "run generated_at")
    as_of = generated_at.date()

    brands = _unique(data.get("brands", []), "brand")
    evidence = _unique(data.get("evidence_refs", []), "evidence")
    batches = _unique(data.get("onboarding_batches", []), "onboarding batch")
    claims = _unique(data.get("claims", []), "claim")
    items = _unique(data.get("catalog_items", []), "catalog item")
    snapshots = _unique(data.get("brand_asset_snapshots", []), "snapshot")

    if len(brands) < 3:
        raise ValueError("cross-category acceptance requires at least three brands")
    for brand in brands.values():
        if not isinstance(brand.get("version"), int) or brand["version"] < 1:
            raise ValueError("brand version must be a positive integer")
        if brand.get("market") != run["market"]:
            raise ValueError("brand market differs from the run")

    for row in evidence.values():
        if row.get("source_kind") not in {"pdf", "pptx", "xlsx", "manual", "synthetic"}:
            raise ValueError("unsupported evidence source kind")
        if not isinstance(row.get("locator"), dict) or not row["locator"]:
            raise ValueError("evidence locator is required")
        if row.get("fact_status") not in FACT_STATUSES:
            raise ValueError("evidence fact status is unsupported")
        if row.get("reading_method") not in {"embedded_text", "table_cell", "manual_entry", "synthetic_fixture"}:
            raise ValueError("evidence reading method is unsupported")
        _string_list(row.get("field_paths"), "evidence field paths", allow_empty=False)

    for batch in batches.values():
        if batch.get("brand_id") not in brands:
            raise ValueError("onboarding batch references unknown brand")
        if batch.get("status") not in {"parsed", "in_review", "reviewed", "rejected"}:
            raise ValueError("unsupported onboarding batch status")
        _string_list(batch.get("source_ids"), "onboarding source IDs", allow_empty=False)

    for claim in claims.values():
        brand = brands.get(claim.get("brand_id"))
        if not brand:
            raise ValueError("claim references unknown brand")
        if not isinstance(claim.get("version"), int) or claim["version"] < 1:
            raise ValueError("claim version must be a positive integer")
        if claim.get("policy") not in CLAIM_POLICIES:
            raise ValueError("unsupported claim policy")
        if claim.get("review_status") not in REVIEW_STATUSES:
            raise ValueError("unsupported claim review status")
        _string_list(claim.get("market_scope"), "claim market scope", allow_empty=False)
        _string_list(claim.get("applies_to"), "claim applies_to")
        _string_list(claim.get("conditions"), "claim conditions")
        _check_evidence_refs(claim.get("evidence_refs"), evidence, "claim evidence")

    variant_ids = set()
    for item in items.values():
        brand = brands.get(item.get("brand_id"))
        if not brand:
            raise ValueError("catalog item references unknown brand")
        if item.get("type") not in ITEM_TYPES:
            raise ValueError("unsupported catalog item type")
        if not isinstance(item.get("version"), int) or item["version"] < 1:
            raise ValueError("catalog item version must be a positive integer")
        lifecycle = item.get("lifecycle", {})
        if lifecycle.get("status") not in LIFECYCLE_STATUSES:
            raise ValueError("unsupported lifecycle status")
        if item.get("marketing_readiness") not in READINESS_STATUSES:
            raise ValueError("unsupported marketing readiness")
        if not isinstance(item.get("attributes"), dict):
            raise ValueError("catalog item attributes must be an object")
        _validate_fact(item.get("value_proposition"), evidence, "value proposition")
        _string_list(item.get("audience_tags"), "audience tags")
        _string_list(item.get("scene_tags"), "scene tags")
        _string_list(item.get("constraints"), "constraints")
        _string_list(item.get("hard_blockers"), "hard blockers")
        _string_list(item.get("creative_refs"), "creative refs")
        _check_evidence_refs(item.get("source_refs"), evidence, "catalog item sources")
        _string_list(item.get("claim_refs"), "claim refs")
        for claim_id in item["claim_refs"]:
            claim = claims.get(claim_id)
            if not claim or claim["brand_id"] != item["brand_id"]:
                raise ValueError("catalog item claim belongs to another brand or is missing")
            if item["id"] not in claim["applies_to"]:
                raise ValueError("claim does not apply to the catalog item")

        availability = item.get("availability")
        if not isinstance(availability, list) or not availability:
            raise ValueError("catalog item availability is required")
        for row in availability:
            if row.get("status") not in AVAILABILITY_STATUSES:
                raise ValueError("unsupported availability status")
            if not isinstance(row.get("market"), str) or not row["market"]:
                raise ValueError("availability market is required")
            if not isinstance(row.get("channel"), str) or not row["channel"]:
                raise ValueError("availability channel is required")
            _string_list(row.get("region_scope"), "availability region scope")
            _check_evidence_refs(
                row.get("evidence_refs"),
                evidence,
                "availability evidence",
                allow_empty=row["status"] == "unknown",
            )

        for variant in item.get("variants", []):
            if variant.get("id") in variant_ids:
                raise ValueError("duplicate variant ID")
            variant_ids.add(variant.get("id"))
            if not isinstance(variant.get("attributes"), dict):
                raise ValueError("variant attributes must be an object")

        derived = derive_marketing_readiness(item, claims, as_of, run["market"])
        if item["marketing_readiness"] != derived:
            raise ValueError(
                f"catalog item {item['id']} declares {item['marketing_readiness']} but derives {derived}"
            )

    for claim in claims.values():
        for item_id in claim["applies_to"]:
            item = items.get(item_id)
            if not item or item["brand_id"] != claim["brand_id"]:
                raise ValueError("claim applies to an unknown or cross-brand item")

    snapshot_by_brand = {}
    for snapshot in snapshots.values():
        brand = brands.get(snapshot.get("brand_id"))
        if not brand:
            raise ValueError("snapshot references unknown brand")
        if snapshot["brand_id"] in snapshot_by_brand:
            raise ValueError("sample requires one current snapshot per brand")
        snapshot_by_brand[snapshot["brand_id"]] = snapshot
        profile = snapshot.get("brand_profile", {})
        if profile != {"id": brand["id"], "version": brand["version"]}:
            raise ValueError("snapshot brand profile version mismatch")
        _string_list(snapshot.get("source_batch_ids"), "snapshot source batches", allow_empty=False)
        if any(batch_id not in batches for batch_id in snapshot["source_batch_ids"]):
            raise ValueError("snapshot references unknown onboarding batch")
        item_refs = {(row.get("id"), row.get("version")) for row in snapshot.get("catalog_items", [])}
        claim_refs = {(row.get("id"), row.get("version")) for row in snapshot.get("claims", [])}
        expected_items = {(row["id"], row["version"]) for row in items.values() if row["brand_id"] == brand["id"]}
        expected_claims = {(row["id"], row["version"]) for row in claims.values() if row["brand_id"] == brand["id"]}
        if item_refs != expected_items or claim_refs != expected_claims:
            raise ValueError("snapshot does not cover the brand asset versions exactly")
        if snapshot.get("content_hash") != snapshot_content_hash(snapshot):
            raise ValueError("snapshot content hash mismatch")

    if set(snapshot_by_brand) != set(brands):
        raise ValueError("every brand requires a current asset snapshot")
    item_types = {row["type"] for row in items.values()}
    if not {"physical_product", "menu_item", "service"}.issubset(item_types):
        raise ValueError("acceptance data must cover physical, menu, and service products")

    readiness_counts = {
        status: sum(row["marketing_readiness"] == status for row in items.values())
        for status in sorted(READINESS_STATUSES)
    }
    return {
        "valid": True,
        "run_id": run["id"],
        "version": run["version"],
        "brands": len(brands),
        "catalog_items": len(items),
        "item_types": sorted(item_types),
        "claims": len(claims),
        "snapshots": len(snapshots),
        "readiness_counts": readiness_counts,
        "semantic_truth_verified_by_code": False,
        "automatically_published": False,
    }


def main():
    parser = argparse.ArgumentParser(description="Validate a v0.4.0 brand-asset run")
    parser.add_argument(
        "run", type=Path, nargs="?", default=Path("examples/brand_assets_v040.json")
    )
    args = parser.parse_args()
    data = json.loads(args.run.read_text())
    print(json.dumps(validate_brand_asset_run(data), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
