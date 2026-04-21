import { createRng } from './rng.js';

const inBounds = (r, c) => r >= 0 && r < 3 && c >= 0 && c < 5;

function alivePlayers(state) { return state.players.filter((p) => !p.isEliminated); }
function manhattan(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c); }

function pickByHand(candidates, rng) {
  if (candidates.length === 0) return null;
  const max = Math.max(...candidates.map((p) => p.hand.length));
  const top = candidates.filter((p) => p.hand.length === max);
  return top[rng.nextInt(0, top.length - 1)];
}

function resolveTauntedTarget(candidates) {
  const taunter = candidates.find((p) => p.statusEffects?.tauntThisRound);
  return taunter ?? null;
}

export function decideDragonAction(state, card) {
  const rng = createRng(state.seed + state.round * 131 + (state.dragon?.hp ?? 0));
  const dp = state.dragon.position;
  const alive = alivePlayers(state);

  switch (card.type) {
    case 'bite': {
      const adj = alive.filter((p) => manhattan(p.position, dp) === 1);
      const taunt = resolveTauntedTarget(adj);
      const chosen = taunt ?? pickByHand(adj, rng);
      return { targetId: chosen?.id };
    }
    case 'breath': {
      const line = alive.filter((p) => p.position.r === dp.r || p.position.c === dp.c);
      const taunt = resolveTauntedTarget(line);
      const chosen = taunt ?? pickByHand(line, rng);
      return { targetId: chosen?.id };
    }
    case 'piercing': {
      const rowN = alive.filter((p) => p.position.r === dp.r).length;
      const colN = alive.filter((p) => p.position.c === dp.c).length;
      return { axis: rowN >= colN ? 'row' : 'col' };
    }
    case 'charge': {
      const directions = ['N', 'S', 'E', 'W'];
      const delta = { N: [-1,0], S: [1,0], E: [0,1], W: [0,-1] };
      let best = null, bestScore = -1;
      for (const d of directions) {
        let score = 0;
        const [dr, dc] = delta[d];
        for (let step = 1; step <= 2; step++) {
          const r = dp.r + dr * step, c = dp.c + dc * step;
          if (!inBounds(r,c)) break;
          const occ = state.board[r][c];
          if (occ && occ !== 'dragon') score += 1;
        }
        if (score > bestScore) { bestScore = score; best = d; }
      }
      return { direction: best };
    }
    case 'mark': {
      let best = null, bestScore = -1;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
        const cells = [{r,c},{r:r-1,c},{r:r+1,c},{r,c:c-1},{r,c:c+1}];
        let score = 0;
        for (const cell of cells) {
          if (!inBounds(cell.r, cell.c)) continue;
          const occ = state.board[cell.r][cell.c];
          if (occ && occ !== 'dragon') score += 1;
        }
        if (score > bestScore) { bestScore = score; best = { r, c }; }
      }
      return { markCell: best };
    }
    case 'reposition': return {};
    case 'tail':
    case 'wings':
    case 'roar':
    case 'frenzy':
      return {};
    default: return {};
  }
}
