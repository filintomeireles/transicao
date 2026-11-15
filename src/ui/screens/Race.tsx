import { useCallback, useState } from 'react';
import {
  COURSE_NAME, DIST, GELS, changeGels, dec, finishRace, fmt, form, myClub, runRace, setRaceChoice, startRace, wetsuit,
  type GameState, type RaceChoices, type ResultRow
} from '../../engine';
import { CourseProfile, SplitBar } from '../charts';
import { Avatar, Seg, Stat, Title } from '../components';
import { Confetti, buzz, useCountUp } from '../fx';
import { GuideCard } from '../guide';
import { Icon } from '../icons';
import { RaceView } from './RaceView';
import { ShareCard } from './ShareCard';
import type { Apply } from '../useGame';

type View = 'geral' | 'escalao' | 'clube';

/** Dicas sobre o percurso e o tempo do dia, para as decisões da prova. */
function conditionTips(game: GameState): string[] {
  const r = game.race!, w = r.weather!, tips: string[] = [];
  if (r.course !== 'plano') tips.push(r.course === 'montanhoso' ? 'Muitas subidas: a potência na bike conta mais e o equipamento aero vale metade.' : 'Percurso ondulado: a potência na bike conta um pouco mais.');
  if (w.air >= 25) tips.push((game.heatUntil ?? 0) >= game.week ? 'Calor, mas estás aclimatado: custa-te bem menos.' : 'Calor: a corrida vai custar. Leva mais um ou dois géis e pensa numa estratégia conservadora.');
  if (w.wind > 30) tips.push(game.owned.wheels ? 'Vento forte: as rodas de perfil alto vão atrapalhar no vento cruzado.' : 'Vento forte: a bike vai ser lenta para todos.');
  else if (w.wind >= 20) tips.push('Vento: o equipamento aero vale mais hoje.');
  if (w.rain) tips.push('Chuva: a bike fica mais lenta e há risco de queda nas curvas.');
  if ((game.altitudeUntil ?? 0) >= game.week) tips.push('Efeito da altitude: rendes mais 2% hoje.');
  if (!tips.length) tips.push('Condições boas: nada de especial a ter em conta.');
  return tips;
}

const POS_HINT = { frente: 'Ganhas cerca de 3,5% na natação, mas há 30% de risco de levar pancada e perder tempo.', lado: 'Ganhas 1,5% com 10% de risco de pancada.', tras: 'Sem confusão nem ganhos: nadas ao teu ritmo.' };
const INT_HINT: Record<string, string> = { '0.75': 'Muito controlado: bike 5% mais lenta, chegas à corrida com energia de sobra.', '0.82': 'Controlado: bike 2,5% mais lenta, poupa energia para correr.', '0.88': 'O ritmo de referência para a tua distância.', '0.95': 'No limite: bike 2,5% mais rápida, mas a energia pode faltar a correr.' };
const STRAT_HINT = { conservador: 'Começas devagar: 2% mais lento, mas sobra energia.', constante: 'Ritmo certo do princípio ao fim.', negativo: 'Acelera na segunda metade: 1% mais rápido se o mental aguentar.', agressivo: 'Sais forte: 2,5% mais rápido, mas gasta muita energia.' };

