import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RACES, getRace, baseMaxHp, attackDamageBonus, attackRangeBonus } from '../js/races.js';

test('races: four defined', () => {
  assert.deepEqual(Object.keys(RACES).sort(), ['dwarf', 'elf', 'human', 'orc']);
});

test('races: dwarf max HP is 6, others 5', () => {
  assert.equal(baseMaxHp('dwarf'), 6);
  assert.equal(baseMaxHp('human'), 5);
  assert.equal(baseMaxHp('elf'), 5);
  assert.equal(baseMaxHp('orc'), 5);
});

test('races: orc adds +1 attack damage', () => {
  assert.equal(attackDamageBonus('orc'), 1);
  assert.equal(attackDamageBonus('human'), 0);
});

test('races: elf adds +1 attack range', () => {
  assert.equal(attackRangeBonus('elf'), 1);
  assert.equal(attackRangeBonus('human'), 0);
});

test('races: getRace returns definition object', () => {
  const h = getRace('human');
  assert.ok(h);
  assert.equal(h.id, 'human');
  assert.ok(h.name);
});
