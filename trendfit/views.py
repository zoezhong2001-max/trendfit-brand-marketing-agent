"""Project a validated cross-brand run into stable web-demo view data."""
import argparse
import hashlib
import json
from pathlib import Path

from .cross_brand import validate_cross_brand_run


VIEW_VERSION = "0.2.4"
FEEDBACK_ACTIONS = ["keep", "reject", "request_evidence", "edit_brief"]


def _json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()


def build_views(data):
    validation = validate_cross_brand_run(data)
    run = data["run"]
    brands = {row["id"]: row for row in data["brands"]}
    topics = {row["id"]: row for row in data["topics"]}
    assessments = {row["id"]: row for row in data["assessments"]}
    brief_by_assessment = {row["assessment_id"]: row for row in data.get("briefs", [])}

    brand_view = {
        "view_version": VIEW_VERSION,
        "run_id": run["id"],
        "market": run["market"],
        "brands": [
            {
                "id": row["id"],
                "version": row["version"],
                "name": row["name"],
                "category": row["category"],
                "scenario": row["scenario"],
                "positioning": row["positioning"],
                "audiences": row["audiences"],
                "marketing_goals": row["marketing_goals"],
                "unknown_count": len(row["unknowns"]),
            }
            for row in brands.values()
        ],
    }

    topic_results = {topic_id: [] for topic_id in topics}
    for assessment in assessments.values():
        topic_results[assessment["topic_id"]].append(
            {
                "brand_id": assessment["brand_id"],
                "brand_name": brands[assessment["brand_id"]]["name"],
                "decision": assessment["decision"],
                "assessment_id": assessment["id"],
                "has_brief": assessment["id"] in brief_by_assessment,
            }
        )
    trend_view = {
        "view_version": VIEW_VERSION,
        "run_id": run["id"],
        "market": run["market"],
        "data_mode": run["data_mode"],
        "refreshed_at": run["generated_at"],
        "trends": [
            {
                "id": row["id"],
                "version": row["version"],
                "title": row["title"],
                "meaning": row["meaning"],
                "signal_layer": row["signal_layer"],
                "heat_status": row["heat_status"],
                "source_count": len(row["source_refs"]),
                "evidence_gaps": row["evidence_gaps"],
                "brand_results": topic_results[row["id"]],
            }
            for row in topics.values()
        ],
    }

    opportunity_view = {
        "view_version": VIEW_VERSION,
        "run_id": run["id"],
        "opportunities": [
            {
                "assessment_id": row["id"],
                "brand": {
                    "id": row["brand_id"],
                    "version": row["brand_version"],
                    "name": brands[row["brand_id"]]["name"],
                    "category": brands[row["brand_id"]]["category"],
                },
                "trend": {
                    "id": row["topic_id"],
                    "version": row["topic_version"],
                    "title": topics[row["topic_id"]]["title"],
                    "heat_status": topics[row["topic_id"]]["heat_status"],
                },
                "decision": row["decision"],
                "reasons": row["reasons"],
                "counterargument": row["counterargument"],
                "evidence_gap": row["evidence_gap"],
                "brief_id": brief_by_assessment.get(row["id"], {}).get("id"),
            }
            for row in assessments.values()
        ],
    }

    brief_view = {
        "view_version": VIEW_VERSION,
        "run_id": run["id"],
        "briefs": [
            {
                **row,
                "brand_name": brands[row["brand_id"]]["name"],
                "trend_title": topics[row["topic_id"]]["title"],
                "heat_status": topics[row["topic_id"]]["heat_status"],
            }
            for row in data.get("briefs", [])
        ],
    }

    feedback_view = {
        "view_version": VIEW_VERSION,
        "run_id": run["id"],
        "allowed_actions": FEEDBACK_ACTIONS,
        "required_fields": [
            "id", "assessment_id", "actor", "action", "reason", "created_at"
        ],
        "rule": "Feedback appends a human decision and never overwrites the model assessment.",
        "records": [],
    }
    return {
        "brands.json": brand_view,
        "trends.json": trend_view,
        "opportunities.json": opportunity_view,
        "briefs.json": brief_view,
        "feedback.json": feedback_view,
        "validation.json": validation,
    }


def validate_feedback(view, assessment_ids):
    if view["allowed_actions"] != FEEDBACK_ACTIONS:
        raise ValueError("feedback actions differ from the product contract")
    seen = set()
    for row in view["records"]:
        missing = set(view["required_fields"]) - row.keys()
        if missing:
            raise ValueError(f"feedback record missing: {sorted(missing)}")
        if row["id"] in seen:
            raise ValueError("duplicate feedback ID")
        if row["assessment_id"] not in assessment_ids:
            raise ValueError("feedback references unknown assessment")
        if row["action"] not in FEEDBACK_ACTIONS:
            raise ValueError("unsupported feedback action")
        if "decision" in row or "model_decision" in row:
            raise ValueError("feedback cannot overwrite a model decision")
        seen.add(row["id"])
    return True


def write_views(data, output):
    if output.exists():
        raise ValueError("Use a new output directory so an older run is not overwritten")
    output.mkdir(parents=True)
    views = build_views(data)
    manifest_files = []
    for filename, value in views.items():
        raw = _json_bytes(value)
        (output / filename).write_bytes(raw)
        manifest_files.append({
            "name": filename,
            "sha256": hashlib.sha256(raw).hexdigest(),
            "bytes": len(raw),
        })
    manifest = {
        "view_version": VIEW_VERSION,
        "run_id": data["run"]["id"],
        "source_run_version": data["run"]["version"],
        "files": manifest_files,
    }
    (output / "manifest.json").write_bytes(_json_bytes(manifest))
    return manifest


def main():
    parser = argparse.ArgumentParser(description="Build TrendFit web-demo view data")
    parser.add_argument("run", type=Path, nargs="?", default=Path("examples/cross_brand_demo.json"))
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    manifest = write_views(json.loads(args.run.read_text()), args.output)
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
