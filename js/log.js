export function renderLog(state) {
  const el = document.getElementById('log-panel');
  if (!el) return;
  el.innerHTML = state.log.slice(-80).map((e) =>
    `<div class="log-entry">[R${e.round}] ${e.message}</div>`).join('');
  el.scrollTop = el.scrollHeight;
}
