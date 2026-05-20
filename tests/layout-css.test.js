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
