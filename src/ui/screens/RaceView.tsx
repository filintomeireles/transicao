import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DIST, NEUTRAL_SCORE, applySprint, applyTransition, dec, finishLiveRace, fmt, liveView, sprintOpponent, wetsuit,
  type GameState, type TraceRow
} from '../../engine';
import type { Apply } from '../useGame';
import { Icon, type IconName } from '../icons';
import { SprintGame, TransitionGame } from './Minigames';

// Percurso desenhado: proporção de ecrã de cada segmento (natação, T1, bike, T2, corrida).
const SEG_W = [0.16, 0.04, 0.46, 0.04, 0.3];
const SEG_START = SEG_W.map((_, i) => SEG_W.slice(0, i).reduce((a, b) => a + b, 0));
const SEG_NAME = ['Natação', 'T1', 'Bike', 'T2', 'Corrida'];
const SEG_COLOR = ['var(--swim)', 'var(--axis)', 'var(--bike)', 'var(--axis)', 'var(--run)'];
const REAL_SECONDS = 30; // duração da animação a velocidade normal, sem contar as pausas
const SPRINT_AT = 0.97;  // fração da corrida em que se decide se há sprint final

/** Fração do percurso (0–1) feita no segundo t. */
function progress(cum: TraceRow['cum'], t: number): number {
  let prev = 0;
  for (let i = 0; i < 5; i++) {
    if (t < cum[i]) return SEG_START[i] + (SEG_W[i] * (t - prev)) / Math.max(1e-6, cum[i] - prev);
    prev = cum[i];
  }
  return 1;
}

/** Segundo em que o atleta passou pela fração p do percurso. */
function timeAt(cum: TraceRow['cum'], p: number): number {
  if (p >= 1) return cum[4];
  let i = 4;
  while (i > 0 && p < SEG_START[i]) i--;
  const prev = i ? cum[i - 1] : 0;
  return prev + ((p - SEG_START[i]) / SEG_W[i]) * (cum[i] - prev);
}

const gapText = (s: number) => (Math.abs(s) >= 60 ? fmt(Math.abs(s)) : `${Math.round(Math.abs(s))} s`);
type Pause = null | 't1' | 't2' | { sprint: string; behind: boolean };

