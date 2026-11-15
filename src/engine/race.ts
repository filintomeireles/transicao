import { ATTR_KEYS, DIST, GELS, OTHER_CLUBS, RACE_REWARD } from './data';
import { ageGroup, clamp, dec, fmt, pace } from './format';
import { nameFor } from './athlete';
import { gauss, pick, random, rnd, shuffle } from './rng';
import type { Attrs, GameState, LiveEntrant, LiveRace, RaceChoices, RaceDef, ResultRow, Sport, TimedLine, TraceRow } from './types';
import { bikeGear, form, myClub, season, wetsuit } from './world';
import { endWeek } from './week';

export interface RaceContext { form: number; fat?: number; bike: number; ws: number; wsFast?: boolean; shoe: number }
export interface RaceSplits { swim: number; t1: number; bike: number; t2: number; run: number; total: number; ev: [Sport, string][]; spd: number; rp: number }

/** Simula uma prova para um atleta: tempos por segmento a partir dos atributos e das decisões. */
export function simRace(a: Attrs, race: RaceDef, ch: RaceChoices, ctx: RaceContext): RaceSplits {
  const D = DIST[race.t], ev: [Sport, string][] = [], long = race.t === 'meia';
  const noise = () => 1 + gauss() * 0.015 * (1.3 - (a.mental / 100) * 0.6);
  const fm = (1 - clamp(ctx.form, -25, 25) * 0.003) * (1 + Math.max(0, (ctx.fat ?? 0) - 60) * 0.001);

  const sw = long ? 0.5 * a.swimTec + 0.5 * a.swimEnd : 0.6 * a.swimTec + 0.4 * a.swimEnd;
  const P = ({ frente: [0.965, 0.3], lado: [0.985, 0.1], tras: [1, 0] } as const)[ch.pos];
  const wsOn = race.temp < 22 && ctx.ws > 0;
  let swim = (D.swim / 100) * Math.max(62, 70 + (90 - sw) * 1.35) * P[0] * (wsOn ? 1 - ctx.ws : 1) * fm * noise();
  if (random() < P[1]) { const x = rnd(25, 70); swim += x; ev.push(['swim', `Pancada na confusão da primeira boia: perdeste ${Math.round(x)} s.`]); }
  const t1 = (50 + (100 - a.trans) * 1.3 + (wsOn ? (ctx.wsFast ? 6 : 14) : 0)) * noise();

  const bk = long ? 0.5 * a.bikePow + 0.5 * a.bikeEnd : 0.7 * a.bikePow + 0.3 * a.bikeEnd;
  const I: Record<string, [number, number]> = { '0.75': [0.95, 24], '0.82': [0.975, 38], '0.88': [1, 54], '0.95': [1.025, 80] };
  const [speedF, cost] = I[String(ch.int)] ?? I['0.88'];
  const bike = (D.bike / ((43 - (90 - bk) * 0.31) * speedF * (1 + ctx.bike))) * 3600 * fm * noise();

  let energy = 100 - cost * (D.bike / 40) * (1.3 - (a.bikeEnd / 100) * 0.6) - 45 * (D.run / 10) * (1.3 - (a.runEnd / 100) * 0.6) + ch.gels * 14;
  let stomach = 0;
  if (ch.gels > GELS[race.t] + 1 && random() < 0.45) { stomach = rnd(50, 130); ev.push(['bike', `Géis a mais: estômago às voltas. Perdeste ${Math.round(stomach)} s.`]); }
  const t2 = (35 + (100 - a.trans) * 0.8) * noise();

  const rr = long ? 0.4 * a.runSpd + 0.6 * a.runEnd : 0.6 * a.runSpd + 0.4 * a.runEnd;
  const ST = ({ conservador: [1.02, 10], constante: [1, 0], agressivo: [0.975, -15], negativo: [0.99, -5] } as const)[ch.strat];
  energy += ST[1];
  let rp = (185 + (90 - rr) * 4.7) * ST[0] * (1 - ctx.shoe);
  if (ch.strat === 'negativo' && a.mental < 55 && random() < 0.5) { rp *= 1.02; ev.push(['run', 'Querias acelerar na segunda metade, mas a cabeça não deixou.']); }
  if (energy < 20) { const k = (20 - energy) * 0.006; rp *= 1 + k; ev.push(['run', `Bateste na parede: o ritmo caiu ${Math.round(k * 100)}%.`]); }
  const run = D.run * rp * fm * noise() + stomach;
  return { swim, t1, bike, t2, run, total: swim + t1 + bike + t2 + run, ev, spd: D.bike / (bike / 3600), rp: (run - stomach) / D.run };
}

