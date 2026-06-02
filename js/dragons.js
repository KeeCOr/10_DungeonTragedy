import { createRng } from './rng.js';

export const DRAGON_TYPES = [
  {
    id: 'fire',
    name: 'Fire Dragon',
    atlasClass: 'fire',
    maxHp: 12,
    element: 'Flame',
    gimmick: 'Pattern attacks deal +1 damage.',
  },
  {
    id: 'ice',
    name: 'Ice Dragon',
    atlasClass: 'ice',
    maxHp: 12,
    element: 'Frost',
    gimmick: 'Damaged players discard 1 card.',
  },
  {
    id: 'venom',
    name: 'Venom Dragon',
    atlasClass: 'venom',
    maxHp: 12,
    element: 'Poison',
    gimmick: 'Damaged players become poisoned for 1 round.',
  },
  {
    id: 'storm',
    name: 'Storm Dragon',
    atlasClass: 'storm',
    maxHp: 12,
    element: 'Lightning',
    gimmick: 'Dragon resolves 1 extra card each turn.',
  },
  {
    id: 'gold',
    name: 'Gold Dragon',
    atlasClass: 'gold',
    maxHp: 12,
    element: 'Radiance',
    gimmick: 'Starts with a 2-damage shield.',
  },
];

export function pickDragonType(seed, matchIndex) {
  const rng = createRng(seed + matchIndex * 4099 + 97);
  return rng.pick(DRAGON_TYPES);
}

export function getDragonType(id) {
  return DRAGON_TYPES.find((dragon) => dragon.id === id) ?? DRAGON_TYPES[0];
}
