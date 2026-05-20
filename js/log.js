export function renderLog(state) {
  const el = document.getElementById('log-panel');
  if (!el) return;
  const entries = state.log.slice(-80);
  el.innerHTML = entries.map((e, i) =>
    `<div class="log-entry ${i === entries.length - 1 ? 'latest' : ''}">[R${e.round}] ${e.message}</div>`).join('');
  el.scrollTop = el.scrollHeight;
}
