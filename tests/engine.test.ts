import {
  bankCapacity,
  bankRate,
  MAX_BARRACKS,
  MAX_COMBAT_UPGRADE,
  seasonKey,
} from '../src/game/progression';
import {
  petXpFor,
  companionBonus,
  trainCompanion,
  MAX_PET_XP,
  petAbility,
} from '../src/game/companions';
import { acceptableName } from '../src/game/names';
import assert from 'node:assert/strict';
import test from 'node:test';
import { AP_CAP, OFFLINE_CAP, TICK_MS } from '../src/game/data';
import {
  accrue,
  applyAction,
  availableDungeon,
  newGame,
  powerFor,
  stats,
  validSave,
  winChance,
  dungeonForecast,
  companionLevel,
  runeDiscovered,
  equipmentFor,
  assignedWeapons,
  loseTroops,
} from '../src/game/engine';
import type { GameState, Item } from '../src/game/types';

const NOW = 1_800_000_000_000;
const rng = () => 0.5;
function realm(): GameState {
  return applyAction(newGame(NOW), { type: 'faction', id: 'iron' }, NOW);
}
function explorer(): GameState {
  const s = realm();
  s.level = 2;
  s.gold = 20000;
  s.troops.offense = 30;
  s.arms.offense = 30;
  delete s.armyEquipment;
  return s;
}
function merchant(): GameState {
  const s = realm();
  s.buildings.trader = true;
  s.gold = 50000;
  return s;
}

test('starting army is separate from the garrison and excess equipment gives no extra strength', () => {
  const s = newGame(NOW);
  assert.equal(stats(s).attack, 72);
  assert.equal(stats(s).defense, 48);
  s.troops.defense = 200;
  s.arms.offense = 1000;
  assert.equal(stats(s).attack, 72);
});
test('tribute accrues in discrete intervals, preserves partial time and caps AP', () => {
  const s = newGame(NOW);
  assert.equal(accrue(s, NOW + TICK_MS - 1), s);
  const t = accrue(s, NOW + TICK_MS * 10 + 30000);
  assert.equal(t.gold, 2100);
  assert.equal(t.ap, AP_CAP);
  assert.equal(t.lastTick, NOW + TICK_MS * 10);
  assert.equal(accrue(t, NOW + TICK_MS * 10 + 30000), t);
});
test('offline income is capped at 12 hours and cannot be collected twice', () => {
  const s = newGame(NOW);
  const n = NOW + OFFLINE_CAP * 4 + 1000;
  const t = accrue(s, n);
  assert.equal(t.gold, 1800 + 144 * 30);
  assert.equal(t.tribute?.ticks, 144);
  assert.equal(accrue(t, n + 1000).gold, t.gold);
});
test('moving the clock backward gives no resources', () => {
  const s = newGame(NOW);
  assert.equal(accrue(s, NOW - 10000000), s);
});
test('an upgrade settles pending income at the old rate, not the new rate', () => {
  const s = newGame(NOW);
  const t = applyAction(s, { type: 'upgrade' }, NOW + TICK_MS * 2);
  assert.equal(t.gold, 1800 + 60 - 800);
  assert.equal(t.level, 1);
  assert.equal(stats(t).income, 65);
  assert.equal(s.level, 0);
  assert.equal(s.gold, 1800);
});
test('recruiting enforces building unlock, capacity, payment, and equipment requirements', () => {
  let s = realm();
  assert.throws(
    () => applyAction(s, { type: 'recruit', role: 'offense', count: 1 }, NOW),
    /Armory/,
  );
  s = applyAction(s, { type: 'build', building: 'armory' }, NOW);
  const t = applyAction(s, { type: 'recruit', role: 'offense', count: 5 }, NOW);
  assert.equal(t.gold, s.gold - 300);
  assert.equal(t.troops.offense, 11);
  assert.equal(t.arms.offense, 6);
  assert.throws(
    () => applyAction(t, { type: 'recruit', role: 'defense', count: 10 }, NOW),
    /realm is full/,
  );
  assert.throws(
    () => applyAction(t, { type: 'recruit', role: 'defense', count: -3 }, NOW),
    /valid recruit/,
  );
});
test('building costs and gates cannot be bypassed or purchased twice', () => {
  let s = realm();
  assert.throws(
    () => applyAction(s, { type: 'build', building: 'trader' }, NOW),
    /Reach Settlement/,
  );
  s = applyAction(s, { type: 'build', building: 'armory' }, NOW);
  assert.throws(
    () => applyAction(s, { type: 'build', building: 'armory' }, NOW),
    /already standing/,
  );
  s.gold = 0;
  assert.throws(() => applyAction(s, { type: 'upgrade' }, NOW), /more gold/);
});
test('AP and the oath are mandatory and invalid raids never mutate the original save', () => {
  const s = newGame(NOW);
  const action = { type: 'fight', dungeon: 0, stage: 1, mode: 'army', tactic: 'balanced' } as const;
  assert.throws(() => applyAction(s, action, NOW), /Swear an oath/);
  const t = realm();
  t.ap = 4;
  const before = JSON.stringify(t);
  assert.throws(() => applyAction(t, action, NOW), /more AP/);
  assert.equal(JSON.stringify(t), before);
});
test('army victories bank loot, spend AP, unlock exactly the next stage, and leave defense at home', () => {
  const s = realm();
  const t = applyAction(
    s,
    { type: 'fight', dungeon: 0, stage: 1, mode: 'army', tactic: 'balanced' },
    NOW,
    rng,
  );
  assert.equal(t.ap, s.ap - 5);
  assert.equal(t.gold, s.gold + 180);
  assert.equal(t.renown, 5);
  assert.equal(t.cleared[0], 1);
  assert.equal(t.troops.defense, s.troops.defense);
  assert.equal(t.inventory.length, 3);
  assert.equal(t.expedition, null);
  assert.throws(
    () =>
      applyAction(
        t,
        { type: 'fight', dungeon: 0, stage: 3, mode: 'army', tactic: 'balanced' },
        NOW,
      ),
    /preceding stage/,
  );
});
test('a boss opens the next area and guarantees rare-or-better gear', () => {
  const s = explorer();
  s.cleared[0] = 4;
  assert.equal(availableDungeon(s, 1), false);
  const t = applyAction(
    s,
    { type: 'fight', dungeon: 0, stage: 5, mode: 'army', tactic: 'balanced' },
    NOW,
    () => 0,
  );
  assert.equal(t.lastBattle?.won, true);
  assert.equal(availableDungeon(t, 1), true);
  assert.equal(t.lastBattle?.items[0].rarity, 'rare');
});
test('a defeated one-soldier dungeon party can be wiped out without harming the garrison', () => {
  const s = realm();
  s.cleared[0] = 4;
  s.troops.offense = 1;
  const t = applyAction(
    s,
    { type: 'fight', dungeon: 0, stage: 5, mode: 'army', tactic: 'aggressive' },
    NOW,
    rng,
  );
  assert.equal(t.lastBattle?.won, false);
  assert.equal(t.troops.offense, 0);
  assert.equal(t.troops.defense, 4);
  assert.equal(t.ap, s.ap - 5);
  assert.equal(t.gold, s.gold);
});

