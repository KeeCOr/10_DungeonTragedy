import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executePlayerAction } from '../js/engine.js';

// Dragon is off-grid. Players in row 0 can attack dragon.
function baseState(playerRace = 'human') {
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
      { id: 'P0', race: playerRace, hp: 5, maxHp: 5, hand: [
        { id: 'a1', type: 'attack', range: 1 },
        { id: 'a2', type: 'attack', range: 2 },
      ], position: { r: 0, c: 1 }, missions: {}, missionProgress: {}, statusEffects: {},
        isEliminated: false, dragonDamageDealt: 0, isAI: false },
      { id: 'P1', race: 'human', hp: 5, maxHp: 5, hand: [], position: { r: 0, c: 3 },
        missions: {}, missionProgress: {}, statusEffects: {}, isEliminated: false,
        dragonDamageDealt: 0, isAI: true },
    ],
    turnOrder: ['P0', 'P1', 'dragon'], currentTurnIndex: 0,
    commonDeck: [], commonDiscard: [], log: [],
  };
}

test('combat: attack range-1 hits dragon from attack zone for 1', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a1', target: { type: 'dragon' } });
  assert.equal(next.dragon.hp, 11);
  assert.equal(next.players[0].hand.length, 1);
  assert.equal(next.players[0].dragonDamageDealt, 1);
});

test('combat: orc attack deals +1 damage', () => {
  const s = baseState('orc');
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a1', target: { type: 'dragon' } });
  assert.equal(next.dragon.hp, 10);
});

test('combat: elf attack gains +1 range', () => {
  const s = baseState('elf');
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a1', target: { type: 'dragon' } });
  assert.equal(next.dragon.hp, 11);
});

test('combat: out of range throws', () => {
  const s = baseState('human');
  // P1 is at (0,3), P0 at (0,1) — distance 2, range-1 card can't reach
  assert.throws(() => executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a1', target: { type: 'player', id: 'P1' } }),
    /out of range/i);
});

test('combat: attack on other player damages them', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a2', target: { type: 'player', id: 'P1' } });
  assert.equal(next.players[1].hp, 4);
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
  assert.equal(next.board[0][3], null);
});

test('combat: attack counts toward attackCount progress', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a1', target: { type: 'dragon' } });
  assert.equal(next.players[0].missionProgress.attackCount, 1);
});

test('combat: ranged attack (range>=2) counts toward rangedAttackCount progress', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a2', target: { type: 'dragon' } });
  assert.equal(next.players[0].missionProgress.rangedAttackCount, 1);
});

test('combat: lastDragonHitterId set to attacker when dragon takes damage', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'a1', target: { type: 'dragon' } });
  assert.equal(next.lastDragonHitterId, 'P0');
});
