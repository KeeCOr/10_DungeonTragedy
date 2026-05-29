import { createInitialState, startMatch } from './state.js';
import {
  rollTurnOrder, executePlayerAction, executeDragonTurn,
  endRound, checkMatchEnd, maybeTransitionPhase, applyTurnStartPassives,
} from './engine.js';
import { decideDragonAction } from './dragon-ai.js';
import { decideAllyAction } from './ally-ai.js';
import { scoreMatch } from './missions.js';
import { render, showCardPlayOverlay } from './render.js';
import { createInputController } from './input.js';
import {
  initAudio, toggleMute, isMuted,
  sfxAttack, sfxHeal, sfxDragonAttack, sfxCardDraw, sfxCardPlay,
  sfxPhaseTransition, sfxVictory, sfxDefeat, sfxMove,
} from './sound.js';

const RACE_INFO = {
  human: { name: '인간', glyph: '🧙' },
  elf:   { name: '엘프', glyph: '🧝' },
  dwarf: { name: '드워프', glyph: '🪓' },
  orc:   { name: '오크', glyph: '👹' },
};

// ── Start Screen ──
function showStartScreen() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'start-screen';
    overlay.innerHTML = `
      <div class="start-content">
        <div class="start-dragon">🐉</div>
        <h1 class="start-title">Dragon Tactics</h1>
        <p class="start-sub">3x5 보드 위의 턴제 카드 전술 게임</p>
        <div class="start-rules">
          <div class="rule-item">⚔️ 상단 행에서 용을 공격하세요</div>
          <div class="rule-item">🃏 카드를 사용하여 이동 · 공격 · 방어</div>
          <div class="rule-item">🎯 숨겨진 미션을 완수하여 점수 획득</div>
          <div class="rule-item">🏆 3매치 총점으로 최종 승자 결정</div>
        </div>
        <div class="start-player-select">
          <label class="start-label">파티 인원</label>
          <div class="start-buttons">
            <button class="start-btn" data-count="3">3인</button>
            <button class="start-btn selected" data-count="4">4인 (추천)</button>
            <button class="start-btn" data-count="5">5인</button>
          </div>
        </div>
        <button class="start-play-btn" id="start-play">▶ 게임 시작</button>
      </div>
    `;
    document.body.appendChild(overlay);

    let count = 4;
    overlay.querySelectorAll('.start-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.start-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        count = Number(btn.dataset.count);
      });
    });

    overlay.querySelector('#start-play').addEventListener('click', () => {
      overlay.classList.add('fade-out');
      setTimeout(() => { overlay.remove(); resolve(count); }, 500);
    });
  });
}