export function RaceView({ game, apply, onEnd }: { game: GameState; apply: Apply; onEnd: () => void }) {
  const r = game.race!, L = r.live!;
  const view = useMemo(() => liveView(game)!, [game]);
  const me = view.trace.find(x => x.me)!;
  const end = me.cum[4];
  const [rate] = useState(() => end / REAL_SECONDS); // fixo no arranque: as transições mudam o tempo final
  const [t, setT] = useState(0);
  const [fast, setFast] = useState(false);
  const [pause, setPause] = useState<Pause>(null);
  const fastRef = useRef(fast), pauseRef = useRef<Pause>(pause);
  fastRef.current = fast;
  pauseRef.current = pause;
  const ended = useRef(false);

  // Relógio da prova: avança enquanto não houver um minijogo aberto.
  useEffect(() => {
    let raf = 0, last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!pauseRef.current) setT(prev => prev + dt * rate * (fastRef.current ? 4 : 1));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [rate]);

  const finish = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    apply(s => {
      if (s.race?.live?.t1Score == null) applyTransition(s, 1, NEUTRAL_SCORE);
      if (s.race?.live?.t2Score == null) applyTransition(s, 2, NEUTRAL_SCORE);
      finishLiveRace(s);
    });
    onEnd();
  }, [apply, onEnd]);

  // Momentos do jogador: T1, T2, sprint final, meta.
  useEffect(() => {
    if (pause || ended.current) return;
    if (L.t1Score == null && t >= me.cum[0]) { setT(me.cum[0]); setPause('t1'); return; }
    if (L.t1Score != null && L.t2Score == null && t >= me.cum[2]) { setT(me.cum[2]); setPause('t2'); return; }
    if (L.t2Score != null && !L.sprintDone && t >= me.cum[3] + (me.cum[4] - me.cum[3]) * SPRINT_AT) {
      const opp = sprintOpponent(game);
      if (opp) setPause({ sprint: opp.nm, behind: opp.gap < 0 });
      else apply(s => applySprint(s, null));
      return;
    }
    if (t >= end * 1.02) finish();
  }, [t, pause, L, me, end, game, apply, finish]);

  const doneT1 = useCallback((score: number) => { apply(s => applyTransition(s, 1, score)); setPause(null); }, [apply]);
  const doneT2 = useCallback((score: number) => { apply(s => applyTransition(s, 2, score)); setPause(null); }, [apply]);
  const doneSprint = useCallback((won: boolean | null) => { apply(s => applySprint(s, won)); setPause(null); }, [apply]);

  const pMe = progress(me.cum, t);
  const ranked = view.trace.map(x => ({ x, p: progress(x.cum, t) })).sort((a, b) => (a.p >= 1 && b.p >= 1 ? a.x.cum[4] - b.x.cum[4] : b.p - a.p));
  const myIdx = ranked.findIndex(z => z.x.me);
  const tMe = timeAt(me.cum, pMe);
  const from = Math.max(0, myIdx - 2);
  const around = ranked.slice(from, myIdx + 3).map((z, i) => ({
    ...z, pos: from + i + 1, gap: z.x.me ? 0 : z.p > pMe ? tMe - timeAt(z.x.cum, pMe) : -(t - timeAt(me.cum, z.p))
  }));
  const leader = ranked[0];
  const leaderGap = leader.x.me ? 0 : tMe - timeAt(leader.x.cum, pMe);
  const seg = me.cum.findIndex(c => t < c);
  const D = DIST[r.t];
  const segFrac = seg < 0 ? 1 : (pMe - SEG_START[seg]) / SEG_W[seg];
  const where = seg < 0 ? 'Na meta'
    : seg === 0 ? `Natação · ${Math.round(D.swim * segFrac)} m`
    : seg === 2 ? `Bike · km ${dec(D.bike * segFrac)}`
    : seg === 4 ? `Corrida · km ${dec(D.run * segFrac)}`
    : SEG_NAME[seg];
  const lines = view.timeline.filter(l => l.at <= t);
  const X = (p: number) => 10 + p * 320;
  const rowY = (i: number) => 52 + ((i * 7) % 9) * 9;
  const rival = view.trace.find(x => x.tag === 'rival');
  const segIc: IconName = seg === 0 ? 'swim' : seg === 2 ? 'bike' : seg === 4 ? 'run' : seg < 0 ? 'flag' : 'timer';

  return (
    <>
      <div className="title"><h1>{r.n}</h1><span className="chip acc"><span className="live-dot" />ao vivo</span></div>
      <svg className="track-view" viewBox="0 0 340 168" role="img" aria-label={`Prova em curso: ${myIdx + 1}º lugar, ${where}`}>
        {SEG_W.map((w, i) => <rect key={i} x={X(SEG_START[i])} y={40} width={w * 320} height={96} fill={SEG_COLOR[i]} fillOpacity={i % 2 ? 0.22 : 0.1} />)}
        {[52, 74, 96, 118].map(y => <path key={y} d={`M${X(0) + 4} ${y} q6 -4 12 0 t12 0 t12 0 t12 0`} fill="none" stroke="var(--swim)" strokeOpacity=".35" strokeWidth="1.2" />)}
        <line x1={X(SEG_START[2])} x2={X(SEG_START[3])} y1={88} y2={88} stroke="var(--bike)" strokeOpacity=".45" strokeWidth="1.5" strokeDasharray="7 6" />
        <line x1={X(SEG_START[4])} x2={X(1)} y1={88} y2={88} stroke="var(--run)" strokeOpacity=".4" strokeWidth="1.5" strokeDasharray="2 5" strokeLinecap="round" />
        {([[0, 'swim'], [2, 'bike'], [4, 'run']] as const).map(([i, ic]) => (
          <g key={i} transform={`translate(${X(SEG_START[i] + SEG_W[i] / 2) - 9} 12)`} color={`var(--${ic})`}><Icon name={ic} size={18} /></g>
        ))}
        <g transform={`translate(${X(1) - 6} 140)`} color="var(--ink)"><Icon name="flag" size={14} /></g>
        <line x1={X(1)} x2={X(1)} y1={36} y2={138} stroke="var(--ink)" strokeWidth={2} strokeDasharray="3 3" />
        {view.trace.map((x, i) => {
          if (x.me) return null;
          const fill = x.tag === 'rival' ? 'var(--bad)' : x.tag === 'clube' ? 'var(--accent)' : 'var(--muted)';
          return <circle key={i} cx={X(progress(x.cum, t))} cy={rowY(i)} r={x.tag ? 3.8 : 2.8} fill={fill} fillOpacity={x.tag ? 1 : 0.5} />;
        })}
        {rival && <text x={X(progress(rival.cum, t))} y={rowY(view.trace.indexOf(rival)) - 7} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--bad)">{rival.nm.split(' ')[0]}</text>}
        <circle className="me-glow" cx={X(pMe)} cy={88} r={11} fill="var(--accent)" fillOpacity=".25" />
        <circle cx={X(pMe)} cy={88} r={6.5} fill="var(--accent)" stroke="var(--card)" strokeWidth={2.5} />
        <text x={X(pMe)} y={158} textAnchor="middle" fontSize="11" fontWeight={700} fill="var(--ink)">Tu</text>
      </svg>
      <div className="splitbar" aria-hidden="true" style={{ height: 6 }}>
        <i style={{ flexGrow: pMe, background: 'var(--accent)' }} />
        <i style={{ flexGrow: 1 - pMe, background: 'var(--soft)' }} />
      </div>

      <div className="card">
        <div className="between">
          <div className="row" style={{ gap: 12, flexWrap: 'nowrap' }}>
            <span className={`tile lg sp-${seg === 0 ? 'swim' : seg === 2 ? 'bike' : seg === 4 ? 'run' : 'acc'}`}><Icon name={segIc} size={26} /></span>
            <div className="stack">
              <div className="pos-big" style={{ fontSize: 46 }}>{myIdx + 1}{game.ath.cat === 'F' ? 'ª' : 'º'}</div>
              <span className="small muted">de {view.trace.length} · {where}</span>
            </div>
          </div>
          <div className="stack" style={{ alignItems: 'flex-end' }}>
            <b className="mono" style={{ fontSize: 18 }}>{fmt(Math.min(t, end))}</b>
            <span className="small muted">{leaderGap > 0.5 ? `líder a ${gapText(leaderGap)}` : 'na frente da prova'}</span>
          </div>
        </div>
      </div>

      {pause === 't1' && <TransitionGame which={1} wetsuit={r.temp < 22 && wetsuit(game) > 0} onDone={doneT1} />}
      {pause === 't2' && <TransitionGame which={2} wetsuit={false} onDone={doneT2} />}
      {pause && typeof pause === 'object' && <SprintGame opponent={pause.sprint} behind={pause.behind} onDone={doneSprint} />}

      {!pause && (
        <>
          <div className="card" style={{ padding: 8 }}>
            <div className="lb" aria-label="À tua volta">
              {around.map(z => (
                <div key={z.x.nm} className={`it${z.x.me ? ' me' : ''}`}>
                  <span className="n">{z.pos <= 3 ? <span className={`medal m${z.pos}`}>{z.pos}</span> : z.pos}</span>
                  <span className="who"><span>{z.x.me ? 'Tu' : z.x.nm}</span>{z.x.tag === 'rival' && <span className="chip bad">rival</span>}{z.x.tag === 'clube' && <span className="chip acc">clube</span>}</span>
                  {/* diferença para ti, como nas transmissões: quem vai à frente tem tempo negativo */}
                  <span className="t">{z.x.me ? '' : `${z.gap > 0 ? '−' : '+'}${gapText(z.gap)}`}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="feed" aria-live="polite">
            {lines.slice(-3).map(l => <div key={l.at + l.text} style={{ ['--sp' as string]: `var(--${l.sp === 'gen' ? 'line' : l.sp})` }}>{l.text}</div>)}
          </div>
          <div className="grid2">
            <button className="btn" aria-pressed={fast} onClick={() => setFast(f => !f)}><Icon name="fast" size={18} />{fast ? 'Velocidade ×4' : 'Acelerar ×4'}</button>
            <button className="btn" onClick={finish}><Icon name="skip" size={18} />Ver resultado</button>
          </div>
        </>
      )}
    </>
  );
}