test('dungeon defeat casualties match the tactical forecast', () => {
  for (const tactic of ['balanced', 'aggressive', 'guarded'] as const) {
    const s = realm();
    s.cleared = [5, 5, 4];
    s.troops.offense = 17;
    const forecast = dungeonForecast(s, 'army', tactic, 2, 5, 17, NOW);
    const t = applyAction(
      s,
      { type: 'fight', dungeon: 2, stage: 5, mode: 'army', tactic, troops: 17 },
      NOW,
      () => 0,
    );
    assert.equal(t.lastBattle!.casualties, forecast.defeatLosses);
    assert.equal(t.troops.offense, 17 - forecast.defeatLosses);
  }
});
test('personal expeditions require Village, bank nothing until extraction, and cannot rerun a stage', () => {
  const action = {
    type: 'fight',
    dungeon: 0,
    stage: 1,
    mode: 'personal',
    tactic: 'balanced',
  } as const;
  assert.throws(() => applyAction(realm(), action, NOW), /Village/);
  const s = explorer();
  const t = applyAction(s, action, NOW, rng);
  assert.equal(t.gold, s.gold);
  assert.equal(t.renown, 0);
  assert.equal(t.inventory.length, s.inventory.length);
  assert.equal(t.expedition?.gold, 270);
  assert.equal(t.expedition?.nextStage, 2);
  assert.equal(t.ap, s.ap - 7);
  assert.throws(() => applyAction(t, action, NOW, rng), /Continue your current expedition/);
  assert.throws(() => applyAction(t, { ...action, mode: 'army' }, NOW, rng), /Extract/);
  const saved = JSON.parse(JSON.stringify(t));
  assert.equal(validSave(saved), true);
  const u = applyAction(saved, { type: 'extract' }, NOW);
  assert.equal(u.gold, s.gold + 270);
  assert.equal(u.renown, 5);
  assert.equal(u.inventory.length, 3);
  assert.equal(u.expedition, null);
  assert.throws(() => applyAction(u, { type: 'extract' }, NOW), /no active expedition/);
});
test('personal death removes equipped and carried loot while preserving stored items and the home', () => {
  const s = explorer();
  s.troops.offense = 1;
  s.arms.offense = 1;
  s.cleared[0] = 4;
  const stored: Item = {
    id: 'safe',
    name: 'Safe Blade',
    kind: 'weapon',
    rarity: 'rare',
    power: 50,
    value: 100,
  };
  s.inventory.push(stored);
  s.expedition = {
    dungeon: 0,
    nextStage: 5,
    gold: 1234,
    renown: 20,
    items: [{ ...stored, id: 'carried' }],
  };
  const t = applyAction(
    s,
    { type: 'fight', dungeon: 0, stage: 5, mode: 'personal', tactic: 'balanced' },
    NOW,
    () => 0,
  );
  assert.equal(t.lastBattle?.won, false);
  assert.equal(t.inventory.length, 1);
  assert.equal(t.inventory[0].id, 'safe');
  assert.deepEqual(t.equipped, []);
  assert.equal(t.expedition, null);
  assert.equal(t.gold, s.gold);
  assert.equal(t.level, 2);
  assert.equal(t.lastBattle?.lostItems, 3);
});
test('expedition loadout and troop reassignments are locked', () => {
  let s = explorer();
  s.buildings.armory = true;
  s = applyAction(
    s,
    { type: 'fight', dungeon: 0, stage: 1, mode: 'personal', tactic: 'balanced' },
    NOW,
    rng,
  );
  assert.throws(() => applyAction(s, { type: 'unequip', id: 'r1' }, NOW), /loadout is locked/);
  assert.throws(
    () => applyAction(s, { type: 'assign', from: 'defense', count: 1 }, NOW),
    /Extract/,
  );
});
test('unit reassignment leaves equipment in its original role and blacksmith arms unarmed troops', () => {
  let s = realm();
  s.buildings.armory = true;
  s.buildings.blacksmith = true;
  s = applyAction(s, { type: 'assign', from: 'defense', count: 1 }, NOW);
  assert.equal(s.arms.defense, 3);
  assert.equal(s.arms.offense, 6);
  assert.equal(s.troops.offense, 7);
  const t = applyAction(s, { type: 'arm', role: 'offense', count: 1 }, NOW);
  assert.equal(t.gold, s.gold - 50);
  assert.equal(t.arms.offense, 7);
  assert.throws(
    () => applyAction(t, { type: 'arm', role: 'offense', count: 1 }, NOW),
    /already equipped/,
  );
});
test('equipping a replacement swaps the slot; equipped items cannot be sold', () => {
  let s = merchant();
  s.inventory.push({
    id: 'new',
    name: 'Moonblade',
    kind: 'weapon',
    rarity: 'rare',
    power: 45,
    value: 160,
  });
  s = applyAction(s, { type: 'equip', id: 'new' }, NOW);
  assert.equal(s.equipped.includes('r1'), false);
  assert.equal(stats(s).heroAttack, 65);
  assert.throws(() => applyAction(s, { type: 'sell', id: 'new' }, NOW), /Unequip/);
  const t = applyAction(s, { type: 'sell', id: 'r1' }, NOW);
  assert.equal(t.gold, s.gold + 45);
  assert.equal(
    t.inventory.some((i) => i.id === 'r1'),
    false,
  );
  assert.throws(() => applyAction(t, { type: 'sell', id: 'r1' }, NOW), /not found/);
});
test('only two runes can be equipped and their combined bonus is capped', () => {
  let s = realm();
  for (let i = 0; i < 3; i++)
    s.inventory.push({
      id: `rune${i}`,
      name: 'Rune',
      kind: 'rune',
      rarity: 'epic',
      power: 20,
      value: 200,
    });
  s = applyAction(s, { type: 'equip', id: 'rune0' }, NOW);
  s = applyAction(s, { type: 'equip', id: 'rune1' }, NOW);
  assert.equal(stats(s).runes, 0.3);
  assert.throws(() => applyAction(s, { type: 'equip', id: 'rune2' }, NOW), /slots are full/);
});
test('the tenth non-epic chest guarantees an epic and resets pity; reveal is already saved', () => {
  let s = merchant();
  for (let i = 0; i < 9; i++) s = applyAction(s, { type: 'chest', tier: 0 }, NOW, () => 0.4);
  assert.equal(s.pity, 9);
  assert.equal(s.chestsOpened, 9);
  const t = applyAction(s, { type: 'chest', tier: 0 }, NOW, () => 0.4);
  assert.equal(t.lastLoot?.rarity, 'epic');
  assert.equal(t.pity, 0);
  assert.equal(t.inventory.length, 12);
  assert.equal(t.chestsOpened, 10);
  assert.equal(t.gold, 50000 - 2500);
  const restored = JSON.parse(JSON.stringify(t));
  assert.equal(validSave(restored), true);
  assert.equal(restored.inventory.at(-1).id, t.lastLoot!.id);
});
test('PvP permits same-faction raids without renown, enforces cooldowns, caps plunder, and leaves defense troops untouched', () => {
  const s = explorer();
  assert.equal(
    applyAction(s, { type: 'attack', opponent: 'cairn', tactic: 'balanced' }, NOW).lastBattle
      ?.renown,
    0,
  );
  const t = applyAction(s, { type: 'attack', opponent: 'rook', tactic: 'balanced' }, NOW, rng);
  assert.equal(t.gold, s.gold + 582);
  assert.equal(t.renown, 20);
  assert.equal(t.troops.defense, s.troops.defense);
  assert.throws(
    () => applyAction(t, { type: 'attack', opponent: 'rook', tactic: 'balanced' }, NOW + 30000),
    /recovering/,
  );
});
test('logistics contributions are capped daily and earn the specified renown', () => {
  const s = explorer();
  let t = applyAction(s, { type: 'donate', amount: 2000 }, NOW);
  assert.equal(t.renown, 100);
  assert.equal(t.gold, s.gold - 2000);
  assert.throws(() => applyAction(t, { type: 'donate', amount: 100 }, NOW), /Daily logistics cap/);
  t = applyAction(t, { type: 'donate', amount: 100 }, NOW + 86400000);
  assert.equal(t.donations.amount, 100);
  assert.equal(t.renown, 105);
});
test('the displayed probability matches the bounded uniform combat roll', () => {
  assert.equal(winChance(0, 50), 0);
  assert.ok(Math.abs(winChance(100, 100) - 0.5) < 0.00001);
  assert.equal(winChance(100, 200), 0);
  assert.equal(winChance(100, 50), 1);
  const s = realm();
  assert.equal(powerFor(s, 'army', 'aggressive'), Math.floor(stats(s).attack * 1.15));
});
test('save validation rejects malformed values and accepts legitimate persisted states', () => {
  assert.equal(validSave(newGame(NOW)), true);
  assert.equal(validSave(null), false);
  assert.equal(validSave({ version: 1 }), false);
  const s = realm();
  s.gold = Infinity;
  assert.equal(validSave(s), false);
  const t = realm();
  t.equipped.push('nonexistent');
  assert.equal(validSave(t), false);
  assert.equal(validSave({ ...realm(), inventory: [null] }), false);
  assert.equal(validSave({ ...realm(), activity: [null] }), false);
  assert.equal(
    validSave({
      ...realm(),
      expedition: { dungeon: 0, nextStage: 2, gold: 20, renown: 5, items: [null] },
    }),
    false,
  );
  const u = realm();
  u.inventory.push({ ...u.inventory[0] });
  assert.equal(validSave(u), false);
});

