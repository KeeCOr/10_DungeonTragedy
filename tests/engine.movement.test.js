import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executePlayerAction } from '../js/engine.js';

function baseState() {
  return {
    seed: 1, matchIndex: 0, matchScores: [[], [], []], round: 1, phase: 'acting',
    board: [
      [null, null, null, null, null],
      [null, 'P0', 'dragon', 'P1', null],
      [null, null, null, null, null],
    ],
    dragon: { hp: 15, maxHp: 15, phase: 1, deck: [], discard: [], revealed: [],
      position: { r: 1, c: 2 }, markedCells: [] },
    players: [
      { id: 'P0', race: 'human', hp: 3, maxHp: 3, hand: [
        { id: 'm1', type: 'move', range: 1 },
        { id: 'm2', type: 'move', range: 2 },
      ], position: { r: 1, c: 1 }, missions: {}, missionProgress: {}, statusEffects: {},
        isEliminated: false, dragonDamageDealt: 0, isAI: false },
      { id: 'P1', race: 'elf', hp: 3, maxHp: 3, hand: [], position: { r: 1, c: 3 },
        missions: {}, missionProgress: {}, statusEffects: {}, isEliminated: false,
        dragonDamageDealt: 0, isAI: true },
    ],
    turnOrder: ['P0', 'P1', 'dragon'], currentTurnIndex: 0,
    commonDeck: [], commonDiscard: [], log: [],
  };
}

test('movement: plays move card, steps to adjacent empty cell, advances turn', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'm1', target: { r: 0, c: 1 } });
  assert.deepEqual(next.players[0].position, { r: 0, c: 1 });
  assert.equal(next.board[0][1], 'P0');
  assert.equal(next.board[1][1], null);
  assert.equal(next.players[0].hand.length, 1);
  assert.equal(next.players[0].hand[0].id, 'm2');
  assert.equal(next.currentTurnIndex, 1);
});

test('movement: range-2 card reaches 2-step orthogonal target', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'm2', target: { r: 1, c: 0 } });
  assert.deepEqual(next.players[0].position, { r: 1, c: 0 });
});

test('movement: diagonal target rejected', () => {
  const s = baseState();
  assert.throws(() => executePlayerAction(s, {
    type: 'playCard', playerId: 'P0', cardId: 'm1', target: { r: 0, c: 2 } }),
    /invalid move/i);
});

test('movement: target outside range rejected', () => {
  const s = baseState();
  assert.throws(() => executePlayerAction(s, {
    type: 'playCard', playerId: 'P0', cardId: 'm1', target: { r: 1, c: 4 } }),
    /invalid move/i);
});

test('movement: cannot enter dragon cell', () => {
  const s = baseState();
  assert.throws(() => executePlayerAction(s, {
    type: 'playCard', playerId: 'P0', cardId: 'm1', target: { r: 1, c: 2 } }),
    /invalid move/i);
});

test('movement: entering ally cell auto-swaps', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'm2', target: { r: 1, c: 3 } });
  assert.deepEqual(next.players[0].position, { r: 1, c: 3 });
  assert.deepEqual(next.players[1].position, { r: 1, c: 1 });
  assert.equal(next.board[1][3], 'P0');
  assert.equal(next.board[1][1], 'P1');
});

test('movement: move card goes into common discard', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'm1', target: { r: 0, c: 1 } });
  assert.equal(next.commonDiscard.length, 1);
  assert.equal(next.commonDiscard[0].id, 'm1');
});
