import { BAL } from './balance';
import { ATTR, ATTR_KEYS, DAYS, EVENTS, GELS, INJURIES, SESS, SHOP, SPONSORS } from './data';
import { ageGroup, clamp, eur } from './format';
import { classify, loadRatio } from './import/activities';
import { pick, random, rnd } from './rng';
import type { Activity, Attrs, GameState, Session, SessionKey, Sport } from './types';
import { canAfford, canEnter, myClub, raceThisWeek, season, weekInSeason, whyNot } from './world';

export function gainMult(s: GameState, sp: Sport): number {
  let m = 1;
  if (s.subs.coach) m *= BAL.coach;
  if (!s.job) m *= 1.1;
  if (sp === 'bike') {
    if (s.owned.pm) m *= 1.15;
    if (s.owned.trainer) m *= 1.1;
    else if (s.rain) m *= 0.6;
  }
  m *= Math.max(0.4, 1 - Math.max(0, s.fatigue - BAL.fatFrom) * BAL.fatPen);
  return m * (0.85 + (s.moral / 100) * 0.3);
}

export function injuryRisk(s: GameState, sess: Session): number {
  if (sess.sp === 'swim' || !sess.load) return 0;
  let p = 0.006 + Math.max(0, s.fatigue - BAL.injFrom) * BAL.injSlope - s.a.str * 0.00005;
  if (sess.km && s.shoeKm > 700) p += 0.03;
  if (sess.sp !== 'run') p *= 0.5;
  return Math.max(0, p);
}

export interface DayItem { k: SessionKey; ratio: number; real: boolean; min: number; km: number }

/** O que acontece num dia: os treinos reais importados substituem o plano. */
export function dayItems(s: GameState, i: number): DayItem[] {
  const real = s.real[i] || [];
  if (real.length) return real.map(r => ({ k: r.k, ratio: r.ratio, real: true, min: r.min, km: r.km }));
  const k = s.plan[i];
  return [{ k, ratio: 1, real: false, min: SESS[k].min, km: SESS[k].km ?? 0 }];
}

/** Bónus de grupo: evento do clube no seu dia e long run de domingo. */
export function bonusFor(s: GameState, i: number, k: SessionKey): ('club' | 'group')[] {
  const ev = myClub(s).ev, sess = SESS[k], b: ('club' | 'group')[] = [];
  if (i === ev.d && (sess.sp === ev.sp || k === 'brick')) b.push('club');
  if (i === 6 && k === 'runZ2') b.push('group');
  return b;
}

const entersRace = (s: GameState) => { const r = raceThisWeek(s); return !!r && canEnter(s, r) && canAfford(s, r); };

/** Previsão do fim da semana com o plano atual. */
export function projected(s: GameState): { fatigue: number; load: number; form: number } {
  const enter = entersRace(s);
  let f = s.fatigue, load = 0;
  for (let i = 0; i < 7; i++) {
    if (i === 6 && enter) continue;
    let rested = true;
    for (const it of dayItems(s, i)) {
      const L = SESS[it.k].load * it.ratio;
      load += L;
      f = clamp(f + L * BAL.fatIn, 0, 100);
      if (it.k !== 'rest') rested = false;
    }
    f *= rested ? BAL.fatDecayRest : BAL.fatDecay;
  }
  if (s.job) f += BAL.jobFat;
  f = clamp(f, 0, 100);
  const ctl = s.ctl + (load - s.ctl) * BAL.ctlRate, atl = s.atl + (load - s.atl) * BAL.atlRate;
  return { fatigue: f, load: Math.round(load), form: (ctl - atl) / BAL.formDiv };
}

