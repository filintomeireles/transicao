import { useEffect, useRef, type ReactNode } from 'react';
import { dateLabel, eur, form, level, season, weekInSeason, weekdayName, xpForLevel, type GameState } from '../engine';
import { Ring } from './charts';
import { buzz } from './fx';
import { Icon, type IconName } from './icons';

export function Track({ value, color, thin }: { value: number; color?: string; thin?: boolean }) {
  const w = Math.max(0, Math.min(100, value));
  return <div className={`track${thin ? ' thin' : ''}`}><i style={{ width: `${w}%`, background: color }} /></div>;
}

const fatColor = (f: number) => (f > 70 ? 'var(--bad)' : f > 50 ? 'var(--warn)' : 'var(--good)');
const fatWord = (f: number) => (f > 70 ? 'muito cansado' : f > 50 ? 'cansado' : f > 25 ? 'normal' : 'fresco');
const formWord = (f: number) => (f >= 8 ? 'em pico' : f >= 3 ? 'boa' : f > -5 ? 'neutra' : f > -12 ? 'em carga' : 'pesada');
const moralWord = (m: number) => (m >= 75 ? 'em alta' : m >= 45 ? 'estável' : 'em baixo');

/** Cabeçalho do jogo: dia real, semana da temporada, dinheiro, fama, os três medidores e o nível. */
export function StatusBar({ game }: { game: GameState }) {
  const f = form(game), wk = weekInSeason(game), lv = level(game.xp);
  const from = xpForLevel(lv), to = xpForLevel(lv + 1);
  return (
    <header className="hud">
      <div className="hud-in">
        <div className="hud-top">
          <div className="hud-week">
            <span className="hud-pill">T{season(game)} · S{wk}</span>
            <b>{weekdayName(game.today).slice(0, 3)} {dateLabel(game.today)}</b>
          </div>
          <div className="hud-right">
            <span className="hud-stat" title="Fama"><Icon name="star" size={15} /> {Math.round(game.fame)}</span>
            <span className={`hud-stat money${game.money < 0 ? ' neg' : ''}`}><Icon name="coin" size={15} /> {eur(game.money)}</span>
          </div>
        </div>
        <div className="meters" style={{ marginTop: 10 }}>
          <div className="meter">
            <Ring value={game.fatigue} color={fatColor(game.fatigue)} size={38}>{Math.round(game.fatigue)}</Ring>
            <span><b>Fadiga</b>{fatWord(game.fatigue)}</span>
          </div>
          <div className="meter">
            <Ring value={50 + f * 2.5} color={f < -8 ? 'var(--warn)' : 'var(--accent-hud)'} size={38}>{f >= 0 ? '+' : ''}{Math.round(f)}</Ring>
            <span><b>Forma</b>{formWord(f)}</span>
          </div>
          <div className="meter">
            <Ring value={game.moral} color={game.moral < 40 ? 'var(--warn)' : 'var(--gold)'} size={38}>{Math.round(game.moral)}</Ring>
            <span><b>Moral</b>{moralWord(game.moral)}</span>
          </div>
        </div>
        <div className="xpbar" title="Pontos de treino">
          <span className="lv">NV {lv}</span>
          <div className="track thin"><i style={{ width: `${((game.xp - from) / (to - from)) * 100}%` }} /></div>
          <span>{Math.round(game.xp - from)}/{to - from} pts{game.streak >= 2 ? ` · ${game.streak} dias seguidos` : ''}</span>
        </div>
      </div>
    </header>
  );
}

export type Tab = 'semana' | 'atleta' | 'clube' | 'loja' | 'carreira';
const TABS: [Tab, string, IconName][] = [['semana', 'Hoje', 'week'], ['atleta', 'Atleta', 'user'], ['clube', 'Clube', 'club'], ['loja', 'Loja', 'shop'], ['carreira', 'Carreira', 'trophy']];

