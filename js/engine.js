import { createRng } from './rng.js';
import { attackRangeBonus, attackDamageBonus, extraDrawChance } from './races.js';
import { drawFromDeck } from './cards.js';
import { assignMissions } from './missions.js';

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

function applyHideCard(state, player, card) {
  const { card: consumed, hand } = removeCardFromHand(player, card.id);
  const newPlayers = state.players.map((p) => p.id === player.id
    ? { ...p, hand, statusEffects: { ...p.statusEffects, hiddenThisRound: true } }
    : p);
  return {
    ...state, players: newPlayers,
    commonDiscard: [...state.commonDiscard, consumed],
    log: logEntry(state, `${player.id} hides`, player.id),
  };
}

function applyHealCard(state, player, card, target) {
  const { card: consumed, hand } = removeCardFromHand(player, card.id);
  let newPlayers = state.players.map((p) => p.id === player.id ? { ...p, hand } : p);

  let recipientId;
  if (target.type === 'self') recipientId = player.id;
  else if (target.type === 'player') {
    const ally = findPlayer(state, target.id);
    if (!ally || ally.isEliminated) throw new Error('invalid heal target');
    if (manhattan(player.position, ally.position) !== 1) throw new Error('heal target not adjacent');
    recipientId = target.id;
  } else throw new Error('invalid heal target');

  newPlayers = newPlayers.map((p) => p.id === recipientId
    ? { ...p, hp: Math.min(p.maxHp, p.hp + 1) }
    : p);

  newPlayers = newPlayers.map((p) => p.id === player.id
    ? { ...p, missionProgress: { ...p.missionProgress,
        healCount: (p.missionProgress.healCount ?? 0) + 1 } }
    : p);

  return {
    ...state, players: newPlayers,
    commonDiscard: [...state.commonDiscard, consumed],
    log: logEntry(state, `${player.id} heals ${recipientId}`, player.id),
  };
}

function applyScoutCard(state, player, card) {
  const { card: consumed, hand } = removeCardFromHand(player, card.id);
  const newPlayers = state.players.map((p) => p.id === player.id
    ? { ...p, hand, missionProgress: { ...p.missionProgress,
        scoutCount: (p.missionProgress.scoutCount ?? 0) + 1 } } : p);
  let newDragon = state.dragon;
  if (state.dragon.deck.length > 0) {
    const [next, ...rest] = state.dragon.deck;
    newDragon = { ...state.dragon, deck: rest, revealed: [...state.dragon.revealed, next] };
  }
  return {
    ...state, players: newPlayers, dragon: newDragon,
    commonDiscard: [...state.commonDiscard, consumed],
    log: logEntry(state, `${player.id} scouts`, player.id),
  };
}

function applyTauntCard(state, player, card) {
  const { card: consumed, hand } = removeCardFromHand(player, card.id);
  const newPlayers = state.players.map((p) => p.id === player.id
    ? { ...p, hand, statusEffects: { ...p.statusEffects, tauntThisRound: true },
        missionProgress: { ...p.missionProgress,
          tauntCount: (p.missionProgress.tauntCount ?? 0) + 1 } } : p);
  return {
    ...state, players: newPlayers,
    commonDiscard: [...state.commonDiscard, consumed],
    log: logEntry(state, `${player.id} taunts`, player.id),
  };
}

function applyDrawTwo(state, player) {
  if (player.hand.length > 4) throw new Error('hand too large for draw action');
  const rng = createRng(state.seed + state.round * 7919 + state.currentTurnIndex * 7);
  let deck = state.commonDeck, discard = state.commonDiscard;
  const drawn = [];
  for (let i = 0; i < 2; i++) {
    const step = drawFromDeck(deck, discard, rng);
    if (step.drawn) drawn.push(step.drawn);
    deck = step.deck; discard = step.discard;
  }
  const newPlayers = state.players.map((p) => p.id === player.id
    ? { ...p, hand: [...p.hand, ...drawn],
        missionProgress: { ...p.missionProgress,
          drawActionCount: (p.missionProgress.drawActionCount ?? 0) + 1 } } : p);
  return {
    ...state, players: newPlayers, commonDeck: deck, commonDiscard: discard,
    log: logEntry(state, `${player.id} draws 2`, player.id),
  };
}

function applyDiscardAndSwapMissions(state, player) {
  const racesPresent = new Set(state.players.filter((p) => !p.isEliminated).map((p) => p.race));
  const rng = createRng(state.seed + state.round * 100003 + state.currentTurnIndex * 31);
  const missions = assignMissions(player.race, racesPresent, rng);
  const discardedHand = player.hand;
  const newPlayers = state.players.map((p) => p.id === player.id
    ? { ...p, hand: [], missions,
        missionProgress: { ...p.missionProgress,
          missionSwapCount: (p.missionProgress.missionSwapCount ?? 0) + 1 } } : p);
  return {
    ...state, players: newPlayers,
    commonDiscard: [...state.commonDiscard, ...discardedHand],
    log: logEntry(state, `${player.id} discards hand and swaps missions`, player.id),
  };
}

export function executePlayerAction(state, action) {
  const player = findPlayer(state, action.playerId);
  if (!player) throw new Error(`no player ${action.playerId}`);
  if (action.type === 'drawTwo') return advanceTurn(applyDrawTwo(state, player));
  if (action.type === 'discardAndSwapMissions') return advanceTurn(applyDiscardAndSwapMissions(state, player));
  if (action.type === 'playCard') {
    const card = player.hand.find((c) => c.id === action.cardId);
    if (!card) throw new Error(`card ${action.cardId} not in hand`);
    let next;
    switch (card.type) {
      case 'move':   next = applyMoveCard(state, player, card, action.target); break;
      case 'attack': next = applyAttackCard(state, player, card, action.target); break;
      case 'hide':   next = applyHideCard(state, player, card); break;
      case 'heal':   next = applyHealCard(state, player, card, action.target); break;
      case 'scout':  next = applyScoutCard(state, player, card); break;
      case 'taunt':  next = applyTauntCard(state, player, card); break;
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
