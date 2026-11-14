import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState } from '../engine';

const KEY = 'transicao-save-v3';

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as GameState) : null;
    return s && s.v === 3 ? s : null;
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

  const start = useCallback((s: GameState) => { ref.current = s; setGame(s); }, []);
  const reset = useCallback(() => { ref.current = null; setGame(null); }, []);

  return { game, apply, start, reset };
}
