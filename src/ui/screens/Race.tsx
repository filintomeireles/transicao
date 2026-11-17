import { useState } from 'react';
import {
  COURSE_NAME, DIST, GELS, PACE_NAME, applySprint, autoRace, changeGels, dec, finishLiveRace, finishRace, fmt, form, myClub, pace,
  paceOptions, predict, runSegment, sprintOpponent, startRace, takeGel,
  type GameState, type ResultRow
} from '../../engine';
import { CourseProfile, PaceBars } from '../charts';
import { Avatar, Seg, Stat, Title } from '../components';
import { Confetti, buzz, useCountUp } from '../fx';
import { GuideCard } from '../guide';
import { Icon } from '../icons';
import { SprintGame } from './Minigames';
import { ShareCard } from './ShareCard';
import type { Apply } from '../useGame';

type View = 'geral' | 'escalao' | 'clube';

function conditionTips(game: GameState): string[] {
  const r = game.race!, w = r.weather, tips: string[] = [];
  if (r.course !== 'plano') tips.push(r.course === 'montanhoso' ? 'Muitas subidas: a força conta, e nas subidas atacar custa o dobro.' : 'Percurso ondulado: guarda energia para as subidas.');
  if (w.air >= 22) tips.push((game.heatUntil ?? 0) >= game.today ? 'Calor, mas estás aclimatado: custa-te bem menos.' : 'Calor: cada segmento gasta mais energia. Começa a poupar.');
  if (w.wind >= 15) tips.push('Vento: em metade dos segmentos é de frente. Cola a alguém nesses troços.');
  if (w.rain) tips.push('Chuva: um pouco mais lento para todos.');
  if ((game.altitudeUntil ?? 0) >= game.today) tips.push('Efeito da altitude: rendes mais 2% hoje.');
  if (!tips.length) tips.push('Condições boas: nada de especial a ter em conta.');
  return tips;
}

export function RaceScreen({ game, apply, onDone }: { game: GameState; apply: Apply; onDone: () => void }) {
  const r = game.race!;
  const D = DIST[r.t];
  const [view, setView] = useState<View>('escalao');
  const [card, setCard] = useState(false);

  if (r.stage === 'setup') {
    const f = form(game), n = game.ath.cat === 'F' ? r.nF : r.nM, w = r.weather;
    return (
      <>
        <GuideCard game={game} where="race" apply={apply} />
        <div className="card hero">
          <span className="lbl">Dia de prova · {D.l}</span>
          <h1>{r.n}</h1>
          <div className="row small">
            <span className="chip"><Icon name="run" />{dec(D.km)} km</span>
            <span className="chip"><Icon name="club" />{n} atletas</span>
            <span className="chip"><Icon name="mountain" />{COURSE_NAME[r.course]}</span>
          </div>
          <CourseProfile course={r.course} />
          <div className="cond">
            <Stat icon="thermo" label="Ar" value={`${w.air}°`} sub={w.rain ? 'com chuva' : 'seco'} />
            <Stat icon="wind" label="Vento" value={w.wind} sub="km/h" />
            <Stat icon="timer" label="Previsto" value={fmt(predict(game.a, r.t))} sub={game.pb[r.t] ? `recorde ${fmt(game.pb[r.t]!)}` : 'sem recorde'} />
          </div>
          <div className="small muted">A tua forma {f >= 0 ? '+' : ''}{Math.round(f)} · fadiga {Math.round(game.fatigue)}</div>
        </div>
        <div className="card coach">
          <Title icon="info">Condições do dia</Title>
          {conditionTips(game).map(t => <div key={t} className="tip info"><Icon name="chevron" size={16} /><span>{t}</span></div>)}
        </div>
        <div className="card">
          <Title icon="coach">Como se joga</Title>
          <span className="small">A prova tem {D.segs} segmentos de {dec(D.km / D.segs)} km. Antes de cada um escolhes o esforço: <b>poupar</b>, <b>ao ritmo</b>, <b>atacar</b> ou <b>colar</b> a quem vai à frente. Atacar ganha tempo mas gasta energia; se a energia acabar, bates na parede.</span>
        </div>
        {GELS[r.t] > 0 && (
          <div className="card decide">
            <span className="lbl sp-long"><span className="tile sm"><Icon name="drop" size={16} /></span>Géis no bolso</span>
            <div className="seg stepper">
              <button aria-label="Menos um gel" onClick={() => { buzz(6); apply(s => changeGels(s, -1)); }}><Icon name="minus" /></button>
              <span className="value" aria-live="polite">{r.gels} {r.gels === 1 ? 'gel' : 'géis'}</span>
              <button aria-label="Mais um gel" onClick={() => { buzz(6); apply(s => changeGels(s, 1)); }}><Icon name="plus" /></button>
            </div>
            <span className="small muted">Cada gel dá +14 de energia quando o tomares. {game.owned.nutri ? `A nutricionista recomenda ${GELS[r.t]}.` : 'Demasiados e o estômago reclama.'}</span>
          </div>
        )}
        {r.tier !== 'clube' && (
          <div className="card flat">
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <Avatar name={game.rival.nm} size={36} />
              <span className="small">Na prova: {game.rival.out ? <>o teu rival {game.rival.nm} está lesionado</> : <>{game.ath.cat === 'F' ? 'a tua rival' : 'o teu rival'} <b>{game.rival.nm}</b></>} e amigos do {myClub(game).n}.</span>
            </div>
          </div>
        )}
        <div className="cta"><button className="btn primary" onClick={() => { buzz([20, 60, 20]); apply(startRace); window.scrollTo(0, 0); }}><Icon name="play" />Partida</button></div>
      </>
    );
  }

  if (r.stage === 'live') return <Live game={game} apply={apply} />;
  const res = r.res;
  if (!res) return null;
  return <Result game={game} view={view} setView={setView} card={card} setCard={setCard} onContinue={() => { apply(finishRace); onDone(); }} />;
}

