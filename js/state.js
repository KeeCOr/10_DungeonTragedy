import { createRng } from './rng.js';
import { buildPlayerDeck, drawFromDeck } from './cards.js';
import { allRaceIds, baseMaxHp } from './races.js';
import { assignMissions } from './missions.js';
import { buildDragonCards } from './dragon.js';

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

export function createInitialState({ seed, players }) {
  return {
    seed,
    matchIndex: 0,
    matchScores: [[], [], []],
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

  const players = state.players.map((p) => {
    const race = races[rng.nextInt(0, races.length - 1)];
    return { ...p, race, maxHp: baseMaxHp(race), hp: baseMaxHp(race),
      hand: [], missions: null, missionProgress: {}, statusEffects: {},
      isEliminated: false, dragonDamageDealt: 0, position: null };
  });

  const racesPresent = new Set(players.map(p => p.race));

  for (const p of players) {
    p.missions = assignMissions(p.race, racesPresent, rng);
  }

  const shuffledEdges = rng.shuffle(EDGE_CELLS);
  players.forEach((p, i) => { p.position = { ...shuffledEdges[i] }; });

  const board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
  for (const p of players) board[p.position.r][p.position.c] = p.id;
  board[DRAGON_START.r][DRAGON_START.c] = 'dragon';

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

  const dragonDeck = rng.shuffle(buildDragonCards(1));
  const [firstReveal, ...restDeck] = dragonDeck;
  const dragon = {
    hp: 15, maxHp: 15, phase: 1,
    deck: restDeck, discard: [], revealed: [firstReveal],
    position: { ...DRAGON_START },
    markedCells: [],
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
