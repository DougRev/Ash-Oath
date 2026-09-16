import { TIERS } from './data';
export const RIVAL_DAILY_WINS = 12;
export const RIVAL_COOLDOWN = 30 * 60 * 1000;
const names = [
  ['Bramble Camp', 'Copperhill Hold', 'Red Fox Outpost'],
  ['Morrowstead', 'Blackwater Crossing', 'Iron Crow Keep'],
  ['Saltwind Village', 'Grimwatch', 'The Wolf Court'],
  ['Ravenstone Castle', 'Stormglass Bastion', 'The Gilded Marshal'],
  ['Ashgate Stronghold', 'The Hollow Crown', 'Dreadspire'],
  ['Ivory Citadel', 'The Obsidian Throne', 'The Last Warlord'],
];
const defenses = [
  [36, 72, 120],
  [120, 210, 320],
  [260, 400, 600],
  [500, 750, 1100],
  [900, 1400, 2000],
  [1500, 2300, 3200],
];
const gold = [400, 800, 1400, 2200, 3400, 5000];
export const RIVALS = names.flatMap((row, level) =>
  row.map((name, rank) => ({
    id: `ai-${level}-${rank}`,
    name,
    level,
    rank,
    title: ['Frontier recruit', 'Seasoned commander', 'Veteran warlord'][rank],
    defense: defenses[level][rank],
    gold: Math.floor(gold[level] * [1, 1.5, 2.2][rank]),
    realm: TIERS[level].name,
  })),
);
