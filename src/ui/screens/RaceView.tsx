import { useEffect, useMemo, useRef, useState } from 'react';
import { DIST, dec, fmt, type RaceDef, type RaceResult, type TraceRow } from '../../engine';

// Percurso desenhado: proporção de ecrã de cada segmento (natação, T1, bike, T2, corrida).
const SEG_W = [0.16, 0.04, 0.46, 0.04, 0.3];
const SEG_START = SEG_W.map((_, i) => SEG_W.slice(0, i).reduce((a, b) => a + b, 0));
const SEG_NAME = ['Natação', 'T1', 'Bike', 'T2', 'Corrida'];
const SEG_COLOR = ['var(--swim)', 'var(--line)', 'var(--bike)', 'var(--line)', 'var(--run)'];
const REAL_SECONDS = 30; // duração da animação a velocidade normal

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

const gapText = (s: number) => (s >= 60 ? fmt(Math.abs(s)) : `${Math.round(Math.abs(s))} s`);

export function RaceView({ res, race, onEnd }: { res: RaceResult; race: RaceDef; onEnd: () => void }) {
  const me = useMemo(() => res.trace.find(r => r.me)!, [res]);
  const end = me.cum[4];
  const rate = end / REAL_SECONDS; // segundos de prova por segundo real
  const [t, setT] = useState(0);
  const [fast, setFast] = useState(false);
  const fastRef = useRef(fast);
  fastRef.current = fast;
  const ended = useRef(false);

  useEffect(() => {
    let raf = 0, last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setT(prev => Math.min(end * 1.04, prev + dt * rate * (fastRef.current ? 4 : 1)));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, rate]);

  useEffect(() => {
    if (t >= end * 1.04 && !ended.current) { ended.current = true; onEnd(); }
  }, [t, end, onEnd]);

  const pMe = progress(me.cum, t);
  const ranked = useMemo(() => res.trace
    .map(r => ({ r, p: progress(r.cum, t) }))
    .sort((a, b) => (a.p >= 1 && b.p >= 1 ? a.r.cum[4] - b.r.cum[4] : b.p - a.p)), [res, t]);
  const myIdx = ranked.findIndex(x => x.r.me);
  const leader = ranked[0];
  const tMe = timeAt(me.cum, pMe);
  const from = Math.max(0, myIdx - 2);
  const around = ranked.slice(from, myIdx + 3).map((x, i) => {
    const gap = x.r.me ? 0 : x.p > pMe ? tMe - timeAt(x.r.cum, pMe) : -(t - timeAt(me.cum, x.p));
    return { ...x, gap, pos: from + i + 1 };
  });
  const leaderGap = leader.r.me ? 0 : tMe - timeAt(leader.r.cum, pMe);

  const seg = me.cum.findIndex(c => t < c);
  const D = DIST[race.t];
  const segFrac = seg < 0 ? 1 : (pMe - SEG_START[seg]) / SEG_W[seg];
  const where = seg < 0 ? 'Na meta'
    : seg === 0 ? `Natação · ${Math.round(D.swim * segFrac)} m`
    : seg === 2 ? `Bike · km ${dec(D.bike * segFrac)}`
    : seg === 4 ? `Corrida · km ${dec(D.run * segFrac)}`
    : SEG_NAME[seg];
  const lines = res.timeline.filter(l => l.at <= t);
  const X = (p: number) => 10 + p * 320;
  const rowY = (i: number) => 44 + ((i * 7) % 9) * 9;
  const rival = res.trace.find(r => r.tag === 'rival');

  return (
    <>
      <h1>{race.n}</h1>
      <svg viewBox="0 0 340 150" role="img" aria-label={`Prova em curso: ${myIdx + 1}º lugar, ${where}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {SEG_W.map((w, i) => (
          <rect key={i} x={X(SEG_START[i])} y={34} width={w * 320} height={92} fill={SEG_COLOR[i]} fillOpacity={i % 2 ? 0.25 : 0.12} />
        ))}
        {[0, 2, 4].map(i => (
          <text key={i} x={X(SEG_START[i] + SEG_W[i] / 2)} y={24} textAnchor="middle" fontSize="11" fill="var(--muted)">{SEG_NAME[i]}</text>
        ))}
        <line x1={X(1)} x2={X(1)} y1={30} y2={130} stroke="var(--ink)" strokeWidth={2} strokeDasharray="3 3" />
        {res.trace.map((r, i) => {
          if (r.me) return null;
          const p = progress(r.cum, t);
          const fill = r.tag === 'rival' ? 'var(--bad)' : r.tag === 'clube' ? 'var(--accent)' : 'var(--muted)';
          return <circle key={i} cx={X(p)} cy={rowY(i)} r={r.tag ? 3.6 : 2.8} fill={fill} fillOpacity={r.tag ? 1 : 0.45} />;
        })}
        {rival && <text x={X(progress(rival.cum, t))} y={rowY(res.trace.indexOf(rival)) - 6} textAnchor="middle" fontSize="9" fill="var(--bad)">{rival.nm.split(' ')[0]}</text>}
        <circle cx={X(pMe)} cy={86} r={6} fill="var(--ink)" stroke="var(--card)" strokeWidth={2} />
        <text x={X(pMe)} y={146} textAnchor="middle" fontSize="11" fontWeight={700} fill="var(--ink)">Tu</text>
      </svg>

      <div className="between">
        <div>
          <div className="big" style={{ fontSize: 40 }}>{myIdx + 1}{res.o}</div>
          <div className="small muted">de {res.N} · {where}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono">{fmt(Math.min(t, end))}</div>
          <div className="small muted">{leaderGap > 0.5 ? `líder a ${gapText(leaderGap)}` : 'na frente da prova'}</div>
        </div>
      </div>

      <div className="lb" aria-label="À tua volta">
        {around.map(x => (
          <div key={x.r.nm} className={`it${x.r.me ? ' me' : ''}`}>
            <span className="n">{x.pos}</span>
            <span>{x.r.me ? 'Tu' : x.r.nm}{x.r.tag === 'rival' ? ' · rival' : x.r.tag === 'clube' ? ' · clube' : ''}</span>
            {/* diferença para ti, como nas transmissões: quem vai à frente tem tempo negativo */}
            <span className="t">{x.r.me ? '' : `${x.gap > 0 ? '−' : '+'}${gapText(x.gap)}`}</span>
          </div>
        ))}
      </div>

      <div className="feed" aria-live="polite">
        {lines.slice(-3).map(l => <div key={l.at + l.text} style={{ ['--sp' as string]: `var(--${l.sp === 'gen' ? 'line' : l.sp})` }}>{l.text}</div>)}
      </div>

      <div className="seg">
        <button aria-pressed={fast} onClick={() => setFast(f => !f)}>{fast ? 'Velocidade ×4' : 'Acelerar ×4'}</button>
        <button onClick={() => { ended.current = true; onEnd(); }}>Ver resultado</button>
      </div>
    </>
  );
}
