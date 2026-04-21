import { createInitialState, startMatch } from './state.js';
import {
  rollTurnOrder, executePlayerAction, executeDragonTurn,
  endRound, checkMatchEnd, maybeTransitionPhase,
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

const input = createInputController({
  getState: () => state,
  setState: (s) => { state = s; },
  render,
  onAction: (action) => {
    try {
      state = executePlayerAction(state, action);
      render(state, input.ui);
      setTimeout(stepLoop, 300);
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
    render(state, input.ui);
    setTimeout(stepLoop, 300);
    return;
  }
  const actorId = state.turnOrder[state.currentTurnIndex];
  if (actorId === 'dragon') {
    state = executeDragonTurn(state, (s, card) => decideDragonAction(s, card));
    state = maybeTransitionPhase(state);
    render(state, input.ui);
    setTimeout(stepLoop, 400);
    return;
  }
  const actor = state.players.find((p) => p.id === actorId);
  if (actor.isEliminated) {
    state = { ...state, currentTurnIndex: state.currentTurnIndex + 1 };
    setTimeout(stepLoop, 50);
    return;
  }
  if (actor.isAI) {
    try {
      const action = decideAllyAction(state, actorId);
      state = executePlayerAction(state, action);
      render(state, input.ui);
      setTimeout(stepLoop, 400);
    } catch (e) {
      console.warn(e.message);
      try { state = executePlayerAction(state, { type: 'drawTwo', playerId: actorId }); } catch {}
      render(state, input.ui);
      setTimeout(stepLoop, 400);
    }
    return;
  }
  render(state, input.ui);
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
  render(state, input.ui);
  setTimeout(stepLoop, 500);
}

function onGameEnd() {
  const totals = {};
  for (const matchScoreList of state.matchScores) {
    for (const s of matchScoreList) {
      totals[s.playerId] = (totals[s.playerId] ?? 0) + s.total;
    }
  }
  const ranking = Object.entries(totals).sort((a,b) => b[1] - a[1]);
  alert(`Game end!\n${ranking.map(([id,t]) => `${id}: ${t}`).join('\n')}`);
}

render(state, input.ui);
setTimeout(stepLoop, 500);
