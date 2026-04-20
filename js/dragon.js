// Dragon card definitions per spec section 4.
// phaseGate: card only available when dragon.phase >= gate.
import { createRng } from './rng.js';

const manhattan = (a,b) => Math.abs(a.r-b.r)+Math.abs(a.c-b.c);
const inBounds = (r,c) => r>=0 && r<3 && c>=0 && c<5;

function damagePlayer(state, playerId, amount, attribution = 'dragon') {
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

function pushPlayer(state, playerId, dir) {
  const p = state.players.find((x) => x.id === playerId);
  const tr = p.position.r + dir.dr;
  const tc = p.position.c + dir.dc;
  if (!inBounds(tr, tc) || state.board[tr][tc] !== null) return state;
  const newPlayers = state.players.map((x) => x.id === playerId ? { ...x, position: { r: tr, c: tc } } : x);
  const newBoard = state.board.map((row) => row.slice());
  newBoard[p.position.r][p.position.c] = null;
  newBoard[tr][tc] = p.id;
  return { ...state, players: newPlayers, board: newBoard };
}

export function resolveDragonCard(state, card, decisions) {
  switch (card.type) {
    case 'bite':       return dragonBite(state, decisions);
    case 'breath':     return dragonBreath(state, decisions);
    case 'tail':       return dragonTail(state);
    case 'wings':      return dragonWings(state);
    case 'roar':       return { ...state, dragon: { ...state.dragon, roarDebuffActiveForRound: state.round + 1 } };
    case 'piercing':   return dragonPiercing(state, decisions);
    case 'charge':     return dragonCharge(state, decisions);
    case 'mark':       return dragonMark(state, decisions);
    case 'frenzy':     return dragonFrenzy(state);
    case 'reposition': return dragonReposition(state);
    default: throw new Error(`unknown dragon card ${card.type}`);
  }
}

function dragonBite(state, { targetId }) {
  return damagePlayer(state, targetId, 1);
}

function dragonBreath(state, { targetId }) {
  const target = state.players.find((p) => p.id === targetId);
  if (!target) return state;
  const d = state.dragon.position, t = target.position;
  let blocker = null;
  if (d.r === t.r) {
    const step = Math.sign(t.c - d.c);
    for (let c = d.c + step; c !== t.c; c += step) {
      const occ = state.board[d.r][c];
      if (occ && occ !== 'dragon') { blocker = occ; break; }
    }
  } else if (d.c === t.c) {
    const step = Math.sign(t.r - d.r);
    for (let r = d.r + step; r !== t.r; r += step) {
      const occ = state.board[r][d.c];
      if (occ && occ !== 'dragon') { blocker = occ; break; }
    }
  }
  if (!blocker) return damagePlayer(state, targetId, 2);
  const rng = createRng(state.seed + state.round * 31 + state.dragon.hp);
  const roll = rng.roll(6) + (target.statusEffects.hiddenThisRound ? 2 : 0);
  if (roll >= 4) {
    // Blocker intercepts: blocker takes 2, original target takes 1 splash
    let next = damagePlayer(state, blocker, 2);
    next = damagePlayer(next, targetId, 1);
    next = {
      ...next,
      players: next.players.map((p) => p.id === blocker
        ? { ...p, missionProgress: { ...p.missionProgress,
            hideInPlaceCount: (p.missionProgress.hideInPlaceCount ?? 0) + 1 } } : p),
    };
    return next;
  }
  // Roll < 4: breath passes through blocker, target takes full 2
  return damagePlayer(state, targetId, 2);
}

function dragonTail(state) {
  const d = state.dragon.position;
  let s = state;
  for (const p of state.players) {
    if (p.isEliminated) continue;
    if (Math.abs(p.position.r - d.r) <= 1 && Math.abs(p.position.c - d.c) <= 1
        && !(p.position.r === d.r && p.position.c === d.c)) {
      s = damagePlayer(s, p.id, 1);
    }
  }
  return s;
}

function dragonWings(state) {
  const d = state.dragon.position;
  let s = state;
  for (const p of state.players) {
    if (p.isEliminated) continue;
    const dr = Math.sign(p.position.r - d.r);
    const dc = Math.sign(p.position.c - d.c);
    if (dr !== 0 && dc !== 0) {
      // diagonal: try row-axis push first, fall back to col-axis
      const before = s;
      s = pushPlayer(s, p.id, { dr, dc: 0 });
      if (s === before) s = pushPlayer(s, p.id, { dr: 0, dc });
    } else if (dr !== 0) {
      s = pushPlayer(s, p.id, { dr, dc: 0 });
    } else if (dc !== 0) {
      s = pushPlayer(s, p.id, { dr: 0, dc });
    }
  }
  return s;
}

function dragonPiercing(state, { axis }) {
  const d = state.dragon.position;
  let s = state;
  if (axis === 'row') {
    for (let c = 0; c < 5; c++) {
      const occ = state.board[d.r][c];
      if (occ && occ !== 'dragon') s = damagePlayer(s, occ, 1);
    }
  } else {
    for (let r = 0; r < 3; r++) {
      const occ = state.board[r][d.c];
      if (occ && occ !== 'dragon') s = damagePlayer(s, occ, 1);
    }
  }
  return s;
}

function dragonCharge(state, { direction }) {
  const d = state.dragon.position;
  const delta = { N: {dr:-1,dc:0}, S: {dr:1,dc:0}, E: {dr:0,dc:1}, W: {dr:0,dc:-1} }[direction];
  const finalR = Math.max(0, Math.min(2, d.r + delta.dr * 2));
  const finalC = Math.max(0, Math.min(4, d.c + delta.dc * 2));
  let s = state;
  // Damage all players in path cells (excluding start, including destination).
  // Path-only (non-destination) players are trampled: take 2 damage AND forcibly eliminated.
  let nr = d.r, nc = d.c;
  for (let i = 0; i < 2; i++) {
    nr += delta.dr; nc += delta.dc;
    if (!inBounds(nr, nc)) break;
    const occ = state.board[nr][nc];
    if (occ && occ !== 'dragon') {
      const isPathOnly = !(nr === finalR && nc === finalC);
      s = damagePlayer(s, occ, 2);
      if (isPathOnly) {
        // Trample: force elimination and board removal even if hp > 0
        const trampledPlayer = s.players.find((p) => p.id === occ);
        if (trampledPlayer && !trampledPlayer.isEliminated) {
          const trampleBoard = s.board.map((row) => row.slice());
          trampleBoard[trampledPlayer.position.r][trampledPlayer.position.c] = null;
          s = {
            ...s,
            board: trampleBoard,
            players: s.players.map((p) => p.id === occ ? { ...p, isEliminated: true } : p),
          };
        }
      }
    }
  }
  const newBoard = s.board.map((row) => row.slice());
  newBoard[d.r][d.c] = null;
  if (newBoard[finalR][finalC] && newBoard[finalR][finalC] !== 'dragon') {
    for (const [ddr, ddc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const r2 = finalR+ddr, c2 = finalC+ddc;
      if (inBounds(r2,c2) && !newBoard[r2][c2]) {
        const pid = newBoard[finalR][finalC];
        newBoard[finalR][finalC] = null;
        newBoard[r2][c2] = pid;
        s = { ...s, players: s.players.map((p) => p.id === pid ? { ...p, position: { r: r2, c: c2 } } : p) };
        break;
      }
    }
  }
  newBoard[finalR][finalC] = 'dragon';
  return { ...s, board: newBoard, dragon: { ...s.dragon, position: { r: finalR, c: finalC } } };
}

function dragonMark(state, { markCell }) {
  return { ...state, dragon: { ...state.dragon,
    markedCells: [...state.dragon.markedCells, { r: markCell.r, c: markCell.c, resolvesOnRound: state.round + 1 }] } };
}

function dragonFrenzy(state) {
  let s = state;
  for (const p of state.players) if (!p.isEliminated) s = damagePlayer(s, p.id, 1);
  return s;
}

function dragonReposition(state) {
  const newBoard = state.board.map((row) => row.slice());
  newBoard[state.dragon.position.r][state.dragon.position.c] = null;
  let s = state;
  const centerOcc = newBoard[1][2];
  if (centerOcc && centerOcc !== 'dragon') {
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]]) {
      const r2 = 1+dr, c2 = 2+dc;
      if (inBounds(r2,c2) && !newBoard[r2][c2]) {
        newBoard[1][2] = null;
        newBoard[r2][c2] = centerOcc;
        s = { ...s, players: s.players.map((p) => p.id === centerOcc ? { ...p, position: { r: r2, c: c2 } } : p) };
        break;
      }
    }
  }
  newBoard[1][2] = 'dragon';
  return { ...s, board: newBoard, dragon: { ...s.dragon, position: { r: 1, c: 2 } } };
}

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
