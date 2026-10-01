import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRAGON_TIMING_TUTORIAL_SCENARIOS } from '../js/tutorial-scenarios.js';

test('timing tutorial scenarios cover early, delayed, and missed dragon activation', () => {
  assert.deepEqual(DRAGON_TIMING_TUTORIAL_SCENARIOS.map((s) => s.id), [
    'dragon-timing-early',
    'dragon-timing-delayed',
    'dragon-timing-missed',
  ]);
});

test('timing tutorial scenarios are data-driven and testable', () => {
  for (const scenario of DRAGON_TIMING_TUTORIAL_SCENARIOS) {
    assert.equal(scenario.focus, 'dragon-activation-timing');
    assert.ok(Number.isInteger(scenario.seed));
    assert.ok(scenario.initialDragonCard?.type);
    assert.ok(scenario.expectedPreview.totalExpectedDamage >= 0);
    assert.ok(scenario.expectedSummary.totalDamageDealt >= 0);
    assert.ok(scenario.lesson.length > 20);
  }
});

test('timing tutorial scenarios distinguish timing outcomes', () => {
  const byId = Object.fromEntries(DRAGON_TIMING_TUTORIAL_SCENARIOS.map((s) => [s.id, s]));
  assert.equal(byId['dragon-timing-early'].timing, 'early');
  assert.equal(byId['dragon-timing-delayed'].timing, 'delayed');
  assert.equal(byId['dragon-timing-missed'].timing, 'missed');
  assert.ok(byId['dragon-timing-early'].expectedSummary.totalDamageDealt < byId['dragon-timing-missed'].expectedSummary.totalDamageDealt);
});
