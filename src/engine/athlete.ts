import { BAL } from './balance';
import { ATTR, ATTR_KEYS, CALENDAR, CLUBS, FILINTO, FIRST_NAMES, LAST_NAMES, OTHER_CLUBS, PRESETS, PROFILES } from './data';
import { ageGroup, clamp } from './format';
import type { ImportSummary } from './import/activities';
import { gauss, pick, random, rnd } from './rng';
import type { Attrs, Cat, ClubMember, GameState, ProfileKey, StartKind } from './types';

export const overall = (a: Attrs): number => Math.round(
  ((a.swimTec + a.swimEnd) / 2) * 0.2 +
  ((a.bikePow + a.bikeEnd) / 2) * 0.3 +
  ((a.runSpd + a.runEnd) / 2) * 0.33 +
  ((a.trans + a.str + a.mental) / 3) * 0.17
);

export const nameFor = (cat: Cat): string => pick(FIRST_NAMES[cat]) + ' ' + pick(LAST_NAMES);

export interface NewAthlete {
  name: string;
  cat: Cat;
  age: string;
  city: string;
  club: string;
  start: StartKind;
  preset: ProfileKey;
}

export function validateNewAthlete(o: NewAthlete, imp: ImportSummary | null): Partial<Record<'name' | 'age' | 'files', string>> {
  const err: Partial<Record<'name' | 'age' | 'files', string>> = {};
  const age = parseInt(o.age, 10);
  if (!o.name.trim()) err.name = 'Escreve o nome do atleta.';
  if (!(age >= 18 && age <= 80)) err.age = 'A idade tem de estar entre 18 e 80.';
  if (o.start === 'files' && !(imp && imp.n)) err.files = 'Importa pelo menos um treino, ou escolhe outro ponto de partida.';
  return err;
}

/** Cria uma carreira nova. Assume dados validados por validateNewAthlete. */
export function createAthlete(o: NewAthlete, imp: ImportSummary | null): GameState {
  const age = parseInt(o.age, 10);
  let base: { a: Attrs; ctl: number; atl: number; fatigue: number; shoeKm: number; gear: [string, string][]; owned: Record<string, boolean> };
  if (o.start === 'filinto') {
    base = { a: { ...FILINTO.a }, ctl: FILINTO.ctl, atl: FILINTO.atl, fatigue: FILINTO.fatigue, shoeKm: FILINTO.shoeKm, gear: FILINTO.gear, owned: { carbon: true, crocs: true } };
  } else if (o.start === 'files' && imp) {
    base = { a: { ...imp.a }, ctl: imp.ctl, atl: imp.ctl, fatigue: imp.fatigue, shoeKm: 300, gear: [['Bike de estrada', 'do teu relógio ou app'], ['Sapatilhas de treino', '300 km']], owned: {} };
  } else {
    base = { a: { ...PROFILES[o.preset].a }, ctl: 250, atl: 250, fatigue: 30, shoeKm: 150, gear: [['Bike de estrada de alumínio', 'emprestada pelo primo'], ['Sapatilhas de treino', '150 km']], owned: {} };
  }
  // Os perfis prontos e o exemplo são ritmos masculinos: na categoria feminina correm mais devagar.
  if (o.cat === 'F' && o.start !== 'files') for (const k of ATTR_KEYS) if (ATTR[k][1] !== 'gen') base.a[k] -= BAL.fOffset;

  const club = CLUBS.find(c => c.id === o.club) ?? CLUBS[0];
  const members: ClubMember[] = [];
  for (let i = 0; i < 12; i++) {
    const cat: Cat = i % 2 ? 'M' : 'F';
    // o clube já existia: os membros habituais chegam com eventos no historial
    members.push({ nm: nameFor(cat), cat, age: 22 + Math.floor(random() * 35), r: clamp(52 + gauss() * 9, 30, 80), pts: 0, active: false, events: i < 2 ? 8 + Math.floor(random() * 12) : Math.floor(random() * 5) });
  }
  const legends: GameState['legends'] = {};
  for (const r of CALENDAR) legends[r.id] = { nm: nameFor(o.cat), count: 3 + Math.floor(random() * 3) };
  const name = o.name.trim();
  const rivalNm = nameFor(o.cat);

  const s: GameState = {
    v: 3,
    ath: { name, cat: o.cat, age, city: o.city.trim() || '—', club: club.id, start: o.start },
    week: 1, money: 850, fame: 8, pts: 0, job: true,
    a: base.a, fatigue: base.fatigue, moral: 70, ctl: base.ctl, atl: base.atl, injury: 0, injuryName: '',
    plan: PRESETS['Típica'].slice(), real: [[], [], [], [], [], [], []], rain: false,
    owned: base.owned, subs: {}, shoeKm: base.shoeKm, shoeWarned: false, gear: base.gear,
    sponsors: [], offered: {}, renew: {},
    rival: { nm: rivalNm, age: clamp(age + Math.round(gauss() * 3), 18, 80), r: overall(base.a) + 4, beaten: 0, lost: 0, style: pick(['provocador', 'cavalheiro', 'calculista'] as const), run: 0 },
    club: { id: club.id, members, div: 2, score: 0, season: 0, part: 0, myPts: null, clubPart: false, others: OTHER_CLUBS.map(n => ({ n, base: rnd(60, 95), score: 0, season: 0 })) },
    legends, raceCount: {}, slots: {}, chal: null,
    invite: name.slice(0, 3).toUpperCase().replace(/[^A-ZÇÃÕÁÉÍÓÚ]/g, 'X') + '-' + Math.floor(random() * 36 ** 4).toString(36).toUpperCase().padStart(4, '0'),
    inbox: [{
      k: 'msg',
      t: `Bem-vind${o.cat === 'F' ? 'a' : 'o'} ao Transição`,
      x: `Corres na categoria ${o.cat === 'F' ? 'feminina' : 'masculina'}, escalão ${ageGroup(age)}, pelo ${club.n}. A primeira prova é o Sprint da Póvoa, na semana 3. ${o.cat === 'F' ? 'A tua rival' : 'O teu rival'} vai ser ${rivalNm}: está um pouco à tua frente.`
    }],
    results: [], race: null, last: null
  };
  if (o.start === 'filinto') s.inbox.unshift({ k: 'msg', t: 'As Supernova Rise estão gastas', x: '763 km. Foram reformadas. Andas agora com as Invincible Run 3 (2).', done: true });
  return s;
}
