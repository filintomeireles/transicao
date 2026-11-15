// Efeitos: vibração ao toque, números a contar, confetes, tema claro/escuro.
import { useEffect, useRef, useState } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Vibração curta no telemóvel (Android e browsers que a suportam). Sem efeito noutros. */
export function buzz(ms: number | number[] = 12): void {
  try { navigator.vibrate?.(ms); } catch { /* sem vibração */ }
}

/** Número que conta até ao valor (para posições, dinheiro, notas). */
export function useCountUp(target: number, ms = 700): number {
  const [v, setV] = useState(reduced() ? target : 0);
  const from = useRef(reduced() ? target : 0);
  useEffect(() => {
    if (reduced()) { setV(target); return; }
    const start = performance.now(), a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms), e = 1 - Math.pow(1 - k, 3);
      setV(a + (target - a) * e);
      if (k < 1) raf = requestAnimationFrame(step); else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

const CONFETTI = ['var(--swim)', 'var(--bike)', 'var(--run)', 'var(--accent)', 'var(--gold)'];

/** Confetes para pódios e vitórias no escalão. Escondidos com movimento reduzido. */
export function Confetti({ n = 36 }: { n?: number }) {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{
          left: `${(i * 37) % 100}%`, background: CONFETTI[i % CONFETTI.length],
          animationDelay: `${(i % 9) * 0.08}s`, animationDuration: `${1.6 + (i % 5) * 0.25}s`,
          transform: `rotate(${(i * 47) % 360}deg)`
        }} />
      ))}
    </div>
  );
}

export type Theme = 'auto' | 'light' | 'dark';
const THEME_KEY = 'transicao-theme';

export function loadTheme(): Theme {
  try { const t = localStorage.getItem(THEME_KEY); return t === 'light' || t === 'dark' ? t : 'auto'; } catch { return 'auto'; }
}

export function applyTheme(t: Theme): void {
  const el = document.documentElement;
  if (t === 'auto') delete el.dataset.theme; else el.dataset.theme = t;
  try { if (t === 'auto') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, t); } catch { /* sem armazenamento */ }
}
