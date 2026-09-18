import type { GameState } from './types';
import { CAMPAIGN_START } from './online';
import { SEASON_MS } from './data';

export const seasonKey = (now: number) =>
  Math.max(0, Math.floor((now - CAMPAIGN_START) / SEASON_MS));
export const barracksLevel = (g: GameState) => g.barracksLevel ?? 0;
export const barracksCost = (g: GameState) => 800 * 2 ** barracksLevel(g);
export const barracksCapacity = (g: GameState, base: number) =>
  base * 2 ** barracksLevel(g);
export const MAX_BARRACKS = 6;
export const bankLevel = (g: GameState) => (g.buildings.bank ? (g.bankLevel ?? 1) : 0);
export const bankCapacity = (g: GameState) => (bankLevel(g) ? 5000 * 2 ** (bankLevel(g) - 1) : 0);
export const bankRate = (g: GameState) => bankLevel(g) * 0.00001;
export const bankUpgradeCost = (g: GameState) => 2000 * 2 ** Math.max(0, bankLevel(g) - 1);
export const MAX_BANK = 8;
export const MAX_COMBAT_UPGRADE = 8;
export const offenseLevel = (g: GameState) => g.offenseLevel ?? 0;
export const defenseLevel = (g: GameState) => g.defenseLevel ?? 0;
export const offenseBonus = (g: GameState) => offenseLevel(g) * 0.05;
export const defenseBonus = (g: GameState) => defenseLevel(g) * 0.05;
export const offenseUpgradeCost = (g: GameState) => 1500 * 2 ** offenseLevel(g);
export const defenseUpgradeCost = (g: GameState) => 1500 * 2 ** defenseLevel(g);
