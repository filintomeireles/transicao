import { useCallback, useState } from 'react';
import {
  DIST, GELS, changeGels, dec, finishRace, fmt, form, myClub, runRace, setRaceChoice, startRace, wetsuit,
  type GameState, type RaceChoices, type ResultRow
} from '../../engine';
import { Seg } from '../components';
import { GuideCard } from '../guide';
import { RaceView } from './RaceView';
import { ShareCard } from './ShareCard';
import type { Apply } from '../useGame';

type View = 'geral' | 'escalao' | 'clube';

export function RaceScreen({ game, apply, onDone }: { game: GameState; apply: Apply; onDone: () => void }) {
  const r = game.race!;
  const D = DIST[r.t];
  const [view, setView] = useState<View>('escalao');
  const [card, setCard] = useState(false);
  const res = r.res;
  const endLive = useCallback(() => window.scrollTo(0, 0), []);

  function start() {
    // Com movimento reduzido não há animação nem minijogos: o resultado sai logo.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) apply(s => runRace(s));
    else apply(s => startRace(s));
    window.scrollTo(0, 0);
  }

  if (r.stage === 'setup') {
    const f = form(game), n = game.ath.cat === 'F' ? r.nF : r.nM;
    const choose = <K extends keyof RaceChoices>(k: K) => (v: RaceChoices[K]) => apply(s => setRaceChoice(s, k, v));
    return (
      <>
        <GuideCard game={game} where="race" apply={apply} />
        <h1>{r.n}</h1>
        <div className="small muted">{D.l} · {D.swim} m · {D.bike} km · {dec(D.run)} km · {n} atletas na prova {game.ath.cat === 'F' ? 'feminina' : 'masculina'}</div>
        <div className="small">Água a {r.temp} °C · {r.temp < 22 ? (wetsuit(game) ? 'fato permitido e tens um' : 'fato permitido, mas não tens') : 'sem fatos'} · forma {f >= 0 ? '+' : ''}{Math.round(f)}</div>
        <span className="small muted">Natação · posição na partida</span>
        <Seg value={r.ch.pos} options={[['frente', 'Frente'], ['lado', 'Lado'], ['tras', 'Trás']]} onChange={choose('pos')} />
        <span className="small muted">Bike · % do FTP</span>
        <Seg value={r.ch.int} options={[[0.75, '75'], [0.82, '82'], [0.88, '88'], [0.95, '95']]} onChange={choose('int')} />
        <span className="small muted">Géis na bike</span>
        <div className="seg">
          <button aria-label="Menos um gel" onClick={() => apply(s => changeGels(s, -1))}>−</button>
          <span className="value" aria-live="polite">{r.ch.gels} {r.ch.gels === 1 ? 'gel' : 'géis'}</span>
          <button aria-label="Mais um gel" onClick={() => apply(s => changeGels(s, 1))}>+</button>
        </div>
        <span className="small muted">{game.owned.nutri ? `A nutricionista recomenda ${GELS[r.t]}.` : 'Poucos e bates na parede; demasiados e o estômago reclama.'}</span>
        <span className="small muted">Corrida · estratégia</span>
        <Seg two value={r.ch.strat} options={[['conservador', 'Conservador'], ['constante', 'Constante'], ['negativo', 'Negative split'], ['agressivo', 'Agressivo']]} onChange={choose('strat')} />
        <div className="small muted">Na prova: {game.ath.cat === 'F' ? 'a tua rival' : 'o teu rival'} {game.rival.nm} e amigos do {myClub(game).n}.</div>
        <button className="btn primary" onClick={start}>Partida</button>
      </>
    );
  }

  if (r.stage === 'live') return <RaceView game={game} apply={apply} onEnd={endLive} />;
  if (!res) return null;

  const list = res.lists[view];
  const number = (x: ResultRow, i: number) => (view === 'geral' ? x.pos : view === 'escalao' && x.me ? res.agP : i + 1);
  return (
    <>
      <h1>{r.n}</h1>
      <div className="row" style={{ gap: 16 }}>
        <span className="big">{res.p}{res.o}</span>
        <div>
          <div className="small muted">geral {res.catL}, de {res.N}</div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{fmt(res.me.total)}</div>
        </div>
      </div>
      <div className="card acc" style={{ padding: 10, textAlign: 'center' }}><b>{res.agP}{res.o} no escalão {game.ath.cat} {res.ag}</b></div>
      <div className="splits">
        {([['Nat', res.me.swim], ['T1', res.me.t1], ['Bike', res.me.bike], ['T2', res.me.t2], ['Corr', res.me.run]] as const).map(([l, t]) => (
          <div key={l}><span>{l}</span><b>{fmt(t)}</b></div>
        ))}
      </div>
      <Seg value={view} options={[['geral', 'Geral'], ['escalao', 'Escalão'], ['clube', 'Clube']]} onChange={setView} />
      <div className="lb">
        {list.map((x, i) => (
          <div key={x.nm + i} className={`it${x.me ? ' me' : ''}`}>
            <span className="n">{number(x, i)}</span>
            <span>{x.me ? 'Tu' : x.nm}{x.tag === 'rival' ? ' · rival' : x.tag === 'clube' ? ' · clube' : ''}{view === 'geral' && <span className="small muted"> {x.ag}</span>}</span>
            <span className="t">{fmt(x.total)}</span>
          </div>
        ))}
      </div>
      <div className="small">{res.prize ? `${Math.round(res.prize)} € · ` : ''}{res.bonus ? `bónus ${res.bonus} € · ` : ''}+{Math.round(res.fame)} fama · +{res.pts} pontos de ranking</div>
      {res.slot && <div className="small" style={{ color: 'var(--accent)', fontWeight: 700 }}>{res.slot}</div>}
      {res.legend && <div className="small" style={{ color: 'var(--accent)', fontWeight: 700 }}>{res.legend}</div>}
      <div className="small">{res.beatRival ? `Bateste ${res.rivalNm}. Moral +5.` : `${res.rivalNm} ficou à tua frente desta vez.`}</div>
      {card ? <ShareCard game={game} race={r} res={res} onClose={() => setCard(false)} />
        : <button className="btn" onClick={() => setCard(true)}>Cartão para partilhar</button>}
      <button className="btn primary" onClick={() => { apply(s => finishRace(s)); onDone(); }}>Continuar</button>
    </>
  );
}
