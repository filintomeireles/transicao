import { beforeEach, describe, expect, it } from 'vitest';
import {
  BAL, CALENDAR, NEUTRAL_SCORE, PROFILES, addRealActivities, applySprint, applyTransition, buy, coachTips, createAthlete,
  finishLiveRace, finishRace, form, processWeek, resolveEvent, runRace, setSeed, sprintOpponent, startRace, toggleRealRace, weekInSeason,
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
