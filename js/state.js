import { createRng } from './rng.js';
import { buildPlayerDeck, drawFromDeck } from './cards.js';
import { allRaceIds, baseMaxHp } from './races.js';
import { assignMissions } from './missions.js';
import { buildDragonCards, resolveRandomizedReveal } from './dragon.js';
import { pickDragonType } from './dragons.js';

const BOARD_ROWS = 3;
const BOARD_COLS = 5;
const DRAGON_START = { r: 1, c: 2 };
const EDGE_CELLS = (() => {
  const cells = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (r === 0 || r === BOARD_ROWS - 1 || c === 0 || c === BOARD_COLS - 1) {
        cells.push({ r, c });
      }
    }
  }
  return cells;
})();

// Dragon sits off-grid above row 0, so all players start on the bottom row
// at equal distance (2 moves) from the attack zone. This keeps the race
// to row 0 symmetric instead of favoring whoever spawns nearest the top.
const FIXED_POSITIONS = {
  3: [{ r: 2, c: 0 }, { r: 2, c: 2 }, { r: 2, c: 4 }],
  4: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 3 }, { r: 2, c: 4 }],
  5: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 }],
};

export function createInitialState({ seed, players, targetDragonKills = 3 }) {
  const target = Math.max(1, Math.min(5, Number(targetDragonKills) || 3));
  return {
    seed,
    matchIndex: 0,
    targetDragonKills: target,
    dragonKills: 0,
    matchScores: Array.from({ length: target }, () => []),
    round: 0,
    phase: 'setup',
    board: Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null)),
    dragon: null,
    players: players.map((p) => ({
      id: p.id, name: p.name, isAI: !!p.isAI,
      race: null, hp: 0, maxHp: 0, hand: [], position: null,
      missions: null, missionProgress: {}, statusEffects: {},
      isEliminated: false, dragonDamageDealt: 0,
    })),
    turnOrder: [],
    currentTurnIndex: 0,
    commonDeck: [],
    commonDiscard: [],
    lastDragonHitterId: null,
    log: [],
  };
}

export function startMatch(state) {
  const rng = createRng(state.seed + state.matchIndex * 1000);
  const races = allRaceIds();

  // Fixed race assignment: deterministic round-robin so the player
  // sees the same party composition every match.
  const players = state.players.map((p, idx) => {
    const race = races[idx % races.length];
    return { ...p, race, maxHp: baseMaxHp(race), hp: baseMaxHp(race),
      hand: [], missions: null, missionProgress: {}, statusEffects: {},
      isEliminated: false, dragonDamageDealt: 0, position: null };
  });

  const racesPresent = new Set(players.map(p => p.race));

  for (const p of players) {
    p.missions = assignMissions(p.race, racesPresent, rng);
  }

  const layout = FIXED_POSITIONS[players.length] ?? EDGE_CELLS.slice(0, players.length);
  players.forEach((p, i) => { p.position = { ...layout[i] }; });

  const board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
  for (const p of players) board[p.position.r][p.position.c] = p.id;
  // Dragon does NOT occupy any board cell. It is fixed off-grid (shown in
  // the dragon panel only) and attacks via telegraphed row/column patterns.

  let commonDeck = rng.shuffle(buildPlayerDeck());
  let commonDiscard = [];
  for (const p of players) {
    for (let i = 0; i < 3; i++) {
      const { drawn, deck, discard } = drawFromDeck(commonDeck, commonDiscard, rng);
      p.hand.push(drawn);
      commonDeck = deck;
      commonDiscard = discard;
    }
  }

  for (const p of players) {
    const treasureCards = p.hand.filter((c) => c.type === 'treasure');
    p.missionProgress = {
      ...p.missionProgress,
      treasuresAcquired: treasureCards.length,
      treasuresAcquiredTypes: [...new Set(treasureCards.map((c) => c.treasure))],
    };
  }

  const dragonType = pickDragonType(state.seed, state.matchIndex);

  const dragonDeck = rng.shuffle(buildDragonCards(1));
  const [firstReveal, ...restDeck] = dragonDeck;
  const dragon = {
    hp: dragonType.maxHp, maxHp: dragonType.maxHp, phase: 1,
    type: dragonType.id,
    name: dragonType.name,
    atlasClass: dragonType.atlasClass,
    element: dragonType.element,
    deck: restDeck, discard: [], revealed: [resolveRandomizedReveal(firstReveal, rng)],
    position: null, // off-grid
    markedCells: [],
    drops: [],
  };

  return {
    ...state,
    round: 1,
    phase: 'rolling',
    board,
    dragon,
    players,
    commonDeck,
    commonDiscard,
    turnOrder: [],
    currentTurnIndex: 0,
    log: [],
  };
}

export const BOARD_SIZE = { rows: BOARD_ROWS, cols: BOARD_COLS };
export { DRAGON_START, EDGE_CELLS };
