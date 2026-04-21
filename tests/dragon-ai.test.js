import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideDragonAction } from '../js/dragon-ai.js';

test('dragon-ai: returns empty decisions for any card (pattern cards are fixed)', () => {
  const s = { seed: 1, round: 1, dragon: { hp: 15, phase: 1 }, players: [], board: [] };
  for (const t of ['row-top', 'row-odd', 'col-mid', 'all', 'rest', 'roar']) {
    const out = decideDragonAction(s, { type: t });
    assert.deepEqual(out, {});
  }
});
