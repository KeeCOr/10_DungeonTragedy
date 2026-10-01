// Minimal Web Audio sound effects — no external files needed.
let ctx = null;
let muted = false;

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

export function toggleMute() { muted = !muted; return muted; }
export function isMuted() { return muted; }

function play(fn) {
  if (muted) return;
  try { fn(getCtx()); } catch { /* ignore audio errors */ }
}

export function sfxAttack() {
  play((ac) => {
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

export function sfxHeal() {
  play((ac) => {
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
  play((ac) => {
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
  play((ac) => {
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

export function sfxCardDraw() {
  play((ac) => {
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

export function sfxCardPlay() {
  play((ac) => {
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

export function sfxVictory() {
  play((ac) => {
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

export function sfxDefeat() {
  play((ac) => {
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

export function sfxClick() {
  play((ac) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine'; o.frequency.value = 1000;
    g.gain.setValueAtTime(0.04, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.05);
  });
}

export function sfxMove() {
  play((ac) => {
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
