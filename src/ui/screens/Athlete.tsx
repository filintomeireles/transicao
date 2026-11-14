import { useState } from 'react';
import {
  ATTR, BAL, SHOP, SPORT_NAME, ageGroup, eur, form, myClub, overall, quitJob, returnToJob,
  type AttrKey, type GameState, type Sport
} from '../../engine';
import { Track } from '../components';
import type { Apply } from '../useGame';

export function AthleteScreen({ game, apply, onReset }: { game: GameState; apply: Apply; onReset: () => void }) {
  const [quitAsk, setQuitAsk] = useState(false);
  const [resetAsk, setResetAsk] = useState(false);
  const A = game.ath;
  const gear = game.gear.concat(SHOP.filter(i => game.owned[i.id] && !(i.id === 'carbon' && A.start === 'filinto')).map(i => [i.n, i.d] as [string, string]));
  const sponsorsWeekly = game.sponsors.reduce((a, s) => a + s.weekly, 0);

  return (
    <>
      <div className="between">
        <div>
          <h1>{A.name}</h1>
          <div className="small muted">{A.cat === 'F' ? 'Feminino' : 'Masculino'} · {A.age} anos · escalão {ageGroup(A.age)} · {A.city}</div>
          <div className="small muted">{myClub(game).n}</div>
        </div>
        <span className="big" style={{ fontSize: 44 }}>{overall(game.a)}</span>
      </div>
      <div className="small muted">Fitness {Math.round(game.ctl)} · fadiga {Math.round(game.fatigue)} · forma {Math.round(form(game))}. A forma é fitness menos a carga das últimas semanas: treina com consistência e alivia antes das provas.</div>

      {(['swim', 'bike', 'run', 'gen'] as Sport[]).map(sp => (
        <div key={sp} className={`card sp-${sp}`} style={{ borderTop: '3px solid var(--sp)' }}>
          <h2>{SPORT_NAME[sp]}</h2>
          {(Object.entries(ATTR) as [AttrKey, [string, Sport]][]).filter(([, v]) => v[1] === sp).map(([k, v]) => (
            <div key={k} className="attr">
              <span>{v[0]}</span><span className="v">{Math.round(game.a[k])}</span>
              <Track value={game.a[k]} color={sp === 'gen' ? 'var(--muted)' : `var(--${sp})`} />
            </div>
          ))}
        </div>
      ))}

      <div className="card">
        <h2>Rival: {game.rival.nm}</h2>
        <div className="small">{game.rival.age} anos · escalão {ageGroup(game.rival.age)} · nota {Math.round(game.rival.r)}</div>
        <div className="small muted">Duelos: {game.rival.beaten} vitórias, {game.rival.lost} derrotas.</div>
      </div>

      <div className="card">
        <h2>Vida</h2>
        <div className="small">{game.job ? `Emprego a meio tempo: +${eur(BAL.salary)} por semana, mais fadiga.` : 'Atleta a tempo inteiro: +10% nos ganhos.'} Custo de vida: {eur(BAL.living)} por semana.</div>
        {game.injury > 0 && <div className="small" style={{ color: 'var(--bad)' }}>Lesão: {game.injuryName} ({game.injury} semana(s)).</div>}
        {game.job ? (
          quitAsk ? (
            <div className="msg">
              <b>Largar o emprego?</b>
              <span className="small">Perdes {eur(BAL.salary)} por semana. Os patrocínios rendem {eur(sponsorsWeekly)} por semana.</span>
              <div className="row">
                <button className="btn sm" onClick={() => { apply(quitJob); setQuitAsk(false); }}>Sim, largar</button>
                <button className="btn sm" onClick={() => setQuitAsk(false)}>Cancelar</button>
              </div>
            </div>
          ) : <div><button className="btn sm" onClick={() => setQuitAsk(true)}>Largar o emprego</button></div>
        ) : <div><button className="btn sm" onClick={() => apply(returnToJob)}>Voltar ao emprego</button></div>}
      </div>

      <div className="card">
        <h2>Equipamento</h2>
        {gear.map(([a, b]) => <div key={a} className="item"><span>{a}</span><span className="small muted">{b}</span></div>)}
        <div className="item"><span>Sapatilhas de treino</span><span className={`small muted${game.shoeKm > 700 ? ' chip bad' : ''}`}>{game.shoeKm} km</span></div>
      </div>

      <div className="card">
        <h2>Jogo</h2>
        {resetAsk ? (
          <div className="row">
            <span className="small">Apagar esta carreira?</span>
            <button className="btn sm" onClick={onReset}>Apagar e recomeçar</button>
            <button className="btn sm" onClick={() => setResetAsk(false)}>Cancelar</button>
          </div>
        ) : <div><button className="btn sm" onClick={() => setResetAsk(true)}>Nova carreira</button></div>}
      </div>
    </>
  );
}
