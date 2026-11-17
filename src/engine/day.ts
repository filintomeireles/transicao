// O dia de jogo. Cada dia real tem um treino: importado do relógio, confirmado por ti ou simulado.
// Se não jogares, o atleta treina sozinho em piloto automático (rende pouco) até BAL.autoMax dias; depois para.
import { BAL } from './balance';
import { dayOfTime, dow, weekdayName } from './clock';
import { ATTR_KEYS, CAMPS, EVENTS, INJURIES, SESS, SHOP, SPONSORS } from './data';
import { ageGroup, clamp, dec, eur } from './format';
import { classify, loadRatio } from './import/activities';
import { overall } from './perf';
import { abandonRace } from './race';
import { pick, random, rnd } from './rng';
import { rivalWeek } from './rival';
import type { Activity, AttrKey, Attrs, DaySummary, Effort, GameState, How, SessionKey } from './types';
import { clubToday, form, groupToday, has, myClub, plannedToday, season, weekInSeason, weekday, weekIdx } from './world';

const HOW_GAIN: Record<How, number> = { real: BAL.real, manual: BAL.manual, sim: 1, auto: BAL.auto, rest: 0, race: 1, miss: 0 };
const HOW_XP: Record<How, number> = { real: BAL.xpReal, manual: BAL.xpManual, sim: 1, auto: BAL.xpAuto, rest: 0, race: 1, miss: 0 };
export const HOW_NAME: Record<How, string> = {
  real: 'treino real', manual: 'confirmado por ti', sim: 'simulado', auto: 'piloto automático', rest: 'descanso', race: 'prova', miss: 'parado'
};

/** Multiplicador dos ganhos: treinador, emprego, fadiga, moral, como te sentes, equipamento e talentos. */
export function gainMult(s: GameState, k: SessionKey): number {
  let m = BAL.gain;
  if (s.subs.coach) m *= BAL.coach;
  if (!s.job) m *= 1.1;
  m *= Math.max(0.4, 1 - Math.max(0, s.fatigue - BAL.fatFrom) * BAL.fatPen);
  m *= 0.85 + (s.moral / 100) * 0.3;
  m *= 1 + s.feel * 0.08;
  if (s.owned.watch && SESS[k].fam === 'fast') m *= 1.1;
  if (has(s, 'madrugador') && (k === 'easy' || k === 'long')) m *= 1.15;
  return m;
}

export function injuryRisk(s: GameState, k: SessionKey, load: number): number {
  if (!SESS[k].run || !load) return 0;
  let p = BAL.injBase * (load / 60) + Math.max(0, s.fatigue - BAL.injFrom) * BAL.injSlope - s.a.str * 0.00003;
  if (s.shoeKm > 700) p += 0.012;
  if (has(s, 'pesleves')) p *= 0.7;
  return Math.max(0, p);
}

export interface TrainOpts { how: How; effort?: Effort; ratio?: number; min?: number; km?: number; part?: number }

/**
 * Faz um treino: ganhos de atributos, fadiga, carga do dia, pontos e risco de lesão.
 * `part` (0–1) aplica só uma parte dos ganhos e pontos: serve para trocar um treino simulado por um real.
 */