export function Tabs({ tab, onTab, unread }: { tab: Tab; onTab: (t: Tab) => void; unread: number }) {
  return (
    <nav className="tabs" aria-label="Secções">
      <div className="in">
        {TABS.map(([k, l, ic]) => (
          <button key={k} aria-current={tab === k ? 'page' : undefined} onClick={() => { if (tab !== k) buzz(8); onTab(k); }}>
            <span className="tab-ic"><Icon name={ic} size={22} stroke={tab === k ? 2.2 : 1.8} />{k === 'semana' && unread > 0 && <span className="dot">{unread}</span>}</span>
            <span>{l}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export function Flash({ text, onClose }: { text: string; onClose?: () => void }) {
  if (!text) return null;
  return (
    <div className="flash" role="status">
      <Icon name="info" size={18} />
      <span>{text}</span>
      {onClose && <button className="icon-btn" aria-label="Fechar aviso" onClick={onClose}><Icon name="close" size={16} /></button>}
    </div>
  );
}

export function Seg<T extends string | number>({ value, options, onChange, two, label }: { value: T; options: [T, ReactNode][]; onChange: (v: T) => void; two?: boolean; label?: string }) {
  return (
    <div className={`seg${two ? ' two' : ''}`} role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={String(v)} aria-pressed={v === value} onClick={() => { if (v !== value) buzz(6); onChange(v); }}>{l}</button>
      ))}
    </div>
  );
}

/** Folha que sobe do fundo do ecrã (escolhas com mais informação do que um menu). */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    (panel.current?.querySelector<HTMLElement>('button[aria-pressed="true"]') ?? panel.current?.querySelector<HTMLElement>('button'))?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    document.addEventListener('keydown', key);
    document.body.classList.add('locked');
    return () => { document.removeEventListener('keydown', key); document.body.classList.remove('locked'); prev?.focus?.(); };
  }, []);
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={panel} onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="between"><h2>{title}</h2><button className="icon-btn" aria-label="Fechar" onClick={onClose}><Icon name="close" /></button></div>
        {children}
      </div>
    </div>
  );
}

const AVATAR_BG = ['#5B4BD1', '#2a78d6', '#0E8F6A', '#C2448F', '#B26B00', '#3D5A80'];
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
export const initials = (nm: string) => nm.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

/** Retrato provisório: iniciais sobre a cor do atleta, com o número da nota. A arte final substitui isto. */
export function Avatar({ name, size = 48, ring, badge }: { name: string; size?: number; ring?: string; badge?: ReactNode }) {
  const bg = AVATAR_BG[hash(name) % AVATAR_BG.length];
  return (
    <span className="avatar" style={{ width: size, height: size, background: bg, boxShadow: ring ? `0 0 0 3px var(--card), 0 0 0 5px ${ring}` : undefined, fontSize: size * 0.38 }} aria-hidden="true">
      {initials(name)}
      {badge != null && <span className="avatar-badge">{badge}</span>}
    </span>
  );
}

/** Emblema do clube: escudo com as iniciais. */
export function Crest({ name, size = 56 }: { name: string; size?: number }) {
  const bg = AVATAR_BG[hash(name) % AVATAR_BG.length];
  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 50 56" aria-hidden="true" className="crest">
      <path d="M25 2l21 6v17c0 14-9 23-21 29C13 48 4 39 4 25V8z" fill={bg} />
      <path d="M25 7l16 4.6V25c0 11-7 18.4-16 23.2C16 43.4 9 36 9 25V11.6z" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.5" />
      <text x="25" y="32" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" fontFamily="var(--display)">{initials(name)}</text>
    </svg>
  );
}

/** Título de secção com ícone. */
export function Title({ icon, children, right }: { icon?: IconName; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="title">
      <h2>{icon && <Icon name={icon} size={18} />}{children}</h2>
      {right}
    </div>
  );
}

/** Número grande com rótulo, para cartões de resumo. */
export function Stat({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon?: IconName }) {
  return (
    <div className="stat">
      <span className="stat-l">{icon && <Icon name={icon} size={14} />}{label}</span>
      <b className="stat-v">{value}</b>
      {sub && <span className="stat-s">{sub}</span>}
    </div>
  );
}
