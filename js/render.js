import { renderLog } from './log.js';

const CARD_LABEL = {
  move: (c) => `이동 ${c.range}`,
  attack: (c) => `공격 ${c.range}`,
  hide: () => '숨기',
  heal: () => '응급처치',
  scout: () => '정찰',
  taunt: () => '도발',
  treasure: (c) => ({ sword: '용사의 검', potion: '생명의 물약', cloak: '바람의 망토',
    shield: '용비늘 방패', rune: '고대 룬' }[c.treasure]),
};

const DRAGON_CARD_LABEL = {
  bite: '물기', breath: '화염 숨결', tail: '꼬리치기', wings: '날개짓',
  roar: '위협', piercing: '관통 화염', charge: '돌진', mark: '지정 표식',
  frenzy: '광폭', reposition: '재배치',
};

export function render(state, ui) {
  renderHud(state);
  renderBoard(state, ui);
  renderDragonPanel(state);
  renderPlayerPanel(state, ui);
  renderLog(state);
}

function renderHud(state) {
  const hud = document.getElementById('hud');
  hud.innerHTML = `
    <div>Match ${state.matchIndex + 1}/3 · Round ${state.round} · Dragon Phase ${state.dragon?.phase ?? '-'}</div>
    <div class="turn-order">${(state.turnOrder ?? []).map((id, i) =>
      `<div class="turn-slot ${i === state.currentTurnIndex ? 'current' : ''}">${id}</div>`).join('')}</div>
  `;
}

function renderBoard(state, ui) {
  const board = document.getElementById('board');
  board.innerHTML = '';
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r; cell.dataset.c = c;
      const occ = state.board[r][c];
      if (occ === 'dragon') cell.innerHTML = '<span class="token dragon-token">🐉</span>';
      else if (occ) {
        const p = state.players.find((x) => x.id === occ);
        const glyph = p?.race === 'elf' ? '🧝' : p?.race === 'dwarf' ? '🪓' : p?.race === 'orc' ? '👹' : '🧙';
        cell.innerHTML = `<span class="token player-token" title="${p.id} (${p.race}) HP${p.hp}">${glyph}</span>`;
      }
      if (state.dragon.markedCells.some((m) => m.r === r && m.c === c)) cell.classList.add('mark');
      if (ui?.validTargets?.some((t) => t.r === r && t.c === c)) cell.classList.add(ui.validTargetClass);
      board.appendChild(cell);
    }
  }
}

function renderDragonPanel(state) {
  const el = document.getElementById('dragon-panel');
  const d = state.dragon;
  if (!d) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <h2>용 · 페이즈 ${d.phase}</h2>
    <div class="hp-bar"><div class="fill" style="width:${(d.hp / d.maxHp) * 100}%"></div></div>
    <div>HP ${d.hp}/${d.maxHp}</div>
    <div class="revealed-cards">
      ${d.revealed.map((c) => `<div class="revealed-card">${DRAGON_CARD_LABEL[c.type]}</div>`).join('')}
    </div>
  `;
}

function renderPlayerPanel(state, ui) {
  const human = state.players.find((p) => !p.isAI);
  const el = document.getElementById('player-panel');
  if (!human) { el.innerHTML = ''; return; }
  const missionIcons = human.missions ? `
    <div class="mission-icons">
      <span class="mission-icon">🎯 ${human.missions.required.points}pt</span>
      <span class="mission-icon">⭐ ${human.missions.optional.points}pt</span>
    </div>` : '';
  el.innerHTML = `
    <div>${human.name} · ${human.race} · HP ${human.hp}/${human.maxHp} ${missionIcons}</div>
    <div class="hand">
      ${human.hand.map((c) => `<div class="card ${c.type === 'treasure' ? 'treasure' : ''} ${ui?.selectedCardId === c.id ? 'selected' : ''}" data-card-id="${c.id}">${CARD_LABEL[c.type](c)}</div>`).join('')}
    </div>
    <div style="margin-top:8px;">
      <button id="btn-draw-two" ${human.hand.length > 4 ? 'disabled' : ''}>행동 없이 2장 뽑기</button>
      <button id="btn-swap-missions">손패 버리고 미션 교체</button>
    </div>
  `;
}
