// Dragon card definitions per spec section 4.
// phaseGate: card only available when dragon.phase >= gate.
export const DRAGON_CARD_DEFS = [
  { type: 'bite',       count: 2, phaseGate: 1 },
  { type: 'breath',     count: 4, phaseGate: 1 },
  { type: 'tail',       count: 3, phaseGate: 1 },
  { type: 'wings',      count: 2, phaseGate: 1 },
  { type: 'roar',       count: 2, phaseGate: 1 },
  { type: 'piercing',   count: 2, phaseGate: 1 },
  { type: 'charge',     count: 2, phaseGate: 1 },
  { type: 'mark',       count: 2, phaseGate: 1 },
  { type: 'frenzy',     count: 2, phaseGate: 2 },
  { type: 'reposition', count: 1, phaseGate: 3 },
];

let _did = 0;
export function buildDragonCards(forPhase) {
  _did = 0;
  const out = [];
  for (const def of DRAGON_CARD_DEFS) {
    if (def.phaseGate > forPhase) continue;
    for (let i = 0; i < def.count; i++) {
      out.push({ id: `d-${def.type}-${_did++}`, type: def.type, phaseGate: def.phaseGate });
    }
  }
  return out;
}
