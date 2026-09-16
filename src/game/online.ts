import type { GameState, FactionId } from './types';

export const DATABASE_ID = '(default)';
export const CAMPAIGN_ID = 'founders';
export const CAMPAIGN_START = Date.UTC(2026, 8, 11);
export const CAMPAIGN_END = CAMPAIGN_START + 28 * 86400000;
export const PVP_COOLDOWN = 10 * 60000;
export const PVP_SHIELD = 60 * 60000;
export const INVENTORY_CAP = 200;
export interface RealmDocument {
  suspended?: boolean;
  game: GameState;
  revision: number;
  enlisted: boolean;
  shieldUntil: number;
  lastActionAt: number;
}
export interface PublicRealm {
  power?: number;
  id: string;
  name: string;
  faction: FactionId | null;
  level: number;
  defense: number;
  plunder: number;
  enlisted: boolean;
  shieldUntil: number;
  renown: number;
}
export interface Campaign {
  name: string;
  startsAt: number;
  endsAt: number;
  scores: Record<FactionId, number>;
}
export interface RealmResponse {
  realm: RealmDocument;
  serverTime: number;
}
