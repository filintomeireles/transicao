// A prova jogada segmento a segmento. O pelotão é simulado no arranque; tu escolhes o esforço de cada segmento
// e geres a energia. No fim, se chegares colado a alguém, há sprint.
import { nameFor } from './athlete';
import { completeDay } from './day';
import { DIST, GELS, OTHER_CLUBS, RACE_REWARD, raceById } from './data';
import { ageGroup, clamp, fmt } from './format';
import { ability, paceFor, segmentCost } from './perf';
import { gauss, pick, random, shuffle } from './rng';
import { rivalAfterRace, rivalPreRace } from './rival';
import type { AttrKey, Attrs, Entrant, Fam, GameState, LiveRace, Pace, PaceOption, RaceDef, RaceResult, ResultRow } from './types';
import { rollWeather, weatherText } from './weather';
import { form, has, myClub, raceName, season } from './world';

export const PACE_NAME: Record<Pace, string> = { poupar: 'Poupar', ritmo: 'Ao ritmo', atacar: 'Atacar', seguir: 'Colar' };
const PACE_F: Record<Exclude<Pace, 'seguir'>, number> = { poupar: 1.04, ritmo: 1, atacar: 0.965 };
const PACE_COST: Record<Exclude<Pace, 'seguir'>, number> = { poupar: 0.7, ritmo: 1, atacar: 1.5 };
/** Mais rápido do que isto (face ao teu ritmo) não consegues ir. */
const MAX_F = 0.955;
const SPRINT_GAP = 3;
const costOf = (f: number) => clamp(1 + (1 - f) * 14, 0.65, 1.9);

const segKm = (r: RaceDef) => DIST[r.t].km / DIST[r.t].segs;
const isClub = (r: RaceDef) => r.tier === 'clube';

/** Inscreve-te na prova de hoje: paga inscrição e viagem e prepara o pelotão. */
export function enterRace(s: GameState, id: string): string {
  const r = raceById(id);
  if (!r || s.race || s.done) return '';
  if (s.money < r.fee + r.travel) return 'Sem dinheiro para a inscrição e a viagem.';
  s.money -= r.fee + r.travel;
  s.raceCount[r.id] = (s.raceCount[r.id] ?? 0) + 1;
  if (!isClub(r) && !s.rival.out) rivalPreRace(s, r.n);
  s.race = { ...r, stage: 'setup', gels: s.owned.nutri ? GELS[r.t] : Math.min(2, GELS[r.t]), weather: rollWeather(r) };
  return '';
}

export function skipRace(s: GameState): void { s.skipRace = s.today; }
export function changeGels(s: GameState, d: number): void { if (s.race?.stage === 'setup') s.race.gels = clamp(s.race.gels + d, 0, 10); }

/** Inclinação de cada segmento conforme o percurso. */
function grades(r: RaceDef, n: number): number[] {
  if (r.course === 'plano') return Array.from({ length: n }, () => (random() < 0.15 ? 1 : 0));
  if (r.course === 'ondulado') return Array.from({ length: n }, (_, i) => (i % 2 ? pick([0, -1]) : pick([1, 0, 1])));
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? -1 : pick([2, 1, 2, -1, -2])));
}

/** Fatores de condições de um segmento, iguais para todos. */
function condF(L: LiveRace, r: RaceDef, w: { air: number; wind: number; rain: boolean }, i: number, accl: boolean, hills = 1): number {
  const g = L.grade[i];
  let f = 1 + (g > 0 ? g * 0.03 * hills : g * 0.018);
  f *= L.head[i] ? 1 + w.wind * 0.0012 : 1 - w.wind * 0.0004;
  const longF = clamp(DIST[r.t].km / 21, 0.3, 1.5);
  if (w.air > 20) f *= 1 + (w.air - 20) * 0.004 * (accl ? 0.4 : 1) * longF;
  if (w.rain) f *= 1.008;
  return f;
}

