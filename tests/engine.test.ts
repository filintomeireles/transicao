import { beforeEach, describe, expect, it } from 'vitest';
import {
  BAL, CALENDAR, PROFILES, addRealActivities, buy, createAthlete, finishRace, form, processWeek, runRace,
  setSeed, weekInSeason, type GameState, type NewAthlete
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
    expect(s.last?.fin).toBe(BAL.salary - BAL.living);
    expect(s.money).toBeLessThanOrEqual(money + BAL.salary - BAL.living);
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
