import { renderLog } from './log.js';
import { getDragonCardPreview, DRAGON_LABEL } from './dragon.js';

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
  tome:   { name: '고대의 서적',  meta: '카드 2장 드로우',    glyph: '📜' },
};

const RACE_INFO = {
  human: { name: '인간',   glyph: '🧙' },
  elf:   { name: '엘프',   glyph: '🧝' },
  dwarf: { name: '드워프', glyph: '🪓' },
  orc:   { name: '오크',   glyph: '👹' },
};

const DRAGON_CARD_INFO = {
  'row-attack':   { name: '행 공격 🎲',     desc: (c) => c.rowIndex != null ? `행 ${c.rowIndex} 전체 2 피해` : '행 공격 (주사위로 결정)' },
  'col-attack':   { name: '열 공격 🎲',     desc: (c) => c.colIndex != null ? `열 ${c.colIndex} 전체 2 피해` : '열 공격 (주사위로 결정)' },
  'row-odd':      { name: '홀수 행 공격',   desc: () => '행 0+2 각 1 피해' },
  'row-even':     { name: '짝수 행 집중',   desc: () => '행 1 전체 2 피해' },
  'all':          { name: '전체 공격',      desc: () => '모든 칸 1 피해' },
  'frenzy':       { name: '광폭',           desc: () => '모든 칸 1 피해' },
  'corners':      { name: '네 모서리',      desc: () => '4개 모서리 각 2 피해' },
  'rest':         { name: '휴식',           desc: () => '이번 턴 행동 없음' },
  'roar':         { name: '위협',           desc: () => '다음 라운드 주사위 -1' },
};
function dragonCardLabel(card) {
  const info = DRAGON_CARD_INFO[card.type];
  if (!info) return { name: card.type, desc: '' };
  return { name: info.name, desc: typeof info.desc === 'function' ? info.desc(card) : info.desc };
}

// Track previous state for HP-change detection.
let prevState = null;
let lastRenderedActionEventId = null;

export function render(state, ui) {
  const dmgEvents = prevState ? computeDamageEvents(state, prevState) : [];
  const phaseChanged = prevState && prevState.dragon
    && state.dragon && prevState.dragon.phase !== state.dragon.phase
    ? state.dragon.phase : null;

  // Apply dragon-type class to #app so CSS can theme the board and overlays.
  const app = document.getElementById('app');
  if (app && state.dragon) {
    app.dataset.dragonType = state.dragon.type ?? 'fire';
  }

  renderHud(state);
  renderTurnPanel(state);
  renderDragonStrip(state, ui);
  renderBoard(state, ui);
  renderDragonPanel(state, ui);
  renderAllyInfo(state);
  renderMissionPanel(state);
  renderPlayerPanel(state, ui);
  renderLog(state);

  // Apply damage flash + floating numbers after DOM rebuild.
  requestAnimationFrame(() => {
    for (const ev of dmgEvents) applyDamageEffect(ev);
    if (phaseChanged != null) triggerPhaseTransition(phaseChanged);
    renderActionEvent(state);
  });

  prevState = state;
}

function renderActionEvent(state) {
  const ev = state.lastActionEvent;
  if (!ev || ev.id === lastRenderedActionEventId) return;
  const actor = state.players.find((p) => p.id === ev.actorId);
  if (actor && !actor.isAI) {
    lastRenderedActionEventId = ev.id;
    return;
  }
  lastRenderedActionEventId = ev.id;
  showActionToast(ev);
  pulseActionCells(ev);
}

function showActionToast(ev) {
  const app = document.getElementById('app');
  if (!app) return;
  app.querySelectorAll('.action-toast').forEach((el) => el.remove());
  const toast = document.createElement('div');
  toast.className = `action-toast ${ev.kind}`;
  toast.innerHTML = `
    <span class="action-toast-actor">${ev.actorName ?? ev.actorId}</span>
    <span class="action-toast-summary">${ev.summary}</span>
  `;
  app.appendChild(toast);
  setTimeout(() => toast.remove(), 1400);
}

