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

export function getDragonFirstEncounterBrief(id) {
  const dragon = getDragonType(id);
  const briefs = {
    fire: { role: 'burst punisher', arena: 'spread across rows', trial: 'survive one empowered pattern', roleKo: '폭발 공격 응징자', arenaKo: '행을 나눠 피해를 분산하세요', trialKo: '강화 패턴 1회를 생존하세요' },
    ice: { role: 'hand disruptor', arena: 'secure cards before taking hits', trial: 'finish a round without losing a key card', roleKo: '손패 교란자', arenaKo: '피격 전에 핵심 카드를 먼저 사용하세요', trialKo: '핵심 카드 손실 없이 한 라운드를 마치세요' },
    venom: { role: 'attrition hunter', arena: 'rotate damaged allies early', trial: 'avoid the first poison hit', roleKo: '지속 피해 추적자', arenaKo: '부상한 아군을 일찍 교대하세요', trialKo: '첫 독 공격을 피해 없이 넘기세요' },
    storm: { role: 'tempo attacker', arena: 'prepare for consecutive patterns', trial: 'answer two revealed cards in one turn', roleKo: '연속 패턴 압박자', arenaKo: '연속 공격에 대응할 카드를 남겨두세요', trialKo: '한 턴에 공개 카드 2장에 대응하세요' },
    gold: { role: 'armored endurance boss', arena: 'save burst for the broken shield', trial: 'break the shield before committing damage', roleKo: '장갑형 지구전 보스', arenaKo: '보호막 파괴 뒤 집중 공격을 사용하세요', trialKo: '본 공격 전에 보호막을 먼저 파괴하세요' },
  };
  return { ...dragon, ...briefs[dragon.id] };
}

export function evaluateDragonEncounterTrial(state) {
  const dragon = state?.dragon;
  const human = state?.players?.find((player) => !player.isAI);
  if (!dragon || !human) {
    return {
      passed: false,
      label: '과제 판정 불가',
      evidence: '플레이어 또는 드래곤 기록이 없습니다.',
      next: '새 매치에서 브리핑을 다시 확인하세요.',
    };
  }

  const damageTaken = human.missionProgress?.damageTaken ?? 0;
  const survived = !human.isEliminated;
  const brief = getDragonFirstEncounterBrief(dragon.type);
  const base = { label: brief.trialKo };

  if (dragon.type === 'fire') {
    const passed = damageTaken > 0 && survived;
    return {
      ...base,
      passed,
      evidence: passed ? `강화 패턴 피해 ${damageTaken}을 받고 생존했습니다.` : damageTaken === 0 ? '강화 패턴을 직접 버틴 기록이 없습니다.' : '강화 패턴 피해 후 생존하지 못했습니다.',
      next: passed ? '다음에는 분산 배치로 같은 피해를 더 줄여보세요.' : '예고된 패턴에 방어 수단을 준비하고 생존까지 확인하세요.',
    };
  }

  if (dragon.type === 'ice') {
    const passed = damageTaken === 0 && survived;
    return {
      ...base,
      passed,
      evidence: passed ? '피격 0으로 강제 카드 손실을 막았습니다.' : `누적 피해 ${damageTaken}으로 핵심 카드 손실 위험을 허용했습니다.`,
      next: passed ? '다음에는 남은 핵심 카드를 공격 전환에 사용하세요.' : '피격 예상 칸을 떠나거나 핵심 카드를 먼저 사용하세요.',
    };
  }

  if (dragon.type === 'venom') {
    const passed = damageTaken === 0 && survived;
    return {
      ...base,
      passed,
      evidence: passed ? '첫 독 공격을 포함해 피해를 받지 않았습니다.' : `누적 피해 ${damageTaken}으로 독 부여 기회를 허용했습니다.`,
      next: passed ? '다음에는 안전 칸에서 공격 기회를 늘려보세요.' : '첫 예고 범위에서 벗어나거나 방패·은신을 준비하세요.',
    };
  }

  if (dragon.type === 'storm') {
    const resolved = dragon.lastResolvedCount ?? 0;
    const passed = resolved >= 2 && survived;
    return {
      ...base,
      passed,
      evidence: passed ? `최근 활성화의 연속 카드 ${resolved}장에 대응하고 생존했습니다.` : `최근 활성화 대응 기록은 ${resolved}장입니다.`,
      next: passed ? '다음에도 두 번째 패턴까지 고려해 방어 카드를 남기세요.' : '첫 패턴에 자원을 전부 쓰지 말고 후속 패턴 대응을 남기세요.',
    };
  }

  const shieldBroken = (dragon.shield ?? 0) === 0;
  const hpDamageStarted = dragon.hp < dragon.maxHp;
  const passed = shieldBroken && hpDamageStarted;
  return {
    ...base,
    passed,
    evidence: passed ? '보호막을 모두 제거한 뒤 본체 HP 피해를 기록했습니다.' : shieldBroken ? '보호막은 제거했지만 본체 피해까지 이어지지 않았습니다.' : `보호막 ${dragon.shield ?? 0}이 남았습니다.`,
    next: passed ? '다음에는 보호막 파괴 직후 고화력 카드를 연결하세요.' : '약한 공격으로 보호막을 먼저 제거한 뒤 고화력 카드를 사용하세요.',
  };
}
