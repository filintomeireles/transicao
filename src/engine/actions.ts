// Ações do jogador. Todas alteram o estado recebido e, quando faz sentido, devolvem uma mensagem.
import { CALENDAR, CAMPS, EVENTS, PRESETS, SHOP, SPONSORS, TALENTS, type PresetName } from './data';
import { clamp, eur } from './format';
import type { GameState, SessionKey } from './types';
import { entries, hasRun, price, raceDay, talentPoints } from './world';

export function resolveEvent(s: GameState, msgIndex: number, option: number): void {
  const m = s.inbox[msgIndex];
  if (!m || m.done || m.k !== 'ev' || !m.id) return;
  const opt = EVENTS[m.id]?.o[option];
  if (!opt) return;
  m.res = opt[1](s);
  m.done = true;
  s.moral = clamp(s.moral, 0, 100);
  s.fatigue = clamp(s.fatigue, 0, 100);
}

export function acceptOffer(s: GameState, msgIndex: number): void {
  const m = s.inbox[msgIndex];
  const sp = SPONSORS.find(x => x.id === m?.id);
  if (!m || m.done || m.k !== 'offer' || !sp) return;
  if (s.sponsors.length >= 3) { m.res = 'Já tens 3 patrocinadores. Espera que um contrato acabe.'; return; }
  const f = s.renew[sp.id] ?? 1;
  s.sponsors.push({ ...sp, weekly: Math.round(sp.weekly * f), podium: Math.round(sp.podium * f), left: sp.weeks });
  m.done = true;
  m.k = 'msg';
  m.res = `Assinaste com ${sp.n}.`;
}

export function declineOffer(s: GameState, msgIndex: number): void {
  const m = s.inbox[msgIndex];
  if (!m || m.done || m.k !== 'offer') return;
  m.done = true;
  m.k = 'msg';
  m.res = 'Recusaste a proposta.';
}

export function buy(s: GameState, id: string): string {
  const it = SHOP.find(x => x.id === id);
  if (!it) return '';
  const pr = price(s, it);
  if (s.money < pr) return `Faltam ${eur(pr - s.money)} para ${it.n.toLowerCase()}.`;
  if (it.sub) { if (s.subs[id]) return ''; s.subs[id] = true; s.money -= pr; return `Subscreveste: ${it.n.toLowerCase()}.`; }
  if (!it.once && s.owned[id]) return '';
  if (id === 'physio' && !s.injury) return 'Não estás lesionado.';
  s.money -= pr;
  if (id === 'shoes') { s.shoeKm = 0; s.shoeWarned = false; }
  else if (id === 'massage') s.fatigue = clamp(s.fatigue - 15, 0, 100);
  else if (id === 'physio') s.injury = Math.max(0, s.injury - 4);
  else s.owned[id] = true;
  return `Compraste: ${it.n.toLowerCase()}.`;
}

export const cancelSubscription = (s: GameState, id: string): void => { s.subs[id] = false; };
export const quitJob = (s: GameState): void => { s.job = false; };
export const returnToJob = (s: GameState): void => { s.job = true; };
/** Muda o treino de um dia no modelo da semana (fica para as semanas seguintes). */
export const setDay = (s: GameState, day: number, k: SessionKey): void => { s.plan[day] = k; };
export const applyPreset = (s: GameState, name: PresetName): void => { s.plan = PRESETS[name].slice(); };

/** Inscreve ou desinscreve numa prova futura desta temporada. */
export function toggleEntry(s: GameState, id: string): void {
  const r = CALENDAR.find(x => x.id === id);
  if (!r || raceDay(s, r) <= s.today || hasRun(s, r)) return;
  const list = entries(s);
  s.entries = list.includes(id) ? list.filter(x => x !== id) : [...list.filter(x => CALENDAR.find(c => c.id === x)?.w !== r.w), id];
}

/** Marca um estágio a começar hoje. Devolve a mensagem para o jogador. */
export function bookCamp(s: GameState, id: string): string {
  const c = CAMPS.find(x => x.id === id);
  if (!c) return '';
  if (s.camp) return 'Já estás num estágio.';
  if (s.money < c.cost) return `Faltam ${eur(c.cost - s.money)} para ${c.n.toLowerCase()}.`;
  s.money -= c.cost;
  s.camp = { id, left: c.days };
  return `Estágio marcado: ${c.n}, ${c.days} dias a partir de hoje.`;
}

/** Escolhe um talento com um ponto de nível. */
export function pickTalent(s: GameState, id: string): void {
  if (talentPoints(s) <= 0 || s.talents.includes(id) || !TALENTS.some(t => t.id === id)) return;
  s.talents = [...s.talents, id];
}
