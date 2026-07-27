import { renderLog } from './log.js';
import { getDragonCardPreview, getDragonActivationPreview, DRAGON_LABEL } from './dragon.js';

const CARD_DEFS = {
  move:   { name: 'Move',   meta: (c) => `Range ${c.range}`, glyph: 'M' },
  attack: { name: 'Attack', meta: (c) => `Range ${c.range}`, glyph: 'A' },
  hide:   { name: 'Hide',   meta: () => 'Reduce next hit', glyph: 'H' },
  heal:   { name: 'Heal',   meta: () => '+1 HP', glyph: '+' },
  scout:  { name: 'Scout',  meta: () => 'Reveal dragon card', glyph: 'S' },
  taunt:  { name: 'Taunt',  meta: () => 'Draw threat', glyph: 'T' },
};

const TREASURE_DEFS = {
  sword:  { name: 'Hero Sword', meta: '3 damage to dragon', glyph: 'SW' },
  potion: { name: 'Potion',     meta: 'Full heal',          glyph: 'P' },
  cloak:  { name: 'Cloak',      meta: 'Move 1-2 free',      glyph: 'C' },
  shield: { name: 'Shield',     meta: 'Block next hit',     glyph: 'SH' },
  rune:   { name: 'Rune',       meta: 'Next roll +2',       glyph: 'R' },
  tome:   { name: 'Tome',       meta: 'Draw 2 cards',       glyph: 'T' },
};

const RACE_INFO = {
  human: { name: 'Human', glyph: 'H' },
  elf:   { name: 'Elf',   glyph: 'E' },
  dwarf: { name: 'Dwarf', glyph: 'D' },
  orc:   { name: 'Orc',   glyph: 'O' },
};

