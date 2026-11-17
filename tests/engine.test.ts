import { beforeEach, describe, expect, it } from 'vitest';
import {
  BAL, CALENDAR, CLUB_RACE, DIST, PROFILES, addRealActivities, autoRace, coachTips, createAthlete, doToday, dow, enterRace, finishLiveRace,
  finishRace, level, overall, paceOptions, pickTalent, plannedToday, predict, raceDay, raceOffer, restToday, runSegment, setSeed, skipDay,
  startRace, syncToday, talentPoints, takeGel, toggleEntry, weekInSeason, season, xpForLevel,
  type Activity, type GameState, type NewAthlete
} from '../src/engine';

const MONDAY = 20591; // segunda-feira, 2026-05-18
const base: NewAthlete = { name: 'Teste', cat: 'M', age: '38', city: 'Porto', club: 'pacos', start: 'preset', preset: 'regular' };
const newGame = (o: Partial<NewAthlete> = {}, day = MONDAY): GameState => createAthlete({ ...base, ...o }, null, day);
const noon = (day: number) => day * 864e5 + 12 * 3600e3 + new Date(day * 864e5).getTimezoneOffset() * 6e4;

beforeEach(() => setSeed(42));

describe('calendário real', () => {
  it('a carreira começa no dia de hoje e a semana numa segunda-feira', () => {
    const s = newGame({}, MONDAY + 2);
    expect(dow(MONDAY)).toBe(0);
    expect(s.start).toBe(MONDAY);
    expect(s.today).toBe(MONDAY + 2);
    expect(weekInSeason(s)).toBe(1);
  });

  it('só se joga um dia por dia real: o mesmo dia não avança', () => {
    const s = newGame();
    doToday(s, 'sim');
    expect(syncToday(s, MONDAY)).toBe(0);
    expect(s.today).toBe(MONDAY);
    expect(doToday(s, 'sim')).toBeNull();
  });

  it('os dias em falta correm em piloto automático e param ao fim de 10', () => {
    const s = newGame();
    doToday(s, 'manual');
    syncToday(s, MONDAY + 15);
    expect(s.today).toBe(MONDAY + 15);
    const missed = s.days.slice(1);
    expect(missed.filter(d => d.how === 'auto').length).toBeLessThanOrEqual(BAL.autoMax);
    expect(missed.some(d => d.how === 'miss')).toBe(true);
    expect(s.streak).toBe(0);
    expect(s.inbox[0].t).toMatch(/dias fora/);
  });

  it('não jogar faz perder forma; treinar faz ganhar', () => {
    const idle = newGame(), busy = newGame();
    for (let i = 0; i < 42; i++) { doToday(busy, 'manual'); skipDay(busy); skipDay(idle); }
    expect(overall(busy.a)).toBeGreaterThan(overall(idle.a));
    expect(predict(idle.a, '5k')).toBeGreaterThan(predict(newGame().a, '5k'));
  });
});

