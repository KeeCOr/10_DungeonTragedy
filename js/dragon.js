// Dragon card definitions and effect resolvers.
// Dragon is OFF the board grid — all attacks are pattern-based (rows,
// columns, parity) so players can read the telegraphed card and react.

const inBounds = (r, c) => r >= 0 && r < 3 && c >= 0 && c < 5;

function damagePlayer(state, playerId, amount) {
  const newPlayers = state.players.map((p) => ({ ...p, statusEffects: { ...p.statusEffects } }));
  const p = newPlayers.find((x) => x.id === playerId);
  if (!p || p.isEliminated) return state;
  let dmg = amount;
  if (p.statusEffects.shieldActive) {
    p.statusEffects.shieldActive = false;
    p.missionProgress = { ...p.missionProgress,
      treasuresUsed: (p.missionProgress.treasuresUsed ?? 0) + 1 };
    dmg = 0;
  }
  // Hide card: negates 1 damage this round, one-shot.
  if (dmg > 0 && p.statusEffects.hiddenThisRound) {
    p.statusEffects.hiddenThisRound = false;
    dmg = Math.max(0, dmg - 1);
    p.missionProgress = { ...p.missionProgress,
      hideInPlaceCount: (p.missionProgress.hideInPlaceCount ?? 0) + 1 };
  }
  p.hp = Math.max(0, p.hp - dmg);
  p.missionProgress = { ...p.missionProgress,
    damageTaken: (p.missionProgress.damageTaken ?? 0) + dmg };
  let newBoard = state.board;
  if (p.hp === 0) {
    p.isEliminated = true;
    newBoard = state.board.map((r) => r.slice());
    newBoard[p.position.r][p.position.c] = null;
  }
  return { ...state, players: newPlayers, board: newBoard };
}

function affectedCells(card) {
  // Returns an array of {r,c} cells damaged by this card's pattern.
  switch (card.type) {
    case 'row-top': return cellsInRow(0);
    case 'row-mid': return cellsInRow(1);
    case 'row-bot': return cellsInRow(2);
    case 'row-odd': return [...cellsInRow(0), ...cellsInRow(2)];
    case 'row-even': return cellsInRow(1);
    case 'col-left': return cellsInCol(0);
    case 'col-midleft': return cellsInCol(1);
    case 'col-mid': return cellsInCol(2);
    case 'col-midright': return cellsInCol(3);
    case 'col-right': return cellsInCol(4);
    case 'all':
    case 'frenzy': {
      const out = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) out.push({ r, c });
      return out;
    }
    case 'corners': return [
      { r: 0, c: 0 }, { r: 0, c: 4 }, { r: 2, c: 0 }, { r: 2, c: 4 },
    ];
    default: return [];
  }
}
function cellsInRow(r) { return [0,1,2,3,4].map((c) => ({ r, c })); }
function cellsInCol(c) { return [0,1,2].map((r) => ({ r, c })); }

function cardDamage(card) {
  switch (card.type) {
    case 'row-odd':  return 1;
    case 'row-even': return 2;
    case 'all':
    case 'frenzy':   return 1;
    case 'corners':  return 2;
    default:         return 2;
  }
}

export function resolveDragonCard(state, card, _decisions) {
  switch (card.type) {
    case 'row-top': case 'row-mid': case 'row-bot':
    case 'row-odd': case 'row-even':
    case 'col-left': case 'col-midleft': case 'col-mid':
    case 'col-midright': case 'col-right':
    case 'all': case 'frenzy': case 'corners':
      return applyPatternCard(state, card);
    case 'rest':  return state; // dragon catches its breath
    case 'roar':  return { ...state, dragon: { ...state.dragon, roarDebuffActiveForRound: state.round + 1 } };
    default: throw new Error(`unknown dragon card ${card.type}`);
  }
}

function applyPatternCard(state, card) {
  const cells = affectedCells(card);
  const dmg = cardDamage(card);
  let s = state;
  for (const cell of cells) {
    if (!inBounds(cell.r, cell.c)) continue;
    const occ = s.board[cell.r][cell.c];
    if (occ && occ !== 'dragon') s = damagePlayer(s, occ, dmg);
  }
  return s;
}

export function getDragonCardPreview(card) {
  // Returns { cells: [{r,c}...], damage, label } for display.
  if (!card) return null;
  if (card.type === 'rest') return { cells: [], damage: 0, label: '휴식' };
  if (card.type === 'roar') return { cells: [], damage: 0, label: '위협 (주사위 -1)' };
  return {
    cells: affectedCells(card),
    damage: cardDamage(card),
    label: DRAGON_LABEL[card.type] ?? card.type,
  };
}

export const DRAGON_LABEL = {
  'row-top':      '상단 행 공격',
  'row-mid':      '중앙 행 공격',
  'row-bot':      '하단 행 공격',
  'row-odd':      '홀수 행 공격',
  'row-even':     '짝수 행 집중 공격',
  'col-left':     '1열 공격',
  'col-midleft':  '2열 공격',
  'col-mid':      '3열 공격',
  'col-midright': '4열 공격',
  'col-right':    '5열 공격',
  'all':          '전체 공격',
  'frenzy':       '광폭 (전체)',
  'corners':      '네 모서리 공격',
  'rest':         '휴식',
  'roar':         '위협',
};

export const DRAGON_CARD_DEFS = [
  // Phase 1: basic patterns
  { type: 'rest',         count: 3, phaseGate: 1 },
  { type: 'row-top',      count: 2, phaseGate: 1 },
  { type: 'row-mid',      count: 2, phaseGate: 1 },
  { type: 'row-bot',      count: 2, phaseGate: 1 },
  { type: 'col-left',     count: 1, phaseGate: 1 },
  { type: 'col-midleft',  count: 1, phaseGate: 1 },
  { type: 'col-mid',      count: 2, phaseGate: 1 },
  { type: 'col-midright', count: 1, phaseGate: 1 },
  { type: 'col-right',    count: 1, phaseGate: 1 },
  { type: 'roar',         count: 2, phaseGate: 1 },
  { type: 'corners',      count: 1, phaseGate: 1 },
  // Phase 2+: broader patterns
  { type: 'row-odd',      count: 2, phaseGate: 2 },
  { type: 'all',          count: 1, phaseGate: 2 },
  // Phase 3: strongest single-row strike
  { type: 'row-even',     count: 1, phaseGate: 3 },
  { type: 'frenzy',       count: 1, phaseGate: 3 },
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
