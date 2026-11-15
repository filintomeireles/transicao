import { useState } from 'react';
import {
  ATTR, BAL, CAMPS, DAY_NAMES, DIST, EVENTS, PRESETS, SESS, SESSION_KEYS, SPORT_NAME,
  acceptOffer, addRealActivities, ageGroup, applyPreset, bonusFor, canEnter, coachTips, dec, declineOffer, eur, form, myClub,
  nextRace, projected, raceThisWeek, readFiles, removeReal, resolveEvent, setDay, toggleRealRace, weekInSeason, whyNot,
  type AttrKey, type GameState, type SessionKey
} from '../../engine';
import { Flash, Sheet, Stat, Title } from '../components';
import { FeedbackPrompt } from '../Feedback';
import { buzz } from '../fx';
import { GuideCard } from '../guide';
import { Icon, SESSION_ICON, SPORT_ICON, type IconName } from '../icons';
import type { Apply } from '../useGame';

const DAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const sign = (n: number) => (n >= 0 ? '+' : '−') + Math.abs(Math.round(n));

function LoadBars({ load }: { load: number }) {
  const on = Math.min(4, Math.ceil(load / 20));
  return <span className="load" aria-label={`carga ${load}`}>{[0, 1, 2, 3].map(i => <i key={i} className={i < on ? 'on' : ''} />)}</span>;
}

