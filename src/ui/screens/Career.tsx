import { useState } from 'react';
import { CALENDAR, DIST, SPONSORS, canEnter, eur, fmt, season, weekInSeason, whyNot, type GameState } from '../../engine';
import { FeedbackForm } from '../Feedback';

export function CareerScreen({ game }: { game: GameState }) {
  const wk = weekInSeason(game), se = season(game);
  const [feedback, setFeedback] = useState(false);
  return (
    <>
      <div className="between"><h1>Carreira</h1><span className="small muted">Fama {Math.round(game.fame)} · {game.pts} pts</span></div>
      {feedback
        ? <FeedbackForm game={game} moment="carreira" onClose={() => setFeedback(false)} />
        : <div><button className="btn sm" onClick={() => setFeedback(true)}>Dar a tua opinião sobre o jogo</button></div>}

      <div className="card">
        <h2>Temporada {se}</h2>
        {CALENDAR.map(r => {
          const res = game.results.find(x => x.id === r.id && x.season === se), L = game.legends[r.id], D = DIST[r.t];
          const st = res ? `${res.p}º/${res.N} · ${res.agP}º ${res.ag}`
            : r.w < wk ? 'falhaste'
            : !canEnter(game, r) ? <span style={{ color: 'var(--bad)' }}>{whyNot(game, r)}</span>
            : r.w === wk ? 'este domingo' : 'inscrito';
          return (
            <div key={r.id} className="item">
              <div>
                <b>Sem. {r.w} · {r.n}</b>
                <div className="small muted">{D.l} · água {r.temp} °C · inscrição {eur(r.fee)} + viagem {eur(r.travel)}{r.slot ? ` · vagas para o Algarve: top ${r.slot} do escalão` : ''}</div>
                <div className="small muted">Lenda local: {L.nm === game.ath.name ? <b>tu</b> : L.nm} ({L.count} participações)</div>
              </div>
              <span className="small">{st}</span>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2>Patrocínios</h2>
        {game.sponsors.length ? game.sponsors.map(s => (
          <div key={s.id} className="item">
            <div><b>{s.n}</b><div className="small muted">{eur(s.weekly)}/semana · {eur(s.podium)} por pódio · faltam {s.left} semanas</div></div>
            <span className="chip good">Ativo</span>
          </div>
        )) : <span className="small muted">Ainda ninguém te paga. As propostas chegam à caixa de entrada quando a fama sobe.</span>}
        {SPONSORS.filter(s => !game.sponsors.some(x => x.id === s.id)).map(s => (
          <div key={s.id} className="item">
            <div><b>{s.n}</b><div className="small muted">{s.d}</div></div>
            <span className={`chip${game.fame >= s.minFame ? ' warn' : ''}`}>fama {s.minFame}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Resultados</h2>
        {game.results.length ? (
          <div className="lb">
            {game.results.slice().reverse().map((r, i) => (
              <div key={i} className="it"><span className="n">{r.p}º</span><span>{r.n} <span className="small muted">· {r.agP}º {r.ag}</span></span><span className="t">{fmt(r.total)}</span></div>
            ))}
          </div>
        ) : <span className="small muted">Ainda sem provas.</span>}
      </div>

      <div className="card">
        <h2>Mensagens</h2>
        {game.inbox.filter(m => m.done).slice(0, 8).map((m, i) => <div key={i} className="small"><b>{m.t}</b> — {m.x}</div>)}
        {!game.inbox.some(m => m.done) && <span className="small muted">Sem mensagens.</span>}
      </div>
    </>
  );
}
