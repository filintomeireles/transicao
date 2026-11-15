import { beforeEach, describe, expect, it } from 'vitest';
import {
  BAL, CALENDAR, NEUTRAL_SCORE, PROFILES, addRealActivities, applySprint, applyTransition, buy, coachTips, createAthlete,
  canEnter, finishLiveRace, finishRace, form, isEntered, processWeek, resolveEvent, runRace, setSeed, sprintOpponent, startRace,
  takeWeek, toggleEntry, toggleRealRace, weekInSeason, weeksAvailable, whyNot, simRace, bookCamp, CAMPS, rivalAfterRace,
  type GameState, type NewAthlete
} from '../src/engine';

const base: NewAthlete = { name: 'Teste', cat: 'M', age: '38', city: 'Porto', club: 'pacos', start: 'preset', preset: 'runner' };
const newGame = (o: Partial<NewAthlete> = {}): GameState => createAthlete({ ...base, ...o }, null);

beforeEach(() => setSeed(42));

describe('criar atleta', () => {
  it('usa o perfil pronto e o escalão da idade', () => {
    const s = newGame();
    expect(s.a.runSpd).toBe(PROFILES.runner.a.runSpd);
    expect(s.ath.age).toBe(38);
    expect(s.real).toHaveLength(7);
  });

  it('na categoria feminina os perfis prontos correm com ritmos femininos', () => {
    const f = newGame({ cat: 'F' });
    expect(f.a.runSpd).toBe(PROFILES.runner.a.runSpd - BAL.fOffset);
    expect(f.a.mental).toBe(PROFILES.runner.a.mental);
  });
});

describe('semana', () => {
  it('avança a semana e paga salário e custo de vida', () => {
    const s = newGame();
    const money = s.money;
    processWeek(s);
    expect(s.week).toBe(2);
    // a semana típica tem corrida à terça, o dia do clube: o patrocinador do clube paga
    const clubPay = BAL.clubPay[s.club.div];
    expect(s.last?.fin).toBe(BAL.salary - BAL.living + clubPay);
    expect(s.money).toBeLessThanOrEqual(money + BAL.salary - BAL.living + clubPay);
  });

  it('o taper aumenta a forma', () => {
    const s = newGame();
    for (let i = 0; i < 4; i++) { s.plan = ['swimEnd', 'runInt', 'bikeInt', 'swimTec', 'runZ2', 'brick', 'bikeZ2']; s.race = null; processWeek(s); s.race = null; }
    const before = form(s);
    s.plan = ['swimTec', 'runZ2', 'rest', 'swimTec', 'bikeZ2', 'rest', 'rest'];
    processWeek(s);
    expect(form(s)).toBeGreaterThan(before);
  });

  it('os treinos reais entram no dia em que aconteceram', () => {
    const s = newGame();
    const tuesday = Date.parse('2026-11-10T07:00:00');
    const msg = addRealActivities(s, [{ sport: 'run', start: tuesday, sec: 3600, km: 10, hr: 140 }]);
    expect(msg).toContain('1 treino');
    expect(s.real[1]).toHaveLength(1);
    expect(s.real[1][0].k).toBe('runZ2');
    expect(addRealActivities(s, [{ sport: 'run', start: tuesday, sec: 3600, km: 10, hr: 140 }])).toContain('Nenhum');
  });
});