function pulseActionCells(ev) {
  const addPulse = (cell, className) => {
    if (!cell) return;
    cell.classList.remove(className);
    void cell.offsetWidth;
    cell.classList.add(className);
    setTimeout(() => cell.classList.remove(className), 1150);
  };
  if (ev.from) addPulse(cellAt(ev.from), 'action-from');
  if (ev.to) addPulse(cellAt(ev.to), 'action-to');
  if (ev.target?.r != null && ev.target?.c != null) addPulse(cellAt(ev.target), 'action-to');
  if (ev.target?.type === 'dragon') {
    const strip = document.getElementById('dragon-strip');
    if (strip) addPulse(strip, 'action-to');
  }
}

function cellAt(pos) {
  return document.querySelector(`.cell[data-r="${pos.r}"][data-c="${pos.c}"]`);
}

function triggerPhaseTransition(phase) {
  document.body.classList.remove('phase-flash');
  void document.body.offsetWidth;
  document.body.classList.add('phase-flash');
  setTimeout(() => document.body.classList.remove('phase-flash'), 800);

  const overlay = document.createElement('div');
  overlay.className = 'phase-overlay';
  const label = phase >= 3 ? '광폭화' : '각성';
  overlay.innerHTML = `
    <div class="phase-overlay-text">PHASE ${phase}</div>
    <div class="phase-overlay-sub">용이 ${label}했다!</div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 1500);
}

function renderMissionPanel(state) {
  const el = document.getElementById('mission-panel');
  if (!el) return;
  const human = state.players.find((p) => !p.isAI);
  if (!human || !human.missions) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="mission-panel-title">🎯 내 미션</div>
    <div class="mission-card required" title="필수 미션">
      <div class="m-head">🎯 필수 · ${human.missions.required.points}pt</div>
      <div class="m-desc">${human.missions.required.description}</div>
    </div>
    <div class="mission-card optional" title="선택 미션">
      <div class="m-head">⭐ 선택 · ${human.missions.optional.points}pt</div>
      <div class="m-desc">${human.missions.optional.description}</div>
    </div>
  `;
}

function computeDamageEvents(next, prev) {
  const events = [];
  // Dragon
  if (prev.dragon && next.dragon && next.dragon.hp < prev.dragon.hp) {
    events.push({ kind: 'dragon', amount: prev.dragon.hp - next.dragon.hp });
  }
  // Players (compare by id)
  for (const np of next.players) {
    const old = prev.players.find((p) => p.id === np.id);
    if (!old) continue;
    if (np.hp < old.hp) {
      events.push({ kind: 'player', id: np.id, amount: old.hp - np.hp,
        r: np.position?.r, c: np.position?.c });
    } else if (np.hp > old.hp) {
      events.push({ kind: 'heal', id: np.id, amount: np.hp - old.hp,
        r: np.position?.r, c: np.position?.c });
    }
  }
  return events;
}

function applyDamageEffect(ev) {
  if (ev.kind === 'dragon') {
    const strip = document.getElementById('dragon-strip');
    if (strip) {
      strip.classList.remove('shake');
      void strip.offsetWidth; // reflow to restart animation
      strip.classList.add('shake');
      spawnDamageNumber(strip, `-${ev.amount}`, 'dmg');
    }
  } else if (ev.kind === 'player' || ev.kind === 'heal') {
    if (ev.r == null || ev.c == null) return;
    const cell = document.querySelector(`.cell[data-r="${ev.r}"][data-c="${ev.c}"]`);
    if (cell) {
      cell.classList.remove('shake');
      void cell.offsetWidth;
      cell.classList.add('shake');
      const type = ev.kind === 'heal' ? 'heal' : 'dmg';
      const text = ev.kind === 'heal' ? `+${ev.amount}` : `-${ev.amount}`;
      spawnDamageNumber(cell, text, type);
    }
  }
}

