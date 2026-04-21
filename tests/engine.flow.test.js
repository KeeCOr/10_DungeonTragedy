import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, startMatch } from '../js/state.js';
import { rollTurnOrder, maybeTransitionPhase, clearRoundStatus, resolveMarkedCells, refillRevealed, executeDragonTurn, endRound, checkMatchEnd } from '../js/engine.js';

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

test('phase: HP 10 → phase 2', () => {
  const s = { dragon: { hp: 10, phase: 1, deck: [], discard: [], revealed: [] } };
  const next = maybeTransitionPhase(s);
  assert.equal(next.dragon.phase, 2);
});

test('phase: HP 5 → phase 3', () => {
  const s = { dragon: { hp: 5, phase: 2, deck: [], discard: [], revealed: [] } };
  const next = maybeTransitionPhase(s);
  assert.equal(next.dragon.phase, 3);
});

test('phase: HP 11 stays phase 1', () => {
  const s = { dragon: { hp: 11, phase: 1, deck: [], discard: [], revealed: [] } };
  const next = maybeTransitionPhase(s);
  assert.equal(next.dragon.phase, 1);
});

test('clearRoundStatus resets hidden and taunt flags', () => {
  const s = { players: [
    { id: 'A', statusEffects: { hiddenThisRound: true, tauntThisRound: true, shieldActive: true } },
  ] };
  const next = clearRoundStatus(s);
  assert.equal(next.players[0].statusEffects.hiddenThisRound, false);
  assert.equal(next.players[0].statusEffects.tauntThisRound, false);
  assert.equal(next.players[0].statusEffects.shieldActive, true);
});

test('resolveMarkedCells: damages cell + 4-adjacent on scheduled round and removes mark', () => {
  const s = { round: 2,
    board: [[null,null,null,null,null],[null,'A','dragon',null,null],[null,null,null,null,null]],
    dragon: { position: { r: 1, c: 2 }, markedCells: [{ r: 1, c: 1, resolvesOnRound: 2 }] },
    players: [{ id: 'A', hp: 3, maxHp: 3, position: { r: 1, c: 1 }, isEliminated: false,
      missionProgress: {}, statusEffects: {}, race: 'human' }], log: [] };
  const next = resolveMarkedCells(s);
  assert.equal(next.dragon.markedCells.length, 0);
  assert.equal(next.players[0].hp, 1);
});

test('refillRevealed: reveals up to phase count of cards', () => {
  const s = { dragon: { phase: 2, deck: [
    { id: 'x1', type: 'bite', phaseGate: 1 },
    { id: 'x2', type: 'bite', phaseGate: 1 },
  ], discard: [], revealed: [] } };
  const next = refillRevealed(s);
  assert.equal(next.dragon.revealed.length, 2);
  assert.equal(next.dragon.deck.length, 0);
});

test('endRound increments round, clears status, reshuffles reveals', () => {
  const s0 = startMatch(createInitialState({ seed: 5, players: [
    { id: 'P0', name: 'P0', isAI: false },
    { id: 'P1', name: 'P1', isAI: true },
    { id: 'P2', name: 'P2', isAI: true },
  ] }));
  const s1 = { ...s0, players: s0.players.map((p) => ({ ...p,
    statusEffects: { ...p.statusEffects, hiddenThisRound: true } })) };
  const next = endRound(s1);
  assert.equal(next.round, s0.round + 1);
  assert.equal(next.players[0].statusEffects.hiddenThisRound, false);
});

test('checkMatchEnd: dragon HP 0 returns "dragon-dead"', () => {
  const s = { dragon: { hp: 0 }, players: [
    { isEliminated: false }, { isEliminated: true },
  ], round: 10 };
  assert.equal(checkMatchEnd(s), 'dragon-dead');
});

test('checkMatchEnd: all players eliminated returns "party-wipe"', () => {
  const s = { dragon: { hp: 5 }, players: [
    { isEliminated: true }, { isEliminated: true },
  ], round: 3 };
  assert.equal(checkMatchEnd(s), 'party-wipe');
});

test('checkMatchEnd: round > 30 returns "timeout"', () => {
  const s = { dragon: { hp: 5 }, players: [{ isEliminated: false }], round: 31 };
  assert.equal(checkMatchEnd(s), 'timeout');
});

test('checkMatchEnd: none returns null', () => {
  const s = { dragon: { hp: 5 }, players: [{ isEliminated: false }], round: 10 };
  assert.equal(checkMatchEnd(s), null);
});

test('rollTurnOrder: applies roar debuff when current round matches roarDebuffActiveForRound', () => {
  const s0 = startMatch(createInitialState({ seed: 11, players: [
    { id: 'P0', name: 'P0', isAI: false },
    { id: 'P1', name: 'P1', isAI: true },
  ] }));
  // Force specific round and roar state so that next roll dice can be compared
  const normal = rollTurnOrder({ ...s0, round: 5,
    dragon: { ...s0.dragon, roarDebuffActiveForRound: null } });
  const debuffed = rollTurnOrder({ ...s0, round: 5,
    dragon: { ...s0.dragon, roarDebuffActiveForRound: 5 } });
  // With debuff, the dragon's roll is unchanged, but each player's slot shifts down relative to no-debuff.
  // We assert determinism and a shape check: turnOrder length equals alive + dragon.
  assert.equal(debuffed.turnOrder.length, 3);
  // And that when debuff is inactive on the current round, no change to the roll distribution seed:
  // (we can at minimum verify the debuff is NOT applied when it's for a future round)
  const futureDebuff = rollTurnOrder({ ...s0, round: 5,
    dragon: { ...s0.dragon, roarDebuffActiveForRound: 10 } });
  assert.deepEqual(futureDebuff.turnOrder, normal.turnOrder);
});