/** Começa a prova: gera o pelotão e o percurso. */
export function startRace(s: GameState): void {
  const r = s.race;
  if (!r || r.stage !== 'setup') return;
  const D = DIST[r.t], n = D.segs, km = segKm(r), cat = s.ath.cat, w = r.weather;
  const L: LiveRace = {
    field: [], seg: 0, energy: 100 + (s.owned.nutri ? 5 : 0), cum: [], log: [], lines: [], gelsLeft: r.gels,
    grade: grades(r, n), head: Array.from({ length: n }, (_, i) => w.wind >= 15 && i % 2 === 0),
    ref: paceFor(ability(s.a, r.t), r.t), cost: segmentCost(s.a, r.t), wall: false, sprint: null, sprintDone: false
  };
  if (has(s, 'diesel') && (r.t === 'meia' || r.t === 'maratona')) L.cost *= 0.92;
  const N = cat === 'F' ? r.nF : r.nM;
  const mean = r.lvl + (cat === 'F' ? -7 : 0) + (season(s) - 1) * 2.5;
  const used = new Set([s.ath.name]);
  const add = (nm: string, age: number, ab: number, tag: Entrant['tag'], club: string) => {
    used.add(nm);
    const ref = paceFor(ab, r.t), style = random();
    const fades = r.t === 'maratona' || r.t === 'meia' ? random() < 0.3 : false;
    let t = 0;
    const cum: number[] = [];
    for (let i = 0; i < n; i++) {
      const prog = i / (n - 1 || 1);
      const plan = style < 0.3 ? 0.985 + prog * 0.03 : style < 0.5 ? 1.01 - prog * 0.025 : 1;
      const fade = fades && prog > 0.6 ? 1.05 : 1;
      t += ref * km * condF(L, r, w, i, false) * plan * fade * (1 + gauss() * 0.008);
      cum.push(t);
    }
    L.field.push({ nm, age, ag: ageGroup(age), tag, club, cum });
  };
  if (!isClub(r) && !s.rival.out) add(s.rival.nm, s.rival.age, s.rival.r, 'rival', pick(OTHER_CLUBS));
  const mates = shuffle(s.club.members.filter(m => m.cat === cat)).slice(0, isClub(r) ? 6 : random() < 0.5 ? 2 : 3);
  for (const m of mates) add(m.nm, m.age, m.r, 'clube', myClub(s).n);
  while (L.field.length < N - 1) {
    let nm: string;
    do nm = nameFor(cat); while (used.has(nm));
    const age = 18 + Math.floor(random() * 50);
    add(nm, age, mean + gauss() * 9 - Math.max(0, age - 45) * 0.3, '', isClub(r) ? myClub(s).n : random() < 0.5 ? pick(OTHER_CLUBS) : '');
  }
  r.live = L;
  r.stage = 'live';
  line(L, 0, 'gen', `Partida: ${N} atletas, ${weatherText(w)}. ${r.course === 'plano' ? 'Percurso plano.' : r.course === 'ondulado' ? 'Percurso ondulado.' : 'Muitas subidas pela frente.'}`);
}

const line = (L: LiveRace, seg: number, fam: Fam, text: string) => L.lines.push({ seg, fam, text });

/** Posição (1 = à frente) de um tempo acumulado no fim de um segmento. */
const positionAt = (L: LiveRace, i: number, t: number) => L.field.filter(f => f.cum[i] < t).length + 1;

/** Quem vai imediatamente à tua frente (no último segmento corrido), para a opção "colar". */
export function aheadOf(L: LiveRace): Entrant | null {
  const i = L.seg - 1;
  if (i < 0) return null;
  const t = L.cum[i];
  const ahead = L.field.filter(f => f.cum[i] < t && t - f.cum[i] < 40).sort((a, b) => b.cum[i] - a.cum[i]);
  return ahead[0] ?? null;
}

