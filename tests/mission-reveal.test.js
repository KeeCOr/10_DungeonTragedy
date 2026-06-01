import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mainSource = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');

test('main: start flow shows mission reveal before play continues', () => {
  assert.match(mainSource, /function showMissionReveal/);
  assert.match(mainSource, /await showMissionReveal\(state\)/);
  assert.match(mainSource, /mission-reveal-overlay/);
  assert.match(mainSource, /mission-reveal-win/);
});

test('main: start flow asks players to vote target dragon kills', () => {
  assert.match(mainSource, /function showDragonVote/);
  assert.match(mainSource, /targetDragonKills/);
  assert.match(mainSource, /data-kills/);
});
