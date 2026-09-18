import { acceptableName } from './names';
import {
  bankCapacity,
  bankRate,
  bankLevel,
  bankUpgradeCost,
  MAX_BANK,
  barracksCapacity,
  barracksCost,
  barracksLevel,
  MAX_BARRACKS,
  defenseBonus,
  defenseLevel,
  defenseUpgradeCost,
  MAX_COMBAT_UPGRADE,
  offenseBonus,
  offenseLevel,
  offenseUpgradeCost,
  seasonKey,
} from './progression';
import {
  companionBonus,
  petAbility,
  trainCompanion,
  MAX_PET_XP,
  PET_ABILITIES,
} from './companions';
export { companionLevel } from './companions';
import {
  AP_CAP,
  ARMOR_SETS,
  ARMOR_SLOTS,
  BANK_DEPOSIT_FEE,
  BUILDINGS,
  CHESTS,
  DUNGEONS,
  FACTIONS,
  OFFLINE_CAP,
  OPPONENTS,
  RARITIES,
  TACTICS,
  TICK_MS,
  TIERS,
  UNIT_WEAPONS,
  enemyStyle,
} from './data';
import type {
  Action,
  Activity,
  ArmorSetId,
  Battle,
  EquipmentSlot,
  GameState,
  Item,
  ItemKind,
  Rarity,
  Tactic,
} from './types';

import { pvpLoot } from './pvpLoot';
import { RIVALS, RIVAL_COOLDOWN, RIVAL_DAILY_WINS } from './rivals';
export const format = (n: number) => Math.floor(n).toLocaleString('en-US');
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
function requireThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
const uid = (s: GameState) => `r${++s.seq}`;
function log(s: GameState, text: string, kind: Activity['kind'], time: number) {
  s.activity = [{ id: uid(s), text, kind, time }, ...s.activity].slice(0, 40);
}
function pay(s: GameState, amount: number) {
  requireThat(s.gold >= amount, `You need ${format(amount - s.gold)} more gold.`);
  s.gold -= amount;
}
function spendAP(s: GameState, amount: number) {
  requireThat(s.ap >= amount, `You need ${amount - s.ap} more AP. Recover 5 AP every 5 minutes.`);
  s.ap -= amount;
}
export function newGame(now = Date.now()): GameState {
  return {
    version: 1,
    seq: 3,
    name: 'The Wanderer',
    createdAt: now,
    lastTick: now,
    gold: 1800,
    ap: 36,
    progressionVersion: 2,
    level: 0,
    faction: null,
    troops: { offense: 6, defense: 4 },
    arms: { offense: 6, defense: 4 },
    buildings: { armory: false, blacksmith: false, trader: false, watchtower: false },
    cleared: DUNGEONS.map(() => 0),
    inventory: [
      {
        id: 'r1',
        name: 'Traveler’s Blade',
        kind: 'weapon',
        rarity: 'common',
        power: 14,
        value: 45,
        slot: 'weapon',
      },
      {
        id: 'r2',
        name: 'Weathered Leathers',
        kind: 'armor',
        rarity: 'common',
        power: 10,
        value: 35,
        slot: 'chest',
      },
    ],
    equipped: ['r1', 'r2'],
    expedition: null,
    renown: 0,
    wins: 0,
    chestsOpened: 0,
    pity: 0,
    donations: { day: Math.floor(now / 86400000), amount: 0 },
    opponents: {},
    lastBattle: null,
    lastLoot: null,
    tribute: null,
    activity: [
      {
        id: 'r3',
        text: 'You arrived at a quiet homestead on the edge of a world at war.',
        kind: 'oath',
        time: now,
      },
    ],
  };
}
export function equipmentFor(s: GameState, role: 'offense' | 'defense') {
  if (s.armyEquipment) return s.armyEquipment[role];
  const weapons: Partial<Record<import('./types').UnitWeapon, number>> = {
    [s.unitWeapons?.[role] ?? 'militia']: s.arms[role],
  };
  for (const w of UNIT_WEAPONS)
    if (s.activity.some((a) => a.text.includes(`Re-equipped the ${role} armory with ${w.name}`)))
      weapons[w.id] = s.arms[role];
  return { weapons, armorOwned: 0, armorEquipped: 0 };
}
export function assignedWeapons(s: GameState, role: 'offense' | 'defense', count = s.troops[role]) {
  const gear = equipmentFor(s, role);
  const assigned = gear.equippedWeapons ?? { [s.unitWeapons?.[role] ?? 'militia']: s.arms[role] };
  let remaining = count;
  const result: Partial<Record<import('./types').UnitWeapon, number>> = {};
  for (const w of [...UNIT_WEAPONS].reverse()) {
    const n = Math.min(remaining, assigned[w.id] ?? 0, gear.weapons[w.id] ?? 0);
    result[w.id] = n;
    remaining -= n;
  }
  return result;
}
const weaponStrength = (s: GameState, role: 'offense' | 'defense') => {
  const assigned = assignedWeapons(s, role);
  return UNIT_WEAPONS.reduce((sum, w) => sum + (assigned[w.id] ?? 0) * w.bonus, 0);
};
function migrateEquipment(s: GameState) {
  if (!s.armyEquipment)
    s.armyEquipment = { offense: equipmentFor(s, 'offense'), defense: equipmentFor(s, 'defense') };
  for (const role of ['offense', 'defense'] as const) {
    s.armyEquipment[role].equippedWeapons = assignedWeapons(s, role);
    trimEquipment(s, role);
  }
}
function trimEquipment(s: GameState, role: 'offense' | 'defense') {
  if (!s.armyEquipment) return;
  const gear = s.armyEquipment[role];
  gear.equippedWeapons = assignedWeapons(s, role);
  s.arms[role] = Object.values(gear.equippedWeapons).reduce((a, n) => a + n, 0);
  gear.armorEquipped = Math.min(gear.armorEquipped, s.troops[role]);
}
function assignWeapon(
  s: GameState,
  role: 'offense' | 'defense',
  kit: import('./types').UnitWeapon,
  count: number,
) {
  const gear = s.armyEquipment![role];
  const assigned = gear.equippedWeapons!;
  assigned[kit] = count;
  let overflow = Math.max(0, Object.values(assigned).reduce((a, n) => a + n, 0) - s.troops[role]);
  for (const w of UNIT_WEAPONS) {
    if (w.id === kit) continue;
    const removed = Math.min(overflow, assigned[w.id] ?? 0);
    assigned[w.id] = (assigned[w.id] ?? 0) - removed;
    overflow -= removed;
  }
  s.unitWeapons = { ...s.unitWeapons, [role]: kit };
  trimEquipment(s, role);
}
export function loseTroops(s: GameState, count: number, deployed = s.troops.offense) {
  migrateEquipment(s);
  const gear = s.armyEquipment!.offense;
  const party = assignedWeapons(s, 'offense', deployed);
  let armedLosses = Math.max(
    0,
    count - (deployed - Object.values(party).reduce((a, n) => a + n, 0)),
  );
  let weaponsLost = 0;
  for (const w of UNIT_WEAPONS) {
    const lost = Math.min(armedLosses, party[w.id] ?? 0);
    gear.equippedWeapons![w.id] = (gear.equippedWeapons![w.id] ?? 0) - lost;
    gear.weapons[w.id] = (gear.weapons[w.id] ?? 0) - lost;
    weaponsLost += lost;
    armedLosses -= lost;
  }
  s.troops.offense -= count;
  const armorLost = Math.max(0, count - (deployed - Math.min(deployed, gear.armorEquipped)));
  gear.armorEquipped -= armorLost;
  gear.armorOwned -= armorLost;
  trimEquipment(s, 'offense');
  return { weapons: weaponsLost, armor: armorLost };
}
export const weaponFor = (s: GameState, role: 'offense' | 'defense') =>
  UNIT_WEAPONS.find((w) => w.id === s.unitWeapons?.[role]) ?? UNIT_WEAPONS[0];
