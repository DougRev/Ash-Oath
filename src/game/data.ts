import type { ArmorSetId, Building, EquipmentSlot, FactionId, Rarity, Tactic } from './types';

export const TICK_MS = 5 * 60 * 1000;
export const OFFLINE_CAP = 12 * 60 * 60 * 1000;
export const AP_CAP = 60;
export const BANK_DEPOSIT_FEE = 0.05;
export const SAVE_KEY = 'ash-and-oath.realm.v1';
export const SEASON_MS = 28 * 24 * 60 * 60 * 1000;
export const TIERS = [
  {
    name: 'Homestead',
    cost: 0,
    income: 30,
    capacity: 20,
    story: 'A small beginning',
    description: 'Four walls, a warm hearth, and a reason to fight.',
  },
  {
    name: 'Settlement',
    cost: 800,
    income: 65,
    capacity: 30,
    story: 'A place to belong',
    description: 'New roofs rise. Your neighbors look to you for hope.',
  },
  {
    name: 'Village',
    cost: 6000,
    income: 140,
    capacity: 45,
    story: 'Roots in the wild',
    description: 'A bell rings across the valley. This land has a name now.',
  },
  {
    name: 'Castle',
    cost: 22000,
    income: 290,
    capacity: 70,
    story: 'Stone, steel, and resolve',
    description: 'Your banners rise above walls built to endure.',
  },
  {
    name: 'Stronghold',
    cost: 65000,
    income: 600,
    capacity: 110,
    story: 'An oath made unbreakable',
    description: 'Armies rally beneath your standard. The realm takes notice.',
  },
  {
    name: 'Citadel',
    cost: 160000,
    income: 1200,
    capacity: 160,
    story: 'A legacy in the making',
    description: 'What began with a hearth has become a beacon.',
  },
];
export const FACTIONS: {
  id: FactionId;
  name: string;
  motto: string;
  description: string;
  bonus: string;
  color: string;
  score: number;
}[] = [
  {
    id: 'iron',
    name: 'Iron Covenant',
    motto: 'Together, unbroken.',
    description:
      'Heirs to the old kingdom. They believe peace is built with discipline, loyalty, and a very sharp sword.',
    bonus: '+5% army attack',
    color: '#ccad70',
    score: 3200,
  },
  {
    id: 'verdant',
    name: 'Verdant Pact',
    motto: 'From roots, we rise.',
    description:
      'Wardens, farmers, and wanderers united to protect a living world from the ambitions of kings.',
    bonus: '+5% tribute income',
    color: '#88af7e',
    score: 2800,
  },
  {
    id: 'ashen',
    name: 'Ashen Order',
    motto: 'Through fire, truth.',
    description:
      'Seekers of forgotten knowledge. Beneath the ruins, they hear a power that could end the war.',
    bonus: '+10% personal strength',
    color: '#bd7666',
    score: 2300,
  },
  {
    id: 'tide',
    name: 'Tidebound',
    motto: 'No crown owns the sea.',
    description:
      'An alliance of free cities. Patient in defense, relentless in purpose, answerable to no throne.',
    bonus: '+5% realm defense',
    color: '#79a2b9',
    score: 1700,
  },
];
export const BUILDINGS: {
  id: Building;
  name: string;
  cost: number;
  level: number;
  description: string;
  benefit: string;
}[] = [
  {
    id: 'armory',
    name: 'The Armory',
    cost: 300,
    level: 0,
    description: 'A gathering place for those willing to stand beside you.',
    benefit: 'Recruit and assign troops',
  },
  {
    id: 'bank',
    name: 'The Bank',
    cost: 1000,
    level: 1,
    description: 'Set aside your spoils for the future. Gold inside cannot be plundered.',
    benefit: 'Protected savings · 5% deposit fee · Free withdrawals',
  },
  {
    id: 'blacksmith',
    name: 'The Blacksmith',
    cost: 400,
    level: 1,
    description: 'The ring of a hammer. The difference between courage and victory.',
    benefit: 'Arm your soldiers · 50 gold each',
  },
  {
    id: 'trader',
    name: 'The Trading Post',
    cost: 250,
    level: 1,
    description: 'Every traveler brings a story. Some bring something better.',
    benefit: 'Buy chests and sell dungeon loot',
  },
  {
    id: 'watchtower',
    name: 'The Watchtower',
    cost: 350,
    level: 1,
    description: 'A light on the hill that watches while your people sleep.',
    benefit: '+30 realm defense',
  },
];
export interface DungeonDefinition {
  name: string;
  subtitle: string;
  description: string;
  region: string;
  enemy: number[];
  gold: number[];
  names: string[];
  rune: number;
  pet: number;
  color: string;
  media?: string;
  bossMedia?: string;
  lootSet?: ArmorSetId;
}

