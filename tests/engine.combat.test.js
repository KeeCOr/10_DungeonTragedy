import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executePlayerAction } from '../js/engine.js';

function baseState(playerRace = 'human') {
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
      { id: 'P0', race: playerRace, hp: 3, maxHp: 3, hand: [
        { id: 'a1', type: 'attack', range: 1 },
        { id: 'a2', type: 'attack', range: 2 },
      ], position: { r: 1, c: 1 }, missions: {}, missionProgress: {}, statusEffects: {},
        isEliminated: false, dragonDamageDealt: 0, isAI: false },
      { id: 'P1', race: 'human', hp: 3, maxHp: 3, hand: [], position: { r: 1, c: 3 },
        missions: {}, missionProgress: {}, statusEffects: {}, isEliminated: false,
        dragonDamageDealt: 0, isAI: true },
    ],
    turnOrder: ['P0', 'P1', 'dragon'], currentTurnIndex: 0,
    commonDeck: [], commonDiscard: [], log: [],
  };
}

test('combat: attack range-1 hits adjacent dragon for 1', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a1', target: { type: 'dragon' } });
  assert.equal(next.dragon.hp, 14);
  assert.equal(next.players[0].hand.length, 1);
  assert.equal(next.players[0].dragonDamageDealt, 1);
});

test('combat: orc attack deals +1 damage', () => {
  const s = baseState('orc');
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a1', target: { type: 'dragon' } });
  assert.equal(next.dragon.hp, 13);
});

test('combat: elf attack gains +1 range', () => {
  const s = baseState('elf');
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a1', target: { type: 'dragon' } });
  assert.equal(next.dragon.hp, 14);
});

test('combat: out of range throws', () => {
  const s = baseState('human');
  assert.throws(() => executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a1', target: { type: 'player', id: 'P1' } }),
    /out of range/i);
});

test('combat: attack on other player damages them', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a2', target: { type: 'player', id: 'P1' } });
  assert.equal(next.players[1].hp, 2);
});

test('combat: attacker loses card to discard', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a1', target: { type: 'dragon' } });
  assert.equal(next.commonDiscard.length, 1);
  assert.equal(next.commonDiscard[0].type, 'attack');
});

test('combat: player reaching 0 HP becomes eliminated', () => {
  const s = baseState();
  s.players[1].hp = 1;
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a2', target: { type: 'player', id: 'P1' } });
  assert.equal(next.players[1].hp, 0);
  assert.equal(next.players[1].isEliminated, true);
  assert.equal(next.board[1][3], null);
});

test('combat: attack counts toward attackCount progress', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a1', target: { type: 'dragon' } });
  assert.equal(next.players[0].missionProgress.attackCount, 1);
});

test('combat: ranged attack (range≥2) counts toward rangedAttackCount progress', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a2', target: { type: 'dragon' } });
  assert.equal(next.players[0].missionProgress.rangedAttackCount, 1);
});
