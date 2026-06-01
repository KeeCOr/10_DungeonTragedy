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

test('render: board tokens expose generated race atlas classes', () => {
  assert.match(renderSource, /token-image \$\{p\.race\}/);
  assert.match(renderSource, /renderTurnPanel\(state\)/);
  assert.match(renderSource, /turn-panel/);
});

test('render: dragon medallion and lower panel expose encounter choice UI', () => {
  assert.match(renderSource, /dragon-medallion \$\{d\.atlasClass/);
  assert.match(renderSource, /turn-choice-panel/);
  assert.match(renderSource, /choice-panel-title/);
});
