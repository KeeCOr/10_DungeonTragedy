import { renderLog } from './log.js';

const CARD_DEFS = {
  move:   { name: '이동',     meta: (c) => `사거리 ${c.range}`, glyph: '👣' },
  attack: { name: '공격',     meta: (c) => `사거리 ${c.range}`, glyph: '⚔️' },
  hide:   { name: '숨기',     meta: () => '이번 라운드', glyph: '🛡️' },
  heal:   { name: '응급처치', meta: () => '+1 HP', glyph: '❤️‍🩹' },
  scout:  { name: '정찰',     meta: () => '용 카드 공개', glyph: '👁️' },
  taunt:  { name: '도발',     meta: () => '타겟 유도', glyph: '📣' },
};

const TREASURE_DEFS = {
  sword:  { name: '용사의 검',    meta: '용에 3 피해',       glyph: '🗡️' },
  potion: { name: '생명의 물약',  meta: 'HP 완전 회복',      glyph: '🧪' },
  cloak:  { name: '바람의 망토',  meta: '1~2칸 공짜 이동',    glyph: '🌬️' },
  shield: { name: '용비늘 방패',  meta: '다음 피격 무효',     glyph: '🛡️' },
  rune:   { name: '고대 룬',      meta: '다음 주사위 +2',     glyph: '🔮' },
};

const RACE_INFO = {
  human: { name: '인간',   glyph: '🧙' },
  elf:   { name: '엘프',   glyph: '🧝' },
  dwarf: { name: '드워프', glyph: '🪓' },
  orc:   { name: '오크',   glyph: '👹' },
};

const DRAGON_CARD_INFO = {
  bite:       { name: '물기',        desc: '인접 대상 1 피해' },
  breath:     { name: '화염 숨결',   desc: '직선 2 피해 · 숨기 가능' },
  tail:       { name: '꼬리치기',   desc: '8방향 인접 1 피해' },
  wings:      { name: '날개짓',     desc: '전원 밀어내기' },
  roar:       { name: '위협',       desc: '다음 라운드 주사위 -1' },
  piercing:   { name: '관통 화염',   desc: '행/열 관통 1 피해' },
  charge:     { name: '돌진',       desc: '2칸 이동 + 2 피해' },
  mark:       { name: '지정 표식',   desc: '1턴 뒤 범위 2 피해' },
  frenzy:     { name: '광폭',       desc: '전 유저 1 피해' },
  reposition: { name: '재배치',     desc: '중앙 복귀' },
};

export function render(state, ui) {
  renderHud(state);
  renderBoard(state, ui);
  renderDragonPanel(state);
  renderPlayerPanel(state, ui);
  renderLog(state);
}

function actorLabel(state, id) {
  if (id === 'dragon') return '🐉 용';
  const p = state.players?.find((x) => x.id === id);
  if (!p) return id;
  const glyph = RACE_INFO[p.race]?.glyph ?? '?';
  return `${glyph} ${p.isAI ? p.name : '당신'}`;
}