// ── Onboarding Overlay ──
function showOnboarding() {
  return new Promise((resolve) => {
    if (localStorage.getItem('dt-onboarding-done') === '1') { resolve(); return; }

    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';

    const slides = [
      {
        icon: '🃏',
        title: '카드 드래프트',
        body: `
          <p>매 라운드 시작 시 공용 덱에서 카드 3장을 받습니다.</p>
          <div class="ob-card-list">
            <div class="ob-card-item"><span class="ob-ci-icon">🚶</span><div><strong>이동 (Move)</strong> — 보드 위에서 칸을 이동합니다. Range 수치만큼 이동 가능합니다.</div></div>
            <div class="ob-card-item"><span class="ob-ci-icon">⚔️</span><div><strong>공격 (Attack)</strong> — 인접한 적 또는 상단 행에서 드래곤을 공격합니다.</div></div>
            <div class="ob-card-item"><span class="ob-ci-icon">🛡️</span><div><strong>방어 (Hide)</strong> — 이번 턴 피해를 무효화합니다.</div></div>
            <div class="ob-card-item"><span class="ob-ci-icon">💚</span><div><strong>회복 (Heal)</strong> — HP를 1 회복합니다.</div></div>
            <div class="ob-card-item"><span class="ob-ci-icon">📯</span><div><strong>도발 (Taunt)</strong> — 드래곤의 공격 목표를 자신에게 집중시킵니다.</div></div>
            <div class="ob-card-item"><span class="ob-ci-icon">💎</span><div><strong>보물 (Treasure)</strong> — 미션 보너스 점수 획득에 필요한 아이템입니다.</div></div>
          </div>
          <p class="ob-tip">턴에 카드 1장을 사용하거나, 카드 2장을 드로우할 수 있습니다.</p>
        `,
      },
      {
        icon: '🐉',
        title: '전투 시스템',
        body: `
          <p>3×5 보드에서 드래곤을 상대로 협력 전투를 펼칩니다.</p>
          <div class="ob-rules-grid">
            <div class="ob-rule-box">
              <div class="ob-rb-title">⚔️ 드래곤 공격</div>
              <div class="ob-rb-desc">상단 행(Row 0)에 위치할 때 Attack 카드로 드래곤을 공격할 수 있습니다. 엘프는 사거리 +1 보너스가 있습니다.</div>
            </div>
            <div class="ob-rule-box">
              <div class="ob-rb-title">🔴 드래곤 반격</div>
              <div class="ob-rb-desc">드래곤 카드에 표시된 행/열 패턴으로 예고 공격을 합니다. 위협 표시된 칸을 피하거나 Hide 카드로 막으세요.</div>
            </div>
            <div class="ob-rule-box">
              <div class="ob-rb-title">🔥 페이즈 변환</div>
              <div class="ob-rb-desc">드래곤 HP가 줄어들수록 페이즈 2·3으로 강화됩니다. 공격 패턴이 복잡해지고 피해도 커집니다.</div>
            </div>
            <div class="ob-rule-box">
              <div class="ob-rb-title">🏆 점수 획득</div>
              <div class="ob-rb-desc">드래곤에 입힌 피해 + 완수한 미션 수로 점수를 계산합니다. 3매치 합산으로 최종 순위를 결정합니다.</div>
            </div>
          </div>
        `,
      },
      {
        icon: '🧬',
        title: '종족별 특성',
        body: `
          <div class="ob-race-grid">
            <div class="ob-race-box">
              <div class="ob-race-icon">🧙</div>
              <div class="ob-race-name">인간</div>
              <div class="ob-race-hp">HP 5</div>
              <div class="ob-race-trait">매 턴 5% 확률로 카드 추가 드로우</div>
            </div>
            <div class="ob-race-box">
              <div class="ob-race-icon">🧝</div>
              <div class="ob-race-name">엘프</div>
              <div class="ob-race-hp">HP 5</div>
              <div class="ob-race-trait">공격 사거리 +1 보너스 — 원거리 공격 가능</div>
            </div>
            <div class="ob-race-box">
              <div class="ob-race-icon">🪓</div>
              <div class="ob-race-name">드워프</div>
              <div class="ob-race-hp">HP 6</div>
              <div class="ob-race-trait">최대 HP +1 — 가장 높은 내구력</div>
            </div>
            <div class="ob-race-box">
              <div class="ob-race-icon">👹</div>
              <div class="ob-race-name">오크</div>
              <div class="ob-race-hp">HP 5</div>
              <div class="ob-race-trait">공격 데미지 +1 보너스 — 높은 단일 공격력</div>
            </div>
          </div>
          <p class="ob-tip">종족은 매치마다 고정 순환으로 배정됩니다. 각 종족의 특성을 활용하는 전술을 짜보세요!</p>
        `,
      },
    ];

    let currentSlide = 0;

    function renderSlide() {
      const s = slides[currentSlide];
      const isLast = currentSlide === slides.length - 1;
      slideContainer.innerHTML = `
        <div class="ob-slide">
          <div class="ob-slide-icon">${s.icon}</div>
          <h2 class="ob-slide-title">${s.title}</h2>
          <div class="ob-slide-body">${s.body}</div>
        </div>
      `;
      dotsEl.querySelectorAll('.ob-dot').forEach((d, i) => {
        d.classList.toggle('active', i === currentSlide);
      });
      prevBtn.disabled = currentSlide === 0;
      nextBtn.textContent = isLast ? '이해했어요! ▶' : '다음 →';
      nextBtn.className = isLast ? 'ob-btn ob-btn-confirm' : 'ob-btn ob-btn-next';
    }

    overlay.innerHTML = `
      <div class="ob-panel">
        <div class="ob-header">
          <div class="ob-header-title">🐉 Dragon Tactics 가이드</div>
          <div class="ob-dots"></div>
        </div>
        <div class="ob-slide-container"></div>
        <div class="ob-footer">
          <button class="ob-btn ob-btn-prev" id="ob-prev">← 이전</button>
          <button class="ob-btn ob-btn-next" id="ob-next">다음 →</button>
        </div>
        <label class="ob-skip-label">
          <input type="checkbox" id="ob-no-show" />
          다음부터 표시 안 함
        </label>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    const slideContainer = overlay.querySelector('.ob-slide-container');
    const dotsEl = overlay.querySelector('.ob-dots');
    const prevBtn = overlay.querySelector('#ob-prev');
    const nextBtn = overlay.querySelector('#ob-next');

    // Build dots
    slides.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'ob-dot';
      dotsEl.appendChild(dot);
    });

    renderSlide();

    prevBtn.addEventListener('click', () => {
      if (currentSlide > 0) { currentSlide--; renderSlide(); }
    });

    nextBtn.addEventListener('click', () => {
      if (currentSlide < slides.length - 1) {
        currentSlide++;
        renderSlide();
      } else {
        if (overlay.querySelector('#ob-no-show').checked) {
          localStorage.setItem('dt-onboarding-done', '1');
        }
        overlay.classList.add('fade-out');
        setTimeout(() => { overlay.remove(); resolve(); }, 450);
      }
    });
  });
}

// ── Match Result Overlay ──
function showMatchResult(state, scores, matchIndex, reason) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'match-result-overlay';

    const reasonText = reason === 'dragon-dead' ? '🐉 용 처치 성공!'
      : reason === 'party-wipe' ? '💀 파티 전멸...'
      : '⏰ 시간 초과';

    const rows = scores
      .sort((a, b) => b.total - a.total)
      .map((s, i) => {
        const p = state.players.find((x) => x.id === s.playerId);
        const glyph = RACE_INFO[p?.race]?.glyph ?? '❓';
        const raceName = RACE_INFO[p?.race]?.name ?? p?.race;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        const isYou = p && !p.isAI;
        return `<tr class="${isYou ? 'is-you' : ''}">
          <td>${medal}</td>
          <td>${glyph} ${isYou ? '당신' : p?.name ?? s.playerId}</td>
          <td>${raceName}</td>
          <td class="score">${s.total}점</td>
          <td class="breakdown">${s.breakdown.map((b) => b.id).join(', ')}</td>
        </tr>`;
      }).join('');

    overlay.innerHTML = `
      <div class="match-result-content">
        <h2 class="mr-title">매치 ${matchIndex + 1}/3 종료</h2>
        <div class="mr-reason">${reasonText}</div>
        <table class="mr-table">
          <thead><tr><th></th><th>플레이어</th><th>종족</th><th>점수</th><th>내역</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <button class="mr-next-btn" id="mr-next">
          ${matchIndex < 2 ? '▶ 다음 매치' : '🏆 최종 결과 보기'}
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    overlay.querySelector('#mr-next').addEventListener('click', () => {
      overlay.classList.add('fade-out');
      setTimeout(() => { overlay.remove(); resolve(); }, 400);
    });
  });
}