function myFactors(s: GameState, i: number): number {
  const r = s.race!, L = r.live!, w = r.weather;
  const accl = (s.heatUntil ?? 0) >= s.today;
  let f = condF(L, r, w, i, accl, has(s, 'subidas') ? 0.5 : 1 - (s.a.str - 40) / 150);
  f *= 1 - clamp(form(s), -20, 20) * 0.002;
  f *= 1 + Math.max(0, s.fatigue - 60) * 0.001;
  f *= 1 - s.feel * 0.005;
  if ((s.altitudeUntil ?? 0) >= s.today) f *= 0.98;
  if (s.owned.carbon) f *= 0.985;
  return f;
}

/** As escolhas para o próximo segmento, com ritmo previsto e energia gasta. */
export function paceOptions(s: GameState): PaceOption[] {
  const r = s.race, L = r?.live;
  if (!r || !L || L.seg >= DIST[r.t].segs) return [];
  const i = L.seg, base = L.ref * myFactors(s, i), up = L.grade[i] > 0 ? 1 + L.grade[i] * 0.12 : 1;
  const last = i === DIST[r.t].segs - 1;
  const heat = r.weather.air > 22 ? 1 + (r.weather.air - 22) * 0.01 * ((s.heatUntil ?? 0) >= s.today ? 0.4 : 1) : 1;
  const c = (p: number) => Math.round(L.cost * p * up * heat * (last && has(s, 'finisher') && p > 1 ? 0.8 : 1));
  const opts: PaceOption[] = (['poupar', 'ritmo', 'atacar'] as const).map(p => ({
    pace: p, label: PACE_NAME[p], perKm: base * PACE_F[p], cost: c(PACE_COST[p]),
    hint: p === 'poupar' ? 'Guarda energia para o fim.' : p === 'ritmo' ? 'O teu ritmo de prova.' : 'Ganhas tempo, mas gasta muita energia.'
  }));
  const a = aheadOf(L);
  if (a) {
    const theirs = (a.cum[i] - (a.cum[i - 1] ?? 0)) / segKm(r);
    const f = clamp(theirs / base, MAX_F, 1.08);
    opts.push({ pace: 'seguir', label: `Colar a ${a.nm.split(' ')[0]}`, perKm: base * f, cost: c(costOf(f)), hint: theirs / base < MAX_F ? 'Vai mais rápido do que consegues: vais perdê-lo.' : 'Corres no ritmo dele, à sombra.' });
  }
  return opts;
}

/** Toma um gel antes do próximo segmento. */
export function takeGel(s: GameState): void {
  const r = s.race, L = r?.live;
  if (!r || !L || L.gelsLeft <= 0 || L.seg >= DIST[r.t].segs) return;
  L.gelsLeft--;
  L.energy = Math.min(100, L.energy + 14);
  const taken = r.gels - L.gelsLeft;
  if (taken > GELS[r.t] + 2 && random() < 0.35) {
    L.cum[L.seg - 1] = (L.cum[L.seg - 1] ?? 0) + 25;
    line(L, L.seg, 'gen', 'Gel a mais: o estômago queixou-se. Perdeste 25 s.');
  } else line(L, L.seg, 'gen', `Gel tomado: +14 de energia (${L.gelsLeft} no bolso).`);
}