export function RaceScreen({ game, apply, onDone }: { game: GameState; apply: Apply; onDone: () => void }) {
  const r = game.race!;
  const D = DIST[r.t];
  const [view, setView] = useState<View>('escalao');
  const [card, setCard] = useState(false);
  const res = r.res;
  const endLive = useCallback(() => window.scrollTo(0, 0), []);

  function start() {
    buzz([20, 60, 20]);
    // Com movimento reduzido não há animação nem minijogos: o resultado sai logo.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) apply(s => runRace(s));
    else apply(s => startRace(s));
    window.scrollTo(0, 0);
  }

  if (r.stage === 'setup') {
    const f = form(game), n = game.ath.cat === 'F' ? r.nF : r.nM, w = r.weather;
    const choose = <K extends keyof RaceChoices>(k: K) => (v: RaceChoices[K]) => apply(s => setRaceChoice(s, k, v));
    const ws = r.temp < 22 ? (wetsuit(game) ? 'fato permitido · tens um' : 'fato permitido · não tens') : 'sem fatos';
    return (
      <>
        <GuideCard game={game} where="race" apply={apply} />
        <div className="card hero">
          <span className="lbl">Dia de prova · {D.l}</span>
          <h1>{r.n}</h1>
          <div className="row small">
            <span className="chip"><Icon name="swim" />{D.swim} m</span>
            <span className="chip"><Icon name="bike" />{D.bike} km</span>
            <span className="chip"><Icon name="run" />{dec(D.run)} km</span>
            <span className="chip"><Icon name="club" />{n} atletas</span>
          </div>
          <CourseProfile course={r.course} />
          <div className="cond">
            <Stat icon="thermo" label="Ar" value={w ? `${w.air}°` : '—'} sub={w?.rain ? 'com chuva' : 'seco'} />
            <Stat icon="wind" label="Vento" value={w ? w.wind : '—'} sub="km/h" />
            <Stat icon="drop" label="Água" value={`${r.temp}°`} sub={ws} />
          </div>
          <div className="small muted">Percurso {COURSE_NAME[r.course]} · a tua forma {f >= 0 ? '+' : ''}{Math.round(f)}</div>
        </div>
        {w && (
          <div className="card coach" aria-label="Condições">
            <Title icon="info">Condições do dia</Title>
            {conditionTips(game).map(t => <div key={t} className="tip info"><Icon name="chevron" size={16} /><span>{t}</span></div>)}
          </div>
        )}

        <div className="card decide">
          <span className="lbl sp-swim"><span className="tile sm"><Icon name="swim" size={16} /></span>Natação · posição na partida</span>
          <Seg label="Posição na partida" value={r.ch.pos} options={[['frente', 'Frente'], ['lado', 'Lado'], ['tras', 'Trás']]} onChange={choose('pos')} />
          <span className="small muted">{POS_HINT[r.ch.pos]}</span>
        </div>
        <div className="card decide">
          <span className="lbl sp-bike"><span className="tile sm"><Icon name="bike" size={16} /></span>Bike · % do FTP</span>
          <Seg label="Intensidade na bike" value={r.ch.int} options={[[0.75, '75'], [0.82, '82'], [0.88, '88'], [0.95, '95']]} onChange={choose('int')} />
          <span className="small muted">{INT_HINT[String(r.ch.int)]}</span>
        </div>
        <div className="card decide">
          <span className="lbl sp-bike"><span className="tile sm"><Icon name="drop" size={16} /></span>Géis na bike</span>
          <div className="seg stepper">
            <button aria-label="Menos um gel" onClick={() => { buzz(6); apply(s => changeGels(s, -1)); }}><Icon name="minus" /></button>
            <span className="value" aria-live="polite">{r.ch.gels} {r.ch.gels === 1 ? 'gel' : 'géis'}</span>
            <button aria-label="Mais um gel" onClick={() => { buzz(6); apply(s => changeGels(s, 1)); }}><Icon name="plus" /></button>
          </div>
          <span className="small muted">{game.owned.nutri ? `A nutricionista recomenda ${GELS[r.t]}.` : 'Poucos e bates na parede; demasiados e o estômago reclama.'}</span>
        </div>
        <div className="card decide">
          <span className="lbl sp-run"><span className="tile sm"><Icon name="run" size={16} /></span>Corrida · estratégia</span>
          <Seg two label="Estratégia de corrida" value={r.ch.strat} options={[['conservador', 'Conservador'], ['constante', 'Constante'], ['negativo', 'Negative split'], ['agressivo', 'Agressivo']]} onChange={choose('strat')} />
          <span className="small muted">{STRAT_HINT[r.ch.strat]}</span>
        </div>

        <div className="card flat">
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <Avatar name={game.rival.nm} size={36} />
            <span className="small">Na prova: {game.rival.out ? <>o teu rival {game.rival.nm} está lesionado</> : <>{game.ath.cat === 'F' ? 'a tua rival' : 'o teu rival'} <b>{game.rival.nm}</b></>} e amigos do {myClub(game).n}.</span>
          </div>
        </div>
        <div className="cta"><button className="btn primary" onClick={start}><Icon name="play" />Partida</button></div>
      </>
    );
  }

  if (r.stage === 'live') return <RaceView game={game} apply={apply} onEnd={endLive} />;
  if (!res) return null;
  return <Result game={game} res={res} view={view} setView={setView} card={card} setCard={setCard} onContinue={() => { apply(s => finishRace(s)); onDone(); }} />;
}