export const runeDiscovered = (s: GameState) =>
  !!s.discoveredRunes ||
  s.inventory.some((i) => i.kind === 'rune') ||
  !!s.expedition?.items.some((i) => i.kind === 'rune');

export const equipmentSlot = (item: Item): EquipmentSlot | undefined =>
  item.slot ?? (item.kind === 'weapon' ? 'weapon' : item.kind === 'armor' ? 'chest' : undefined);

export function armorSetProgress(s: GameState) {
  const worn = s.inventory.filter(
    (item) => item.kind === 'armor' && item.set && s.equipped.includes(item.id),
  );
  return ARMOR_SETS.map((set) => ({
    ...set,
    count: worn.filter((item) => item.set === set.id).length,
  }));
}

function armorSetEffects(s: GameState) {
  const counts = Object.fromEntries(
    armorSetProgress(s).map((set) => [set.id, set.count]),
  ) as Record<ArmorSetId, number>;
  return {
    heroAttack:
      (counts.oathbound >= 2 ? 0.05 : 0) + (counts.emberforged >= 2 ? 0.06 : 0),
    heroDefense: counts.briarwarden >= 2 ? 0.05 : 0,
    attack:
      (counts.oathbound >= 3 ? 0.05 : 0) + (counts.emberforged >= 3 ? 0.07 : 0),
    defense: counts.briarwarden >= 3 ? 0.05 : 0,
    personal:
      (counts.briarwarden >= 5 ? 0.08 : 0) +
      (counts.oathbound >= 5 ? 0.1 : 0) +
      (counts.emberforged >= 5 ? 0.12 : 0),
  };
}

function migrationNeeded(s: GameState) {
  return (
    s.progressionVersion !== 2 ||
    s.cleared.length !== DUNGEONS.length ||
    [...s.inventory, ...(s.expedition?.items ?? [])].some(
      (item) => (item.kind === 'weapon' || item.kind === 'armor') && !item.slot,
    )
  );
}

function migrateState(s: GameState) {
  if (s.progressionVersion !== 2) {
    const legacyLevel = s.barracksLevel ?? 0;
    const base = TIERS[s.level].capacity;
    const legacyCapacity = base + legacyLevel * 20;
    s.barracksLevel = Math.min(
      MAX_BARRACKS,
      Math.max(0, Math.ceil(Math.log2(legacyCapacity / base))),
    );
    s.progressionVersion = 2;
  }
  s.cleared = DUNGEONS.map((_, index) => s.cleared[index] ?? 0);
  const normalize = (item: Item) => {
    if (!item.slot && item.kind === 'weapon') item.slot = 'weapon';
    if (!item.slot && item.kind === 'armor') item.slot = 'chest';
  };
  s.inventory.forEach(normalize);
  s.expedition?.items.forEach(normalize);
  s.lastBattle?.items.forEach(normalize);
  if (s.lastLoot) normalize(s.lastLoot);
}

export function stats(s: GameState, now = Date.now()) {
  const equipped = s.inventory.filter((i) => s.equipped.includes(i.id));
  const sets = armorSetEffects(s);
  const runes = Math.min(
    0.3,
    equipped.filter((i) => i.kind === 'rune').reduce((a, i) => a + i.power / 100, 0),
  );
  const pet = equipped
    .filter((i) => i.kind === 'pet' && (i.injuredUntil ?? 0) <= now)
    .reduce((a, i) => a + companionBonus(i) / 100, 0);
  const attack = Math.floor(
    (s.troops.offense * 4 + weaponStrength(s, 'offense')) *
      (1 + runes + pet) *
      (1 + petAbility(s, 'ferocity', now)) *
      (s.faction === 'iron' ? 1.05 : 1) *
      (1 + offenseBonus(s) + sets.attack),
  );
  const defense = Math.floor(
    (s.troops.defense * 4 +
      weaponStrength(s, 'defense') +
      (s.buildings.watchtower ? 30 : 0) +
      Math.min(s.troops.defense, equipmentFor(s, 'defense').armorEquipped) * 4) *
      (1 + runes + pet) *
      (s.faction === 'tide' ? 1.05 : 1) *
      (1 + defenseBonus(s) + sets.defense),
  );
  const heroAttack = Math.floor(
    (20 + equipped.filter((i) => i.kind === 'weapon').reduce((a, i) => a + i.power, 0)) *
      (1 + sets.heroAttack),
  );
  const heroDefense = Math.floor(
    (10 + equipped.filter((i) => i.kind === 'armor').reduce((a, i) => a + i.power, 0)) *
      (1 + sets.heroDefense),
  );
  const personal = Math.floor(
    (attack * 0.65 + (heroAttack + heroDefense) * 2 * (1 + runes + pet)) *
      (s.faction === 'ashen' ? 1.1 : 1) *
      (1 + sets.personal),
  );
  return {
    attack,
    defense,
    heroAttack,
    heroDefense,
    personal,
    runes,
    pet,
    income: Math.floor(TIERS[s.level].income * (s.faction === 'verdant' ? 1.05 : 1)),
    capacity: barracksCapacity(s, TIERS[s.level].capacity),
  };
}
export function accrue(s: GameState, now = Date.now()): GameState {
  const base = migrationNeeded(s) ? structuredClone(s) : s;
  if (base !== s) migrateState(base);
  if (now <= base.lastTick || now - base.lastTick < TICK_MS) return base;
  const ticks = Math.min(Math.floor((now - base.lastTick) / TICK_MS), OFFLINE_CAP / TICK_MS);
  const gold = ticks * stats(base).income;
  const ap = Math.min(AP_CAP - base.ap, ticks * 5);
  let savings = base.bankGold ?? 0;
  let remainder = base.bankInterestRemainder ?? 0;
  for (let tick = 0; tick < ticks && savings < bankCapacity(base); tick++) {
    const interest = savings * bankRate(base) + remainder;
    const credited = Math.min(bankCapacity(base) - savings, Math.floor(interest));
    savings += credited;
    remainder = savings >= bankCapacity(base) ? 0 : interest - Math.floor(interest);
  }
  const next = {
    ...base,
    bankGold: savings,
    bankInterestRemainder: remainder,
    gold: base.gold + gold,
    ap: base.ap + ap,
    lastTick: now - ((now - base.lastTick) % TICK_MS),
    tribute: { gold, ap, ticks },
  };
  log(next, `Your people delivered ${format(gold)} gold and restored ${ap} AP.`, 'gold', now);
  return next;
}
export function powerFor(s: GameState, mode: 'army' | 'personal' | 'pvp', tactic: Tactic) {
  const st = stats(s);
  return Math.floor(
    (mode === 'personal' ? st.personal : st.attack) *
      TACTICS.find((t) => t.id === tactic)!.multiplier,
  );
}
export function dungeonForecast(
  s: GameState,
  mode: 'army' | 'personal',
  tactic: Tactic,
  dungeon: number,
  stage: number,
  troops: number,
  now = Date.now(),
) {
  const party = { ...s, troops: { ...s.troops, offense: troops } };
  const st = stats(party, now);
  const style = enemyStyle(dungeon, stage);
  const counter = tactic === style.counter;
  const weaponMatch =
    troops > 0 ? (assignedWeapons(s, 'offense', troops)[style.weapon] ?? 0) / troops : 0;
  const factor =
    TACTICS.find((t) => t.id === tactic)!.multiplier *
    (counter ? 1.2 : 1) *
    (1 + weaponMatch * 0.1);
  const power = Math.floor((mode === 'personal' ? st.personal : st.attack) * factor);
  const heroShare =
    mode === 'personal' && st.personal > 0
      ? Math.max(0, 1 - (st.attack * 0.65 * (s.faction === 'ashen' ? 1.1 : 1)) / st.personal)
      : 0;
  const lossFactor =
    (tactic === 'guarded' ? 0.5 : tactic === 'aggressive' ? 1.7 : 1) *
    (counter ? 0.75 : 1) *
    (1 - st.pet) *
    (1 - petAbility(s, 'guardian', now)) *
    (1 - (0.2 * Math.min(troops, equipmentFor(s, 'offense').armorEquipped)) / Math.max(1, troops));
  const rate = (stage === 5 ? 0.08 : 0.04) * lossFactor;
  return {
    power,
    heroShare,
    counter,
    weaponMatch,
    lossFactor,
    victoryLossBase: troops * rate,
    victoryLossMin: Math.min(troops, Math.max(1, Math.ceil(troops * rate * 0.5))),
    victoryLossMax: Math.min(troops, Math.max(1, Math.ceil(troops * rate))),
    defeatLosses: Math.min(troops, Math.max(1, Math.ceil(troops * 0.45 * lossFactor))),
  };
}

