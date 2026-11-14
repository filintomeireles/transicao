import type { ReactNode } from 'react';
import { eur, form, weekInSeason, type GameState } from '../engine';

export function Track({ value, color }: { value: number; color?: string }) {
  const w = Math.max(0, Math.min(100, value));
  return <div className="track"><i style={{ width: `${w}%`, background: color }} /></div>;
}

export function StatusBar({ game }: { game: GameState }) {
  const f = form(game);
  return (
    <div className="bar">
      <div className="bar-in">
        <div className="bar-top">
          <b>Semana {weekInSeason(game)} de 20</b>
          <span className="mono" style={{ color: game.money < 0 ? 'var(--bad)' : undefined }}>{eur(game.money)}</span>
        </div>
        <div className="meters">
          <div className="meter">
            <span>Fadiga <b>{Math.round(game.fatigue)}</b></span>
            <Track value={game.fatigue} color={game.fatigue > 70 ? 'var(--bad)' : game.fatigue > 50 ? 'var(--warn)' : undefined} />
          </div>
          <div className="meter">
            <span>Forma <b>{f >= 0 ? '+' : ''}{Math.round(f)}</b></span>
            <Track value={50 + f * 1.6} color={f < -5 ? 'var(--bad)' : undefined} />
          </div>
          <div className="meter">
            <span>Moral <b>{Math.round(game.moral)}</b></span>
            <Track value={game.moral} />
          </div>
        </div>
      </div>
    </div>
  );
}

export type Tab = 'semana' | 'atleta' | 'clube' | 'loja' | 'carreira';
const TABS: [Tab, string][] = [['semana', 'Semana'], ['atleta', 'Atleta'], ['clube', 'Clube'], ['loja', 'Loja'], ['carreira', 'Carreira']];

export function Tabs({ tab, onTab, unread }: { tab: Tab; onTab: (t: Tab) => void; unread: number }) {
  return (
    <nav className="tabs" aria-label="Secções">
      <div className="in">
        {TABS.map(([k, l]) => (
          <button key={k} aria-current={tab === k ? 'page' : undefined} onClick={() => onTab(k)}>
            {l}{k === 'semana' && unread > 0 && <span className="dot">{unread}</span>}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function Flash({ text }: { text: string }) {
  return text ? <div className="flash" role="status">{text}</div> : null;
}

export function Seg<T extends string | number>({ value, options, onChange, two }: { value: T; options: [T, ReactNode][]; onChange: (v: T) => void; two?: boolean }) {
  return (
    <div className={`seg${two ? ' two' : ''}`} role="group">
      {options.map(([v, l]) => (
        <button key={String(v)} aria-pressed={v === value} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}
