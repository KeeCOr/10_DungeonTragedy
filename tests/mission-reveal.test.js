import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mainSource = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');

test('main: start flow shows mission reveal before play continues', () => {
  assert.match(mainSource, /function showMissionReveal/);
  assert.match(mainSource, /await showMissionReveal\(state\)/);
  assert.match(mainSource, /mission-reveal-overlay/);
  assert.match(mainSource, /mission-reveal-win/);
  assert.match(mainSource, /getDragonFirstEncounterBrief/);
  assert.match(mainSource, /dragon-encounter-brief/);
  assert.match(mainSource, /dt-dragon-seen-/);
});

test('main: each new match repeats mission reveal and dragon tactics briefing', () => {
  const revealCalls = mainSource.match(/await showMissionReveal\(state\)/g) ?? [];
  assert.equal(revealCalls.length, 2);
  assert.match(mainSource, /유리한 전장 대응/);
  assert.match(mainSource, /첫 조우 과제/);
});

test('main: start flow asks players to vote target dragon kills', () => {
  assert.match(mainSource, /function showDragonVote/);
  assert.match(mainSource, /targetDragonKills/);
  assert.match(mainSource, /data-kills/);
});
