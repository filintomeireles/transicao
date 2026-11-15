// Constantes de equilíbrio, afinadas com o simulador (npm run simulate). Ver o documento de design.
export const BAL = {
  // treino
  gainLoad: 55,        // carga de referência: uma sessão com esta carga dá o ganho base
  keep: 1.1,           // carga semanal por ponto de atributo para o manter
  detrain: 0.8,        // perda máxima por semana quando a carga fica abaixo do necessário
  // fadiga e forma
  fatIn: 0.15,
  fatDecay: 0.86,
  fatDecayRest: 0.75,
  fatFrom: 45,         // a partir daqui os ganhos começam a cair
  fatPen: 0.012,
  jobFat: 5,
  ctlRate: 1 / 6,
  atlRate: 0.5,
  formDiv: 8,
  // lesões
  injFrom: 50,
  injSlope: 0.002,
  // dinheiro e fama
  living: 220,
  salary: 300,
  fameKeep: 0.97,
  coach: 1.15,
  // treino real
  realBonus: 1.2,      // ganhos de um treino real
  realBonusCap: 4,     // treinos reais por semana com bónus
  realStreakMin: 3,    // treinos reais numa semana para contar para a série
  fatDecayRealRest: 0.65, // descanso real numa semana com treino real
  // clube: patrocinador paga por evento a que vais, conforme a divisão
  clubPay: [0, 40, 20, 10] as readonly number[],
  // ritmo: semanas de jogo por dia real, acumuláveis até ao teto (igual para todos, não se compra)
  pacePerDay: 2,
  paceCap: 7,
  paceStart: 7,
  // categoria feminina: os perfis prontos são ritmos masculinos
  fOffset: 7
} as const;