test('selected dungeon parties take victory losses while reserves remain untouched', () => {
  const s = explorer();
  s.troops.offense = 100;
  s.arms.offense = 100;
  const result = applyAction(
    s,
    { type: 'fight', mode: 'personal', dungeon: 0, stage: 1, tactic: 'guarded', troops: 20 },
    NOW,
    rng,
  );
  assert.equal(result.lastBattle!.won, true);
  assert.equal(result.lastBattle!.deployed, 20);
  assert.ok(result.lastBattle!.casualties > 0);
  assert.equal(result.troops.offense, 100 - result.lastBattle!.casualties);
  assert.equal(result.expedition!.troops, 20 - result.lastBattle!.casualties);
  assert.throws(
    () =>
      applyAction(
        result,
        { type: 'fight', mode: 'personal', dungeon: 0, stage: 2, tactic: 'balanced', troops: 30 },
        NOW,
        rng,
      ),
    /locked/,
  );
  assert.throws(
    () =>
      applyAction(
        s,
        { type: 'fight', mode: 'army', dungeon: 0, stage: 1, tactic: 'balanced', troops: 101 },
        NOW,
        rng,
      ),
    /available offensive/,
  );
  assert.throws(
    () =>
      applyAction(
        s,
        { type: 'fight', mode: 'army', dungeon: 0, stage: 1, tactic: 'balanced', troops: 0 },
        NOW,
        rng,
      ),
    /available offensive/,
  );
});
test('weapon milestones and formation counters change actual dungeon strength', () => {
  const s = explorer();
  s.buildings.blacksmith = true;
  const base = dungeonForecast(s, 'army', 'guarded', 0, 1, 20, NOW);
  assert.ok(base.counter);
  const bought = applyAction(s, { type: 'buyKit', role: 'offense', kit: 'spear', count: 30 }, NOW);
  const refit = applyAction(
    bought,
    { type: 'equipKit', role: 'offense', kit: 'spear', count: 30 },
    NOW,
  );
  assert.equal(refit.gold, s.gold - 2100);
  assert.ok(stats(refit).attack > stats(s).attack);
  assert.ok(dungeonForecast(refit, 'army', 'guarded', 0, 1, 20, NOW).weaponMatch);
  assert.throws(
    () => applyAction(s, { type: 'buyKit', role: 'offense', kit: 'halberd', count: 1 }, NOW),
    /required settlement/,
  );
  const guarded = dungeonForecast(s, 'army', 'guarded', 0, 1, 20, NOW),
    aggressive = dungeonForecast(s, 'army', 'aggressive', 0, 1, 20, NOW);
  assert.ok(guarded.victoryLossMax < aggressive.victoryLossMax);
});
test('bonded companions gain levels, survive personal defeat injured, and can be treated', () => {
  const s = explorer();
  s.inventory.push({
    id: 'r999',
    name: 'Silverfang Wolf',
    kind: 'pet',
    rarity: 'rare',
    power: 4,
    value: 160,
    xp: 80,
  });
  s.equipped.push('r999');
  const victory = applyAction(
    s,
    { type: 'fight', mode: 'army', dungeon: 0, stage: 1, tactic: 'guarded', troops: 20 },
    NOW,
    rng,
  );
  assert.equal(companionLevel(victory.inventory.find((i) => i.id === 'r999')!), 2);
  s.cleared = [5, 5, 4];
  const defeat = applyAction(
    s,
    { type: 'fight', mode: 'personal', dungeon: 2, stage: 5, tactic: 'balanced', troops: 1 },
    NOW,
    () => 0,
  );
  const pet = defeat.inventory.find((i) => i.id === 'r999')!;
  assert.ok(pet);
  assert.equal(pet.injuredUntil, NOW + 1800000);
  assert.equal(stats(defeat, NOW).pet, 0);
  const healed = applyAction(defeat, { type: 'healPet', id: pet.id }, NOW);
  assert.equal(healed.gold, defeat.gold - 120);
  assert.ok(stats(healed, NOW).pet > 0);
});
test('runes are discovered through dungeon rewards and chests remain gear-only', () => {
  let s = explorer();
  s.buildings.trader = true;
  assert.equal(runeDiscovered(s), false);
  const chest = applyAction(s, { type: 'chest', tier: 0 }, NOW, () => 0);
  assert.equal(chest.lastLoot!.kind, 'weapon');
  assert.equal(runeDiscovered(chest), false);
  s = applyAction(
    s,
    { type: 'fight', mode: 'army', dungeon: 0, stage: 1, tactic: 'guarded', troops: 20 },
    NOW,
    () => 0,
  );
  assert.equal(runeDiscovered(s), true);
  assert.equal(s.discoveredRunes, true);
  s.inventory = s.inventory.filter((i) => i.kind !== 'rune');
  assert.equal(runeDiscovered(s), true);
});

