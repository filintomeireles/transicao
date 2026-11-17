// Todas as constantes de equilíbrio num só sítio. Mudar aqui e correr "npm run simulate".
export const BAL = {
  /** Semanas de uma temporada (uma prova de calendário por domingo). */
  seasonWeeks: 12,

  // Treino
  /** Multiplicador geral dos ganhos de atributos. */
  gain: 0.33,
  /** Perda natural por dia: decay × (atributo/50)². Quem está mais alto tem de treinar mais para se manter. */
  decay: 0.011,
  /** Esforço num treino simulado: [carga, ganhos]. */
  effort: { leve: [0.75, 0.75], plano: [1, 1], forte: [1.2, 1.2] } as Record<'leve' | 'plano' | 'forte', readonly [number, number]>,
  /** Ganhos conforme a origem do treino. */
  real: 1.5, manual: 1.25, auto: 0.6,
  /** Dias seguidos de ausência que o piloto automático cobre; depois disso o atleta para. */
  autoMax: 10,
  coach: 1.15,
  clubBonus: 1.15,

  // Fadiga e forma
  fatIn: 0.15, fatDecay: 0.86, fatDecayRest: 0.75, fatFrom: 45, fatPen: 0.012, jobFat: 0.9,
  ctlDays: 42, atlDays: 7,
  /** Cada ponto de forma vale 0,2% do tempo de prova, até ±20 pontos. */
  formPct: 0.002, formCap: 20,

  // Lesões
  injBase: 0.004, injFrom: 50, injSlope: 0.0015,

  // Pontos de treino
  xpPerLoad: 0.2, xpReal: 2, xpManual: 1.5, xpAuto: 0.3, xpLevel: 120,
  /** Sessões feitas por ti numa semana para cumprir o objetivo semanal. */
  weekGoal: 5, weekGoalXp: 40, weekGoalMoney: 40,
  streakEvery: 7, streakXp: 30,
  realStreakMin: 3,

  // Economia (por semana)
  living: 220, salary: 300, fameKeep: 0.97,
  clubPay: [0, 40, 20, 10] as readonly number[],

  /** Diferença dos perfis prontos na categoria feminina. */
  fOffset: 7
} as const;
