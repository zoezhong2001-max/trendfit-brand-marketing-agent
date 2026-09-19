import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildSelectionSnapshot,
  runSelectionTask,
  stableSnapshotKey,
} from "../lib/selection-engine.ts";

const fixture = new URL("../public/data-v040/brand-assets.json", import.meta.url);
const data = () => JSON.parse(fs.readFileSync(fixture));

const naixueTask = {
  brandId: "BR-NAIXUE",
  objective: "conversion",
  market: "CN",
  channel: "store",
  scene: "下班",
  startsOn: "2026-09-15",
  endsOn: "2026-10-15",
  limit: 3,
};

test("hard gates keep only the eligible Naixue catalog item", () => {
  const result = runSelectionTask(data(), naixueTask);
  assert.equal(result.evaluatedCount, 3);
  assert.deepEqual(result.selected.map(({ item }) => item.id), ["CI-NAIXUE-BAKERY-SET"]);
  assert.equal(result.rejected.length, 2);
});

test("rejected items expose concrete non-selection reasons", () => {
  const result = runSelectionTask(data(), naixueTask);
  const retired = result.rejected.find(({ item }) => item.id === "CI-NAIXUE-SUMMER-TEA");
  assert.ok(retired.reasons.includes("商品生命周期已不可投放"));
  assert.ok(retired.reasons.includes("营销有效期已结束"));
});

test("confirmed service availability produces a selectable service", () => {
  const result = runSelectionTask(data(), {
    ...naixueTask,
    brandId: "BR-BREEZECARE",
    channel: "booking",
    scene: "换季清洁",
  });
  assert.deepEqual(result.selected.map(({ item }) => item.id), ["CI-BREEZECARE-AC-CLEAN"]);
});

test("unknown CN availability never passes the hard gate", () => {
  const result = runSelectionTask(data(), {
    ...naixueTask,
    brandId: "BR-PETLIBRO",
    channel: "ecommerce",
    scene: "短期离家",
  });
  assert.equal(result.selected.length, 0);
  assert.match(result.rejected[0].reasons.join("；"), /没有已确认可用范围/);
});

test("selection snapshot is deterministic and binds the brand snapshot", () => {
  const bundle = data();
  const result = runSelectionTask(bundle, naixueTask);
  const first = buildSelectionSnapshot(bundle, naixueTask, result);
  const second = buildSelectionSnapshot(bundle, naixueTask, result);
  assert.equal(stableSnapshotKey(first), stableSnapshotKey(second));
  assert.equal(first.input_brand_snapshot_id, "BAS-NAIXUE-0001");
  assert.deepEqual(first.selected_items.map((item) => item.id), ["CI-NAIXUE-BAKERY-SET"]);
});

