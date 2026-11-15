import { useEffect, useMemo, useRef, useState } from 'react';
import { NEUTRAL_SCORE } from '../../engine';
import { buzz } from '../fx';
import { Icon } from '../icons';

/**
 * Transição: tocar nos passos pela ordem certa, depressa. Pontuação 0–1
 * (cerca de 2,5 s sem erros = 1; cada erro custa).
 */
export function TransitionGame({ which, wetsuit, onDone }: { which: 1 | 2; wetsuit: boolean; onDone: (score: number) => void }) {
  const steps = which === 1
    ? ['Óculos e touca', wetsuit ? 'Despir o fato' : 'Secar os pés', 'Apertar o capacete', 'Correr com a bike']
    : ['Pousar a bike', 'Tirar o capacete', 'Calçar as sapatilhas', 'Dorsal e a correr'];
  const order = useMemo(() => [0, 1, 2, 3].sort(() => Math.random() - 0.5), []);
  const [next, setNext] = useState(0);
  const [misses, setMisses] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const t0 = useRef(performance.now());

  useEffect(() => {
    if (score == null) return;
    const id = setTimeout(() => onDone(score), 1100);
    return () => clearTimeout(id);
  }, [score, onDone]);

  function tap(i: number) {
    if (score != null) return;
    if (i !== next) { setMisses(m => m + 1); setWrong(i); buzz([25, 30, 25]); return; }
    setWrong(null);
    buzz(8);
    if (next === 3) {
      const secs = (performance.now() - t0.current) / 1000;
      setScore(Math.max(0, Math.min(1, 1 - (secs - 2.5) / 6 - misses * 0.12)));
    }
    setNext(next + 1);
  }

  const verdict = score == null ? '' : score >= 0.75 ? 'Rapidíssima!' : score >= 0.45 ? 'Boa transição.' : 'Atrapalhaste-te um bocado.';
  return (
    <div className="card acc game" aria-live="polite">
      <h2><Icon name={which === 1 ? 'bike' : 'run'} size={18} />T{which}: {which === 1 ? 'sai da água e pega na bike' : 'pousa a bike e vai correr'}</h2>
      <span className="small">Toca nos passos pela ordem, o mais depressa que conseguires.</span>
      <ol className="steps small">
        {steps.map((st, i) => <li key={st} className={i < next ? 'done' : ''}>{st}</li>)}
      </ol>
      <div className="seg two">
        {order.map(i => (
          <button key={i} className={wrong === i ? 'shake' : ''} aria-pressed={i < next} disabled={score != null} onClick={() => tap(i)}>{steps[i]}</button>
        ))}
      </div>
      {verdict ? <b role="status" className="pop" style={{ fontSize: 17 }}>{verdict}</b> : <button className="btn sm ghost" onClick={() => onDone(NEUTRAL_SCORE)}>Saltar</button>}
    </div>
  );
}

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
