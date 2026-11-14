import { ATTR_KEYS, DIST, GELS, OTHER_CLUBS, RACE_REWARD } from './data';
import { ageGroup, clamp, dec, fmt, pace } from './format';
import { nameFor } from './athlete';
import { gauss, pick, random, rnd, shuffle } from './rng';
import type { Attrs, GameState, RaceChoices, RaceDef, ResultRow, Sport } from './types';
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

interface Entrant extends RaceSplits { nm: string; age: number; ag: string; tag: '' | 'rival' | 'clube' | 'tu'; club: string; me?: boolean; pos?: number }

/** Corre a prova da semana (s.race em 'setup'): gera o pelotão da categoria, aplica prémios e guarda o resultado. */
export function runRace(s: GameState): void {
  const r = s.race;
  if (!r || r.stage !== 'setup') return;
  const cat = s.ath.cat, n = cat === 'F' ? r.nF : r.nM;
  const mean = r.lvl + (cat === 'F' ? -8 : 0) + (season(s) - 1) * 3;
  const used = new Set([s.ath.name]), field: Entrant[] = [];
  const add = (nm: string, age: number, R: number, tag: Entrant['tag'], club: string) => {
    used.add(nm);
    const ch: RaceChoices = { pos: pick(['frente', 'lado', 'lado', 'tras'] as const), int: r.t === 'meia' ? 0.82 : 0.88, gels: GELS[r.t], strat: 'constante' };
    field.push({ nm, age, ag: ageGroup(age), tag, club, ...simRace(attrsAround(R), r, ch, { form: gauss() * 6, bike: rnd(0, 0.06), ws: 0.04, shoe: rnd(0, 0.015) }) });
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
  const me: Entrant = {
    ...simRace(s.a, r, r.ch, { form: form(s), fat: s.fatigue, bike: bikeGear(s), ws: wetsuit(s), wsFast: !!s.owned.wsPro, shoe: s.owned.carbon ? 0.015 : 0 }),
    nm: s.ath.name, age: s.ath.age, ag: ageGroup(s.ath.age), tag: 'tu', club: myClub(s).n, me: true
  };
  field.push(me);

  const N = field.length;
  const posAfter = (keys: ('swim' | 't1' | 'bike' | 't2' | 'run')[]) =>
    field.map(f => ({ f, t: keys.reduce((sum, k) => sum + f[k], 0) })).sort((a, b) => a.t - b.t).findIndex(x => x.f.me) + 1;
  const pSwim = posAfter(['swim']), pBike = posAfter(['swim', 't1', 'bike']);
  field.sort((a, b) => a.total - b.total);
  field.forEach((f, i) => (f.pos = i + 1));
  const p = me.pos!;
  const agList = field.filter(f => f.ag === me.ag), agP = agList.indexOf(me) + 1;
  const clubList = field.filter(f => f.tag === 'clube' || f.me);
  const riv = field.find(f => f.tag === 'rival')!;
  const beatRival = me.total < riv.total;
  const catL = cat === 'F' ? 'feminina' : 'masculina', o = cat === 'F' ? 'ª' : 'º';
  const wsOn = r.temp < 22 && wetsuit(s) > 0;

  const feed: [Sport, string][] = [
    ['gen', `Partida da prova ${catL}: ${N} atletas, água a ${r.temp} °C${r.temp < 22 ? (wsOn ? ', com fato' : ', sem fato isotérmico') : ''}.`],
    ...me.ev.filter(e => e[0] === 'swim'),
    ['swim', `Sais da água em ${pSwim}${o} (${pace(me.swim / (DIST[r.t].swim / 100))}/100 m).`],
    ['gen', `T1 em ${fmt(me.t1)}.`],
    ...me.ev.filter(e => e[0] === 'bike'),
    ['bike', `Bike a ${dec(me.spd)} km/h. Chegas à T2 em ${pBike}${o}.`],
    ['gen', `T2 em ${fmt(me.t2)}.`],
    ...me.ev.filter(e => e[0] === 'run'),
    ['run', beatRival ? `Passas ${riv.nm} na corrida!` : `${riv.nm} vai à tua frente na corrida.`],
    ['run', `Meta! ${p}${o} da geral ${catL}, ${agP}${o} no escalão ${me.ag}.`]
  ];

  const rt = RACE_REWARD[r.t];
  const prize = p <= 3 ? [300, 150, 80][p - 1] * rt.prize : 0;
  const fame = (Math.max(0, N * 0.5 - p) / N) * 20 * rt.fame + 1 + (agP === 1 ? 2 : 0);
  const pts = Math.round(Math.max(0, 1 - (p - 1) / N) * 40 * rt.pts);
  const bonus = p <= 3 ? s.sponsors.reduce((sum, sp) => sum + sp.podium, 0) : 0;
  let slot = '';
  if (r.slot && agP <= r.slot) { s.slots.algarve = true; slot = 'Vaga para a Meia distância do Algarve'; }
  const L = s.legends[r.id];
  let legend = '';
  if ((s.raceCount[r.id] ?? 0) > L.count) { L.nm = s.ath.name; L.count = s.raceCount[r.id]; legend = `És a lenda local de ${r.n}.`; }

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

  const row = (f: Entrant): ResultRow => ({ pos: f.pos!, nm: f.nm, tag: f.tag, ag: f.ag, total: f.total, me: !!f.me });
  const lists = { geral: field.slice(0, 10).map(row), escalao: agList.slice(0, 10).map(row), clube: clubList.map(row) };
  if (p > 10) lists.geral.push(row(me));
  if (agP > 10) lists.escalao.push(row(me));

  s.results.push({ week: s.week, season: season(s), id: r.id, n: r.n, t: r.t, p, N, agP, agN: agList.length, ag: me.ag, total: me.total });
  r.stage = 'done';
  r.res = { feed, p, N, agP, agN: agList.length, ag: me.ag, catL, o, me: { swim: me.swim, t1: me.t1, bike: me.bike, t2: me.t2, run: me.run, total: me.total }, lists, prize, bonus, fame, pts, slot, legend, beatRival, rivalNm: riv.nm };
}

/** Sai do ecrã de resultado e passa à semana seguinte. */
export function finishRace(s: GameState): void {
  if (!s.race || s.race.stage !== 'done') return;
  s.race = null;
  endWeek(s);
}