export function train(s: GameState, k: SessionKey, o: TrainOpts): DaySummary {
  const S = SESS[k], [effL, effG] = BAL.effort[o.effort ?? 'plano'];
  const ratio = o.ratio ?? 1, part = o.part ?? 1;
  const load = S.load * ratio * (o.how === 'sim' ? effL : 1);
  const club = clubToday(s, k), group = groupToday(s, k);
  const camp = s.camp ? CAMPS.find(c => c.id === s.camp!.id) : undefined;
  let m = gainMult(s, k) * HOW_GAIN[o.how] * ratio * (o.how === 'sim' ? effG : 1) * part;
  if (club) m *= BAL.clubBonus;
  if (group) m *= BAL.clubBonus;
  if (o.how === 'sim' && s.rain && S.run && !s.owned.treadmill) m *= 0.85;
  const gains: Partial<Attrs> = {}, notes: string[] = [];
  for (const [at, g0] of Object.entries(S.g) as [AttrKey, number][]) {
    let g = g0 * m * Math.pow(1 - s.a[at] / 100, 1.2) * (camp?.mult[at] ?? 1);
    if (at === 'str' && s.subs.gym) g *= 1.3;
    s.a[at] = Math.min(99, s.a[at] + g);
    gains[at] = g;
  }
  if (part >= 1) {
    s.fatigue = clamp(s.fatigue + load * BAL.fatIn, 0, 100);
    s.wk.load += load;
    s.tl += load;
    if (S.run) s.shoeKm += Math.round(o.km ?? S.km * ratio);
    if (k === 'easy' || k === 'long') s.wk.z2 += (o.min ?? S.min * ratio) / 60;
  }
  const xp = Math.round(load * BAL.xpPerLoad * HOW_XP[o.how] * (club || group ? 1.2 : 1) * part);
  s.xp += xp;
  if (club && part >= 1) {
    notes.push(`Treino do clube: +15% nos ganhos${BAL.clubPay[s.club.div] ? ` e ${BAL.clubPay[s.club.div]} € do patrocinador do clube` : ''}.`);
    if (!s.wk.club) { s.wk.club = true; s.clubEvents++; s.money += BAL.clubPay[s.club.div] ?? 0; }
  }
  if (group && part >= 1) notes.push('Longão com o grupo do clube: +15% nos ganhos.');
  if (part >= 1 && o.how !== 'auto' && s.injury === 0 && random() < injuryRisk(s, k, load)) {
    s.injury = 5 + Math.floor(random() * 10);
    s.injuryName = pick(INJURIES);
    s.moral = clamp(s.moral - 8, 0, 100);
    notes.push(`Lesão: ${s.injuryName}. ${s.injury} dias sem correr; podes fazer treino cruzado e força.`);
  }
  return { d: s.today, k, how: o.how, effort: o.effort, load: Math.round(load), xp, gains, notes, min: Math.round(o.min ?? S.min * ratio), km: Math.round((o.km ?? S.km * ratio) * 10) / 10 };
}

/** Conta o treino de hoje como feito por ti: série de dias, objetivo da semana, resumo. */
export function completeDay(s: GameState, sum: DaySummary): DaySummary {
  s.done = true;
  if (sum.how === 'real' || sum.how === 'manual' || sum.how === 'sim') s.wk.mine++;
  if (sum.how !== 'auto' && sum.how !== 'miss') {
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    if (s.streak % BAL.streakEvery === 0) { s.xp += BAL.streakXp; sum.notes.push(`${s.streak} dias seguidos a treinar: +${BAL.streakXp} pontos.`); sum.xp += BAL.streakXp; }
  }
  if (s.wk.mine === BAL.weekGoal && sum.how !== 'auto') {
    s.xp += BAL.weekGoalXp; s.money += BAL.weekGoalMoney; sum.xp += BAL.weekGoalXp;
    sum.notes.push(`Objetivo da semana cumprido (${BAL.weekGoal} treinos): +${BAL.weekGoalXp} pontos e ${BAL.weekGoalMoney} € do patrocinador do clube.`);
  }
  s.last = sum;
  s.days = [...s.days, { d: sum.d, k: sum.k, how: sum.how }].slice(-60);
  return sum;
}

/** Treina hoje com a sessão do plano (ou outra). Devolve o resumo do dia. */
export function doToday(s: GameState, how: 'manual' | 'sim', effort: Effort = 'plano', k: SessionKey = plannedToday(s)): DaySummary | null {
  if (s.done || s.race) return null;
  if (s.injury > 0 && SESS[k].run) k = 'cross';
  if (k === 'rest') { s.xp += 5; return completeDay(s, { d: s.today, k, how: 'rest', load: 0, xp: 5, gains: {}, notes: ['Dia de descanso: a fadiga desce mais depressa.'], min: 0, km: 0 }); }
  const sum = train(s, k, { how, effort });
  return completeDay(s, sum);
}