function Result({ game, res, view, setView, card, setCard, onContinue }: {
  game: GameState; res: NonNullable<NonNullable<GameState['race']>['res']>; view: View; setView: (v: View) => void;
  card: boolean; setCard: (b: boolean) => void; onContinue: () => void;
}) {
  const r = game.race!;
  const pos = Math.round(useCountUp(res.p, 900));
  const party = res.p <= 3 || res.agP <= 3;
  const list = res.lists[view];
  const number = (x: ResultRow, i: number) => (view === 'geral' ? x.pos : view === 'escalao' && x.me ? res.agP : i + 1);
  const parts: [string, number][] = [['Nat', res.me.swim], ['T1', res.me.t1], ['Bike', res.me.bike], ['T2', res.me.t2], ['Corr', res.me.run]];
  return (
    <>
      <div className="card hero result-hero">
        {party && <Confetti />}
        <span className="lbl">{r.n}</span>
        <div className="pos-big pop">{pos}{res.o}</div>
        <span className="small muted">na geral {res.catL}, de {res.N} · <span className="mono">{fmt(res.me.total)}</span></span>
        <div className="row" style={{ justifyContent: 'center' }}>
          {res.agP <= 3 && <span className={`medal m${res.agP}`} style={{ width: 30, height: 30, margin: 0 }}>{res.agP}</span>}
          <b style={{ fontSize: 17 }}>{res.agP}{res.o} no escalão {game.ath.cat} {res.ag}</b>
        </div>
      </div>

      <div className="card">
        <Title icon="timer">Parciais</Title>
        <SplitBar parts={parts} />
        <div className="splits">
          {parts.map(([l, t]) => <div key={l}><span>{l}</span><b>{fmt(t)}</b></div>)}
        </div>
      </div>

      <div className="grid3">
        <div className="card" style={{ padding: 10 }}><Stat icon="coin" label="Prémio" value={res.prize ? `${Math.round(res.prize)} €` : '—'} sub={res.bonus ? `+ bónus ${res.bonus} €` : undefined} /></div>
        <div className="card" style={{ padding: 10 }}><Stat icon="star" label="Fama" value={`+${Math.round(res.fame)}`} /></div>
        <div className="card" style={{ padding: 10 }}><Stat icon="trend" label="Ranking" value={`+${res.pts}`} sub="pontos" /></div>
      </div>

      {res.slot && <div className="card acc"><Title icon="trophy">{res.slot}</Title><span className="small">Já podes inscrever-te em Carreira.</span></div>}
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

      <div className="card flat">
        {res.rivalNm ? (
          <div className="vs">
            <div className="side"><Avatar name={game.ath.name} size={40} ring={res.beatRival ? 'var(--good)' : undefined} /><b className="small">Tu</b></div>
            <span className="small"><b>{res.beatRival ? 'Ganhaste o duelo' : 'Perdeste o duelo'}</b><br /><span className="muted">{res.beatRival ? 'Moral +5' : 'Fica para a próxima'}</span></span>
            <div className="side"><Avatar name={res.rivalNm} size={40} ring={res.beatRival ? undefined : 'var(--bad)'} /><b className="small">{res.rivalNm}</b></div>
          </div>
        ) : <span className="small muted">O teu rival estava lesionado e falhou esta prova.</span>}
      </div>

      {card ? <ShareCard game={game} race={r} res={res} onClose={() => setCard(false)} />
        : <button className="btn" onClick={() => setCard(true)}><Icon name="share" size={18} />Cartão para partilhar</button>}
      <div className="cta"><button className="btn primary" onClick={() => { buzz(10); onContinue(); }}>Continuar<Icon name="chevron" /></button></div>
    </>
  );
}