function attrsAround(R: number): Attrs {
  const a = {} as Attrs;
  for (const k of ATTR_KEYS) a[k] = clamp(R + gauss() * 9, 15, 96);
  a.mental = clamp(55 + gauss() * 15, 20, 95);
  return a;
}

type Splits = Pick<LiveEntrant, 'swim' | 't1' | 'bike' | 't2' | 'run'>;
const total = (f: Splits): number => f.swim + f.t1 + f.bike + f.t2 + f.run;
const meOf = (L: LiveRace): LiveEntrant => L.field.find(f => f.me)!;

/** Fator sobre o tempo base de uma transição: 1 = perfeita (0,75×), 0 = desastre (1,35×). */
export const transitionFactor = (score: number): number => 1.35 - 0.6 * clamp(score, 0, 1);
/** Pontuação que deixa a transição igual ao tempo base (quem salta o minijogo). */
export const NEUTRAL_SCORE = 0.35 / 0.6;
/** Distância máxima, em segundos na meta, para haver sprint final. */
export const SPRINT_WINDOW = 5;

/** Gera o pelotão da categoria e põe a prova a decorrer (s.race passa a 'live'). */
export function startRace(s: GameState): void {
  const r = s.race;
  if (!r || r.stage !== 'setup') return;
  const cat = s.ath.cat, n = cat === 'F' ? r.nF : r.nM;
  const mean = r.lvl + (cat === 'F' ? -8 : 0) + (season(s) - 1) * 3;
  const used = new Set([s.ath.name]), field: LiveEntrant[] = [];
  const add = (nm: string, age: number, R: number, tag: LiveEntrant['tag'], club: string) => {
    used.add(nm);
    const ch: RaceChoices = { pos: pick(['frente', 'lado', 'lado', 'tras'] as const), int: r.t === 'meia' ? 0.82 : 0.88, gels: GELS[r.t], strat: 'constante' };
    const sp = simRace(attrsAround(R), r, ch, { form: gauss() * 6, bike: rnd(0, 0.06), ws: 0.04, shoe: rnd(0, 0.015) });
    field.push({ nm, age, ag: ageGroup(age), tag, club, swim: sp.swim, t1: sp.t1, bike: sp.bike, t2: sp.t2, run: sp.run, ev: [] });
  };
  add(s.rival.nm, s.rival.age, s.rival.r, 'rival', pick(OTHER_CLUBS));
  const friends = shuffle(s.club.members.filter(m => m.cat === cat)).slice(0, random() < 0.5 ? 2 : 3);
  for (const m of friends) add(m.nm, m.age, m.r, 'clube', myClub(s).n);
  while (field.length < n - 1) {
    let nm: string;
    do nm = nameFor(cat); while (used.has(nm));
    const age = 18 + Math.floor(random() * 47);
    add(nm, age, mean + gauss() * 10 - Math.max(0, age - 40) * 0.35, '', random() < 0.5 ? pick(OTHER_CLUBS) : '');
  }
  const sp = simRace(s.a, r, r.ch, { form: form(s), fat: s.fatigue, bike: bikeGear(s), ws: wetsuit(s), wsFast: !!s.owned.wsPro, shoe: s.owned.carbon ? 0.015 : 0 });
  field.push({ nm: s.ath.name, age: s.ath.age, ag: ageGroup(s.ath.age), tag: 'tu', club: myClub(s).n, swim: sp.swim, t1: sp.t1, bike: sp.bike, t2: sp.t2, run: sp.run, ev: sp.ev, me: true });
  r.live = { field, baseT1: sp.t1, baseT2: sp.t2, t1Score: null, t2Score: null, sprint: null, sprintDone: false };
  r.stage = 'live';
}