test('recruiting never auto-equips spare weapons; switching owned kits is free', () => {
  let s = explorer();
  s.buildings.armory = true;
  s.buildings.blacksmith = true;
  s.arms.offense = 40;
  s.troops.offense = 30;
  s = applyAction(s, { type: 'recruit', role: 'offense', count: 1 }, NOW);
  assert.equal(s.arms.offense, 30);
  assert.equal(s.troops.offense, 31);
  assert.equal(equipmentFor(s, 'offense').weapons.militia, 40);
  const bought = applyAction(s, { type: 'buyKit', role: 'offense', kit: 'spear', count: 5 }, NOW);
  assert.equal(bought.arms.offense, 30);
  assert.equal(bought.gold, s.gold - 350);
  let armed = applyAction(
    bought,
    { type: 'equipKit', role: 'offense', kit: 'spear', count: 5 },
    NOW,
  );
  const gold = armed.gold;
  armed = applyAction(armed, { type: 'equipKit', role: 'offense', kit: 'militia', count: 30 }, NOW);
  armed = applyAction(armed, { type: 'equipKit', role: 'offense', kit: 'spear', count: 5 }, NOW);
  assert.equal(armed.gold, gold);
  assert.equal(equipmentFor(armed, 'offense').weapons.spear, 5);
  assert.equal(equipmentFor(armed, 'offense').weapons.militia, 40);
  assert.throws(
    () => applyAction(armed, { type: 'equipKit', role: 'offense', kit: 'spear', count: 6 }, NOW),
    /enough kits/,
  );
  assert.ok(validSave(armed));
});
test('armor must be bought and equipped; it reduces dungeon losses and strengthens garrisons', () => {
  let s = explorer();
  s.buildings.blacksmith = true;
  const before = dungeonForecast(s, 'army', 'aggressive', 0, 5, 30, NOW);
  s = applyAction(s, { type: 'buyKit', role: 'offense', kit: 'armor', count: 30 }, NOW);
  assert.equal(equipmentFor(s, 'offense').armorEquipped, 0);
  s = applyAction(s, { type: 'equipKit', role: 'offense', kit: 'armor', count: 30 }, NOW);
  assert.ok(dungeonForecast(s, 'army', 'aggressive', 0, 5, 30, NOW).lossFactor < before.lossFactor);
  const defense = stats(s).defense;
  s = applyAction(s, { type: 'buyKit', role: 'defense', kit: 'armor', count: 4 }, NOW);
  s = applyAction(s, { type: 'equipKit', role: 'defense', kit: 'armor', count: 4 }, NOW);
  assert.equal(stats(s).defense, defense + 16);
});

