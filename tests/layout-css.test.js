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

  assert.match(app, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+14\.75rem\s*;/);
  assert.match(app, /grid-template-rows:\s*1\.95rem\s+4\.35rem\s+minmax\(0,\s*1fr\)\s+6\.25rem\s*;/);
  assert.match(boardWrap, /align-items:\s*stretch\s*;/);
  assert.match(boardWrap, /padding:\s*0\s*;/);
  assert.match(boardWrap, /justify-self:\s*center\s*;/);
  assert.match(boardWrap, /width:\s*fit-content\s*;/);
  assert.match(playerPanel, /grid-template-columns:\s*7\.4rem\s+minmax\(0,\s*1fr\)\s+13\.25rem\s*;/);
  assert.match(playerPanel, /justify-self:\s*stretch\s*;/);
});

test('layout: simplified combat UI keeps secondary panels quiet', () => {
  const rightColumn = ruleFor('#right-column');
  const logPanel = ruleFor('#log-panel');
  const missionPanel = ruleFor('#mission-panel');
  const cellCoords = ruleFor('.cell-coords');
  const turnOrder = ruleFor('#hud .turn-order');

  assert.match(rightColumn, /grid-template-rows:\s*auto auto minmax\(0,\s*1fr\)\s*;/);
  assert.match(logPanel, /max-height:\s*7\.1rem\s*;/);
  assert.match(missionPanel, /max-height:\s*7\.1rem\s*;/);
  assert.match(cellCoords, /opacity:\s*0\s*;/);
  assert.match(turnOrder, /max-width:\s*42rem\s*;/);
});

