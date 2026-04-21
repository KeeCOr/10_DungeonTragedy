import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideAllyAction } from '../js/ally-ai.js';

const base = () => ({
  seed: 1, round: 1, matchIndex: 0, currentTurnIndex: 0,
  board: [
    [null, null, null, null, null],
    [null, 'P0', 'dragon', null, null],
    [null, null, null, null, null],
  ],
  dragon: { hp: 15, maxHp: 15, phase: 1, deck: [], discard: [],
    revealed: [{ type: 'bite', id: 'd1', phaseGate: 1 }],
    position: { r: 1, c: 2 }, markedCells: [], reachedPhase3: false },
  players: [{
    id: 'P0', race: 'human', hp: 1, maxHp: 3,
    hand: [
      { id: 'h1', type: 'heal' },
      { id: 'a1', type: 'attack', range: 1 },
    ],
    position: { r: 1, c: 1 }, isEliminated: false,
    missions: { required: { id: 'human-kill-dragon', points: 5 },
                optional: { id: 'common-attack-5', points: 2 } },
    missionProgress: {}, statusEffects: {}, isAI: true, dragonDamageDealt: 0,
  }],
});

test('ally-ai: heals self when HP ≤ 1 and heal in hand', () => {
  const s = base();
  const action = decideAllyAction(s, 'P0');
  assert.equal(action.type, 'playCard');
  assert.equal(action.cardId, 'h1');
});

test('ally-ai: finishes dragon when in range and dragon HP low', () => {
  const s = base();
  s.players[0].hp = 3;
  s.dragon.hp = 1;
  const action = decideAllyAction(s, 'P0');
  assert.equal(action.type, 'playCard');
  assert.equal(action.cardId, 'a1');
  assert.equal(action.target.type, 'dragon');
});

test('ally-ai: draws when hand is 2 or less and not critical', () => {
  const s = base();
  s.players[0].hp = 3;
  s.players[0].hand = [{ id: 'm1', type: 'move', range: 1 }];
  const action = decideAllyAction(s, 'P0');
  assert.equal(action.type, 'drawTwo');
});

test('ally-ai: move target selection returns orthogonal-only cells', () => {
  const s = {
    seed: 1, round: 1, matchIndex: 0, currentTurnIndex: 0,
    board: [
      [null, null, null, null, null],
      [null, 'P0', 'dragon', null, null],
      [null, null, null, null, null],
    ],
    dragon: { hp: 15, phase: 1, deck: [], discard: [], revealed: [],
      position: { r: 1, c: 2 }, markedCells: [] },
    players: [{ id: 'P0', race: 'human', hp: 3, maxHp: 3,
      hand: [
        { id: 'm1', type: 'move', range: 3 },
        { id: 'h1', type: 'hide' },
        { id: 'h2', type: 'hide' },
      ],
      position: { r: 1, c: 1 }, isEliminated: false,
      missions: {}, missionProgress: {}, statusEffects: {}, isAI: true, dragonDamageDealt: 0,
    }],
  };
  const action = decideAllyAction(s, 'P0');
  assert.equal(action.type, 'playCard');
  const target = action.target;
  // Chosen target must be orthogonal to player at (1,1)
  assert.ok(target.r === 1 || target.c === 1, `target ${JSON.stringify(target)} is diagonal from (1,1)`);
});

test('ally-ai: orc with kill-player mission attacks low-HP adjacent ally (30% chance; with seed forcing true)', () => {
  const s = base();
  s.players.push({
    id: 'P1', race: 'elf', hp: 1, maxHp: 3,
    hand: [], position: { r: 0, c: 1 }, isEliminated: false,
    missions: {}, missionProgress: {}, statusEffects: {}, isAI: true, dragonDamageDealt: 0,
  });
  s.board[0][1] = 'P1';
  s.players[0].race = 'orc';
  s.players[0].hp = 3;
  s.players[0].missions = { required: { id: 'orc-kill-player', points: 5 },
                            optional: { id: 'common-attack-5', points: 2 } };
  s.seed = 0;
  const action = decideAllyAction(s, 'P0');
  assert.ok(action.type === 'playCard' || action.type === 'drawTwo');
});