function spawnDamageNumber(anchor, text, type) {
  const el = document.createElement('div');
  el.className = `dmg-float ${type}`;
  el.textContent = text;
  anchor.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

function actorLabel(state, id) {
  if (id === 'dragon') return '🐉 용';
  const p = state.players?.find((x) => x.id === id);
  if (!p) return id;
  const glyph = RACE_INFO[p.race]?.glyph ?? '?';
  return `${glyph} ${p.isAI ? p.name : '당신'}`;
}

function renderTurnPanel(state) {
  const el = document.getElementById('turn-panel');
  if (!el) return;
  const actorId = state.turnOrder?.[state.currentTurnIndex];
  const actor = actorId === 'dragon'
    ? { id: 'dragon', name: state.dragon?.name ?? 'Dragon', race: 'dragon', hp: state.dragon?.hp, maxHp: state.dragon?.maxHp }
    : state.players.find((p) => p.id === actorId);
  const actorName = actorId === 'dragon'
    ? '용 차례'
    : actor?.isAI ? `${actor.name} 차례` : '당신 차례';
  el.innerHTML = `
    <div class="turn-panel-title">현재 턴</div>
    <div class="turn-current ${actorId === 'dragon' ? 'dragon' : ''}">
      <span class="${actorId === 'dragon' ? `dragon-mini ${state.dragon?.atlasClass ?? state.dragon?.type ?? 'fire'}` : `portrait-medallion ${actor?.race ?? 'human'}`}"></span>
      <div>
        <div class="turn-current-name">${actorName}</div>
        <div class="turn-current-hp">HP ${actor?.hp ?? '-'} / ${actor?.maxHp ?? '-'}</div>
      </div>
    </div>
    <div class="turn-roster">
      ${state.players.map((p) => `
        <div class="turn-roster-row ${p.id === actorId ? 'current' : ''} ${p.isEliminated ? 'eliminated' : ''}">
          <span class="portrait-medallion ${p.race}" title="${RACE_INFO[p.race]?.name ?? p.race}"></span>
          <span class="turn-roster-name">${p.isAI ? p.name : '당신'}</span>
          <span class="turn-roster-hp">${p.isEliminated ? 'OUT' : `${p.hp}/${p.maxHp}`}</span>
        </div>`).join('')}
    </div>
  `;
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
    <div class="hud-meta">매치 ${state.matchIndex + 1} · 처치 ${state.dragonKills ?? 0}/${state.targetDragonKills ?? 3} · 라운드 ${state.round} · 페이즈 ${state.dragon?.phase ?? '-'}</div>
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
  // threatCells: "r,c" -> { damage, firstOrder }
  // firstOrder is the 1-based index of the earliest revealed dragon card that
  // hits the cell, so the player can see which attack arrives first.
  const threatCells = new Map();
  (state.dragon.revealed ?? []).forEach((card, idx) => {
    const pv = getDragonCardPreview(card);
    if (!pv) return;
    for (const cell of pv.cells) {
      const key = `${cell.r},${cell.c}`;
      const prev = threatCells.get(key);
      const order = idx + 1;
      if (!prev) threatCells.set(key, { damage: pv.damage, firstOrder: order });
      else threatCells.set(key, { damage: prev.damage + pv.damage, firstOrder: Math.min(prev.firstOrder, order) });
    }
  });
  const drops = state.dragon.drops ?? [];
  // Highlight row 0 as the attack zone.
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r; cell.dataset.c = c;
      if (r === 0) cell.classList.add('attack-zone');
      const occ = state.board[r][c];
      let body = '';
      if (occ && occ !== 'dragon') {
        const p = state.players.find((x) => x.id === occ);
        const glyph = RACE_INFO[p?.race]?.glyph ?? '🧙';
        const isSelf = p && !p.isAI;
        if (isSelf) cell.classList.add('is-self');
        body = `<span class="token token-image ${p.race} ${isSelf ? 'token-self' : ''}"
                      style="view-transition-name: token-${p.id}"
                      title="${p.id} (${p.race}) HP ${p.hp}"><span class="token-glyph-fallback">${glyph}</span></span>`;
        body += `<span class="cell-hp">${p.hp}</span>`;
        if (isSelf) body += `<span class="self-ring"></span><span class="self-label">나</span>`;
      }
      body += `<span class="cell-coords">${r},${c}</span>`;
      const threat = threatCells.get(`${r},${c}`);
      if (threat) {
        body += `<span class="threat-order" title="${threat.firstOrder}번째 공격">#${threat.firstOrder}</span>`;
        body += `<span class="threat-marker">⚠ -${threat.damage}</span>`;
        cell.classList.add('threat');
        cell.classList.add(`threat-order-${threat.firstOrder}`);
      }
      const cellDrops = drops.filter((d) => d.r === r && d.c === c);
      if (cellDrops.length > 0) {
        const glyphs = cellDrops.map((d) => TREASURE_DEFS[d.card.treasure]?.glyph ?? '💎').join('');
        body += `<span class="drop-marker" title="떨어진 카드">${glyphs}</span>`;
        cell.classList.add('has-drop');
      }
      cell.innerHTML = body;
      if (state.dragon.markedCells.some((m) => m.r === r && m.c === c)) cell.classList.add('mark');
      if (ui?.validTargets?.some((t) => t.r === r && t.c === c)) cell.classList.add(ui.validTargetClass);
      board.appendChild(cell);
    }
  }
}

