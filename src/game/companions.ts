import type { GameState, Item } from './types';
export const PET_ABILITIES = ['ferocity', 'guardian', 'scavenger'] as const;
export const petXpFor = (level: number) => 100 * (level - 1) + 2 * (level - 1) * (level - 2);
export const MAX_PET_XP = petXpFor(500);
export function companionLevel(item: Item) {
  let level = 1;
  while (level < 500 && (item.xp ?? 0) >= petXpFor(level + 1)) level++;
  return level;
}
export const companionBonus = (item: Item) =>
  Math.round((item.power + (item.quality ?? 0) / 100 + (companionLevel(item) - 1) * 0.02) * 100) /
  100;
export const abilityBonus = (item: Item) =>
  (1 + (item.abilityRoll ?? 0) / 100 + (companionLevel(item) - 1) * 0.004) / 100;
export function petAbility(g: GameState, ability: (typeof PET_ABILITIES)[number], now: number) {
  const pet = g.inventory.find(
    (i) => i.kind === 'pet' && g.equipped.includes(i.id) && (i.injuredUntil ?? 0) <= now,
  );
  return pet && (pet.ability ?? 'guardian') === ability ? abilityBonus(pet) : 0;
}
export function trainCompanion(g: GameState, won: boolean, boss: boolean, now: number) {
  const pet = g.inventory.find(
    (i) => i.kind === 'pet' && g.equipped.includes(i.id) && (i.injuredUntil ?? 0) <= now,
  );
  if (!pet) return;
  pet.xp = Math.min(MAX_PET_XP, (pet.xp ?? 0) + (won ? (boss ? 40 : 20) : 5));
  if (!won) pet.injuredUntil = now + 30 * 60000;
}
export const petPortrait = (item: Item) =>
  `/art/companion-${['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(item.rarity)}.webp`;
