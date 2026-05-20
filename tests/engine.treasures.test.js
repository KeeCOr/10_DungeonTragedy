import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executePlayerAction } from '../js/engine.js';

function baseState(treasure) {
  return {
    seed: 1, matchIndex: 0, matchScores: [[], [], []], round: 1, phase: 'acting',
    board: [
      [null, null, null, null, null],
      [null, 'P0', null, null, null],
      [null, null, null, null, null],
    ],
    dragon: { hp: 10, maxHp: 12, phase: 2, deck: [], discard: [], revealed: [],
      position: null, markedCells: [], drops: [] },
    players: [
      { id: 'P0', race: 'human', hp: 1, maxHp: 5, hand: [
        { id: 't1', type: 'treasure', treasure },
      ], position: { r: 1, c: 1 }, missions: {}, missionProgress: {}, statusEffects: {},
        isEliminated: false, dragonDamageDealt: 0, isAI: false },
    ],
    turnOrder: ['P0', 'dragon'], currentTurnIndex: 0,
    commonDeck: [], commonDiscard: [], log: [],
  };
}

test('treasure sword: deals 3 damage to dragon', () => {
  const s = baseState('sword');
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 't1', target: { type: 'dragon' } });
  assert.equal(next.dragon.hp, 7);
  assert.equal(next.players[0].dragonDamageDealt, 3);
  assert.equal(next.players[0].missionProgress.treasuresUsed, 1);
});

test('treasure potion: restores self HP to max', () => {
  const s = baseState('potion');
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 't1' });
  assert.equal(next.players[0].hp, 5); // maxHp
  assert.equal(next.players[0].missionProgress.treasuresUsed, 1);
});

test('treasure cloak: moves 1-2 free', () => {
  const s = baseState('cloak');
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 't1', target: { r: 0, c: 1 } });
  assert.deepEqual(next.players[0].position, { r: 0, c: 1 });
  assert.equal(next.players[0].missionProgress.treasuresUsed, 1);
});

test('treasure cloak: rejects distance > 2', () => {
  const s = baseState('cloak');
  assert.throws(() => executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 't1', target: { r: 2, c: 4 } }),
    /beyond range/i);
});

test('treasure shield: sets shieldActive, does not consume on play', () => {
  const s = baseState('shield');
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 't1' });
  assert.equal(next.players[0].statusEffects.shieldActive, true);
  assert.equal(next.players[0].hand.length, 0);
});

test('treasure rune: sets runeBonusNext = 2', () => {
  const s = baseState('rune');
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 't1' });
  assert.equal(next.players[0].statusEffects.runeBonusNext, 2);
  assert.equal(next.players[0].missionProgress.treasuresUsed, 1);
});

test('treasure: picking one increments treasuresAcquired on receive (not on use)', () => {
  const s = baseState('sword');
  s.players[0].missionProgress.treasuresAcquired = 1;
  s.players[0].missionProgress.treasuresAcquiredTypes = ['sword'];
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 't1', target: { type: 'dragon' } });
  assert.equal(next.players[0].missionProgress.treasuresAcquired, 1);
});
