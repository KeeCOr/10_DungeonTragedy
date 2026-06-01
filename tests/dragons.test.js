import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRAGON_TYPES, pickDragonType } from '../js/dragons.js';
import { createInitialState, startMatch } from '../js/state.js';

const players = [
  { id: 'P0', name: 'You', isAI: false },
  { id: 'P1', name: 'Ally1', isAI: true },
  { id: 'P2', name: 'Ally2', isAI: true },
];

test('dragons: defines five encounter dragon types', () => {
  assert.equal(DRAGON_TYPES.length, 5);
  assert.deepEqual(DRAGON_TYPES.map((d) => d.id), ['fire', 'ice', 'venom', 'storm', 'gold']);
  for (const dragon of DRAGON_TYPES) {
    assert.ok(dragon.name);
    assert.equal(dragon.maxHp, 12);
    assert.ok(dragon.atlasClass);
  }
});

test('dragons: random picker is deterministic from seed and match index', () => {
  assert.deepEqual(pickDragonType(1234, 0), pickDragonType(1234, 0));
  assert.ok(DRAGON_TYPES.some((d) => d.id === pickDragonType(1234, 2).id));
});

test('state: createInitialState stores voted target dragon kills', () => {
  const s = createInitialState({ seed: 7, players, targetDragonKills: 4 });
  assert.equal(s.targetDragonKills, 4);
  assert.equal(s.dragonKills, 0);
  assert.deepEqual(s.matchScores, [[], [], [], []]);
});

test('state: startMatch selects one of five random dragon types', () => {
  const s = startMatch(createInitialState({ seed: 42, players, targetDragonKills: 5 }));
  assert.ok(DRAGON_TYPES.some((d) => d.id === s.dragon.type));
  assert.ok(s.dragon.name);
  assert.ok(s.dragon.atlasClass);
  assert.equal(s.dragon.maxHp, 12);
});
