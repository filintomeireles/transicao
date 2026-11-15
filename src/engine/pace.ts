// Ritmo do jogo: cada dia real dá algumas semanas de jogo, que se acumulam até um teto.
// Igual para todos e não se compra: serve o hábito diário, os treinos reais e a justiça no clube.
import { BAL } from './balance';
import type { GameState } from './types';

/** Número do dia (local) desde 1970: dois instantes no mesmo dia de calendário dão o mesmo número. */
export const dayNumber = (d: Date = new Date()): number => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);

/** Semanas disponíveis hoje, sem alterar o estado. */
export function weeksAvailable(s: GameState, today: number): number {
  if (s.bankDay == null) return BAL.paceStart;
  const days = Math.max(0, today - s.bankDay);
  return Math.min(BAL.paceCap, (s.bank ?? 0) + days * BAL.pacePerDay);
}

/** Gasta uma semana da reserva. Devolve false se hoje já não há semanas. */
export function takeWeek(s: GameState, today: number): boolean {
  const available = weeksAvailable(s, today);
  s.bankDay = today;
  s.bank = available;
  if (available < 1) return false;
  s.bank = available - 1;
  return true;
}
