import { createRng } from './rng.js';
import { attackRangeBonus, attackDamageBonus, extraDrawChance } from './races.js';
import { drawFromDeck } from './cards.js';
import { assignMissions } from './missions.js';
import { resolveDragonCard } from './dragon.js';

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
  // Dragon is off-grid, so any cell occupied by 'dragon' should not happen;
  // treat it defensively as an invalid target.
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
  // Dragon is off-grid: attacks against it always land regardless of range.
  if (target.type === 'player') {
    const t = findPlayer(state, target.id);
    if (!t || t.isEliminated) throw new Error('invalid target');
    if (manhattan(player.position, t.position) > range) throw new Error('attack out of range');
  } else if (target.type !== 'dragon') {
    throw new Error('unsupported target');
  }

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

  const result = {
    ...state,
    players: newPlayers,
    dragon: newDragon,
    board: newBoard,
    commonDiscard: [...state.commonDiscard, consumed],
    lastDragonHitterId: target.type === 'dragon' ? player.id : state.lastDragonHitterId,
    log: logEntry(state, `${player.id} attacks ${target.type === 'dragon' ? 'dragon' : target.id} for ${damage}`, player.id),
  };
  return target.type === 'dragon' ? maybeTransitionPhase(result) : result;
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

/**
 * Special rule: when the player closest to the dragon performs a draw action
 * AND the Hero's Sword is currently in the deck or discard, they draw it
 * guaranteed as one of their cards.
 */
function isClosestAlivePlayerToDragon(state, player) {
  const dp = state.dragon.position;
  const alive = state.players.filter((p) => !p.isEliminated);
  const self = Math.abs(player.position.r - dp.r) + Math.abs(player.position.c - dp.c);
  return alive.every((p) =>
    (Math.abs(p.position.r - dp.r) + Math.abs(p.position.c - dp.c)) >= self);
}

function pullSwordIfEligible(deck, discard, player, state) {
  // "After use": sword has been played and is in the discard pile.
  // Closest-to-dragon player's next draw guarantees it.
  if (!isClosestAlivePlayerToDragon(state, player)) return { sword: null, deck, discard };
  const idx = discard.findIndex((c) => c.type === 'treasure' && c.treasure === 'sword');
  if (idx < 0) return { sword: null, deck, discard };
  const sword = discard[idx];
  const newDiscard = [...discard.slice(0, idx), ...discard.slice(idx + 1)];
  return { sword, deck, discard: newDiscard };
}

function applyDrawTwo(state, player) {
  if (player.hand.length > 3) throw new Error('hand too large for draw action');
  const rng = createRng(state.seed + state.round * 7919 + state.currentTurnIndex * 7);
  let deck = state.commonDeck, discard = state.commonDiscard;
  const drawn = [];

  // Guaranteed Hero's Sword pull for the player closest to the dragon.
  const pulled = pullSwordIfEligible(deck, discard, player, state);
  if (pulled.sword) {
    drawn.push(pulled.sword);
    deck = pulled.deck; discard = pulled.discard;
  }

  for (let i = drawn.length; i < 2; i++) {
    const step = drawFromDeck(deck, discard, rng);
    if (step.drawn) drawn.push(step.drawn);
    deck = step.deck; discard = step.discard;
  }
  const newPlayers = state.players.map((p) => {
    if (p.id !== player.id) return p;
    const newTreasures = drawn.filter((c) => c.type === 'treasure');
    const existingTypes = new Set(p.missionProgress.treasuresAcquiredTypes ?? []);
    for (const t of newTreasures) existingTypes.add(t.treasure);
    return { ...p, hand: [...p.hand, ...drawn],
      missionProgress: { ...p.missionProgress,
        drawActionCount: (p.missionProgress.drawActionCount ?? 0) + 1,
        treasuresAcquired: (p.missionProgress.treasuresAcquired ?? 0) + newTreasures.length,
        treasuresAcquiredTypes: [...existingTypes] } };
  });
  return {
    ...state, players: newPlayers, commonDeck: deck, commonDiscard: discard,
    log: logEntry(state, `${player.id} draws 2`, player.id),
  };
}