/** Descansar hoje, seja qual for o plano. */
export function restToday(s: GameState): DaySummary | null {
  if (s.done || s.race) return null;
  s.xp += 5;
  return completeDay(s, { d: s.today, k: 'rest', how: 'rest', load: 0, xp: 5, gains: {}, notes: ['Dia de descanso: a fadiga desce mais depressa.'], min: 0, km: 0 });
}

/** Dias seguidos (até ontem) sem jogar: em piloto automático ou parado. */
const autoRun = (s: GameState): number => { let n = 0; for (let i = s.days.length - 1; i >= 0 && (s.days[i].how === 'auto' || s.days[i].how === 'miss'); i--) n++; return n; };

/** Um dia em que não jogaste: piloto automático (o plano, a render pouco) ou, depois de muitos dias, parado. */
function autoDay(s: GameState): void {
  if (s.race) abandonRace(s);
  if (s.done) return;
  s.streak = 0;
  const k = plannedToday(s);
  if (autoRun(s) >= BAL.autoMax) { completeDay(s, { d: s.today, k: 'rest', how: 'miss', load: 0, xp: 0, gains: {}, notes: [], min: 0, km: 0 }); return; }
  if (k === 'rest') { completeDay(s, { d: s.today, k, how: 'rest', load: 0, xp: 0, gains: {}, notes: [], min: 0, km: 0 }); s.days[s.days.length - 1].how = 'auto'; return; }
  completeDay(s, train(s, k, { how: 'auto' }));
}

/** Fecha o dia: recuperação, fitness e forma, perda natural, lesão, histórico. */
function endDay(s: GameState): void {
  const rested = !s.tl;
  let decay = rested ? BAL.fatDecayRest : BAL.fatDecay;
  if (s.owned.roller) decay -= 0.02;
  if (has(s, 'sono')) decay -= 0.04;
  s.fatigue = clamp(s.fatigue * decay + (s.job && dow(s.today) < 5 ? BAL.jobFat : 0), 0, 100);
  s.ctl += (s.tl - s.ctl) / BAL.ctlDays;
  s.atl += (s.tl - s.atl) / BAL.atlDays;
  s.tl = 0;
  for (const k of ATTR_KEYS) if (k !== 'men') s.a[k] = Math.max(10, s.a[k] - BAL.decay * Math.pow(s.a[k] / 50, 2));
  if (s.injury > 0) { s.injury--; if (!s.injury) s.inbox.unshift({ k: 'msg', t: 'Recuperado da lesão', x: `Já podes voltar a correr. Começa com calma.`, done: true }); }
  if (s.camp) {
    s.camp.left--;
    if (s.camp.left <= 0) {
      const c = CAMPS.find(x => x.id === s.camp!.id)!;
      if (c.id === 'altitude') s.altitudeUntil = s.today + 28;
      if (c.id === 'calor') s.heatUntil = s.today + 42;
      s.inbox.unshift({ k: 'msg', t: `Estágio terminado: ${c.n}`, x: c.id === 'altitude' ? 'Voltas com mais glóbulos vermelhos: nos próximos 28 dias rendes mais 2% em prova.' : c.id === 'calor' ? 'Estás aclimatado: nas provas com calor vais sofrer muito menos.' : 'Pernas mais rápidas. Agora é usá-las.', done: true });
      s.camp = undefined;
    }
  }
  s.hist = [...s.hist, { d: s.today, ovr: overall(s.a), form: Math.round(form(s) * 10) / 10, fat: Math.round(s.fatigue) }].slice(-120);
  if (s.fatigue > 75) s.moral -= 1;
  s.moral = clamp(s.moral + (65 - s.moral) * 0.015, 0, 100);
  if (dow(s.today) === 6) endWeek(s);
}

