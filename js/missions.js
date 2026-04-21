// Mission definitions per spec section 3.
// Each: id, description, points, ownership ('common' | race), requiredOnly?,
//       targetRace? (only eligible if that race is present).

export const MISSIONS = [
  // Common (7)
  { id: 'common-attack-5',        description: '공격 카드 5회 사용',                 points: 2, ownership: 'common' },
  { id: 'common-move-10',         description: '이동 누적 10칸',                      points: 2, ownership: 'common' },
  { id: 'common-phase1-damage',   description: '페이즈 1에 용에게 1 피해 이상 누적',  points: 3, ownership: 'common' },
  { id: 'common-draw-3',          description: '드로우 액션 3회',                     points: 2, ownership: 'common' },
  { id: 'common-mission-swap',    description: '한 매치 내 미션 교체 1회 사용',        points: 1, ownership: 'common' },
  { id: 'common-treasure-1',      description: '보물 카드 1장 이상 획득',              points: 2, ownership: 'common' },
  { id: 'common-treasure-used-2', description: '보물 2개 사용 (방패 자동 발동 포함)',   points: 4, ownership: 'common' },

  // Human (4)
  { id: 'human-kill-dragon',      description: '용에게 최종 타격',                    points: 5, ownership: 'human' },
  { id: 'human-all-survive',      description: '모든 아군 생존 상태로 매치 종료',      points: 4, ownership: 'human' },
  { id: 'human-heal-3',           description: '응급처치 카드 3회 사용',              points: 2, ownership: 'human' },
  { id: 'human-full-hp-end',      description: '자신 HP 풀피로 매치 종료',            points: 2, ownership: 'human' },

  // Elf (4)
  { id: 'elf-2-treasures',        description: '보물 카드 2종류 이상 획득',            points: 5, ownership: 'elf' },
  { id: 'elf-scout-3',            description: '정찰 카드 3회 사용',                  points: 3, ownership: 'elf' },
  { id: 'elf-ranged-5',           description: '원거리(사거리 2+) 공격 5회 성공',       points: 3, ownership: 'elf' },
  { id: 'elf-no-damage',          description: '매치 내내 피해 받지 않음',             points: 4, ownership: 'elf' },

  // Dwarf (5)
  { id: 'dwarf-hide-ally-2',      description: '아군 대신 숨기-판정으로 2회 피격',      points: 4, ownership: 'dwarf' },
  { id: 'dwarf-taunt-2',          description: '도발 카드 2회 사용',                   points: 3, ownership: 'dwarf' },
  { id: 'dwarf-1hp-end',          description: '자신 HP 1 상태로 매치 종료',           points: 3, ownership: 'dwarf' },
  { id: 'dwarf-phase3',           description: '용 페이즈 3 진입',                     points: 2, ownership: 'dwarf' },
  { id: 'dwarf-keep-treasure',    description: '매치 종료 시 미사용 보물 1장 이상 보유', points: 3, ownership: 'dwarf' },

  // Orc (8)
  { id: 'orc-dragon-wins',        description: '용이 승리 (파티 전멸)',                 points: 5, ownership: 'orc', requiredOnly: true },
  { id: 'orc-kill-player',        description: '본인 공격으로 다른 유저 1명 탈락',      points: 5, ownership: 'orc', requiredOnly: true },
  { id: 'orc-reduce-and-wipe',    description: '용 HP 3 이하 + 매치 전멸',              points: 4, ownership: 'orc', requiredOnly: true },
  { id: 'orc-attack-6',           description: '공격 카드 6회 사용',                    points: 2, ownership: 'orc' },
  { id: 'orc-treasure-3',         description: '보물 3장 획득',                          points: 4, ownership: 'orc' },
  { id: 'orc-kill-all-elves',     description: '매치 종료 시 모든 엘프 탈락',            points: 4, ownership: 'orc', targetRace: 'elf' },
  { id: 'orc-kill-all-humans',    description: '매치 종료 시 모든 인간 탈락',            points: 3, ownership: 'orc', targetRace: 'human' },
  { id: 'orc-kill-all-dwarves',   description: '매치 종료 시 모든 드워프 탈락',          points: 3, ownership: 'orc', targetRace: 'dwarf' },
];

export function eligibleMissions(playerRace, racesPresent) {
  return MISSIONS.filter((m) => {
    if (m.ownership !== 'common' && m.ownership !== playerRace) return false;
    if (m.targetRace && !racesPresent.has(m.targetRace)) return false;
    return true;
  });
}

