export const DRAGON_TIMING_TUTORIAL_SCENARIOS = [
  {
    id: 'dragon-timing-early',
    title: 'Early activation: defend before the first breath',
    focus: 'dragon-activation-timing',
    timing: 'early',
    seed: 4101,
    initialDragonCard: { id: 'tutorial-row-early', type: 'row-attack', rowIndex: 0 },
    setup: {
      playerPosition: { r: 0, c: 1 },
      recommendedAction: 'hide-or-move-before-dragon-turn',
    },
    expectedPreview: {
      totalExpectedDamage: 1,
      affectedPlayers: [{ id: 'P0', expectedDamage: 1, mitigation: 'hide' }],
    },
    expectedSummary: {
      totalDamageDealt: 1,
      affectedPlayers: [{ id: 'P0', damageTaken: 1 }],
    },
    lesson: 'Use the visible dragon card before activation to spend hide or move early, reducing a row hit before damage lands.',
  },
  {
    id: 'dragon-timing-delayed',
    title: 'Delayed activation: greed for one hit, then absorb',
    focus: 'dragon-activation-timing',
    timing: 'delayed',
    seed: 4102,
    initialDragonCard: { id: 'tutorial-col-delayed', type: 'col-attack', colIndex: 2 },
    setup: {
      playerPosition: { r: 2, c: 2 },
      recommendedAction: 'attack-from-safe-row-then-shield-next-window',
    },
    expectedPreview: {
      totalExpectedDamage: 2,
      affectedPlayers: [{ id: 'P0', expectedDamage: 2, mitigation: null }],
    },
    expectedSummary: {
      totalDamageDealt: 2,
      affectedPlayers: [{ id: 'P0', damageTaken: 2 }],
    },
    lesson: 'Delaying can be correct when the preview shows survivable damage and the extra action pushes dragon HP toward a reward threshold.',
  },
  {
    id: 'dragon-timing-missed',
    title: 'Missed opportunity: ignore the preview and pay for it',
    focus: 'dragon-activation-timing',
    timing: 'missed',
    seed: 4103,
    initialDragonCard: { id: 'tutorial-all-missed', type: 'all' },
    setup: {
      playerPosition: { r: 0, c: 1 },
      recommendedAction: 'do-not-ignore-all-board-warning',
    },
    expectedPreview: {
      totalExpectedDamage: 3,
      affectedPlayers: [
        { id: 'P0', expectedDamage: 1, mitigation: null },
        { id: 'P1', expectedDamage: 1, mitigation: null },
        { id: 'P2', expectedDamage: 1, mitigation: null },
      ],
    },
    expectedSummary: {
      totalDamageDealt: 3,
      affectedPlayers: [
        { id: 'P0', damageTaken: 1 },
        { id: 'P1', damageTaken: 1 },
        { id: 'P2', damageTaken: 1 },
      ],
    },
    lesson: 'When the preview marks the whole board, missing the timing window turns a preventable team-wide hit into confirmed damage.',
  },
];
