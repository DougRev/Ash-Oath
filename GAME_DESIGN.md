> Current implementation update: see MECHANICS.md for the shipped dungeon party, weapon, casualty, companion and discovery rules. The design ideas below are historical proposals where they differ.

# Ash & Oath

A home worth protecting. A war worth choosing. An expedition worth risking.

## Product intent

A persistent browser strategy RPG inspired by the army economics and attack-versus-defense structure described in the [Kings of Chaos official guide](https://www.kingsofchaos.com/helpv2.php), the user’s Lords of Lords reference, and idle dungeon progression. This is an original setting and interface, not a reproduction of either game.

The player starts as the Wanderer with a homestead, a handful of militia, and enough gold to make meaningful choices immediately. Four factions demand an oath. The world is hostile, but the first session is welcoming: choose a banner, improve home, send a raid, equip a drop, and make one contribution to the war.

## First playable scope

The repository now includes a deployed Firebase multiplayer alpha: Google and email/password accounts, server-owned gold/AP and loot, cloud progress, real opt-in PvP, and shared founding-campaign renown. The full stack is tested with Firebase emulators and live backend checks. It uses the existing Standard Firestore database and Blaze plan. The original single-player demo remains separately available. See README for exact implemented features and validation commands.

Basic accounts, tier-bounded opponent discovery, transactional PvP, and server-issued dungeon/chest rewards are implemented. Guilds, synchronized territory, mature matchmaking, anti-collusion controls, population-aware scoring and automatic seasonal rollover remain the longer-term service design below. Local demo saves are never imported into online accounts.

## The daily rhythm

1. Return to your illustrated home. Read the tribute earned while away.
2. Decide where gold creates the most value: income, recruits, equipment, defenses, or a chest.
3. Spend the shared AP budget on an army raid, an opposing realm, or a personal expedition.
4. Inspect a concise battle recap: deployed strength, enemy strength, tactical advantage, roll, result, and rewards.
5. Bank loot, improve your loadout, and advance the faction’s war effort.

Gold and 5 AP arrive together every 5 minutes. AP caps at 60. Offline tribute caps at 12 hours. Avoid click-to-collect taxes: ordinary income is automatic. An explicitly labeled local demo time control makes the economy immediately testable.

Gold is the only spendable currency. No premium gems, paid AP, paid power, or cash loot chests. Renown measures seasonal participation; it cannot be spent.

## Home progression

| Tier       |  Upgrade gold | Gold / 5 min | Troop capacity |
| ---------- | ------------: | -----------: | -------------: |
| Homestead  | Starting tier |          120 |             20 |
| Settlement |           800 |          180 |             30 |
| Village    |         2,000 |          300 |             45 |
| Castle     |         6,000 |          650 |             70 |
| Stronghold |        16,000 |        1,400 |            110 |
| Citadel    |        40,000 |        2,800 |            160 |

The armory recruits militia and assigns them to offense or defense. The blacksmith supplies one weapon per attacker and one shield per defender. Spare equipment never multiplies a single soldier’s power. Defenders do not join outgoing attacks or dungeons. A growing settlement opens the trader and watchtower. Village-tier players can personally lead expeditions.

Keep construction instant in the prototype. In a live release, use short early construction times and at most one transparent queue; avoid mandatory login alarms and overlapping timers.

## Four oaths

| Faction       | Identity                                | Starting specialization       |
| ------------- | --------------------------------------- | ----------------------------- |
| Iron Covenant | Order through steel; hold the old roads | +5% army attack               |
| Verdant Pact  | Defend the living land                  | +5% tribute income            |
| Ashen Order   | Recover knowledge from the ruins        | +10% personal combat strength |
| Tidebound     | Free cities, patient defenders          | +5% realm defense             |

Choose once per season. Show the mechanical bonus before committing. A future release should permit one early oath correction before the first competitive action; do not sell faction switches.

## Combat and tactics

Attacks resolve from deployed attack versus defending strength, multiplied by a bounded 0.85–1.15 roll. Show the possible range and an estimated win probability before paying AP. Reckless attacks are allowed with clear risk. A victory at equal strength is uncertain; a prepared force should reliably beat a much weaker enemy.

Three tactics support intentional preparation: balanced; aggressive (+15% strength, greater defeat casualties); guarded (-10% strength, reduced defeat casualties). Losses are small, capped, and shown beforehand. Never use defense troops to silently pad raid strength.

Army raids cost 5 AP. PvP costs 8 AP. Personal stages cost 7 AP. Losing still spends AP. Low AP must show the exact shortfall and next regeneration time.

### Competitive PvP design for live multiplayer

Match by season bracket, military power, and activity, not gold alone. Scout information includes defense estimate, plunder ceiling, protection status, and cooldown. Resolve one atomic server-side transaction. A stolen portion of exposed gold is capped; a protected treasury floor preserves the ability to rebuild. Never destroy someone’s house or steal their hero inventory through ordinary PvP.

Use newcomer protection, target cooldowns, diminishing rewards for repeats, same-faction restrictions, bounded power brackets, and validated anti-collusion signals. Attacking voluntarily ends newcomer protection after an explicit disclosure. Wounded units can be recovered cheaply. Avoid permanently killing an offline player’s entire economy.

Demo opponents remain simulated. Firebase PvP uses enlisted accounts within one tier, a protected 1,000-gold reserve, 20% exposed-gold plunder, a ten-minute repeat cooldown, and a one-hour defender shield after a loss. Attacking ends your shield; leaving PvP requires one hour since the last outgoing attack. Gold transfers are atomic and require verified email and current server eligibility.

## Dungeon progression

Six authored areas form the current campaign: Whispering Woods, Hollowcrypt, Ember Citadel, Frostmere Bastion, Sunken Dominion and Starfall Sanctum. Each has five stages; stage five is a boss. A cleared stage stays replayable. Defeating an area’s boss opens the next area. Enemy strength and reward quality rise together. The first three areas have final environment and boss art; the final three deliberately use code-native atmospheric scenes until their media pass is produced.

Army mode banks gold and drops after every stage, with capped troop casualties on defeat. Personal mode unlocks at Village. The player leads an offensive party, builds an expedition satchel, and chooses extract or push deeper. Defeat loses the satchel and equipped hero items, including equipped runes and pet; stored inventory and the settlement survive. The next attempt begins with the base character, so the loss is meaningful without deleting the account.

Keep the risk acknowledgment beside the launch action. A battle recap should reveal the actual roll. Animation is a short presentation of an already-resolved transaction, so refreshing cannot reroll or duplicate rewards. Personal loot remains unbanked across reloads until extraction or loss.

## Loot, runes, and pets

Weapons improve hero attack. Helm, chest, greaves, boots and shield pieces improve hero defense. Three five-piece dungeon sets activate bonuses at two, three and five equipped pieces, creating a reason to mix raw power against set completion. Runes occupy two slots and improve army and character strength, capped at +30% in this slice. Duplicates can be sold for gold. Rare companion drops are a collection goal with a modest passive bonus, not a required random gate.

Show drop probabilities before the raid, including exact rune and pet chances. Higher areas improve both. Gear rarity controls stat ranges and sale values. Compare a new item against the equipped slot. Equip and sell are separate actions; equipped items cannot be sold accidentally.

Trader chests cost earned gold only. Three tiers show price, rarity probabilities, and an epic-or-better guarantee by the tenth chest. Persist the guarantee counter before revealing loot. The reveal uses a short burst of light, a readable item card, an equip action, and an instant/reduced-motion path. No fake near-misses, endless roulette, or monetized urgency.

Direct blacksmith purchases provide reliable power. Chests provide variety and discovery; players never need to gamble to progress. The long-term production design adds deterministic crafting recipes purchased with gold and unlocked through boss clears.

## Seasons: why factions fight

Recommended live cadence: 28 days, then a short intermission. Days 1–3 establish supply; days 4–21 open rotating regional objectives; days 22–28 activate the capital siege. Several objective windows across time zones count, and players have contribution alternatives outside those windows.

Faction score comes from three pillars: 50% territorial objectives, 30% contested military operations, and 20% capped logistics plus dungeon-boss support. Gold donations have a daily personal cap. Farming the same enemy or stage gives sharply diminishing competitive score. Dungeon players can matter without being forced to attack other people.

Score by population-normalized contribution plus controlled objectives, with a documented minimum population floor and cap. Publish the formula before the season. Do not let a faction win simply by collecting the most accounts. Prevent late-season banner changes and audit suspicious cooperative wins. These require production telemetry and playtesting; the founding Firebase campaign records shared renown as an explicitly simpler alpha participation score; it does not implement this territory formula yet.

At season end, the winning faction shapes next season’s world: its banner occupies the capital, a short chronicle records named contributions, and its chosen reconstruction project changes a public region for everyone. Winners earn an exclusive cosmetic banner, title, home decoration, and hall-of-fame record. All active players earn participation rewards at transparent milestones.

The only competitive carryover to consider is a capped convenience benefit, such as +10% offline storage duration for the first week. It does not increase combat strength, AP regeneration, or gold per minute. Give trailing factions an equivalent catch-up quest. Victories should create history, not compound military dominance.

Reset seasonal gold, army, buildings, faction choice, territory, and competitive equipment. Retain cosmetic collections, discovered item appearances, pet appearances, chronicles, and account achievements. A separate eternal realm can preserve full economic progression for players who dislike resets. The prototype does not reset player progress automatically.

## Production service boundary

Use authenticated accounts and an authoritative backend before inviting competitive players. Persist players, season memberships, balances, equipped item instances, troops, settlements, dungeon progress, expeditions, battles, contribution events, targets, and immutable economy ledger entries. Resolve AP accrual, purchases, drops, combat, and extractions in database transactions using server timestamps and a cryptographically secure random source.

Every mutation receives an idempotency key and expected state revision. Lock or serialize outgoing combat and the attacked realm; validate ownership and availability inside the transaction. Never trust frontend power, loot rolls, gold, tick time, opponent stats, or user-supplied season IDs. Keep consumed AP and lost equipment committed even when an animation is interrupted. Return a replayable battle receipt.

Run scheduled territory settlement and seasonal close as resumable jobs. Snapshot the final leaderboard before rollover. Build administrative rollback around ledger entries, not arbitrary balance edits. Add abuse limits, economy dashboards, multi-device conflict handling, save migrations, backups, and operational alerting.

## Experience and accessibility

The overview offers one primary action, a visible next-chapter checklist, and a cinematic view of home. Settlement, Army, Dungeons, War Room, and Trader have dedicated surfaces using one consistent UI vocabulary. Battle preparation explains consequences before execution. Rewards can be inspected after the animation. Status is conveyed with labels and icons as well as color.

Use keyboard-accessible controls, focused dialogs with Escape support, polite feedback announcements, strong contrast, reduced-motion support, mobile navigation, and generous touch targets. Sound is optional and off initially. No action depends on listening to audio or watching a long animation.

## Validation and balance work after the slice

Measure first raid time, first session decisions, gold sources versus sinks, AP saturation, loss recovery time, dungeon bottlenecks, chest value against direct equipment, faction power spread, and returning-player retention. Simulation and actual player sessions must tune every initial number before a live season. Test duplicate requests, clock tampering, offline caps, target locking, race conditions, refresh during battle, item loss, and seasonal job retries before online launch.