export function winChance(power: number, enemy: number) {
  return power <= 0 ? 0 : clamp((power * 1.15 - enemy) / (power * 0.3), 0, 1);
}
export function availableDungeon(s: GameState, d: number) {
  return d === 0 || s.cleared[d - 1] >= 5;
}
export function stageAvailable(s: GameState, d: number, stage: number) {
  return availableDungeon(s, d) && stage >= 1 && stage <= 5 && stage <= s.cleared[d] + 1;
}

function rollRarity(odds: number[], rng: () => number): Rarity {
  const roll = rng();
  let threshold = 0;
  for (let i = 0; i < odds.length; i++) {
    threshold += odds[i];
    if (roll < threshold) return RARITIES[i];
  }
  return 'legendary';
}
function makeItem(
  s: GameState,
  rarity: Rarity,
  rng: () => number,
  kind?: ItemKind,
  area = 0,
  setDrop = false,
): Item {
  const rank = RARITIES.indexOf(rarity);
  const actualKind = kind ?? (rng() < 0.5 ? 'weapon' : 'armor');
  const slot: EquipmentSlot | undefined =
    actualKind === 'weapon'
      ? 'weapon'
      : actualKind === 'armor'
        ? ARMOR_SLOTS[Math.min(ARMOR_SLOTS.length - 1, Math.floor(rng() * ARMOR_SLOTS.length))]
        : undefined;
  const armorSet =
    actualKind === 'armor' && setDrop && DUNGEONS[area].lootSet
      ? ARMOR_SETS.find((set) => set.id === DUNGEONS[area].lootSet)
      : undefined;
  const names = {
    weapon: ['Iron Longsword', 'Warden’s Edge', 'Moonsteel Saber', 'Oathkeeper', 'Dawnbringer'],
    armor: ['Scout’s', 'Briarhide', 'Sentinel’s', 'Fallen King’s', 'First King’s'],
    rune: [
      'Rune of Resolve',
      'Rune of Vigor',
      'Rune of Ascendance',
      'Rune of the Ancients',
      'Rune of Eternity',
    ],
    pet: ['Woodland Fox', 'Mossback Owl', 'Silverfang Wolf', 'Ember Drake', 'Dawn Phoenix'],
  };
  const power =
    actualKind === 'rune'
      ? [3, 4, 6, 9, 12][rank]
      : actualKind === 'pet'
        ? [2, 3, 4, 5, 6][rank]
        : Math.floor([16, 25, 42, 70, 115][rank] * (1 + area * 0.3) + rng() * 6);
  return {
    id: uid(s),
    name:
      armorSet && slot && slot !== 'weapon'
        ? armorSet.pieces[slot]
        : actualKind === 'armor' && slot
          ? `${names.armor[rank]} ${
              { helm: 'Helm', chest: 'Cuirass', greaves: 'Greaves', boots: 'Boots', shield: 'Shield' }[
                slot as Exclude<EquipmentSlot, 'weapon'>
              ]
            }`
          : names[actualKind][rank],
    kind: actualKind,
    rarity,
    power,
    value: [45, 80, 160, 380, 900][rank],
    ...(slot ? { slot } : {}),
    ...(armorSet ? { set: armorSet.id } : {}),
    ...(actualKind === 'pet'
      ? {
          xp: 0,
          quality: Math.floor(rng() * 201),
          ability: PET_ABILITIES[Math.min(2, Math.floor(rng() * 3))],
          abilityRoll: Math.floor(rng() * 201),
        }
      : {}),
  };
}
function dungeonLoot(s: GameState, dungeon: number, boss: boolean, rng: () => number) {
  const d = DUNGEONS[dungeon];
  const items: Item[] = [];
  if (boss || rng() < 0.65) {
    const odds =
      dungeon === 0
        ? [0.43, 0.36, 0.18, 0.028, 0.002]
        : dungeon === 1
          ? [0.1, 0.38, 0.42, 0.09, 0.01]
          : [0, 0.16, 0.54, 0.26, 0.04];
    let rarity = rollRarity(odds, rng);
    if (boss && RARITIES.indexOf(rarity) < 2) rarity = 'rare';
    items.push(makeItem(s, rarity, rng, undefined, dungeon, true));
  }
  if (rng() < d.rune)
    items.push(makeItem(s, dungeon >= 4 ? 'legendary' : dungeon >= 2 ? 'epic' : 'rare', rng, 'rune'));
  if (rng() < d.pet)
    items.push(
      makeItem(
        s,
        rollRarity(
          dungeon >= 4
            ? [0, 0.02, 0.18, 0.5, 0.3]
            : dungeon >= 2
            ? [0.05, 0.15, 0.4, 0.35, 0.05]
            : dungeon === 1
              ? [0.15, 0.3, 0.4, 0.14, 0.01]
              : [0.4, 0.35, 0.2, 0.045, 0.005],
          rng,
        ),
        rng,
        'pet',
        dungeon,
      ),
    );
  return items;
}
function casualties(s: GameState, tactic: Tactic) {
  const rate = tactic === 'aggressive' ? 0.2 : tactic === 'guarded' ? 0.05 : 0.1;
  const count = Math.min(Math.max(0, s.troops.offense - 1), Math.floor(s.troops.offense * rate));
  return { count, gear: loseTroops(s, count) };
}
function finishBattle(s: GameState, b: Battle, now: number) {
  s.lastBattle = b;
  if (b.won) s.wins++;
  log(
    s,
    `${b.won ? 'Victory' : 'Defeat'} at ${b.title}.${b.gold && b.won ? ` ${format(b.gold)} gold ${b.mode === 'personal' ? 'in your satchel' : 'secured'}.` : ''}`,
    'battle',
    now,
  );
}
export function applyAction(
  current: GameState,
  action: Action,
  now = Date.now(),
  rng: () => number = Math.random,
): GameState {
  const s = structuredClone(accrue(current, now));
  migrateEquipment(s);
  switch (action.type) {
    case 'rename': {
      requireThat(
        action.name.trim().length >= 3 &&
          action.name.trim().length <= 24 &&
          acceptableName(action.name),
        'Choose a name without profanity or abusive language.',
      );
      s.name = action.name.trim();
      break;
    }
    case 'upgradeBarracks': {
      requireThat(s.buildings.armory, 'Build the Armory first.');
      requireThat(barracksLevel(s) < MAX_BARRACKS, 'Barracks are fully upgraded.');
      pay(s, barracksCost(s));
      s.barracksLevel = barracksLevel(s) + 1;
      log(
        s,
        `Barracks level ${s.barracksLevel}: troop capacity doubled to ${format(stats(s).capacity)}.`,
        'build',
        now,
      );
      break;
    }
    case 'upgradeBank': {
      requireThat(
        bankLevel(s) > 0 && bankLevel(s) < MAX_BANK,
        'Build the Bank, or its maximum level has been reached.',
      );
      pay(s, bankUpgradeCost(s));
      s.bankLevel = bankLevel(s) + 1;
      log(s, `Bank upgraded to level ${s.bankLevel}.`, 'build', now);
      break;
    }
    case 'upgradeOffense': {
      requireThat(s.buildings.armory, 'Build the Armory first.');
      requireThat(offenseLevel(s) < MAX_COMBAT_UPGRADE, 'War Doctrine is fully upgraded.');
      pay(s, offenseUpgradeCost(s));
      s.offenseLevel = offenseLevel(s) + 1;
      log(s, `War Doctrine level ${s.offenseLevel}: +${s.offenseLevel * 5}% army attack.`, 'build', now);
      break;
    }
    case 'upgradeDefense': {
      requireThat(s.buildings.watchtower, 'Build the Watchtower first.');
      requireThat(defenseLevel(s) < MAX_COMBAT_UPGRADE, 'Fortifications are fully upgraded.');
      pay(s, defenseUpgradeCost(s));
      s.defenseLevel = defenseLevel(s) + 1;
      log(s, `Fortifications level ${s.defenseLevel}: +${s.defenseLevel * 5}% realm defense.`, 'build', now);
      break;
    }

    case 'bank': {
      requireThat(s.buildings.bank, 'Build the Bank before moving gold.');
      requireThat(
        action.direction === 'deposit' || action.direction === 'withdraw',
        'Invalid bank order.',
      );
      requireThat(
        Number.isSafeInteger(action.amount) && action.amount > 0 && action.amount <= 1_000_000_000,
        'Enter a whole gold amount between 1 and 1,000,000,000.',
      );
      const savings = s.bankGold ?? 0;
      if (action.direction === 'deposit') {
        const fee = Math.ceil(action.amount * BANK_DEPOSIT_FEE);
        requireThat(action.amount > fee, 'Deposit at least 2 gold.');
        requireThat(
          Number.isSafeInteger(savings + action.amount - fee) &&
            savings + action.amount - fee <= bankCapacity(s),
          'Your bank is full. Upgrade it for more capacity.',
        );
        pay(s, action.amount);
        s.bankGold = savings + action.amount - fee;
        log(s, `Banked ${action.amount - fee} gold; ${fee} gold deposit fee.`, 'gold', now);
      } else {
        requireThat(savings >= action.amount, 'Not enough gold in the bank.');
        requireThat(Number.isSafeInteger(s.gold + action.amount), 'Your treasury is full.');
        s.bankGold = savings - action.amount;
        s.gold += action.amount;
        log(s, `Withdrew ${action.amount} gold to your exposed treasury.`, 'gold', now);
      }
      break;
    }
    case 'faction': {
      requireThat(!s.expedition, 'Extract before changing faction.');
      requireThat(s.faction !== action.id, 'You already serve this faction.');
      requireThat(
        !s.faction || s.factionChangedSeason !== seasonKey(now),
        'You can change faction once per season.',
      );
      if (s.faction) s.factionChangedSeason = seasonKey(now);
      const f = FACTIONS.find((f) => f.id === action.id);
      requireThat(f, 'Unknown faction.');
      s.faction = action.id;
      log(s, `You swore your oath to the ${f.name}. ${f.motto}`, 'oath', now);
      break;
    }
    case 'readDefenseReports': {
      requireThat(
        (s.defenseReports ?? []).some((r) => r.seq === action.through),
        'That defense report is no longer available.',
      );
      s.defenseReadSeq = Math.max(s.defenseReadSeq ?? 0, action.through);
      break;
    }
    case 'upgrade': {
      const next = TIERS[s.level + 1];
      requireThat(next, 'Your realm has reached its highest tier.');
      pay(s, next.cost);
      s.level++;
      log(s, `Your home has grown into a ${next.name.toLowerCase()}.`, 'build', now);
      break;
    }
    case 'build': {
      const b = BUILDINGS.find((b) => b.id === action.building);
      requireThat(b, 'Unknown building.');
      requireThat(!s.buildings[b.id], 'This building is already standing.');
      requireThat(s.level >= b.level, `Reach ${TIERS[b.level].name} to build this.`);
      pay(s, b.cost);
      s.buildings[b.id] = true;
      log(s, `${b.name} is ready. ${b.benefit}.`, 'build', now);
      break;
    }
    case 'recruit': {
      requireThat(s.buildings.armory, 'Build the Armory to recruit troops.');
      requireThat(
        Number.isInteger(action.count) && action.count > 0 && action.count <= 1000,
        'Choose a valid recruit count.',
      );
      requireThat(
        s.troops.offense + s.troops.defense + action.count <= stats(s).capacity,
        'Your realm is full. Upgrade the barracks or expand your settlement to house more troops.',
      );
      pay(s, action.count * 60);
      s.troops[action.role] += action.count;
      log(
        s,
        `Recruited ${action.count} ${action.role === 'offense' ? 'attacking' : 'defending'} militia. Visit the Blacksmith to arm them.`,
        'build',
        now,
      );
      break;
    }
    case 'assign': {
      requireThat(s.buildings.armory, 'Build the Armory to reassign troops.');
      requireThat(!s.expedition, 'Extract from your expedition before reassigning troops.');
      requireThat(
        Number.isInteger(action.count) && action.count > 0 && s.troops[action.from] >= action.count,
        'Not enough troops to reassign.',
      );
      const to = action.from === 'offense' ? 'defense' : 'offense';
      s.troops[action.from] -= action.count;
      s.troops[to] += action.count;
      trimEquipment(s, action.from);
      log(
        s,
        `Reassigned ${action.count} militia to ${to}. Equipment stays in its original armory.`,
        'build',
        now,
      );
      break;
    }
    case 'arm': {
      requireThat(s.buildings.blacksmith, 'Build the Blacksmith to purchase unit equipment.');
      requireThat(
        Number.isInteger(action.count) && action.count > 0,
        'Choose a valid equipment count.',
      );
      requireThat(
        s.arms[action.role] + action.count <= s.troops[action.role],
        'Every soldier in this role is already equipped.',
      );
      requireThat(
        !s.expedition || action.role === 'defense',
        'Extract before changing expedition equipment.',
      );
      pay(s, action.count * weaponFor(s, action.role).unitCost);

      const stock = s.armyEquipment![action.role].weapons;
      stock[weaponFor(s, action.role).id] =
        (stock[weaponFor(s, action.role).id] ?? 0) + action.count;
      const kit = weaponFor(s, action.role).id;
      assignWeapon(
        s,
        action.role,
        kit,
        (s.armyEquipment![action.role].equippedWeapons![kit] ?? 0) + action.count,
      );
      log(
        s,
        `Forged ${action.count} ${action.role === 'offense' ? 'weapons' : 'shields'} for your militia.`,
        'item',
        now,
      );
      break;
    }
    case 'weapon': {
      requireThat(!s.expedition, 'Extract before changing unit weapons.');
      const owned = equipmentFor(s, action.role).weapons[action.weapon] ?? 0;
      requireThat(owned > 0, 'Buy this weapon in the equipment shop first.');
      s.unitWeapons = { ...s.unitWeapons, [action.role]: action.weapon };
      assignWeapon(s, action.role, action.weapon, Math.min(owned, s.troops[action.role]));
      log(s, `Switched ${action.role} weapons. Previous kits remain in storage.`, 'item', now);
      break;
    }
    case 'buyKit': {
      requireThat(s.buildings.blacksmith, 'Build the Blacksmith first.');
      requireThat(
        Number.isInteger(action.count) && action.count > 0 && action.count <= 1000,
        'Choose 1–1000 kits.',
      );
      const weapon = UNIT_WEAPONS.find((w) => w.id === action.kit);
      requireThat(
        action.kit === 'armor' ? s.level >= 1 : weapon && s.level >= weapon.level,
        'Reach the required settlement tier.',
      );
      const gear = s.armyEquipment![action.role];
      const owned = action.kit === 'armor' ? gear.armorOwned : (gear.weapons[action.kit] ?? 0);
      requireThat(owned + action.count <= 1000, 'Storage holds up to 1000 of each kit per role.');
      const assigned =
        action.kit === 'armor' ? gear.armorEquipped : (gear.equippedWeapons![action.kit] ?? 0);
      if (action.equip) {
        requireThat(
          !s.expedition || action.role === 'defense',
          'Extract before changing expedition equipment.',
        );
        requireThat(
          assigned + action.count <= s.troops[action.role],
          'Not enough soldiers for this equipment order.',
        );
      }

      pay(s, action.count * (weapon?.unitCost ?? 80));
      if (action.kit === 'armor') gear.armorOwned += action.count;
      else gear.weapons[action.kit] = owned + action.count;
      if (action.equip) {
        if (action.kit === 'armor') gear.armorEquipped += action.count;
        else assignWeapon(s, action.role, action.kit, assigned + action.count);
      }

      log(
        s,
        `Purchased ${action.count} ${weapon?.name ?? 'padded armor kits'} for ${action.role}. ${action.equip ? 'Purchased kits equipped immediately.' : 'Equip them from storage.'}`,
        'item',
        now,
      );
      break;
    }
    case 'equipKit': {
      requireThat(
        !s.expedition || action.role === 'defense',
        'Extract before changing expedition equipment.',
      );
      requireThat(
        Number.isInteger(action.count) &&
          action.count >= 0 &&
          action.count <= s.troops[action.role],
        'Choose an equipment count within your troop count.',
      );
      const gear = s.armyEquipment![action.role];
      const owned = action.kit === 'armor' ? gear.armorOwned : (gear.weapons[action.kit] ?? 0);
      requireThat(action.count <= owned, 'Buy enough kits first.');
      if (action.kit === 'armor') gear.armorEquipped = action.count;
      else {
        s.unitWeapons = { ...s.unitWeapons, [action.role]: action.kit };
        assignWeapon(s, action.role, action.kit, action.count);
      }
      log(
        s,
        `Equipped ${action.count} ${action.role} soldiers with ${action.kit === 'armor' ? 'padded armor' : UNIT_WEAPONS.find((w) => w.id === action.kit)!.name}. Other assigned weapons stay equipped unless space is needed.`,
        'item',
        now,
      );
      break;
    }
    case 'healPet': {
      requireThat(!s.expedition, 'Extract before treating a companion.');
      const pet = s.inventory.find((i) => i.id === action.id && i.kind === 'pet');
      requireThat(pet && (pet.injuredUntil ?? 0) > now, 'This companion is not injured.');
      pay(s, 120);
      pet.injuredUntil = 0;
      log(s, `${pet.name} has recovered at the healer.`, 'item', now);
      break;
    }
    case 'fight': {
      requireThat(s.faction, 'Swear an oath before venturing beyond your borders.');
      requireThat(
        Number.isInteger(action.dungeon) && !!DUNGEONS[action.dungeon],
        'Unknown dungeon.',
      );
      requireThat(
        Number.isInteger(action.stage) && stageAvailable(s, action.dungeon, action.stage),
        'Clear the preceding stage to unlock this path.',
      );
      requireThat(
        s.troops.offense > 0,
        'Assign at least one soldier to offense. Your defenders stay home.',
      );
      requireThat(
        !s.expedition || action.mode === 'personal',
        'Extract from your personal expedition before sending an army raid.',
      );
      const deployed = s.expedition?.troops ?? action.troops ?? s.troops.offense;
      requireThat(
        Number.isInteger(deployed) && deployed > 0 && deployed <= s.troops.offense,
        'Choose an available offensive party of at least one soldier.',
      );
      requireThat(
        !s.expedition || action.troops === undefined || action.troops === deployed,
        'Your expedition party is locked until extraction.',
      );
      const forecast = dungeonForecast(
        s,
        action.mode,
        action.tactic,
        action.dungeon,
        action.stage,
        deployed,
        now,
      );
      const companion = s.inventory.find((i) => i.kind === 'pet' && s.equipped.includes(i.id));
      const companionReady = companion && (companion.injuredUntil ?? 0) <= now;
      if (action.mode === 'personal') {
        requireThat(s.level >= 2, 'Personal expeditions unlock at Village tier.');
        if (s.expedition)
          requireThat(
            s.expedition.dungeon === action.dungeon && s.expedition.nextStage === action.stage,
            'Continue your current expedition or extract its loot.',
          );
        else
          s.expedition = {
            troops: deployed,
            dungeon: action.dungeon,
            nextStage: action.stage,
            gold: 0,
            items: [],
            renown: 0,
          };
      }
      spendAP(s, action.mode === 'personal' ? 7 : 5);
      const d = DUNGEONS[action.dungeon];
      const idx = action.stage - 1;
      const power = forecast.power;
      const enemy = d.enemy[idx];
      const roll = 0.85 + 0.3 * rng();
      const finalPower = power * roll;
      const won = finalPower >= enemy;
      const gold = won
        ? Math.floor(
            d.gold[idx] *
              (0.9 + rng() * 0.2) *
              (action.mode === 'personal' ? 1.5 : 1) *
              (1 + petAbility(s, 'scavenger', now)),
          )
        : 0;
      const renown = won ? (action.stage === 5 ? 30 : 5) * (action.dungeon + 1) : 0;
      const items = won ? dungeonLoot(s, action.dungeon, action.stage === 5, rng) : [];
      const losses = won
        ? Math.max(
            forecast.victoryLossMin,
            Math.min(
              forecast.victoryLossMax,
              Math.ceil(forecast.victoryLossBase * Math.min(1, enemy / Math.max(1, finalPower))),
            ),
          )
        : forecast.defeatLosses;
      const gearLost = loseTroops(s, losses, deployed);
      if (s.expedition) s.expedition.troops = deployed - losses;
      trainCompanion(s, won, action.stage === 5, now);
      const heroDamage = Math.floor(Math.floor(finalPower) * forecast.heroShare);
      const armyDamage = Math.floor(finalPower) - heroDamage;
      const enemyDamage = losses * 12;
      let lostItems = 0;
      if (won) {
        s.cleared[action.dungeon] = Math.max(s.cleared[action.dungeon], action.stage);
        if (s.expedition) {
          s.expedition.gold += gold;
          s.expedition.items.push(...items);
          s.expedition.renown += renown;
          s.expedition.nextStage = action.stage + 1;
        } else {
          s.gold += gold;
          s.renown += renown;
          s.inventory.push(...items);
        }
      } else {
        if (s.expedition) {
          const lostIds = s.inventory
            .filter((i) => s.equipped.includes(i.id) && i.kind !== 'pet')
            .map((i) => i.id);
          lostItems = lostIds.length + s.expedition.items.length;
          s.inventory = s.inventory.filter((i) => !lostIds.includes(i.id));
          s.equipped = s.equipped.filter((id) => !lostIds.includes(id));
          s.expedition = null;
        }
      }
      finishBattle(
        s,
        {
          id: uid(s),
          title: d.names[idx],
          dungeon: action.dungeon,
          boss: action.stage === 5,
          deployed,
          heroDamage,
          armyDamage,
          enemyDamage,
          mode: action.mode,
          won,
          power,
          enemy,
          roll,
          finalPower,
          tactic: action.tactic,
          gold,
          renown,
          casualties: losses,
          gearLost,
          items,
          lostItems,
          time: now,
          lines: [
            `${deployed} attackers entered ${d.name}; ${current.troops.offense - deployed} attackers and all defenders stayed home.`,
            `${enemyStyle(action.dungeon, action.stage).name} enemy: ${forecast.counter ? 'formation counter +20%' : 'no formation counter'}${forecast.weaponMatch ? `, weapon advantage +${(forecast.weaponMatch * 10).toFixed(1)}%` : ''}.`,
            `Decisive exchange: your character dealt ${heroDamage} damage; your units dealt ${armyDamage}. Enemy endurance: ${enemy}.`,
            `${d.names[idx]} struck your ranks for ${enemyDamage} troop damage: ${losses} killed, ${deployed - losses} survived. Each deployed soldier has 12 endurance.`,
            `The ${roll.toFixed(2)}x battle roll resolved ${format(finalPower)} strength. ${won ? 'Enemy overcome.' : 'Your force retreated.'}`,
            companionReady
              ? won
                ? `${companion.name} earned ${action.stage === 5 ? 40 : 20} experience.`
                : `${companion.name} escaped injured. Recovery takes 30 minutes or 120 gold at home.`
              : 'No healthy companion accompanied this force.',
            won
              ? action.mode === 'personal'
                ? 'Victory. Extract to bank your satchel; survivors form your next party.'
                : 'Victory. Spoils secured, but fallen soldiers must be replaced.'
              : action.mode === 'personal'
                ? 'Equipped non-companion items and the satchel were lost. Your bonded companion and stored inventory survived.'
                : 'The survivors returned home. Undeployed troops were untouched.',
          ],
        },
        now,
      );
      break;
    }
    case 'raidRival': {
      const rival = RIVALS.find((r) => r.id === action.rival);
      requireThat(rival, 'Unknown AI rival.');
      requireThat(s.faction, 'Choose a faction before raiding.');
      requireThat(
        Math.abs(s.level - rival.level) <= 1,
        'Raid AI rivals within one settlement tier.',
      );
      requireThat(!s.expedition, 'Extract before raiding a rival.');
      requireThat(s.troops.offense > 0, 'Assign offensive troops first.');
      requireThat(
        TACTICS.some((t) => t.id === action.tactic),
        'Choose a formation.',
      );
      const day = Math.floor(now / 86400000);
      const history = s.rivalRaids ?? { day, wins: 0, last: {} };
      const wins = history.day === day ? history.wins : 0;
      requireThat(
        wins < RIVAL_DAILY_WINS,
        'Daily AI bounty limit reached. Return after midnight UTC or raid player realms.',
      );
      requireThat(
        history.last[rival.id] === undefined || now - history.last[rival.id] >= RIVAL_COOLDOWN,
        'This AI rival is regrouping. Wait thirty minutes.',
      );
      requireThat(s.ap >= 8, 'You need 8 AP for a rival raid.');
      s.ap -= 8;
      const power = powerFor(s, 'pvp', action.tactic),
        roll = 0.85 + 0.3 * rng();
      const finalPower = power * roll,
        won = finalPower >= rival.defense;
      trainCompanion(s, won, false, now);
      const gold = won ? rival.gold : 0;
      const loss = won
        ? { count: 0, gear: { weapons: 0, armor: 0 } }
        : casualties(s, action.tactic);
      const losses = loss.count;
      s.gold += gold;
      if (won) s.wins++;
      s.rivalRaids = {
        day,
        wins: wins + (won ? 1 : 0),
        last: {
          ...Object.fromEntries(
            Object.entries(history.last).filter(([, at]) => now - at < RIVAL_COOLDOWN),
          ),
          [rival.id]: now,
        },
      };
      finishBattle(
        s,
        {
          id: uid(s),
          title: `${rival.name} (AI)`,
          mode: 'pvp',
          won,
          power,
          enemy: rival.defense,
          roll,
          finalPower,
          tactic: action.tactic,
          gold,
          renown: 0,
          casualties: losses,
          gearLost: loss.gear,
          items: [],
          lostItems: 0,
          time: now,
          lines: [
            `Your army raided ${rival.name}, an AI-controlled stronghold.`,
            `${power} attack met ${rival.defense} defense with a ${roll.toFixed(2)}x roll.`,
            won
              ? `${gold} gold secured. AI bounties do not award season renown.`
              : `Your army retreated with ${losses} casualties.`,
            'Your garrison and bank savings remained safe.',
          ],
        },
        now,
      );
      break;
    }
    case 'attack': {
      requireThat(s.faction, 'Swear an oath before entering the war.');
      requireThat(!s.expedition, 'Extract from your expedition before attacking a realm.');
      requireThat(s.troops.offense > 0, 'Assign troops to offense before attacking.');
      const o = OPPONENTS.find((o) => o.id === action.opponent);
      requireThat(o, 'Unknown realm.');

      const history = s.opponents[o.id] ?? { lastAttack: 0, plundered: 0 };
      requireThat(
        now - history.lastAttack >= 60000,
        'This realm is recovering. Wait one minute before attacking again.',
      );
      requireThat(
        history.plundered < o.gold,
        'This realm has no exposed gold left. Choose another opponent.',
      );
      spendAP(s, 8);
      const power = powerFor(s, 'pvp', action.tactic);
      const roll = 0.85 + 0.3 * rng();
      const finalPower = power * roll;
      const won = finalPower >= o.defense;
      const gold = won ? pvpLoot(o.gold - history.plundered, finalPower, o.defense, rng()).gold : 0;
      const renown = won && o.faction !== s.faction ? 20 : 0;
      trainCompanion(s, won, false, now);
      const loss = won
        ? { count: 0, gear: { weapons: 0, armor: 0 } }
        : casualties(s, action.tactic);
      const losses = loss.count;
      s.gold += gold;
      s.renown += renown;
      s.opponents[o.id] = { lastAttack: now, plundered: history.plundered + gold };
      finishBattle(
        s,
        {
          id: uid(s),
          title: o.realm,
          mode: 'pvp',
          won,
          power,
          enemy: o.defense,
          roll,
          finalPower,
          tactic: action.tactic,
          gold,
          renown,
          casualties: losses,
          gearLost: loss.gear,
          items: [],
          lostItems: 0,
          time: now,
          lines: [
            `Your offensive army marched on ${o.name} in a simulated skirmish.`,
            `${format(power)} attack met ${o.defense} realm defense.`,
            `Your battle roll was ${roll.toFixed(2)}×: ${format(finalPower)} final strength.`,
            won
              ? `${gold} exposed gold secured. +${renown} season renown.`
              : `Your army withdrew with ${losses} casualties. Your home and defenders are safe.`,
          ],
        },
        now,
      );
      break;
    }
    case 'extract': {
      requireThat(s.expedition, 'There is no active expedition.');
      const ex = s.expedition;
      s.gold += ex.gold;
      s.renown += ex.renown;
      s.inventory.push(...ex.items);
      s.expedition = null;
      log(
        s,
        `You extracted safely with ${format(ex.gold)} gold and ${ex.items.length} items.`,
        'gold',
        now,
      );
      break;
    }
    case 'equip': {
      requireThat(!s.expedition, 'Your loadout is locked until your expedition ends.');
      const item = s.inventory.find((i) => i.id === action.id);
      requireThat(item, 'Item not found.');
      requireThat(!s.equipped.includes(item.id), 'This item is already equipped.');
      const slot = equipmentSlot(item);
      const same = s.inventory.filter(
        (i) =>
          s.equipped.includes(i.id) &&
          (slot ? equipmentSlot(i) === slot : i.kind === item.kind),
      );
      if (item.kind === 'rune')
        requireThat(same.length < 2, 'Both rune slots are full. Unequip a rune first.');
      else s.equipped = s.equipped.filter((id) => !same.some((i) => i.id === id));
      s.equipped.push(item.id);
      log(s, `Equipped ${item.name}.`, 'item', now);
      break;
    }
    case 'unequip': {
      requireThat(!s.expedition, 'Your loadout is locked until your expedition ends.');
      s.equipped = s.equipped.filter((id) => id !== action.id);
      break;
    }
    case 'sell': {
      requireThat(s.buildings.trader, 'Build the Trading Post to sell loot.');
      const item = s.inventory.find((i) => i.id === action.id);
      requireThat(item, 'Item not found.');
      requireThat(!s.equipped.includes(item.id), 'Unequip this item before selling it.');
      s.gold += item.value;
      s.inventory = s.inventory.filter((i) => i.id !== item.id);
      log(s, `Sold ${item.name} for ${item.value} gold.`, 'gold', now);
      break;
    }
    case 'chest': {
      requireThat(s.buildings.trader, 'Build the Trading Post to purchase chests.');
      const chest = CHESTS[action.tier];
      requireThat(chest, 'Unknown chest.');
      pay(s, chest.cost);
      let rarity = rollRarity(chest.odds, rng);
      if (s.pity >= 9 && RARITIES.indexOf(rarity) < 3) rarity = 'epic';
      s.pity = RARITIES.indexOf(rarity) >= 3 ? 0 : s.pity + 1;
      s.chestsOpened++;
      const typeRoll = rng();
      const kind: ItemKind = typeRoll < 0.35 ? 'weapon' : 'armor';
      const item = makeItem(s, rarity, rng, kind);
      s.inventory.push(item);
      s.lastLoot = item;
      log(s, `Opened a ${chest.name} and discovered ${item.name}.`, 'item', now);
      break;
    }
    case 'donate': {
      requireThat(s.faction, 'Choose a faction before contributing to the war.');
      requireThat(
        Number.isInteger(action.amount) && action.amount > 0 && action.amount % 100 === 0,
        'Donate in amounts of 100 gold.',
      );
      const day = Math.floor(now / 86400000);
      if (s.donations.day !== day) s.donations = { day, amount: 0 };
      requireThat(
        s.donations.amount + action.amount <= 2000,
        'Daily logistics cap reached: 2,000 gold. Battles and dungeons still earn renown.',
      );
      pay(s, action.amount);
      s.donations.amount += action.amount;
      const gained = action.amount / 20;
      s.renown += gained;
      log(
        s,
        `Supplied the ${FACTIONS.find((f) => f.id === s.faction)!.name} with ${action.amount} gold. +${gained} renown.`,
        'oath',
        now,
      );
      break;
    }
    case 'advance': {
      s.lastTick = now - TICK_MS;
      return accrue(s, now);
    }
  }
  if (runeDiscovered(s)) s.discoveredRunes = true;
  return s;
}

