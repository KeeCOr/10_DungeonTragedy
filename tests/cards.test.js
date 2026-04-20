import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/rng.js';
import { buildPlayerDeck, drawFromDeck, TREASURES } from '../js/cards.js';

test('cards: player deck has 40 cards', () => {
  const deck = buildPlayerDeck();
  assert.equal(deck.length, 40);
});

test('cards: player deck composition matches spec', () => {
  const deck = buildPlayerDeck();
  const count = (fn) => deck.filter(fn).length;
  assert.equal(count(c => c.type === 'move' && c.range === 1), 6);
  assert.equal(count(c => c.type === 'move' && c.range === 2), 4);
  assert.equal(count(c => c.type === 'move' && c.range === 3), 2);
  assert.equal(count(c => c.type === 'attack' && c.range === 1), 6);
  assert.equal(count(c => c.type === 'attack' && c.range === 2), 4);
  assert.equal(count(c => c.type === 'attack' && c.range === 3), 2);
  assert.equal(count(c => c.type === 'hide'), 4);
  assert.equal(count(c => c.type === 'heal'), 3);
  assert.equal(count(c => c.type === 'scout'), 2);
  assert.equal(count(c => c.type === 'taunt'), 2);
  assert.equal(count(c => c.type === 'treasure'), 5);
});

test('cards: every card has unique id', () => {
  const deck = buildPlayerDeck();
  const ids = new Set(deck.map(c => c.id));
  assert.equal(ids.size, deck.length);
});

test('cards: treasures are the 5 spec treasures', () => {
  const deck = buildPlayerDeck();
  const ts = deck.filter(c => c.type === 'treasure').map(c => c.treasure).sort();
  assert.deepEqual(ts, ['cloak', 'potion', 'rune', 'shield', 'sword']);
});

test('cards: drawFromDeck draws from top and reshuffles discard when empty', () => {
  const rng = createRng(1);
  const deck = ['a', 'b'];
  const discard = ['c', 'd'];
  const { drawn, deck: d1, discard: disc1 } = drawFromDeck(deck, discard, rng);
  assert.equal(drawn, 'a');
  assert.deepEqual(d1, ['b']);
  assert.deepEqual(disc1, ['c', 'd']);

  const step2 = drawFromDeck(d1, disc1, rng);
  const step3 = drawFromDeck(step2.deck, step2.discard, rng);
  // deck now empty, discard reshuffled
  assert.equal(step3.deck.length + 1, 2);
  assert.equal(step3.discard.length, 0);
  assert.ok(['c', 'd'].includes(step3.drawn));
});

test('cards: drawFromDeck returns null when both empty', () => {
  const rng = createRng(1);
  const res = drawFromDeck([], [], rng);
  assert.equal(res.drawn, null);
  assert.deepEqual(res.deck, []);
  assert.deepEqual(res.discard, []);
});

test('cards: TREASURES list matches expected', () => {
  assert.deepEqual(TREASURES.slice().sort(), ['cloak', 'potion', 'rune', 'shield', 'sword']);
});
