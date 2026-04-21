import { createInitialState, startMatch } from './state.js';
import {
  rollTurnOrder, executePlayerAction, executeDragonTurn,
  endRound, checkMatchEnd, maybeTransitionPhase, applyTurnStartPassives,
} from './engine.js';
import { decideDragonAction } from './dragon-ai.js';
import { decideAllyAction } from './ally-ai.js';
import { scoreMatch } from './missions.js';
import { render } from './render.js';
import { createInputController } from './input.js';

const SEED = Math.floor(Math.random() * 1e9);
const PLAYERS = [
  { id: 'P0', name: 'You',   isAI: false },
  { id: 'P1', name: 'Ally1', isAI: true },
  { id: 'P2', name: 'Ally2', isAI: true },
];

let state = startMatch(createInitialState({ seed: SEED, players: PLAYERS }));
state = rollTurnOrder(state);
console.log(`Seed: ${SEED}`);

// Concurrency guard: prevents double-scheduling of stepLoop and filters
// inputs that arrive before the engine has advanced to the player's turn.
let stepScheduled = false;
function scheduleStep(delay) {
  if (stepScheduled) return;
  stepScheduled = true;
  setTimeout(() => { stepScheduled = false; stepLoop(); }, delay);
}

function currentActorId() { return state.turnOrder[state.currentTurnIndex]; }
function isHumanTurn() {
  const id = currentActorId();
  const actor = state.players.find((p) => p.id === id);
  return !!actor && !actor.isAI && !actor.isEliminated;
}

function smoothRender() {
  if (document.startViewTransition) {
    document.startViewTransition(() => { render(state, input.ui); });
  } else {
    render(state, input.ui);
  }
}

const input = createInputController({
  getState: () => state,
  setState: (s) => { state = s; },
  render: smoothRender,
  onAction: (action) => {
    if (!isHumanTurn()) { console.warn('Ignored input: not your turn.'); return; }
    try {
      state = executePlayerAction(state, action);
      smoothRender();
      scheduleStep(350);
    } catch (e) { console.warn(e.message); }
  },
});
input.attach();

function stepLoop() {
  const end = checkMatchEnd(state);
  if (end) return onMatchEnd(end);
  if (state.currentTurnIndex >= state.turnOrder.length) {
    state = endRound(state);
    state = rollTurnOrder(state);
    smoothRender();
    scheduleStep(400);
    return;
  }
  const actorId = currentActorId();
  if (actorId === 'dragon') {
    state = executeDragonTurn(state, (s, card) => decideDragonAction(s, card));
    state = maybeTransitionPhase(state);
    smoothRender();
    scheduleStep(600);
    return;
  }
  const actor = state.players.find((p) => p.id === actorId);
  if (actor.isEliminated) {
    state = { ...state, currentTurnIndex: state.currentTurnIndex + 1 };
    scheduleStep(100);
    return;
  }
  state = applyTurnStartPassives(state, actorId);
  if (actor.isAI) {
    try {
      const action = decideAllyAction(state, actorId);
      state = executePlayerAction(state, action);
    } catch (e) {
      console.warn(e.message);
      try { state = executePlayerAction(state, { type: 'drawTwo', playerId: actorId }); }
      catch { state = { ...state, currentTurnIndex: state.currentTurnIndex + 1 }; }
    }
    smoothRender();
    scheduleStep(600);
    return;
  }
  // Human turn: just render and wait for onAction.
  smoothRender();
}

function onMatchEnd(reason) {
  const finisher = state.lastDragonHitterId;
  const scores = scoreMatch(state, reason, finisher);
  const newScores = [...state.matchScores];
  newScores[state.matchIndex] = scores;
  state = { ...state, matchScores: newScores };
  console.log(`Match ${state.matchIndex + 1} ended: ${reason}`, scores);
  if (state.matchIndex >= 2) return onGameEnd();
  state = { ...state, matchIndex: state.matchIndex + 1 };
  state = startMatch(state);
  state = rollTurnOrder(state);
  smoothRender();
  scheduleStep(700);
}

function onGameEnd() {
  const totals = {};
  for (const matchScoreList of state.matchScores) {
    for (const s of matchScoreList) {
      totals[s.playerId] = (totals[s.playerId] ?? 0) + s.total;
    }
  }
  const ranking = Object.entries(totals).sort((a,b) => b[1] - a[1]);
  alert(`게임 종료!\n${ranking.map(([id,t], i) => `${i+1}위 ${id}: ${t}점`).join('\n')}`);
}

smoothRender();
scheduleStep(600);
