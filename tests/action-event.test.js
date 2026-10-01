import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executePlayerAction } from '../js/engine.js';

function baseState() {
  return {
    seed: 1, matchIndex: 0, matchScores: [[], [], []], round: 1, phase: 'acting',
    board: [
      [null, 'P0', null, 'P1', null],
      [null, null, null, null, null],
      [null, null, null, null, null],
    ],
    dragon: { hp: 12, maxHp: 12, phase: 1, deck: [], discard: [], revealed: [],
      position: null, markedCells: [], drops: [] },
    players: [
      { id: 'P0', name: 'You', race: 'human', hp: 5, maxHp: 5, hand: [
        { id: 'm1', type: 'move', range: 1 },
        { id: 'a1', type: 'attack', range: 2 },
      ], position: { r: 0, c: 1 }, missions: {}, missionProgress: {}, statusEffects: {},
        isEliminated: false, dragonDamageDealt: 0, isAI: false },
      { id: 'P1', name: 'Ally1', race: 'elf', hp: 5, maxHp: 5, hand: [],
        position: { r: 0, c: 3 }, missions: {}, missionProgress: {}, statusEffects: {},
        isEliminated: false, dragonDamageDealt: 0, isAI: true },
    ],
    turnOrder: ['P0', 'P1', 'dragon'], currentTurnIndex: 0,
    commonDeck: [{ id: 'd1', type: 'move', range: 2 }, { id: 'd2', type: 'attack', range: 1 }],
    commonDiscard: [],
    log: [],
  };
}

test('action event: movement records actor, summary, and from/to cells', () => {
  const next = executePlayerAction(baseState(), {
    type: 'playCard', playerId: 'P0', cardId: 'm1', target: { r: 1, c: 1 },
  });

  assert.equal(next.lastActionEvent.actorId, 'P0');
  assert.equal(next.lastActionEvent.kind, 'move');
  assert.deepEqual(next.lastActionEvent.from, { r: 0, c: 1 });
  assert.deepEqual(next.lastActionEvent.to, { r: 1, c: 1 });
  assert.match(next.lastActionEvent.summary, /moved/i);
});

test('action event: attack records the target and damage', () => {
  const next = executePlayerAction(baseState(), {
    type: 'playCard', playerId: 'P0', cardId: 'a1', target: { type: 'player', id: 'P1' },
  });

  assert.equal(next.lastActionEvent.kind, 'attack');
  assert.deepEqual(next.lastActionEvent.target, { type: 'player', id: 'P1', r: 0, c: 3 });
  assert.equal(next.lastActionEvent.damage, 1);
  assert.match(next.lastActionEvent.summary, /attacked Ally1 for 1/);
});

test('action event: draw action records how many cards were drawn', () => {
  const s = baseState();
  s.players[0].hand = [];
  const next = executePlayerAction(s, { type: 'drawTwo', playerId: 'P0' });

  assert.equal(next.lastActionEvent.kind, 'draw');
  assert.equal(next.lastActionEvent.count, 2);
  assert.match(next.lastActionEvent.summary, /drew 2 cards/);
});