test('rebalanced dungeon losses remain bounded and tactical protection still matters', () => {
  const s = explorer();
  s.troops.offense = 100;
  s.arms.offense = 100;
  const ordinary = dungeonForecast(s, 'army', 'balanced', 0, 1, 100, NOW);
  assert.equal(ordinary.victoryLossMin, 2);
  assert.equal(ordinary.victoryLossMax, 4);
  assert.equal(ordinary.defeatLosses, 45);
  const boss = dungeonForecast(s, 'army', 'balanced', 0, 5, 100, NOW);
  assert.equal(boss.victoryLossMax, 8);
  const guarded = dungeonForecast(s, 'army', 'guarded', 0, 1, 100, NOW);
  assert.ok(guarded.victoryLossMax < ordinary.victoryLossMax);
  for (let troops = 1; troops <= 160; troops++) {
    for (const tactic of ['balanced', 'guarded', 'aggressive'] as const) {
      const f = dungeonForecast(s, 'army', tactic, 2, 5, troops, NOW);
      assert.ok(f.victoryLossMin >= 1 && f.victoryLossMin <= f.victoryLossMax);
      assert.ok(f.victoryLossMax <= troops && f.defeatLosses >= 1 && f.defeatLosses <= troops);
    }
  }
});

test('bank transfers protect savings, charge once, and preserve legacy saves', () => {
  const legacy = realm();
  assert.ok(validSave(legacy));
  assert.throws(
    () => applyAction(legacy, { type: 'bank', direction: 'deposit', amount: 100 }, NOW),
    /Build the Bank/,
  );
  let s = { ...legacy, level: 1, gold: 5000 };
  s = applyAction(s, { type: 'build', building: 'bank' }, NOW);
  assert.equal(s.gold, 4000);
  const deposited = applyAction(s, { type: 'bank', direction: 'deposit', amount: 1000 }, NOW);
  assert.equal(deposited.gold, 3000);
  assert.equal(deposited.bankGold, 950);
  assert.ok(validSave(deposited));
  const withdrawn = applyAction(
    deposited,
    { type: 'bank', direction: 'withdraw', amount: 950 },
    NOW,
  );
  assert.equal(withdrawn.gold, 3950);
  assert.equal(withdrawn.bankGold, 0);
  assert.equal(accrue(deposited, NOW + TICK_MS).bankGold, 950);
  for (const amount of [-1, 0, 1.5, NaN, Infinity, 5000]) {
    assert.throws(() =>
      applyAction(deposited, { type: 'bank', direction: 'deposit', amount }, NOW),
    );
  }
  assert.throws(() =>
    applyAction(deposited, { type: 'bank', direction: 'withdraw', amount: 951 }, NOW),
  );
  assert.equal(deposited.bankGold, 950);
  assert.equal(validSave({ ...deposited, bankGold: -1 }), false);
  assert.equal(validSave({ ...deposited, bankGold: 0.5 }), false);
  assert.equal(validSave({ ...legacy, bankGold: 100 }), false);
});

test('one premium weapon upgrades one soldier and mixed parties preserve reserves', () => {
  let s = realm();
  s.level = 3;
  s.gold = 10000;
  s.buildings.blacksmith = true;
  s = applyAction(s, { type: 'buyKit', role: 'offense', kit: 'halberd', count: 1 }, NOW);
  s = applyAction(s, { type: 'equipKit', role: 'offense', kit: 'halberd', count: 1 }, NOW);
  assert.equal(assignedWeapons(s, 'offense').militia, 5);
  assert.equal(assignedWeapons(s, 'offense').halberd, 1);
  assert.equal(s.arms.offense, 6);
  assert.equal(stats(s).attack, 86);
  assert.equal(equipmentFor(s, 'offense').weapons.militia, 6);
  assert.equal(assignedWeapons(s, 'offense', 2).halberd, 1);
  assert.equal(assignedWeapons(s, 'offense', 2).militia, 1);
  const f = dungeonForecast(s, 'army', 'balanced', 0, 3, 2, NOW);
  assert.equal(f.weaponMatch, 0.5);
  loseTroops(s, 1, 2);
  assert.equal(s.troops.offense, 5);
  assert.equal(assignedWeapons(s, 'offense').militia, 4);
  assert.equal(assignedWeapons(s, 'offense').halberd, 1);
  assert.equal(equipmentFor(s, 'offense').weapons.halberd, 1);
  assert.ok(validSave(s));
  const forged = structuredClone(s);
  forged.armyEquipment!.offense.equippedWeapons!.halberd = 2;
  assert.equal(validSave(forged), false);
});

