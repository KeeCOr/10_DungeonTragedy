import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDragonCard, getDragonCardPreview } from '../js/dragon.js';

function bs(overrides = {}) {
  return {
    seed: 9, matchIndex: 0, matchScores: [[],[],[]], round: 1, phase: 'acting',
    board: [
      [null, 'P0', null, 'P1', null],
      [null, null, null, null, null],
      [null, null, 'P2', null, null],
    ],
    dragon: { hp: 10, maxHp: 15, phase: 2, deck: [], discard: [], revealed: [],
      position: null, markedCells: [] },
    players: [
      { id: 'P0', race: 'human', hp: 5, maxHp: 5, hand: [], position: { r: 0, c: 1 },
        missions: {}, missionProgress: {}, statusEffects: {}, isEliminated: false,
        dragonDamageDealt: 0, isAI: true },
      { id: 'P1', race: 'elf', hp: 5, maxHp: 5, hand: [], position: { r: 0, c: 3 },
        missions: {}, missionProgress: {}, statusEffects: {}, isEliminated: false,
        dragonDamageDealt: 0, isAI: true },
      { id: 'P2', race: 'dwarf', hp: 6, maxHp: 6, hand: [], position: { r: 2, c: 2 },
        missions: {}, missionProgress: {}, statusEffects: {}, isEliminated: false,
        dragonDamageDealt: 0, isAI: true },
    ],
    turnOrder: ['P0','P1','P2','dragon'], currentTurnIndex: 3,
    commonDeck: [], commonDiscard: [], log: [], ...overrides,
  };
}

test('dragon.row-top: damages all players on row 0 for 2', () => {
  const s = bs();
  const next = resolveDragonCard(s, { type: 'row-top' }, {});
  assert.equal(next.players.find(p => p.id === 'P0').hp, 3);
  assert.equal(next.players.find(p => p.id === 'P1').hp, 3);
  assert.equal(next.players.find(p => p.id === 'P2').hp, 6);
});

test('dragon.row-bot: damages only row 2 for 2', () => {
  const s = bs();
  const next = resolveDragonCard(s, { type: 'row-bot' }, {});
  assert.equal(next.players.find(p => p.id === 'P0').hp, 5);
  assert.equal(next.players.find(p => p.id === 'P2').hp, 4);
});

test('dragon.row-odd: damages rows 0 and 2 for 1 each', () => {
  const s = bs();
  const next = resolveDragonCard(s, { type: 'row-odd' }, {});
  assert.equal(next.players.find(p => p.id === 'P0').hp, 4);
  assert.equal(next.players.find(p => p.id === 'P1').hp, 4);
  assert.equal(next.players.find(p => p.id === 'P2').hp, 5);
});

test('dragon.row-even: damages only row 1 for 2', () => {
  const s = bs();
  const next = resolveDragonCard(s, { type: 'row-even' }, {});
  assert.equal(next.players.find(p => p.id === 'P0').hp, 5);
  assert.equal(next.players.find(p => p.id === 'P1').hp, 5);
  assert.equal(next.players.find(p => p.id === 'P2').hp, 6);
});

test('dragon.col-mid: damages column 2 for 2', () => {
  const s = bs();
  const next = resolveDragonCard(s, { type: 'col-mid' }, {});
  assert.equal(next.players.find(p => p.id === 'P0').hp, 5);
  assert.equal(next.players.find(p => p.id === 'P2').hp, 4);
});

test('dragon.all: damages every cell by 1', () => {
  const s = bs();
  const next = resolveDragonCard(s, { type: 'all' }, {});
  for (const p of next.players) assert.equal(p.hp, p.maxHp - 1);
});

test('dragon.corners: damages 4 corners for 2', () => {
  const s = bs({
    board: [
      ['P0', null, null, null, 'P1'],
      [null, null, null, null, null],
      [null, null, null, null, 'P2'],
    ],
    players: bs().players.map(p =>
      p.id === 'P0' ? { ...p, position: { r: 0, c: 0 } } :
      p.id === 'P1' ? { ...p, position: { r: 0, c: 4 } } :
      p.id === 'P2' ? { ...p, position: { r: 2, c: 4 } } : p),
  });
  const next = resolveDragonCard(s, { type: 'corners' }, {});
  assert.equal(next.players.find(p => p.id === 'P0').hp, 3);
  assert.equal(next.players.find(p => p.id === 'P1').hp, 3);
  assert.equal(next.players.find(p => p.id === 'P2').hp, 4);
});

test('dragon.rest: deals no damage', () => {
  const s = bs();
  const next = resolveDragonCard(s, { type: 'rest' }, {});
  for (const p of next.players) assert.equal(p.hp, p.maxHp);
});

test('dragon.roar: sets roarDebuffActiveForRound = round + 1', () => {
  const s = bs();
  const next = resolveDragonCard(s, { type: 'roar' }, {});
  assert.equal(next.dragon.roarDebuffActiveForRound, s.round + 1);
});

test('dragon.hide absorbs 1 damage on hidden player', () => {
  const s = bs();
  s.players[0].statusEffects.hiddenThisRound = true;
  const next = resolveDragonCard(s, { type: 'row-top' }, {});
  // P0 had hidden: 2 damage reduced to 1
  assert.equal(next.players.find(p => p.id === 'P0').hp, 4);
  // P1 without hide takes full 2
  assert.equal(next.players.find(p => p.id === 'P1').hp, 3);
});

test('dragon.shield absorbs full damage and is consumed', () => {
  const s = bs();
  s.players[0].statusEffects.shieldActive = true;
  const next = resolveDragonCard(s, { type: 'row-top' }, {});
  assert.equal(next.players.find(p => p.id === 'P0').hp, 5);
  assert.equal(next.players.find(p => p.id === 'P0').statusEffects.shieldActive, false);
});

test('preview: getDragonCardPreview for row-top returns 5 cells', () => {
  const pv = getDragonCardPreview({ type: 'row-top' });
  assert.equal(pv.cells.length, 5);
  assert.equal(pv.damage, 2);
});

test('preview: getDragonCardPreview for rest returns no cells', () => {
  const pv = getDragonCardPreview({ type: 'rest' });
  assert.equal(pv.cells.length, 0);
});
