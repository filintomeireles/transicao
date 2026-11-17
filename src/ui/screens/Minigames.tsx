import { useEffect, useRef, useState } from 'react';
import { buzz } from '../fx';
import { Icon } from '../icons';

/** Sprint final: toques num botão durante 4 segundos contra o adversário. */
export function SprintGame({ opponent, behind, onDone }: { opponent: string; behind: boolean; onDone: (won: boolean | null) => void }) {
  const target = behind ? 22 : 18; // se ele vai à frente, é preciso mais
  const [taps, setTaps] = useState(0);
  const [left, setLeft] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const tapsRef = useRef(0);

  useEffect(() => {
    if (left == null || won != null) return;
    if (left <= 0) { setWon(tapsRef.current >= target); return; }
    const id = setTimeout(() => setLeft(l => (l ?? 0) - 0.1), 100);
    return () => clearTimeout(id);
  }, [left, won, target]);

  useEffect(() => {
    if (won == null) return;
    const id = setTimeout(() => onDone(won), 1300);
    return () => clearTimeout(id);
  }, [won, onDone]);

  function tap() {
    if (won != null) return;
    if (left == null) setLeft(4);
    tapsRef.current += 1;
    buzz(5);
    setTaps(tapsRef.current);
  }

  return (
    <div className="card acc game" aria-live="polite">
      <h2><Icon name="flag" size={18} />Sprint final contra {opponent}!</h2>
      <span className="small">{behind ? `${opponent} vai mesmo à tua frente.` : `${opponent} vem colado atrás de ti.`} Toca no botão o mais rápido que conseguires durante 4 segundos.</span>
      <div className="track" aria-hidden="true"><i style={{ width: `${Math.min(100, (taps / target) * 100)}%` }} /></div>
      <button className="btn primary sprint" onClick={tap} disabled={won != null}>
        {won == null ? (left == null ? 'Sprint!' : `${taps} · ${Math.max(0, left).toFixed(1)} s`) : won ? 'Ganhaste o sprint!' : 'Perdeste o sprint.'}
      </button>
      {left == null && won == null && <button className="btn sm ghost" onClick={() => onDone(null)}>Saltar</button>}
    </div>
  );
}