/** Corre o próximo segmento com o esforço escolhido. */
export function runSegment(s: GameState, pace: Pace): void {
  const r = s.race, L = r?.live;
  if (!r || !L || r.stage !== 'live') return;
  const n = DIST[r.t].segs, i = L.seg;
  if (i >= n) return;
  const opts = paceOptions(s), o = opts.find(x => x.pace === pace) ?? opts[1];
  let perKm = o.perKm;
  const before = i ? positionAt(L, i - 1, L.cum[i - 1]) : 0;
  if (L.energy <= 0) {
    if (!L.wall) { L.wall = true; line(L, i, 'long', 'Bateste na parede. As pernas não respondem.'); }
    perKm *= 1 + 0.12 * (1 - s.a.men / 200) * (has(s, 'cabeca') ? 0.5 : 1);
  } else if (L.energy < 15) perKm *= 1.02;
  const t = perKm * segKm(r) * (1 + gauss() * 0.006);
  L.energy = Math.round(clamp(L.energy - o.cost, -30, 100) * 10) / 10;
  L.cum[i] = (L.cum[i - 1] ?? 0) + t;
  const pos = positionAt(L, i, L.cum[i]);
  L.log.push({ pace: o.pace, t, energy: L.energy, pos });
  L.seg++;
  const km = Math.round(segKm(r) * (i + 1) * 10) / 10;
  const fam: Fam = o.pace === 'atacar' ? 'fast' : o.pace === 'poupar' ? 'easy' : 'long';
  const g = L.grade[i] > 0 ? ' a subir' : L.grade[i] < 0 ? ' a descer' : '';
  const moved = before ? before - pos : 0;
  line(L, L.seg, fam, `Km ${String(km).replace('.', ',')}${g}: ${pos}º lugar${moved > 0 ? `, ganhaste ${moved} posições` : moved < 0 ? `, perdeste ${-moved}` : ''}. Energia ${Math.max(0, Math.round(L.energy))}.`);
  const riv = L.field.find(f => f.tag === 'rival');
  if (riv) {
    const gap = L.cum[i] - riv.cum[i];
    if (Math.abs(gap) < 6) line(L, L.seg, 'fast', `${riv.nm} está mesmo ao teu lado.`);
    else if (i === Math.floor(n / 2)) line(L, L.seg, 'gen', gap > 0 ? `${riv.nm} vai ${fmt(gap)} à tua frente.` : `Levas ${fmt(-gap)} de vantagem sobre ${riv.nm}.`);
  }
  if (L.seg === n) {
    const close = L.field.filter(f => Math.abs(f.cum[n - 1] - L.cum[n - 1]) <= SPRINT_GAP).sort((a, b) => Math.abs(a.cum[n - 1] - L.cum[n - 1]) - Math.abs(b.cum[n - 1] - L.cum[n - 1]))[0];
    if (!close) L.sprintDone = true;
  }
}

/** Há sprint final? Devolve o adversário e se ele vai à frente. */
export function sprintOpponent(s: GameState): { nm: string; behind: boolean } | null {
  const r = s.race, L = r?.live;
  if (!r || !L || L.sprintDone || L.seg < DIST[r.t].segs) return null;
  const n = DIST[r.t].segs, me = L.cum[n - 1];
  const f = L.field.filter(x => Math.abs(x.cum[n - 1] - me) <= SPRINT_GAP).sort((a, b) => Math.abs(a.cum[n - 1] - me) - Math.abs(b.cum[n - 1] - me))[0];
  return f ? { nm: f.nm, behind: f.cum[n - 1] < me } : null;
}

/** Resultado do sprint final: quem ganha corta a meta meio segundo à frente. `null` = sem sprint jogado (decide a energia). */
export function applySprint(s: GameState, won: boolean | null): void {
  const r = s.race, L = r?.live;
  if (!r || !L || L.sprintDone) return;
  const o = sprintOpponent(s);
  L.sprintDone = true;
  if (!o) return;
  const n = DIST[r.t].segs, f = L.field.find(x => x.nm === o.nm)!;
  const w = won ?? random() < clamp(0.35 + L.energy / 100 + (s.a.spd - 50) / 100 + (has(s, 'finisher') ? 0.15 : 0), 0.1, 0.9);
  L.cum[n - 1] = w ? Math.min(L.cum[n - 1], f.cum[n - 1] - 0.5) : Math.max(L.cum[n - 1], f.cum[n - 1] + 0.5);
  L.sprint = { nm: o.nm, won: w };
  line(L, n, 'fast', w ? `Sprint final contra ${o.nm}: ganhaste por meio segundo!` : `Sprint final contra ${o.nm}: perdeste por meio segundo.`);
}

