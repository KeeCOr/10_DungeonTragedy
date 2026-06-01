import { createRng } from './rng.js';

export const DRAGON_TYPES = [
  { id: 'fire', name: '화염 용', atlasClass: 'fire', maxHp: 12, element: '불길' },
  { id: 'ice', name: '빙하 용', atlasClass: 'ice', maxHp: 12, element: '냉기' },
  { id: 'venom', name: '맹독 용', atlasClass: 'venom', maxHp: 12, element: '독기' },
  { id: 'storm', name: '폭풍 용', atlasClass: 'storm', maxHp: 12, element: '번개' },
  { id: 'gold', name: '황금 고룡', atlasClass: 'gold', maxHp: 12, element: '광휘' },
];

export function pickDragonType(seed, matchIndex) {
  const rng = createRng(seed + matchIndex * 4099 + 97);
  return rng.pick(DRAGON_TYPES);
}

export function getDragonType(id) {
  return DRAGON_TYPES.find((dragon) => dragon.id === id) ?? DRAGON_TYPES[0];
}
