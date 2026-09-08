function layer() {
  return typeof window !== 'undefined' ? window.GameAudioLayer : null;
}

export function initAudio() {
  const gal = layer();
  if (gal && typeof gal.init === 'function') {
    try { gal.init(); } catch { /* ignore init errors */ }
  }
}

export function toggleMute() {
  const gal = layer();
  if (!gal || typeof gal.getState !== 'function' || typeof gal.setMuted !== 'function') return false;
  try {
    const current = gal.getState();
    const muted = !(current && current.muted);
    gal.setMuted(muted);
    return muted;
  } catch { return false; }
}

export function isMuted() {
  const gal = layer();
  if (!gal || typeof gal.getState !== 'function') return false;
  try { const current = gal.getState(); return !!(current && current.muted); } catch { return false; }
}

function play(cue) {
  const gal = layer();
  if (!gal || typeof gal.play !== 'function') return;
  try { gal.play(cue); } catch { /* ignore audio errors */ }
}

export function sfxAttack() { play('action_primary'); }
export function sfxHeal() { play('recovery'); }
export function sfxDragonAttack() { play('danger_warning'); }
export function sfxPhaseTransition() { play('transition'); }
export function sfxCardDraw() { play('ui_click'); }
export function sfxCardPlay() { play('action_primary'); }
export function sfxVictory() { play('result_success'); }
export function sfxDefeat() { play('result_failure'); }
export function sfxClick() { play('ui_click'); }
export function sfxMove() { play('action_primary'); }