function applyDiscardAndRedraw(state, player) {
  if (player.hand.length === 0) throw new Error('hand is empty');
  const count = player.hand.length;
  const rng = createRng(state.seed + state.round * 53 + state.currentTurnIndex * 17 + 9);
  const discarded = player.hand;
  let deck = state.commonDeck;
  let discard = [...state.commonDiscard, ...discarded];
  const drawn = [];
  const pulled = pullSwordIfEligible(deck, discard, player, state);
  if (pulled.sword) {
    drawn.push(pulled.sword);
    deck = pulled.deck; discard = pulled.discard;
  }
  for (let i = drawn.length; i < count; i++) {
    const step = drawFromDeck(deck, discard, rng);
    if (step.drawn) drawn.push(step.drawn);
    deck = step.deck; discard = step.discard;
  }
  const newPlayers = state.players.map((p) => {
    if (p.id !== player.id) return p;
    const newTreasures = drawn.filter((c) => c.type === 'treasure');
    const existingTypes = new Set(p.missionProgress.treasuresAcquiredTypes ?? []);
    for (const t of newTreasures) existingTypes.add(t.treasure);
    return { ...p, hand: drawn,
      missionProgress: { ...p.missionProgress,
        handRedrawCount: (p.missionProgress.handRedrawCount ?? 0) + 1,
        treasuresAcquired: (p.missionProgress.treasuresAcquired ?? 0) + newTreasures.length,
        treasuresAcquiredTypes: [...existingTypes] } };
  });
  return {
    ...state, players: newPlayers, commonDeck: deck, commonDiscard: discard,
    log: logEntry(state, `${player.id} 손패 전부 버리고 ${count}장 새로 뽑음`, player.id),
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

function applyTreasureCard(state, player, card, target) {
  switch (card.treasure) {
    case 'sword':  return applyTreasureSword(state, player, card);
    case 'potion': return applyTreasurePotion(state, player, card);
    case 'cloak':  return applyTreasureCloak(state, player, card, target);
    case 'shield': return applyTreasureShield(state, player, card);
    case 'rune':   return applyTreasureRune(state, player, card);
    default: throw new Error(`unknown treasure ${card.treasure}`);
  }
}

function incTreasuresUsed(player) {
  return { ...player.missionProgress,
    treasuresUsed: (player.missionProgress.treasuresUsed ?? 0) + 1 };
}

function applyTreasureSword(state, player, card) {
  const { card: consumed, hand } = removeCardFromHand(player, card.id);
  const newDragon = { ...state.dragon, hp: Math.max(0, state.dragon.hp - 3) };
  const newPlayers = state.players.map((p) => p.id === player.id
    ? { ...p, hand, dragonDamageDealt: p.dragonDamageDealt + 3,
        missionProgress: { ...incTreasuresUsed(p),
          killedDragon: newDragon.hp === 0 ? true : p.missionProgress.killedDragon,
          phase1DragonDamage: state.dragon.phase === 1
            ? (p.missionProgress.phase1DragonDamage ?? 0) + 3
            : p.missionProgress.phase1DragonDamage } } : p);
  const result = { ...state, players: newPlayers, dragon: newDragon,
    commonDiscard: [...state.commonDiscard, consumed],
    lastDragonHitterId: player.id,
    log: logEntry(state, `${player.id} strikes with the Hero's Sword`, player.id) };
  return maybeTransitionPhase(result);
}

function applyTreasurePotion(state, player, card) {
  const { card: consumed, hand } = removeCardFromHand(player, card.id);
  const newPlayers = state.players.map((p) => p.id === player.id
    ? { ...p, hand, hp: p.maxHp, missionProgress: incTreasuresUsed(p) } : p);
  return { ...state, players: newPlayers,
    commonDiscard: [...state.commonDiscard, consumed],
    log: logEntry(state, `${player.id} drinks potion`, player.id) };
}

function applyTreasureCloak(state, player, card, target) {
  if (!target || !inBounds(target.r, target.c)) throw new Error('invalid cloak target');
  const dist = manhattan(player.position, target);
  if (dist < 1 || dist > 2) throw new Error('cloak beyond range');
  const occupant = state.board[target.r][target.c];
  if (occupant === 'dragon') throw new Error('cannot enter dragon cell');
  const { card: consumed, hand } = removeCardFromHand(player, card.id);

  const newBoard = state.board.map((row) => row.slice());
  const newPlayers = state.players.map((p) => ({ ...p }));
  const self = newPlayers.find((p) => p.id === player.id);
  self.hand = hand;
  const from = self.position;
  self.position = { ...target };
  self.missionProgress = { ...incTreasuresUsed(self),
    moveCellsCumulative: (self.missionProgress.moveCellsCumulative ?? 0) + dist };

  if (occupant && occupant !== player.id) {
    const ally = newPlayers.find((p) => p.id === occupant);
    ally.position = { ...from };
    newBoard[from.r][from.c] = ally.id;
  } else {
    newBoard[from.r][from.c] = null;
  }
  newBoard[target.r][target.c] = player.id;

  return { ...state, players: newPlayers, board: newBoard,
    commonDiscard: [...state.commonDiscard, consumed],
    log: logEntry(state, `${player.id} uses cloak`, player.id) };
}

function applyTreasureShield(state, player, card) {
  const { card: consumed, hand } = removeCardFromHand(player, card.id);
  const newPlayers = state.players.map((p) => p.id === player.id
    ? { ...p, hand, statusEffects: { ...p.statusEffects, shieldActive: true } } : p);
  return { ...state, players: newPlayers,
    commonDiscard: [...state.commonDiscard, consumed],
    log: logEntry(state, `${player.id} readies the Dragon-Scale Shield`, player.id) };
}

function applyTreasureRune(state, player, card) {
  const { card: consumed, hand } = removeCardFromHand(player, card.id);
  const newPlayers = state.players.map((p) => p.id === player.id
    ? { ...p, hand, statusEffects: { ...p.statusEffects, runeBonusNext: 2 },
        missionProgress: incTreasuresUsed(p) } : p);
  return { ...state, players: newPlayers,
    commonDiscard: [...state.commonDiscard, consumed],
    log: logEntry(state, `${player.id} invokes the Ancient Rune`, player.id) };
}

export function executePlayerAction(state, action) {
  const player = findPlayer(state, action.playerId);
  if (!player) throw new Error(`no player ${action.playerId}`);
  if (action.type === 'drawTwo') return advanceTurn(applyDrawTwo(state, player));
  if (action.type === 'discardAndSwapMissions') return advanceTurn(applyDiscardAndSwapMissions(state, player));
  if (action.type === 'discardAndRedraw') return advanceTurn(applyDiscardAndRedraw(state, player));
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
      case 'taunt':    next = applyTauntCard(state, player, card); break;
      case 'treasure': next = applyTreasureCard(state, player, card, action.target); break;
      default: throw new Error(`unsupported card type ${card.type}`);
    }
    return advanceTurn(next);
  }
  throw new Error(`unsupported action ${action.type}`);
}

