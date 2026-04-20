export const TREASURES = ['sword', 'potion', 'cloak', 'shield', 'rune'];

let _id = 0;
const mk = (type, extras = {}) => ({ id: `${type}-${extras.range ?? extras.treasure ?? ''}${_id++}`, type, ...extras });

export function buildPlayerDeck() {
  _id = 0;
  const deck = [];
  for (let i = 0; i < 6; i++) deck.push(mk('move', { range: 1 }));
  for (let i = 0; i < 4; i++) deck.push(mk('move', { range: 2 }));
  for (let i = 0; i < 2; i++) deck.push(mk('move', { range: 3 }));
  for (let i = 0; i < 6; i++) deck.push(mk('attack', { range: 1 }));
  for (let i = 0; i < 4; i++) deck.push(mk('attack', { range: 2 }));
  for (let i = 0; i < 2; i++) deck.push(mk('attack', { range: 3 }));
  for (let i = 0; i < 4; i++) deck.push(mk('hide'));
  for (let i = 0; i < 3; i++) deck.push(mk('heal'));
  for (let i = 0; i < 2; i++) deck.push(mk('scout'));
  for (let i = 0; i < 2; i++) deck.push(mk('taunt'));
  for (const t of TREASURES) deck.push(mk('treasure', { treasure: t }));
  return deck;
}

export function drawFromDeck(deck, discard, rng) {
  if (deck.length === 0 && discard.length === 0) {
    return { drawn: null, deck, discard };
  }
  if (deck.length === 0) {
    const reshuffled = rng.shuffle(discard);
    const [drawn, ...rest] = reshuffled;
    return { drawn, deck: rest, discard: [] };
  }
  const [drawn, ...rest] = deck;
  return { drawn, deck: rest, discard };
}