describe('recompensas do treino real e do clube', () => {
  const run = (day: number, min = 60) => ({ sport: 'run' as const, start: Date.parse('2026-11-09T07:00:00') + day * 864e5, sec: min * 60, km: min / 6, hr: 140 });

  it('três semanas seguidas com 3 treinos reais fazem uma série e dão fama', () => {
    const s = newGame();
    for (let w = 0; w < 3; w++) {
      addRealActivities(s, [run(0 + w * 7), run(2 + w * 7), run(4 + w * 7)]);
      s.race = null;
      const fame = s.fame;
      processWeek(s);
      s.race = null;
      expect(s.realStreak).toBe(w + 1);
      if (w > 0) expect(s.fame).toBeGreaterThan(fame * BAL.fameKeep);
    }
    expect(s.last?.bonuses?.some(b => b.startsWith('Série real: 3 semanas'))).toBe(true);
    processWeek(s);
    expect(s.realStreak).toBe(0);
  });

  it('só os primeiros treinos reais da semana têm bónus', () => {
    const s = newGame();
    addRealActivities(s, [0, 1, 2, 3, 4, 5].map(d => run(d)));
    processWeek(s);
    expect(s.last?.bonuses).toContain(`${BAL.realBonusCap} treinos reais com +${Math.round((BAL.realBonus - 1) * 100)}%`);
  });

  it('uma prova real marcada dá fama e uma conquista', () => {
    const s = newGame();
    addRealActivities(s, [run(5, 100)]);
    toggleRealRace(s, 5);
    const fame = s.fame;
    processWeek(s);
    expect(s.fame).toBeGreaterThan(fame);
    expect(s.inbox.some(m => m.t.startsWith('Prova real'))).toBe(true);
  });

  it('a estafeta do clube aparece na semana 14 e dá fama', () => {
    const s = newGame();
    while (weekInSeason(s) < 14) { processWeek(s); if (s.race) { runRace(s); finishRace(s); } }
    const i = s.inbox.findIndex(m => m.id === 'estafeta');
    expect(i).toBeGreaterThanOrEqual(0);
    const fame = s.fame;
    resolveEvent(s, i, 2);
    expect(s.fame).toBeGreaterThan(fame);
    expect(s.inbox[i].res).toContain('Fizeste a corrida');
  });
});

describe('prova', () => {
  it('cobra inscrição e viagem, corre o pelotão da categoria e avança', () => {
    const s = newGame({ cat: 'F' });
    processWeek(s); processWeek(s);
    expect(weekInSeason(s)).toBe(3);
    const race = CALENDAR[0];
    const before = s.money;
    processWeek(s);
    expect(s.race?.stage).toBe('setup');
    expect(s.money).toBeLessThan(before - race.fee - race.travel + BAL.salary);
    runRace(s);
    const res = s.race!.res!;
    expect(res.N).toBe(race.nF);
    expect(res.p).toBeGreaterThanOrEqual(1);
    expect(res.p).toBeLessThanOrEqual(res.N);
    expect(res.lists.escalao.every(r => r.ag === res.ag)).toBe(true);
    expect(s.results).toHaveLength(1);
    finishRace(s);
    expect(s.race).toBeNull();
    expect(weekInSeason(s)).toBe(4);
  });

  it('guarda os tempos de passagem de todo o pelotão e um relato ordenado', () => {
    const s = newGame();
    for (let i = 0; i < 3; i++) processWeek(s);
    runRace(s);
    const res = s.race!.res!;
    expect(res.trace).toHaveLength(res.N);
    for (const r of res.trace) for (let i = 1; i < 5; i++) expect(r.cum[i]).toBeGreaterThanOrEqual(r.cum[i - 1]);
    const me = res.trace.find(r => r.me)!;
    expect(me.cum[4]).toBeCloseTo(res.me.total, 0);
    expect(res.trace.filter(r => r.cum[4] < me.cum[4])).toHaveLength(res.p - 1);
    const ats = res.timeline.map(l => l.at);
    expect(ats).toEqual([...ats].sort((a, b) => a - b));
    expect(res.timeline.at(-1)!.text).toContain('Meta!');
    expect(res.timeline.at(-1)!.at).toBeCloseTo(me.cum[4], 0);
  });

  it('é reproduzível com a mesma semente', () => {
    const run = () => { setSeed(7); const s = newGame(); for (let i = 0; i < 3; i++) processWeek(s); runRace(s); return s.race!.res!.me.total; };
    expect(run()).toBe(run());
  });
});

