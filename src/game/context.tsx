import { createContext, useContext } from 'react';
import type { Action, GameState, Page } from './types';
import type { User } from 'firebase/auth';
import type { Campaign, PublicRealm } from './online';

export interface OnlineContext {
  user: User;
  enlisted: boolean;
  shieldUntil: number;
  opponents: PublicRealm[];
  campaign: Campaign | null;
}

export type ModalName =
  'faction' | 'battle' | 'chest' | 'settings' | 'help' | 'activity' | 'defense' | null;
export interface GameContextValue {
  game: GameState;
  page: Page;
  navigate: (page: Page) => void;
  act: (action: Action) => Promise<GameState | null>;
  busy: boolean;
  online?: OnlineContext;
  open: (modal: ModalName) => void;
  toast: (message: string, error?: boolean) => void;
}
export const GameContext = createContext<GameContextValue | null>(null);
export function useGame() {
  const value = useContext(GameContext);
  if (!value) throw new Error('Game provider missing.');
  return value;
}
