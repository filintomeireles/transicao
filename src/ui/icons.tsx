// Ícones desenhados à mão em SVG (24×24, traço). Herdam a cor do texto: `color` ou `currentColor`.
import type { SessionKey, Sport } from '../engine';

const P = {
  swim: <><circle cx="16.5" cy="5.5" r="2" /><path d="M5 12.5l4.5-4 3 2.5 3.5-3" /><path d="M2.5 16.5c2 0 2-1.4 4.4-1.4s2.4 1.4 4.6 1.4 2.4-1.4 4.6-1.4 2.4 1.4 4.4 1.4" /><path d="M2.5 20.5c2 0 2-1.4 4.4-1.4s2.4 1.4 4.6 1.4 2.4-1.4 4.6-1.4 2.4 1.4 4.4 1.4" /></>,
  bike: <><circle cx="5.5" cy="16" r="3.8" /><circle cx="18.5" cy="16" r="3.8" /><path d="M5.5 16l3.6-7h6.4l3 7M9.1 9l3.4 7h-7M12.5 16l3-7M13.5 5.5h3" /></>,
  run: <><circle cx="14.5" cy="4.5" r="2" /><path d="M7 21l3.2-5.8 3.3 2.3V21" /><path d="M5.5 11.5l3.2-3.4h4.4l2.2 3.6 3.2 1" /><path d="M10.2 15.2l2.2-6.6" /></>,
  str: <path d="M6.5 7v10M17.5 7v10M3.5 10v4M20.5 10v4M6.5 12h11" />,
  rest: <path d="M20 14.6A8.2 8.2 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6z" />,
  brick: <path d="M13 2.5L4.5 14H11l-1 7.5 8.5-11.5H12z" />,
  week: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.4-4 4.4-6 8-6s6.6 2 8 6" /></>,
  club: <><circle cx="9" cy="8" r="3.4" /><path d="M2.5 20c1-3.6 3.5-5.6 6.5-5.6s5.5 2 6.5 5.6" /><path d="M15.5 4.6a3.4 3.4 0 0 1 0 6.8M17.6 14.8c2 .8 3.3 2.6 3.9 5.2" /></>,
  shop: <><path d="M5 8h14l-1.2 13H6.2z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  trophy: <><path d="M8 3.5h8v5.5a4 4 0 0 1-8 0z" /><path d="M8 5.5H5a3 3 0 0 0 3 4.3M16 5.5h3a3 3 0 0 1-3 4.3M12 13v4M8 21h8M9.5 17h5" /></>,
  coin: <><circle cx="12" cy="12" r="8.6" /><path d="M15 9.2a3.3 3.3 0 1 0 0 5.6M8 11h5.5M8 13.2h5.5" /></>,
  battery: <><rect x="2.5" y="7" width="16" height="10" rx="2.2" /><path d="M21.5 10.5v3" /><path d="M6 10.5v3M9.5 10.5v3" /></>,
  heart: <path d="M12 20.5s-7.5-4.6-7.5-10.4A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.7c0 5.8-7.5 10.4-7.5 10.4z" />,
  trend: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  wind: <path d="M3 8.5h10.5A3 3 0 1 0 10.5 5.5M3 12.5h15a3 3 0 1 1-3 3M3 16.5h7" />,
  rain: <><path d="M7 15a4 4 0 0 1 .4-8A5.6 5.6 0 0 1 18 8.4a3.4 3.4 0 0 1-.4 6.6z" /><path d="M8.5 18l-1 3M12.5 18l-1 3M16.5 18l-1 3" /></>,
  thermo: <><path d="M10 14.5V4.5a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z" /><path d="M12 9.5V17" /></>,
  mountain: <path d="M2 20l7-11.5 4 6.2 3-4.2 6 9.5z" />,
  flag: <path d="M5.5 21V3.5M5.5 4h11l-2 4 2 4h-11" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7l8.5 6 8.5-6" /></>,
  star: <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.2 6.1-.8z" />,
  check: <path d="M4.5 12.5l5 5 10-11" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3.5h16V16" /></>,
  share: <><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="M8.2 10.8l7.6-4M8.2 13.2l7.6 4" /></>,
  timer: <><circle cx="12" cy="13.5" r="7.5" /><path d="M12 9.5v4l2.5 2M9.5 2.5h5" /></>,
  pin: <><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  info: <><circle cx="12" cy="12" r="8.6" /><path d="M12 11v5.5M12 7.6v.4" /></>,
  alert: <><path d="M12 3.5l9.5 16.5h-19z" /><path d="M12 10v4.5M12 17.2v.3" /></>,
  gift: <><rect x="3.5" y="8.5" width="17" height="4" rx="1" /><path d="M5 12.5v8h14v-8M12 8.5v12M12 8.5c-1.5-3.5-5.5-3.5-5.5-1S10 8.5 12 8.5zM12 8.5c1.5-3.5 5.5-3.5 5.5-1S14 8.5 12 8.5z" /></>,
  medal: <><circle cx="12" cy="15" r="5.5" /><path d="M8.5 10.7L5.5 3h4l2.5 5.5L14.5 3h4l-3 7.7" /><path d="M12 12.8v4.4" /></>,
  file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  coach: <><rect x="5" y="4" width="14" height="17" rx="2.2" /><path d="M9 3.5h6v3H9zM8.5 11.5h7M8.5 15.5h4.5" /></>,
  target: <><circle cx="12" cy="12" r="8.6" /><circle cx="12" cy="12" r="4.6" /><circle cx="12" cy="12" r="1" /></>,
  shirt: <path d="M8 3.5L3 6.5l2 4 3-1v11h8v-11l3 1 2-4-5-3a4 4 0 0 1-8 0z" />,
  shoe: <><path d="M3 16.5l1-7.5 4 1 2 3 6.2 1c3 .5 4.8 2 4.8 3.5H3z" /><path d="M3 19.5h18" /></>,
  chip: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9.5 2.5v3.5M14.5 2.5v3.5M9.5 18v3.5M14.5 18v3.5M2.5 9.5H6M2.5 14.5H6M18 9.5h3.5M18 14.5h3.5" /></>,
  drop: <path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3z" />,
  play: <path d="M7 4.5v15l12-7.5z" />,
  fast: <path d="M3 5.5v13l8.5-6.5zM12.5 5.5v13L21 12z" />,
  skip: <><path d="M5 5.5v13l10-6.5z" /><path d="M19 5.5v13" /></>,
  copy: <><rect x="8.5" y="8.5" width="12" height="12" rx="2" /><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" /></>,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />,
  moon: <path d="M20 14.6A8.2 8.2 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6z" />,
  wave: <path d="M2.5 12c2 0 2-2 4.7-2s2.7 2 4.8 2 2.7-2 4.8-2 2.7 2 4.7 2" />,
  euro: <path d="M17 6.5a6 6 0 1 0 0 11M5 10.5h8M5 13.5h8" />
} as const;

export type IconName = keyof typeof P;

export function Icon({ name, size = 20, stroke = 1.9, className, label }: { name: IconName; size?: number; stroke?: number; className?: string; label?: string }) {
  return (
    <svg className={`ic${className ? ' ' + className : ''}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {P[name]}
    </svg>
  );
}

/** Ícone de cada sessão de treino. */
export const SESSION_ICON: Record<SessionKey, IconName> = {
  rest: 'rest', swimTec: 'swim', swimEnd: 'swim', bikeZ2: 'bike', bikeInt: 'bike', runZ2: 'run', runInt: 'run', brick: 'brick', str: 'str'
};

export const SPORT_ICON: Record<Sport, IconName> = { swim: 'swim', bike: 'bike', run: 'run', gen: 'str' };

/** Ícone de cada categoria da loja. */
export const SHOP_ICON = (cat: string): IconName =>
  ({ Bike: 'bike', 'Natação': 'swim', Corrida: 'shoe', Tecnologia: 'chip', 'Serviços': 'coach' } as Record<string, IconName>)[cat] ?? 'shop';