function renderHud(state) {
  const hud = document.getElementById('hud');
  const actor = state.turnOrder?.[state.currentTurnIndex];
  const isYou = !!state.players.find((p) => p.id === actor && !p.isAI);
  const turnBanner = actor
    ? `<span class="turn-banner ${isYou ? 'your-turn' : ''}">${isYou ? '▶ 당신 차례' : `${actorLabel(state, actor)} 차례`}</span>`
    : '';
  hud.innerHTML = `
    <div class="hud-title">🐉 Dragon Tactics</div>
    <div class="hud-meta">매치 ${state.matchIndex + 1}/3 · 라운드 ${state.round} · 페이즈 ${state.dragon?.phase ?? '-'}</div>
    ${turnBanner}
    <div class="turn-order">
      ${(state.turnOrder ?? []).map((id, i) =>
        `<div class="turn-slot ${i === state.currentTurnIndex ? 'current' : ''}">${actorLabel(state, id)}</div>`).join('')}
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
        // Dragon is rendered OUTSIDE the grid. Show a lair marker only.
        body = `<span class="lair-marker" title="용의 자리 (중앙)">🔥</span>`;
        cell.classList.add('dragon-lair');
      } else if (occ) {
        const p = state.players.find((x) => x.id === occ);
        const glyph = RACE_INFO[p?.race]?.glyph ?? '🧙';
        const isSelf = p && !p.isAI;
        body = `<span class="token ${isSelf ? 'token-self' : ''}"
                      style="view-transition-name: token-${p.id}"
                      title="${p.id} (${p.race}) HP ${p.hp}">${glyph}</span>`;
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
  const phaseClass = `phase-${d.phase}`;
  el.innerHTML = `
    <div class="dragon-portrait ${phaseClass}">
      <div class="dragon-emoji">🐉</div>
      <div class="dragon-pos">좌표 ${d.position.r},${d.position.c}</div>
    </div>
    <h2>고대의 용</h2>
    <div class="hp-bar">
      <div class="fill" style="width:${(d.hp / d.maxHp) * 100}%"></div>
      <div class="label">${d.hp} / ${d.maxHp}</div>
    </div>
    <div class="phase-row">
      ${pips}
      <span class="phase-text">페이즈 ${d.phase}</span>
    </div>
    <div class="reveal-title">다음 행동 (${d.revealed.length}장):</div>
    <div class="revealed-cards">
      ${d.revealed.length > 0
        ? d.revealed.map((c) => {
            const info = DRAGON_CARD_INFO[c.type] ?? { name: c.type, desc: '' };
            return `<div class="revealed-card" title="${info.desc}">
              <div class="rc-name">${info.name}</div>
              <div class="rc-desc">${info.desc}</div>
            </div>`;
          }).join('')
        : '<span class="muted">(준비중)</span>'}
    </div>
  `;
}

function renderPlayerPanel(state, ui) {
  const human = state.players.find((p) => !p.isAI);
  const el = document.getElementById('player-panel');
  if (!human) { el.innerHTML = ''; return; }

  const isYour = state.turnOrder?.[state.currentTurnIndex] === human.id;
  const raceInfo = RACE_INFO[human.race] ?? { name: human.race, glyph: '❓' };
  const hpPips = Array.from({ length: human.maxHp }, (_, i) =>
    `<div class="hp-pip ${i < human.hp ? '' : 'lost'}"></div>`).join('');

  const missionHtml = human.missions ? `
    <div class="mission-card required" title="필수 미션">
      <div class="m-head">🎯 필수 · ${human.missions.required.points}pt</div>
      <div class="m-desc">${human.missions.required.description}</div>
    </div>
    <div class="mission-card optional" title="선택 미션">
      <div class="m-head">⭐ 선택 · ${human.missions.optional.points}pt</div>
      <div class="m-desc">${human.missions.optional.description}</div>
    </div>` : '';

  const cardSelected = !!ui?.selectedCardId;
  const drawDisabled = human.hand.length > 3 || cardSelected;
  const swapDisabled = cardSelected || human.hand.length === 0;

  el.innerHTML = `
    <div class="player-identity ${isYour ? 'your-turn' : ''}">
      <div class="name">${raceInfo.glyph} ${human.name}</div>
      <div class="race">${raceInfo.name}</div>
      <div class="hp-pips" title="HP ${human.hp}/${human.maxHp}">${hpPips}</div>
      ${isYour ? '<div class="turn-mark">▶ 당신 차례</div>' : '<div class="turn-mark waiting">대기중...</div>'}
    </div>
    <div class="missions-col">${missionHtml}</div>
    <div class="hand-wrap">
      <div class="hand-title">손패 <span class="hand-count">${human.hand.length}/5</span></div>
      <div class="hand">
        ${human.hand.length > 0
          ? human.hand.map((c) => renderCard(c, ui?.selectedCardId === c.id)).join('')
          : '<span class="muted">(빈 손)</span>'}
      </div>
    </div>
    <div class="action-buttons">
      <button id="btn-draw-two" ${drawDisabled ? 'disabled' : ''}
        title="${cardSelected ? '카드 선택을 해제하세요' : '행동 없이 2장 드로우 (손패 ≤ 3일 때만)'}">
        🂠 드로우 +2
      </button>
      <button id="btn-swap-missions" ${swapDisabled ? 'disabled' : ''}
        title="${cardSelected ? '카드 선택을 해제하세요' : '손패 전부 버리고 미션 2장 재배정'}">
        🔄 미션 교체
      </button>
    </div>
  `;
}

function renderCard(card, selected) {
  let name, meta, glyph;
  let isTreasure = false;
  if (card.type === 'treasure') {
    isTreasure = true;
    const t = TREASURE_DEFS[card.treasure] ?? { name: card.treasure, meta: '', glyph: '💎' };
    name = t.name; meta = t.meta; glyph = t.glyph;
  } else {
    const def = CARD_DEFS[card.type] ?? { name: card.type, meta: () => '', glyph: '❓' };
    name = def.name; meta = def.meta(card); glyph = def.glyph;
  }
  return `<div class="card ${isTreasure ? 'treasure' : ''} ${selected ? 'selected' : ''}"
               data-card-id="${card.id}">
    <div class="card-glyph">${glyph}</div>
    <div class="card-name">${name}</div>
    <div class="card-meta">${meta}</div>
  </div>`;
}