/** Domingo à noite: finanças, clube, patrocínios, rival, objetivos; no fim da temporada, a mudança de ano. */
function endWeek(s: GameState): void {
  const notes: string[] = [];
  let fin = -BAL.living;
  if (s.job) fin += BAL.salary;
  for (const sp of s.sponsors) { fin += sp.weekly; sp.left--; }
  for (const sp of s.sponsors.filter(x => x.left <= 0)) {
    delete s.offered[sp.id];
    s.renew[sp.id] = (s.renew[sp.id] ?? 1) * 1.2;
    s.inbox.unshift({ k: 'msg', t: `Contrato com ${sp.n} terminou`, x: 'Se a tua fama se mantiver, voltam com uma proposta 20% melhor.', done: true });
  }
  s.sponsors = s.sponsors.filter(sp => sp.left > 0);
  for (const id of ['coach', 'gym']) if (s.subs[id]) fin -= SHOP.find(i => i.id === id)?.p ?? 0;
  s.money += fin;
  s.fame *= BAL.fameKeep;
  if (s.owned.crocs) s.moral += 2;

  // Treino real: série de semanas com 3 ou mais
  if (s.wk.real >= BAL.realStreakMin) {
    s.realStreak++; s.realBest = Math.max(s.realBest, s.realStreak);
    const f = Math.min(3, s.realStreak - 1);
    s.fame += f;
    if ([4, 8, 12, 20].includes(s.realStreak)) s.inbox.unshift({ k: 'msg', t: `Emblema: ${s.realStreak} semanas de treino real seguidas`, x: 'Treinaste a sério e o jogo viu. O emblema fica no teu perfil.', done: true });
    notes.push(`Série real: ${s.realStreak} semana${s.realStreak > 1 ? 's' : ''}${f ? ` (+${f} fama)` : ''}`);
  } else s.realStreak = 0;

  // Clube: pontos da semana e pontuação (média do top 10 de quem pontuou, ajustada pela participação)
  const C = s.club;
  const myPts = Math.round(s.wk.load / 4) + s.wk.mine * 5 + (s.wk.club ? 15 : 0);
  C.members.forEach((m, i) => {
    m.active = random() < 0.65;
    m.pts = m.active ? Math.round((rnd(40, 110) * m.r) / 55) : 0;
    if (random() < (i < 2 ? 0.85 : 0.3)) m.events = (m.events ?? 0) + 1;
    m.r = Math.min(85, m.r + rnd(-0.1, 0.25));
  });
  C.myPts = myPts;
  const scored = [...C.members.map(m => m.pts), myPts].filter(x => x > 0).sort((a, b) => b - a);
  const top = scored.length ? scored.slice(0, 10) : [0];
  C.part = (C.members.filter(m => m.active).length + (myPts > 0 ? 1 : 0)) / (C.members.length + 1);
  C.score = Math.round((top.reduce((a, b) => a + b, 0) / top.length) * (0.7 + 0.3 * C.part));
  C.season += C.score;
  for (const o of C.others) { o.score = Math.round(o.base * rnd(0.85, 1.15)); o.season += o.score; }
  const me = Math.round(s.wk.z2 * 10) / 10;
  const fr = C.members.slice(0, 3).map(m => ({ nm: m.nm, h: Math.round(rnd(2.5, 6) * 10) / 10 }));
  s.chal = { me, fr, won: fr.every(f => me > f.h) };
  if (s.chal.won) { s.xp += 20; notes.push('Ganhaste o desafio de Z2 do clube: +20 pontos.'); }

  s.lastWeek = { week: weekInSeason(s), season: season(s), load: Math.round(s.wk.load), fin, mine: s.wk.mine, goal: s.wk.mine >= BAL.weekGoal, notes };
  s.wk = { load: 0, mine: 0, real: 0, club: false, z2: 0 };

  for (const sp of SPONSORS) {
    if (s.fame >= sp.minFame && !s.offered[sp.id] && !s.sponsors.some(x => x.id === sp.id) && !s.inbox.some(m => m.k === 'offer' && m.id === sp.id && !m.done)) {
      s.offered[sp.id] = true;
      const f = s.renew[sp.id] ?? 1;
      s.inbox.unshift({ k: 'offer', id: sp.id, t: `${f > 1 ? 'Renovação' : 'Proposta'}: ${sp.n}`, x: `${sp.d} ${eur(sp.weekly * f)} por semana durante ${sp.weeks} semanas, mais ${eur(sp.podium * f)} por pódio.` });
      break;
    }
  }
  rivalWeek(s);
  if (s.money < -200) {
    s.money += 300; s.moral -= 10;
    s.inbox.unshift({ k: 'msg', t: 'A família emprestou 300 €', x: '"Isto da corrida dá dinheiro, não dá?" Moral −10.', done: true });
  }

  // Fim de temporada (a próxima semana é a 1.ª da temporada seguinte)
  if ((weekIdx(s) + 1) % BAL.seasonWeeks === 0) {
    const name = myClub(s).n;
    const table = [{ season: C.season, me: true }, ...C.others.map(o => ({ season: o.season, me: false }))].sort((a, b) => b.season - a.season);
    const pos = table.findIndex(t => t.me) + 1;
    let note = 'Ficam na mesma divisão.';
    if (pos === 1 && C.div > 1) { C.div--; s.fame += 5; s.clubKit++; note = `Sobem à divisão ${C.div}! Todos os membros ganham +5 fama e o kit de campeão.`; }
    else if (pos === table.length && C.div < 3) { C.div++; note = `Descem à divisão ${C.div}.`; }
    s.inbox.unshift({ k: 'msg', t: `O teu clube acabou a temporada em ${pos}º`, x: `${name} fez ${C.season} pontos. ${note}`, done: true });
    C.season = 0;
    for (const o of C.others) { o.season = 0; o.base *= rnd(1, 1.06); }
    s.ath.age++;
    s.slots = {};
    s.entries = undefined;
    const lastPts = s.pts;
    s.pts = 0;
    s.inbox.unshift({ k: 'msg', t: `Começa a temporada ${season(s) + 1}`, x: `Fizeste anos: agora tens ${s.ath.age}, escalão ${ageGroup(s.ath.age)}. Acabaste a temporada com ${lastPts} pontos de ranking; o ranking recomeça do zero. Os adversários também treinaram.`, done: true });
  }
  s.inbox = s.inbox.filter(m => m.done || m.k !== 'msg').slice(0, 16);
}