export function rollTurnOrder(state) {
  const rng = roundRng(state);
  const roarActive = state.dragon?.roarDebuffActiveForRound === state.round;
  const candidates = [
    { id: 'dragon', roll: rng.roll(6) },
    ...state.players
      .filter((p) => !p.isEliminated)
      .map((p) => ({ id: p.id, roll: rng.roll(6) - (roarActive ? 1 : 0) })),
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

export function maybeTransitionPhase(state) {
  const hp = state.dragon.hp;
  let phase = state.dragon.phase;
  if (hp <= 5) phase = 3;
  else if (hp <= 10) phase = Math.max(phase, 2);
  if (phase !== state.dragon.phase) {
    const patch = { ...state.dragon, phase };
    if (phase >= 3) patch.reachedPhase3 = true;
    return { ...state, dragon: patch };
  }
  return state;
}

export function clearRoundStatus(state) {
  return { ...state, players: state.players.map((p) => ({
    ...p, statusEffects: {
      ...p.statusEffects,
      hiddenThisRound: false,
      tauntThisRound: false,
    } })) };
}

export function resolveMarkedCells(state) {
  const due = state.dragon.markedCells.filter((m) => m.resolvesOnRound <= state.round);
  const remaining = state.dragon.markedCells.filter((m) => m.resolvesOnRound > state.round);
  let s = state;
  for (const mark of due) {
    const cells = [{ r: mark.r, c: mark.c },
      { r: mark.r-1, c: mark.c }, { r: mark.r+1, c: mark.c },
      { r: mark.r, c: mark.c-1 }, { r: mark.r, c: mark.c+1 }];
    for (const cell of cells) {
      if (cell.r < 0 || cell.r > 2 || cell.c < 0 || cell.c > 4) continue;
      const occ = s.board[cell.r][cell.c];
      if (occ && occ !== 'dragon') s = damagePlayerFromMark(s, occ, 2);
    }
  }
  return { ...s, dragon: { ...s.dragon, markedCells: remaining } };
}

function damagePlayerFromMark(state, playerId, amount) {
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

export function refillRevealed(state) {
  const target = state.dragon.phase;
  const newDragon = { ...state.dragon, revealed: [...state.dragon.revealed], deck: [...state.dragon.deck], discard: [...state.dragon.discard] };
  while (newDragon.revealed.length < target && (newDragon.deck.length > 0 || newDragon.discard.length > 0)) {
    if (newDragon.deck.length === 0) {
      const rng = createRng(state.seed + state.round * 101 + state.matchIndex * 7);
      newDragon.deck = rng.shuffle(newDragon.discard);
      newDragon.discard = [];
    }
    const [next, ...rest] = newDragon.deck;
    newDragon.revealed.push(next);
    newDragon.deck = rest;
  }
  return { ...state, dragon: newDragon };
}

export function endRound(state) {
  let s = clearRoundStatus(state);
  s = { ...s, round: s.round + 1 };
  s = resolveMarkedCells(s);
  s = refillRevealed(s);
  return s;
}

export function checkMatchEnd(state) {
  if (state.dragon.hp === 0) return 'dragon-dead';
  if (state.players.every((p) => p.isEliminated)) return 'party-wipe';
  if (state.round > 30) return 'timeout';
  return null;
}

export function applyTurnStartPassives(state, playerId) {
  const player = findPlayer(state, playerId);
  if (!player || player.isEliminated) return state;
  const chance = extraDrawChance(player.race);
  if (chance <= 0) return state;
  const rng = createRng(state.seed + state.round * 1031 + state.currentTurnIndex * 11);
  if (rng.next() >= chance) return state;
  const step = drawFromDeck(state.commonDeck, state.commonDiscard, rng);
  if (!step.drawn) return state;
  const newPlayers = state.players.map((p) => p.id === playerId
    ? { ...p, hand: [...p.hand, step.drawn] } : p);
  return {
    ...state, players: newPlayers,
    commonDeck: step.deck, commonDiscard: step.discard,
    log: logEntry(state, `${playerId} draws an extra card (human luck)`, playerId),
  };
}

export function executeDragonTurn(state, aiDecisionFn) {
  const actions = state.dragon.phase;
  let s = state;
  for (let i = 0; i < actions; i++) {
    if (s.dragon.revealed.length === 0) break;
    const [card, ...rest] = s.dragon.revealed;
    const decisions = aiDecisionFn(s, card);
    s = resolveDragonCard(s, card, decisions);
    s = { ...s, dragon: { ...s.dragon, revealed: rest, discard: [...s.dragon.discard, card] } };
    s = maybeTransitionPhase(s);
  }
  s = refillRevealed(s);
  return { ...s, currentTurnIndex: s.currentTurnIndex + 1 };
}
