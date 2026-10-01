import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRAGON_TYPES, evaluateDragonEncounterTrial, getDragonFirstEncounterBrief, pickDragonType } from '../js/dragons.js';
import { createInitialState, startMatch } from '../js/state.js';

const players = [
  { id: 'P0', name: 'You', isAI: false },
  { id: 'P1', name: 'Ally1', isAI: true },
  { id: 'P2', name: 'Ally2', isAI: true },
];

test('first encounter brief teaches role and favorable battlefield response', () => {
  const brief = getDragonFirstEncounterBrief('storm');
  assert.equal(brief.role, 'tempo attacker');
  assert.match(brief.arena, /consecutive patterns/);
  assert.match(brief.trial, /two revealed cards/);
  assert.equal(brief.roleKo, '연속 패턴 압박자');
  assert.match(brief.arenaKo, /연속 공격/);
  assert.match(brief.trialKo, /공개 카드 2장/);
});

test('every dragon has player-facing first encounter guidance', () => {
  for (const dragon of DRAGON_TYPES) {
    const brief = getDragonFirstEncounterBrief(dragon.id);
    assert.ok(brief.roleKo);
    assert.ok(brief.arenaKo);
    assert.ok(brief.trialKo);
  }
});

test('dragons: defines five encounter dragon types', () => {
  assert.equal(DRAGON_TYPES.length, 5);
  assert.deepEqual(DRAGON_TYPES.map((d) => d.id), ['fire', 'ice', 'venom', 'storm', 'gold']);
  for (const dragon of DRAGON_TYPES) {
    assert.ok(dragon.name);
    assert.equal(dragon.maxHp, 12);
    assert.ok(dragon.atlasClass);
    assert.ok(dragon.gimmick);
  }
});

test('dragons: random picker is deterministic from seed and match index', () => {
  assert.deepEqual(pickDragonType(1234, 0), pickDragonType(1234, 0));
  assert.ok(DRAGON_TYPES.some((d) => d.id === pickDragonType(1234, 2).id));
});

test('state: createInitialState stores voted target dragon kills', () => {
  const s = createInitialState({ seed: 7, players, targetDragonKills: 4 });
  assert.equal(s.targetDragonKills, 4);
  assert.equal(s.dragonKills, 0);
  assert.deepEqual(s.matchScores, [[], [], [], []]);
});

test('state: startMatch selects one of five random dragon types', () => {
  const s = startMatch(createInitialState({ seed: 42, players, targetDragonKills: 5 }));
  assert.ok(DRAGON_TYPES.some((d) => d.id === s.dragon.type));
  assert.ok(s.dragon.name);
  assert.ok(s.dragon.atlasClass);
  assert.equal(s.dragon.maxHp, 12);
});

function trialState(type, overrides = {}) {
  return {
    dragon: { type, hp: 12, maxHp: 12, shield: type === 'gold' ? 2 : 0, lastResolvedCount: 0, ...overrides.dragon },
    players: [{ id: 'P0', name: 'You', isAI: false, isEliminated: false, missionProgress: { damageTaken: 0 }, ...overrides.player }],
  };
}

test('encounter trials explain fire survival and ice or venom avoidance', () => {
  const fire = evaluateDragonEncounterTrial(trialState('fire', { player: { missionProgress: { damageTaken: 3 } } }));
  assert.equal(fire.passed, true);
  assert.match(fire.evidence, /피해 3/);

  assert.equal(evaluateDragonEncounterTrial(trialState('ice')).passed, true);
  assert.equal(evaluateDragonEncounterTrial(trialState('venom', { player: { missionProgress: { damageTaken: 1 } } })).passed, false);
});

test('encounter trials verify storm sequence and gold shield order', () => {
  const storm = evaluateDragonEncounterTrial(trialState('storm', { dragon: { lastResolvedCount: 2 } }));
  assert.equal(storm.passed, true);
  assert.match(storm.next, /두 번째 패턴/);

  const gold = evaluateDragonEncounterTrial(trialState('gold', { dragon: { shield: 0, hp: 9 } }));
  assert.equal(gold.passed, true);
  assert.match(gold.evidence, /보호막/);
});

test('encounter trial returns a recovery message when state is incomplete', () => {
  const result = evaluateDragonEncounterTrial({ players: [] });
  assert.equal(result.passed, false);
  assert.match(result.next, /새 매치/);
});