/** Começa um dia novo: como te sentes, chuva, e às vezes um acontecimento. */
function newDay(s: GameState): void {
  s.today++;
  s.done = false;
  if (s.skipRace && s.skipRace < s.today) s.skipRace = undefined;
  const f = form(s), x = random() + f * 0.01 - Math.max(0, s.fatigue - 55) * 0.01 + (s.moral - 60) * 0.003;
  s.feel = x > 0.8 ? 1 : x < 0.2 ? -1 : 0;
  s.rain = random() < 0.15;
  // Estafeta do clube: no sábado da 8.ª semana da temporada
  if (weekInSeason(s) === 8 && weekday(s) === 0) s.inbox.unshift({ k: 'ev', id: 'estafeta', t: EVENTS.estafeta.t, x: EVENTS.estafeta.x });
  else if (random() < 0.12) {
    const pool = Object.entries(EVENTS).filter(([, e]) => !e.scheduled && (!e.minFame || s.fame >= e.minFame) && (!e.job || s.job));
    const [id, e] = pick(pool);
    if (!s.inbox.some(m => m.id === id && !m.done)) s.inbox.unshift({ k: 'ev', id, t: e.t, x: e.x });
  }
}

/**
 * Põe o jogo no dia certo. Os dias que passaram sem jogares correm em piloto automático.
 * Devolve quantos dias passaram.
 */
