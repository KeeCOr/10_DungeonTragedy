import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executePlayerAction } from '../js/engine.js';

function baseState(overrides = {}) {
  return {
    seed: 1, matchIndex: 0, matchScores: [[], [], []], round: 1, phase: 'acting',
    board: [
      [null, null, null, null, null],
      [null, 'P0', null, 'P1', null],
      [null, null, null, null, null],
    ],
    dragon: { hp: 12, maxHp: 12, phase: 1,
      deck: [{ id: 'd2', type: 'row-attack', phaseGate: 1 }, { id: 'd3', type: 'col-attack', phaseGate: 1 }],
      discard: [], revealed: [{ id: 'd1', type: 'row-attack', phaseGate: 1 }],
      position: null, markedCells: [], drops: [] },
    players: [
      { id: 'P0', race: 'human', hp: 2, maxHp: 5, hand: [
        { id: 'h1', type: 'hide' },
        { id: 'heal1', type: 'heal' },
        { id: 'sc1', type: 'scout' },
        { id: 'tn1', type: 'taunt' },
      ], position: { r: 1, c: 1 }, missions: {
        required: { id: 'human-heal-3' }, optional: { id: 'dwarf-taunt-2' },
      }, missionProgress: {}, statusEffects: {},
        isEliminated: false, dragonDamageDealt: 0, isAI: false },
      { id: 'P1', race: 'dwarf', hp: 1, maxHp: 6, hand: [], position: { r: 1, c: 3 },
        missions: {}, missionProgress: {}, statusEffects: {}, isEliminated: false,
        dragonDamageDealt: 0, isAI: true },
    ],
    turnOrder: ['P0', 'P1', 'dragon'], currentTurnIndex: 0,
    commonDeck: [], commonDiscard: [], log: [], ...overrides,
  };
}

test('utility: hide sets statusEffects.hiddenThisRound true', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'h1' });
  assert.equal(next.players[0].statusEffects.hiddenThisRound, true);
});

test('utility: heal on self raises HP by 1 capped at max', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'heal1', target: { type: 'self' } });
  assert.equal(next.players[0].hp, 3); // 2 + 1 = 3
  assert.equal(next.players[0].missionProgress.healCount, 1);
});

test('utility: heal on adjacent ally requires adjacency', () => {
  const s = baseState();
  assert.throws(() => executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'heal1', target: { type: 'player', id: 'P1' } }),
    /not adjacent/i);
});

test('utility: heal on adjacent ally succeeds', () => {
  const s = baseState();
  s.players[1].position = { r: 0, c: 1 };
  s.board = [
    [null, 'P1', null, null, null],
    [null, 'P0', 'dragon', null, null],
    [null, null, null, null, null],
  ];
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'heal1', target: { type: 'player', id: 'P1' } });
  assert.equal(next.players[1].hp, 2);
});

test('utility: scout reveals one additional dragon card', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'sc1' });
  assert.equal(next.dragon.revealed.length, 2);
  assert.equal(next.dragon.deck.length, 1);
  assert.equal(next.players[0].missionProgress.scoutCount, 1);
});

test('utility: taunt marks self as taunting this round', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'playCard', playerId: 'P0', cardId: 'tn1' });
  assert.equal(next.players[0].statusEffects.tauntThisRound, true);
  assert.equal(next.players[0].missionProgress.tauntCount, 1);
});

test('utility: drawTwo action adds 2 cards if hand <= 3 (max hand 5)', () => {
  const s = baseState();
  s.players[0].hand = s.players[0].hand.slice(0, 2);
  s.commonDeck = [
    { id: 'x1', type: 'move', range: 1 },
    { id: 'x2', type: 'attack', range: 1 },
  ];
  const next = executePlayerAction(s, { type: 'drawTwo', playerId: 'P0' });
  assert.equal(next.players[0].hand.length, 4);
  assert.equal(next.players[0].missionProgress.drawActionCount, 1);
});

test('utility: drawTwo rejected if hand > 3 (max hand 5)', () => {
  const s = baseState();
  s.players[0].hand = [
    { id: 'x1', type: 'move', range: 1 },
    { id: 'x2', type: 'move', range: 1 },
    { id: 'x3', type: 'move', range: 1 },
    { id: 'x4', type: 'move', range: 1 },
  ];
  assert.throws(() => executePlayerAction(s, { type: 'drawTwo', playerId: 'P0' }), /hand too large/i);
});

test('utility: discardAndRedraw discards entire hand and draws same count', () => {
  const s = baseState();
  s.commonDeck = [
    { id: 'd1', type: 'move', range: 1 },
    { id: 'd2', type: 'attack', range: 1 },
    { id: 'd3', type: 'scout' },
    { id: 'd4', type: 'heal' },
    { id: 'd5', type: 'hide' },
    { id: 'd6', type: 'move', range: 2 },
  ];
  const originalHandCount = s.players[0].hand.length;
  const next = executePlayerAction(s, { type: 'discardAndRedraw', playerId: 'P0' });
  assert.equal(next.players[0].hand.length, originalHandCount);
  assert.equal(next.players[0].missionProgress.handRedrawCount, 1);
  // All 4 original hand cards should end up in commonDiscard
  assert.equal(next.commonDiscard.length, originalHandCount);
});

test('utility: discardAndRedraw throws when hand is empty', () => {
  const s = baseState();
  s.players[0].hand = [];
  assert.throws(() => executePlayerAction(s, { type: 'discardAndRedraw', playerId: 'P0' }),
    /hand is empty/i);
});

test('utility: discardAndSwapMissions discards entire hand and reassigns missions', () => {
  const s = baseState();
  const next = executePlayerAction(s, { type: 'discardAndSwapMissions', playerId: 'P0' });
  assert.equal(next.players[0].hand.length, 0);
  assert.equal(next.commonDiscard.length, 4);
  assert.ok(next.players[0].missions.required);
  assert.ok(next.players[0].missions.optional);
  assert.equal(next.players[0].missionProgress.missionSwapCount, 1);
});

test('utility: human extraDrawChance import exists and returns 0.05', async () => {
  const m = await import('../js/races.js');
  assert.equal(m.extraDrawChance('human'), 0.05);
  assert.equal(m.extraDrawChance('elf'), 0);
});
