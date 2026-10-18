// Kenney Interface Sounds CC0 (https://kenney.nl/assets/interface-sounds)
// Kenney Digital Audio CC0 (https://kenney.nl/assets/digital-audio)
// 5 cues use Kenney .ogg samples from assets/audio/kenney/ (Codex copies from 16_PS source).
// All other cues use Web Audio API synthesis only — no external files.
let ctx = null;
let muted = globalThis.GameBgm?.getMuted() ?? false;
const _active = new Set(); // in-flight Audio instances for mute/cleanup

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function resumeOnInteraction() {
  const ac = getCtx();
  if (ac.state === 'suspended') ac.resume();
}

export function initAudio() {
  document.addEventListener('click', resumeOnInteraction, { once: true });
  document.addEventListener('keydown', resumeOnInteraction, { once: true });
}

export function toggleMute() {
  muted = !muted;
  globalThis.GameBgm?.setMuted(muted);
  if (muted) {
    for (const a of _active) {
      try { a.pause(); } catch { /* ignore */ }
    }
    _active.clear();
  }
  return muted;
}
export function isMuted() { return muted; }

function playSynth(fn) {
  if (muted) return;
  try { fn(getCtx()); } catch { /* ignore audio errors */ }
}

// Returns an async cue that plays a Kenney .ogg file.
// On any Audio failure the first call uses synthFn; subsequent calls also use synthFn.
// Muting while a cue is active pauses it via toggleMute; no fallback if muted at rejection.
function makeKenneyCue(filename, synthFn) {
  const src = new URL(`../assets/audio/kenney/${filename}`, import.meta.url).href;
  let failed = false;
  return async function () {
    if (muted) return;
    if (failed) { synthFn(); return; }
    const Ctor = typeof globalThis.Audio !== 'undefined' ? globalThis.Audio : null;
    if (!Ctor) { failed = true; synthFn(); return; }
    let audio;
    try {
      audio = new Ctor(src);
    } catch {
      failed = true; synthFn(); return;
    }
    audio.volume = Math.min(1, Math.max(0, 0.7));
    _active.add(audio);
    try {
      await audio.play();
    } catch {
      _active.delete(audio);
      if (!muted) { failed = true; synthFn(); }
      return;
    }
    // play() resolved = playback started; keep in _active until ended/error
    let onEnded, onError;
    const cleanup = () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      _active.delete(audio);
    };
    onEnded = () => cleanup();
    onError = () => { cleanup(); if (!muted) { failed = true; synthFn(); } };
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
  };
}

// --- Synth bodies for Kenney fallbacks (unchanged from original) ---
function _synthAttack() {
  playSynth((ac) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(220, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.15);
    g.gain.setValueAtTime(0.15, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.2);
  });
}

function _synthCardDraw() {
  playSynth((ac) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(600, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(900, ac.currentTime + 0.08);
    g.gain.setValueAtTime(0.06, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.1);
  });
}

function _synthClick() {
  playSynth((ac) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine'; o.frequency.value = 1000;
    g.gain.setValueAtTime(0.04, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.05);
  });
}

function _synthVictory() {
  playSynth((ac) => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      const t = ac.currentTime + i * 0.15;
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g).connect(ac.destination);
      o.start(t); o.stop(t + 0.3);
    });
  });
}

function _synthDefeat() {
  playSynth((ac) => {
    const notes = [300, 250, 200, 150];
    notes.forEach((freq, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = freq;
      const t = ac.currentTime + i * 0.2;
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g).connect(ac.destination);
      o.start(t); o.stop(t + 0.35);
    });
  });
}

// --- Kenney cue exports (5 cues; synth bodies above are their fallbacks) ---
export const sfxAttack   = makeKenneyCue('hit.ogg',         _synthAttack);
export const sfxCardDraw = makeKenneyCue('card-select.ogg', _synthCardDraw);
export const sfxClick    = makeKenneyCue('ui-click.ogg',    _synthClick);
export const sfxVictory  = makeKenneyCue('stage-clear.ogg', _synthVictory);
export const sfxDefeat   = makeKenneyCue('failure.ogg',     _synthDefeat);

// --- Pure synth cues (unchanged) ---
export function sfxHeal() {
  playSynth((ac) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(400, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(800, ac.currentTime + 0.25);
    g.gain.setValueAtTime(0.1, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.3);
  });
}

export function sfxDragonAttack() {
  playSynth((ac) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(100, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.35);
    g.gain.setValueAtTime(0.12, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.4);
  });
}

export function sfxPhaseTransition() {
  playSynth((ac) => {
    const o1 = ac.createOscillator();
    const o2 = ac.createOscillator();
    const g = ac.createGain();
    o1.type = 'sawtooth'; o1.frequency.setValueAtTime(80, ac.currentTime);
    o1.frequency.exponentialRampToValueAtTime(300, ac.currentTime + 0.5);
    o2.type = 'square'; o2.frequency.setValueAtTime(60, ac.currentTime);
    o2.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.5);
    g.gain.setValueAtTime(0.1, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.7);
    o1.connect(g); o2.connect(g); g.connect(ac.destination);
    o1.start(); o2.start(); o1.stop(ac.currentTime + 0.7); o2.stop(ac.currentTime + 0.7);
  });
}

export function sfxCardPlay() {
  playSynth((ac) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(500, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(300, ac.currentTime + 0.1);
    g.gain.setValueAtTime(0.08, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.12);
  });
}

export function sfxMove() {
  playSynth((ac) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(300, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(500, ac.currentTime + 0.1);
    g.gain.setValueAtTime(0.06, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.12);
  });
}

// --- Test helpers (not used by game code) ---
export function _resetForTests() { muted = false; _active.clear(); }
export const _makeTestCue = makeKenneyCue;