describe('prova interativa', () => {
  const toRace = () => { const s = newGame(); for (let i = 0; i < 3; i++) processWeek(s); startRace(s); return s; };
  const myTotal = (s: GameState) => { const me = s.race!.live!.field.find(f => f.me)!; return me.swim + me.t1 + me.bike + me.t2 + me.run; };

  it('uma transição perfeita poupa tempo e uma má custa', () => {
    const s = toRace();
    const base = myTotal(s);
    applyTransition(s, 1, 1);
    expect(myTotal(s)).toBeLessThan(base);
    applyTransition(s, 1, 0);
    expect(myTotal(s)).toBeGreaterThan(base);
    applyTransition(s, 1, NEUTRAL_SCORE);
    expect(myTotal(s)).toBeCloseTo(base, 6);
  });

  it('o sprint final decide quem chega primeiro', () => {
    const s = toRace();
    const L = s.race!.live!, me = L.field.find(f => f.me)!, other = L.field.find(f => !f.me)!;
    const sum = (f: typeof me) => f.swim + f.t1 + f.bike + f.t2 + f.run;
    me.run += sum(other) - sum(me) + 2; // chega 2 s depois do outro
    const opp = sprintOpponent(s);
    expect(opp?.nm).toBe(other.nm);
    applySprint(s, true);
    expect(sum(me)).toBeLessThan(sum(other));
    expect(s.race!.live!.sprint).toEqual({ nm: other.nm, won: true });
    finishLiveRace(s);
    expect(s.race!.stage).toBe('done');
    expect(s.race!.res!.timeline.some(l => l.text.includes('Sprint final'))).toBe(true);
  });
});

describe('treinador', () => {
  it('avisa quando a semana de prova tem sessões duras', () => {
    const s = newGame();
    processWeek(s); processWeek(s);
    s.plan = ['runInt', 'bikeInt', 'brick', 'swimTec', 'rest', 'runZ2', 'bikeZ2'];
    expect(coachTips(s)[0]).toMatchObject({ level: 'warn' });
    expect(coachTips(s)[0].text).toContain('Prova no domingo');
  });

  it('aponta a disciplina que falta no plano', () => {
    const s = newGame();
    s.plan = ['runZ2', 'bikeZ2', 'rest', 'runZ2', 'bikeZ2', 'rest', 'runZ2'];
    expect(coachTips(s).some(t => t.text.includes('natação'))).toBe(true);
  });
});

describe('loja', () => {
  it('não deixa comprar sem saldo', () => {
    const s = newGame();
    s.money = 100;
    expect(buy(s, 'aero')).toContain('Faltam');
    expect(s.owned.aero).toBeUndefined();
    s.money = 3000;
    buy(s, 'aero');
    expect(s.owned.aero).toBe(true);
    expect(s.money).toBe(600);
  });
});

describe('ritmo diário', () => {
  it('começa com a reserva cheia, gasta uma semana de cada vez e recarrega por dia', () => {
    const s = newGame();
    const day = 20000;
    expect(weeksAvailable(s, day)).toBe(BAL.paceStart);
    for (let i = 0; i < BAL.paceStart; i++) expect(takeWeek(s, day)).toBe(true);
    expect(takeWeek(s, day)).toBe(false);
    expect(weeksAvailable(s, day + 1)).toBe(BAL.pacePerDay);
    expect(weeksAvailable(s, day + 30)).toBe(BAL.paceCap);
  });
});

describe('calendário e mundial', () => {
  it('só uma prova por semana e as provas não inscritas não se correm', () => {
    const s = newGame();
    toggleEntry(s, 'povoa');
    expect(isEntered(s, 'povoa')).toBe(false);
    processWeek(s); processWeek(s); processWeek(s);
    expect(s.race).toBeNull();
    expect(weekInSeason(s)).toBe(4);
    toggleEntry(s, 'viseu');
    expect(isEntered(s, 'viseu')).toBe(true);
    toggleEntry(s, 'povoa'); // semana já passada: não muda
    expect(isEntered(s, 'povoa')).toBe(false);
  });

  it('o mundial pede vaga, e o Algarve dá-a ao top 3 do escalão', () => {
    const s = newGame();
    const mundial = CALENDAR.find(r => r.id === 'mundial')!;
    expect(canEnter(s, mundial)).toBe(false);
    expect(whyNot(s, mundial)).toContain('vaga');
    s.slots.mundial = true;
    expect(canEnter(s, mundial)).toBe(true);
  });

  it('acabar o Mundial fica no palmarés', () => {
    const s = newGame();
    s.a = { swimTec: 95, swimEnd: 95, bikePow: 95, bikeEnd: 95, runSpd: 95, runEnd: 95, trans: 95, str: 95, mental: 95 };
    s.money = 5000;
    s.slots.mundial = true;
    for (let i = 0; i < 20; i++) {
      s.slots.mundial = true;
      s.money = 5000;
      processWeek(s);
      if (s.race) { if (s.race.id === 'mundial') break; runRace(s); finishRace(s); }
    }
    expect(s.race?.id).toBe('mundial');
    runRace(s);
    expect(s.titles?.length).toBe(1);
    expect(s.titles![0]).toMatch(/Mundo|Mundial/);
  });
});