test('layout: reference-style HUD keeps the battlefield dominant', () => {
  const dragonStrip = ruleFor('#dragon-strip');
  const rightColumn = ruleFor('#right-column');
  const playerPanel = ruleFor('#player-panel');
  const card = ruleFor('.card');
  const actionButtons = ruleFor('.action-buttons');

  assert.match(dragonStrip, /min-height:\s*0\s*;/);
  assert.match(rightColumn, /overflow:\s*hidden\s*;/);
  assert.match(playerPanel, /padding:\s*0\.28rem 0\.45rem\s*;/);
  assert.match(card, /width:\s*3\.25rem\s*;/);
  assert.match(card, /min-width:\s*3\.25rem\s*;/);
  assert.match(actionButtons, /display:\s*grid\s*;/);
  assert.match(actionButtons, /grid-template-rows:\s*repeat\(3,\s*1fr\)\s*;/);
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
  assert.match(dragonStrip, /url\(['"]?\.\.\/public\/assets\/ui-panel-frame\.png['"]?\)/);
  assert.match(card, /clip-path:\s*polygon\(/);
});

test('visual: action buttons read like framed skill slots', () => {
  const actionButton = ruleFor('.action-buttons button');
  const actionButtonBefore = ruleFor('.action-buttons button::before');

  assert.match(actionButton, /border:\s*1px solid #9c7438\s*;/);
  assert.match(actionButton, /linear-gradient\(180deg,\s*#4b3318/);
  assert.match(actionButtonBefore, /inset:\s*3px\s*;/);
  assert.match(actionButtonBefore, /border:\s*1px solid rgba\(255,\s*220,\s*150,\s*0\.2\)\s*;/);
});

test('visual: generated image assets are wired into the main combat UI', () => {
  const dragonStrip = ruleFor('#dragon-strip');
  const board = ruleFor('#board');
  const card = ruleFor('.card');
  const portrait = css.match(/(?:^|\n)\.portrait-medallion\s*\{([\s\S]*?)\n\}/m)?.[1] ?? '';

  assert.match(dragonStrip, /url\(['"]?\.\.\/public\/assets\/ui-panel-frame\.png['"]?\)/);
  assert.match(board, /url\(['"]?\.\.\/public\/assets\/lava-board-texture\.png['"]?\)/);
  assert.match(card, /url\(['"]?\.\.\/public\/assets\/fantasy-card-frame\.png['"]?\)/);
  assert.ok(portrait, 'missing base portrait medallion rule');
  assert.match(portrait, /url\(['"]?\.\.\/public\/assets\/race-portrait-atlas\.png['"]?\)/);
});

test('visual: atlas-driven icons and portraits have stable crop slots', () => {
  const skillIcon = ruleFor('.skill-icon');
  const attackIcon = ruleFor('.skill-icon.attack');
  const portraitElf = ruleFor('.portrait-medallion.elf');

  assert.match(skillIcon, /background-image:\s*url\(['"]?\.\.\/public\/assets\/skill-icon-atlas\.png['"]?\)\s*;/);
  assert.match(skillIcon, /background-size:\s*300%\s+200%\s*;/);
  assert.match(attackIcon, /background-position:\s*0%\s+0%\s*;/);
  assert.match(portraitElf, /background-position:\s*33\.333%\s+0\s*;/);
});

test('visual: generated button and panel frames skin the HUD controls', () => {
  const button = ruleFor('.action-buttons button');
  const enabledButton = ruleFor('button:not(:disabled)');
  const disabledButton = ruleFor('button:disabled');
  const dragonPanel = ruleFor('#dragon-panel');
  const missionPanel = ruleFor('#mission-panel');
  const logPanel = ruleFor('#log-panel');
  const playerPanel = ruleFor('#player-panel');

  assert.match(button, /url\(['"]?\.\.\/public\/assets\/ui-button-frame-atlas\.png['"]?\)/);
  assert.match(button, /background-size:\s*100%\s+300%\s*;/);
  assert.match(enabledButton, /background-position:\s*center 0%\s*;/);
  assert.match(disabledButton, /background-position:\s*center 100%\s*;/);
  assert.match(dragonPanel, /url\(['"]?\.\.\/public\/assets\/ui-panel-frame\.png['"]?\)/);
  assert.match(missionPanel, /url\(['"]?\.\.\/public\/assets\/ui-panel-frame\.png['"]?\)/);
  assert.match(logPanel, /url\(['"]?\.\.\/public\/assets\/ui-panel-frame\.png['"]?\)/);
  assert.match(playerPanel, /url\(['"]?\.\.\/public\/assets\/ui-panel-frame\.png['"]?\)/);
});

test('visual: start screen hides empty game chrome and reuses generated frames', () => {
  const startScreen = ruleFor('.start-screen');
  const startContent = ruleFor('.start-content');

  assert.match(startScreen, /url\(['"]?\.\.\/public\/assets\/dragon-boss-banner\.png['"]?\)/);
  assert.match(startScreen, /#000\s*;/);
  assert.match(startContent, /url\(['"]?\.\.\/public\/assets\/ui-panel-frame\.png['"]?\)/);
  assert.match(startContent, /box-shadow:\s*0 18px 56px rgba\(0,\s*0,\s*0,\s*0\.72\)/);
});

test('layout: boss bar is compact and uses a real dragon medallion', () => {
  const app = ruleFor('#app');
  const dragonStrip = ruleFor('#dragon-strip');
  const dragonPortrait = ruleFor('.dragon-medallion');

  assert.match(app, /grid-template-rows:\s*1\.95rem\s+4\.35rem\s+minmax\(0,\s*1fr\)\s+6\.25rem\s*;/);
  assert.match(dragonStrip, /grid-template-columns:\s*4\.15rem minmax\(0,\s*1fr\)\s*;/);
  assert.match(dragonPortrait, /background-image:\s*url\(['"]?\.\.\/public\/assets\/dragon-boss-medallion\.png['"]?\)\s*;/);
});

test('layout: right turn panel owns turn and health status', () => {
  const rightColumn = ruleFor('#right-column');
  const turnPanel = ruleFor('#turn-panel');
  const turnRoster = ruleFor('.turn-roster');
  const turnBanner = ruleFor('.turn-banner');

  assert.match(rightColumn, /grid-template-rows:\s*auto auto minmax\(0,\s*1fr\)\s*;/);
  assert.match(turnPanel, /grid-area:\s*turn\s*;/);
  assert.match(turnPanel, /url\(['"]?\.\.\/public\/assets\/ui-panel-frame\.png['"]?\)/);
  assert.match(turnRoster, /grid-template-columns:\s*1fr\s*;/);
  assert.match(turnBanner, /display:\s*none\s*;/);
});

test('visual: board pieces use generated race token atlas', () => {
  const token = ruleFor('.token-image');
  const elf = ruleFor('.token-image.elf');

  assert.match(token, /background-image:\s*url\(['"]?\.\.\/public\/assets\/race-token-atlas\.png['"]?\)\s*;/);
  assert.match(token, /background-size:\s*400%\s+100%\s*;/);
  assert.match(elf, /background-position:\s*33\.333%\s+0\s*;/);
});

test('visual: mission reveal overlay presents starting objectives', () => {
  const overlay = ruleFor('.mission-reveal-overlay');
  const panel = ruleFor('.mission-reveal-panel');

  assert.match(overlay, /z-index:\s*1100\s*;/);
  assert.match(panel, /url\(['"]?\.\.\/public\/assets\/ui-panel-frame\.png['"]?\)/);
});

test('visual: onboarding overlay covers empty game chrome', () => {
  const overlay = ruleFor('.onboarding-overlay');
  const panel = ruleFor('.ob-panel');

  assert.match(overlay, /url\(['"]?\.\.\/public\/assets\/dragon-boss-banner\.png['"]?\)/);
  assert.match(overlay, /#000\s*;/);
  assert.match(panel, /url\(['"]?\.\.\/public\/assets\/ui-panel-frame\.png['"]?\)/);
});