export function validSave(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const s = value as GameState;
  const number = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  return (
    s.version === 1 &&
    s.progressionVersion === 2 &&
    (s.barracksLevel === undefined ||
      (Number.isInteger(s.barracksLevel) &&
        s.barracksLevel >= 0 &&
        s.barracksLevel <= MAX_BARRACKS)) &&
    (s.offenseLevel === undefined ||
      (Number.isInteger(s.offenseLevel) &&
        s.offenseLevel >= 0 &&
        s.offenseLevel <= MAX_COMBAT_UPGRADE)) &&
    (s.defenseLevel === undefined ||
      (Number.isInteger(s.defenseLevel) &&
        s.defenseLevel >= 0 &&
        s.defenseLevel <= MAX_COMBAT_UPGRADE)) &&
    (s.bankLevel === undefined ||
      (Number.isInteger(s.bankLevel) && s.bankLevel >= 1 && s.bankLevel <= MAX_BANK)) &&
    (s.bankInterestRemainder === undefined ||
      (number(s.bankInterestRemainder) && s.bankInterestRemainder < 1)) &&
    (s.factionChangedSeason === undefined ||
      (Number.isSafeInteger(s.factionChangedSeason) && s.factionChangedSeason >= 0)) &&
    Number.isInteger(s.level) &&
    s.level >= 0 &&
    s.level < TIERS.length &&
    number(s.gold) &&
    (s.bankGold === undefined ||
      (Number.isSafeInteger(s.bankGold) &&
        s.bankGold >= 0 &&
        (!s.bankGold || s.buildings?.bank === true))) &&
    (s.rivalRaids === undefined ||
      (!!s.rivalRaids &&
        Number.isSafeInteger(s.rivalRaids.day) &&
        s.rivalRaids.day >= 0 &&
        Number.isInteger(s.rivalRaids.wins) &&
        s.rivalRaids.wins >= 0 &&
        s.rivalRaids.wins <= RIVAL_DAILY_WINS &&
        !!s.rivalRaids.last &&
        Object.entries(s.rivalRaids.last).every(
          ([id, at]) => RIVALS.some((r) => r.id === id) && number(at),
        ))) &&
    number(s.ap) &&
    s.ap <= AP_CAP &&
    number(s.lastTick) &&
    number(s.createdAt) &&
    number(s.seq) &&
    number(s.renown) &&
    number(s.wins) &&
    number(s.pity) &&
    s.pity <= 9 &&
    number(s.chestsOpened) &&
    (s.faction === null || FACTIONS.some((f) => f.id === s.faction)) &&
    !!s.troops &&
    number(s.troops.offense) &&
    number(s.troops.defense) &&
    !!s.arms &&
    number(s.arms.offense) &&
    number(s.arms.defense) &&
    (s.armyEquipment === undefined ||
      (['offense', 'defense'] as const).every((role) => {
        const g = s.armyEquipment?.[role];
        return (
          !!g &&
          number(g.armorOwned) &&
          Number.isInteger(g.armorOwned) &&
          g.armorOwned <= 1000 &&
          number(g.armorEquipped) &&
          Number.isInteger(g.armorEquipped) &&
          g.armorEquipped <= Math.min(g.armorOwned, s.troops[role]) &&
          !!g.weapons &&
          Object.entries(g.weapons).every(
            ([key, n]) =>
              UNIT_WEAPONS.some((w) => w.id === key) &&
              number(n) &&
              Number.isInteger(n) &&
              n <= 1000,
          ) &&
          (g.equippedWeapons === undefined
            ? s.arms[role] <=
              Math.min(s.troops[role], g.weapons[s.unitWeapons?.[role] ?? 'militia'] ?? 0)
            : !!g.equippedWeapons &&
              Object.entries(g.equippedWeapons).every(
                ([key, n]) =>
                  UNIT_WEAPONS.some((w) => w.id === key) &&
                  Number.isSafeInteger(n) &&
                  n! >= 0 &&
                  n! <= (g.weapons[key as import('./types').UnitWeapon] ?? 0),
              ) &&
              Object.values(g.equippedWeapons).reduce((a, n) => a + n, 0) === s.arms[role] &&
              s.arms[role] <= s.troops[role])
        );
      })) &&
    (s.unitWeapons === undefined ||
      (!!s.unitWeapons &&
        Object.entries(s.unitWeapons).every(
          ([role, weapon]) =>
            ['offense', 'defense'].includes(role) && UNIT_WEAPONS.some((w) => w.id === weapon),
        ))) &&
    (s.discoveredRunes === undefined || typeof s.discoveredRunes === 'boolean') &&
    !!s.buildings &&
    BUILDINGS.every(
      (b) =>
        typeof s.buildings[b.id] === 'boolean' ||
        (b.id === 'bank' && s.buildings.bank === undefined),
    ) &&
    Array.isArray(s.cleared) &&
    s.cleared.length === DUNGEONS.length &&
    s.cleared.every((c) => Number.isInteger(c) && c >= 0 && c <= 5) &&
    typeof s.name === 'string' &&
    Array.isArray(s.inventory) &&
    s.inventory.every(validItem) &&
    new Set(s.inventory.map((i) => i.id)).size === s.inventory.length &&
    Array.isArray(s.equipped) &&
    new Set(s.equipped).size === s.equipped.length &&
    s.equipped.every((id) => s.inventory.some((i) => i.id === id)) &&
    s.inventory.filter((i) => i.kind === 'rune' && s.equipped.includes(i.id)).length <= 2 &&
    s.inventory.filter((i) => i.kind === 'pet' && s.equipped.includes(i.id)).length <= 1 &&
    new Set(
      s.inventory
        .filter(
          (i) => (i.kind === 'weapon' || i.kind === 'armor') && s.equipped.includes(i.id),
        )
        .map((i) => equipmentSlot(i)),
    ).size ===
      s.inventory.filter(
        (i) => (i.kind === 'weapon' || i.kind === 'armor') && s.equipped.includes(i.id),
      ).length &&
    (s.defenseReadSeq === undefined ||
      (Number.isSafeInteger(s.defenseReadSeq) &&
        s.defenseReadSeq >= 0 &&
        s.defenseReadSeq <= s.seq)) &&
    (s.defenseReports === undefined ||
      (Array.isArray(s.defenseReports) &&
        s.defenseReports.length <= 50 &&
        s.defenseReports.every(
          (r) =>
            !!r &&
            Number.isSafeInteger(r.seq) &&
            r.seq > 0 &&
            r.seq <= s.seq &&
            typeof r.attackerName === 'string' &&
            r.attackerName.length <= 100 &&
            typeof r.defended === 'boolean' &&
            [
              r.time,
              r.goldLost,
              r.troopsLost,
              r.weaponsLost,
              r.armorLost,
              r.attackPower,
              r.defensePower,
              r.shieldUntil,
            ].every(number),
        ))) &&
    Array.isArray(s.activity) &&
    s.activity.every(
      (a) => !!a && typeof a.id === 'string' && typeof a.text === 'string' && number(a.time),
    ) &&
    !!s.opponents &&
    typeof s.opponents === 'object' &&
    Object.values(s.opponents).every((o) => !!o && number(o.lastAttack) && number(o.plundered)) &&
    !!s.donations &&
    number(s.donations.day) &&
    number(s.donations.amount) &&
    (s.lastLoot === null || validItem(s.lastLoot)) &&
    (s.lastBattle === null ||
      (!!s.lastBattle &&
        typeof s.lastBattle.title === 'string' &&
        typeof s.lastBattle.id === 'string' &&
        typeof s.lastBattle.won === 'boolean' &&
        number(s.lastBattle.power) &&
        number(s.lastBattle.enemy) &&
        number(s.lastBattle.roll) &&
        number(s.lastBattle.finalPower) &&
        Array.isArray(s.lastBattle.items) &&
        s.lastBattle.items.every(validItem) &&
        Array.isArray(s.lastBattle.lines) &&
        s.lastBattle.lines.every((line) => typeof line === 'string'))) &&
    (s.expedition === null ||
      (!!s.expedition &&
        (s.expedition.troops === undefined ||
          (Number.isInteger(s.expedition.troops) &&
            s.expedition.troops >= 0 &&
            s.expedition.troops <= s.troops.offense)) &&
        number(s.expedition.gold) &&
        number(s.expedition.renown) &&
        Array.isArray(s.expedition.items) &&
        s.expedition.items.every(validItem) &&
        Number.isInteger(s.expedition.dungeon) &&
        s.expedition.dungeon >= 0 &&
        s.expedition.dungeon < DUNGEONS.length &&
        Number.isInteger(s.expedition.nextStage) &&
        s.expedition.nextStage >= 1 &&
        s.expedition.nextStage <= 6))
  );
}