function Live({ game, apply }: { game: GameState; apply: Apply }) {
  const r = game.race!, L = r.live!, D = DIST[r.t], n = D.segs;
  const sprint = sprintOpponent(game);
  const pos = L.log.length ? L.log[L.log.length - 1].pos : null;
  const km = (L.seg * D.km) / n;
  const riv = L.field.find(f => f.tag === 'rival');
  // onde ia o rival no momento em que passaste o último marco
  const rivFrac = (() => {
    if (!riv || !L.seg) return 0;
    const t = L.cum[L.seg - 1];
    const i = riv.cum.findIndex(c => c >= t);
    if (i < 0) return 1;
    const prev = i ? riv.cum[i - 1] : 0;
    return (i + (t - prev) / (riv.cum[i] - prev)) / n;
  })();
  const e = Math.max(0, L.energy), ecol = e > 50 ? 'var(--good)' : e > 20 ? 'var(--warn)' : 'var(--bad)';
  const opts = paceOptions(game);
  const done = L.seg >= n;
  const go = (p: string) => { buzz(p === 'atacar' ? [15, 30, 15] : 10); apply(s => runSegment(s, p as never)); };

  return (
    <>
      <div className="title"><h1>{r.n}</h1><span className="chip acc"><span className="live-dot" />ao vivo</span></div>
      <div className="card">
        <div className="between">
          <div className="stack">
            <div className="pos-big" style={{ fontSize: 48 }}>{pos ? `${pos}${game.ath.cat === 'F' ? 'ª' : 'º'}` : '—'}</div>
            <span className="small muted">{pos ? `de ${L.field.length + 1}` : 'à partida'} · km {dec(km)} de {dec(D.km)}</span>
          </div>
          <div className="stack" style={{ alignItems: 'flex-end' }}>
            <b className="mono" style={{ fontSize: 20 }}>{fmt(L.cum[L.seg - 1] ?? 0)}</b>
            <span className="small muted">{L.seg ? `${pace(L.cum[L.seg - 1] / km)}/km` : 'tempo'}</span>
          </div>
        </div>
        <div className="kmtrack" aria-hidden="true">
          <div className="line" />
          {L.grade.map((g, i) => g > 0 ? <span key={i} className="hill" style={{ left: `${(i / n) * 100}%`, width: `${100 / n}%`, opacity: g > 1 ? 0.6 : 0.3 }} /> : null)}
          <div className="done" style={{ width: `${(L.seg / n) * 100}%` }} />
          {riv && L.seg > 0 && <span className="rv" style={{ left: `${Math.max(0, rivFrac) * 100}%` }} title={riv.nm} />}
          <span className="dot" style={{ left: `${(L.seg / n) * 100}%` }} />
          {Array.from({ length: n + 1 }, (_, i) => <span key={i} className="tick" style={{ left: `${(i / n) * 100}%` }}>{i === 0 ? '0' : i === n ? dec(D.km, D.km % 1 ? 1 : 0) : ''}</span>)}
        </div>
        <div className="between small"><b>Energia</b><span className="mono">{Math.round(e)}{L.wall ? ' · na parede' : ''}</span></div>
        <div className="energy"><i style={{ width: `${e}%`, background: ecol }} /></div>
        {L.gelsLeft > 0 && !done && (
          <button className="btn sm soft" style={{ alignSelf: 'flex-start' }} onClick={() => { buzz(); apply(takeGel); }}><Icon name="drop" size={15} />Tomar gel ({L.gelsLeft})</button>
        )}
      </div>

      {sprint && <SprintGame opponent={sprint.nm} behind={sprint.behind} onDone={won => apply(s => applySprint(s, won))} />}

      {!done && (
        <>
          <span className="lbl">Segmento {L.seg + 1} de {n}{L.grade[L.seg] > 0 ? ' · a subir' : L.grade[L.seg] < 0 ? ' · a descer' : ''}{L.head[L.seg] ? ' · vento de frente' : ''}</span>
          <div className="paces">
            {opts.map(o => (
              <button key={o.pace} className={`pace p-${o.pace}`} onClick={() => go(o.pace)}>
                <b>{o.pace === 'seguir' ? o.label : PACE_NAME[o.pace]}</b>
                <span className="mono">{pace(o.perKm)}/km</span>
                <span className="small muted">energia −{o.cost}{o.cost > e ? ' · não chega!' : ''}</span>
                <span className="small muted">{o.hint}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {done && !sprint && (
        <div className="cta"><button className="btn primary" onClick={() => { buzz([20, 60, 20, 60, 20]); apply(finishLiveRace); window.scrollTo(0, 0); }}><Icon name="flag" />Cortar a meta</button></div>
      )}

      <div className="feed" aria-live="polite">
        {L.lines.slice(-4).reverse().map((l, i) => <div key={L.lines.length - i} style={{ ['--sp' as string]: `var(--${l.fam === 'gen' ? 'line' : l.fam})` }}>{l.text}</div>)}
      </div>
      {!done && <button className="btn ghost sm" onClick={() => apply(autoRace)}><Icon name="skip" size={15} />Correr o resto sozinho</button>}
    </>
  );
}

function Result({ game, view, setView, card, setCard, onContinue }: {
  game: GameState; view: View; setView: (v: View) => void; card: boolean; setCard: (b: boolean) => void; onContinue: () => void;
}) {
  const r = game.race!, res = r.res!;
  const posN = Math.round(useCountUp(res.p, 900));
  const party = res.p <= 3 || res.agP <= 3 || (res.pb && !!res.prevPb);
  const list = res.lists[view];
  const number = (x: ResultRow, i: number) => (view === 'geral' ? x.pos : view === 'escalao' && x.me ? res.agP : i + 1);
  return (
    <>
      <div className="card hero result-hero">
        {party && <Confetti />}
        <span className="lbl">{r.n}</span>
        <div className="pos-big pop">{posN}{res.o}</div>
        <span className="small muted">na geral {res.catL}, de {res.N} · <span className="mono">{fmt(res.total)}</span> · {pace(res.total / DIST[r.t].km)}/km</span>
        <div className="row" style={{ justifyContent: 'center' }}>
          {res.agP <= 3 && <span className={`medal m${res.agP}`} style={{ width: 30, height: 30, margin: 0 }}>{res.agP}</span>}
          <b style={{ fontSize: 17 }}>{res.agP}{res.o} no escalão {game.ath.cat} {res.ag}</b>
        </div>
        {res.pb && <span className="chip" style={{ background: 'var(--gold)', color: '#141B2D' }}><Icon name="star" />{res.prevPb ? `Recorde pessoal! −${fmt(res.prevPb - res.total)}` : 'Primeiro recorde nesta distância'}</span>}
      </div>

      <div className="card">
        <Title icon="timer">Ritmo por segmento</Title>
        <PaceBars segs={res.segs} />
        <div className="legend"><span><i style={{ background: 'var(--easy)' }} />poupar</span><span><i style={{ background: 'var(--long)' }} />ao ritmo</span><span><i style={{ background: 'var(--fast)' }} />atacar</span><span><i style={{ background: 'var(--accent)' }} />colar</span></div>
        <div className="splits" style={{ gridTemplateColumns: `repeat(${Math.min(res.segs.length, 4)}, minmax(0, 1fr))` }}>
          {res.segs.map((x, i) => <div key={i}><span>{dec(x.km * (i + 1))} km</span><b>{pace(x.t / x.km)}</b></div>)}
        </div>
      </div>

      <div className="grid2">
        <div className="card" style={{ padding: 10 }}><Stat icon="star" label="Pontos de treino" value={`+${res.xp}`} /></div>
        <div className="card" style={{ padding: 10 }}><Stat icon="coin" label="Prémio" value={res.prize ? `${Math.round(res.prize)} €` : '—'} sub={res.bonus ? `+ bónus ${res.bonus} €` : undefined} /></div>
        <div className="card" style={{ padding: 10 }}><Stat icon="star" label="Fama" value={`+${dec(res.fame)}`} /></div>
        <div className="card" style={{ padding: 10 }}><Stat icon="trend" label="Ranking" value={res.pts ? `+${res.pts}` : '—'} sub={r.tier === 'clube' ? 'prova do clube' : 'pontos'} /></div>
      </div>

      {res.slot && <div className="card acc"><Title icon="trophy">{res.slot}</Title><span className="small">Inscreve-te em Carreira.</span></div>}
      {res.legend && <div className="card acc"><Title icon="medal">Lenda local</Title><span className="small">{res.legend}</span></div>}

      <div className="card">
        <Seg label="Classificação" value={view} options={[['geral', 'Geral'], ['escalao', 'Escalão'], ['clube', 'Clube']]} onChange={setView} />
        <div className="lb">
          {list.map((x, i) => {
            const n = number(x, i);
            return (
              <div key={x.nm + i} className={`it${x.me ? ' me' : ''}`}>
                <span className="n">{n <= 3 ? <span className={`medal m${n}`}>{n}</span> : n}</span>
                <span className="who">
                  <span>{x.me ? 'Tu' : x.nm}</span>
                  {x.tag === 'rival' && <span className="chip bad">rival</span>}
                  {x.tag === 'clube' && <span className="chip acc">clube</span>}
                  {view === 'geral' && <span className="small muted">{x.ag}</span>}
                </span>
                <span className="t">{fmt(x.total)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {r.tier !== 'clube' && (
        <div className="card flat">
          {res.rivalNm ? (
            <div className="vs">
              <div className="side"><Avatar name={game.ath.name} size={40} ring={res.beatRival ? 'var(--good)' : undefined} /><b className="small">Tu</b></div>
              <span className="small"><b>{res.beatRival ? 'Ganhaste o duelo' : 'Perdeste o duelo'}</b><br /><span className="muted">{res.beatRival ? 'Moral +5' : 'Fica para a próxima'}</span></span>
              <div className="side"><Avatar name={res.rivalNm} size={40} ring={res.beatRival ? undefined : 'var(--bad)'} /><b className="small">{res.rivalNm}</b></div>
            </div>
          ) : <span className="small muted">O teu rival estava lesionado e falhou esta prova.</span>}
        </div>
      )}

      <details className="card flat">
        <summary className="small"><b>Relato da prova</b></summary>
        {res.lines.map((l, i) => <span key={i} className="small" style={{ display: 'block', marginTop: 4 }}>{l.text}</span>)}
      </details>

      {card ? <ShareCard game={game} race={r} res={res} onClose={() => setCard(false)} />
        : <button className="btn" onClick={() => setCard(true)}><Icon name="share" size={18} />Cartão para partilhar</button>}
      <div className="cta"><button className="btn primary" onClick={() => { buzz(10); onContinue(); }}>Continuar<Icon name="chevron" /></button></div>
    </>
  );
}