describe('treino do dia', () => {
  it('um treino real rende mais do que um confirmado, e este mais do que um simulado', () => {
    const k = 'int' as const;
    const gain = (how: 'manual' | 'sim' | 'real') => {
      setSeed(1);
      const s = newGame();
      s.plan[0] = k;
      const before = s.a.spd;
      if (how === 'real') addRealActivities(s, [{ sport: 'run', start: noon(MONDAY), sec: 3000, km: 9.5, hr: 170 }]);
      else doToday(s, how);
      return { g: s.a.spd - before, xp: s.xp };
    };
    const real = gain('real'), manual = gain('manual'), sim = gain('sim');
    expect(real.g).toBeGreaterThan(manual.g);
    expect(manual.g).toBeGreaterThan(sim.g);
    expect(real.xp).toBeGreaterThan(manual.xp);
    expect(manual.xp).toBeGreaterThan(sim.xp);
  });

  it('um treino real de ontem substitui o piloto automático', () => {
    const s = newGame();
    doToday(s, 'manual');
    syncToday(s, MONDAY + 2); // terça em piloto automático
    expect(s.days.find(d => d.d === MONDAY + 1)?.how).toBe('auto');
    const xp = s.xp;
    const msg = addRealActivities(s, [{ sport: 'run', start: noon(MONDAY + 1), sec: 3600, km: 11, hr: 140 }]);
    expect(msg).toMatch(/terça/);
    expect(s.days.find(d => d.d === MONDAY + 1)?.how).toBe('real');
    expect(s.xp).toBeGreaterThan(xp);
    // a mesma atividade não conta duas vezes
    expect(addRealActivities(s, [{ sport: 'run', start: noon(MONDAY + 1), sec: 3600, km: 11, hr: 140 }])).toMatch(/Nenhum/);
  });

  it('confirmar e depois importar o mesmo treino passa a contar como real', () => {
    const s = newGame();
    s.plan[0] = 'easy';
    doToday(s, 'manual');
    const g = s.a.end;
    addRealActivities(s, [{ sport: 'run', start: noon(MONDAY), sec: 2700, km: 8, hr: 140 }]);
    expect(s.last!.how).toBe('real');
    expect(s.a.end).toBeGreaterThan(g);
  });

  it('atividades com mais de 7 dias ficam de fora', () => {
    const s = newGame();
    expect(addRealActivities(s, [{ sport: 'run', start: noon(MONDAY - 9), sec: 3000, km: 9, hr: 150 }])).toMatch(/mais de 7 dias/);
  });

  it('lesionado, a corrida passa a treino cruzado', () => {
    const s = newGame();
    s.injury = 5; s.plan[0] = 'int';
    expect(plannedToday(s)).toBe('cross');
    expect(coachTips(s)[0].text).toMatch(/treino cruzado/);
  });

  it('cinco treinos teus numa semana cumprem o objetivo', () => {
    const s = newGame();
    s.plan = ['easy', 'easy', 'easy', 'easy', 'easy', 'rest', 'rest'];
    const money = s.money;
    for (let i = 0; i < 5; i++) { doToday(s, 'sim'); skipDay(s); }
    expect(s.wk.mine).toBe(5);
    expect(s.money).toBeGreaterThanOrEqual(money + BAL.weekGoalMoney);
  });

  it('descansar baixa a fadiga mais do que treinar', () => {
    const a = newGame(), b = newGame();
    restToday(a); skipDay(a);
    b.plan[0] = 'long'; doToday(b, 'sim'); skipDay(b);
    expect(a.fatigue).toBeLessThan(b.fatigue);
  });
});

describe('níveis e talentos', () => {
  it('cada nível dá um ponto de talento', () => {
    const s = newGame();
    expect(level(0)).toBe(1);
    s.xp = xpForLevel(3);
    expect(level(s.xp)).toBe(3);
    expect(talentPoints(s)).toBe(2);
    pickTalent(s, 'pesleves');
    pickTalent(s, 'pesleves');
    expect(s.talents).toEqual(['pesleves']);
    expect(talentPoints(s)).toBe(1);
  });
});

