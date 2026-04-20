import { createRng } from './rng.js';
import { attackRangeBonus, attackDamageBonus, extraDrawChance } from './races.js';

function roundRng(state) {
  // Distinct RNG per (seed, match, round) — keeps inter-round rolls independent.
  return createRng((state.seed + 1) * 1000003 + state.matchIndex * 9973 + state.round * 31);
}

const inBounds = (r, c) => r >= 0 && r < 3 && c >= 0 && c < 5;
const manhattan = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
const isOrthogonal = (from, to) => from.r === to.r || from.c === to.c;

function findPlayer(state, id) { return state.players.find((p) => p.id === id); }

function advanceTurn(state) {
  return { ...state, currentTurnIndex: state.currentTurnIndex + 1 };
}

function logEntry(state, message, actor = null) {
  return [...state.log, { round: state.round, turn: state.currentTurnIndex, actor, message }];
}

function removeCardFromHand(player, cardId) {
  const idx = player.hand.findIndex((c) => c.id === cardId);
  if (idx < 0) throw new Error(`card ${cardId} not in hand`);
  const card = player.hand[idx];
  const hand = [...player.hand.slice(0, idx), ...player.hand.slice(idx + 1)];
  return { card, hand };
}

function applyMoveCard(state, player, card, target) {
  if (!inBounds(target.r, target.c)) throw new Error('invalid move: out of bounds');
  if (!isOrthogonal(player.position, target)) throw new Error('invalid move: not orthogonal');
  if (manhattan(player.position, target) > card.range) throw new Error('invalid move: beyond range');
  if (manhattan(player.position, target) === 0) throw new Error('invalid move: same cell');
  const occupant = state.board[target.r][target.c];
  if (occupant === 'dragon') throw new Error('invalid move: dragon cell');
  const { card: consumed, hand } = removeCardFromHand(player, card.id);

  const newBoard = state.board.map((row) => row.slice());
  const newPlayers = state.players.map((p) => ({ ...p }));
  const self = newPlayers.find((p) => p.id === player.id);
  self.hand = hand;
  const from = { ...self.position };
  self.position = { ...target };

  if (occupant && occupant !== player.id) {
    const ally = newPlayers.find((p) => p.id === occupant);
    ally.position = { ...from };
    newBoard[from.r][from.c] = ally.id;
  } else {
    newBoard[from.r][from.c] = null;
  }
  newBoard[target.r][target.c] = player.id;

  self.missionProgress = { ...self.missionProgress,
    moveCellsCumulative: (self.missionProgress.moveCellsCumulative ?? 0) + manhattan(from, target),
  };

  return {
    ...state, board: newBoard, players: newPlayers,
    commonDiscard: [...state.commonDiscard, consumed],
    log: logEntry({ ...state }, `${player.id} moves to (${target.r},${target.c})`, player.id),
  };
}

function applyAttackCard(state, player, card, target) {
  const range = card.range + attackRangeBonus(player.race);
  const damage = 1 + attackDamageBonus(player.race);
  let targetPos;
  if (target.type === 'dragon') targetPos = state.dragon.position;
  else if (target.type === 'player') {
    const t = findPlayer(state, target.id);
    if (!t || t.isEliminated) throw new Error('invalid target');
    targetPos = t.position;
  } else throw new Error('unsupported target');
  if (manhattan(player.position, targetPos) > range) throw new Error('attack out of range');

  const { card: consumed, hand } = removeCardFromHand(player, card.id);
  let newPlayers = state.players.map((p) => p.id === player.id ? { ...p, hand } : { ...p });
  let newDragon = state.dragon;
  let newBoard = state.board;

  const attacker = newPlayers.find((p) => p.id === player.id);
  attacker.missionProgress = {
    ...attacker.missionProgress,
    attackCount: (attacker.missionProgress.attackCount ?? 0) + 1,
    rangedAttackCount: (attacker.missionProgress.rangedAttackCount ?? 0) + (card.range >= 2 ? 1 : 0),
  };

  if (target.type === 'dragon') {
    newDragon = { ...newDragon, hp: Math.max(0, newDragon.hp - damage) };
    attacker.dragonDamageDealt += damage;
    if (state.dragon.phase === 1) {
      attacker.missionProgress.phase1DragonDamage = (attacker.missionProgress.phase1DragonDamage ?? 0) + damage;
    }
    if (newDragon.hp === 0) attacker.missionProgress.killedDragon = true;
  } else {
    const idx = newPlayers.findIndex((p) => p.id === target.id);
    const victim = { ...newPlayers[idx] };
    victim.hp = Math.max(0, victim.hp - damage);
    if (victim.hp === 0) {
      victim.isEliminated = true;
      newBoard = state.board.map((row) => row.slice());
      newBoard[victim.position.r][victim.position.c] = null;
      attacker.missionProgress.eliminatedAllyCount = (attacker.missionProgress.eliminatedAllyCount ?? 0) + 1;
    }
    newPlayers[idx] = victim;
  }

  return {
    ...state,
    players: newPlayers,
    dragon: newDragon,
    board: newBoard,
    commonDiscard: [...state.commonDiscard, consumed],
    log: logEntry(state, `${player.id} attacks ${target.type === 'dragon' ? 'dragon' : target.id} for ${damage}`, player.id),
  };
}

export function executePlayerAction(state, action) {
  const player = findPlayer(state, action.playerId);
  if (!player) throw new Error(`no player ${action.playerId}`);
  if (action.type === 'playCard') {
    const card = player.hand.find((c) => c.id === action.cardId);
    if (!card) throw new Error(`card ${action.cardId} not in hand`);
    let next;
    switch (card.type) {
      case 'move': next = applyMoveCard(state, player, card, action.target); break;
      case 'attack': next = applyAttackCard(state, player, card, action.target); break;
      default: throw new Error(`unsupported card type ${card.type}`);
    }
    return advanceTurn(next);
  }
  throw new Error(`unsupported action ${action.type}`);
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