function Inbox({ game, apply }: { game: GameState; apply: Apply }) {
  const open = game.inbox.map((m, i) => [m, i] as const).filter(([m]) => !m.done || m.res).slice(0, 4);
  if (!open.length) return null;
  return (
    <>
      {open.map(([m, i]) => {
        const offer = m.k === 'offer', ic: IconName = offer ? 'file' : m.k === 'ev' ? 'spark' : 'mail';
        return (
          <div key={i + m.t} className={`msg${offer ? ' offer' : ''}${m.done ? ' done' : ''}`}>
            <span className={`tile ${offer ? 'sp-gold' : 'sp-acc'}`}><Icon name={ic} /></span>
            <div className="msg-b">
              <div className="between"><b>{m.t}</b>{offer && !m.done && <span className="chip gold">contrato</span>}</div>
              <span className="small">{m.x}</span>
              {m.res && <span className="msg-res">{m.res}</span>}
              {!m.done && m.k === 'ev' && m.id && (
                <div className="row">
                  {EVENTS[m.id].o.map(([label], j) => (
                    <button key={j} className="btn sm" onClick={() => { buzz(); apply(s => resolveEvent(s, i, j)); }}>{label}</button>
                  ))}
                </div>
              )}
              {!m.done && offer && (
                <div className="row">
                  <button className="btn sm dark" onClick={() => { buzz([10, 40, 10]); apply(s => acceptOffer(s, i)); }}><Icon name="check" size={16} />Assinar</button>
                  <button className="btn sm ghost" onClick={() => apply(s => declineOffer(s, i))}>Recusar</button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

/** Folha para escolher o treino de um dia: duração, carga, custo e o que treina. */
function DaySheet({ game, day, apply, onClose }: { game: GameState; day: number; apply: Apply; onClose: () => void }) {
  const cur = game.plan[day];
  const pick = (k: SessionKey) => { buzz(8); apply(s => setDay(s, day, k)); onClose(); };
  return (
    <Sheet title={`Treino de ${DAY_NAMES[day]}`} onClose={onClose}>
      <div className="sess-list">
        {SESSION_KEYS.map(k => {
          const S = SESS[k], b = bonusFor(game, day, k);
          const trains = (Object.keys(S.g) as AttrKey[]).map(a => `${ATTR[a][0].toLowerCase()}${ATTR[a][1] !== S.sp && ATTR[a][1] !== 'gen' ? ` (${SPORT_NAME[ATTR[a][1]].toLowerCase()})` : ''}`);
          const hurt = game.injury > 0 && S.sp === 'run';
          return (
            <button key={k} className={`sess sp-${S.sp}`} aria-pressed={k === cur} onClick={() => pick(k)}>
              <span className="tile"><Icon name={SESSION_ICON[k]} /></span>
              <span>
                <b>{S.n}</b>
                <span className="small">{S.min ? `${S.min} min · carga ${S.load}` : 'recuperação: a fadiga desce mais'}{S.cost ? ` · ${eur(S.cost)}` : ''}</span>
                {trains.length > 0 && <span className="small" style={{ display: 'block' }}>Treina {trains.join(', ')}</span>}
              </span>
              <span className="stack" style={{ alignItems: 'flex-end' }}>
                <LoadBars load={S.load} />
                {b.includes('club') && <span className="chip acc">clube +15%</span>}
                {b.includes('group') && <span className="chip acc">grupo +15%</span>}
                {hurt && <span className="chip warn">lesão</span>}
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

export function WeekScreen({ game, apply, flash, setFlash, onClose, weeksLeft }: { game: GameState; apply: Apply; flash: string; setFlash: (t: string) => void; onClose: () => void; weeksLeft: number | null }) {
  const [sheet, setSheet] = useState<number | null>(null);
  const race = raceThisWeek(game), enter = !!race && canEnter(game, race), pj = projected(game), ev = myClub(game).ev;
  const nr = nextRace(game), L = game.last, wk = weekInSeason(game), f = form(game);

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    const { acts, errs } = await readFiles(Array.from(files));
    setFlash(apply(s => addRealActivities(s, acts, errs)) ?? '');
    buzz();
  }
  function sampleReal() {
    const now = new Date(), sat = new Date(now.getTime() - ((now.getDay() + 1) % 7) * 864e5);
    setFlash(apply(s => addRealActivities(s, [{ sport: 'run', start: sat.getTime(), sec: 3480, km: 10.4, hr: 144 }])) ?? '');
    buzz();
  }
  const camp = game.camp ? CAMPS.find(c => c.id === game.camp!.id) : undefined;
  const away = nr ? nr.w - wk : 0;

  return (
    <>
      <Flash text={flash} onClose={() => setFlash('')} />
      {camp && (
        <div className="card acc">
          <Title icon="mountain" right={<span className="chip acc">{game.camp!.left === 1 ? 'última semana' : `faltam ${game.camp!.left}`}</span>}>Em estágio</Title>
          <span className="small"><b>{camp.n}</b>. Os treinos rendem mais, mas esta semana não contas para os eventos do clube.</span>
        </div>
      )}
      <GuideCard game={game} where="week" apply={apply} />
      <FeedbackPrompt game={game} apply={apply} />
      <Inbox game={game} apply={apply} />

      {nr ? (
        <div className={`card ${away <= 1 && canEnter(game, nr) ? 'acc' : ''}`}>
          <div className="between">
            <div className="row" style={{ gap: 10, flexWrap: 'nowrap', minWidth: 0 }}>
              <span className={`tile ${nr.tier === 'mundial' ? 'sp-gold' : 'sp-acc'}`}><Icon name={nr.tier === 'mundial' ? 'trophy' : 'flag'} /></span>
              <div className="stack">
                <span className="lbl">Próxima prova</span>
                <b style={{ fontSize: 16 }}>{nr.n}</b>
              </div>
            </div>
            <div className="stack" style={{ alignItems: 'flex-end', flex: 'none' }}>
              <b className="stat-v">{away === 0 ? 'Domingo' : `${away} sem.`}</b>
              <span className="small muted">{DIST[nr.t].l}</span>
            </div>
          </div>
          <div className="sub">
            <span><Icon name="coin" size={14} /> {eur(nr.fee + nr.travel)} inscrição e viagem</span>
            {!canEnter(game, nr) && <span className="chip bad"><Icon name="lock" />{whyNot(game, nr)}</span>}
            {away <= 1 && canEnter(game, nr) && <span className="chip acc">alivia para chegar com forma</span>}
          </div>
        </div>
      ) : (
        <div className="card flat small"><span><Icon name="flag" size={16} /> Não estás inscrito em mais provas esta temporada. Escolhe-as em Carreira.</span></div>
      )}

      <div className="title">
        <h1>Plano da semana</h1>
        <span className="chip">{game.ath.cat} {ageGroup(game.ath.age)}</span>
      </div>
      <div className="presets" role="group" aria-label="Modelos de semana">
        {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map(p => (
          <button key={p} className="btn sm soft" onClick={() => { buzz(8); apply(s => applyPreset(s, p)); }}>
            <Icon name={p === 'Carga' ? 'up' : p === 'Taper' ? 'down' : 'week'} size={15} />{p}
          </button>
        ))}
      </div>

      <div className="days">
        {game.plan.map((k, i) => {
          if (i === 6 && enter && race) {
            return (
              <div key={i} className="day race">
                <span className="tile sp-acc"><Icon name="flag" /></span>
                <span className="dn"><small>{DAY_SHORT[i]} · dia de prova</small><b>{race.n}</b></span>
                <span className="dr"><span className="chip acc">{DIST[race.t].l}</span></span>
              </div>
            );
          }
          const real = game.real[i];
          if (real.length) {
            const isRace = real.some(r => r.race);
            return (
              <div key={i} className={`day real sp-${SESS[real[0].k].sp}`}>
                <span className="tile"><Icon name={SESSION_ICON[real[0].k]} /></span>
                <span className="dn">
                  <small>{DAY_SHORT[i]} · treino real</small>
                  {real.map((r, j) => <b key={j}>{r.race ? 'Prova real' : SESS[r.k].n} <span className="small muted mono">{r.min}′{r.km ? ` · ${dec(r.km)} km` : ''}</span></b>)}
                </span>
                <span className="dr">
                  <span className="chip good">real +{Math.round((BAL.realBonus - 1) * 100)}%</span>
                  <span className="row" style={{ gap: 4 }}>
                    <button className="btn sm" style={{ padding: '4px 8px' }} aria-pressed={isRace} onClick={() => apply(s => toggleRealRace(s, i))}>{isRace ? 'é prova ✓' : 'foi prova?'}</button>
                    <button className="icon-btn" aria-label={`Remover treino real de ${DAY_NAMES[i]}`} onClick={() => apply(s => removeReal(s, i))}><Icon name="close" size={16} /></button>
                  </span>
                </span>
              </div>
            );
          }
          const S = SESS[k], b = bonusFor(game, i, k);
          const note = b.includes('club') ? <span className="chip acc">clube +15%</span>
            : b.includes('group') ? <span className="chip acc">grupo +15%</span>
            : i === ev.d ? <span className="small">{ev.sp === 'bike' ? 'bike' : 'corrida'} do clube</span>
            : i === 6 ? <span className="small">long run do grupo</span> : null;
          return (
            <button key={i} className={`day sp-${S.sp}`} onClick={() => { buzz(6); setSheet(i); }} aria-label={`${DAY_NAMES[i]}: ${S.n}. Mudar treino`}>
              <span className="tile"><Icon name={SESSION_ICON[k]} /></span>
              <span className="dn"><small>{DAY_SHORT[i]}{S.min ? ` · ${S.min} min` : ''}</small><b>{S.n}</b></span>
              <span className="dr"><LoadBars load={S.load} />{note}</span>
            </button>
          );
        })}
      </div>

      <div className="proj">
        <Stat label="Carga" icon="brick" value={pj.load} sub="TL da semana" />
        <Stat label="Fadiga" value={<>{Math.round(game.fatigue)}<span className="muted" style={{ fontSize: 16 }}> → </span>{Math.round(pj.fatigue)}</>} sub="no fim da semana" />
        <Stat label="Forma" value={<>{sign(f)}<span className="muted" style={{ fontSize: 16 }}> → </span>{sign(pj.form)}</>} sub={game.injury ? `lesão: ${game.injuryName}` : game.rain ? 'semana de chuva' : 'prevista'} />
      </div>

      <div className="card coach" aria-label="Treinador">
        <Title icon="coach">Treinador</Title>
        {coachTips(game).map((tip, i) => (
          <div key={i} className={`tip ${tip.level}`}><Icon name={tip.level === 'warn' ? 'alert' : tip.level === 'good' ? 'check' : 'info'} size={17} /><span>{tip.text}</span></div>
        ))}
      </div>

      <div className="card flat">
        <div className="between">
          <div className="stack"><b>Treino real</b><span className="small muted">FIT, GPX ou TCX do relógio ou da app · +{Math.round((BAL.realBonus - 1) * 100)}% nos ganhos</span></div>
          <span className="tile sp-good"><Icon name="upload" /></span>
        </div>
        <div className="row">
          <span className="btn sm file"><Icon name="upload" size={15} />Importar
            <input type="file" id="wk-files" multiple accept=".fit,.gpx,.tcx" aria-label="Importar ficheiros FIT, GPX ou TCX" onChange={e => { importFiles(e.target.files); e.target.value = ''; }} />
          </span>
          <button className="btn sm ghost" onClick={sampleReal}>Usar um treino de exemplo</button>
        </div>
      </div>

      {L && (
        <div className="card">
          <Title icon="trend" right={<span className={`chip ${L.fin >= 0 ? 'good' : 'bad'}`}>{L.fin >= 0 ? '+' : ''}{eur(L.fin)}</span>}>Semana {L.week}</Title>
          <div className="small muted">Carga {L.load} TL</div>
          <div className="stack" style={{ gap: 6 }}>
            {(Object.entries(L.gains) as [AttrKey, number][]).filter(([, g]) => Math.abs(g) >= 0.05).sort((a, b) => b[1] - a[1]).map(([k, g]) => {
              const sp = ATTR[k][1];
              return (
                <div key={k} className={`row sp-${sp}`} style={{ flexWrap: 'nowrap', gap: 8 }}>
                  <span className="tile sm"><Icon name={SPORT_ICON[sp]} size={16} /></span>
                  <span className="small" style={{ flex: 1 }}>{SPORT_NAME[sp]} · {ATTR[k][0].toLowerCase()}</span>
                  <b className={`mono small ${g > 0 ? 'good-t' : 'bad-t'}`}>{g > 0 ? '+' : ''}{dec(g)}</b>
                </div>
              );
            })}
          </div>
          {L.bonuses?.length ? <div className="row">{L.bonuses.map(b => <span key={b} className="chip acc"><Icon name="spark" />{b}</span>)}</div> : null}
          {L.rep.map((r, i) => <div key={i} className="small">{r}</div>)}
        </div>
      )}

      <div className="cta">
        <button className="btn primary" onClick={() => { buzz(14); onClose(); }} disabled={weeksLeft === 0}>
          <span>
            {enter ? 'Fechar semana e ir para a prova' : 'Fechar semana'}
            {weeksLeft != null && (
              <span className="btn-sub">{weeksLeft > 0 ? `${weeksLeft} semana${weeksLeft === 1 ? '' : 's'} para jogar hoje · +${BAL.pacePerDay} por dia, até ${BAL.paceCap}` : `Sem semanas por hoje · amanhã tens mais ${BAL.pacePerDay}`}</span>
            )}
          </span>
          {enter ? <Icon name="flag" /> : <Icon name="chevron" />}
        </button>
      </div>

      {sheet != null && <DaySheet game={game} day={sheet} apply={apply} onClose={() => setSheet(null)} />}
    </>
  );
}