test('AI bounties respect cooldowns, daily limits, UTC rollover and do not award renown', () => {
  let s = realm();
  const raid = { type: 'raidRival', rival: 'ai-0-0', tactic: 'balanced' } as const;
  const first = applyAction(s, raid, NOW, () => 0.5);
  assert.equal(first.lastBattle!.gold, 400);
  assert.equal(first.gold, s.gold + 400);
  assert.equal(first.renown, s.renown);
  assert.equal(first.rivalRaids!.wins, 1);
  assert.throws(() => applyAction(first, raid, NOW + 1000), /regrouping/);
  assert.throws(() => applyAction(s, { ...raid, rival: 'ai-5-2' }, NOW), /tier/);
  assert.throws(() => applyAction(s, { ...raid, rival: 'fake' }, NOW), /Unknown/);
  s = first;
  for (let i = 1; i < 12; i++) s = applyAction(s, raid, NOW + i * 1800000, () => 0.5);
  assert.equal(s.rivalRaids!.wins, 12);
  assert.throws(() => applyAction(s, raid, NOW + 12 * 1800000), /Daily AI/);
  const tomorrow = (Math.floor((NOW + 12 * 1800000) / 86400000) + 1) * 86400000;
  const next = applyAction(s, raid, tomorrow, () => 0.5);
  assert.equal(next.rivalRaids!.wins, 1);
  assert.ok(validSave(next));
});

test('AI defeat costs troops and AP without consuming a paid victory or harming home savings', () => {
  const s = realm();
  s.level = 1;
  s.buildings.bank = true;
  s.bankGold = 900;
  const r = applyAction(
    s,
    { type: 'raidRival', rival: 'ai-1-2', tactic: 'aggressive' },
    NOW,
    () => 0,
  );
  assert.equal(r.lastBattle!.won, false);
  assert.equal(r.lastBattle!.casualties, 1);
  assert.equal(r.rivalRaids!.wins, 0);
  assert.equal(r.gold, s.gold);
  assert.equal(r.bankGold, 900);
  assert.equal(r.ap, s.ap - 8);
  assert.equal(r.troops.defense, s.troops.defense);
  assert.equal(r.arms.offense, 5);
  assert.equal(equipmentFor(r, 'offense').weapons.militia, 5);
  assert.ok(validSave(r));
});

test('PvP loot scales with victory margin, has independent variance and never creates gold', async () => {
  const { pvpLoot, pvpLootBand } = await import('../src/game/pvpLoot');
  for (const [power, min, max] of [
    [100, 150, 400],
    [120, 400, 700],
    [150, 650, 900],
    [200, 900, 980],
  ]) {
    assert.equal(pvpLoot(1000, power, 100, 0).gold, min);
    assert.equal(pvpLoot(1000, power, 100, 1).gold, max);
  }
  assert.equal(pvpLootBand(99, 100).name, 'Defeat');
  assert.equal(pvpLoot(1000, 99, 100, 1).gold, 0);
  assert.equal(pvpLootBand(50, 0).name, 'Dominant victory');
  assert.equal(pvpLoot(183, 50, 0, 0).gold, 164);
  assert.equal(pvpLoot(1, 50, 0, 1).gold, 1);
  assert.equal(pvpLoot(0, 50, 0, 1).gold, 0);
  for (let treasury = 1; treasury <= 1000; treasury++) {
    const loot = pvpLoot(treasury, 200, 100, 0.5).gold;
    assert.ok(Number.isInteger(loot) && loot >= 1 && loot <= treasury);
  }
});

test('fallen soldiers destroy deployed gear while stored kits and reserves survive', () => {
  let s = explorer();
  s.buildings.blacksmith = true;
  s = applyAction(
    s,
    { type: 'buyKit', role: 'offense', kit: 'spear', count: 10, equip: true },
    NOW,
  );
  s = applyAction(
    s,
    { type: 'buyKit', role: 'offense', kit: 'armor', count: 10, equip: true },
    NOW,
  );
  s = applyAction(s, { type: 'buyKit', role: 'offense', kit: 'spear', count: 3 }, NOW);
  const losses = loseTroops(s, 4, 10);
  assert.deepEqual(losses, { weapons: 4, armor: 4 });
  assert.equal(equipmentFor(s, 'offense').weapons.spear, 9);
  assert.equal(assignedWeapons(s, 'offense').spear, 6);
  assert.equal(equipmentFor(s, 'offense').armorOwned, 6);
  assert.equal(assignedWeapons(s, 'offense').militia, 20);
  assert.equal(equipmentFor(s, 'offense').weapons.militia, 30);
  assert.ok(validSave(s));
  const before = structuredClone(s);
  assert.throws(
    () =>
      applyAction(
        s,
        { type: 'buyKit', role: 'offense', kit: 'armor', count: 30, equip: true },
        NOW,
      ),
    /soldiers/,
  );
  assert.deepEqual(s, before);
});

test('unarmed unarmored casualties cannot destroy stock or protected reserve equipment', () => {
  const s = realm();
  s.troops.offense = 10;
  s.armyEquipment!.offense.armorOwned = 9;
  s.armyEquipment!.offense.armorEquipped = 2;
  const before = structuredClone(equipmentFor(s, 'offense').weapons);
  const lost = loseTroops(s, 3, 10);
  assert.deepEqual(lost, { weapons: 0, armor: 0 });
  for (const id of ['militia', 'spear', 'longbow', 'halberd'] as const)
    assert.equal(equipmentFor(s, 'offense').weapons[id] ?? 0, before[id] ?? 0);
  assert.equal(equipmentFor(s, 'offense').armorOwned, 9);
});

