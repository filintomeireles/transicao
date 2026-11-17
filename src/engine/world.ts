// Leituras do estado do jogo, sem efeitos.
import { BAL } from './balance';
import { dow } from './clock';
import { CALENDAR, CLUBS, CLUB_RACE, CORE_RACES, SESS, raceById } from './data';
import { clamp } from './format';
import type { ClubDef, GameState, RaceDef, SessionKey, ShopItem } from './types';

/** Semana da carreira, a contar de 0. */
export const weekIdx = (s: GameState): number => Math.floor((s.today - s.start) / 7);
export const season = (s: GameState): number => Math.floor(weekIdx(s) / BAL.seasonWeeks) + 1;
export const weekInSeason = (s: GameState): number => (weekIdx(s) % BAL.seasonWeeks) + 1;
/** Dia da semana de hoje: 0 = segunda. */
export const weekday = (s: GameState): number => dow(s.today);

/** Provas em que o jogador está inscrito nesta temporada. */
export const entries = (s: GameState): string[] => s.entries ?? CORE_RACES;
export const isEntered = (s: GameState, id: string): boolean => entries(s).includes(id);
/** Dia (número) em que se corre uma prova de calendário nesta temporada: o domingo da sua semana. */
export const raceDay = (s: GameState, r: RaceDef): number => s.start + ((season(s) - 1) * BAL.seasonWeeks + r.w - 1) * 7 + 6;
export const hasRun = (s: GameState, r: RaceDef): boolean => s.results.some(x => x.id === r.id && x.season === season(s));
/** A próxima prova de calendário em que estás inscrito (pode ser hoje). */
export const nextRace = (s: GameState): RaceDef | undefined =>
  CALENDAR.find(r => raceDay(s, r) >= s.today && isEntered(s, r.id) && !hasRun(s, r));
export const daysTo = (s: GameState, r: RaceDef): number => raceDay(s, r) - s.today;
export const myClub = (s: GameState): ClubDef => CLUBS.find(c => c.id === s.ath.club) ?? CLUBS[0];

/** Forma = fitness (carga dos últimos 42 dias) menos a carga dos últimos 7. Positiva depois de aliviar. */
export const form = (s: GameState): number => clamp(s.ctl - s.atl, -30, 30);

export function whyNot(s: GameState, r: RaceDef): string {
  if (r.minPts && s.pts < r.minPts) return `precisa de ${r.minPts} pts`;
  if (r.minFame && s.fame < r.minFame) return `convite com fama ${r.minFame}`;
  if (r.needSlot && !s.slots[r.id] && !(r.altPts && s.pts >= r.altPts)) {
    const from = CALENDAR.filter(x => x.slotTo === r.id).map(x => x.n.split(' · ')[0]).join(' ou ');
    return r.altPts ? `precisa de vaga (${from}) ou ${r.altPts} pts` : `precisa de vaga (${from})`;
  }
  return '';
}
export const raceName = (id: string): string => raceById(id)?.n ?? id;
export const canEnter = (s: GameState, r: RaceDef): boolean => !whyNot(s, r);
export const canAfford = (s: GameState, r: RaceDef): boolean => s.money >= r.fee + r.travel;

/**
 * A prova que podes correr hoje: a de calendário em que estás inscrito ou, ao sábado, os 5 km do clube.
 * Não há prova no dia em que a carreira começa, com lesão, nem depois de a recusares.
 */
export function raceOffer(s: GameState): RaceDef | undefined {
  if (s.done || s.race || s.skipRace === s.today || s.injury > 0 || s.today === s.born) return undefined;
  const r = CALENDAR.find(x => raceDay(s, x) === s.today && isEntered(s, x.id) && !hasRun(s, x));
  if (r && canEnter(s, r) && canAfford(s, r)) return r;
  if (weekday(s) === 5 && !s.camp) return CLUB_RACE;
  return undefined;
}

/** A sessão de hoje: a do plano, ou treino cruzado se estiveres lesionado e fosse corrida. */
export function plannedToday(s: GameState): SessionKey {
  const k = s.plan[weekday(s)];
  return s.injury > 0 && SESS[k].run ? 'cross' : k;
}
/** Hoje é o dia do treino do clube e a sessão é de corrida. */
export const clubToday = (s: GameState, k: SessionKey): boolean => !s.camp && SESS[k].run && weekday(s) === myClub(s).ev.d;
/** Longão de domingo com o grupo. */
export const groupToday = (s: GameState, k: SessionKey): boolean => !s.camp && k === 'long' && weekday(s) === 6;

// Pontos de treino, níveis e talentos
/** Nível a partir dos pontos: o nível n pede xpLevel × n × (n − 1) / 2 pontos. */
export const level = (xp: number): number => Math.floor((Math.sqrt(1 + (8 * xp) / BAL.xpLevel) - 1) / 2) + 1;
export const xpForLevel = (lv: number): number => (BAL.xpLevel * lv * (lv - 1)) / 2;
export const talentPoints = (s: GameState): number => level(s.xp) - 1 - s.talents.length;
export const has = (s: GameState, talent: string): boolean => s.talents.includes(talent);

export const price = (s: GameState, it: ShopItem): number =>
  Math.round(it.p * (it.cat === 'Sapatilhas' && s.sponsors.some(sp => sp.disc) ? 0.7 : 1));
