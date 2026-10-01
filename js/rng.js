// Seeded RNG (mulberry32) — deterministic sequence per seed.
export function createRng(seed) {
  let s = (seed >>> 0) || 1;
  const raw = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const nextInt = (min, max) => Math.floor(raw() * (max - min + 1)) + min;
  return {
    next: raw,
    nextInt,
    roll: (sides) => nextInt(1, sides),
    pick: (arr) => arr[nextInt(0, arr.length - 1)],
    shuffle: (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = nextInt(0, i);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    seed: seed,
  };
}
