// O relógio do jogo é o calendário real: um dia de jogo é um dia real.
const DAY = 864e5;
const WEEKDAYS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Número do dia (dias desde 1970) na hora local do jogador. */
export const dayNumber = (d = new Date()): number => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
/** Dia da semana de um número de dia: 0 = segunda, 6 = domingo. */
export const dow = (n: number): number => (((n + 3) % 7) + 7) % 7;
export const mondayOf = (n: number): number => n - dow(n);
/** Número do dia em que uma atividade aconteceu (hora local). */
export const dayOfTime = (ms: number): number => dayNumber(new Date(ms));
export const weekdayName = (n: number): string => WEEKDAYS[dow(n)];
/** "16 nov" */
export const dateLabel = (n: number): string => { const d = new Date(n * DAY); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