function renderDragonStrip(state, ui) {
  const el = document.getElementById('dragon-strip');
  if (!el) return;
  const d = state.dragon;
  if (!d) { el.innerHTML = ''; return; }
  el.classList.toggle('attackable', !!ui?.canAttackDragon);
  el.dataset.dragonType = d.type ?? 'fire';
  const newPips = [1, 2, 3].map((p) =>
    `<div class="phase-pip ${p <= d.phase ? 'active' : ''}"></div>`).join('');
  const newHint = ui?.canAttackDragon
    ? '지금 용을 공격할 수 있습니다.'
    : '상단 행에 있을 때 용을 공격할 수 있습니다.';
  el.innerHTML = `
    <div class="dstrip-left phase-${d.phase}">
      <div class="dragon-medallion ${d.atlasClass ?? d.type ?? 'fire'}"></div>
    </div>
    <div class="dstrip-center">
      <div class="dstrip-title-row">
        <div class="dstrip-title">${d.name ?? '용'}</div>
        <div class="dstrip-sub">${d.element ?? '용'} · 페이즈 ${d.phase}</div>
      </div>
      <div class="hp-bar">
        <div class="fill" style="width:${(d.hp / d.maxHp) * 100}%"></div>
        <div class="label">HP ${d.hp} / ${d.maxHp}</div>
      </div>
      <div class="dstrip-phase" title="${newHint}">
        ${newPips}
        <span>상단 행에서 공격</span>
      </div>
    </div>
  `;
  return;
  el.classList.toggle('dragon-ice', d.type === 'ice');
  const pips = [1, 2, 3].map((p) =>
    `<div class="phase-pip ${p <= d.phase ? 'active' : ''}"></div>`).join('');
  const hintBodyClean = ui?.canAttackDragon
    ? '지금 용을 공격할 수 있습니다.'
    : '상단 행에 있을 때 용을 공격할 수 있습니다.';
  const dragonName = d.type === 'ice' ? '빙하 용' : '용';
  const medallionClass = d.type === 'ice' ? 'dragon-medallion dragon-medallion-ice' : 'dragon-medallion';
  el.innerHTML = `
    <div class="dstrip-left phase-${d.phase}">
      <div class="${medallionClass}"></div>
    </div>
    <div class="dstrip-center">
      <div class="dstrip-title-row">
        <div class="dstrip-title">${dragonName}</div>
        <div class="dstrip-sub">페이즈 ${d.phase}</div>
      </div>
      <div class="hp-bar">
        <div class="fill" style="width:${(d.hp / d.maxHp) * 100}%"></div>
        <div class="label">HP ${d.hp} / ${d.maxHp}</div>
      </div>
      <div class="dstrip-phase" title="${hintBodyClean}">
        ${pips}
        <span>상단 행에서 공격</span>
      </div>
    </div>
  `;
  return;
  const phaseClass = `phase-${d.phase}`;
  const hintBody = ui?.canAttackDragon
    ? '지금 용을 클릭해 공격하세요!'
    : '⚠ 상단행(행 0)에 있을 때만 용을 공격할 수 있습니다.';
  el.innerHTML = `
    <div class="dstrip-left ${phaseClass}">
      <div class="dstrip-emoji">🐉</div>
      <div class="dstrip-title-wrap">
        <div class="dstrip-title">고대의 용</div>
        <div class="dstrip-sub">맵 밖에서 노려보는 중</div>
      </div>
    </div>
    <div class="dstrip-center">
      <div class="hp-bar">
        <div class="fill" style="width:${(d.hp / d.maxHp) * 100}%"></div>
        <div class="label">HP ${d.hp} / ${d.maxHp}</div>
      </div>
      <div class="dstrip-phase">
        ${pips}
        <span>페이즈 ${d.phase}</span>
      </div>
    </div>
    <div class="dstrip-right">
      <div class="dstrip-zone-hint">⚔️ 공격존: 상단행</div>
      <div>${hintBody}</div>
    </div>
  `;
}

