// Ações do jogador. Todas alteram o estado recebido e, quando faz sentido, devolvem uma mensagem.
import { CALENDAR, EVENTS, GELS, PRESETS, SHOP, SPONSORS } from './data';
import { clamp, eur } from './format';
import type { GameState, RaceChoices, SessionKey } from './types';
import { entries, price, weekInSeason } from './world';

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
  s.money -= pr;
  if (id === 'shoes') { s.shoeKm = 0; s.shoeWarned = false; }
  else if (id === 'massage') s.fatigue = clamp(s.fatigue - 15, 0, 100);
  else s.owned[id] = true;
  return `Compraste: ${it.n.toLowerCase()}.`;
}

export const cancelSubscription = (s: GameState, id: string): void => { s.subs[id] = false; };
export const quitJob = (s: GameState): void => { s.job = false; };
export const returnToJob = (s: GameState): void => { s.job = true; };
export const setDay = (s: GameState, day: number, k: SessionKey): void => { s.plan[day] = k; };
export const applyPreset = (s: GameState, name: keyof typeof PRESETS): void => { s.plan = PRESETS[name].slice(); };
export const removeReal = (s: GameState, day: number): void => { s.real[day] = []; };
/** Marca (ou desmarca) o treino real mais longo desse dia como prova real. */
export function toggleRealRace(s: GameState, day: number): void {
  const list = s.real[day];
  if (!list?.length) return;
  const longest = list.reduce((a, b) => (b.min > a.min ? b : a));
  longest.race = !longest.race;
}

export function setRaceChoice<K extends keyof RaceChoices>(s: GameState, key: K, value: RaceChoices[K]): void {
  if (s.race?.stage === 'setup') s.race.ch[key] = value;
}
export function changeGels(s: GameState, delta: number): void {
  if (s.race?.stage === 'setup') s.race.ch.gels = clamp(s.race.ch.gels + delta, 0, 16);
}
export const recommendedGels = (s: GameState): number | null => (s.race ? GELS[s.race.t] : null);

/** Inscreve ou desinscreve numa prova. Só uma prova por semana; provas passadas ou desta semana com a prova já em curso não mudam. */
export function toggleEntry(s: GameState, id: string): void {
  const r = CALENDAR.find(x => x.id === id);
  if (!r || r.w < weekInSeason(s) || (s.race && r.w === weekInSeason(s))) return;
  const list = entries(s);
  s.entries = list.includes(id)
    ? list.filter(x => x !== id)
    : [...list.filter(x => CALENDAR.find(c => c.id === x)?.w !== r.w), id];
}
