import { trainCompanion } from '../../src/game/companions';
import { accrue, powerFor, stats, loseTroops } from '../../src/game/engine';
import { pvpLoot } from '../../src/game/pvpLoot';
import type { GameState, Tactic } from '../../src/game/types';
import {
  PVP_COOLDOWN,
  PVP_SHIELD,
  type RealmDocument,
  type PublicRealm,
} from '../../src/game/online';

export function publicRealm(id: string, realm: RealmDocument): PublicRealm {
  const g = realm.game;
  const strength = stats(g);
  return {
    id,
    name: g.name,
    faction: g.faction,
    level: g.level,
    defense: strength.defense,
    power: strength.attack + strength.defense + 2 * (strength.heroAttack + strength.heroDefense),
    plunder: g.gold,
    enlisted: realm.enlisted,
    shieldUntil: realm.shieldUntil,
    renown: g.renown,
  };
}
function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function record(game: GameState, text: string, now: number) {
  game.activity = [
    { id: `r${++game.seq}`, text, kind: 'battle' as const, time: now },
    ...game.activity,
  ].slice(0, 40);
}
export function resolvePvp(
  attacker: RealmDocument,
  defender: RealmDocument,
  target: string,
  tactic: Tactic,
  now: number,
  rng: () => number,
) {
  const a = structuredClone(attacker),
    d = structuredClone(defender);
  a.game = structuredClone(accrue(a.game, now));
  d.game = structuredClone(accrue(d.game, now));
  const s = a.game,
    enemy = d.game;
  check(a.enlisted && d.enlisted, 'Both realms must be enlisted for PvP.');
  check(s.faction && enemy.faction, 'Choose a realm that has joined a faction.');
  check(!s.expedition, 'Extract from your expedition before attacking.');
  check(s.troops.offense > 0, 'Assign troops to offense before attacking.');
  check(
    Math.abs(s.level - enemy.level) <= 1,
    'Attack realms within one settlement tier of your own.',
  );
  check(d.shieldUntil <= now, 'This realm is protected by a recovery shield.');
  const history = s.opponents[target];
  check(
    !history || now - history.lastAttack >= PVP_COOLDOWN,
    'Wait ten minutes before attacking this realm again.',
  );
  check(s.ap >= 8, 'You need 8 AP for a skirmish.');
  const exposed = enemy.gold;
  check(exposed > 0, 'This realm has no exposed gold.');
  s.ap -= 8;
  const power = powerFor(s, 'pvp', tactic),
    defense = stats(enemy).defense;
  const roll = 0.85 + 0.3 * rng(),
    finalPower = power * roll,
    won = finalPower >= defense;
  const loot = pvpLoot(exposed, finalPower, defense, won ? rng() : 0);
  const gold = won ? loot.gold : 0;
  const casualties = won
    ? 0
    : Math.min(
        Math.max(0, s.troops.offense - 1),
        Math.floor(
          s.troops.offense * (tactic === 'aggressive' ? 0.2 : tactic === 'guarded' ? 0.05 : 0.1),
        ),
      );
  const gearLost = loseTroops(s, casualties);
  s.gold += gold;
  enemy.gold -= gold;
  const renown = won && s.faction !== enemy.faction ? 20 : 0;
  s.renown += renown;
  trainCompanion(s, won, false, now);
  if (won) {
    s.wins++;
    d.shieldUntil = now + PVP_SHIELD;
  }
  a.shieldUntil = 0;
  // Only cooldowns still in force need to occupy the private realm document.
  s.opponents = Object.fromEntries(
    Object.entries(s.opponents).filter(([, v]) => now - v.lastAttack < PVP_COOLDOWN),
  );
  s.opponents[target] = { lastAttack: now, plundered: gold };
  s.lastBattle = {
    id: `r${++s.seq}`,
    title: enemy.name,
    mode: 'pvp',
    won,
    power,
    enemy: defense,
    roll,
    finalPower,
    tactic,
    gold,
    renown,
    casualties,
    gearLost,
    items: [],
    lostItems: 0,
    time: now,
    lines: [
      `Your offensive army marched on ${enemy.name}. Your defenders stayed home.`,
      `${power} attack met ${defense} defense.`,
      `A ${roll.toFixed(2)}× roll produced ${Math.floor(finalPower)} strength.`,
      won
        ? `${loot.name}: ${gold} gold captured (${((gold / exposed) * 100).toFixed(1)}% of exposed treasury). Bank savings were untouched. Their next hour is shielded.`
        : `Your army withdrew with ${casualties} casualties.`,
    ],
  };
  record(s, `${won ? 'Victory' : 'Defeat'} at ${enemy.name}. ${gold} gold secured.`, now);
  record(
    enemy,
    `${s.name} attacked your realm. ${won ? `${gold} gold lost; recovery shield active for one hour.` : 'Your garrison held. No gold was lost.'}`,
    now,
  );
  enemy.defenseReports = [
    {
      seq: ++enemy.seq,
      attackerName: s.name,
      time: now,
      defended: !won,
      goldLost: gold,
      troopsLost: 0,
      weaponsLost: 0,
      armorLost: 0,
      attackPower: Math.floor(finalPower),
      defensePower: defense,
      shieldUntil: d.shieldUntil,
    },
    ...(enemy.defenseReports ?? []),
  ].slice(0, 50);
  return { attacker: a, defender: d };
}
