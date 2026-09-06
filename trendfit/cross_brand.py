"""Validate a cross-brand TrendFit demonstration run.

The semantic decisions are supplied by a model or human reviewer. This module
checks the reusable product contract, lineage, versioning, and readiness gates.
"""
import argparse
import json
from pathlib import Path


DECISIONS = {"recommend", "rework", "not_recommend", "needs_evidence"}
BRIEF_DECISIONS = {"recommend", "rework"}
READY_HEAT = {"verified_current"}


def _unique(rows, label):
    keys = [row["id"] for row in rows]
    if len(keys) != len(set(keys)):
        raise ValueError(f"duplicate {label} IDs")
    return {row["id"]: row for row in rows}


def validate_cross_brand_run(data):
    run = data["run"]
    brands = _unique(data["brands"], "brand")
    topics = _unique(data["topics"], "topic")
    assessments = _unique(data["assessments"], "assessment")
    briefs = _unique(data.get("briefs", []), "brief")

    if len(brands) < 2 or len({row["category"] for row in brands.values()}) < 2:
        raise ValueError("cross-brand demo requires two brands from different categories")
    for brand in brands.values():
        required = {"version", "name", "category", "market", "positioning", "audiences",
                    "marketing_goals", "permissions", "constraints", "unknowns", "source_refs"}
        if missing := required - brand.keys():
            raise ValueError(f"brand {brand['id']} missing: {sorted(missing)}")
        if brand["market"] != run["market"]:
            raise ValueError("brand market differs from run market")
        if not brand["unknowns"]:
            raise ValueError("brand profile must preserve unknowns")

    for topic in topics.values():
        if topic.get("brand_id") is not None or topic.get("brand_independent") is not True:
            raise ValueError("topic facts must remain independent of a brand")
        if topic["market"] != run["market"]:
            raise ValueError("topic market differs from run market")
        if not topic.get("source_refs") or not topic.get("evidence_gaps"):
            raise ValueError("topic requires sources and explicit evidence gaps")

    seen_pairs = set()
    for assessment in assessments.values():
        brand = brands.get(assessment["brand_id"])
        topic = topics.get(assessment["topic_id"])
        if not brand or not topic:
            raise ValueError("assessment references unknown brand or topic")
        if assessment["brand_version"] != brand["version"]:
            raise ValueError("stale brand version")
        if assessment["topic_version"] != topic["version"]:
            raise ValueError("stale topic version")
        if assessment["decision"] not in DECISIONS:
            raise ValueError("unsupported assessment decision")
        if not assessment.get("reasons") or not assessment.get("counterargument"):
            raise ValueError("assessment requires reasons and a counterargument")
        pair = (assessment["brand_id"], assessment["topic_id"])
        if pair in seen_pairs:
            raise ValueError("duplicate brand-topic assessment")
        seen_pairs.add(pair)

    expected_pairs = {(brand_id, topic_id) for brand_id in brands for topic_id in topics}
    if seen_pairs != expected_pairs:
        raise ValueError("assessment matrix is incomplete")

    brief_assessments = set()
    for brief in briefs.values():
        if brief["status"] not in {"draft_unverified", "ready_for_planning"}:
            raise ValueError("unsupported brief status")
        if brief["assessment_id"] in brief_assessments:
            raise ValueError("duplicate brief for assessment")
        if brief["status"] == "ready_for_planning" and brief.get("queue_type", "trend_candidate") != "trend_candidate":
            raise ValueError("calendar or evergreen cannot become a ready trend brief")
        assessment = assessments.get(brief["assessment_id"])
        if not assessment:
            raise ValueError("brief references unknown assessment")
        if assessment["decision"] not in BRIEF_DECISIONS:
            raise ValueError("brief cannot be created for a rejected assessment")
        if brief["brand_id"] != assessment["brand_id"] or brief["topic_id"] != assessment["topic_id"]:
            raise ValueError("brief lineage mismatch")
        brand, topic = brands[brief["brand_id"]], topics[brief["topic_id"]]
        if brief["brand_version"] != brand["version"] or brief["topic_version"] != topic["version"]:
            raise ValueError("brief uses stale input version")
        if brief["status"] == "ready_for_planning" and topic["heat_status"] not in READY_HEAT:
            raise ValueError("unverified trend cannot become a ready brief")
        if brief.get("automatically_published") is not False:
            raise ValueError("publication is never authorized by Agent output")
        brief_assessments.add(assessment["id"])

    required_briefs = {row["id"] for row in assessments.values() if row["decision"] in BRIEF_DECISIONS}
    if brief_assessments != required_briefs:
        raise ValueError("every recommend or rework assessment requires one brief")

    matrix = []
    for assessment in assessments.values():
        matrix.append({
            "brand": brands[assessment["brand_id"]]["name"],
            "topic": topics[assessment["topic_id"]]["title"],
            "decision": assessment["decision"],
        })
    return {
        "valid": True,
        "run_id": run["id"],
        "market": run["market"],
        "brands": len(brands),
        "categories": len({row["category"] for row in brands.values()}),
        "topics": len(topics),
        "assessments": len(assessments),
        "briefs": len(briefs),
        "decision_matrix": matrix,
        "semantic_truth_verified_by_code": False,
    }


def main():
    parser = argparse.ArgumentParser(description="Validate a cross-brand TrendFit run")
    parser.add_argument("run", type=Path, nargs="?", default=Path("examples/cross_brand_demo.json"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = validate_cross_brand_run(json.loads(args.run.read_text()))
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.write_text(rendered)
    print(rendered, end="")


if __name__ == "__main__":
    main()
