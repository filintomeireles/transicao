// Simulador de equilíbrio: joga carreiras automáticas com o motor real e resume os resultados.
// Uso: npm run simulate -- [carreiras por combinação=30] [semanas=60]
import {
  PRESETS, SHOP, acceptOffer, buy, canEnter, createAthlete, EVENTS, finishRace, nextRace, overall, price,
  processWeek, quitJob, resolveEvent, runRace, season, setSeed, weekInSeason,
  type Cat, type GameState, type ProfileKey, type SessionKey, type StartKind
} from '../src/engine';

const RUNS = Number(process.argv[2] ?? 30);
const WEEKS = Number(process.argv[3] ?? 60);
const BUY_ORDER = ['wsBasic', 'shoes', 'coach', 'helmet', 'nutri', 'carbon', 'pm', 'wheels', 'aero', 'trainer', 'wsPro', 'tt'];

interface Policy { plan: (s: GameState) => SessionKey[]; shop: boolean; quit: boolean }
const taperRaceWeek = (base: SessionKey[]) => (s: GameState) => {
  const nr = nextRace(s);
  return nr && nr.w === weekInSeason(s) && canEnter(s, nr) ? PRESETS['Taper'] : base;
};
const POLICIES: Record<string, Policy> = {
  'típica': { plan: () => PRESETS['Típica'], shop: false, quit: false },
  'típica + compras': { plan: () => PRESETS['Típica'], shop: true, quit: false },
  'carga sempre': { plan: () => PRESETS['Carga'], shop: false, quit: false },
  'taper sempre': { plan: () => PRESETS['Taper'], shop: false, quit: false },
  'periodizado': { plan: taperRaceWeek(PRESETS['Carga']), shop: true, quit: true },
  'inteligente': { plan: taperRaceWeek(PRESETS['Típica']), shop: true, quit: true }
};
const PROFILES: [ProfileKey, StartKind][] = [['runner', 'preset'], ['cyclist', 'preset'], ['swimmer', 'preset']];

interface Career { rating: number[]; money: number[]; pct: number[][]; injuries: number; podium: boolean; quit: boolean; got: Record<string, number>; rival: number[]; algarve: number }

function career(policy: Policy, profile: ProfileKey, start: StartKind, cat: Cat, seed: number): Career {
  setSeed(seed);
  const s = createAthlete({ name: 'Sim', cat, age: '38', city: 'X', club: 'pacos', start, preset: profile }, null);
  const c: Career = { rating: [overall(s.a)], money: [], pct: [[], [], []], injuries: 0, podium: false, quit: false, got: {}, rival: [], algarve: 0 };
  for (let w = 1; w <= WEEKS; w++) {
    s.inbox.forEach((m, i) => {
      if (m.done) return;
      if (m.k === 'offer') acceptOffer(s, i);
      else if (m.k === 'ev' && m.id) resolveEvent(s, i, w % EVENTS[m.id].o.length);
    });
    if (policy.shop) {
      for (const id of BUY_ORDER) {
        const it = SHOP.find(x => x.id === id)!;
        const have = it.sub ? s.subs[id] : s.owned[id];
        if ((id === 'shoes' && s.shoeKm < 650) || (id !== 'shoes' && have) || (id === 'tt' && s.owned.aero)) continue;
        if (s.money - price(s, it) > 600) { buy(s, id); c.got[id] ??= w; }
      }
    }
    if (policy.quit && s.job && s.sponsors.reduce((a, sp) => a + sp.weekly, 0) >= 300) { quitJob(s); c.quit = true; }
    s.plan = policy.plan(s).slice();
    const wasInjured = s.injury > 0;
    processWeek(s);
    if (s.injury > 0 && !wasInjured) c.injuries++;
    if (s.race?.stage === 'setup') {
      const sea = season(s);
      runRace(s);
      const r = s.race.res!;
      if (sea <= 3) c.pct[sea - 1].push(r.p / r.N);
      if (r.p <= 3) c.podium = true;
      if (s.race.id === 'algarve') c.algarve++;
      c.rival.push(r.beatRival ? 1 : 0);
      finishRace(s);
    }
    if (w % 20 === 0) { c.rating.push(overall(s.a)); c.money.push(s.money); }
  }
  return c;
}

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const median = (a: number[]) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
const r0 = (x: number) => (Number.isNaN(x) ? '—' : String(Math.round(x)));
const pctOf = (x: number) => (Number.isNaN(x) ? '—' : Math.round(x * 100) + '%');

console.log(`${RUNS} carreiras por perfil e categoria, ${WEEKS} semanas, perfis prontos.\n`);
console.log(['estratégia', 'nota início→T1→T2→T3', 'lugar top% T1/T2/T3', 'lesões/temp', 'pódio', 'vence rival', 'Algarve/temp', 'dinheiro T1/T2/T3', 'rodas', 'aero', 'larga emprego'].join(' | '));
let seed = 1;
for (const [name, policy] of Object.entries(POLICIES)) {
  const cs: Career[] = [];
  for (const [profile, start] of PROFILES) for (const cat of ['F', 'M'] as Cat[]) for (let i = 0; i < RUNS; i++) cs.push(career(policy, profile, start, cat, seed++));
  const seasons = Math.max(1, WEEKS / 20);
  const bought = (id: string) => { const w = cs.map(c => c.got[id]).filter((x): x is number => x != null); return w.length ? `sem. ${median(w)} (${pctOf(w.length / cs.length)})` : '—'; };
  console.log([
    name,
    [0, 1, 2, 3].map(i => r0(avg(cs.map(c => c.rating[i]).filter(x => x != null)))).join('→'),
    [0, 1, 2].map(i => pctOf(avg(cs.flatMap(c => c.pct[i])))).join('/'),
    (avg(cs.map(c => c.injuries)) / seasons).toFixed(1),
    pctOf(avg(cs.map(c => (c.podium ? 1 : 0)))),
    pctOf(avg(cs.flatMap(c => c.rival))),
    (avg(cs.map(c => c.algarve)) / seasons).toFixed(1),
    [0, 1, 2].map(i => r0(avg(cs.map(c => c.money[i]).filter(x => x != null)))).join('/'),
    bought('wheels'),
    bought('aero'),
    pctOf(avg(cs.map(c => (c.quit ? 1 : 0))))
  ].join(' | '));
}
