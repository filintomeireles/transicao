import {
  ATTR, DAY_NAMES, DAYS, DIST, EVENTS, PRESETS, SESS, SESSION_KEYS, SPORT_NAME,
  acceptOffer, addRealActivities, ageGroup, applyPreset, bonusFor, canEnter, dec, declineOffer, eur, myClub,
  nextRace, projected, raceThisWeek, readFiles, removeReal, resolveEvent, setDay, weekInSeason, whyNot,
  type AttrKey, type GameState, type SessionKey
} from '../../engine';
import { Flash } from '../components';
import type { Apply } from '../useGame';

function Inbox({ game, apply }: { game: GameState; apply: Apply }) {
  const open = game.inbox.map((m, i) => [m, i] as const).filter(([m]) => !m.done || m.res).slice(0, 4);
  if (!open.length) return null;
  return (
    <>
      {open.map(([m, i]) => (
        <div key={i + m.t} className={`msg${m.done ? ' done' : ''}`}>
          <b>{m.t}</b>
          <span className="small">{m.x}</span>
          {m.res && <span className="small"><strong>{m.res}</strong></span>}
          {!m.done && m.k === 'ev' && m.id && (
            <div className="row">
              {EVENTS[m.id].o.map(([label], j) => (
                <button key={j} className="btn sm" onClick={() => apply(s => resolveEvent(s, i, j))}>{label}</button>
              ))}
            </div>
          )}
          {!m.done && m.k === 'offer' && (
            <div className="row">
              <button className="btn sm" onClick={() => apply(s => acceptOffer(s, i))}>Assinar</button>
              <button className="btn sm" onClick={() => apply(s => declineOffer(s, i))}>Recusar</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export function WeekScreen({ game, apply, flash, setFlash, onClose }: { game: GameState; apply: Apply; flash: string; setFlash: (t: string) => void; onClose: () => void }) {
  const race = raceThisWeek(game), enter = !!race && canEnter(game, race), pj = projected(game), ev = myClub(game).ev;
  const nr = nextRace(game), L = game.last;

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    const { acts, errs } = await readFiles(Array.from(files));
    setFlash(apply(s => addRealActivities(s, acts, errs)) ?? '');
  }
  function sampleReal() {
    const now = new Date(), sat = new Date(now.getTime() - ((now.getDay() + 1) % 7) * 864e5);
    setFlash(apply(s => addRealActivities(s, [{ sport: 'run', start: sat.getTime(), sec: 3480, km: 10.4, hr: 144 }])) ?? '');
  }

  return (
    <>
      <Flash text={flash} />
      <Inbox game={game} apply={apply} />
      <div className="between"><h1>Plano da semana</h1><span className="small muted">{game.ath.cat} {ageGroup(game.ath.age)}</span></div>
      <div className="row">
        <span className="small muted">Modelos</span>
        {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map(p => (
          <button key={p} className="btn sm" onClick={() => apply(s => applyPreset(s, p))}>{p}</button>
        ))}
      </div>

      <div className="days">
        {game.plan.map((k, i) => {
          if (i === 6 && enter && race) {
            return <div key={i} className="day race"><span className="d">{DAYS[i]}</span><b>Prova: {race.n}</b><span className="r">{DIST[race.t].l}</span></div>;
          }
          const real = game.real[i];
          if (real.length) {
            return (
              <div key={i} className={`day sp-${SESS[real[0].k].sp}`}>
                <span className="d">{DAYS[i]}</span>
                <span>{real.map((r, j) => <div key={j}>{SESS[r.k].n} <span className="small muted mono">{r.min}′{r.km ? ` · ${dec(r.km)} km` : ''}</span></div>)}</span>
                <span className="r"><span className="chip acc">real +10%</span><br />
                  <button className="btn sm" style={{ marginTop: 4, padding: '3px 8px' }} aria-label={`Remover treino real de ${DAY_NAMES[i]}`} onClick={() => apply(s => removeReal(s, i))}>remover</button>
                </span>
              </div>
            );
          }
          const b = bonusFor(game, i, k);
          const note = b.includes('club') ? <span className="chip acc">clube +15%</span>
            : b.includes('group') ? <span className="chip acc">grupo +15%</span>
            : i === ev.d ? <span className="small muted">{ev.sp === 'bike' ? 'bike' : 'corrida'} do clube</span>
            : i === 6 ? <span className="small muted">long run do grupo</span> : null;
          return (
            <div key={i} className={`day sp-${SESS[k].sp}`}>
              <span className="d">{DAYS[i]}</span>
              <select id={`d${i}`} aria-label={`Treino de ${DAY_NAMES[i]}`} value={k} onChange={e => apply(s => setDay(s, i, e.target.value as SessionKey))}>
                {SESSION_KEYS.map(id => <option key={id} value={id}>{SESS[id].n}</option>)}
              </select>
              <span className="r">{note}</span>
            </div>
          );
        })}
      </div>

      <div className="small muted mono">
        Carga {pj.load} TL · fadiga prevista {Math.round(pj.fatigue)} · forma prevista {pj.form >= 0 ? '+' : ''}{Math.round(pj.form)}
        {game.injury ? ` · lesão (${game.injuryName})` : ''}{game.rain ? ' · chuva' : ''}
      </div>
      {nr && (
        <div className="small">
          Próxima prova: <b>{nr.n}</b> {nr.w === weekInSeason(game) ? 'este domingo' : `daqui a ${nr.w - weekInSeason(game)} semana(s)`}
          {` · inscrição e viagem ${eur(nr.fee + nr.travel)}`}
          {!canEnter(game, nr) && <> · <span style={{ color: 'var(--bad)' }}>{whyNot(game, nr)}</span></>}
          {nr.w - weekInSeason(game) <= 1 && canEnter(game, nr) && '. Alivia para chegar com forma alta.'}
        </div>
      )}
      <div className="row">
        <span className="btn sm file">Importar treino real
          <input type="file" id="wk-files" multiple accept=".fit,.gpx,.tcx" aria-label="Importar ficheiros FIT, GPX ou TCX" onChange={e => { importFiles(e.target.files); e.target.value = ''; }} />
        </span>
        <button className="btn sm" onClick={sampleReal}>Treino de exemplo</button>
        <span className="small muted">FIT, GPX, TCX</span>
      </div>
      <button className="btn primary" onClick={onClose}>{enter ? 'Fechar semana e ir para a prova' : 'Fechar semana'}</button>

      {L && (
        <div className="card">
          <h2>Resumo da semana {L.week}</h2>
          <div className="small mono">Carga {L.load} TL · saldo {L.fin >= 0 ? '+' : ''}{eur(L.fin)}</div>
          <div className="row">
            {(Object.entries(L.gains) as [AttrKey, number][]).filter(([, g]) => Math.abs(g) >= 0.05).map(([k, g]) => (
              <span key={k} className={`chip ${g > 0 ? 'good' : 'bad'}`}>{SPORT_NAME[ATTR[k][1]]} {ATTR[k][0].toLowerCase()} {g > 0 ? '+' : ''}{dec(g)}</span>
            ))}
          </div>
          {L.rep.map((r, i) => <div key={i} className="small">{r}</div>)}
        </div>
      )}
    </>
  );
}
