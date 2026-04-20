import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, startMatch } from '../js/state.js';
import { rollTurnOrder } from '../js/engine.js';

const playerCfg = (count) => Array.from({ length: count }, (_, i) => ({
  id: `P${i}`, name: `P${i}`, isAI: i > 0,
}));

test('engine.flow: rollTurnOrder produces N+1 entries (players + dragon)', () => {
  const s0 = startMatch(createInitialState({ seed: 1, players: playerCfg(3) }));
  const s = rollTurnOrder(s0);
  assert.equal(s.turnOrder.length, 4);
  assert.ok(s.turnOrder.includes('dragon'));
  for (const p of s0.players) assert.ok(s.turnOrder.includes(p.id));
});

test('engine.flow: rollTurnOrder excludes eliminated players', () => {
  const s0 = startMatch(createInitialState({ seed: 2, players: playerCfg(4) }));
  const withDead = { ...s0, players: s0.players.map((p, i) => i === 1 ? { ...p, isEliminated: true } : p) };
  const s = rollTurnOrder(withDead);
  assert.equal(s.turnOrder.length, 4); // 3 alive + dragon
  assert.ok(!s.turnOrder.includes(withDead.players[1].id));
});

test('engine.flow: rollTurnOrder sets currentTurnIndex 0 and phase "acting"', () => {
  const s0 = startMatch(createInitialState({ seed: 3, players: playerCfg(3) }));
  const s = rollTurnOrder(s0);
  assert.equal(s.currentTurnIndex, 0);
  assert.equal(s.phase, 'acting');
});

test('engine.flow: rollTurnOrder output is deterministic given same seed', () => {
  const make = () => rollTurnOrder(startMatch(createInitialState({ seed: 7, players: playerCfg(4) })));
  assert.deepEqual(make().turnOrder, make().turnOrder);
});
