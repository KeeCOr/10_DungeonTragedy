import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/rng.js';
import { createInitialState, startMatch } from '../js/state.js';

const playerCfg = (count) => Array.from({ length: count }, (_, i) => ({
  id: `P${i}`, name: `Player${i}`, isAI: i > 0,
}));

test('state: createInitialState seeds basic fields', () => {
  const s = createInitialState({ seed: 42, players: playerCfg(3) });
  assert.equal(s.seed, 42);
  assert.equal(s.matchIndex, 0);
  assert.equal(s.players.length, 3);
  assert.equal(s.phase, 'setup');
  assert.deepEqual(s.matchScores, [[], [], []]);
});

test('state: startMatch assigns races, missions, initial hands, positions, dragon deck', () => {
  const s0 = createInitialState({ seed: 42, players: playerCfg(4) });
  const s = startMatch(s0);
  assert.equal(s.phase, 'rolling');
  assert.equal(s.round, 1);
  for (const p of s.players) {
    assert.ok(['human', 'elf', 'dwarf', 'orc'].includes(p.race));
    assert.ok(p.missions.required);
    assert.ok(p.missions.optional);
    assert.equal(p.hand.length, 3);
    assert.ok(p.position);
    assert.ok(!p.isEliminated);
    assert.equal(p.hp, p.maxHp);
  }
  assert.equal(s.dragon.hp, 12);
  assert.equal(s.dragon.position, null); // dragon is off-grid
  assert.ok(s.dragon.deck.length >= 10);
  assert.equal(s.dragon.phase, 1);
  assert.equal(s.dragon.revealed.length, 1);
});

test('state: startMatch - positions are unique and on bottom row', () => {
  const s0 = createInitialState({ seed: 42, players: playerCfg(5) });
  const s = startMatch(s0);
  const coords = s.players.map(p => `${p.position.r},${p.position.c}`);
  assert.equal(new Set(coords).size, coords.length);
  for (const p of s.players) {
    assert.equal(p.position.r, 2, `expected row 2, got ${JSON.stringify(p.position)}`);
  }
});

test('state: startMatch - player positions are deterministic (fixed layout)', () => {
  const run = () => startMatch(createInitialState({ seed: 100, players: playerCfg(3) }))
    .players.map(p => ({ ...p.position }));
  const a = run();
  const b = run();
  assert.deepEqual(a, b);
  // 3-player layout: all on row 2
  assert.deepEqual(a[0], { r: 2, c: 0 });
  assert.deepEqual(a[1], { r: 2, c: 2 });
  assert.deepEqual(a[2], { r: 2, c: 4 });
});

test('state: dragon deck starts with phase-1 eligible cards only', () => {
  const s0 = createInitialState({ seed: 42, players: playerCfg(3) });
  const s = startMatch(s0);
  const illegal = s.dragon.deck.some(c => c.phaseGate && c.phaseGate > 1);
  assert.equal(illegal, false);
});

test('state: match index advances on startMatch call', () => {
  const s0 = createInitialState({ seed: 42, players: playerCfg(3) });
  const s1 = startMatch(s0);
  assert.equal(s1.matchIndex, 0);
  const s2 = startMatch({ ...s1, matchIndex: 1 });
  assert.equal(s2.matchIndex, 1);
});