function renderAllyInfo(state) {
  const logPanel = document.getElementById('log-panel');
  if (!logPanel) return;
  // Insert ally strip before log panel if not already present
  let strip = document.getElementById('ally-info');
  if (!strip) {
    strip = document.createElement('div');
    strip.id = 'ally-info';
    strip.className = 'ally-info-strip';
    logPanel.parentNode.insertBefore(strip, logPanel);
  }
  const allies = state.players.filter((p) => p.isAI);
  if (allies.length === 0) { strip.innerHTML = ''; return; }
  strip.innerHTML = allies.map((p) => {
    const glyph = RACE_INFO[p.race]?.glyph ?? '❓';
    const raceName = RACE_INFO[p.race]?.name ?? p.race;
    return `<div class="ally-card ${p.isEliminated ? 'eliminated' : ''}">
      <span class="portrait-medallion ${p.race}" title="${raceName}"></span>
      <span class="ally-name">${p.name}</span>
      <span class="ally-hand-count">🃏${p.hand.length}</span>
      <span class="ally-hp">${p.isEliminated ? '💀' : `❤️${p.hp}/${p.maxHp}`}</span>
    </div>`;
  }).join('');
}

function renderDragonPanel(state, ui) {
  const el = document.getElementById('dragon-panel');
  const d = state.dragon;
  if (!d) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="reveal-title">🐉 다음 공격 (카드 + 주사위)</div>
    <div class="revealed-cards">
      ${d.revealed.length > 0
        ? d.revealed.map((c, idx) => {
            const info = dragonCardLabel(c);
            return `<div class="revealed-card order-${idx + 1}" title="${info.desc}">
              <span class="rc-num">#${idx + 1}</span>
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
  el.className = isYour ? 'your-turn' : 'awaiting-turn';
  const raceInfo = RACE_INFO[human.race] ?? { name: human.race, glyph: '❓' };
  const hpPips = Array.from({ length: human.maxHp }, (_, i) =>
    `<div class="hp-pip ${i < human.hp ? '' : 'lost'}"></div>`).join('');

  const cardSelected = !!ui?.selectedCardId;
  const notYourTurn = !isYour;
  const drawDisabled   = notYourTurn || cardSelected || human.hand.length > 3;
  const redrawDisabled = notYourTurn || cardSelected || human.hand.length === 0;
  const swapDisabled   = notYourTurn || cardSelected || human.hand.length < 4;

  const tipPrefix = notYourTurn ? '상대 턴 대기중' : (cardSelected ? '카드 선택을 해제하세요' : '');
  const drawTip   = tipPrefix || '행동 없이 2장 드로우 (손패 ≤ 3일 때만)';
  const redrawTip = tipPrefix || '손패 전부 버리고 같은 수 새로 뽑기';
  const swapTip   = tipPrefix || '손패 4장을 버리고 미션 2장 재배정 (손패 ≥ 4 필요)';

  el.innerHTML = `
    <div class="player-identity ${isYour ? 'your-turn' : ''}">
      <div class="player-portrait-row">
        <span class="portrait-medallion ${human.race}" title="${raceInfo.name}"></span>
        <div>
          <div class="name">${human.name}</div>
          <div class="race">${raceInfo.name}</div>
        </div>
      </div>
      <div class="hp-pips" title="HP ${human.hp}/${human.maxHp}">${hpPips}</div>
      ${isYour
        ? '<div class="turn-mark">▶ 당신 차례<span class="one-action-hint">(행동 1회 후 턴 종료)</span></div>'
        : '<div class="turn-mark waiting">대기중...</div>'}
    </div>
    <div class="hand-wrap ${cardSelected ? 'choice-active' : ''}">
      <div class="hand-title">손패 <span class="hand-count">${human.hand.length}/5</span></div>
      <div class="hand-help">${cardSelected ? '대상을 선택하면 카드 사용으로 턴이 종료됩니다.' : '패를 1장 선택해 사용합니다.'}</div>
      <div class="hand">
        ${human.hand.length > 0
          ? human.hand.map((c) => renderCard(c, ui?.selectedCardId === c.id)).join('')
          : '<span class="muted">(빈 손)</span>'}
      </div>
    </div>
    <div class="turn-choice-panel ${cardSelected ? 'card-mode' : ''}">
      <div class="choice-panel-title">&#52852;&#46300; &#49324;&#50857; &#46608;&#45716; &#46300;&#47196;&#50864;</div>
      <div class="choice-panel-hint">${cardSelected ? '&#52852;&#46300;&#47484; &#50416;&#45716; &#51473;&#51060;&#46972; &#46300;&#47196;&#50864; &#49440;&#53469;&#51008; &#51104;&#44541;&#45768;&#45796;.' : '&#51060;&#48264; &#53556;&#50640;&#45716; &#50500;&#47000; &#54665;&#46041; &#51473; &#54616;&#45208;&#47564; &#49440;&#53469;&#54633;&#45768;&#45796;.'}</div>
      <div class="action-buttons">
      <button id="btn-draw-two" ${drawDisabled ? 'disabled' : ''} title="${drawTip}">
        🂠 드로우 +2
      </button>
      <button id="btn-redraw" ${redrawDisabled ? 'disabled' : ''} title="${redrawTip}">
        🔁 전체 재드로우
      </button>
      <button id="btn-swap-missions" ${swapDisabled ? 'disabled' : ''} title="${swapTip}">
        🔄 미션 교체 <span class="btn-cost">(-4장)</span>
      </button>
      </div>
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
  const cardKindClass = cardAssetClass(card);
  return `<div class="card card-${cardKindClass} ${isTreasure ? 'treasure' : ''} ${selected ? 'selected' : ''}"
               data-card-id="${card.id}">
    <div class="card-glyph"><span class="skill-icon ${cardKindClass}"></span><span class="glyph-fallback">${glyph}</span></div>
    <div class="card-name">${name}</div>
    <div class="card-meta">${meta}</div>
  </div>`;
}

function cardAssetClass(card) {
  if (card.type === 'treasure') {
    if (card.treasure === 'shield') return 'guard';
    if (card.treasure === 'sword') return 'attack';
    if (card.treasure === 'rune') return 'lightning';
    return 'fire';
  }
  if (card.type === 'move') return 'move';
  if (card.type === 'attack') return 'attack';
  if (card.type === 'hide') return 'guard';
  if (card.type === 'heal') return 'fire';
  if (card.type === 'scout') return 'lightning';
  if (card.type === 'taunt') return 'roar';
  return 'attack';
}

/** Displays a large version of the played card as a brief overlay. */
export function showCardPlayOverlay(card) {
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
  const overlay = document.createElement('div');
  overlay.className = 'card-play-overlay';
  overlay.innerHTML = `
    <div class="card-play-big ${isTreasure ? 'treasure' : ''}">
      <div class="cpb-glyph">${glyph}</div>
      <div class="cpb-name">${name}</div>
      <div class="cpb-meta">${meta}</div>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 900);
}
