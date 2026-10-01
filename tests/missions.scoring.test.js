import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS, evaluateMission, scoreMatch } from '../js/missions.js';

const mk = (overrides) => ({
  id: 'X', race: 'human', hp: 3, maxHp: 3, isEliminated: false,
  dragonDamageDealt: 0,
  missionProgress: {}, ...overrides,
});
const byId = (id) => MISSIONS.find((m) => m.id === id);

test('eval: common-attack-5 complete at attackCount >= 5', () => {
  const p = mk({ missionProgress: { attackCount: 5 } });
  assert.equal(evaluateMission(byId('common-attack-5'), p, {}, 'dragon-dead'), true);
  p.missionProgress.attackCount = 4;
  assert.equal(evaluateMission(byId('common-attack-5'), p, {}, 'dragon-dead'), false);
});

test('eval: common-move-10 complete at moveCellsCumulative >= 10', () => {
  assert.equal(evaluateMission(byId('common-move-10'), mk({ missionProgress: { moveCellsCumulative: 10 } }), {}, 'x'), true);
});

test('eval: human-kill-dragon requires killedDragon flag', () => {
  assert.equal(evaluateMission(byId('human-kill-dragon'), mk({ missionProgress: { killedDragon: true } }), {}, 'dragon-dead'), true);
});

test('eval: human-all-survive requires no eliminations and dragon-dead', () => {
  const state = { players: [{ isEliminated: false }, { isEliminated: false }] };
  assert.equal(evaluateMission(byId('human-all-survive'), mk(), state, 'dragon-dead'), true);
  const state2 = { players: [{ isEliminated: true }, { isEliminated: false }] };
  assert.equal(evaluateMission(byId('human-all-survive'), mk(), state2, 'dragon-dead'), false);
});

test('eval: orc-dragon-wins requires party-wipe', () => {
  assert.equal(evaluateMission(byId('orc-dragon-wins'), mk({ isEliminated: true }), {}, 'party-wipe'), true);
  assert.equal(evaluateMission(byId('orc-dragon-wins'), mk({ isEliminated: true }), {}, 'dragon-dead'), false);
});

test('eval: orc-kill-all-elves requires all elf players eliminated', () => {
  const state = { players: [
    { race: 'elf', isEliminated: true }, { race: 'elf', isEliminated: true }, { race: 'orc', isEliminated: false },
  ] };
  assert.equal(evaluateMission(byId('orc-kill-all-elves'), mk({ race: 'orc' }), state, 'dragon-dead'), true);
  state.players[0].isEliminated = false;
  assert.equal(evaluateMission(byId('orc-kill-all-elves'), mk({ race: 'orc' }), state, 'dragon-dead'), false);
});

test('eval: dwarf-phase3 requires dragon reached phase 3 (tracked)', () => {
  const state = { dragon: { reachedPhase3: true } };
  assert.equal(evaluateMission(byId('dwarf-phase3'), mk({ race: 'dwarf' }), state, 'x'), true);
});

test('scoreMatch: sums completed missions + finisher + survival', () => {
  const state = { players: [
    { id: 'A', race: 'human', hp: 3, maxHp: 3, isEliminated: false,
      dragonDamageDealt: 3,
      missions: { required: byId('common-attack-5'), optional: byId('common-move-10') },
      missionProgress: { attackCount: 5, moveCellsCumulative: 10 } },
    { id: 'B', race: 'orc', hp: 0, maxHp: 3, isEliminated: true,
      dragonDamageDealt: 7,
      missions: { required: byId('orc-attack-6'), optional: byId('common-attack-5') },
      missionProgress: { attackCount: 6 } },
  ], dragon: { reachedPhase3: true } };
  const scores = scoreMatch(state, 'dragon-dead', 'B');
  // A: common-attack-5 (2) + common-move-10 (2) + survive (1) = 5
  // B: orc-attack-6 (2) + common-attack-5 (2) + finisher (3) = 7
  assert.equal(scores.find(s => s.playerId === 'A').total, 5);
  assert.equal(scores.find(s => s.playerId === 'B').total, 7);
});
