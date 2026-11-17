import { useState } from 'react';
import {
  ATTR, BAL, CALENDAR, DAYS, DAY_NAMES, DIST, EVENTS, PRESETS, SESS, SESSION_KEYS, HOW_NAME,
  acceptOffer, addRealActivities, ageGroup, canEnter, clubToday, coachTips, dateLabel, daysTo, dec, declineOffer, doToday, enterRace, eur,
  fmt, groupToday, isEntered, myClub, nextRace, plannedToday, predict, raceOffer, readFiles, resolveEvent, restToday, setDay, applyPreset, skipRace,
  weekInSeason, weekday, whyNot, type AttrKey, type Effort, type GameState, type How, type PresetName, type SessionKey
} from '../../engine';
import { Flash, Seg, Sheet, Stat, Title } from '../components';
import { FeedbackPrompt } from '../Feedback';
import { buzz } from '../fx';
import { GuideCard } from '../guide';
import { Icon, SESSION_ICON, type IconName } from '../icons';
import type { Apply } from '../useGame';

const FEEL = { 1: ['Acordaste ótimo', 'good', 'Os treinos de hoje rendem mais 8%.'], 0: ['Acordaste normal', 'acc', ''], [-1]: ['Acordaste pesado', 'warn', 'Os treinos de hoje rendem menos 8%.'] } as const;
const HOW_ICON: Record<How, IconName> = { real: 'check', manual: 'check', sim: 'play', auto: 'spark', rest: 'rest', race: 'flag', miss: 'close' };

