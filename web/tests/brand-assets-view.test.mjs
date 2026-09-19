import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  filterBrandItems,
  formatLocator,
  resolveClaims,
  resolveEvidence,
  summarizeBrandAssets,
} from "../lib/brand-assets-view.ts";
import { validateBrandAssetDocument } from "../lib/brand-assets.ts";

const fixture = new URL("../public/data-v040/brand-assets.json", import.meta.url);
const data = () => JSON.parse(fs.readFileSync(fixture));

test("workspace payload passes the shared brand-asset contract", async () => {
  const result = await validateBrandAssetDocument(data());
  assert.equal(result.catalog_items.length, 6);
});

test("brand summary separates eligible, review, and unavailable items", () => {
  const summary = summarizeBrandAssets(data(), "BR-NAIXUE");
  assert.deepEqual(summary, {
    total: 3,
    eligible: 1,
    needsReview: 1,
    unavailable: 1,
  });
});

test("catalog filters combine brand, query, type, and readiness", () => {
  const matches = filterBrandItems(data(), "BR-NAIXUE", {
    query: "轻食",
    type: "menu_item",
    readiness: "eligible",
  });
  assert.deepEqual(matches.map((item) => item.id), ["CI-NAIXUE-BAKERY-SET"]);
});

test("claim and evidence resolvers keep item lineage", () => {
  const bundle = data();
  const item = bundle.catalog_items.find((entry) => entry.id === "CI-PETLIBRO-FEEDER");
  const claims = resolveClaims(bundle, item);
  const evidence = resolveEvidence(bundle, claims.flatMap((claim) => claim.evidence_refs));
  assert.deepEqual(claims.map((claim) => claim.id), ["CL-PETLIBRO-CARE-CONTINUITY"]);
  assert.deepEqual(evidence.map((entry) => entry.id), ["EV-PETLIBRO-P3"]);
});

test("source locator is rendered as an auditable pointer", () => {
  assert.equal(formatLocator({ sheet: "products", row: 18 }), "sheet products · row 18");
});