function validItem(value: unknown): value is Item {
  if (!value || typeof value !== 'object') return false;
  const item = value as Item;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    (item.quality === undefined ||
      (Number.isInteger(item.quality) && item.quality >= 0 && item.quality <= 200)) &&
    (item.abilityRoll === undefined ||
      (Number.isInteger(item.abilityRoll) && item.abilityRoll >= 0 && item.abilityRoll <= 200)) &&
    (item.ability === undefined || PET_ABILITIES.includes(item.ability)) &&
    (item.xp === undefined ||
      (Number.isInteger(item.xp) && item.xp >= 0 && item.xp <= MAX_PET_XP)) &&
    (item.injuredUntil === undefined ||
      (Number.isFinite(item.injuredUntil) && item.injuredUntil >= 0)) &&
    RARITIES.includes(item.rarity) &&
    ['weapon', 'armor', 'rune', 'pet'].includes(item.kind) &&
    (item.slot === undefined ||
      ['weapon', 'helm', 'chest', 'greaves', 'boots', 'shield'].includes(item.slot)) &&
    (item.set === undefined || ARMOR_SETS.some((set) => set.id === item.set)) &&
    (item.kind !== 'weapon' || equipmentSlot(item) === 'weapon') &&
    (item.kind !== 'armor' || equipmentSlot(item) !== 'weapon') &&
    Number.isFinite(item.power) &&
    item.power >= 0 &&
    Number.isFinite(item.value) &&
    item.value >= 0
  );
}
