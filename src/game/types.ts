export type FactionId = 'iron' | 'verdant' | 'ashen' | 'tide';
export type Page = 'overview' | 'settlement' | 'army' | 'dungeons' | 'war' | 'trader';
export type Building = 'armory' | 'blacksmith' | 'trader' | 'watchtower' | 'bank';
export type Role = 'offense' | 'defense';
export type Tactic = 'balanced' | 'aggressive' | 'guarded';
export type UnitWeapon = 'militia' | 'spear' | 'longbow' | 'halberd';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemKind = 'weapon' | 'armor' | 'rune' | 'pet';
export type EquipmentSlot = 'weapon' | 'helm' | 'chest' | 'greaves' | 'boots' | 'shield';
export type ArmorSetId = 'briarwarden' | 'oathbound' | 'emberforged';
export interface Item {
  id: string;
  name: string;
  kind: ItemKind;
  rarity: Rarity;
  power: number;
  value: number;
  slot?: EquipmentSlot;
  set?: ArmorSetId;
  quality?: number;
  ability?: 'ferocity' | 'guardian' | 'scavenger';
  abilityRoll?: number;
  xp?: number;
  injuredUntil?: number;
}
export interface Expedition {
  troops?: number;
  dungeon: number;
  nextStage: number;
  gold: number;
  items: Item[];
  renown: number;
}
export interface Battle {
  gearLost?: { weapons: number; armor: number };
  dungeon?: number;
  boss?: boolean;
  deployed?: number;
  heroDamage?: number;
  armyDamage?: number;
  enemyDamage?: number;
  id: string;
  title: string;
  mode: 'army' | 'personal' | 'pvp';
  won: boolean;
  power: number;
  enemy: number;
  roll: number;
  finalPower: number;
  tactic: Tactic;
  gold: number;
  renown: number;
  casualties: number;
  items: Item[];
  lostItems: number;
  lines: string[];
  time: number;
}
export interface Activity {
  id: string;
  text: string;
  time: number;
  kind: 'gold' | 'battle' | 'build' | 'item' | 'oath';
}
export interface ArmyEquipment {
  equippedWeapons?: Partial<Record<UnitWeapon, number>>;
  weapons: Partial<Record<UnitWeapon, number>>;
  armorOwned: number;
  armorEquipped: number;
}
export interface DefenseReport {
  seq: number;
  attackerName: string;
  time: number;
  defended: boolean;
  goldLost: number;
  troopsLost: number;
  weaponsLost: number;
  armorLost: number;
  attackPower: number;
  defensePower: number;
  shieldUntil: number;
}
export interface GameState {
  defenseReports?: DefenseReport[];
  defenseReadSeq?: number;
  version: 1;
  seq: number;
  name: string;
  createdAt: number;
  lastTick: number;
  gold: number;
  ap: number;
  bankGold?: number;
  bankLevel?: number;
  bankInterestRemainder?: number;
  barracksLevel?: number;
  progressionVersion?: 2;
  offenseLevel?: number;
  defenseLevel?: number;
  factionChangedSeason?: number;
  rivalRaids?: { day: number; wins: number; last: Record<string, number> };
  level: number;
  faction: FactionId | null;
  troops: Record<Role, number>;
  arms: Record<Role, number>;
  armyEquipment?: Record<Role, ArmyEquipment>;
  unitWeapons?: Partial<Record<Role, UnitWeapon>>;
  discoveredRunes?: boolean;
  buildings: Record<Exclude<Building, 'bank'>, boolean> & { bank?: boolean };
  cleared: number[];
  inventory: Item[];
  equipped: string[];
  expedition: Expedition | null;
  renown: number;
  wins: number;
  chestsOpened: number;
  pity: number;
  donations: { day: number; amount: number };
  opponents: Record<string, { lastAttack: number; plundered: number }>;
  activity: Activity[];
  lastBattle: Battle | null;
  lastLoot: Item | null;
  tribute: { gold: number; ap: number; ticks: number } | null;
}
export type Action =
  | { type: 'readDefenseReports'; through: number }
  | { type: 'upgradeBarracks' }
  | { type: 'upgradeBank' }
  | { type: 'upgradeOffense' }
  | { type: 'upgradeDefense' }
  | { type: 'raidRival'; rival: string; tactic: Tactic }
  | { type: 'bank'; direction: 'deposit' | 'withdraw'; amount: number }
  | { type: 'enlist'; enabled: boolean }
  | { type: 'rename'; name: string }
  | { type: 'faction'; id: FactionId }
  | { type: 'upgrade' }
  | { type: 'build'; building: Building }
  | { type: 'recruit'; role: Role; count: number }
  | { type: 'assign'; from: Role; count: number }
  | { type: 'arm'; role: Role; count: number }
  | { type: 'weapon'; role: Role; weapon: UnitWeapon }
  | { type: 'healPet'; id: string }
  | { type: 'buyKit'; role: Role; kit: UnitWeapon | 'armor'; count: number; equip?: boolean }
  | { type: 'equipKit'; role: Role; kit: UnitWeapon | 'armor'; count: number }
  | {
      type: 'fight';
      mode: 'army' | 'personal';
      dungeon: number;
      stage: number;
      tactic: Tactic;
      troops?: number;
    }
  | { type: 'attack'; opponent: string; tactic: Tactic }
  | { type: 'extract' }
  | { type: 'equip'; id: string }
  | { type: 'unequip'; id: string }
  | { type: 'sell'; id: string }
  | { type: 'chest'; tier: number }
  | { type: 'donate'; amount: number }
  | { type: 'advance' };