export function syncToday(s: GameState, realDay: number): number {
  const target = realDay + (s.skew ?? 0);
  let n = 0;
  while (s.today < target) {
    autoDay(s);
    endDay(s);
    newDay(s);
    n++;
  }
  if (n > 1) {
    const auto = s.days.slice(-n).filter(d => d.how === 'auto').length;
    s.inbox.unshift({ k: 'msg', t: `Estiveste ${n} dias fora`, x: auto ? `O teu atleta treinou sozinho ${auto} dia${auto > 1 ? 's' : ''} em piloto automático: rende menos de metade de um treino feito por ti.${n > BAL.autoMax ? ` Depois de ${BAL.autoMax} dias parou de treinar.` : ''}` : 'O teu atleta esteve parado.', done: true });
  }
  return n;
}

/** Só para testes e para o modo sem limite: passa para o dia seguinte. */
export function skipDay(s: GameState): void {
  s.skew = (s.skew ?? 0) + 1;
  autoDay(s);
  endDay(s);
  newDay(s);
}

/** Junta atividades reais. As de hoje fazem o treino do dia; as dos últimos 7 dias substituem o piloto automático. */
export function addRealActivities(s: GameState, acts: Activity[], errs: string[] = []): string {
  const done: string[] = [], old: string[] = [];
  const weekStart = s.start + weekIdx(s) * 7;
  for (const a of acts) {
    const k = classify(a, s.a, s.ath.age);
    if (!k) continue;
    const key = `${a.sport}:${a.start ?? ''}:${Math.round(a.sec)}`;
    if (s.realKeys.includes(key)) continue;
    const d = a.start ? dayOfTime(a.start) : s.today;
    if (d > s.today || d < s.today - 7) { old.push(key); continue; }
    s.realKeys = [...s.realKeys, key].slice(-300);
    s.realTotal++;
    if (d >= weekStart) s.wk.real++;
    const ratio = loadRatio(a, k), km = Math.round(a.km * 10) / 10, min = Math.round(a.sec / 60);
    const label = `${SESS[k].n}${km ? ` · ${dec(km)} km` : ''}`;
    if (d === s.today) {
      const prev = s.done ? s.last : null;
      if (!s.done && !s.race) { completeDay(s, train(s, k, { how: 'real', ratio, min, km })); done.push(`${label} (hoje)`); }
      else if (prev && (prev.how === 'manual' || prev.how === 'sim') && prev.k === k) {
        // já tinhas confirmado ou simulado este treino: passa a contar como real
        const part = (BAL.real - HOW_GAIN[prev.how]) / BAL.real;
        const sum = train(s, k, { how: 'real', ratio, min, km, part });
        prev.how = 'real'; prev.xp += sum.xp;
        for (const [at, g] of Object.entries(sum.gains) as [AttrKey, number][]) prev.gains[at] = (prev.gains[at] ?? 0) + g;
        s.days[s.days.length - 1].how = 'real';
        done.push(`${label} (hoje: passa a contar como real)`);
      } else {
        const sum = train(s, k, { how: 'real', ratio, min, km });
        if (s.last && s.last.d === s.today) { s.last.xp += sum.xp; s.last.load += sum.load; s.last.notes.push(`Segundo treino: ${label}.`); }
        done.push(`${label} (segundo treino de hoje)`);
      }
    } else {
      const log = s.days.find(x => x.d === d);
      const prevHow = log?.how ?? 'miss';
      if (prevHow === 'real') { done.push(`${label} (${weekdayName(d)}: já contado)`); continue; }
      const part = prevHow === 'auto' || prevHow === 'manual' || prevHow === 'sim' ? (BAL.real - HOW_GAIN[prevHow]) / BAL.real : 1;
      train(s, k, { how: 'real', ratio, min, km, part });
      if (log) log.how = 'real'; else s.days.push({ d, k, how: 'real' });
      done.push(`${label} (${weekdayName(d)})`);
    }
  }
  let msg = done.length ? `Treino real: ${done.join('; ')}. Vale ${Math.round(BAL.real * 100)}% de um treino simulado e o dobro dos pontos.` : 'Nenhum treino novo importado.';
  if (old.length) msg += ` ${old.length} atividade${old.length > 1 ? 's' : ''} com mais de 7 dias ficaram de fora.`;
  if (errs.length) msg += ' ' + errs.join('; ');
  return msg;
}

