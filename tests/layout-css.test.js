import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');

function ruleFor(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'));
  assert.ok(match, `missing CSS rule for ${selector}`);
  return match[1];
}

test('layout: gameplay grid keeps the player controls inside the 16:9 stage', () => {
  const app = ruleFor('#app');
  const boardWrap = ruleFor('#board-wrap');
  const board = ruleFor('#board');
  const playerPanel = ruleFor('#player-panel');

  assert.match(app, /grid-template-rows:\s*[^;]*minmax\(0,\s*1fr\)[^;]*;/);
  assert.match(boardWrap, /min-height:\s*0\s*;/);
  assert.match(board, /height:\s*100%\s*;/);
  assert.match(playerPanel, /min-height:\s*0\s*;/);
});

test('layout: board uses the play area without decorative dead space', () => {
  const app = ruleFor('#app');
  const boardWrap = ruleFor('#board-wrap');
  const playerPanel = ruleFor('#player-panel');

  assert.match(app, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+20rem\s*;/);
  assert.match(app, /grid-template-rows:\s*2\.35rem\s+4\.55rem\s+minmax\(0,\s*1fr\)\s+7\.6rem\s*;/);
  assert.match(boardWrap, /align-items:\s*stretch\s*;/);
  assert.match(boardWrap, /padding:\s*0\s*;/);
  assert.match(boardWrap, /justify-self:\s*center\s*;/);
  assert.match(boardWrap, /width:\s*fit-content\s*;/);
  assert.match(playerPanel, /grid-template-columns:\s*9\.2rem\s+minmax\(0,\s*1fr\)\s+minmax\(14rem,\s*20rem\)\s*;/);
  assert.match(playerPanel, /justify-self:\s*stretch\s*;/);
});

test('layout: enabled turn actions are visually promoted over disabled actions', () => {
  const enabledButton = ruleFor('button:not(:disabled)');
  const disabledButton = ruleFor('button:disabled');

  assert.match(enabledButton, /box-shadow:\s*[^;]*rgba\(232,\s*176,\s*64,\s*0\.28\)[^;]*;/);
  assert.match(enabledButton, /border-color:\s*#9c7438\s*;/);
  assert.match(disabledButton, /opacity:\s*0\.24\s*;/);
});

test('layout: player turn state makes cards and action buttons scannable', () => {
  const playerTurnCard = ruleFor('#player-panel.your-turn .card');
  const waitingTurnCard = ruleFor('#player-panel.awaiting-turn .card');
  const actionButton = ruleFor('.action-buttons button');

  assert.match(playerTurnCard, /border-color:\s*#9c7438\s*;/);
  assert.match(waitingTurnCard, /opacity:\s*0\.42\s*;/);
  assert.match(waitingTurnCard, /cursor:\s*not-allowed\s*;/);
  assert.match(actionButton, /width:\s*100%\s*;/);
});

test('layout: other-player action feedback has toast, cell pulses, and latest log emphasis', () => {
  const toast = ruleFor('.action-toast');
  const pulseFrom = ruleFor('.cell.action-from');
  const pulseTo = ruleFor('.cell.action-to');
  const latestLog = ruleFor('#log-panel .log-entry.latest');

  assert.match(toast, /animation:\s*action-toast-pop\s+1\.35s\s+ease\s+forwards\s*;/);
  assert.match(pulseFrom, /animation:\s*action-source-pulse\s+1\.1s\s+ease\s*;/);
  assert.match(pulseTo, /animation:\s*action-target-pulse\s+1\.1s\s+ease\s*;/);
  assert.match(latestLog, /color:\s*#ffe0a0\s*;/);
});

test('visual: combat scene borrows lava arena depth from the reference image', () => {
  const appAfter = ruleFor('#app::after');
  const boardBefore = ruleFor('#board::before');
  const boardAfter = ruleFor('#board::after');
  const dragonStrip = ruleFor('#dragon-strip');
  const card = ruleFor('.card');

  assert.match(appAfter, /radial-gradient\(ellipse at 50% 58%, rgba\(255,\s*96,\s*22,\s*0\.2\)/);
  assert.match(boardBefore, /linear-gradient\(115deg,\s*transparent 0 18%/);
  assert.match(boardAfter, /radial-gradient\(circle at 50% 48%, rgba\(255,\s*126,\s*32,\s*0\.18\)/);
  assert.match(dragonStrip, /linear-gradient\(90deg,\s*rgba\(201,\s*152,\s*88,\s*0\.55\)/);
  assert.match(card, /clip-path:\s*polygon\(/);
});

test('visual: action buttons read like framed skill slots', () => {
  const actionButton = ruleFor('.action-buttons button');
  const actionButtonBefore = ruleFor('.action-buttons button::before');

  assert.match(actionButton, /border:\s*1px solid #9c7438\s*;/);
  assert.match(actionButton, /background:\s*linear-gradient\(180deg,\s*#4b3318/);
  assert.match(actionButtonBefore, /inset:\s*3px\s*;/);
  assert.match(actionButtonBefore, /border:\s*1px solid rgba\(255,\s*220,\s*150,\s*0\.2\)\s*;/);
});