describe('provas', () => {
  it('ao sábado há os 5 km do clube; no domingo da semana 2 a primeira prova de calendário', () => {
    const s = newGame();
    for (let i = 0; i < 5; i++) { doToday(s, 'sim'); skipDay(s); }
    expect(raceOffer(s)?.id).toBe(CLUB_RACE.id);
    const povoa = CALENDAR.find(r => r.id === 'povoa')!;
    expect(raceDay(s, povoa)).toBe(MONDAY + 13);
  });

  it('a prova joga-se segmento a segmento e atacar gasta mais energia', () => {
    const s = newGame();
    s.today = MONDAY + 5; // sábado
    enterRace(s, CLUB_RACE.id);
    startRace(s);
    const L = s.race!.live!;
    const opts = paceOptions(s);
    expect(opts.find(o => o.pace === 'atacar')!.cost).toBeGreaterThan(opts.find(o => o.pace === 'poupar')!.cost);
    expect(opts.find(o => o.pace === 'atacar')!.perKm).toBeLessThan(opts.find(o => o.pace === 'poupar')!.perKm);
    runSegment(s, 'atacar');
    expect(L.seg).toBe(1);
    expect(L.energy).toBeLessThan(100);
    autoRace(s);
    finishLiveRace(s);
    expect(s.race!.stage).toBe('done');
    expect(s.done).toBe(true);
    expect(s.pb['5k']).toBe(s.race!.res!.total);
    finishRace(s);
    expect(s.race).toBeNull();
  });

  it('quem ataca sempre bate na parede numa maratona', () => {
    const s = newGame();
    s.race = { ...CALENDAR.find(r => r.id === 'vitoria')!, stage: 'setup', gels: 0, weather: { air: 18, wind: 0, rain: false } };
    startRace(s);
    for (let i = 0; i < DIST.maratona.segs; i++) runSegment(s, 'atacar');
    expect(s.race!.live!.wall).toBe(true);
  });

  it('um gel dá energia', () => {
    const s = newGame();
    s.race = { ...CALENDAR.find(r => r.id === 'coimbra')!, stage: 'setup', gels: 2, weather: { air: 18, wind: 0, rain: false } };
    startRace(s);
    runSegment(s, 'atacar');
    const e = s.race!.live!.energy;
    takeGel(s);
    expect(s.race!.live!.energy).toBeGreaterThan(e);
    expect(s.race!.live!.gelsLeft).toBe(1);
  });

  it('a prova de calendário cobra inscrição e só aparece a quem está inscrito', () => {
    const s = newGame();
    s.today = MONDAY + 13;
    expect(raceOffer(s)?.id).toBe('povoa');
    const money = s.money;
    enterRace(s, 'povoa');
    expect(s.money).toBeLessThan(money);
    const t = newGame();
    t.today = MONDAY + 1;
    toggleEntry(t, 'povoa');
    t.today = MONDAY + 13;
    expect(raceOffer(t)?.id).not.toBe('povoa');
  });

  it('o tempo previsto bate com os recordes reais do exemplo do Filinto', () => {
    const s = createAthlete({ ...base, start: 'filinto' }, null, MONDAY);
    expect(Math.abs(predict(s.a, '5k') - 1151)).toBeLessThan(45);
    expect(Math.abs(predict(s.a, '10k') - 2365)).toBeLessThan(90);
    expect(Math.abs(predict(s.a, 'meia') - 5128)).toBeLessThan(300);
    expect(Math.abs(predict(s.a, 'maratona') - 12784)).toBeLessThan(1200);
  });

  it('os perfis prontos vão do iniciado ao rápido', () => {
    expect(predict(PROFILES.beginner.a, '5k')).toBeGreaterThan(predict(PROFILES.regular.a, '5k'));
    expect(predict(PROFILES.regular.a, '5k')).toBeGreaterThan(predict(PROFILES.fast.a, '5k'));
  });
});

describe('temporada', () => {
  it('ao fim de 12 semanas começa a temporada seguinte e o atleta faz anos', () => {
    const s = newGame();
    const age = s.ath.age;
    for (let i = 0; i < 12 * 7; i++) skipDay(s);
    expect(season(s)).toBe(2);
    expect(weekInSeason(s)).toBe(1);
    expect(s.ath.age).toBe(age + 1);
  });
});

describe('importação de atividades', () => {
  it('classifica corridas pela distância e pela intensidade', () => {
    const s = newGame();
    const acts: Activity[] = [{ sport: 'run', start: noon(MONDAY), sec: 7200, km: 20, hr: 140 }];
    addRealActivities(s, acts);
    expect(s.last!.k).toBe('long');
  });
});
