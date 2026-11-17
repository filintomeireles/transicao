// Simulador de equilíbrio: joga carreiras dia a dia com o motor real e resume os resultados.
// Uso: npm run simulate -- [carreiras por combinação=20] [semanas=36]
import {
  EVENTS, PRESETS, SESS, SHOP, acceptOffer, addRealActivities, autoRace, buy, createAthlete, enterRace, finishRace,
  level, overall, pickTalent, plannedToday, predict, price, raceOffer, resolveEvent, setSeed, skipDay, talentPoints, TALENTS,
  doToday, quitJob, restToday, finishLiveRace,
  type Cat, type GameState, type PresetName, type ProfileKey
} from '../src/engine';

const RUNS = Number(process.argv[2] ?? 20);
const WEEKS = Number(process.argv[3] ?? 36);
const BUY_ORDER = ['shoes', 'watch', 'coach', 'roller', 'gym', 'nutri', 'carbon', 'treadmill'];
const DAY0 = 20500; // uma segunda-feira

type Mode = 'real' | 'manual' | 'sim' | 'weekend' | 'absent';
interface Policy { mode: Mode; plan: PresetName; club: boolean; shop: boolean; effort: 'leve' | 'plano' | 'forte' }
const POLICIES: Record<string, Policy> = {
  'treino real (relógio)': { mode: 'real', plan: 'Equilibrada', club: true, shop: true, effort: 'plano' },
  'confirma o treino': { mode: 'manual', plan: 'Equilibrada', club: true, shop: true, effort: 'plano' },
  'simula todos os dias': { mode: 'sim', plan: 'Equilibrada', club: true, shop: true, effort: 'plano' },
  'simula, sempre forte': { mode: 'sim', plan: 'Carga', club: true, shop: true, effort: 'forte' },
  'só ao fim de semana': { mode: 'weekend', plan: 'Equilibrada', club: true, shop: true, effort: 'plano' },
  'nunca joga': { mode: 'absent', plan: 'Equilibrada', club: false, shop: false, effort: 'plano' }
};
const PROFILES: ProfileKey[] = ['beginner', 'regular', 'fast'];

interface Career { ovr: number[]; t5: number[]; pct: number[]; injuries: number; lv: number; mundial: number; titles: number; money: number; pb5?: number; pb21?: number; xpWeek: number }

function act(s: GameState) {
  const k = plannedToday(s), S = SESS[k];
  if (k === 'rest') return null;
  const sport = S.run ? 'run' : k === 'str' ? 'str' : 'bike';
  return { sport, start: (s.today * 864e5) + 12 * 3600e3 - new Date().getTimezoneOffset() * 6e4, sec: S.min * 60, km: S.run ? S.km : 0, hr: k === 'easy' || k === 'long' ? 140 : 168 } as const;
}

function career(p: Policy, profile: ProfileKey, cat: Cat, seed: number): Career {
  setSeed(seed);
  const s = createAthlete({ name: 'Sim', cat, age: '38', city: 'X', club: 'pacos', start: 'preset', preset: profile }, null, DAY0);
  s.plan = PRESETS[p.plan].slice();
  const c: Career = { ovr: [overall(s.a)], t5: [predict(s.a, '5k')], pct: [], injuries: 0, lv: 1, mundial: 0, titles: 0, money: 0, xpWeek: 0 };
  for (let d = 0; d < WEEKS * 7; d++) {
    const dow = d % 7, inj = s.injury;
    const plays = p.mode === 'absent' ? false : p.mode === 'weekend' ? dow >= 5 : true;
    if (plays) {
      s.inbox.forEach((m, i) => {
        if (m.done) return;
        if (m.k === 'offer') acceptOffer(s, i);
        else if (m.k === 'ev' && m.id) resolveEvent(s, i, d % EVENTS[m.id].o.length);
      });
      if (p.shop) for (const id of BUY_ORDER) {
        const it = SHOP.find(x => x.id === id)!;
        const have = it.sub ? s.subs[id] : s.owned[id];
        if ((id === 'shoes' && s.shoeKm < 650) || (id !== 'shoes' && have)) continue;
        if (s.money - price(s, it) > 500) buy(s, id);
      }
      if (s.job && s.sponsors.reduce((a, sp) => a + sp.weekly, 0) >= 300) quitJob(s);
      for (const t of TALENTS) if (talentPoints(s) > 0 && !s.talents.includes(t.id)) pickTalent(s, t.id);
      const r = raceOffer(s);
      if (r && (r.tier !== 'clube' || (p.club && d % 14 === 12))) {
        enterRace(s, r.id);
        autoRace(s);
        finishLiveRace(s);
        const res = s.race!.res!;
        c.pct.push(res.p / res.N);
        if (r.id === 'mundial') c.mundial++;
        finishRace(s);
      } else if (!s.done) {
        if (p.mode === 'real') { const a = act(s); if (a) addRealActivities(s, [a]); else restToday(s); }
        else if (s.fatigue > 70 && p.effort !== 'forte') restToday(s);
        else doToday(s, p.mode === 'manual' ? 'manual' : 'sim', p.effort);
      }
    }
    if (!inj && s.injury) c.injuries++;
    skipDay(s);
    if ((d + 1) % 84 === 0) { c.ovr.push(overall(s.a)); c.t5.push(predict(s.a, '5k')); }
  }
  c.lv = level(s.xp);
  c.xpWeek = s.xp / WEEKS;
  c.titles = (s.titles ?? []).filter(t => t.startsWith('Campe')).length;
  c.money = s.money;
  c.pb5 = s.pb['5k'];
  c.pb21 = s.pb.meia;
  return c;
}

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const r0 = (x: number) => (Number.isNaN(x) ? '—' : String(Math.round(x)));
const mmss = (x: number) => (Number.isNaN(x) ? '—' : `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, '0')}`);
const pctOf = (x: number) => (Number.isNaN(x) ? '—' : Math.round(x * 100) + '%');

console.log(`${RUNS} carreiras por perfil e categoria, ${WEEKS} semanas (${WEEKS / 12} temporadas).\n`);
for (const profile of PROFILES) {
  console.log(`\nPerfil: ${profile}`);
  console.log(['estratégia', 'nota 0→12→24→36 sem.', '5 km previsto', 'lugar médio top%', 'lesões', 'nível', 'pontos/sem', 'Mundial', 'dinheiro'].join(' | '));
  let seed = 1;
  for (const [name, p] of Object.entries(POLICIES)) {
    const cs: Career[] = [];
    for (const cat of ['F', 'M'] as Cat[]) for (let i = 0; i < RUNS; i++) cs.push(career(p, profile, cat, seed++));
    console.log([
      name,
      [0, 1, 2, 3].map(i => r0(avg(cs.map(c => c.ovr[i]).filter(x => x != null)))).join('→'),
      [0, 3].map(i => mmss(avg(cs.map(c => c.t5[i]).filter(x => x != null)))).join('→'),
      pctOf(avg(cs.flatMap(c => c.pct))),
      avg(cs.map(c => c.injuries)).toFixed(1),
      avg(cs.map(c => c.lv)).toFixed(1),
      r0(avg(cs.map(c => c.xpWeek))),
      pctOf(avg(cs.map(c => (c.mundial ? 1 : 0)))),
      r0(avg(cs.map(c => c.money)))
    ].join(' | '));
  }
}