/** Fecha a semana: treinos, fadiga, finanças, clube. Se houver prova, deixa-a em s.race; senão avança. */
export function processWeek(s: GameState): void {
  const race = raceThisWeek(s), enter = entersRace(s);
  const rep: string[] = [], gains: Partial<Attrs> = {};
  const spLoad = { swim: 0, bike: 0, run: 0 };
  let load = 0, newInjury = false, z2 = 0, clubPart = false;
  const weekReal = s.real.flat().length;
  let realUsed = 0, realRestDays = 0, groupRun = false;
  const clubDays: string[] = [];

  for (let i = 0; i < 7; i++) {
    if (i === 6 && enter) continue;
    let rested = true;
    for (const it of dayItems(s, i)) {
      let k = it.k, sess = SESS[k];
      if (!it.real && s.injury > 0 && (sess.sp === 'run' || k === 'brick')) {
        rep.push(`${DAYS[i]}: lesionado, ${sess.n.toLowerCase()} trocada por descanso.`);
        k = 'rest'; sess = SESS.rest;
      }
      if (!it.real && sess.cost > s.money) {
        rep.push(`${DAYS[i]}: sem dinheiro para a piscina.`);
        k = 'rest'; sess = SESS.rest;
      }
      if (!it.real) s.money -= sess.cost;
      if (k !== 'rest') rested = false;

      const L = sess.load * it.ratio;
      load += L;
      s.fatigue = clamp(s.fatigue + L * BAL.fatIn, 0, 100);
      if (k === 'brick') { spLoad.bike += L / 2; spLoad.run += L / 2; }
      else if (sess.sp !== 'gen') spLoad[sess.sp] += L;

      // Treino real: bónus até um teto semanal, para não premiar volume sem fim.
      const realBoost = it.real && realUsed++ < BAL.realBonusCap ? BAL.realBonus : 1;
      let m = gainMult(s, sess.sp) * (L / BAL.gainLoad) * realBoost;
      const b = bonusFor(s, i, k);
      if (b.includes('club')) { m *= 1.15; clubPart = true; if (!clubDays.includes(DAYS[i])) clubDays.push(DAYS[i]); }
      if (b.includes('group')) { m *= 1.15; groupRun = true; }
      for (const [at, g0] of Object.entries(sess.g) as [keyof Attrs, number][]) {
        const g = g0 * Math.pow(1 - s.a[at] / 100, 1.2) * m;
        s.a[at] = Math.min(99, s.a[at] + g);
        gains[at] = (gains[at] ?? 0) + g;
      }
      if (sess.sp === 'run') s.shoeKm += Math.round(it.real ? it.km : sess.km ?? 0);
      if (k === 'runZ2' || k === 'bikeZ2') z2 += it.min;
      if (!newInjury && s.injury === 0 && random() < injuryRisk(s, sess)) {
        s.injury = 1 + Math.floor(random() * 3);
        s.injuryName = pick(INJURIES);
        newInjury = true;
        s.moral -= 8;
        rep.push(`${DAYS[i]}: lesão — ${s.injuryName}, ${s.injury} semana(s) sem correr.`);
      }
    }
    // Descanso real: um dia sem atividade numa semana com treino real recupera mais.
    const realRest = rested && weekReal >= BAL.realStreakMin && !s.real[i]?.length;
    if (realRest) realRestDays++;
    s.fatigue = clamp(s.fatigue * (realRest ? BAL.fatDecayRealRest : rested ? BAL.fatDecayRest : BAL.fatDecay), 0, 100);
  }

  // Série de semanas com treino real: recompensa a consistência, não o volume.
  const bonuses: string[] = [];
  s.realTotal = (s.realTotal ?? 0) + weekReal;
  if (weekReal >= BAL.realStreakMin) {
    s.realStreak = (s.realStreak ?? 0) + 1;
    s.realBest = Math.max(s.realBest ?? 0, s.realStreak);
    const fameGain = Math.min(3, s.realStreak - 1);
    s.fame += fameGain;
    bonuses.push(`Série real: ${s.realStreak} semana${s.realStreak > 1 ? 's' : ''}${fameGain ? ` (+${fameGain} fama)` : ''}`);
    if ([4, 8, 12, 20].includes(s.realStreak)) {
      s.inbox.unshift({ k: 'msg', t: `Emblema: ${s.realStreak} semanas de treino real seguidas`, x: 'Treinaste a sério e o jogo viu. O emblema fica no teu perfil.', done: true });
    }
  } else if ((s.realStreak ?? 0) > 0 && weekReal < BAL.realStreakMin) {
    if (s.realStreak! >= 2) rep.push(`A tua série de ${s.realStreak} semanas de treino real terminou.`);
    s.realStreak = 0;
  }
  if (weekReal) {
    const n = Math.min(weekReal, BAL.realBonusCap);
    bonuses.push(`${n} ${n > 1 ? 'treinos reais' : 'treino real'} com +${Math.round((BAL.realBonus - 1) * 100)}%`);
  }
  if (realRestDays) bonuses.push(`Descanso real: recuperação extra em ${realRestDays} dia${realRestDays > 1 ? 's' : ''}`);
  if (clubDays.length) bonuses.push(`Treino do clube (${clubDays.join(', ')}): +15%`);
  if (groupRun) bonuses.push('Long run de domingo com o grupo: +15%');
  // Provas reais marcadas pelo jogador
  for (const r of s.real.flat().filter(x => x.race)) {
    const f = Math.round(3 + r.km / 5);
    s.fame += f;
    s.inbox.unshift({ k: 'msg', t: `Prova real: ${r.km.toLocaleString('pt-PT')} km`, x: `Acabaste uma prova a sério em ${Math.floor(r.min / 60) ? `${Math.floor(r.min / 60)} h ` : ''}${r.min % 60} min. Conquista guardada e +${f} fama.`, done: true });
  }

  // Perda de forma: cada atributo precisa de carga semanal na sua disciplina para se manter.
  for (const at of ATTR_KEYS) {
    const sp = ATTR[at][1];
    if (sp === 'gen') continue;
    const need = s.a[at] * BAL.keep;
    if (spLoad[sp] < need) {
      const d = (BAL.detrain * (need - spLoad[sp])) / need;
      s.a[at] = Math.max(10, s.a[at] - d);
      gains[at] = (gains[at] ?? 0) - d;
    }
  }
  if (!newInjury && s.injury > 0) s.injury--;
  s.atl += (load - s.atl) * BAL.atlRate;
  s.ctl += (load - s.ctl) * BAL.ctlRate;

  // Finanças
  let fin = -BAL.living;
  if (s.job) { fin += BAL.salary; s.fatigue += BAL.jobFat; }
  for (const sp of s.sponsors) { fin += sp.weekly; sp.left--; }
  for (const sp of s.sponsors.filter(x => x.left <= 0)) {
    delete s.offered[sp.id];
    s.renew[sp.id] = (s.renew[sp.id] ?? 1) * 1.2;
    s.inbox.unshift({ k: 'msg', t: `Contrato com ${sp.n} terminou`, x: 'Se a tua fama se mantiver, voltam com uma proposta 20% melhor.', done: true });
  }
  s.sponsors = s.sponsors.filter(sp => sp.left > 0);
  if (s.subs.coach) fin -= SHOP.find(i => i.id === 'coach')?.p ?? 0;
  // Patrocinador do clube: paga a quem vai aos eventos, mais nas divisões de cima.
  if (clubPart) {
    const pay = BAL.clubPay[s.club.div] ?? 0;
    fin += pay;
    s.clubEvents = (s.clubEvents ?? 0) + 1;
    if (pay) bonuses.push(`Patrocinador do clube: +${pay} € pelo evento`);
  }
  s.money += fin;
  s.fame *= BAL.fameKeep;
  if (s.owned.crocs) s.moral += 2;
  s.moral += (65 - s.moral) * 0.1;
  if (s.fatigue > 75) s.moral -= 5;
  s.moral = clamp(s.moral, 0, 100);
  s.fatigue = clamp(s.fatigue, 0, 100);

  // Clube: pontos da semana e pontuação (média do top 10 de quem pontuou, ajustada pela participação)
  const C = s.club;
  const myPts = Math.round(load / 4) + (enter ? 30 : 0) + (clubPart ? 15 : 0);
  C.members.forEach((m, i) => {
    m.active = random() < 0.65;
    m.pts = m.active ? Math.round((rnd(40, 110) * m.r) / 55) : 0;
    // os dois primeiros membros são os habituais dos eventos do clube
    if (random() < (i < 2 ? 0.85 : 0.3)) m.events = (m.events ?? 0) + 1;
  });
  C.myPts = myPts;
  const scored = [...C.members.map(m => m.pts), myPts].filter(x => x > 0).sort((a, b) => b - a);
  const top = scored.length ? scored.slice(0, 10) : [0];
  C.part = (C.members.filter(m => m.active).length + (myPts > 0 ? 1 : 0)) / (C.members.length + 1);
  C.score = Math.round((top.reduce((a, b) => a + b, 0) / top.length) * (0.7 + 0.3 * C.part));
  C.season += C.score;
  C.clubPart = clubPart;
  for (const o of C.others) { o.score = Math.round(o.base * rnd(0.85, 1.15)); o.season += o.score; }

  // Desafio semanal: horas em Z2 contra três amigos do clube
  const me = Math.round(z2 / 6) / 10;
  const fr = C.members.slice(0, 3).map(m => ({ nm: m.nm, h: Math.round(rnd(2.5, 7) * 10) / 10 }));
  s.chal = { me, fr, won: fr.every(f => me > f.h) };
  if (s.chal.won) { s.fame += 1; s.moral = clamp(s.moral + 3, 0, 100); }

  if (s.shoeKm > 700 && !s.shoeWarned) {
    s.shoeWarned = true;
    s.inbox.unshift({ k: 'msg', t: 'As sapatilhas passaram os 700 km', x: 'O risco de lesão a correr aumentou. Há sapatilhas novas na loja.', done: true });
  }
  if (race && !enter) rep.push(`Não entraste em ${race.n}: ${whyNot(s, race) || `sem dinheiro para inscrição e viagem (${eur(race.fee + race.travel)})`}.`);
  s.last = { week: weekInSeason(s), load: Math.round(load), gains, rep, fin, bonuses };
  s.real = [[], [], [], [], [], [], []];

  if (race && enter) {
    s.money -= race.fee + race.travel;
    s.raceCount[race.id] = (s.raceCount[race.id] ?? 0) + 1;
    s.race = { ...race, stage: 'setup', ch: { pos: 'lado', int: 0.88, gels: GELS[race.t], strat: 'constante' } };
  } else {
    endWeek(s);
  }
}

