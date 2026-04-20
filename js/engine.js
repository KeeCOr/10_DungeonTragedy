import { createRng } from './rng.js';

function roundRng(state) {
  // Distinct RNG per (seed, match, round) — keeps inter-round rolls independent.
  return createRng((state.seed + 1) * 1000003 + state.matchIndex * 9973 + state.round * 31);
}

export function rollTurnOrder(state) {
  const rng = roundRng(state);
  const candidates = [
    { id: 'dragon', roll: rng.roll(6) },
    ...state.players
      .filter((p) => !p.isEliminated)
      .map((p) => ({ id: p.id, roll: rng.roll(6) })),
  ];
  // Break ties by redrawing until unique ordering.
  candidates.sort((a, b) => b.roll - a.roll || rng.roll(1000) - rng.roll(1000));
  return {
    ...state,
    turnOrder: candidates.map((x) => x.id),
    currentTurnIndex: 0,
    phase: 'acting',
  };
}