function LoadBars({ load }: { load: number }) {
  const on = Math.min(4, Math.ceil(load / 22));
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
                  {EVENTS[m.id].o.map(([label], j) => <button key={j} className="btn sm" onClick={() => { buzz(); apply(s => resolveEvent(s, i, j)); }}>{label}</button>)}
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

/** Folha para escolher uma sessão (para hoje ou para um dia do modelo da semana). */
function SessionSheet({ game, day, apply, onClose, title }: { game: GameState; day: number; apply: Apply; onClose: () => void; title: string }) {
  const cur = game.plan[day];
  return (
    <Sheet title={title} onClose={onClose}>
      <span className="small muted">Muda o modelo da semana: vale para todas as {DAY_NAMES[day]}s seguintes.</span>
      <div className="sess-list">
        {SESSION_KEYS.map(k => {
          const S = SESS[k];
          const trains = (Object.keys(S.g) as AttrKey[]).map(a => ATTR[a][0].toLowerCase());
          return (
            <button key={k} className={`sess sp-${S.fam}`} aria-pressed={k === cur} onClick={() => { buzz(8); apply(s => setDay(s, day, k)); onClose(); }}>
              <span className="tile"><Icon name={SESSION_ICON[k]} /></span>
              <span>
                <b>{S.n}</b>
                <span className="small">{S.min ? `${S.min} min${S.km ? ` · ${S.km} km` : ''} · carga ${S.load}` : S.d}</span>
                {trains.length > 0 && <span className="small" style={{ display: 'block' }}>Treina {trains.join(', ')}</span>}
              </span>
              <span className="stack" style={{ alignItems: 'flex-end' }}>
                <LoadBars load={S.load} />
                {game.injury > 0 && S.run && <span className="chip warn">lesão</span>}
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

function WeekStrip({ game }: { game: GameState }) {
  const wd = weekday(game), mon = game.today - wd;
  return (
    <div className="weekstrip">
      {DAYS.map((d, i) => {
        const day = mon + i, log = game.days.find(x => x.d === day);
        const k = log?.k ?? game.plan[i];
        const fam = k === 'race' ? 'acc' : SESS[k].fam;
        const isRace = i === 6 && CALENDAR.some(r => r.w === weekInSeason(game) && isEntered(game, r.id));
        return (
          <div key={d} className={`wd${i === wd ? ' today' : ''}${i > wd ? ' future' : ''}`} title={log ? HOW_NAME[log.how] : ''}>
            <b>{d}</b>
            <span className={`tile sp-${fam}`}><Icon name={i > wd && isRace ? 'flag' : SESSION_ICON[k]} size={15} /></span>
            <span>{dateLabel(day).split(' ')[0]}</span>
            {log && <span className={`how how-${log.how}`}><Icon name={HOW_ICON[log.how]} size={10} stroke={3} /></span>}
          </div>
        );
      })}
    </div>
  );
}

export function TodayScreen({ game, apply, flash, setFlash, free, onNextDay }: {
  game: GameState; apply: Apply; flash: string; setFlash: (t: string) => void; free: boolean; onNextDay: () => void;
}) {
  const [sheet, setSheet] = useState<number | null>(null);
  const [effort, setEffort] = useState<Effort>('plano');
  const [plan, setPlan] = useState(false);
  const k = plannedToday(game), S = SESS[k], wd = weekday(game), offer = raceOffer(game), nr = nextRace(game), L = game.last;
  const feel = FEEL[game.feel];
  const club = clubToday(game, k), group = groupToday(game, k);

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    const { acts, errs } = await readFiles(Array.from(files));
    setFlash(apply(s => addRealActivities(s, acts, errs)) ?? '');
    buzz([10, 40, 10]);
  }
  function sampleReal() {
    const S2 = SESS[k], t = Date.now() - 2 * 3600e3;
    const run = S2.run ? { sport: 'run' as const, start: t, sec: S2.min * 60, km: S2.km, hr: S2.fam === 'fast' ? 168 : 142 }
      : { sport: (k === 'str' ? 'str' : 'bike') as 'str' | 'bike', start: t, sec: Math.max(1800, S2.min * 60), km: k === 'cross' ? 25 : 0, hr: null };
    setFlash(apply(s => addRealActivities(s, [run])) ?? '');
    buzz([10, 40, 10]);
  }
  const finish = (how: 'manual' | 'sim') => { buzz([12, 50, 20]); apply(s => doToday(s, how, effort)); window.scrollTo(0, 0); };

  return (
    <>
      <Flash text={flash} onClose={() => setFlash('')} />
      <GuideCard game={game} where="week" apply={apply} />
      <FeedbackPrompt game={game} apply={apply} />
      <Inbox game={game} apply={apply} />

      {offer && !game.done && (
        <div className="card acc">
          <Title icon="flag" right={<span className="chip acc">{DIST[offer.t].l}</span>}>Hoje há prova</Title>
          <b style={{ fontSize: 17 }}>{offer.n}</b>
          <span className="small">{offer.tier === 'clube' ? 'Todos os sábados, contra a malta do clube. Sem inscrição, conta como o treino de hoje e dá pontos ao clube.' : `Inscrição e viagem ${eur(offer.fee + offer.travel)}. Conta como o treino de hoje.`} Tempo previsto: <b className="mono">{fmt(predict(game.a, offer.t))}</b>{game.pb[offer.t] ? <> · o teu recorde é <b className="mono">{fmt(game.pb[offer.t]!)}</b></> : null}.</span>
          <div className="grid2">
            <button className="btn primary" style={{ width: 'auto' }} onClick={() => { buzz([20, 60, 20]); setFlash(apply(s => enterRace(s, offer.id)) ?? ''); window.scrollTo(0, 0); }}><Icon name="flag" />Ir à prova</button>
            <button className="btn ghost" onClick={() => apply(skipRace)}>Hoje não</button>
          </div>
        </div>
      )}

      {!game.done ? (
        <div className="card today-card">
          <div className="between">
            <span className={`chip ${feel[1]}`}><Icon name={game.feel === 1 ? 'sun' : game.feel === -1 ? 'rain' : 'heart'} />{feel[0]}</span>
            <span className="small muted">{DAY_NAMES[wd]}{game.rain ? ' · chuva' : ''}</span>
          </div>
          <div className={`row sp-${S.fam}`} style={{ flexWrap: 'nowrap', gap: 12 }}>
            <span className="tile lg"><Icon name={SESSION_ICON[k]} size={26} /></span>
            <div className="stack" style={{ flex: 1 }}>
              <span className="lbl">Treino de hoje</span>
              <h1 style={{ fontSize: 26 }}>{S.n}</h1>
              <span className="small muted">{S.min ? `${S.min} min${S.km ? ` · ${S.km} km` : ''} · ` : ''}{S.d}</span>
            </div>
            <button className="icon-btn" aria-label="Mudar o treino de hoje" onClick={() => setSheet(wd)}><Icon name="chevron" /></button>
          </div>
          {(club || group || game.injury > 0 || feel[2]) && (
            <div className="row" style={{ gap: 6 }}>
              {club && <span className="chip acc"><Icon name="club" />treino do clube +15%</span>}
              {group && <span className="chip acc"><Icon name="club" />longão do grupo +15%</span>}
              {game.injury > 0 && <span className="chip warn"><Icon name="alert" />lesão: {game.injury} dias</span>}
              {feel[2] && <span className={`chip ${feel[1]}`}>{feel[2]}</span>}
            </div>
          )}

          {k === 'rest' ? (
            <div className="actions">
              <button className="act best" onClick={() => { buzz(12); apply(restToday); }}>
                <span className="tile sp-gen"><Icon name="rest" /></span>
                <span><b>Descansar</b><span className="small">A fadiga desce mais depressa. Conta para a série de dias.</span></span>
                <span className="mult">+5 pts</span>
              </button>
            </div>
          ) : (
            <div className="actions">
              <span className="lbl">Como foi o treino?</span>
              <label className="act best file">
                <span className="tile sp-good"><Icon name="upload" /></span>
                <span><b>Importar do relógio</b><span className="small">Ficheiro FIT, GPX ou TCX de hoje. Vale mais e prova que treinaste.</span></span>
                <span className="mult">×{dec(BAL.real)} · 2× pts</span>
                <input type="file" multiple accept=".fit,.gpx,.tcx" aria-label="Importar ficheiros FIT, GPX ou TCX" onChange={e => { importFiles(e.target.files); e.target.value = ''; }} />
              </label>
              <button className="act" onClick={() => finish('manual')}>
                <span className="tile sp-acc"><Icon name="check" /></span>
                <span><b>Já fiz este treino</b><span className="small">Treinaste a sério mas sem ficheiro. Confiamos em ti.</span></span>
                <span className="mult" style={{ color: 'var(--accent)' }}>×{dec(BAL.manual, 2)}</span>
              </button>
              <div className="act" style={{ cursor: 'default' }}>
                <span className="tile sp-gen"><Icon name="play" /></span>
                <span>
                  <b>Simular no jogo</b>
                  <span className="small">Hoje não deu para treinar: o atleta treina por ti.</span>
                  <span style={{ display: 'block', marginTop: 8 }}><Seg label="Esforço do treino simulado" value={effort} options={[['leve', 'Leve'], ['plano', 'Normal'], ['forte', 'Forte']]} onChange={setEffort} /></span>
                </span>
                <span className="stack" style={{ alignItems: 'flex-end', gap: 8 }}>
                  <span className="mult" style={{ color: 'var(--muted)' }}>×1</span>
                  <button className="btn sm dark" onClick={() => finish('sim')}>Simular</button>
                </span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <button className="btn sm ghost" onClick={() => { buzz(); apply(restToday); }}><Icon name="rest" size={15} />Descansar hoje</button>
                <button className="btn sm ghost" onClick={sampleReal}>Treino real de exemplo</button>
              </div>
            </div>
          )}
        </div>
      ) : L && L.d === game.today ? (
        <div className="card today-card">
          <div className="done-banner"><Icon name="check" />{L.how === 'race' ? 'Prova feita' : L.how === 'rest' ? 'Dia de descanso' : `${SESS[L.k as SessionKey]?.n ?? 'Treino'} feito`} · {HOW_NAME[L.how]}</div>
          <div className="grid3">
            <Stat label="Pontos" value={`+${L.xp}`} icon="star" />
            <Stat label="Carga" value={L.load} sub={L.min ? `${L.min} min${L.km ? ` · ${dec(L.km)} km` : ''}` : undefined} />
            <Stat label="Série" value={`${game.streak} d`} sub="dias seguidos" />
          </div>
          {(Object.entries(L.gains) as [AttrKey, number][]).filter(([, g]) => g >= 0.01).sort((a, b) => b[1] - a[1]).map(([at, g]) => (
            <div key={at} className={`row sp-${ATTR[at][2]}`} style={{ flexWrap: 'nowrap', gap: 8 }}>
              <span className="tile sm"><Icon name="up" size={15} /></span>
              <span className="small" style={{ flex: 1 }}>{ATTR[at][0]}</span>
              <b className="mono small good-t">+{dec(g, 2)}</b>
            </div>
          ))}
          {L.notes.map((n, i) => <div key={i} className="tip info"><Icon name="info" size={16} /><span>{n}</span></div>)}
          {(L.how === 'manual' || L.how === 'sim') && <span className="small muted">Se treinaste com relógio, importa o ficheiro: este treino passa a contar como real e ganhas o resto.</span>}
          {(L.how === 'manual' || L.how === 'sim') && (
            <label className="btn sm file" style={{ alignSelf: 'flex-start' }}><Icon name="upload" size={15} />Importar ficheiro de hoje
              <input type="file" multiple accept=".fit,.gpx,.tcx" aria-label="Importar ficheiros FIT, GPX ou TCX" onChange={e => { importFiles(e.target.files); e.target.value = ''; }} />
            </label>
          )}
          <div className="tip good"><Icon name="timer" size={16} /><span>O próximo treino é amanhã: {SESS[game.plan[(wd + 1) % 7]].n.toLowerCase()}. O jogo anda ao ritmo do calendário.</span></div>
          {free && <button className="btn dark" onClick={onNextDay}><Icon name="skip" size={18} />Avançar para amanhã (modo de testes)</button>}
        </div>
      ) : null}

      <div className="card">
        <Title icon="week" right={<span className={`chip ${game.wk.mine >= BAL.weekGoal ? 'good' : 'acc'}`}>{Math.min(game.wk.mine, BAL.weekGoal)}/{BAL.weekGoal} treinos teus</span>}>Semana {weekInSeason(game)}</Title>
        <WeekStrip game={game} />
        <div className="legend">
          <span><i className="how-real" />real</span><span><i className="how-manual" />confirmado</span><span><i className="how-sim" />simulado</span><span><i className="how-auto" />piloto automático</span><span><i className="how-race" />prova</span>
        </div>
        <span className="small muted">Faz {BAL.weekGoal} treinos teus (reais, confirmados ou simulados) para ganhar +{BAL.weekGoalXp} pontos e {BAL.weekGoalMoney} €. Se não abrires o jogo, o atleta treina em piloto automático: rende menos de metade.</span>
      </div>

      {nr && (
        <div className="card">
          <div className="between">
            <div className="row" style={{ gap: 10, flexWrap: 'nowrap', minWidth: 0 }}>
              <span className={`tile ${nr.tier === 'mundial' ? 'sp-gold' : 'sp-acc'}`}><Icon name={nr.tier === 'mundial' ? 'trophy' : 'flag'} /></span>
              <div className="stack"><span className="lbl">Próxima prova</span><b style={{ fontSize: 16 }}>{nr.n}</b></div>
            </div>
            <div className="stack" style={{ alignItems: 'flex-end', flex: 'none' }}>
              <b className="stat-v">{daysTo(game, nr) === 0 ? 'Hoje' : `${daysTo(game, nr)} dias`}</b>
              <span className="small muted">{DIST[nr.t].l}</span>
            </div>
          </div>
          <div className="sub">
            <span>Previsto <b className="mono">{fmt(predict(game.a, nr.t))}</b></span>
            {game.pb[nr.t] && <span>· recorde <b className="mono">{fmt(game.pb[nr.t]!)}</b></span>}
            {!canEnter(game, nr) && <span className="chip bad"><Icon name="lock" />{whyNot(game, nr)}</span>}
          </div>
        </div>
      )}

      <div className="card coach" aria-label="Treinador">
        <Title icon="coach">Treinador</Title>
        {coachTips(game).map((tip, i) => (
          <div key={i} className={`tip ${tip.level}`}><Icon name={tip.level === 'warn' ? 'alert' : tip.level === 'good' ? 'check' : 'info'} size={17} /><span>{tip.text}</span></div>
        ))}
      </div>

      <div className="card">
        <button className="between" style={{ background: 'none', border: 0, padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }} aria-expanded={plan} onClick={() => setPlan(p => !p)}>
          <h2><Icon name="week" size={18} />Modelo da semana</h2><Icon name={plan ? 'up' : 'down'} size={18} />
        </button>
        {plan && (
          <>
            <div className="presets" role="group" aria-label="Modelos de semana">
              {(Object.keys(PRESETS) as PresetName[]).map(p => <button key={p} className="btn sm soft" onClick={() => { buzz(8); apply(s => applyPreset(s, p)); }}>{p}</button>)}
            </div>
            <div className="days">
              {game.plan.map((pk, i) => (
                <button key={i} className={`day sp-${SESS[pk].fam}`} onClick={() => setSheet(i)} aria-label={`${DAY_NAMES[i]}: ${SESS[pk].n}. Mudar`}>
                  <span className="tile"><Icon name={SESSION_ICON[pk]} /></span>
                  <span className="dn"><small>{DAYS[i]}{i === myClub(game).ev.d ? ' · treino do clube' : i === 6 ? ' · longão do grupo' : ''}</small><b>{SESS[pk].n}</b></span>
                  <span className="dr"><LoadBars load={SESS[pk].load} /></span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {game.lastWeek && (
        <div className="card flat">
          <Title icon="trend" right={<span className={`chip ${game.lastWeek.fin >= 0 ? 'good' : 'bad'}`}>{game.lastWeek.fin >= 0 ? '+' : ''}{eur(game.lastWeek.fin)}</span>}>Semana {game.lastWeek.week} fechada</Title>
          <span className="small">Carga {game.lastWeek.load} · {game.lastWeek.mine} treinos teus{game.lastWeek.goal ? ' · objetivo cumprido' : ''}</span>
          {game.lastWeek.notes.map(n => <span key={n} className="small muted">{n}</span>)}
        </div>
      )}
      <span className="small muted" style={{ textAlign: 'center' }}>{game.ath.cat} {ageGroup(game.ath.age)} · temporada de 12 semanas · prova de calendário ao domingo</span>

      {sheet != null && <SessionSheet game={game} day={sheet} apply={apply} onClose={() => setSheet(null)} title={sheet === wd ? 'Treino de hoje' : `Treino de ${DAY_NAMES[sheet]}`} />}
    </>
  );
}