export const DUNGEONS: DungeonDefinition[] = [
  {
    name: 'Whispering Woods',
    subtitle: 'A forgotten path. An uneasy silence.',
    description:
      'Beyond the last lantern, the forest remembers a world before men. Something stirs beneath its roots.',
    region: 'THE BORDERLANDS',
    enemy: [55, 85, 120, 165, 220],
    gold: [180, 260, 380, 520, 850],
    names: [
      'The Forgotten Path',
      'Briar Hollow',
      'The Sunken Shrine',
      'Watcher’s Crossing',
      'The Thornbound Guardian',
    ],
    rune: 0.04,
    pet: 0.01,
    color: 'woods',
    media: 'dungeon',
    bossMedia: 'thornbound-boss',
    lootSet: 'briarwarden' as ArmorSetId,
  },
  {
    name: 'Hollowcrypt',
    subtitle: 'Some oaths outlive their keepers.',
    description:
      'Descend into the resting place of the first kings. Their sentinels still keep an oath no living soul remembers.',
    region: 'THE SUNDERED DEPTHS',
    enemy: [260, 340, 430, 530, 660],
    gold: [600, 780, 1000, 1350, 2100],
    names: [
      'The Silent Stair',
      'Hall of Echoes',
      'The Bone Archive',
      'The Kingless Court',
      'The Oathless King',
    ],
    rune: 0.08,
    pet: 0.02,
    color: 'crypt',
    media: 'crypt',
    bossMedia: 'oathless-boss',
    lootSet: 'oathbound' as ArmorSetId,
  },
  {
    name: 'Ember Citadel',
    subtitle: 'At the edge of the world, fire waits.',
    description:
      'An ancient citadel suspended above a sea of embers. Return with a legend, or become one of its ghosts.',
    region: 'THE ASHEN FRONTIER',
    enemy: [740, 900, 1100, 1350, 1700],
    gold: [1500, 1900, 2400, 3200, 4800],
    names: [
      'The Cinder Gate',
      'Furnace of Names',
      'Ashfall Bridge',
      'The Crimson Spire',
      'The Last Flame',
    ],
    rune: 0.14,
    pet: 0.04,
    color: 'ember',
    media: 'ember',
    bossMedia: 'flame-boss',
    lootSet: 'emberforged' as ArmorSetId,
  },
  {
    name: 'Frostmere Bastion',
    subtitle: 'Winter keeps what war forgets.',
    description:
      'A fortress entombed in blue ice. Its frozen sentries still answer a horn no living commander can hear.',
    region: 'THE FROZEN REACHES',
    enemy: [1900, 2250, 2700, 3250, 3900],
    gold: [5200, 6500, 8200, 10500, 16000],
    names: ['The White Road', 'Hall of Rime', 'The Broken Horn', 'Winterkeep', 'The Pale Castellan'],
    rune: 0.17,
    pet: 0.05,
    color: 'frost',
  },
  {
    name: 'Sunken Dominion',
    subtitle: 'The drowned still pay tribute.',
    description:
      'Below the black tide lies a court of coral and chained bells, ruled by a sovereign who refused the sea.',
    region: 'THE DROWNED COAST',
    enemy: [4300, 5200, 6300, 7600, 9200],
    gold: [17500, 22000, 28000, 36000, 54000],
    names: ['The Low-Tide Gate', 'Drowned Gallery', 'Bellfoundry', 'Coral Throne', 'The Saltbound Queen'],
    rune: 0.2,
    pet: 0.06,
    color: 'sunken',
  },
  {
    name: 'Starfall Sanctum',
    subtitle: 'A wound in heaven burns below.',
    description:
      'A shattered observatory surrounds the star that ended an age. Every step inward bends steel, memory, and time.',
    region: 'THE CELESTIAL RUINS',
    enemy: [10200, 12400, 15100, 18400, 22500],
    gold: [60000, 76000, 96000, 122000, 185000],
    names: ['The Fallen Lens', 'Orbiting Halls', 'The Glass Meridian', 'Astral Vault', 'The Star-Eater'],
    rune: 0.24,
    pet: 0.08,
    color: 'starfall',
  },
];

export const ARMOR_SLOTS: Exclude<EquipmentSlot, 'weapon'>[] = [
  'helm',
  'chest',
  'greaves',
  'boots',
  'shield',
];

export const ARMOR_SETS: {
  id: ArmorSetId;
  name: string;
  dungeon: number;
  pieces: Record<Exclude<EquipmentSlot, 'weapon'>, string>;
  bonuses: { pieces: 2 | 3 | 5; text: string }[];
}[] = [
  {
    id: 'briarwarden',
    name: 'Briarwarden Regalia',
    dungeon: 0,
    pieces: {
      helm: 'Crown of Living Thorns',
      chest: 'Briarwarden Cuirass',
      greaves: 'Rootbound Greaves',
      boots: 'Pathfinder Sabatons',
      shield: 'Bulwark of the Elder Grove',
    },
    bonuses: [
      { pieces: 2, text: '+5% hero defense' },
      { pieces: 3, text: '+5% realm defense' },
      { pieces: 5, text: '+8% personal expedition strength' },
    ],
  },
  {
    id: 'oathbound',
    name: 'Oathbound Panoply',
    dungeon: 1,
    pieces: {
      helm: 'Visage of the First Oath',
      chest: 'Oathbound Plate',
      greaves: 'Kingless Greaves',
      boots: 'Silent March Sabatons',
      shield: 'Shield of the Empty Throne',
    },
    bonuses: [
      { pieces: 2, text: '+5% hero attack' },
      { pieces: 3, text: '+5% army attack' },
      { pieces: 5, text: '+10% personal expedition strength' },
    ],
  },
  {
    id: 'emberforged',
    name: 'Emberforged Harness',
    dungeon: 2,
    pieces: {
      helm: 'Cindercrest Helm',
      chest: 'Emberforged Carapace',
      greaves: 'Ashwalker Greaves',
      boots: 'Sabatons of the Last Flame',
      shield: 'Dawnfire Aegis',
    },
    bonuses: [
      { pieces: 2, text: '+6% hero attack' },
      { pieces: 3, text: '+7% army attack' },
      { pieces: 5, text: '+12% personal expedition strength' },
    ],
  },
];

