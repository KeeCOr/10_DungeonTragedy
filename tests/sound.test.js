import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sfxAttack, sfxHeal, sfxDragonAttack, sfxCardDraw, sfxCardPlay,
  sfxPhaseTransition, sfxVictory, sfxDefeat, sfxClick, sfxMove,
} from '../js/sound.js';

function fakeLayer() {
  const calls = [];
  return {
    calls,
    play(cue) { calls.push(cue); },
    getState() { return { bgmMuted: false, sfxMuted: false }; },
    setMuted() {},
    init() {},
  };
}

test('sound.js bridges each semantic event to exactly one GameAudioLayer cue', () => {
  const gal = fakeLayer();
  globalThis.window = { GameAudioLayer: gal };

  sfxClick();
  assert.deepEqual(gal.calls, ['ui_click'], 'click/ui maps to ui_click');

  gal.calls.length = 0;
  sfxMove();
  assert.deepEqual(gal.calls, ['action_primary'], 'move maps to action_primary');

  gal.calls.length = 0;
  sfxAttack();
  assert.deepEqual(gal.calls, ['action_primary'], 'primary attack maps to action_primary');

  gal.calls.length = 0;
  sfxCardPlay();
  assert.deepEqual(gal.calls, ['action_primary'], 'card action maps to action_primary');

  gal.calls.length = 0;
  sfxCardDraw();
  assert.deepEqual(gal.calls, ['ui_click'], 'card draw is a ui interaction, not a procedural cue');

  gal.calls.length = 0;
  sfxDragonAttack();
  assert.deepEqual(gal.calls, ['danger_warning'], 'dragon warning/critical maps to danger_warning only, no duplicate action_primary');

  gal.calls.length = 0;
  sfxPhaseTransition();
  assert.deepEqual(gal.calls, ['transition'], 'screen/turn/stage transition maps to transition');

  gal.calls.length = 0;
  sfxHeal();
  assert.deepEqual(gal.calls, ['recovery'], 'heal maps to recovery, never result_success');

  gal.calls.length = 0;
  sfxVictory();
  assert.deepEqual(gal.calls, ['result_success'], 'victory maps to result_success');

  gal.calls.length = 0;
  sfxDefeat();
  assert.deepEqual(gal.calls, ['result_failure'], 'defeat maps to result_failure');

  delete globalThis.window;
});
