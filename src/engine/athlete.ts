import { BAL } from './balance';
import { dayNumber, mondayOf } from './clock';
import { ATTR_KEYS, CALENDAR, CLUBS, FILINTO, FIRST_NAMES, LAST_NAMES, OTHER_CLUBS, PRESETS, PROFILES } from './data';
import { ageGroup, clamp } from './format';
import type { ImportSummary } from './import/activities';
import { overall, predict } from './perf';
import { calibrate, unverified, type RealTime } from './verify';
import { gauss, pick, random, rnd } from './rng';
import type { Attrs, Cat, ClubMember, GameState, ProfileKey, RaceType, SessionKey, StartKind } from './types';

export const nameFor = (cat: Cat): string => pick(FIRST_NAMES[cat]) + ' ' + pick(LAST_NAMES);

export interface NewAthlete {
  name: string;
  cat: Cat;
  age: string;
  city: string;
  club: string;
  start: StartKind;
  preset: ProfileKey;
  /** Tempos reais escritos por ti (arranque 'tempo'). */
  times?: RealTime[];
}

export function validateNewAthlete(o: NewAthlete, imp: ImportSummary | null): Partial<Record<'name' | 'age' | 'files' | 'times', string>> {
  const err: Partial<Record<'name' | 'age' | 'files' | 'times', string>> = {};
  const age = parseInt(o.age, 10);
  if (!o.name.trim()) err.name = 'Escreve o nome do atleta.';
  if (!(age >= 18 && age <= 80)) err.age = 'A idade tem de estar entre 18 e 80.';
  if (o.start === 'files' && !(imp && imp.n)) err.files = 'Importa pelo menos um treino, ou escolhe outro ponto de partida.';
  if (o.start === 'files' && imp && imp.n && !imp.best) err.files = 'Nenhuma corrida entre 3 e 45 km nestes ficheiros: precisamos de uma para medir o teu ritmo.';
  if (o.start === 'tempo' && !o.times?.length) err.times = 'Escreve pelo menos um tempo, por exemplo 5 km em 24:30.';
  return err;
}

