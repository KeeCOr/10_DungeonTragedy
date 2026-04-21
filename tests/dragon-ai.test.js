import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideDragonAction } from '../js/dragon-ai.js';

const base = () => ({
  seed: 1, round: 1, matchIndex: 0,
  board: [
    [null, 'P0', null, 'P1', null],
    [null, null, 'dragon', null, null],
    [null, null, 'P2', null, null],
  ],
  dragon: { hp: 10, phase: 2, deck: [], discard: [], revealed: [],
    position: { r: 1, c: 2 }, markedCells: [] },
  players: [
    { id: 'P0', race: 'human', hp: 3, hand: [{},{},{},{}], position: { r: 0, c: 1 }, isEliminated: false, statusEffects: {} },
    { id: 'P1', race: 'elf', hp: 3, hand: [{},{}], position: { r: 0, c: 3 }, isEliminated: false, statusEffects: {} },
    { id: 'P2', race: 'dwarf', hp: 4, hand: [{}], position: { r: 2, c: 2 }, isEliminated: false, statusEffects: {} },
  ],
});

test('dragon-ai: bite targets most-hand adjacent player', () => {
  const s = base();
  const decisions = decideDragonAction(s, { type: 'bite' });
  assert.equal(decisions.targetId, 'P2');
});

test('dragon-ai: breath on row/col picks most-hand valid target', () => {
  const s = base();
  const decisions = decideDragonAction(s, { type: 'breath' });
  assert.equal(decisions.targetId, 'P2');
});

test('dragon-ai: taunt forces target regardless of hand count', () => {
  const s = base();
  s.players[1].statusEffects.tauntThisRound = true;
  s.players[1].position = { r: 1, c: 3 };
  s.board = [
    [null, 'P0', null, null, null],
    [null, null, 'dragon', 'P1', null],
    [null, null, 'P2', null, null],
  ];
  const decisions = decideDragonAction(s, { type: 'bite' });
  assert.equal(decisions.targetId, 'P1');
});

test('dragon-ai: piercing chooses axis with most eligible players', () => {
  const s = base();
  s.board = [
    [null, null, null, null, null],
    ['P0','P1','dragon','P2',null],
    [null, null, null, null, null],
  ];
  s.players = s.players.map(p =>
    p.id === 'P0' ? { ...p, position: { r: 1, c: 0 } } :
    p.id === 'P1' ? { ...p, position: { r: 1, c: 1 } } :
    p.id === 'P2' ? { ...p, position: { r: 1, c: 3 } } : p);
  const decisions = decideDragonAction(s, { type: 'piercing' });
  assert.equal(decisions.axis, 'row');
});

test('dragon-ai: charge direction picks one with most damage', () => {
  const s = base();
  s.board = [
    [null, null, null, null, null],
    [null, null, 'dragon', 'P1', 'P2'],
    [null, null, null, null, null],
  ];
  s.players = s.players.map(p =>
    p.id === 'P1' ? { ...p, position: { r: 1, c: 3 } } :
    p.id === 'P2' ? { ...p, position: { r: 1, c: 4 } } : p);
  const decisions = decideDragonAction(s, { type: 'charge' });
  assert.equal(decisions.direction, 'E');
});

test('dragon-ai: mark chooses occupied cell adjacent to most players', () => {
  const s = base();
  const decisions = decideDragonAction(s, { type: 'mark' });
  assert.ok(decisions.markCell);
  const { r, c } = decisions.markCell;
  assert.ok(r >= 0 && r < 3 && c >= 0 && c < 5);
});