// ── Game End Overlay ──
function showGameEnd(state) {
  const totals = {};
  for (const matchScoreList of state.matchScores) {
    for (const s of matchScoreList) {
      totals[s.playerId] = (totals[s.playerId] ?? 0) + s.total;
    }
  }
  const ranking = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const humanId = state.players.find((p) => !p.isAI)?.id;
  const humanRank = ranking.findIndex(([id]) => id === humanId) + 1;
  const isWinner = humanRank === 1;

  if (isWinner) sfxVictory(); else sfxDefeat();

  const overlay = document.createElement('div');
  overlay.className = 'game-end-overlay';

  const rows = ranking.map(([id, total], i) => {
    const p = state.players.find((x) => x.id === id);
    const glyph = RACE_INFO[p?.race]?.glyph ?? '❓';
    const isYou = p && !p.isAI;
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}위`;
    const matchScores = state.matchScores.map((ms) => {
      const s = ms.find((x) => x.playerId === id);
      return s ? s.total : 0;
    });
    return `<tr class="${isYou ? 'is-you' : ''}">
      <td class="rank">${medal}</td>
      <td>${glyph} ${isYou ? '당신' : p?.name ?? id}</td>
      <td>${matchScores[0]}</td>
      <td>${matchScores[1]}</td>
      <td>${matchScores[2]}</td>
      <td class="total-score">${total}</td>
    </tr>`;
  }).join('');

  overlay.innerHTML = `
    <div class="game-end-content">
      <div class="ge-icon">${isWinner ? '🏆' : '💀'}</div>
      <h1 class="ge-title">${isWinner ? '승리!' : `${humanRank}위`}</h1>
      <p class="ge-sub">${isWinner ? '당신이 최고의 전술가입니다!' : '다음엔 더 잘할 수 있을 거예요!'}</p>
      <table class="ge-table">
        <thead><tr><th></th><th>플레이어</th><th>M1</th><th>M2</th><th>M3</th><th>합계</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <button class="ge-restart-btn" id="ge-restart">🔄 다시 플레이</button>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  overlay.querySelector('#ge-restart').addEventListener('click', () => {
    overlay.remove();
    location.reload();
  });
}

// ── Sound detection helpers ──
function detectActionSound(prevState, nextState, actionType) {
  if (actionType === 'drawTwo' || actionType === 'discardAndRedraw') { sfxCardDraw(); return; }
  if (actionType === 'playCard') sfxCardPlay();

  if (nextState.dragon.hp < prevState.dragon.hp) sfxAttack();
  for (const np of nextState.players) {
    const old = prevState.players.find((p) => p.id === np.id);
    if (!old) continue;
    if (np.hp > old.hp) sfxHeal();
    if (np.hp < old.hp) sfxAttack();
  }
  if (nextState.players.some((p) => {
    const old = prevState.players.find((o) => o.id === p.id);
    return old && (p.position?.r !== old.position?.r || p.position?.c !== old.position?.c);
  })) sfxMove();
}

// ── Main Game ──
async function main() {
  initAudio();
  await showOnboarding();
  const playerCount = await showStartScreen();

  const SEED = Math.floor(Math.random() * 1e9);
  const PLAYERS = [
    { id: 'P0', name: 'You', isAI: false },
    ...Array.from({ length: playerCount - 1 }, (_, i) => ({
      id: `P${i + 1}`, name: `Ally${i + 1}`, isAI: true,
    })),
  ];

  let state = startMatch(createInitialState({ seed: SEED, players: PLAYERS }));
  state = rollTurnOrder(state);
  console.log(`Seed: ${SEED}`);

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
        if (action.type === 'playCard') {
          const human = state.players.find((p) => !p.isAI);
          const card = human?.hand.find((c) => c.id === action.cardId);
          if (card) showCardPlayOverlay(card);
        }
        const prev = state;
        state = executePlayerAction(state, action);
        detectActionSound(prev, state, action.type);
        smoothRender();
        scheduleStep(600);
      } catch (e) { console.warn(e.message); }
    },
  });
  input.attach();

  // Mute button
  const muteBtn = document.createElement('button');
  muteBtn.className = 'mute-btn';
  muteBtn.textContent = '🔊';
  muteBtn.title = '사운드 켜기/끄기';
  muteBtn.addEventListener('click', () => {
    const m = toggleMute();
    muteBtn.textContent = m ? '🔇' : '🔊';
  });
  document.getElementById('app').appendChild(muteBtn);

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
      const prev = state;
      state = executeDragonTurn(state, (s, card) => decideDragonAction(s, card));
      state = maybeTransitionPhase(state);
      if (state.dragon.phase !== prev.dragon.phase) sfxPhaseTransition();
      else sfxDragonAttack();
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
        const prev = state;
        state = executePlayerAction(state, action);
        detectActionSound(prev, state, action.type);
      } catch (e) {
        console.warn(e.message);
        try { state = executePlayerAction(state, { type: 'drawTwo', playerId: actorId }); }
        catch { state = { ...state, currentTurnIndex: state.currentTurnIndex + 1 }; }
      }
      smoothRender();
      scheduleStep(600);
      return;
    }
    smoothRender();
  }

  async function onMatchEnd(reason) {
    const finisher = state.lastDragonHitterId;
    const scores = scoreMatch(state, reason, finisher);
    const newScores = [...state.matchScores];
    newScores[state.matchIndex] = scores;
    state = { ...state, matchScores: newScores };
    console.log(`Match ${state.matchIndex + 1} ended: ${reason}`, scores);

    await showMatchResult(state, scores, state.matchIndex, reason);

    if (state.matchIndex >= 2) return showGameEnd(state);
    state = { ...state, matchIndex: state.matchIndex + 1 };
    state = startMatch(state);
    state = rollTurnOrder(state);
    smoothRender();
    scheduleStep(700);
  }

  smoothRender();
  scheduleStep(600);
}

main();
