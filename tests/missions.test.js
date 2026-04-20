import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/rng.js';
import { MISSIONS, eligibleMissions, assignMissions } from '../js/missions.js';

test('missions: each mission has id, description, points, ownership, constraints', () => {
  for (const m of MISSIONS) {
    assert.ok(m.id);
    assert.ok(typeof m.description === 'string');
    assert.ok(Number.isInteger(m.points) && m.points > 0);
    assert.ok(['common', 'human', 'elf', 'dwarf', 'orc'].includes(m.ownership));
    assert.ok([true, false].includes(m.requiredOnly ?? false));
  }
});

test('missions: common pool has 7 entries', () => {
  assert.equal(MISSIONS.filter(m => m.ownership === 'common').length, 7);
});

test('missions: orc pool has 8 entries', () => {
  assert.equal(MISSIONS.filter(m => m.ownership === 'orc').length, 8);
});

test('missions: eligibleMissions removes race-targeting missions when target absent', () => {
  const racesPresent = new Set(['orc', 'human']);
  const pool = eligibleMissions('orc', racesPresent);
  assert.ok(!pool.some(m => m.id === 'orc-kill-all-elves'));
  assert.ok(pool.some(m => m.id === 'orc-kill-all-humans'));
});

test('missions: eligibleMissions includes common + own-race + surviving-target missions', () => {
  const pool = eligibleMissions('human', new Set(['human', 'elf']));
  assert.ok(pool.some(m => m.ownership === 'common'));
  assert.ok(pool.some(m => m.ownership === 'human'));
  assert.ok(!pool.some(m => m.ownership === 'elf'));
});

test('missions: assignMissions returns required + optional, both distinct', () => {
  const rng = createRng(99);
  const racesPresent = new Set(['human', 'elf', 'dwarf', 'orc']);
  const out = assignMissions('orc', racesPresent, rng);
  assert.ok(out.required);
  assert.ok(out.optional);
  assert.notEqual(out.required.id, out.optional.id);
});

test('missions: assignMissions never places requiredOnly mission in optional slot', () => {
  const rng = createRng(123);
  const racesPresent = new Set(['orc']);
  for (let i = 0; i < 50; i++) {
    const out = assignMissions('orc', racesPresent, createRng(i));
    assert.equal(out.optional.requiredOnly ?? false, false);
  }
});
