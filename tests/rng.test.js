import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/rng.js';

test('rng: same seed produces same sequence', () => {
  const a = createRng(42);
  const b = createRng(42);
  const seqA = Array.from({ length: 5 }, () => a.next());
  const seqB = Array.from({ length: 5 }, () => b.next());
  assert.deepEqual(seqA, seqB);
});

test('rng: different seeds produce different sequences', () => {
  const a = createRng(1);
  const b = createRng(2);
  assert.notEqual(a.next(), b.next());
});

test('rng: nextInt returns within [min, max] inclusive', () => {
  const r = createRng(1);
  for (let i = 0; i < 1000; i++) {
    const v = r.nextInt(1, 6);
    assert.ok(v >= 1 && v <= 6, `out of range: ${v}`);
  }
});

test('rng: roll(d6) returns 1..6', () => {
  const r = createRng(1);
  for (let i = 0; i < 100; i++) {
    const v = r.roll(6);
    assert.ok(v >= 1 && v <= 6);
  }
});

test('rng: pick returns element from non-empty array', () => {
  const r = createRng(5);
  const arr = ['a', 'b', 'c'];
  const picked = r.pick(arr);
  assert.ok(arr.includes(picked));
});

test('rng: shuffle produces permutation', () => {
  const r = createRng(7);
  const arr = [1, 2, 3, 4, 5];
  const out = r.shuffle(arr);
  assert.equal(out.length, arr.length);
  assert.deepEqual([...out].sort(), [...arr].sort());
});
