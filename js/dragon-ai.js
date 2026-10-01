// Dragon AI — trivial now that all dragon cards are fixed-pattern row/column
// attacks with no targeting choice. Kept as a module so main.js can still
// pass a decision function into executeDragonTurn.
export function decideDragonAction(_state, _card) {
  return {};
}