/** Resultado do minijogo de transição (pontuação de 0 a 1). */
export function applyTransition(s: GameState, which: 1 | 2, score: number): void {
  const L = s.race?.live;
  if (!L) return;
  const me = meOf(L);
  if (which === 1) { L.t1Score = score; me.t1 = L.baseT1 * transitionFactor(score); }
  else { L.t2Score = score; me.t2 = L.baseT2 * transitionFactor(score); }
}

/** Quem chega à meta colado a ti (a menos de SPRINT_WINDOW segundos); gap > 0 = chega depois de ti. */
export function sprintOpponent(s: GameState): { nm: string; gap: number } | null {
  const L = s.race?.live;
  if (!L || L.sprintDone) return null;
  const mt = total(meOf(L));
  let best: { nm: string; gap: number } | null = null;
  for (const f of L.field) {
    if (f.me) continue;
    const gap = total(f) - mt;
    if (Math.abs(gap) <= SPRINT_WINDOW && (!best || Math.abs(gap) < Math.abs(best.gap))) best = { nm: f.nm, gap };
  }
  return best;
}

/** Resultado do sprint final: quem ganha corta a meta meio segundo à frente do outro. */
export function applySprint(s: GameState, won: boolean | null): void {
  const L = s.race?.live;
  if (!L || L.sprintDone) return;
  const opp = sprintOpponent(s);
  L.sprintDone = true;
  if (!opp || won === null) return;
  const me = meOf(L), o = L.field.find(f => f.nm === opp.nm)!;
  const mt = total(me), ot = total(o);
  if (won && mt > ot - 0.5) me.run -= mt - (ot - 0.5);
  if (!won && mt < ot + 0.5) me.run += ot + 0.5 - mt;
  L.sprint = { nm: opp.nm, won };
}

interface Outcome {
  sorted: LiveEntrant[];
  me: LiveEntrant;
  p: number;
  N: number;
  agList: LiveEntrant[];
  agP: number;
  riv: LiveEntrant;
  beatRival: boolean;
  catL: string;
  o: string;
}

function outcome(s: GameState, L: LiveRace): Outcome {
  const sorted = [...L.field].sort((a, b) => total(a) - total(b));
  const me = meOf(L), p = sorted.indexOf(me) + 1;
  const agList = sorted.filter(f => f.ag === me.ag);
  const riv = L.field.find(f => f.tag === 'rival')!;
  const cat = s.ath.cat;
  return { sorted, me, p, N: sorted.length, agList, agP: agList.indexOf(me) + 1, riv, beatRival: total(me) < total(riv), catL: cat === 'F' ? 'feminina' : 'masculina', o: cat === 'F' ? 'ª' : 'º' };
}

/** Tempos de passagem e relato da prova a decorrer, com as transições e o sprint como estão agora. */
export function liveView(s: GameState): { trace: TraceRow[]; timeline: TimedLine[] } | null {
  const r = s.race, L = r?.live;
  if (!r || !L) return null;
  return { trace: L.field.map(f => ({ nm: f.nm, tag: f.tag, me: !!f.me, cum: cumulative(f) })), timeline: buildTimeline(s, r, L, outcome(s, L)) };
}

/** Corre a prova inteira de uma vez, sem minijogos (simulador e testes). */
export function runRace(s: GameState): void {
  startRace(s);
  finishLiveRace(s);
}

