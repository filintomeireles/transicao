import { useState } from 'react';
import {
  CALENDAR, COURSE_NAME, DIST, SPONSORS, canEnter, dateLabel, eur, fmt, hasRun, isEntered, raceDay, raceName, season, toggleEntry, weekInSeason, whyNot,
  type GameState, type RaceTier
} from '../../engine';
import { SeasonStrip } from '../charts';
import { Avatar, Stat, Title, Track } from '../components';
import { FeedbackForm } from '../Feedback';
import { buzz } from '../fx';
import { Icon } from '../icons';
import type { Apply } from '../useGame';

const TIER: Record<RaceTier, string> = { clube: 'clube', regional: 'regional', nacional: 'nacional', internacional: 'internacional', pro: 'circuito pro', mundial: 'mundial' };

export function CareerScreen({ game, apply }: { game: GameState; apply: Apply }) {
  const wk = weekInSeason(game), se = season(game);
  const [feedback, setFeedback] = useState(false);
  const podiums = game.results.filter(r => r.p <= 3).length, agWins = game.results.filter(r => r.agP === 1).length;
  const upcoming = CALENDAR.filter(r => raceDay(game, r) >= game.today && !hasRun(game, r) && isEntered(game, r.id));
  const cost = upcoming.reduce((sum, r) => sum + r.fee + r.travel, 0);
  const titles = game.titles ?? [];
  return (
    <>
      <div className="title">
        <h1>Carreira</h1>
        <span className="row" style={{ gap: 6 }}><span className="chip gold"><Icon name="star" />fama {Math.round(game.fame)}</span><span className="chip acc">{game.pts} pts</span></span>
      </div>

      <div className="card hero">
        <Title icon="trophy">Palmarés</Title>
        <div className="cond">
          <Stat label="Provas" value={game.results.length} />
          <Stat label="Pódios" value={podiums} sub="na geral" />
          <Stat label="Escalão" value={agWins} sub={agWins === 1 ? 'vitória' : 'vitórias'} />
        </div>
        {titles.map(t => (
          <div key={t} className="row" style={{ flexWrap: 'nowrap' }}>
            <span className="tile sp-gold"><Icon name="trophy" /></span><b>{t}</b>
          </div>
        ))}
        {!titles.length && <span className="small muted">O grande objetivo: o Mundial de Maratona, no último domingo da temporada (semana 12). Para lá chegar precisas de vaga: ganha o escalão na Maratona de Vitória ou na Meia maratona do Algarve.</span>}
      </div>

      <div className="card">
        <Title icon="week" right={<span className="small muted">{upcoming.length} inscrições · {eur(cost)}</span>}>Temporada {se}</Title>
        <SeasonStrip week={wk} races={CALENDAR.map(r => ({ w: r.w, label: r.n, big: r.tier === 'mundial', entered: isEntered(game, r.id) }))} />
        <span className="small muted">Todos os sábados há também os 5 km do clube, sem inscrição.</span>
        <span className="small muted">Escolhe as provas: uma por domingo. Inscrição e viagem pagam-se no dia.</span>
        {CALENDAR.map(r => {
          const res = game.results.find(x => x.id === r.id && x.season === se), L = game.legends[r.id], D = DIST[r.t];
          const entered = isEntered(game, r.id), blocked = whyNot(game, r);
          const past = raceDay(game, r) < game.today || hasRun(game, r) || (raceDay(game, r) === game.today && !!game.race);
          const big = r.tier === 'mundial' || r.tier === 'pro';
          return (
            <div key={r.id} className="item ic-row" style={{ opacity: past && !res ? 0.55 : 1 }}>
              <span className={`tile ${r.tier === 'mundial' ? 'sp-gold' : entered ? 'sp-acc' : 'sp-gen'}`}><Icon name={r.tier === 'mundial' ? 'trophy' : r.course === 'montanhoso' ? 'mountain' : 'flag'} /></span>
              <div className="stack">
                <span className="row" style={{ gap: 6 }}><span className="lbl">Sem. {r.w}</span><span className={`chip${big ? ' gold' : ''}`}>{TIER[r.tier]}</span></span>
                <b>{r.n}</b>
                <span className="small muted">{D.l} · {COURSE_NAME[r.course]} · ar ~{r.air}°{r.windy >= 20 ? ' · ventoso' : ''} · {eur(r.fee + r.travel)} · domingo {dateLabel(raceDay(game, r))}{r.prizeMult ? ` · prémios ×${r.prizeMult}` : ''}</span>
                {r.slotTo && <span className="small acc-t">Vaga para {raceName(r.slotTo)}: top {r.slot} do escalão{game.slots[r.slotTo] ? ' · já tens vaga' : ''}</span>}
                {blocked && !res && !past && <span className="small bad-t"><Icon name="lock" size={13} /> {blocked}</span>}
                {L && <span className="small muted">Lenda local: {L.nm === game.ath.name ? <b>tu</b> : L.nm} ({L.count} participações)</span>}
              </div>
              {res ? (
                <span className="stack" style={{ alignItems: 'center' }}>
                  {res.agP <= 3 ? <span className={`medal m${res.agP}`}>{res.agP}</span> : <b className="stat-v" style={{ fontSize: 18 }}>{res.agP}º</b>}
                  <span className="small muted">{res.p}º/{res.N}</span>
                </span>
              ) : past ? <span className="small muted">—</span>
                : <button className="btn sm" aria-pressed={entered} onClick={() => { buzz(8); apply(s => toggleEntry(s, r.id)); }}>{entered ? (canEnter(game, r) ? <><Icon name="check" size={15} />Inscrito</> : 'Inscrito*') : 'Inscrever'}</button>}
            </div>
          );
        })}
        <span className="small muted">* Inscrito, mas ainda sem os requisitos: se os cumprires até à semana da prova, entras.</span>
      </div>

      <div className="card">
        <Title icon="file">Patrocínios</Title>
        {game.sponsors.length ? game.sponsors.map(s => (
          <div key={s.id} className="item ic-row">
            <Avatar name={s.n} size={40} />
            <div className="stack"><b>{s.n}</b><span className="small muted">{eur(s.weekly)}/semana · {eur(s.podium)} por pódio · faltam {s.left} semanas</span></div>
            <span className="chip good">ativo</span>
          </div>
        )) : <span className="small muted">Ainda ninguém te paga. As propostas chegam à caixa de entrada quando a fama sobe.</span>}
        {SPONSORS.filter(s => !game.sponsors.some(x => x.id === s.id)).map(s => {
          const ok = game.fame >= s.minFame;
          return (
            <div key={s.id} className="item ic-row">
              <span className={`tile ${ok ? 'sp-gold' : 'sp-gen'}`}><Icon name={ok ? 'mail' : 'lock'} /></span>
              <div className="stack">
                <b>{s.n}</b><span className="small muted">{s.d}</span>
                {!ok && <Track thin value={(game.fame / s.minFame) * 100} color="var(--gold)" />}
              </div>
              <span className={`chip${ok ? ' gold' : ''}`}>fama {s.minFame}</span>
            </div>
          );
        })}
      </div>

      <div className="card">
        <Title icon="medal">Resultados</Title>
        {game.results.length ? (
          <div className="lb">
            {game.results.slice().reverse().map((r, i) => (
              <div key={i} className="it">
                <span className="n">{r.p <= 3 ? <span className={`medal m${r.p}`}>{r.p}</span> : `${r.p}º`}</span>
                <span className="who"><span>{r.n}</span><span className="small muted">{r.agP}º {r.ag} · T{r.season}{r.pb ? ' · recorde' : ''}</span></span>
                <span className="t">{fmt(r.total)}</span>
              </div>
            ))}
          </div>
        ) : <span className="small muted">Ainda sem provas.</span>}
      </div>

      <div className="card">
        <Title icon="mail">Mensagens</Title>
        {game.inbox.filter(m => m.done).slice(0, 8).map((m, i) => (
          <div key={i} className="item ic-row"><span className="tile sm sp-acc"><Icon name={m.k === 'offer' ? 'file' : 'mail'} size={15} /></span><div className="stack"><b className="small">{m.t}</b><span className="small muted">{m.x}</span></div><span /></div>
        ))}
        {!game.inbox.some(m => m.done) && <span className="small muted">Sem mensagens.</span>}
      </div>

      {feedback
        ? <FeedbackForm game={game} moment="carreira" onClose={() => setFeedback(false)} />
        : <button className="btn" onClick={() => setFeedback(true)}><Icon name="mail" size={18} />Dar a tua opinião sobre o jogo</button>}
    </>
  );
}