export const ARMOR_SET_MEDIA: Partial<
  Record<ArmorSetId, Partial<Record<Exclude<EquipmentSlot, 'weapon'>, string>>>
> = {
  briarwarden: {
    helm: '/art/gear/briarwarden-helm.webp',
    chest: '/art/gear/briarwarden-chest.webp',
    greaves: '/art/gear/briarwarden-greaves.webp',
    boots: '/art/gear/briarwarden-boots.webp',
    shield: '/art/gear/briarwarden-shield.webp',
  },
};
export const TACTICS: { id: Tactic; name: string; multiplier: number; description: string }[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    multiplier: 1,
    description: 'Full strength · standard dungeon losses · counters Fortified enemies',
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    multiplier: 1.15,
    description: '+15% strength · 70% more dungeon losses · counters Channeling enemies',
  },
  {
    id: 'guarded',
    name: 'Guarded',
    multiplier: 0.9,
    description: '−10% strength · 50% fewer dungeon losses · counters Charging enemies',
  },
];
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const CHESTS = [
  {
    name: 'Wayfarer’s Chest',
    cost: 250,
    text: 'Small treasures from the roads less traveled.',
    odds: [0.55, 0.3, 0.12, 0.025, 0.005],
  },
  {
    name: 'Warlord’s Chest',
    cost: 800,
    text: 'Spoils worthy of a growing legend.',
    odds: [0.1, 0.38, 0.4, 0.1, 0.02],
  },
  {
    name: 'Sovereign’s Chest',
    cost: 2400,
    text: 'Relics that kingdoms have fallen for.',
    odds: [0, 0.1, 0.5, 0.32, 0.08],
  },
];
export const OPPONENTS = [
  {
    id: 'rook',
    name: 'Rook of the Hollow',
    realm: 'Hollowbrook',
    faction: 'ashen' as FactionId,
    defense: 65,
    gold: 620,
    title: 'Homestead · 8 defenders',
  },
  {
    id: 'elowen',
    name: 'Lady Elowen',
    realm: 'Willow’s Rest',
    faction: 'verdant' as FactionId,
    defense: 115,
    gold: 1100,
    title: 'Settlement · 12 defenders',
  },
  {
    id: 'cairn',
    name: 'Cairn Ironhand',
    realm: 'The Northern Watch',
    faction: 'iron' as FactionId,
    defense: 195,
    gold: 1750,
    title: 'Village · 18 defenders',
  },
  {
    id: 'maren',
    name: 'Maren of the Tides',
    realm: 'Saltwind Keep',
    faction: 'tide' as FactionId,
    defense: 320,
    gold: 2600,
    title: 'Castle · 26 defenders',
  },
];

export const UNIT_WEAPONS = [
  {
    id: 'militia',
    name: 'Militia blades',
    level: 0,
    bonus: 8,
    cost: 0,
    unitCost: 50,
    description: 'Reliable starting steel.',
  },
  {
    id: 'spear',
    name: 'Sentinel spears',
    level: 1,
    bonus: 11,
    cost: 300,
    unitCost: 70,
    description: 'Disciplined ranks. Up to +10% dungeon strength against charging enemies.',
  },
  {
    id: 'longbow',
    name: 'Ranger longbows',
    level: 2,
    bonus: 14,
    cost: 900,
    unitCost: 100,
    description: 'Ranged volleys. Up to +10% dungeon strength against channeling enemies.',
  },
  {
    id: 'halberd',
    name: 'Royal halberds',
    level: 3,
    bonus: 18,
    cost: 2200,
    unitCost: 150,
    description: 'Heavy armor breakers. Up to +10% dungeon strength against fortified enemies.',
  },
] as const;
export const ENEMY_STYLES = [
  {
    name: 'Charging',
    counter: 'guarded',
    weapon: 'spear',
    description: 'Brace with Guarded to blunt the charge.',
  },
  {
    name: 'Channeling',
    counter: 'aggressive',
    weapon: 'longbow',
    description: 'Strike Aggressively before its ritual completes.',
  },
  {
    name: 'Fortified',
    counter: 'balanced',
    weapon: 'halberd',
    description: 'A Balanced advance finds gaps in its defenses.',
  },
] as const;
export const enemyStyle = (dungeon: number, stage: number) =>
  ENEMY_STYLES[(dungeon + stage - 1) % 3];
