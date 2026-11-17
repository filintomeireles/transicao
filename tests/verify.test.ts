import { beforeEach, describe, expect, it } from 'vitest';
import {
  BAL, DIST, addRealActivities, attrsFromActs, calibrate, createAthlete, doToday, gapPct, isVerified, predict, PROFILES,
  realProgress, setSeed, skipDay, testDue, type Activity, type GameState, type NewAthlete, type RaceType
} from '../src/engine';

const MONDAY = 20591;
const base: NewAthlete = { name: 'Teste', cat: 'M', age: '38', city: 'Porto', club: 'pacos', start: 'preset', preset: 'regular' };
const noon = (day: number) => day * 864e5 + 12 * 3600e3 + new Date(day * 864e5).getTimezoneOffset() * 6e4;
const run = (day: number, km: number, sec: number, hr = 172): Activity => ({ sport: 'run', start: noon(day), km, sec, hr });
const withTimes = (times: { t: RaceType; sec: number }[], o: Partial<NewAthlete> = {}): GameState =>
  createAthlete({ ...base, start: 'tempo', times, ...o }, null, MONDAY);

beforeEach(() => setSeed(7));

describe('calibração com tempos reais', () => {
  it('o tempo previsto dá o tempo real escrito, em qualquer distância', () => {
    for (const [t, sec] of [['5k', 1500], ['10k', 2700], ['meia', 6600], ['maratona', 12600]] as [RaceType, number][]) {
      const s = withTimes([{ t, sec }]);
      expect(Math.abs(predict(s.a, t) - sec)).toBeLessThan(DIST[t].km * 1.5); // menos de 1,5 s por km
      expect(isVerified(s)).toBe(true);
    }
  });

  it('com duas distâncias, separa o corredor rápido do de fundo', () => {
    const fast = withTimes([{ t: '5k', sec: 1200 }, { t: 'maratona', sec: 13800 }]);
    const deep = withTimes([{ t: '5k', sec: 1200 }, { t: 'maratona', sec: 11400 }]);
    expect(Math.abs(predict(fast.a, '5k') - predict(deep.a, '5k'))).toBeLessThan(30);
    expect(deep.a.end).toBeGreaterThan(fast.a.end);
    expect(predict(deep.a, 'maratona')).toBeLessThan(predict(fast.a, 'maratona'));
  });

  it('a mesma pessoa a 25:00 e a 19:00 nos 5 km começa em níveis diferentes', () => {
    expect(predict(withTimes([{ t: '5k', sec: 1500 }]).a, '5k')).toBeGreaterThan(predict(withTimes([{ t: '5k', sec: 1140 }]).a, '5k') + 300);
  });

  it('na categoria feminina não se desconta nada a um tempo real', () => {
    const s = withTimes([{ t: '5k', sec: 1500 }], { cat: 'F' });
    expect(Math.abs(predict(s.a, '5k') - 1500)).toBeLessThan(8);
  });

  it('importar ficheiros usa a melhor corrida como tempo verificado', () => {
    const acts = [run(MONDAY - 3, 10, 3300, 140), run(MONDAY - 6, 5, 1320, 178), run(MONDAY - 10, 18, 6300, 145)];
    const imp = attrsFromActs(acts);
    expect(imp.best).toEqual({ t: '5k', sec: 1320 });
    expect(Math.abs(predict(imp.a, '5k') - 1320)).toBeLessThan(8);
    const s = createAthlete({ ...base, start: 'files' }, imp, MONDAY);
    expect(s.ver.src).toBe('ficheiro');
  });

  it('o perfil pronto fica por verificar e pede logo um teste', () => {
    const s = createAthlete(base, null, MONDAY);
    expect(isVerified(s)).toBe(false);
    skipDay(s);
    expect(testDue(s)).toBe(true);
  });

  it('calibrar não mexe na força nem na cabeça', () => {
    const a = calibrate(PROFILES.regular.a, [{ t: '10k', sec: 2400 }]);
    expect(a.str).toBe(PROFILES.regular.a.str);
    expect(a.men).toBe(PROFILES.regular.a.men);
  });
});

describe('teto da assiduidade', () => {
  it('quem só simula fica no máximo 8% à frente do tempo verificado', () => {
    const s = withTimes([{ t: '5k', sec: 1500 }]);
    for (let i = 0; i < 300; i++) { doToday(s, 'sim', 'forte'); skipDay(s); }
    expect(gapPct(s)).toBeLessThanOrEqual(BAL.verCap + 0.005);
    expect(gapPct(s)).toBeGreaterThan(0.03); // mas a assiduidade compensa
    expect(s.xp).toBeGreaterThan(1000);
  });

  it('uma corrida real mais rápida do que o atleta do jogo sobe-o até ela, sem teto', () => {
    const s = withTimes([{ t: '5k', sec: 1500 }]);
    const msg = addRealActivities(s, [run(MONDAY, 5, 1380)]);
    expect(msg).toMatch(/mais depressa do que o atleta do jogo/);
    expect(Math.abs(predict(s.a, '5k') - 1380)).toBeLessThan(10);
    expect(s.ver.sec).toBe(1380);
    expect(realProgress(s)).toBeCloseTo(120 / 1500, 2);
  });

  it('uma rodagem lenta não estraga o tempo verificado', () => {
    const s = withTimes([{ t: '5k', sec: 1500 }]);
    addRealActivities(s, [run(MONDAY, 8, 3200, 135)]);
    expect(s.ver.sec).toBe(1500);
  });

  it('um teste mais lento passa a ser o tempo verificado e o atleta do jogo desce devagar', () => {
    const s = withTimes([{ t: '5k', sec: 1500 }]);
    for (let i = 0; i < 200; i++) { doToday(s, 'sim', 'forte'); skipDay(s); }
    const game = predict(s.a, '5k');
    const msg = addRealActivities(s, [run(s.today, 5, 1620)], [], { test: true });
    expect(msg).toMatch(/Teste registado/);
    expect(s.ver.sec).toBe(1620);
    expect(predict(s.a, '5k')).toBeGreaterThan(game); // desce…
    expect(predict(s.a, '5k')).toBeLessThan(1620 / (1 + BAL.verCap)); // …mas não de repente
  });

  it('o teste mensal dá pontos uma vez por mês', () => {
    const s = withTimes([{ t: '5k', sec: 1500 }]);
    const xp0 = s.xp;
    addRealActivities(s, [run(MONDAY, 5, 1490)], [], { test: true });
    const xp1 = s.xp;
    expect(xp1 - xp0).toBeGreaterThanOrEqual(BAL.testXp);
    skipDay(s);
    addRealActivities(s, [run(MONDAY + 1, 5, 1495)], [], { test: true });
    expect(s.xp - xp1).toBeLessThan(BAL.testXp);
  });
});