describe('meteorologia e percursos', () => {
  const a = PROFILES.runner.a;
  const avgRun = (cond: Parameters<typeof simRace>[3]['cond']) => {
    setSeed(3);
    const race = CALENDAR.find(r => r.id === 'viana')!;
    let sum = 0;
    for (let i = 0; i < 200; i++) sum += simRace(a, race, { pos: 'lado', int: 0.88, gels: 2, strat: 'constante' }, { form: 0, bike: 0, ws: 0, shoe: 0, cond }).run;
    return sum / 200;
  };

  it('o calor abranda a corrida, e a aclimatação reduz o efeito', () => {
    const cool = avgRun({ course: 'plano', wind: 0, air: 18, rain: false });
    const hot = avgRun({ course: 'plano', wind: 0, air: 32, rain: false });
    const hotAccl = avgRun({ course: 'plano', wind: 0, air: 32, rain: false, heatAccl: true });
    expect(hot).toBeGreaterThan(cool * 1.05);
    expect(hotAccl).toBeLessThan(hot);
    expect(hotAccl).toBeGreaterThan(cool);
  });

  it('com vento forte as rodas de perfil alto deixam de ajudar', () => {
    setSeed(5);
    const race = CALENDAR.find(r => r.id === 'viana')!;
    const ch = { pos: 'lado' as const, int: 0.88, gels: 2, strat: 'constante' as const };
    const res = simRace(a, race, ch, { form: 0, bike: 0, wheels: 0.02, ws: 0, shoe: 0, cond: { course: 'plano', wind: 35, air: 20, rain: false } });
    expect(res.ev.some(e => e[1].includes('rodas de perfil alto'))).toBe(true);
  });

  it('cada prova tem o tempo do dia', () => {
    const s = newGame();
    processWeek(s); processWeek(s); processWeek(s);
    expect(s.race?.weather).toBeDefined();
    expect(s.race!.weather!.air).toBeGreaterThan(0);
  });
});

describe('estágios', () => {
  it('o estágio de natação multiplica os ganhos de natação e cobra', () => {
    const plan: GameState['plan'] = ['swimTec', 'swimEnd', 'swimTec', 'swimEnd', 'rest', 'swimTec', 'rest'];
    const a = newGame(); a.plan = plan.slice(); processWeek(a);
    setSeed(42);
    const b = newGame(); b.plan = plan.slice();
    const money = b.money;
    expect(bookCamp(b, 'natacao')).toContain('Estágio marcado');
    expect(b.money).toBe(money - CAMPS.find(c => c.id === 'natacao')!.cost);
    processWeek(b);
    expect(b.a.swimTec).toBeGreaterThan(a.a.swimTec);
    expect(b.camp).toBeUndefined();
  });

  it('a altitude deixa um efeito de 4 semanas', () => {
    const s = newGame();
    s.money = 2000; // um atleta novo tem 850 € e o estágio custa 900 €
    expect(bookCamp(s, 'altitude')).toContain('Estágio marcado');
    processWeek(s); processWeek(s);
    expect(s.altitudeUntil).toBeGreaterThanOrEqual(s.week + 2);
  });
});

describe('rival com história', () => {
  it('três vitórias seguidas sobre o rival trazem um rival novo', () => {
    const s = newGame();
    const first = s.rival.nm;
    rivalAfterRace(s, true); rivalAfterRace(s, true);
    expect(s.rival.nm).toBe(first);
    rivalAfterRace(s, true);
    expect(s.rival.nm).not.toBe(first);
    expect(s.rivals?.[0].nm).toBe(first);
    expect(s.inbox.some(m => m.t.startsWith('Novo rival'))).toBe(true);
  });

  it('um rival lesionado não aparece na prova', () => {
    const s = newGame();
    processWeek(s); processWeek(s);
    s.rival.out = 3;
    processWeek(s);
    runRace(s);
    expect(s.race!.res!.trace.some(r => r.tag === 'rival')).toBe(false);
    expect(s.race!.res!.rivalNm).toBe('');
  });
});