/** Passa à semana seguinte: fim de temporada, mensagens, propostas e eventos. */
export function endWeek(s: GameState): void {
  if (weekInSeason(s) === 20) {
    const C = s.club, name = myClub(s).n;
    const table = [{ n: name, season: C.season, me: true }, ...C.others.map(o => ({ n: o.n, season: o.season, me: false }))].sort((a, b) => b.season - a.season);
    const pos = table.findIndex(t => t.me) + 1;
    let note = 'Ficam na mesma divisão.';
    if (pos === 1 && C.div > 1) {
      C.div--;
      s.fame += 5;
      s.clubKit = (s.clubKit ?? 0) + 1;
      note = `Sobem à divisão ${C.div}! Todos os membros ganham +5 fama e o kit de campeão de divisão, e o patrocinador do clube passa a pagar ${BAL.clubPay[C.div]} € por evento.`;
    }
    else if (pos === table.length && C.div < 3) { C.div++; note = `Descem à divisão ${C.div}.`; }
    s.inbox.unshift({ k: 'msg', t: `O teu clube acabou a temporada em ${pos}º`, x: `${name} fez ${C.season} pontos. ${note}`, done: true });
    C.season = 0;
    for (const o of C.others) { o.season = 0; o.base *= rnd(1, 1.06); }
  }
  s.week++;
  s.rain = false;
  if (weekInSeason(s) === 1) {
    s.ath.age++;
    s.slots = {};
    s.entries = undefined; // volta às provas por defeito; o jogador muda em Carreira
    const lastPts = s.pts;
    s.pts = 0;
    s.inbox.unshift({ k: 'msg', t: `Começa a temporada ${season(s)}`, x: `Fizeste anos: agora tens ${s.ath.age}, escalão ${ageGroup(s.ath.age)}. Acabaste a temporada com ${lastPts} pontos de ranking; o ranking recomeça do zero. Os adversários também treinaram no inverno.`, done: true });
  }
  if (s.money < -200) {
    s.money += 300;
    s.moral -= 10;
    s.inbox.unshift({ k: 'msg', t: 'A família emprestou 300 €', x: '"Isto do triatlo dá dinheiro, não dá?" Moral −10.', done: true });
  }
  s.inbox = s.inbox.filter(m => m.done || m.k === 'offer').slice(0, 14);
  for (const sp of SPONSORS) {
    if (s.fame >= sp.minFame && !s.offered[sp.id] && !s.sponsors.some(x => x.id === sp.id) && !s.inbox.some(m => m.k === 'offer' && m.id === sp.id && !m.done)) {
      s.offered[sp.id] = true;
      const f = s.renew[sp.id] ?? 1;
      s.inbox.unshift({ k: 'offer', id: sp.id, t: `${f > 1 ? 'Renovação' : 'Proposta'}: ${sp.n}`, x: `${sp.d} ${eur(sp.weekly * f)} por semana durante ${sp.weeks} semanas, mais ${eur(sp.podium * f)} por pódio.` });
      break;
    }
  }
  // Estafeta do clube: uma por temporada, na semana 14.
  if (weekInSeason(s) === 14) s.inbox.unshift({ k: 'ev', id: 'estafeta', t: EVENTS.estafeta.t, x: EVENTS.estafeta.x });
  else if (random() < 0.55) {
    const pool = Object.entries(EVENTS).filter(([, e]) => !e.scheduled && (!e.minFame || s.fame >= e.minFame) && (!e.job || s.job));
    const [id, e] = pick(pool);
    s.inbox.unshift({ k: 'ev', id, t: e.t, x: e.x });
  }
}

