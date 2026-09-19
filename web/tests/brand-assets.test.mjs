import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  snapshotContentHash,
  validateBrandAssetDocument,
} from '../lib/brand-assets.ts';

const fixture = new URL('../../examples/brand_assets_v040.json', import.meta.url);
const data = () => JSON.parse(fs.readFileSync(fixture));

test('three generalized product shapes pass the browser contract', async () => {
  const result = await validateBrandAssetDocument(data());
  assert.equal(result.brands.length, 3);
  assert.equal(result.catalog_items.length, 6);
  assert.deepEqual(
    [...new Set(result.catalog_items.map((item) => item.type))].sort(),
    ['menu_item', 'physical_product', 'service'],
  );
});

test('overseas availability cannot upgrade a China product', async () => {
  const value = data();
  value.catalog_items[0].marketing_readiness = 'eligible';
  await assert.rejects(
    validateBrandAssetDocument(value),
    /规则计算为 needs_review/,
  );
});

test('retired item cannot become eligible', async () => {
  const value = data();
  const item = value.catalog_items.find(
    (row) => row.id === 'CI-NAIXUE-SUMMER-TEA',
  );
  item.marketing_readiness = 'eligible';
  await assert.rejects(validateBrandAssetDocument(value), /规则计算为 expired/);
});

test('cross-brand claim and incomplete snapshot are rejected', async () => {
  let value = data();
  value.catalog_items[0].claim_refs = ['CL-NAIXUE-SENSORY-REST'];
  await assert.rejects(validateBrandAssetDocument(value), /商品Claim跨品牌/);
  value = data();
  value.brand_asset_snapshots[1].catalog_items.pop();
  value.brand_asset_snapshots[1].content_hash = await snapshotContentHash(
    value.brand_asset_snapshots[1],
  );
  await assert.rejects(validateBrandAssetDocument(value), /未精确覆盖/);
});

test('snapshot hash detects a changed version reference', async () => {
  const value = data();
  value.brand_asset_snapshots[0].catalog_items[0].version = 2;
  await assert.rejects(validateBrandAssetDocument(value), /未精确覆盖|哈希不匹配/);
});