test('barracks expansion increases capacity beyond Citadel and remains capped and paid', () => {
  let s = explorer();
  s.level = 5;
  s.gold = 10_000_000;
  s.buildings.armory = true;
  const starting = s.gold;
  for (let i = 0; i < MAX_BARRACKS; i++) s = applyAction(s, { type: 'upgradeBarracks' }, NOW);
  assert.equal(stats(s).capacity, 160 * 2 ** MAX_BARRACKS);
  assert.ok(s.gold < starting);
  assert.throws(() => applyAction(s, { type: 'upgradeBarracks' }, NOW), /fully upgraded/);
  s = applyAction(s, { type: 'recruit', role: 'offense', count: 200 }, NOW);
  assert.ok(validSave(s));
  s.troops.offense = stats(s).capacity - s.troops.defense;
  assert.throws(
    () => applyAction(s, { type: 'recruit', role: 'offense', count: 1 }, NOW),
    /full/,
  );
});

test('war doctrine and fortifications provide paid permanent percentage bonuses', () => {
  let s = explorer();
  s.gold = 10_000_000;
  s.buildings.armory = true;
  s.buildings.watchtower = true;
  const base = stats(s);
  s = applyAction(s, { type: 'upgradeOffense' }, NOW);
  assert.equal(s.offenseLevel, 1);
  assert.equal(stats(s).attack, Math.floor(base.attack * 1.05));
  s = applyAction(s, { type: 'upgradeDefense' }, NOW);
  assert.equal(s.defenseLevel, 1);
  assert.ok(stats(s).defense > base.defense);
  for (let i = 1; i < MAX_COMBAT_UPGRADE; i++)
    s = applyAction(s, { type: 'upgradeOffense' }, NOW);
  assert.throws(() => applyAction(s, { type: 'upgradeOffense' }, NOW), /fully upgraded/);
  assert.ok(validSave(s));
});

test('expanded equipment slots allow complete armor sets and activate set bonuses', () => {
  const s = explorer();
  const before = stats(s);
  const slots = ['helm', 'chest', 'greaves', 'boots', 'shield'] as const;
  s.inventory = s.inventory.filter((item) => item.kind !== 'armor');
  s.equipped = s.equipped.filter((id) => s.inventory.some((item) => item.id === id));
  for (const [index, slot] of slots.entries()) {
    const item: Item = {
      id: `r${100 + index}`,
      name: `Briar ${slot}`,
      kind: 'armor',
      rarity: 'rare',
      power: 20,
      value: 160,
      slot,
      set: 'briarwarden',
    };
    s.inventory.push(item);
    s.equipped.push(item.id);
  }
  const after = stats(s);
  assert.equal(s.equipped.length, 6);
  assert.ok(after.heroDefense >= before.heroDefense + 95);
  assert.ok(after.defense > before.defense);
  assert.ok(after.personal > before.personal);
  assert.ok(validSave(s));
});

test('legacy saves migrate to doubling barracks, expanded dungeons and item slots', () => {
  const legacy = newGame(NOW) as GameState & { progressionVersion?: 2 };
  delete legacy.progressionVersion;
  legacy.barracksLevel = 20;
  legacy.cleared = [5, 5, 5];
  delete legacy.inventory[0].slot;
  delete legacy.inventory[1].slot;
  const migrated = accrue(legacy, NOW);
  assert.equal(migrated.progressionVersion, 2);
  assert.equal(migrated.barracksLevel, 5);
  assert.equal(migrated.cleared.length, 6);
  assert.equal(migrated.inventory[0].slot, 'weapon');
  assert.equal(migrated.inventory[1].slot, 'chest');
  assert.ok(validSave(migrated));
});

test('bank interest is fractional, bounded, retry safe and identical across tick batching', () => {
  let s = explorer();
  s.buildings.bank = true;
  s.bankGold = 4000;
  s.gold = 10000;
  const batched = accrue(s, NOW + 20 * TICK_MS);
  let sequential = s;
  for (let i = 1; i <= 20; i++) sequential = accrue(sequential, NOW + i * TICK_MS);
  assert.equal(sequential.bankGold, batched.bankGold);
  assert.equal(sequential.bankInterestRemainder, batched.bankInterestRemainder);
  assert.equal(accrue(batched, NOW + 20 * TICK_MS), batched);
  assert.ok((batched.bankInterestRemainder ?? 0) > 0);
  const full = accrue({ ...s, bankGold: 4999, bankInterestRemainder: 0.99 }, NOW + 144 * TICK_MS);
  assert.equal(full.bankGold, 5000);
  assert.throws(
    () => applyAction(full, { type: 'bank', direction: 'deposit', amount: 2 }, NOW + 144 * TICK_MS),
    /full/,
  );
  const upgrade = applyAction(s, { type: 'upgradeBank' }, NOW);
  assert.equal(bankCapacity(upgrade), 10000);
  assert.equal(bankRate(upgrade), 0.00002);
  const old = accrue({ ...s, bankGold: 100000 }, NOW + TICK_MS);
  assert.equal(old.bankGold, 100000);
  assert.ok(validSave(old));
});

