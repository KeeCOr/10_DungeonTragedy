export const RACES = {
  human: { id: 'human', name: '인간', maxHp: 5, extraDrawChance: 0.05, attackDamageBonus: 0, attackRangeBonus: 0 },
  elf:   { id: 'elf',   name: '엘프', maxHp: 5, extraDrawChance: 0,    attackDamageBonus: 0, attackRangeBonus: 1 },
  dwarf: { id: 'dwarf', name: '드워프', maxHp: 6, extraDrawChance: 0,  attackDamageBonus: 0, attackRangeBonus: 0 },
  orc:   { id: 'orc',   name: '오크',  maxHp: 5, extraDrawChance: 0,  attackDamageBonus: 1, attackRangeBonus: 0 },
};

export const getRace = (id) => RACES[id];
export const baseMaxHp = (id) => RACES[id].maxHp;
export const attackDamageBonus = (id) => RACES[id].attackDamageBonus;
export const attackRangeBonus = (id) => RACES[id].attackRangeBonus;
export const extraDrawChance = (id) => RACES[id].extraDrawChance;
export const allRaceIds = () => Object.keys(RACES);