/** Fecha a prova a decorrer: classificação final, prémios, fama, pontos, rival e patrocinadores. */
export function finishLiveRace(s: GameState): void {
  const r = s.race, L = r?.live;
  if (!r || !L || r.stage !== 'live') return;
  if (!L.sprintDone) applySprint(s, null);
  const out = outcome(s, L);
  const { sorted, me, p, N, agList, agP, riv, beatRival, o } = out;
  const trace: TraceRow[] = L.field.map(f => ({ nm: f.nm, tag: f.tag, me: !!f.me, cum: cumulative(f) }));
  const timeline = buildTimeline(s, r, L, out);

  const rt = RACE_REWARD[r.t];
  const prize = p <= 3 ? [300, 150, 80][p - 1] * rt.prize : 0;
  const fame = (Math.max(0, N * 0.5 - p) / N) * 20 * rt.fame + 1 + (agP === 1 ? 2 : 0);
  const pts = Math.round(Math.max(0, 1 - (p - 1) / N) * 40 * rt.pts);
  const bonus = p <= 3 ? s.sponsors.reduce((sum, sp) => sum + sp.podium, 0) : 0;
  let slot = '';
  if (r.slot && agP <= r.slot) { s.slots.algarve = true; slot = 'Vaga para a Meia distância do Algarve'; }
  const leg = s.legends[r.id];
  let legend = '';
  if ((s.raceCount[r.id] ?? 0) > leg.count) { leg.nm = s.ath.name; leg.count = s.raceCount[r.id]; legend = `És a lenda local de ${r.n}.`; }

  s.money += prize + bonus;
  s.fame += fame;
  s.pts += pts;
  s.fatigue = clamp(s.fatigue + rt.fat, 0, 100);
  s.a.mental = Math.min(99, s.a.mental + 0.6);
  s.a.trans = Math.min(99, s.a.trans + 0.4);
  s.moral = clamp(s.moral + (p <= N * 0.2 ? 8 : p > N * 0.6 ? -6 : 2) + (beatRival ? 5 : 0), 0, 100);
  if (beatRival) s.rival.beaten++; else s.rival.lost++;
  s.rival.r += 0.6 + random() * 0.8 + (beatRival ? 0.6 : 0);
  const lost = s.sponsors.filter(sp => sp.req && p / N > sp.req);
  for (const sp of lost) s.inbox.unshift({ k: 'msg', t: `${sp.n} rescindiu o contrato`, x: `Acabaste em ${p}${o} de ${N}, fora do top ${Math.round(sp.req! * 100)}%.`, done: true });
  s.sponsors = s.sponsors.filter(sp => !lost.includes(sp));

  const row = (f: LiveEntrant): ResultRow => ({ pos: sorted.indexOf(f) + 1, nm: f.nm, tag: f.tag, ag: f.ag, total: total(f), me: !!f.me });
  const lists = { geral: sorted.slice(0, 10).map(row), escalao: agList.slice(0, 10).map(row), clube: sorted.filter(f => f.tag === 'clube' || f.me).map(row) };
  if (p > 10) lists.geral.push(row(me));
  if (agP > 10) lists.escalao.push(row(me));

  s.results.push({ week: s.week, season: season(s), id: r.id, n: r.n, t: r.t, p, N, agP, agN: agList.length, ag: me.ag, total: total(me) });
  r.stage = 'done';
  r.res = { timeline, trace, p, N, agP, agN: agList.length, ag: me.ag, catL: out.catL, o, me: { swim: me.swim, t1: me.t1, bike: me.bike, t2: me.t2, run: me.run, total: total(me) }, lists, prize, bonus, fame, pts, slot, legend, beatRival, rivalNm: riv.nm };
  delete r.live;
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const cumulative = (f: Splits): TraceRow['cum'] => {
  const a = f.swim, b = a + f.t1, c = b + f.bike, d = c + f.t2;
  return [r1(a), r1(b), r1(c), r1(d), r1(d + f.run)];
};

/** Segundo de prova em que dois atletas no mesmo segmento ficam lado a lado (ou null se não se cruzam). */
function crossing(a0: number, a1: number, b0: number, b1: number): number | null {
  const ra = a1 - a0, rb = b1 - b0;
  if (Math.abs(rb - ra) < 1e-6) return null;
  const t = (a0 * rb - b0 * ra) / (rb - ra);
  return t > Math.max(a0, b0) && t < Math.min(a1, b1) ? t : null;
}

const transitionNote = (score: number | null): string =>
  score == null ? '' : score >= 0.75 ? ' Rapidíssima!' : score < 0.35 ? ' Atrapalhaste-te.' : '';

/** Relato da prova, cada linha no momento em que acontece. */
function buildTimeline(s: GameState, r: RaceDef, L: LiveRace, x: Outcome): TimedLine[] {
  const me = x.me, D = DIST[r.t];
  const [c0, c1, c2, c3, c4] = cumulative(me), [, , , rv3, rv4] = cumulative(x.riv);
  const posAt = (k: 0 | 2) => [...L.field].sort((a, b) => cumulative(a)[k] - cumulative(b)[k]).indexOf(me) + 1;
  const wsOn = r.temp < 22 && wetsuit(s) > 0;
  const at = (sp: Sport): number => (sp === 'swim' ? c0 * 0.35 : sp === 'bike' ? c1 + (c2 - c1) * 0.7 : c3 + (c4 - c3) * 0.6);
  const riv = x.riv;
  const lines: TimedLine[] = [
    { at: 0, sp: 'gen', text: `Partida da prova ${x.catL}: ${x.N} atletas, água a ${r.temp} °C${r.temp < 22 ? (wsOn ? ', com fato' : ', sem fato isotérmico') : ''}.` },
    ...me.ev.map(([sp, text]) => ({ at: at(sp), sp, text })),
    { at: c0, sp: 'swim', text: `Sais da água em ${posAt(0)}${x.o} (${pace(me.swim / (D.swim / 100))}/100 m).` },
    { at: c1, sp: 'gen', text: `T1 em ${fmt(me.t1)}.${transitionNote(L.t1Score)}` },
    { at: c2, sp: 'bike', text: `Bike a ${dec(D.bike / (me.bike / 3600))} km/h. Chegas à T2 em ${posAt(2)}${x.o}.` },
    { at: c3, sp: 'gen', text: `T2 em ${fmt(me.t2)}.${transitionNote(L.t2Score)}` }
  ];
  if (L.sprint) lines.push({ at: Math.max(c3, c4 - 2), sp: 'run', text: L.sprint.won ? `Sprint final com ${L.sprint.nm}: ganhas no último metro!` : `Sprint final com ${L.sprint.nm}: ganha-te por um palmo.` });
  // O duelo com o rival na corrida, no momento em que se cruzam.
  const meAheadAtT2 = c3 < rv3, meAheadAtEnd = c4 < rv4, cross = crossing(c3, c4, rv3, rv4);
  if (meAheadAtT2 !== meAheadAtEnd && cross != null) {
    lines.push({ at: cross, sp: 'run', text: meAheadAtEnd ? `Passas ${riv.nm}! O teu rival fica para trás.` : `${riv.nm} passa por ti na corrida.` });
  } else {
    lines.push({ at: c3 + (c4 - c3) * 0.3, sp: 'run', text: meAheadAtEnd ? `Corres à frente de ${riv.nm}. Não olhes para trás.` : `${riv.nm} vai à tua frente na corrida.` });
  }
  lines.push({ at: c4, sp: 'run', text: `Meta! ${x.p}${x.o} da geral ${x.catL}, ${x.agP}${x.o} no escalão.` });
  return lines.sort((a, b) => a.at - b.at);
}

/** Sai do ecrã de resultado e passa à semana seguinte. */
export function finishRace(s: GameState): void {
  if (!s.race || s.race.stage !== 'done') return;
  s.race = null;
  endWeek(s);
}
