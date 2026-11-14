// Simulador de equilíbrio do Transição.
// Corre o código real do jogo (extraído de transicao.html) sem interface e joga carreiras automáticas.
// Uso: node balance/sim.js transicao.html [carreiras por combinação] [semanas]
const fs = require('fs');
const path = process.argv[2] || 'transicao.html';
const RUNS = +(process.argv[3] || 40);
const WEEKS = +(process.argv[4] || 60);

const html = fs.readFileSync(path, 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];
const el = () => ({ innerHTML: '', hidden: false, textContent: '', focus() {} });
const doc = { getElementById: el, addEventListener() {}, querySelector: () => null };
const win = { scrollTo() {} };
const store = {};
const ls = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } };
const mm = () => ({ matches: true });
const G = new Function('document', 'window', 'localStorage', 'matchMedia', 'navigator', 'DOMParser', 'scrollTo',
  src + `;return {get S(){return S},set S(v){S=v},initState,createAthlete,processWeek,runRace,act,form,overall,raceThisWeek,nextRace,canEnter,wis,season,price,PRESETS,SESS,CAL,SHOP,SPONSORS,AG,EVENTS};`
)(doc, win, ls, mm, {}, function () {}, function () {});

const PRIORITY = ['wsBasic', 'shoes', 'coach', 'helmet', 'nutri', 'carbon', 'pm', 'wheels', 'aero', 'trainer', 'wsPro', 'tt'];

const POLICIES = {
  // Sempre a semana típica, nunca compra nada, decisões de prova por defeito.
  tipica: { plan: () => G.PRESETS['Típica'], shop: false, quit: false },
  // Igual à típica, mas compra por prioridade: mede quanto vale o equipamento.
  tipicaCompra: { plan: () => G.PRESETS['Típica'], shop: true, quit: false },
  // Volume máximo todas as semanas.
  carga: { plan: () => G.PRESETS['Carga'], shop: false, quit: false },
  // Volume mínimo todas as semanas.
  preguica: { plan: () => G.PRESETS['Taper'], shop: false, quit: false },
  // Carga, com taper só na semana da prova; compra por prioridade; larga o emprego com patrocínios.
  periodizado: {
    plan: () => { const nr = G.nextRace(); const d = nr ? nr.w - G.wis() : 9; return d === 0 && nr && G.canEnter(nr) ? G.PRESETS['Taper'] : G.PRESETS['Carga']; },
    shop: true, quit: true
  },
  // Semana típica, taper só na semana da prova, compras.
  inteligente: {
    plan: () => { const nr = G.nextRace(); const d = nr ? nr.w - G.wis() : 9; return d === 0 && nr && G.canEnter(nr) ? G.PRESETS['Taper'] : G.PRESETS['Típica']; },
    shop: true, quit: true
  }
};
const PROFILES = [['runner', 'preset'], ['cyclist', 'preset'], ['swimmer', 'preset'], ['filinto', 'filinto']];

function career(policyName, profile, cat) {
  const P = POLICIES[policyName];
  G.S = G.initState();
  Object.assign(G.S.ob, { name: 'Sim', cat, age: '38', city: 'X', club: 'pacos', start: profile[1], preset: profile[0] === 'filinto' ? 'runner' : profile[0] });
  if (!G.createAthlete()) throw new Error('create failed');
  const m = { rating: [G.overall(G.S.a)], races: [], injuries: 0, fat: [], minMoney: G.S.money, negWeeks: 0, quitWeek: null, firstPodium: null, buys: 0, offers: 0, got: {}, moneyAt: [] };
  for (let w = 1; w <= WEEKS; w++) {
    const S = G.S;
    S.inbox.forEach((msg, i) => {
      if (msg.done) return;
      if (msg.k === 'offer') { m.offers++; G.act('accept', String(i)); }
      else if (msg.k === 'ev') G.act('ev', i + ':' + Math.floor(Math.random() * G.EVENTS[msg.id].o.length));
    });
    if (P.shop) {
      for (const id of PRIORITY) {
        const it = G.SHOP.find(x => x.id === id);
        const have = it.sub ? G.S.subs[id] : G.S.owned[id];
        if (id === 'shoes' && G.S.shoeKm < 650) continue;
        if (id !== 'shoes' && have) continue;
        if (id === 'tt' && G.S.owned.aero) continue;
        if (G.S.money - G.price(it) > 600) { G.act('buy', id); m.buys++; if (!m.got[id]) m.got[id] = w; }
      }
    }
    if (P.quit && G.S.job && G.S.sponsors.reduce((a, s) => a + s.weekly, 0) >= 300) { G.act('quitYes'); m.quitWeek = w; }
    G.S.plan = P.plan().slice();
    const inj = G.S.injury;
    G.processWeek();
    if (G.S.injury > 0 && inj === 0) m.injuries++;
    m.fat.push(G.S.fatigue);
    if (G.S.race && G.S.race.stage === 'setup') {
      G.runRace();
      const R = G.S.race.res;
      m.races.push({ t: G.S.race.t, id: G.S.race.id, season: G.season(), pct: R.p / R.N, p: R.p, agP: R.agP, rival: R.beatRival });
      if (R.p <= 3 && m.firstPodium == null) m.firstPodium = w;
      G.act('raceDone');
    }
    m.minMoney = Math.min(m.minMoney, G.S.money);
    if (G.S.money < 0) m.negWeeks++;
    if (w % 20 === 0) { m.rating.push(G.overall(G.S.a)); m.moneyAt.push(G.S.money); }
  }
  m.end = { money: G.S.money, fame: G.S.fame, pts: G.S.pts, ctl: G.S.ctl, a: { ...G.S.a } };
  return m;
}