/** Junta atividades reais à semana atual, no dia em que aconteceram. Devolve a mensagem para o jogador. */
export function addRealActivities(s: GameState, acts: Activity[], errs: string[] = []): string {
  let added = 0;
  const seen = new Set(s.real.flat().map(r => r.key));
  const race = raceThisWeek(s);
  for (const a of acts) {
    const k = classify(a, s.a, s.ath.age);
    if (!k) continue;
    const key = `${a.sport}:${a.start ?? ''}:${Math.round(a.sec)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let d = a.start ? (new Date(a.start).getDay() + 6) % 7 : s.real.findIndex(x => !x.length);
    if (d < 0) d = 0;
    if (d === 6 && race && canEnter(s, race)) d = 5; // domingo de prova
    s.real[d].push({ k, key, ratio: loadRatio(a, k), min: Math.round(a.sec / 60), km: Math.round(a.km * 10) / 10, sport: a.sport, hr: a.hr ? Math.round(a.hr) : null });
    added++;
  }
  const pct = Math.round((BAL.realBonus - 1) * 100);
  let msg = added
    ? `${added} ${added > 1 ? 'treinos reais importados' : 'treino real importado'}. ${added > 1 ? 'Contam' : 'Conta'} com +${pct}% nos ganhos (até ${BAL.realBonusCap} por semana).`
    : 'Nenhum treino novo importado.';
  if (errs.length) msg += ' ' + errs.join('; ');
  return msg;
}