const DRAGON_CARD_INFO = {
  'row-attack': { name: 'Row attack',    desc: (c) => c.rowIndex != null ? `Row ${c.rowIndex}: 2 damage` : 'Random row: 2 damage' },
  'col-attack': { name: 'Column attack', desc: (c) => c.colIndex != null ? `Column ${c.colIndex}: 2 damage` : 'Random column: 2 damage' },
  'row-odd':    { name: 'Outer rows',    desc: () => 'Rows 0 and 2: 1 damage' },
  'row-even':   { name: 'Middle row',    desc: () => 'Row 1: 2 damage' },
  'all':        { name: 'All board',     desc: () => 'Every cell: 1 damage' },
  'frenzy':     { name: 'Frenzy',        desc: () => 'Every cell: 1 damage' },
  'corners':    { name: 'Corners',       desc: () => 'Four corners: 2 damage' },
  'rest':       { name: 'Rest',          desc: () => 'No action' },
  'roar':       { name: 'Roar',          desc: () => 'Next round player rolls -1' },
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
  const label = phase >= 3 ? 'Frenzy' : 'Awakened';
  overlay.innerHTML = `
    <div class="phase-overlay-text">PHASE ${phase}</div>
    <div class="phase-overlay-sub">Dragon is ${label}!</div>
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
    <div class="mission-panel-title">Hidden Missions</div>
    <div class="mission-card required" title="Required mission">
      <div class="m-head">Required - ${human.missions.required.points}pt</div>
      <div class="m-desc">${human.missions.required.description}</div>
    </div>
    <div class="mission-card optional" title="Optional mission">
      <div class="m-head">Optional - ${human.missions.optional.points}pt</div>
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
  if (id === 'dragon') return 'Dragon';
  const p = state.players?.find((x) => x.id === id);
  if (!p) return id;
    const glyph = RACE_INFO[p.race]?.glyph ?? '?';
  return `${glyph} ${p.isAI ? p.name : 'You'}`;
}

function renderTurnPanel(state) {
  const el = document.getElementById('turn-panel');
  if (!el) return;
  const actorId = state.turnOrder?.[state.currentTurnIndex];
  const actor = actorId === 'dragon'
    ? { id: 'dragon', name: state.dragon?.name ?? 'Dragon', race: 'dragon', hp: state.dragon?.hp, maxHp: state.dragon?.maxHp }
    : state.players.find((p) => p.id === actorId);
  const actorName = actorId === 'dragon'
    ? 'Dragon turn'
    : actor?.isAI ? `${actor.name} turn` : 'Your turn';
  el.innerHTML = `
    <div class="turn-panel-title">Current Turn</div>
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
          <span class="turn-roster-name">${p.isAI ? p.name : 'You'}</span>
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
    ? `<span class="turn-banner ${isYou ? 'your-turn' : ''}">${isYou ? 'Your turn' : `${actorLabel(state, actor)} turn`}</span>`
    : '';
  hud.innerHTML = `
    <div class="hud-title">Dragon Tactics</div>
    <div class="hud-meta">Match ${state.matchIndex + 1} / 3 - Kills ${state.dragonKills ?? 0}/${state.targetDragonKills ?? 3} - Round ${state.round} - Phase ${state.dragon?.phase ?? '-'}</div>
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
        const glyph = RACE_INFO[p?.race]?.glyph ?? '?';
        const isSelf = p && !p.isAI;
        if (isSelf) cell.classList.add('is-self');
        body = `<span class="token token-image ${p.race} ${isSelf ? 'token-self' : ''}"
                      style="view-transition-name: token-${p.id}"
                      title="${p.id} (${p.race}) HP ${p.hp}"><span class="token-glyph-fallback">${glyph}</span></span>`;
        body += `<span class="cell-hp">${p.hp}</span>`;
        if (isSelf) body += `<span class="self-ring"></span><span class="self-label">YOU</span>`;
      }
      body += `<span class="cell-coords">${r},${c}</span>`;
      const threat = threatCells.get(`${r},${c}`);
      if (threat) {
        const threatOrder = Math.min(threat.firstOrder, 3);
        body += `<span class="threat-decal threat-decal-${threatOrder}" aria-hidden="true"></span>`;
        body += `<span class="threat-order" title="Dragon attack order ${threat.firstOrder}">#${threat.firstOrder}</span>`;
        body += `<span class="threat-marker" title="Expected damage">-${threat.damage}</span>`;
        cell.classList.add('threat');
        cell.classList.add(`threat-order-${threatOrder}`);
      }
      const cellDrops = drops.filter((d) => d.r === r && d.c === c);
      if (cellDrops.length > 0) {
        const glyphs = cellDrops.map((d) => TREASURE_DEFS[d.card.treasure]?.glyph ?? '?').join('');
        body += `<span class="drop-marker" title="Dropped treasure">${glyphs}</span>`;
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
  const pips = [1, 2, 3].map((p) =>
    `<div class="phase-pip ${p <= d.phase ? 'active' : ''}"></div>`).join('');
  const hint = ui?.canAttackDragon
    ? 'You can attack the dragon now.'
    : 'Move to row 0 to attack the dragon.';
  el.innerHTML = `
    <div class="dstrip-left phase-${d.phase}">
      <div class="dragon-medallion ${d.atlasClass ?? d.type ?? 'fire'}"></div>
    </div>
    <div class="dstrip-center">
      <div class="dragon-fullbody ${d.atlasClass ?? d.type ?? 'fire'}"></div>
      <div class="dstrip-title-row">
        <div class="dstrip-title">${d.name ?? 'Dragon'}</div>
        <div class="dstrip-sub">${d.element ?? 'Element'} - Phase ${d.phase}${d.shield ? ` - Shield ${d.shield}` : ''}</div>
      </div>
      <div class="dstrip-gimmick">${d.gimmick ?? ''}</div>
      <div class="hp-bar">
        <div class="fill" style="width:${(d.hp / d.maxHp) * 100}%"></div>
        <div class="label">HP ${d.hp} / ${d.maxHp}</div>
      </div>
      <div class="dstrip-phase" title="${hint}">
        ${pips}
        <span>Attack from top row</span>
      </div>
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
    const glyph = RACE_INFO[p.race]?.glyph ?? '?';
    const raceName = RACE_INFO[p.race]?.name ?? p.race;
    return `<div class="ally-card ${p.isEliminated ? 'eliminated' : ''}">
      <span class="portrait-medallion ${p.race}" title="${raceName}"></span>
      <span class="ally-name">${p.name}</span>
      <span class="ally-hand-count">Cards ${p.hand.length}</span>
      <span class="ally-hp">${p.isEliminated ? 'OUT' : `HP ${p.hp}/${p.maxHp}`}</span>
    </div>`;
  }).join('');
}

function impactRiskLabel(count) {
  if (count <= 0) return 'Safe';
  if (count === 1) return 'Focused';
  return 'Party danger';
}

function renderImpactMetrics(kind, damage, riskCount, delta = null) {
  const deltaText = delta == null ? '' : `<span class="impact-metric delta">Delta vs forecast ${delta >= 0 ? '+' : ''}${delta}</span>`;
  return `<div class="impact-metrics ${kind}-metric">
    <span class="impact-metric">Damage ${damage}</span>
    <span class="impact-metric">Risk ${impactRiskLabel(riskCount)}</span>
    ${deltaText}
  </div>`;
}

function renderActivationPreview(state) {
  const preview = getDragonActivationPreview(state);
  if (!preview || preview.cards.length === 0) {
    return '<div class="dragon-impact-panel muted">Preview: no dragon card queued.</div>';
  }
  const players = preview.affectedPlayers.length > 0
    ? preview.affectedPlayers.map((p) => {
        const mitigation = p.mitigation ? ` (${p.mitigation})` : '';
        return `<span class="impact-chip">${p.name ?? p.id}: -${p.expectedDamage}${mitigation}</span>`;
      }).join('')
    : '<span class="impact-chip safe">No player hit</span>';
  return `<div class="dragon-impact-panel preview">
    <div class="impact-head"><span>Preview</span><strong>Expected -${preview.totalExpectedDamage}</strong></div>
    ${renderImpactMetrics('forecast', preview.totalExpectedDamage, preview.affectedPlayers.length)}
    <div class="impact-list">${players}</div>
  </div>`;
}

function renderActivationSummary(state) {
  const summary = state.dragon?.lastActivationSummary;
  if (!summary || summary.resolvedCards.length === 0) return '';
  const players = summary.affectedPlayers.length > 0
    ? summary.affectedPlayers.map((p) => `<span class="impact-chip">${p.name ?? p.id}: -${p.damageTaken}${p.eliminated ? ' OUT' : ''}</span>`).join('')
    : '<span class="impact-chip safe">No damage dealt</span>';
  return `<div class="dragon-impact-panel summary">
    <div class="impact-head"><span>Last result</span><strong>Actual -${summary.totalDamageDealt}</strong></div>
    ${renderImpactMetrics('actual', summary.totalDamageDealt, summary.affectedPlayers.length, summary.damageDelta)}
    <div class="impact-list">${players}</div>
  </div>`;
}function renderDragonPanel(state, ui) {
  const el = document.getElementById('dragon-panel');
  const d = state.dragon;
  if (!d) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="reveal-title">Dragon activation</div>
    ${renderActivationPreview(state)}
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
        : '<span class="muted">(readying)</span>'}
    </div>
    ${renderActivationSummary(state)}
  `;
}
function renderPlayerPanel(state, ui) {
  const human = state.players.find((p) => !p.isAI);
  const el = document.getElementById('player-panel');
  if (!human) { el.innerHTML = ''; return; }

  const isYour = state.turnOrder?.[state.currentTurnIndex] === human.id;
  el.className = isYour ? 'your-turn' : 'awaiting-turn';
  const raceInfo = RACE_INFO[human.race] ?? { name: human.race, glyph: '?' };
  const hpPips = Array.from({ length: human.maxHp }, (_, i) =>
    `<div class="hp-pip ${i < human.hp ? '' : 'lost'}"></div>`).join('');

  const cardSelected = !!ui?.selectedCardId;
  const notYourTurn = !isYour;
  const drawDisabled = notYourTurn || cardSelected || human.hand.length > 3;
  const redrawDisabled = notYourTurn || cardSelected || human.hand.length === 0;
  const swapDisabled = notYourTurn || cardSelected || human.hand.length < 4;

  const tipPrefix = notYourTurn ? 'Waiting for your turn' : (cardSelected ? 'Finish selected card first' : '');
  const drawTip = tipPrefix || 'Draw 2 cards when hand has 3 or fewer cards';
  const redrawTip = tipPrefix || 'Discard hand and draw the same count';
  const swapTip = tipPrefix || 'Discard 4 cards to swap missions';

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
        ? '<div class="turn-mark">Your turn <span class="one-action-hint">(one action ends turn)</span></div>'
        : '<div class="turn-mark waiting">Waiting...</div>'}
    </div>
    <div class="hand-wrap ${cardSelected ? 'choice-active' : ''}">
      <div class="hand-title">Hand <span class="hand-count">${human.hand.length}/5</span></div>
      <div class="hand-help">${cardSelected ? 'Pick a target to play the selected card.' : 'Select one card to use it.'}</div>
      <div class="hand">
        ${human.hand.length > 0
          ? human.hand.map((c) => renderCard(c, ui?.selectedCardId === c.id)).join('')
          : '<span class="muted">(empty)</span>'}
      </div>
    </div>
    <div class="turn-choice-panel ${cardSelected ? 'card-mode' : ''}">
      <div class="choice-panel-title">Card use or draw</div>
      <div class="choice-panel-hint">${cardSelected ? 'Draw choices are locked while a card is selected.' : 'Choose exactly one action this turn.'}</div>
      <div class="action-buttons">
        <button id="btn-draw-two" ${drawDisabled ? 'disabled' : ''} title="${drawTip}">Draw +2</button>
        <button id="btn-redraw" ${redrawDisabled ? 'disabled' : ''} title="${redrawTip}">Redraw hand</button>
        <button id="btn-swap-missions" ${swapDisabled ? 'disabled' : ''} title="${swapTip}">Swap missions <span class="btn-cost">(-4)</span></button>
      </div>
    </div>
  `;
}
function renderCard(card, selected) {
  let name, meta, glyph;
  let isTreasure = false;
  if (card.type === 'treasure') {
    isTreasure = true;
    const t = TREASURE_DEFS[card.treasure] ?? { name: card.treasure, meta: '', glyph: '?' };
    name = t.name; meta = t.meta; glyph = t.glyph;
  } else {
    const def = CARD_DEFS[card.type] ?? { name: card.type, meta: () => '', glyph: '?' };
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
    const t = TREASURE_DEFS[card.treasure] ?? { name: card.treasure, meta: '', glyph: '?' };
    name = t.name; meta = t.meta; glyph = t.glyph;
  } else {
    const def = CARD_DEFS[card.type] ?? { name: card.type, meta: () => '', glyph: '?' };
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
