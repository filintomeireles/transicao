// Leituras do estado do jogo, sem efeitos.
import { CALENDAR, CLUBS, CORE_RACES, raceById } from './data';
import { BAL } from './balance';
import type { ClubDef, GameState, RaceDef, ShopItem } from './types';

export const season = (s: GameState): number => Math.floor((s.week - 1) / 20) + 1;
export const weekInSeason = (s: GameState): number => ((s.week - 1) % 20) + 1;
/** Provas em que o jogador está inscrito nesta temporada. */
export const entries = (s: GameState): string[] => s.entries ?? CORE_RACES;
export const isEntered = (s: GameState, id: string): boolean => entries(s).includes(id);
export const raceThisWeek = (s: GameState): RaceDef | undefined => CALENDAR.find(r => r.w === weekInSeason(s) && isEntered(s, r.id));
export const nextRace = (s: GameState): RaceDef | undefined => CALENDAR.find(r => r.w >= weekInSeason(s) && isEntered(s, r.id));
export const myClub = (s: GameState): ClubDef => CLUBS.find(c => c.id === s.ath.club) ?? CLUBS[0];

/** Forma = fitness (carga crónica) menos carga recente. Positiva depois de aliviar. */
export const form = (s: GameState): number => (s.ctl - s.atl) / BAL.formDiv;

export function whyNot(s: GameState, r: RaceDef): string {
  if (r.minPts && s.pts < r.minPts) return `precisa de ${r.minPts} pts`;
  if (r.minFame && s.fame < r.minFame) return `convite com fama ${r.minFame}`;
  if (r.needSlot && !s.slots[r.id] && !(r.altPts && s.pts >= r.altPts)) {
    const from = CALENDAR.filter(x => x.slotTo === r.id).map(x => x.n.split(' · ')[0]).join(' ou ');
    return r.altPts ? `precisa de vaga (${from}) ou ${r.altPts} pts` : `precisa de vaga (${from})`;
  }
  return '';
}

/** Nome curto de uma prova para mensagens. */
export const raceName = (id: string): string => raceById(id)?.n ?? id;
export const canEnter = (s: GameState, r: RaceDef): boolean => !whyNot(s, r);
export const canAfford = (s: GameState, r: RaceDef): boolean => s.money >= r.fee + r.travel;

export function bikeGear(s: GameState): number {
  let b = s.owned.tt ? 0.06 : s.owned.aero ? 0.03 : 0;
  if (s.owned.wheels) b += 0.02;
  if (s.owned.helmet) b += 0.01;
  return b;
}
export const wetsuit = (s: GameState): number => (s.owned.wsPro ? 0.06 : s.owned.wsBasic ? 0.04 : 0);

export const price = (s: GameState, it: ShopItem): number =>
  Math.round(it.p * (it.cat === 'Bike' && s.sponsors.some(sp => sp.disc) ? 0.7 : 1));
