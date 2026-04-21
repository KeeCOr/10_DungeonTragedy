export function createInputController({ getState, setState, render, onAction }) {
  const ui = { selectedCardId: null, validTargets: [], validTargetClass: 'move-target' };

  const getHuman = () => getState().players.find((p) => !p.isAI);

  function updateValidTargets() {
    const s = getState();
    const p = getHuman();
    if (!p || !ui.selectedCardId) { ui.validTargets = []; return; }
    const card = p.hand.find((c) => c.id === ui.selectedCardId);
    if (!card) { ui.validTargets = []; return; }
    const dp = s.dragon.position;
    const targets = [];
    if (card.type === 'move') {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
        if (r === dp.r && c === dp.c) continue;
        const d = Math.abs(p.position.r - r) + Math.abs(p.position.c - c);
        if (d >= 1 && d <= card.range) targets.push({ r, c });
      }
      ui.validTargetClass = 'move-target';
    } else if (card.type === 'attack') {
      const range = card.range + (p.race === 'elf' ? 1 : 0);
      const cells = [];
      if (Math.abs(p.position.r - dp.r) + Math.abs(p.position.c - dp.c) <= range) cells.push({ r: dp.r, c: dp.c });
      for (const other of s.players) {
        if (other.id === p.id || other.isEliminated) continue;
        if (Math.abs(p.position.r - other.position.r) + Math.abs(p.position.c - other.position.c) <= range) {
          cells.push({ r: other.position.r, c: other.position.c });
        }
      }
      ui.validTargets = cells;
      ui.validTargetClass = 'attack-target';
      return;
    } else if (card.type === 'heal') {
      targets.push({ r: p.position.r, c: p.position.c });
      for (const other of s.players) {
        if (other.id === p.id || other.isEliminated) continue;
        const d = Math.abs(p.position.r - other.position.r) + Math.abs(p.position.c - other.position.c);
        if (d === 1) targets.push({ r: other.position.r, c: other.position.c });
      }
      ui.validTargetClass = 'move-target';
    } else if (card.type === 'treasure' && card.treasure === 'cloak') {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
        if (r === dp.r && c === dp.c) continue;
        const d = Math.abs(p.position.r - r) + Math.abs(p.position.c - c);
        if (d >= 1 && d <= 2) targets.push({ r, c });
      }
      ui.validTargetClass = 'move-target';
    }
    ui.validTargets = targets;
  }

  function attach() {
    document.addEventListener('click', (ev) => {
      const cardEl = ev.target.closest('[data-card-id]');
      if (cardEl) {
        const id = cardEl.dataset.cardId;
        ui.selectedCardId = ui.selectedCardId === id ? null : id;
        const human = getHuman();
        const card = human.hand.find((c) => c.id === id);
        if (card && (card.type === 'hide' || card.type === 'scout' || card.type === 'taunt'
          || (card.type === 'treasure' && ['sword','potion','shield','rune'].includes(card.treasure)))) {
          const action = card.type === 'treasure' && card.treasure === 'sword'
            ? { type: 'playCard', playerId: human.id, cardId: id, target: { type: 'dragon' } }
            : { type: 'playCard', playerId: human.id, cardId: id };
          ui.selectedCardId = null;
          onAction(action);
          return;
        }
        updateValidTargets();
        render(getState(), ui);
        return;
      }
      const cell = ev.target.closest('.cell');
      if (cell && ui.selectedCardId) {
        const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
        if (!ui.validTargets.some((t) => t.r === r && t.c === c)) return;
        const human = getHuman();
        const card = human.hand.find((x) => x.id === ui.selectedCardId);
        let action;
        if (card.type === 'attack') {
          const s = getState();
          const occ = s.board[r][c];
          action = { type: 'playCard', playerId: human.id, cardId: card.id,
            target: occ === 'dragon' ? { type: 'dragon' } : { type: 'player', id: occ } };
        } else if (card.type === 'heal') {
          const s = getState();
          const occ = s.board[r][c];
          action = { type: 'playCard', playerId: human.id, cardId: card.id,
            target: occ === human.id ? { type: 'self' } : { type: 'player', id: occ } };
        } else {
          action = { type: 'playCard', playerId: human.id, cardId: card.id, target: { r, c } };
        }
        ui.selectedCardId = null;
        onAction(action);
        return;
      }
      if (ev.target.id === 'btn-draw-two') {
        onAction({ type: 'drawTwo', playerId: getHuman().id });
      } else if (ev.target.id === 'btn-swap-missions') {
        onAction({ type: 'discardAndSwapMissions', playerId: getHuman().id });
      }
    });
  }

  return { attach, ui };
}