/** Cria uma carreira nova que começa hoje. Assume dados validados por validateNewAthlete. */
export function createAthlete(o: NewAthlete, imp: ImportSummary | null, today = dayNumber()): GameState {
  const age = parseInt(o.age, 10);
  let a: Attrs, ctl: number, atl: number, fatigue = 30, shoeKm = 150, plan: SessionKey[] = PRESETS['Equilibrada'].slice();
  let gear: [string, string][] = [['Sapatilhas de treino', '150 km']], owned: Record<string, boolean> = {}, pb: Partial<Record<RaceType, number>> = {};
  if (o.start === 'filinto') {
    a = { ...FILINTO.a }; ctl = FILINTO.ctl; atl = FILINTO.atl; fatigue = FILINTO.fatigue; shoeKm = FILINTO.shoeKm;
    gear = FILINTO.gear; owned = { carbon: true, crocs: true, watch: true }; pb = { ...FILINTO.pb };
  } else if (o.start === 'files' && imp) {
    a = { ...imp.a }; ctl = atl = imp.ctl; fatigue = imp.fatigue; shoeKm = 300;
    gear = [['Sapatilhas de treino', '300 km'], ['Relógio', 'do teu relógio ou app']];
  } else if (o.start === 'tempo' && o.times?.length) {
    a = calibrate(PROFILES.regular.a, o.times);
    ctl = atl = 18 + overall(a) * 0.5;
  } else {
    a = { ...PROFILES[o.preset].a }; plan = PRESETS[PROFILES[o.preset].plan].slice();
    ctl = atl = 18 + overall(a) * 0.5;
  }
  // Os perfis prontos e o exemplo são ritmos masculinos: na categoria feminina correm mais devagar.
  if (o.cat === 'F' && (o.start === 'preset' || o.start === 'filinto')) for (const k of ATTR_KEYS) if (k !== 'men' && k !== 'str') a[k] -= BAL.fOffset;

  // O tempo verificado: o tempo real com que o atleta do jogo se compara.
  let ver = unverified(a, today);
  if (o.start === 'filinto') ver = { t: '5k', sec: FILINTO.pb['5k'] ?? Math.round(predict(a, '5k')), d: today, src: 'strava' };
  else if (o.start === 'files' && imp?.best) ver = { ...imp.best, d: today, src: 'ficheiro' };
  else if (o.start === 'tempo' && o.times?.length) {
    const t = o.times.reduce((b, x) => (x.t === '5k' ? x : b), o.times[0]);
    ver = { ...t, d: today, src: 'declarado' };
  }

  const club = CLUBS.find(c => c.id === o.club) ?? CLUBS[0];
  const members: ClubMember[] = [];
  for (let i = 0; i < 12; i++) {
    const cat: Cat = i % 2 ? 'M' : 'F';
    // o clube já existia: os membros habituais chegam com eventos no historial
    members.push({ nm: nameFor(cat), cat, age: 22 + Math.floor(random() * 35), r: clamp(50 + gauss() * 9, 28, 78), pts: 0, active: false, events: i < 2 ? 8 + Math.floor(random() * 12) : Math.floor(random() * 5) });
  }
  const legends: GameState['legends'] = {};
  for (const r of CALENDAR) legends[r.id] = { nm: nameFor(o.cat), count: 3 + Math.floor(random() * 3) };
  const name = o.name.trim();
  const rivalNm = nameFor(o.cat);

  const s: GameState = {
    v: 4,
    ath: { name, cat: o.cat, age, city: o.city.trim() || '—', club: club.id, start: o.start },
    born: today, start: mondayOf(today), today, done: false, tl: 0, feel: 0, rain: false,
    money: 850, fame: 8, pts: 0, job: true,
    a, fatigue, moral: 70, ctl, atl, injury: 0, injuryName: '',
    plan, owned, subs: {}, shoeKm, shoeWarned: false, gear,
    sponsors: [], offered: {}, renew: {},
    rival: { nm: rivalNm, age: clamp(age + Math.round(gauss() * 3), 18, 80), r: overall(a) + 3, beaten: 0, lost: 0, style: pick(['provocador', 'cavalheiro', 'calculista'] as const), run: 0 },
    hist: [],
    club: { id: club.id, members, div: 2, score: 0, season: 0, part: 0, myPts: null, others: OTHER_CLUBS.map(n => ({ n, base: rnd(60, 95), score: 0, season: 0 })) },
    legends, raceCount: {}, slots: {}, chal: null,
    invite: name.slice(0, 3).toUpperCase().replace(/[^A-ZÇÃÕÁÉÍÓÚ]/g, 'X') + '-' + Math.floor(random() * 36 ** 4).toString(36).toUpperCase().padStart(4, '0'),
    inbox: [{
      k: 'msg',
      t: `Bem-vind${o.cat === 'F' ? 'a' : 'o'} ao Transição`,
      x: `Corres na categoria ${o.cat === 'F' ? 'feminina' : 'masculina'}, escalão ${ageGroup(age)}, pelo ${club.n}. O jogo anda ao ritmo do calendário: um treino por dia. Ao sábado há os 5 km do clube e a primeira prova de calendário é o 5 km da Póvoa, no domingo da 2.ª semana. ${o.cat === 'F' ? 'A tua rival' : 'O teu rival'} vai ser ${rivalNm}: está um pouco à tua frente.`
    }],
    results: [], race: null, last: null, lastWeek: null, days: [],
    wk: { load: 0, mine: 0, real: 0, club: false, z2: 0 },
    xp: 0, talents: [], streak: 0, bestStreak: 0, pb, ver, verFirst: ver, verLog: ver.src === 'perfil' ? [] : [ver],
    realKeys: [], realTotal: 0, realStreak: 0, realBest: 0, clubEvents: 0, clubKit: 0
  };
  return s;
}
