import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const renderSource = fs.readFileSync(new URL('../js/render.js', import.meta.url), 'utf8');

test('render: cards expose type-specific classes for generated skill atlas icons', () => {
  assert.match(renderSource, /cardKindClass/);
  assert.match(renderSource, /skill-icon \$\{cardKindClass\}/);
  assert.match(renderSource, /card card-\$\{cardKindClass\}/);
});

test('render: player and ally panels expose race portrait medallions', () => {
  assert.match(renderSource, /portrait-medallion \$\{human\.race\}/);
  assert.match(renderSource, /portrait-medallion \$\{p\.race\}/);
});
