import { renderLog } from './log.js';

const CARD_DEFS = {
  move:   { name: '이동',     meta: (c) => `사거리 ${c.range}`, glyph: '👣' },
  attack: { name: '공격',     meta: (c) => `사거리 ${c.range}`, glyph: '⚔️' },
  hide:   { name: '숨기',     meta: () => '라운드 종료까지', glyph: '🛡️' },
  heal:   { name: '응급처치', meta: () => '자신/인접 +1 HP', glyph: '❤️‍🩹' },
  scout:  { name: '정찰',     meta: () => '용 카드 +1 공개', glyph: '👁️' },
  taunt:  { name: '도발',     meta: () => '용 타겟 강제', glyph: '📣' },
  treasure: { name: '', meta: () => '', glyph: '' },
};

const TREASURE_DEFS = {
  sword:  { name: '용사의 검',    meta: '용에 3 피해',   glyph: '🗡️' },
  potion: { name: '생명의 물약',  meta: 'HP 완전 회복',  glyph: '🧪' },
  cloak:  { name: '바람의 망토',  meta: '1~2칸 공짜 이동', glyph: '🌬️' },
  shield: { name: '용비늘 방패',  meta: '다음 피격 1회 무효', glyph: '🛡️' },
  rune:   { name: '고대 룬',      meta: '다음 주사위 +2', glyph: '🔮' },
};

const RACE_INFO = {
  human: { name: '인간',   glyph: '🧙' },
  elf:   { name: '엘프',   glyph: '🧝' },
  dwarf: { name: '드워프', glyph: '🪓' },
  orc:   { name: '오크',   glyph: '👹' },
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

function shortName(state, id) {
  if (id === 'dragon') return '🐉';
  const p = state.players?.find((x) => x.id === id);
  if (!p) return id;
  return `${RACE_INFO[p.race]?.glyph ?? '?'}${p.id.replace('P','')}`;
}

function renderHud(state) {
  const hud = document.getElementById('hud');
  const actor = state.turnOrder?.[state.currentTurnIndex];
  hud.innerHTML = `
    <div class="hud-title">🐉 Dragon Tactics</div>
    <div class="hud-meta">매치 ${state.matchIndex + 1}/3 · 라운드 ${state.round} · 페이즈 ${state.dragon?.phase ?? '-'} · 턴: ${actor ? shortName(state, actor) : '-'}</div>
    <div class="turn-order">
      ${(state.turnOrder ?? []).map((id, i) =>
        `<div class="turn-slot ${i === state.currentTurnIndex ? 'current' : ''}">${shortName(state, id)}</div>`).join('')}
    </div>
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
      let body = '';
      if (occ === 'dragon') {
        body = `<span class="token token-dragon">🐉</span>`;
        body += `<span class="cell-hp">${state.dragon.hp}</span>`;
      } else if (occ) {
        const p = state.players.find((x) => x.id === occ);
        const glyph = RACE_INFO[p?.race]?.glyph ?? '🧙';
        const isSelf = p && !p.isAI;
        body = `<span class="token ${isSelf ? 'token-self' : ''}" title="${p.id} (${p.race}) HP ${p.hp}">${glyph}</span>`;
        body += `<span class="cell-hp">${p.hp}</span>`;
      }
      body += `<span class="cell-coords">${r},${c}</span>`;
      cell.innerHTML = body;
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
  const pips = [1, 2, 3].map((p) =>
    `<div class="phase-pip ${p <= d.phase ? 'active' : ''}"></div>`).join('');
  el.innerHTML = `
    <h2>🐉 고대의 용</h2>
    <div class="hp-bar">
      <div class="fill" style="width:${(d.hp / d.maxHp) * 100}%"></div>
      <div class="label">${d.hp} / ${d.maxHp}</div>
    </div>
    <div class="phase-row">${pips}<span style="margin-left:auto; color:#c0a070; align-self:center; font-size:0.85em;">페이즈 ${d.phase}</span></div>
    <div style="margin-top:0.6rem; color:#c0a070; font-size:0.85em;">다음 행동:</div>
    <div class="revealed-cards">
      ${d.revealed.length > 0 ? d.revealed.map((c) => `<div class="revealed-card">${DRAGON_CARD_LABEL[c.type] ?? c.type}</div>`).join('') : '<span style="color:#6a5040; font-size:0.85em;">(덱 준비중)</span>'}
    </div>
  `;
}

function renderPlayerPanel(state, ui) {
  const human = state.players.find((p) => !p.isAI);
  const el = document.getElementById('player-panel');
  if (!human) { el.innerHTML = ''; return; }
  const raceInfo = RACE_INFO[human.race] ?? { name: human.race, glyph: '❓' };
  const hpPips = Array.from({ length: human.maxHp }, (_, i) =>
    `<div class="hp-pip ${i < human.hp ? '' : 'lost'}"></div>`).join('');
  const missions = human.missions ? `
    <span class="mission-badge" title="필수 미션: ${human.missions.required.description}">🎯 ${human.missions.required.points}pt</span>
    <span class="mission-badge" title="선택 미션: ${human.missions.optional.description}">⭐ ${human.missions.optional.points}pt</span>
  ` : '';

  el.innerHTML = `
    <div class="player-identity">
      <div class="name">${raceInfo.glyph} ${human.name}</div>
      <div class="race">${raceInfo.name}</div>
      <div class="hp-pips">${hpPips}</div>
    </div>
    <div class="mission-row">${missions}</div>
    <div class="hand">
      ${human.hand.length > 0 ? human.hand.map((c) => renderCard(c, ui?.selectedCardId === c.id)).join('') : '<span style="color:#6a5040;">(빈 손)</span>'}
    </div>
    <div class="action-buttons">
      <button id="btn-draw-two" ${human.hand.length > 4 ? 'disabled' : ''} title="행동 없이 2장 드로우 (손패 ≤ 4일 때만)">🂠 드로우 +2</button>
      <button id="btn-swap-missions" title="손패 전부 버리고 미션 2장 재배정">🔄 미션 교체</button>
    </div>
  `;
}

function renderCard(card, selected) {
  let name, meta, glyph;
  if (card.type === 'treasure') {
    const t = TREASURE_DEFS[card.treasure] ?? { name: card.treasure, meta: '', glyph: '💎' };
    name = t.name; meta = t.meta; glyph = t.glyph;
  } else {
    const def = CARD_DEFS[card.type];
    name = def.name; meta = def.meta(card); glyph = def.glyph;
  }
  const isTreasure = card.type === 'treasure';
  return `<div class="card ${isTreasure ? 'treasure' : ''} ${selected ? 'selected' : ''}" data-card-id="${card.id}">
    <div class="card-type">${glyph} ${name}</div>
    <div class="card-meta">${meta}</div>
  </div>`;
}
