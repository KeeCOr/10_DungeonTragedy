import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDragonCard } from '../js/dragon.js';

function bs(overrides = {}) {
  return {
    seed: 9, matchIndex: 0, matchScores: [[],[],[]], round: 1, phase: 'acting',
    board: [
      [null, 'P0', null, 'P1', null],
      [null, null, 'dragon', null, null],
      [null, null, 'P2', null, null],
    ],
    dragon: { hp: 10, maxHp: 15, phase: 2, deck: [], discard: [], revealed: [],
      position: { r: 1, c: 2 }, markedCells: [] },
    players: [
      { id: 'P0', race: 'human', hp: 3, maxHp: 3, hand: [{ id: 'c0a', type: 'move', range: 1 }],
        position: { r: 0, c: 1 }, missions: {}, missionProgress: {}, statusEffects: {},
        isEliminated: false, dragonDamageDealt: 0, isAI: true },
      { id: 'P1', race: 'elf', hp: 3, maxHp: 3, hand: [{ id: 'c1a', type: 'move', range: 1 }, { id: 'c1b', type: 'attack', range: 1 }],
        position: { r: 0, c: 3 }, missions: {}, missionProgress: {}, statusEffects: {},
        isEliminated: false, dragonDamageDealt: 0, isAI: true },
      { id: 'P2', race: 'dwarf', hp: 4, maxHp: 4, hand: [],
        position: { r: 2, c: 2 }, missions: {}, missionProgress: {}, statusEffects: {},
        isEliminated: false, dragonDamageDealt: 0, isAI: true },
    ],
    turnOrder: ['P0','P1','P2','dragon'], currentTurnIndex: 3,
    commonDeck: [], commonDiscard: [], log: [], ...overrides,
  };
}

test('dragon.bite: deals 1 to specified adjacent target', () => {
  const s = bs();
  const next = resolveDragonCard(s, { type: 'bite', id: 'd1' }, { targetId: 'P2' });
  assert.equal(next.players[2].hp, 3);
});

test('dragon.breath: line damage with no blocker → target takes 2', () => {
  const s = bs();
  const next = resolveDragonCard(s, { type: 'breath', id: 'd2' }, { targetId: 'P2' });
  assert.equal(next.players[2].hp, 2);
});

test('dragon.breath: ally blocker - roll redirects ally on 4+ (deterministic seed)', () => {
  const s = bs({
    board: [
      [null, null, null, null, null],
      ['P2', 'P0', 'dragon', null, null],
      [null, null, null, null, null],
    ],
    players: [ ...bs().players ].map((p) =>
      p.id === 'P0' ? { ...p, position: { r: 1, c: 1 } } :
      p.id === 'P2' ? { ...p, position: { r: 1, c: 0 } } : p),
  });
  const next = resolveDragonCard(s, { type: 'breath', id: 'd2' }, { targetId: 'P2' });
  const total = (3 - next.players.find(p=>p.id==='P2').hp) + (3 - next.players.find(p=>p.id==='P0').hp);
  assert.equal(total, 2);
});

test('dragon.piercing: entire row hits all players in row for 1', () => {
  const s = bs({
    board: [
      [null, null, null, null, null],
      ['P0', 'P2', 'dragon', 'P1', null],
      [null, null, null, null, null],
    ],
    players: [ ...bs().players ].map((p) =>
      p.id === 'P0' ? { ...p, position: { r: 1, c: 0 } } :
      p.id === 'P2' ? { ...p, position: { r: 1, c: 1 } } :
      p.id === 'P1' ? { ...p, position: { r: 1, c: 3 } } : p),
  });
  const next = resolveDragonCard(s, { type: 'piercing', id: 'd3' }, { axis: 'row' });
  assert.equal(next.players[0].hp, 2);
  assert.equal(next.players[1].hp, 2);
  assert.equal(next.players[2].hp, 3);
});

test('dragon.tail: all 8-adjacent players take 1', () => {
  const s = bs();
  const next = resolveDragonCard(s, { type: 'tail', id: 'd4' }, {});
  assert.equal(next.players[0].hp, 2);
  assert.equal(next.players[1].hp, 2);
  assert.equal(next.players[2].hp, 3);
});

test('dragon.wings: pushes all players 1 cell away from dragon', () => {
  const s = bs();
  const next = resolveDragonCard(s, { type: 'wings', id: 'd5' }, {});
  assert.notEqual(JSON.stringify(next.players[0].position), JSON.stringify(s.players[0].position));
});

test('dragon.roar: sets state.dragon.roarDebuffActiveForRound = state.round + 1', () => {
  const s = bs();
  const next = resolveDragonCard(s, { type: 'roar', id: 'd6' }, {});
  assert.equal(next.dragon.roarDebuffActiveForRound, s.round + 1);
});

test('dragon.charge: moves dragon 2 cells in direction, deals 2 to path+destination players', () => {
  const s = bs({
    board: [
      [null, null, null, null, null],
      [null, null, 'dragon', 'P1', 'P2'],
      [null, null, null, null, null],
    ],
    players: [ ...bs().players ].map((p) =>
      p.id === 'P1' ? { ...p, position: { r: 1, c: 3 } } :
      p.id === 'P2' ? { ...p, position: { r: 1, c: 4 } } : p),
  });
  const next = resolveDragonCard(s, { type: 'charge', id: 'd7' }, { direction: 'E' });
  assert.equal(next.players.find(p=>p.id==='P1').hp, 1);
  assert.equal(next.players.find(p=>p.id==='P2').hp, 2);
  assert.equal(next.players.find(p=>p.id==='P1').isEliminated, true);
  assert.equal(next.dragon.position.r, 1);
  assert.equal(next.dragon.position.c, 4);
});

test('dragon.mark: placement adds marked cell with resolvesOnRound = round+1', () => {
  const s = bs();
  const next = resolveDragonCard(s, { type: 'mark', id: 'd8' }, { markCell: { r: 0, c: 3 } });
  assert.equal(next.dragon.markedCells.length, 1);
  assert.equal(next.dragon.markedCells[0].resolvesOnRound, s.round + 1);
});

test('dragon.frenzy: every surviving player takes 1', () => {
  const s = bs();
  const next = resolveDragonCard(s, { type: 'frenzy', id: 'd9' }, {});
  for (const p of next.players) assert.equal(p.hp, p.maxHp - 1);
});

test('dragon.reposition: teleports dragon to center (1,2)', () => {
  const s = bs({
    dragon: { ...bs().dragon, position: { r: 0, c: 0 } },
    board: [
      ['dragon', null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
    ],
    players: bs().players.map(p => ({ ...p, position: { r: 2, c: 0 } })),
  });
  const next = resolveDragonCard(s, { type: 'reposition', id: 'dA' }, {});
  assert.equal(next.dragon.position.r, 1);
  assert.equal(next.dragon.position.c, 2);
  assert.equal(next.board[1][2], 'dragon');
  assert.equal(next.board[0][0], null);
});