const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const pctl = (a, q) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.floor(q * (s.length - 1))]; };
const f1 = x => isNaN(x) ? '—' : x.toFixed(1);
const f0 = x => isNaN(x) ? '—' : Math.round(x).toString();

const rows = [];
for (const pol of Object.keys(POLICIES)) for (const prof of PROFILES) for (const cat of ['F', 'M']) {
  const cs = []; for (let i = 0; i < RUNS; i++) cs.push(career(pol, prof, cat));
  const seasonPct = s => avg(cs.flatMap(c => c.races.filter(r => r.season === s).map(r => r.pct)));
  rows.push({
    pol, prof: prof[0], cat,
    r0: avg(cs.map(c => c.rating[0])), r1: avg(cs.map(c => c.rating[1])), r2: avg(cs.map(c => c.rating[2])), r3: avg(cs.map(c => c.rating[3])),
    pct1: seasonPct(1), pct2: seasonPct(2), pct3: seasonPct(3),
    inj: avg(cs.map(c => c.injuries)) / (WEEKS / 20),
    fat: avg(cs.flatMap(c => c.fat)), fatHi: avg(cs.map(c => c.fat.filter(f => f > 70).length / c.fat.length)),
    money: avg(cs.map(c => c.end.money)), minMoney: avg(cs.map(c => c.minMoney)), neg: avg(cs.map(c => c.negWeeks)),
    quit: avg(cs.map(c => c.quitWeek != null ? 1 : 0)), podium: avg(cs.map(c => c.firstPodium != null ? 1 : 0)),
    podiumWk: pctl(cs.map(c => c.firstPodium).filter(x => x != null), .5),
    agWins: avg(cs.map(c => c.races.filter(r => r.agP === 1).length)),
    algarve: avg(cs.map(c => c.races.filter(r => r.id === 'algarve').length)) / (WEEKS / 20),
    rival: avg(cs.flatMap(c => c.races.map(r => r.rival ? 1 : 0))),
    fame: avg(cs.map(c => c.end.fame)), buys: avg(cs.map(c => c.buys))
  });
}

const head = ['estratégia', 'perfil', 'cat', 'nota 0→20→40→60', 'lugar% T1/T2/T3', 'lesões/temp', 'fadiga média', '% sem. >70', 'dinheiro fim', 'mín.', 'sem. <0', 'larga emprego', 'pódio', 'sem. 1º pódio', 'vit. escalão', 'Algarve/temp', 'vence rival', 'fama', 'compras'];
console.log(head.join(' | '));
for (const r of rows) console.log([r.pol, r.prof, r.cat, `${f0(r.r0)}→${f0(r.r1)}→${f0(r.r2)}→${f0(r.r3)}`,
  `${f0(r.pct1 * 100)}/${f0(r.pct2 * 100)}/${f0(r.pct3 * 100)}`, f1(r.inj), f0(r.fat), f0(r.fatHi * 100) + '%', f0(r.money), f0(r.minMoney), f1(r.neg),
  f0(r.quit * 100) + '%', f0(r.podium * 100) + '%', f0(r.podiumWk), f1(r.agWins), f1(r.algarve), f0(r.rival * 100) + '%', f0(r.fame), f1(r.buys)].join(' | '));
fs.writeFileSync(require('path').join(__dirname, 'last.json'), JSON.stringify(rows, null, 1));
if (process.argv[5] === 'eco') {
  // Resumo de economia por estratégia (perfis prontos, sem o exemplo do Filinto).
  console.log('\nECONOMIA | estratégia | dinheiro fim T1/T2/T3 | semana: fato / treinador / aero / TT / rodas | lugar% T3');
  for (const pol of Object.keys(POLICIES)) {
    const cs = []; for (const prof of PROFILES.slice(0, 3)) for (const cat of ['F', 'M']) for (let i = 0; i < Math.ceil(RUNS / 2); i++) cs.push(career(pol, prof, cat));
    const wk = id => { const v = cs.map(c => c.got[id]).filter(x => x != null); return v.length ? `${f0(pctl(v, .5))} (${f0(v.length / cs.length * 100)}%)` : '—'; };
    console.log(['', pol, [0, 1, 2].map(i => f0(avg(cs.map(c => c.moneyAt[i])))).join('/'), [wk('wsBasic'), wk('coach'), wk('aero'), wk('tt'), wk('wheels')].join(' / '),
      f0(avg(cs.flatMap(c => c.races.filter(r => r.season === 3).map(r => r.pct))) * 100)].join(' | '));
  }
}
