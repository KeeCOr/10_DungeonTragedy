import { createRng } from './rng.js';
import { attackRangeBonus } from './races.js';

const manhattan = (a,b) => Math.abs(a.r-b.r)+Math.abs(a.c-b.c);

function legalMoveTargets(state, player, card) {
  const out = [];
  const dp = state.dragon.position;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    if (r === dp.r && c === dp.c) continue;
    if (r !== player.position.r && c !== player.position.c) continue; // orthogonal only
    const d = manhattan(player.position, { r, c });
    if (d === 0 || d > card.range) continue;
    out.push({ r, c });
  }
  return out;
}

function canAttackDragon(state, player, card) {
  const range = card.range + attackRangeBonus(player.race);
  return manhattan(player.position, state.dragon.position) <= range;
}

function adjacentAllies(state, player) {
  return state.players.filter((p) => p.id !== player.id && !p.isEliminated
    && manhattan(p.position, player.position) === 1);
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

  // Priority 5: cooperation — heal injured adjacent ally
  const heal = hand.find((c) => c.type === 'heal');
  const injured = adjacentAllies(state, player).find((a) => a.hp < a.maxHp);
  if (heal && injured) return { type: 'playCard', cardId: heal.id, target: { type: 'player', id: injured.id } };

  // Priority 6: hand management
  if (hand.length <= 2) return { type: 'drawTwo' };

  // fallback: move toward dragon
  const moveCard = hand.find((c) => c.type === 'move');
  if (moveCard) {
    const targets = legalMoveTargets(state, player, moveCard)
      .sort((a, b) => manhattan(a, state.dragon.position) - manhattan(b, state.dragon.position));
    if (targets.length > 0) return { type: 'playCard', cardId: moveCard.id, target: targets[0] };
  }

  // last resort
  if (hand.length <= 4) return { type: 'drawTwo' };
  return { type: 'discardAndSwapMissions' };
}
