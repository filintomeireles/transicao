// Gráficos pequenos em SVG: anel, linha com valores ao toque, faixa da temporada, perfil do percurso, parciais.
import { useId, useState, type PointerEvent } from 'react';
import type { Course } from '../engine';
import { Icon } from './icons';

/** Anel de progresso (0–100) com o valor no centro. */
export function Ring({ value, color, size = 40, children }: { value: number; color?: string; size?: number; children?: React.ReactNode }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  return (
    <span className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color ?? 'var(--accent)'} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${(c * v) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dasharray .6s ease' }} />
      </svg>
      <b>{children}</b>
    </span>
  );
}

interface Pt { x: number; y: number }

/**
 * Linha de uma só série (o título diz o que é), com grelha discreta, cruz e valor ao tocar,
 * e uma tabela escondida para leitores de ecrã.
 */
export function LineChart({ title, data, fmt = v => String(Math.round(v)), xLabel = x => `sem. ${x}`, zero = false, min, max }: {
  title: string; data: Pt[]; fmt?: (v: number) => string; xLabel?: (x: number) => string; zero?: boolean; min?: number; max?: number;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  if (data.length < 2) return <div className="chart empty small muted">{title}: o gráfico aparece depois de duas semanas.</div>;
  const W = 320, H = 116, L = 30, R = 12, T = 12, B = 22;
  const ys = data.map(d => d.y);
  let lo = min ?? Math.min(...ys), hi = max ?? Math.max(...ys);
  if (zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  if (hi - lo < 4) { const m = (hi + lo) / 2; lo = m - 2; hi = m + 2; }
  const pad = (hi - lo) * 0.08; lo -= min == null ? pad : 0; hi += max == null ? pad : 0;
  const X = (i: number) => L + (i / (data.length - 1)) * (W - L - R);
  const Y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [lo, (lo + hi) / 2, hi];
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(d.y).toFixed(1)}`).join('');
  const last = data.length - 1, h = hover ?? null;

  function move(e: PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    setHover(Math.max(0, Math.min(last, Math.round(((px - L) / (W - L - R)) * last))));
  }

  return (
    <figure className="chart" aria-labelledby={id}>
      <figcaption id={id} className="between"><b>{title}</b><span className="small muted">{fmt(data[last].y)} agora</span></figcaption>
      <div className="chart-box">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: de ${fmt(data[0].y)} para ${fmt(data[last].y)} em ${data.length} semanas`}
          onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)} style={{ touchAction: 'pan-y' }}>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke="var(--grid)" strokeWidth="1" />
              <text x={L - 6} y={Y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--muted)">{fmt(t)}</text>
            </g>
          ))}
          {zero && lo < 0 && hi > 0 && <line x1={L} x2={W - R} y1={Y(0)} y2={Y(0)} stroke="var(--axis)" strokeWidth="1" />}
          <text x={L} y={H - 6} fontSize="10" fill="var(--muted)">{xLabel(data[0].x)}</text>
          <text x={W - R} y={H - 6} fontSize="10" fill="var(--muted)" textAnchor="end">{xLabel(data[last].x)}</text>
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={X(last)} cy={Y(data[last].y)} r="4" fill="var(--accent)" stroke="var(--card)" strokeWidth="2" />
          {h != null && (
            <g>
              <line x1={X(h)} x2={X(h)} y1={T} y2={H - B} stroke="var(--axis)" strokeWidth="1" />
              <circle cx={X(h)} cy={Y(data[h].y)} r="4.5" fill="var(--accent)" stroke="var(--card)" strokeWidth="2" />
            </g>
          )}
        </svg>
        {h != null && (
          <div className="tooltip" style={{ left: `${(X(h) / W) * 100}%` }} role="status">
            <span className="muted">{xLabel(data[h].x)}</span> <b>{fmt(data[h].y)}</b>
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>{data.map(d => <tr key={d.x}><th scope="row">{xLabel(d.x)}</th><td>{fmt(d.y)}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

export interface StripRace { w: number; label: string; big?: boolean; entered: boolean; result?: string }

/** As 20 semanas da temporada, com as provas marcadas e a semana atual. */
export function SeasonStrip({ week, races }: { week: number; races: StripRace[] }) {
  return (
    <div className="strip" role="img" aria-label={`Semana ${week} de 20. Provas inscritas: ${races.filter(r => r.entered).map(r => `semana ${r.w}`).join(', ') || 'nenhuma'}`}>
      {Array.from({ length: 20 }, (_, i) => {
        const w = i + 1, r = races.find(x => x.w === w);
        const cls = ['cell', w < week ? 'past' : '', w === week ? 'now' : '', r?.entered ? 'race' : r ? 'race-off' : '', r?.big ? 'big' : ''].filter(Boolean).join(' ');
        return (
          <span key={w} className={cls} title={r ? `Semana ${w}: ${r.label}` : `Semana ${w}`}>
            {r?.big ? <Icon name="trophy" size={12} stroke={2.2} /> : r ? <i /> : null}
          </span>
        );
      })}
    </div>
  );
}

const COURSE_PATH: Record<Course, string> = {
  plano: 'M0 30 C80 30 100 28 160 28 S260 30 320 30',
  ondulado: 'M0 40 C30 40 40 30 60 30 S90 40 110 38 S150 24 170 26 S210 40 230 36 S270 28 290 32 S315 40 320 40',
  montanhoso: 'M0 44 L40 40 L70 14 L95 30 L120 22 L150 8 L180 34 L210 26 L240 12 L270 36 L300 38 L320 44'
};

/** Silhueta do percurso da bike: plano, ondulado ou montanhoso. */
export function CourseProfile({ course }: { course: Course }) {
  return (
    <svg className="course" viewBox="0 0 320 52" preserveAspectRatio="none" aria-hidden="true">
      <path d={`${COURSE_PATH[course]} L320 52 L0 52 Z`} fill="var(--bike)" fillOpacity="0.14" />
      <path d={COURSE_PATH[course]} fill="none" stroke="var(--bike)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const SPLIT_COLOR = ['var(--swim)', 'var(--muted)', 'var(--bike)', 'var(--muted)', 'var(--run)'];

/** Barra com a parte do tempo total em cada segmento; os nomes e tempos ficam por baixo. */
export function SplitBar({ parts }: { parts: [string, number][] }) {
  const total = parts.reduce((a, [, t]) => a + t, 0) || 1;
  return (
    <div className="splitbar" aria-hidden="true">
      {parts.map(([l, t], i) => <i key={l} style={{ flexGrow: t / total, background: SPLIT_COLOR[i] }} />)}
    </div>
  );
}