test('initial oath is free and exactly one change is allowed each shared season', () => {
  let s = applyAction(newGame(NOW), { type: 'faction', id: 'iron' }, NOW);
  s = applyAction(s, { type: 'faction', id: 'tide' }, NOW);
  assert.equal(s.factionChangedSeason, seasonKey(NOW));
  assert.throws(() => applyAction(s, { type: 'faction', id: 'ashen' }, NOW), /once per season/);
  const next = applyAction(s, { type: 'faction', id: 'ashen' }, NOW + 28 * 86400000);
  assert.equal(next.faction, 'ashen');
  assert.equal(next.renown, s.renown);
  assert.ok(validSave(next));
});

test('companions grow incrementally to 500 with bounded quality and working abilities', () => {
  const s = explorer();
  const pet: Item = {
    id: 'r999',
    name: 'Silverfang Wolf',
    kind: 'pet',
    rarity: 'rare',
    power: 4,
    xp: 0,
    quality: 125,
    ability: 'scavenger',
    abilityRoll: 150,
    value: 160,
  };
  s.inventory.push(pet);
  s.equipped.push(pet.id);
  assert.equal(companionLevel(pet), 1);
  assert.equal(companionBonus(pet), 5.25);
  pet.xp = petXpFor(2);
  assert.equal(companionLevel(pet), 2);
  assert.equal(companionBonus(pet), 5.27);
  assert.equal(petAbility(s, 'ferocity', NOW), 0);
  assert.ok(petAbility(s, 'scavenger', NOW) > 0.025);
  pet.xp = MAX_PET_XP - 1;
  trainCompanion(s, true, true, NOW);
  assert.equal(companionLevel(pet), 500);
  assert.equal(pet.xp, MAX_PET_XP);
  assert.ok(companionBonus(pet) < 20);
  assert.ok(validSave(s));
  trainCompanion(s, false, false, NOW);
  assert.equal(petAbility(s, 'scavenger', NOW), 0);
  assert.equal(pet.injuredUntil, NOW + 30 * 60000);
  const broken = structuredClone(s);
  broken.inventory.at(-1)!.quality = 999;
  assert.equal(validSave(broken), false);
});

test('names block profanity and common evasions without rejecting innocent names', () => {
  for (const name of ['Fuck You', 'F U C K', 'Sh1thead', 'Nazi King', 'Faggot'])
    assert.equal(acceptableName(name), false, name);
  for (const name of ['Scunthorpe', 'Sir Douglas', 'Cassian', 'Jean-Luc', 'Night Watch'])
    assert.equal(acceptableName(name), true, name);
});

test('prepared woodland boss victory retains most gold after troop and gear replacement', () => {
  let s = explorer();
  s.level = 2;
  s.gold = 20000;
  s.buildings.blacksmith = true;
  s.cleared[0] = 4;
  s = applyAction(
    s,
    { type: 'buyKit', role: 'offense', kit: 'spear', count: 20, equip: true },
    NOW,
  );
  s = applyAction(
    s,
    { type: 'buyKit', role: 'offense', kit: 'armor', count: 20, equip: true },
    NOW,
  );
  const t = applyAction(
    s,
    { type: 'fight', mode: 'army', dungeon: 0, stage: 5, tactic: 'balanced', troops: 20 },
    NOW,
    () => 0.5,
  );
  const b = t.lastBattle!;
  assert.equal(b.won, true);
  const replacement = b.casualties * 60 + b.gearLost!.weapons * 70 + b.gearLost!.armor * 80;
  assert.ok(b.gold - replacement >= b.gold * 0.65, `${b.gold} spoils, ${replacement} replacement`);
});

test('settlement upgrades have bounded tribute payback and retain offline limits at every tier', () => {
  let s = realm();
  s.gold = 1_000_000;
  for (let level = 1; level <= 5; level++) {
    const before = stats(s).income;
    const gold = s.gold;
    s = applyAction(s, { type: 'upgrade' }, NOW);
    const added = stats(s).income - before;
    const cost = gold - s.gold;
    assert.ok(added > 0);
    assert.ok(cost / (added * 12) < 23);
    assert.equal(accrue(s, NOW + OFFLINE_CAP * 3).gold - s.gold, stats(s).income * 144);
  }
});

test('defense reports preserve held defenses, cap history and acknowledge only reviewed reports', async () => {
  const { resolvePvp } = await import('../functions/src/combat');
  const make = () => ({ game: realm(), revision: 0, enlisted: true, shieldUntil: 0 });
  const a = make(),
    d = make();
  a.game.level = 5;
  d.game.level = 5;
  d.game.troops.defense = 100;
  d.game.arms.defense = 100;
  delete d.game.armyEquipment;
  d.game.bankGold = 999;
  d.game.buildings.bank = true;
  const result = resolvePvp(a, d, 'target', 'balanced', NOW, rng);
  const report = result.defender.game.defenseReports![0];
  assert.equal(report.defended, true);
  assert.equal(report.goldLost, 0);
  assert.equal(result.defender.game.bankGold, 999);
  assert.equal(d.game.defenseReports, undefined);
  const g = result.defender.game;
  const read = applyAction(g, { type: 'readDefenseReports', through: report.seq }, NOW);
  assert.equal(read.defenseReadSeq, report.seq);
  assert.equal(read.gold, g.gold);
  assert.throws(
    () => applyAction(g, { type: 'readDefenseReports', through: report.seq + 100 }, NOW),
    /no longer available/,
  );
  g.defenseReports = Array.from({ length: 50 }, (_, i) => ({ ...report, seq: 50 - i }));
  g.seq = 100;
  const next = resolvePvp(a, { ...d, game: g }, 'target', 'balanced', NOW, rng).defender.game;
  assert.equal(next.defenseReports!.length, 50);
  const staleRead = applyAction(next, { type: 'readDefenseReports', through: 50 }, NOW);
  assert.ok(staleRead.defenseReports!.some((r) => r.seq > staleRead.defenseReadSeq!));
  assert.equal(validSave(staleRead), true);
});
