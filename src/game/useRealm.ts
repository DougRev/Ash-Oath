import { useCallback, useEffect, useRef, useState } from 'react';
import { SAVE_KEY } from './data';
import { accrue, applyAction, newGame, validSave } from './engine';
import type { Action, GameState } from './types';
import { serverNow } from './clock';

function readRealm(): { game: GameState; warning: string } {
  try {
    const stored = localStorage.getItem(SAVE_KEY);
    if (stored) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(stored);
      } catch {
        parsed = null;
      }
      if (validSave(parsed)) return { game: accrue(parsed), warning: '' };
      localStorage.setItem(`${SAVE_KEY}.recovery`, stored);
      return {
        game: newGame(),
        warning: 'Your previous save could not be read. A recovery copy was kept on this device.',
      };
    }
    return { game: newGame(), warning: '' };
  } catch {
    return {
      game: newGame(),
      warning: 'Device storage is unavailable. This realm may not survive a reload.',
    };
  }
}
export function useRealm() {
  const [initial] = useState(readRealm);
  const [game, setGame] = useState(initial.game);
  const [warning, setWarning] = useState(initial.warning);
  const ref = useRef(game);
  const commit = useCallback((next: GameState) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    } catch {
      setWarning(
        'Your realm is running, but device storage is full or unavailable. Export your save from Settings.',
      );
    }
    ref.current = next;
    setGame(next);
  }, []);
  const act = useCallback(
    (action: Action) => {
      const next = applyAction(ref.current, action);
      commit(next);
      return next;
    },
    [commit],
  );
  useEffect(() => {
    commit(ref.current);
    const tick = () => {
      const next = accrue(ref.current);
      if (next !== ref.current) commit(next);
    };
    const timer = window.setInterval(tick, 1000);
    const sync = (e: StorageEvent) => {
      if (e.key !== SAVE_KEY || !e.newValue) return;
      try {
        const parsed: unknown = JSON.parse(e.newValue);
        if (validSave(parsed)) {
          ref.current = parsed;
          setGame(parsed);
        }
      } catch {
        /* Keep the current valid realm. */
      }
    };
    window.addEventListener('storage', sync);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', sync);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [commit]);
  return { game, act, warning, reset: () => commit(newGame()) };
}

export function useClock() {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const timer = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
