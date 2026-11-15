import { useState } from 'react';
import {
  CALENDAR, COURSE_NAME, DIST, SPONSORS, canEnter, eur, fmt, isEntered, raceName, season, toggleEntry, weekInSeason, whyNot,
  type GameState, type RaceTier
} from '../../engine';
import { FeedbackForm } from '../Feedback';
import type { Apply } from '../useGame';

const TIER: Record<RaceTier, string> = { regional: 'regional', nacional: 'nacional', internacional: 'internacional', pro: 'circuito pro', mundial: 'mundial' };

export function CareerScreen({ game, apply }: { game: GameState; apply: Apply }) {
  const wk = weekInSeason(game), se = season(game);
  const [feedback, setFeedback] = useState(false);
  const podiums = game.results.filter(r => r.p <= 3).length, agWins = game.results.filter(r => r.agP === 1).length;
  const upcoming = CALENDAR.filter(r => r.w >= wk && isEntered(game, r.id));
  const cost = upcoming.reduce((sum, r) => sum + r.fee + r.travel, 0);
  return (
    <>
      <div className="between"><h1>Carreira</h1><span className="small muted">Fama {Math.round(game.fame)} · {game.pts} pts</span></div>
      {feedback
        ? <FeedbackForm game={game} moment="carreira" onClose={() => setFeedback(false)} />
        : <div><button className="btn sm" onClick={() => setFeedback(true)}>Dar a tua opinião sobre o jogo</button></div>}

      <div className="card">
        <h2>Palmarés</h2>
        {(game.titles ?? []).map(t => <div key={t} className="small"><b>{t}</b></div>)}
        <div className="small">{game.results.length} provas · {podiums} pódio{podiums === 1 ? '' : 's'} na geral · {agWins} vitória{agWins === 1 ? '' : 's'} no escalão</div>
        {!game.titles?.length && <span className="small muted">O grande objetivo: o Mundial de Longa Distância, na semana 20. Para lá chegar precisas de vaga, ganha na Meia distância do Algarve ou na Longa distância de Vitória.</span>}
      </div>

      <div className="card">
        <div className="between"><h2>Temporada {se}</h2><span className="small muted">{upcoming.length} inscrições · {eur(cost)}</span></div>
        <span className="small muted">Escolhe as provas: uma por semana. Inscrição e viagem pagam-se na semana da prova.</span>
        {CALENDAR.map(r => {
          const res = game.results.find(x => x.id === r.id && x.season === se), L = game.legends[r.id], D = DIST[r.t];
          const entered = isEntered(game, r.id), blocked = whyNot(game, r);
          const past = r.w < wk || !!res || (r.w === wk && !!game.race);
          return (
            <div key={r.id} className="item">
              <div>
                <b>Sem. {r.w} · {r.n}</b> <span className={`chip${r.tier === 'mundial' || r.tier === 'pro' ? ' acc' : ''}`}>{TIER[r.tier]}</span>
                <div className="small muted">{D.l} · percurso {COURSE_NAME[r.course]} · ar ~{r.air} °C{r.windy >= 20 ? ' · ventoso' : ''} · água {r.temp} °C · {r.fee ? `inscrição ${eur(r.fee)} + ` : ''}viagem {eur(r.travel)}{r.prizeMult ? ` · prémios ×${r.prizeMult}` : ''}</div>
                {r.slotTo && <div className="small muted">Dá vaga para {raceName(r.slotTo)}: top {r.slot} do escalão{game.slots[r.slotTo] ? ' · já tens vaga' : ''}</div>}
                {blocked && !res && !past && <div className="small" style={{ color: 'var(--bad)' }}>{blocked}</div>}
                {L && <div className="small muted">Lenda local: {L.nm === game.ath.name ? <b>tu</b> : L.nm} ({L.count} participações)</div>}
              </div>
              {res ? <span className="small">{res.p}º/{res.N}<br />{res.agP}º {res.ag}</span>
                : past ? <span className="small muted">—</span>
                : <button className="btn sm" aria-pressed={entered} onClick={() => apply(s => toggleEntry(s, r.id))}>{entered ? (canEnter(game, r) ? 'Inscrito ✓' : 'Inscrito*') : 'Inscrever'}</button>}
            </div>
          );
        })}
        <span className="small muted">* Inscrito, mas ainda sem os requisitos: se os cumprires até à semana da prova, entras.</span>
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