export function assignMissions(playerRace, racesPresent, rng) {
  const pool = eligibleMissions(playerRace, racesPresent);
  if (pool.length < 2) throw new Error(`mission pool too small for ${playerRace}`);
  const shuffled = rng.shuffle(pool);
  const required = shuffled[0];
  const optional = shuffled.slice(1).find((m) => !(m.requiredOnly) && m.id !== required.id);
  if (!optional) throw new Error(`no optional mission available for ${playerRace}`);
  return { required, optional };
}

export function evaluateMission(mission, player, state, matchEndReason) {
  const mp = player.missionProgress ?? {};
  switch (mission.id) {
    case 'common-attack-5':        return (mp.attackCount ?? 0) >= 5;
    case 'common-move-10':         return (mp.moveCellsCumulative ?? 0) >= 10;
    case 'common-phase1-damage':   return (mp.phase1DragonDamage ?? 0) >= 1;
    case 'common-draw-3':          return (mp.drawActionCount ?? 0) >= 3;
    case 'common-mission-swap':    return (mp.missionSwapCount ?? 0) >= 1;
    case 'common-treasure-1':      return (mp.treasuresAcquired ?? 0) >= 1;
    case 'common-treasure-used-2': return (mp.treasuresUsed ?? 0) >= 2;

    case 'human-kill-dragon':      return mp.killedDragon === true;
    case 'human-all-survive':      return matchEndReason === 'dragon-dead' && state.players.every((p) => !p.isEliminated);
    case 'human-heal-3':           return (mp.healCount ?? 0) >= 3;
    case 'human-full-hp-end':      return !player.isEliminated && player.hp === player.maxHp;

    case 'elf-2-treasures':        return (mp.treasuresAcquiredTypes?.length ?? 0) >= 2;
    case 'elf-scout-3':            return (mp.scoutCount ?? 0) >= 3;
    case 'elf-ranged-5':           return (mp.rangedAttackCount ?? 0) >= 5;
    case 'elf-no-damage':          return (mp.damageTaken ?? 0) === 0;

    case 'dwarf-hide-ally-2':      return (mp.hideInPlaceCount ?? 0) >= 2;
    case 'dwarf-taunt-2':          return (mp.tauntCount ?? 0) >= 2;
    case 'dwarf-1hp-end':          return !player.isEliminated && player.hp === 1;
    case 'dwarf-phase3':           return state.dragon?.reachedPhase3 === true;
    case 'dwarf-keep-treasure':    return (player.hand ?? []).some((c) => c.type === 'treasure');

    case 'orc-dragon-wins':        return matchEndReason === 'party-wipe';
    case 'orc-kill-player':        return (mp.eliminatedAllyCount ?? 0) >= 1;
    case 'orc-reduce-and-wipe':    return state.dragon.hp <= 3 && matchEndReason === 'party-wipe';
    case 'orc-attack-6':           return (mp.attackCount ?? 0) >= 6;
    case 'orc-treasure-3':         return (mp.treasuresAcquired ?? 0) >= 3;
    case 'orc-kill-all-elves':     return state.players.filter((p) => p.race === 'elf').every((p) => p.isEliminated);
    case 'orc-kill-all-humans':    return state.players.filter((p) => p.race === 'human').every((p) => p.isEliminated);
    case 'orc-kill-all-dwarves':   return state.players.filter((p) => p.race === 'dwarf').every((p) => p.isEliminated);

    default: return false;
  }
}

export function scoreMatch(state, matchEndReason, finisherId) {
  return state.players.map((p) => {
    let total = 0;
    const breakdown = [];
    if (p.missions?.required && evaluateMission(p.missions.required, p, state, matchEndReason)) {
      total += p.missions.required.points;
      breakdown.push({ id: p.missions.required.id, points: p.missions.required.points });
    }
    if (p.missions?.optional && evaluateMission(p.missions.optional, p, state, matchEndReason)) {
      total += p.missions.optional.points;
      breakdown.push({ id: p.missions.optional.id, points: p.missions.optional.points });
    }
    if (p.id === finisherId) { total += 3; breakdown.push({ id: 'finisher', points: 3 }); }
    if (!p.isEliminated) { total += 1; breakdown.push({ id: 'survive', points: 1 }); }
    return { playerId: p.id, total, breakdown };
  });
}
