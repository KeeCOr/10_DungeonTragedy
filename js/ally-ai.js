import { createRng } from './rng.js';
import { attackRangeBonus } from './races.js';
import { getDragonCardPreview } from './dragon.js';

const manhattan = (a,b) => Math.abs(a.r-b.r)+Math.abs(a.c-b.c);

function legalMoveTargets(state, player, card) {
  const out = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    if (r !== player.position.r && c !== player.position.c) continue; // orthogonal only
    const d = manhattan(player.position, { r, c });
    if (d === 0 || d > card.range) continue;
    out.push({ r, c });
  }
  return out;
}

function canAttackDragon(_state, player, _card) {
  // Only cells in row 0 (the attack zone) can reach the off-grid dragon.
  return player.position?.r === 0;
}

function adjacentAllies(state, player) {
  return state.players.filter((p) => p.id !== player.id && !p.isEliminated
    && manhattan(p.position, player.position) === 1);
}

/**
 * Picks the best move target favoring (in order): rows closer to the attack
 * zone (row 0), grabbing pending drops, avoiding the next dragon card's hit
 * cells, and not landing on top of another player.
 */
function bestAdvanceTarget(state, player, moveCard) {
  const targets = legalMoveTargets(state, player, moveCard);
  if (targets.length === 0) return null;

  const nextCard = state.dragon.revealed?.[0];
  const threatSet = new Set();
  if (nextCard) {
    const pv = getDragonCardPreview(nextCard);
    for (const cell of pv?.cells ?? []) threatSet.add(`${cell.r},${cell.c}`);
  }
  const dropSet = new Set((state.dragon.drops ?? []).map((d) => `${d.r},${d.c}`));

  function score(t) {
    let s = t.r * 10;                                    // lower row = closer to dragon
    if (threatSet.has(`${t.r},${t.c}`)) s += 25;         // avoid imminent threat
    if (dropSet.has(`${t.r},${t.c}`)) s -= 8;            // grab nearby drops
    const occ = state.board[t.r][t.c];
    if (occ && occ !== player.id) s += 4;                // prefer empty cells
    return s;
  }
  return targets.sort((a, b) => score(a) - score(b))[0];
}

export function decideAllyAction(state, playerId) {
  const player = state.players.find((p) => p.id === playerId);
  const rng = createRng(state.seed + state.round * 19 + state.currentTurnIndex * 3);
  const hand = player.hand;

  // Priority 1: survival
  if (player.hp <= 1) {
    const heal = hand.find((c) => c.type === 'heal');
    if (heal) return { type: 'playCard', cardId: heal.id, target: { type: 'self' } };
    const potion = hand.find((c) => c.type === 'treasure' && c.treasure === 'potion');
    if (potion) return { type: 'playCard', cardId: potion.id };
    const hide = hand.find((c) => c.type === 'hide');
    if (hide) return { type: 'playCard', cardId: hide.id };
  }

  // Priority 2: betrayal (orc) — 30% chance
  if (player.race === 'orc' && rng.next() < 0.3) {
    const killMission = player.missions?.required?.id === 'orc-kill-player'
      || player.missions?.optional?.id === 'orc-kill-player';
    if (killMission) {
      const weakAlly = adjacentAllies(state, player).find((a) => a.hp === 1);
      const attackCard = hand.find((c) => c.type === 'attack');
      if (weakAlly && attackCard) {
        return { type: 'playCard', cardId: attackCard.id, target: { type: 'player', id: weakAlly.id } };
      }
    }
  }

  // Priority 4: dragon finisher / attack
  const sword = hand.find((c) => c.type === 'treasure' && c.treasure === 'sword');
  if (sword && state.dragon.hp <= 3) return { type: 'playCard', cardId: sword.id, target: { type: 'dragon' } };

  const attackCards = hand.filter((c) => c.type === 'attack');
  for (const card of attackCards) {
    if (canAttackDragon(state, player, card)) {
      return { type: 'playCard', cardId: card.id, target: { type: 'dragon' } };
    }
  }

  // Priority 4.5: holding an attack card but not in row 0 — advance toward it.
  const moveCardForAdvance = hand.find((c) => c.type === 'move');
  if (attackCards.length > 0 && player.position.r > 0 && moveCardForAdvance) {
    const target = bestAdvanceTarget(state, player, moveCardForAdvance);
    if (target) return { type: 'playCard', cardId: moveCardForAdvance.id, target };
  }

  // Priority 5: cooperation — heal injured adjacent ally
  const heal = hand.find((c) => c.type === 'heal');
  const injured = adjacentAllies(state, player).find((a) => a.hp < a.maxHp);
  if (heal && injured) return { type: 'playCard', cardId: heal.id, target: { type: 'player', id: injured.id } };

  // Priority 6: hand management — tome draws 2 without advancing turn-start passive RNG.
  const tome = hand.find((c) => c.type === 'treasure' && c.treasure === 'tome');
  if (tome && hand.length <= 4) return { type: 'playCard', cardId: tome.id };
  if (hand.length <= 2) return { type: 'drawTwo' };

  // Fallback movement: still pull toward row 0 / drops rather than the geometric center,
  // because the off-grid dragon makes proximity to row 0 always strategic.
  if (moveCardForAdvance) {
    const target = bestAdvanceTarget(state, player, moveCardForAdvance);
    if (target) return { type: 'playCard', cardId: moveCardForAdvance.id, target };
  }

  // last resort
  if (hand.length <= 3) return { type: 'drawTwo' };
  if (hand.length >= 4) return { type: 'discardAndSwapMissions' };
  return { type: 'discardAndRedraw' };
}
