import { useCallback, useEffect, useRef, useState } from 'react';
import { dayNumber, syncToday, type GameState } from '../engine';
import { demoGame } from './demo';

// Nova chave: a versão de corrida diária não lê as carreiras de triatlo semanais.
const KEY = 'transicao-save-v4';

/** Lê a carreira gravada e põe-na no dia de hoje (os dias em falta correm em piloto automático). */
function load(): GameState | null {
  if (import.meta.env.DEV) {
    const q = new URLSearchParams(location.search);
    if (q.has('demo')) return demoGame(q);
  }
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as GameState) : null;
    if (!s || s.v !== 4) return null;
    syncToday(s, dayNumber());
    return s;
  } catch {
    return null;
  }
}

export type Apply = <T>(fn: (s: GameState) => T) => T | undefined;

/**
 * Estado do jogo com gravação local. As ações do motor alteram uma cópia do estado
 * (as funções do motor são escritas para alterar o estado que recebem).
 */
export function useGame() {
  const [game, setGame] = useState<GameState | null>(load);
  const ref = useRef(game);
  ref.current = game;

  useEffect(() => {
    try {
      if (game) localStorage.setItem(KEY, JSON.stringify(game));
      else localStorage.removeItem(KEY);
    } catch {
      // armazenamento indisponível (janela privada): o jogo continua, só não fica gravado
    }
  }, [game]);

  const apply: Apply = useCallback(fn => {
    const prev = ref.current;
    if (!prev) return undefined;
    const next = structuredClone(prev);
    const out = fn(next);
    ref.current = next;
    setGame(next);
    return out;
  }, []);

  // Quem deixa a app aberta de um dia para o outro: ao voltar, o jogo passa para o dia novo.
  useEffect(() => {
    const check = () => {
      const s = ref.current;
      if (s && !document.hidden && s.today < dayNumber() + (s.skew ?? 0)) apply(x => syncToday(x, dayNumber()));
    };
    document.addEventListener('visibilitychange', check);
    const id = setInterval(check, 60_000);
    return () => { document.removeEventListener('visibilitychange', check); clearInterval(id); };
  }, [apply]);

  const start = useCallback((s: GameState) => { ref.current = s; setGame(s); }, []);
  const reset = useCallback(() => { ref.current = null; setGame(null); }, []);

  return { game, apply, start, reset };
}