/** Corre o resto da prova sozinho com uma regra simples (simulador, piloto automático e "saltar"). */
export function autoRace(s: GameState): void {
  const r = s.race;
  if (r?.stage === 'setup') startRace(s);
  const L = s.race?.live;
  if (!r || !L) return;
  const n = DIST[r.t].segs;
  while (L.seg < n) {
    const left = n - L.seg, opts = paceOptions(s), ritmo = opts[1].cost;
    if (L.energy < 45 && L.gelsLeft > 0) takeGel(s);
    const need = ritmo * left;
    const p: Pace = left <= 2 && L.energy > need * 1.3 ? 'atacar' : L.energy < need * 0.95 ? 'poupar' : 'ritmo';
    runSegment(s, p);
  }
  applySprint(s, null);
}

const ord = (cat: string) => (cat === 'F' ? 'ª' : 'º');
const RACE_GAINS: Record<RaceDef['t'], Partial<Attrs>> = {
  '5k': { spd: 0.9, thr: 0.6, men: 0.3 }, '10k': { thr: 1.1, spd: 0.4, end: 0.3, men: 0.4 },
  meia: { thr: 0.8, end: 1.2, men: 0.6 }, maratona: { end: 2, men: 1, thr: 0.3 }
};

/** Fecha a prova: classificação, prémios, fama, pontos, recorde, rival, e conta como o treino do dia. */
export function finishLiveRace(s: GameState): void {
  const r = s.race, L = r?.live;
  if (!r || !L || r.stage !== 'live') return;
  const n = DIST[r.t].segs;
  if (L.seg < n) autoRace(s);
  if (!L.sprintDone) applySprint(s, null);
  const meE: Entrant = { nm: s.ath.name, age: s.ath.age, ag: ageGroup(s.ath.age), tag: 'tu', club: myClub(s).n, cum: L.cum.slice() };
  const all = [...L.field, meE].sort((a, b) => a.cum[n - 1] - b.cum[n - 1]);
  const p = all.indexOf(meE) + 1, N = all.length;
  const agList = all.filter(f => f.ag === meE.ag), agP = agList.indexOf(meE) + 1;
  const total = L.cum[n - 1], club = isClub(r);
  const riv = L.field.find(f => f.tag === 'rival');
  const beatRival = !!riv && riv.cum[n - 1] > total;
  const o = ord(s.ath.cat), catL = s.ath.cat === 'F' ? 'feminina' : 'masculina';

  const rt = RACE_REWARD[r.t];
  const prize = club ? 0 : p <= 3 ? [150, 80, 40][p - 1] * rt.prize * (r.prizeMult ?? 1) : 0;
  let fame = club ? (p <= 3 ? 1 : 0.3) : (Math.max(0, N * 0.5 - p) / N) * 18 * rt.fame + 1 + (agP === 1 ? 2 : 0);
  if (has(s, 'popular')) fame *= 1.25;
  const pts = club ? 0 : Math.round(Math.max(0, 1 - (p - 1) / N) * 40 * rt.pts);
  const bonus = !club && p <= 3 ? s.sponsors.reduce((sum, sp) => sum + sp.podium, 0) : 0;
  const prevPb = s.pb[r.t], pb = !prevPb || total < prevPb;
  if (pb) s.pb[r.t] = total;
  let xp = Math.round(rt.xp * (club ? 0.7 : 1) + (pb && prevPb ? 25 : 0) + (agP <= 3 ? 15 : 0));
  let slot = '';
  if (r.slot && r.slotTo && agP <= r.slot) { s.slots[r.slotTo] = true; slot = `Vaga para ${raceName(r.slotTo)}`; }
  if (r.tier === 'mundial') {
    const champ = s.ath.cat === 'F' ? 'Campeã' : 'Campeão';
    const title = p === 1 ? `${champ} do Mundo de Maratona (temporada ${season(s)})` : agP === 1 ? `${champ} do Mundo, escalão ${meE.ag} (temporada ${season(s)})` : '';
    const text = title || `${agP}${o} no escalão ${meE.ag} do Mundial (temporada ${season(s)})`;
    s.titles = [...(s.titles ?? []), text];
    s.fame += title ? 15 : 6;
    xp += title ? 200 : 60;
    s.inbox.unshift(title
      ? { k: 'msg', t: `${champ} do mundo!`, x: `${title}. Chegaste ao topo. A carreira continua: defende o título.`, done: true }
      : { k: 'msg', t: 'Acabaste o Mundial', x: `${text}. Chegar ao Mundial já é o sonho de muitos. Para o ano há mais.`, done: true });
  }
  let legend = '';
  if (!club) {
    s.legends[r.id] ??= { nm: nameFor(s.ath.cat), count: 3 };
    const leg = s.legends[r.id];
    if ((s.raceCount[r.id] ?? 0) > leg.count) { leg.nm = s.ath.name; leg.count = s.raceCount[r.id]; legend = `És a lenda local de ${r.n}.`; }
  } else s.club.season += p <= 3 ? 20 : 6;

  s.money += prize + bonus;
  s.fame += fame;
  s.pts += pts;
  s.xp += xp;
  s.fatigue = clamp(s.fatigue + rt.fat, 0, 100);
  s.tl += rt.load;
  s.wk.load += rt.load;
  s.shoeKm += Math.round(DIST[r.t].km);
  const gains: Partial<Attrs> = {};
  for (const [at, g0] of Object.entries(RACE_GAINS[r.t]) as [AttrKey, number][]) {
    const g = g0 * Math.pow(1 - s.a[at] / 100, 1.2);
    s.a[at] = Math.min(99, s.a[at] + g);
    gains[at] = g;
  }
  s.moral = clamp(s.moral + (p <= N * 0.2 ? 8 : p > N * 0.6 ? -5 : 2) + (beatRival ? 5 : 0) + (pb ? 4 : 0), 0, 100);
  const rivalNm = riv?.nm ?? '';
  if (riv) rivalAfterRace(s, beatRival);
  if (!club) {
    const lost = s.sponsors.filter(sp => sp.req && p / N > sp.req);
    for (const sp of lost) s.inbox.unshift({ k: 'msg', t: `${sp.n} rescindiu o contrato`, x: `Acabaste em ${p}${o} de ${N}, fora do top ${Math.round(sp.req! * 100)}%.`, done: true });
    s.sponsors = s.sponsors.filter(sp => !lost.includes(sp));
  }

  const row = (f: Entrant): ResultRow => ({ pos: all.indexOf(f) + 1, nm: f.nm, tag: f.tag, ag: f.ag, total: f.cum[n - 1], me: f === meE });
  const lists = { geral: all.slice(0, 10).map(row), escalao: agList.slice(0, 10).map(row), clube: all.filter(f => f.tag === 'clube' || f === meE).map(row) };
  if (p > 10) lists.geral.push(row(meE));
  if (agP > 10) lists.escalao.push(row(meE));

  s.results.push({ day: s.today, season: season(s), id: r.id, n: r.n, t: r.t, p, N, agP, agN: agList.length, ag: meE.ag, total, pb });
  const segs = L.log.map(l => ({ t: l.t, km: segKm(r), pace: l.pace, energy: l.energy }));
  const res: RaceResult = { p, N, agP, agN: agList.length, ag: meE.ag, catL, o, total, segs, lines: L.lines, lists, prize, bonus, fame, pts, xp, slot, legend, beatRival, rivalNm, pb, prevPb };
  r.res = res;
  r.stage = 'done';
  delete r.live;
  completeDay(s, { d: s.today, k: 'race', how: 'race', load: rt.load, xp, gains, notes: [], min: Math.round(total / 60), km: DIST[r.t].km });
}

/** Sai do ecrã de resultado. */
export function finishRace(s: GameState): void {
  if (s.race?.stage === 'done') s.race = null;
}

/** O dia acabou com a prova por correr ou a meio: corre sozinha ou fica por correr. */
export function abandonRace(s: GameState): void {
  const r = s.race;
  if (!r) return;
  if (r.stage === 'setup') {
    s.inbox.unshift({ k: 'msg', t: `Não correste ${r.n}`, x: 'Inscreveste-te mas não apareceste à partida. A inscrição não é devolvida.', done: true });
    s.race = null;
    return;
  }
  if (r.stage === 'live') finishLiveRace(s);
  s.race = null;
}
