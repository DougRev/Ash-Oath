# Ash & Oath: current game mechanics

Updated September 14, 2026. This describes the playable alpha, including the progression update. Existing accounts keep their progress and equipment.

## Economy and settlement

Gold buys construction, recruits, unit equipment, chests and companion treatment. Every five minutes the server awards 5 AP and your settlement's tribute. AP stops at 60; offline tribute is capped at 12 hours. There is no scheduled per-player job: rewards settle when you return or perform an action.

| Tier | Upgrade cost | Gold / five minutes | Troop capacity |
|---|---:|---:|---:|
| Homestead | Starting home | 30 | 20 |
| Settlement | 800 | 65 | 30 |
| Village | 6,000 | 140 | 45 |
| Castle | 22,000 | 290 | 70 |
| Stronghold | 65,000 | 600 | 110 |
| Citadel | 160,000 | 1,200 | 160 |

Factions: Iron adds 5% army attack; Verdant adds 5% tribute; Ashen adds 10% personal expedition strength; Tide adds 5% realm defense. The watchtower adds 30 base realm defense and opens the war/defense screen.

## Army, weapons and armor

The Army tab shows offense and defense together: troop counts, combat power, weapon and armor coverage, and the assigned weapon mix. Recruit, transfer, and expand barracks here. The Armory tab separates inventory management into a kit catalog and an order review: choose a force, select a kit, then equip stored gear, buy gear, or return gear to storage. The review shows costs, assignment changes, and any weapons being replaced before you confirm. Character equipment remains in Your character.

Recruits cost 60 gold and always arrive unarmed and unarmored, even when spare equipment exists. Starting militia retain their starter weapons. Reassignment moves soldiers unarmed; their equipment returns to the source role's storage.

Each role has a separate inventory showing **Owned**, **Equipped**, and **Stored** kits. Buy to storage keeps kits unassigned; Buy & equip purchases and assigns them atomically. Equipping stored kits is free. Each role can equip several weapon types at once. Assigning more of one type fills unarmed soldiers first, then returns only enough of the weakest other kits to storage. You never repurchase gear merely to switch back. Equipment storage holds up to 1,000 of each kind per role.

| Weapon | Unlock | Armed strength | Price per kit |
|---|---|---:|---:|
| Militia blades | Blacksmith | 12 | 50 |
| Sentinel spears | Settlement | 15 | 70 |
| Ranger longbows | Village | 18 | 100 |
| Royal halberds | Castle | 22 | 150 |

The Blacksmith is required for purchases. There is no refit fee. A matching weapon grants a share of the dungeon counter bonus proportional to its coverage of the deployed party. Unarmed soldiers contribute 4 strength.

Optional padded armor costs 80 gold per soldier and unlocks at Settlement with the Blacksmith. Each equipped garrison armor kit adds 4 base realm defense. Armor on the deployed offensive party reduces dungeon casualty rates by up to 20%, scaled by coverage. Armor and companion casualty reductions multiply. Fractional casualties still round up.

Casualties permanently destroy the fallen soldiers' assigned weapons and armor; stored kits stay owned. Replacements must be equipped manually. Expedition offensive equipment cannot be changed before extraction. Defensive equipment can still be managed.

Existing saves migrate on their next game action. Current weapon kits are preserved, excess assigned kits move to storage, and weapon types found in retained refit history are credited as owned. Refits no longer present in the saved history cannot be reconstructed automatically.

## Dungeon deployment and progression

There are three regions, each with five stages. Clear a stage to open the next; kill the boss to open the next region. Cleared stages remain farmable.

Choose any available number of offensive soldiers before departure. For example, with 100 attackers you can deploy 20 and leave 80 safe at home. Only that party contributes army strength and takes casualties. Equipment is drawn from the role's available kits, up to one per deployed soldier.

- Army raid: 5 AP; gold, gear and renown bank immediately after a win.
- Lead personally: Village required; 7 AP; your character joins the selected party; +50% gold. Rewards stay in a satchel until extraction.
- Personal party size is locked. Survivors carry on; recruits cannot reinforce it mid-expedition. Extract at any point for free. If no soldiers survive a victory, extraction is your remaining choice.
- Losing a personal battle destroys equipped non-companion items and everything in the satchel. Stored inventory, home treasury, buildings and undeployed troops are safe. Your bonded companion survives injured. A newly found companion still in the satchel is unbanked loot and can be lost.

## Formations, enemies and forecasts

| Formation | Base strength | Dungeon casualty multiplier | Counters |
|---|---:|---:|---|
| Balanced | 100% | 1.0 | Fortified |
| Aggressive | 115% | 1.7 | Channeling |
| Guarded | 90% | 0.5 | Charging |

A matching formation adds 20% strength and multiplies casualties by 0.75. Enemy behavior cycles by region and stage and is shown before departure. Matching offensive weapons add up to 10% strength, proportional to the fraction of the deployed party carrying that weapon. These bonuses multiply, so choice changes the actual server outcome rather than only the flavor text.

The server applies a uniformly random 0.85–1.15 battle roll. Victory occurs when final party strength meets enemy endurance. The forecast uses this same formula and selected troop count.

Personal strength uses 65% of the selected party's army strength, plus twice the combined character attack and defense, with equipped bonuses. Hero attack starts at 20 plus weapon power; defense starts at 10 plus armor power. Character equipment does not risk loss on army-only raids.

## Casualties, including victories

Every successful dungeon battle with deployed soldiers costs at least one soldier. Bosses use a higher loss rate. Players see qualitative danger; only administrators see exact potential casualty counts.

Victory base rate is 4% on ordinary stages and 8% on bosses. Apply formation, counter, armor coverage and healthy companion modifiers. The final victory loss count depends on enemy strength relative to rolled party strength, bounded between administrator-only minimum and maximum. The minimum is based on 50% of the adjusted base rate. Apply the enemy-to-final-power ratio to the unrounded adjusted loss base, then round up once. Losses never exceed the deployed party.

Defeat loses 45% of the deployed party before those modifiers, rounded up. Stronger preparation can reduce losses but cannot remove all risk. Replacing a soldier costs 60 gold, plus the cost of any destroyed weapon and armor.

Battle reports show one decisive exchange, not a multi-round or real-time combat simulation. Character and army damage add to the rounded-down final strength used against enemy endurance. Enemy troop damage is the resolved casualty count times 12 endurance per soldier. Reports, rewards and losses are saved together; reloading or retrying cannot reroll them.

## Companions

Companions are dungeon discoveries: 1% per Woods victory, 2% in Hollowcrypt, 4% in Ember Citadel. They must be extracted if found on a personal expedition, then equipped in the character inventory. One can be equipped at a time.

A healthy equipped companion adds its listed percentage to army/character strength and reduces dungeon casualties by that percentage. All five rarities can now drop, with harder regions favoring better companions. Base bonuses are 2/3/4/5/6 percent by rarity, plus a separately rolled 0.00-2.00 percentage points of innate quality.

Level cap is 500. Each level adds 0.02 percentage points of strength/protection. Total XP to level L is `100*(L-1) + 2*(L-1)*(L-2)`. Healthy equipped pets gain 20 XP per win, 40 per dungeon boss, or 5 per defeat across dungeons, AI raids and real PvP. XP caps at the level-500 threshold. Injured pets earn no XP and provide no bonuses.

Each newly found pet rolls one equally likely permanent passive ability and a separate 0.00-2.00 percentage-point ability roll. The ability starts at 1% plus that roll, then gains 0.004 percentage points per level:

- Ferocity: additional army attack multiplier.
- Guardian: additional dungeon casualty reduction multiplier.
- Scavenger: additional dungeon gold multiplier, before the result is rounded down. This never mints extra gold in real PvP.

Existing companions retain their rarity, power and XP; missing quality and ability-roll fields count as zero, and their default ability is Guardian. Five species have individual portraits. Pets survive defeat injured for 30 minutes. Wait or pay 120 gold for treatment at home. A bonded companion never permanently dies; an unextracted discovery remains at risk in the satchel. Personal-expedition loadouts remain locked.

## Loot and discovery

Ordinary stages have a 65% gear-drop chance; bosses guarantee rare-or-better gear. Higher regions improve rarity. Gold varies by ±10% around the stage reward before the personal-expedition bonus. Chests contain 50% weapons and 50% armor internally. Dungeon loot pools and undiscovered runes remain hidden. Chest rarity odds and guarantee progress are now visible before purchase. Battle loot shows its power difference from currently equipped character weapons/armor; personal loot must be extracted before equipping. The tenth consecutive chest without epic-or-better guarantees at least epic.

Runes remain in dungeon loot but are not advertised to undiscovered players: no empty rune tab, slot, stat, onboarding mention or dungeon probability row. A first discovery reveals their interface; discovery persists even after selling or losing the item. Existing rune owners keep access. This is a player-facing discovery system, not a claim that client source code cannot reveal the feature.

Developer spoiler: independent rune drop rates remain 4%, 8%, 14% across the three regions. Equip up to two, with a combined bonus cap of 30%. A rune carried by the character can be lost on personal defeat.

## PvP and seasons

PvP remains opt-in and uses the entire offensive army. It requires a faction, Settlement tier and verified email. Attack enlisted realms, including your own faction, within one settlement tier for 8 AP. All treasury gold is exposed; victory margin and a separate random roll determine the captured share. Only bank savings are protected. Victims receive a one-hour shield; repeat attacks on one target require ten minutes. Attacking drops your shield. Leaving PvP is locked for one hour after your last outgoing attack.

PvP formation rules remain separate: Aggressive adds 15% strength and loses up to 20% on defeat; Balanced loses up to 10%; Guarded trades 10% strength for at most 5% losses. No PvE enemy counters or victory casualties apply to PvP. At least one attacker survives PvP defeat; garrisons and buildings are preserved.

The Founders' Campaign runs September 11–October 9, 2026 UTC. Dungeon victories, PvP and capped gold contributions earn shared faction renown. Territory control, population balancing, automatic seasonal resets and next-season reward delivery are not implemented yet.

## September 12 economy rebalance

Starting gold (1,800), recruitment (60), equipment, buildings, AP regeneration and dungeon rewards remain unchanged. Income grows more slowly and later settlements cost more. Existing treasuries and unlocks are preserved. Uncollected tribute settles at the new rate when next claimed, subject to the existing 12-hour cap.

Exact casualty forecasts are removed from player preparation screens; actual losses remain in battle reports. Admins can select a player and calculate server-authorized forecasts across every stage, including replacement costs. PvP casualty rules remain unchanged.

A passive player who immediately buys Settlement and saves every remaining coin reaches Citadel after approximately 164 hours (6.8 days), versus 7 hours previously. This assumes collection at least every 12 hours, no faction income bonus, no raids and no spending. Raids and sales shorten this; recruitment, gear and chests compete with expansion. Starting equipment plus affordable recruitment preserves an early recovery route.

Historical September 12 balance (superseded by the current 4%/8% victory rates and increased rewards): victory base casualty rates doubled; the minimum pressure floor increased from 35% to 50% of the adjusted rate. Defeat base losses increased from 25% to 45%. Guarded formation, counters, armor and companions still multiply these rates. Rewards were retained so careful expeditions remain worthwhile instead of cutting income and raid returns simultaneously.

## Bank and battlefield visibility (September 13)

The Bank unlocks at Settlement and costs 1,000 gold. Players manually deposit treasury gold; a 5% fee rounded upward is destroyed, with the remainder credited to protected savings. Withdrawals are free. Savings earn small, level-based interest and must be withdrawn to spend; see bank upgrades below. PvP only transfers exposed treasury gold; bank savings, inventory and expedition satchels are never included. Existing saves start with zero savings and no bank. Transfers share the same transaction, revision and receipt protection as all other actions.

The War Room now shows up to 50 nearby aligned realms, including peaceful players. Not enlisted means that player has not opted into PvP; browsing the battlefield does not enlist someone. Both sides must enlist, have a faction and be within one tier to fight. Same-faction raids transfer gold but earn no renown. The defender shield remains. The automatic treasury reserve was subsequently removed.

The initial fixed 35% plunder model was subsequently replaced by victory-margin loot. Protected bank savings do not change this amount. PvP redistributes existing gold; tribute and dungeon rewards continue creating gold. There are no minted victory bonuses that alternate accounts can farm.

## Mixed weapons and AI strongholds (September 13)

Army weapon assignments are stored by type and count. One halberd plus five militia blades arms six soldiers; weapon power is summed individually. Each gear type has its own order quantity, separate from recruitment and transfers. Buy to storage keeps kits unassigned; Buy & equip purchases and assigns them atomically. Orders show total prices, shortage and affordability shortcuts, and replacement previews. Equipment changes are free and preserve owned inventory. Smaller dungeon parties select the strongest assigned weapons first. Casualties remove unarmed soldiers first, then the weakest weapons within the deployed party; their assigned weapons and armor are destroyed permanently. Armor covers the strongest deployed soldiers first; unarmored soldiers fall first. Stored inventory and reserve equipment are safe. Existing single-type loadouts migrate on the next action without changing their strength.

Eighteen clearly labeled AI strongholds provide raiding income while the player population grows: three difficulty ranks at every settlement tier. Targets within one tier can be raided with the full offensive army for 8 AP, without real PvP enlistment or verified-email requirements. AI targets do not have Authentication accounts or appear in the real player directory. Each account has its own 30-minute target cooldown and 12 paid victories per UTC day. Defeat consumes AP, starts the cooldown and uses PvP formation casualty rules; it does not consume a paid victory. Once the daily victory limit is reached, further AI attempts are blocked until midnight UTC.

Base bounties by tier are 400 / 800 / 1,400 / 2,200 / 3,400 / 5,000 gold. The seasoned and veteran ranks multiply these by 1.5 and 2.2. Rewards are fixed and server-controlled. AI wins award no season renown, do not break real-player shields and do not change enlistment. Gold arrives in the treasury and can be deposited in the bank normally. Twelve AI attempts cost 96 AP, so repeated raiding also depends on regeneration. Bounties deliberately make active progress faster than passive saving.

## Victory-margin PvP loot

All unbanked treasury gold is exposed, including balances below 1,000. The server accrues both realms before resolving combat. Divide rolled attacker strength by current defender strength: a narrow win (1.0 to under 1.2) captures 15-40%; solid (1.2 to under 1.5) 40-70%; decisive (1.5 to under 2.0) 65-90%; dominant (2.0+) 90-98%. A separate secure random roll chooses within the band. Zero-defense realms count as dominant wins against a positive army. Capture rounds down, with a minimum of one gold from a nonempty treasury; tiny balances may therefore be emptied.

Banks remain untouched. Failed attacks steal nothing. Successful raids atomically transfer the exact amount and retain the existing defender shield. Stored receipts prevent combat or loot rerolls. Public profiles show last-seen exposed treasury rather than a guaranteed payout. A stale zero estimate no longer disables scouting; the server checks the current accrued treasury before accepting an attack. Opt-in, faction, tier, AP and cooldown rules remain.


## Progression additions (September 14)

### Barracks

The Armory includes barracks expansions. Each upgrade adds 20 beds on top of settlement capacity, up to 20 expansions (+400 beds; 560 at Citadel). Upgrade cost is rounded `600 * 1.35^currentExpansionLevel`. Recruitment and equipment orders support expanded armies, with an order/storage limit of 1,000. Troop capacity still limits recruitment. Upgrades do not grant free soldiers or equipment.

### Bank upgrades and interest

The existing 1,000-gold bank starts at level 1 with 5,000 capacity. Maximum level is 8. Each upgrade doubles capacity, costs `2,000 * 2^(currentLevel-1)` gold and increases the interest rate by 0.001 percentage points per five-minute turn. Level 8 holds 640,000 and pays 0.008% per turn. Deposits still lose 5% rounded up; withdrawals remain free.

Interest compounds per tick into protected savings, retains fractional gold between accruals, stops at capacity and shares the 12-hour offline cap. Upgrades first settle time at the old rate. Replaying a request cannot collect interest again. Older savings above the new capacity are preserved, but receive no interest or new deposits until there is room. No existing savings are confiscated.

### Current dungeon gold (before variance and bonuses)

| Region | Stage 1 | Stage 2 | Stage 3 | Stage 4 | Boss |
|---|---:|---:|---:|---:|---:|
| Whispering Woods | 180 | 260 | 380 | 520 | 850 |
| Hollowcrypt | 600 | 780 | 1,000 | 1,350 | 2,100 |
| Ember Citadel | 1,500 | 1,900 | 2,400 | 3,200 | 4,800 |

Winning casualties still permanently destroy equipped soldier gear. The lower victory rates, single rounding step and higher gold rewards improve net returns; defeat remains 45% before modifiers. Oversized or aggressive parties still have real replacement costs. In the regression scenario, a prepared 20-spear/armor Woodland boss party retains at least 65% of its gold after replacing casualties and lost kits, before selling any loot.

### Chest odds

| Chest | Common | Uncommon | Rare | Epic | Legendary |
|---|---:|---:|---:|---:|---:|
| Wayfarer (250 gold) | 55% | 30% | 12% | 2.5% | 0.5% |
| Warlord (800 gold) | 10% | 38% | 40% | 10% | 2% |
| Sovereign (2,400 gold) | 0% | 10% | 50% | 32% | 8% |

After nine consecutive openings below epic, the next opening upgrades any sub-epic roll to epic. Legendary odds are unchanged. The counter is shared across all chest tiers and resets on epic or legendary loot. Chests contain equipment only.

### Rankings, allegiance and names

The War Room shows the global top 50 by saved overall power, across all tiers and enlistment states. Power is army attack + realm defense + twice character attack and defense. Only equipped bonuses contribute; stored loot and wealth do not inflate power. Ties share rank. Rankings update as realms save and may be stale for inactive players; they are not live combat forecasts.

A first faction choice does not consume the change allowance. A player may change faction once per shared 28-day window anchored to September 11, 2026 UTC. Changing during a personal expedition is blocked. Previously earned campaign points stay with the original faction; only future points go to the new one. These windows do not automatically reset settlements or award future-season rewards.

Factions are seasonal scoring teams, not automatic non-aggression pacts. Same-faction PvP is allowed with no renown. All other opt-in, verification, tier, shield and cooldown rules still apply. Mutual alliance invitations and clans are not implemented; an eventual alliance should require both players' consent and a visible break-notice period, rather than allowing surprise betrayal.

Names are filtered server-side on creation and rename for explicit English profanity/abuse and common spacing, accent and leetspeak evasions. Word boundaries reduce innocent-name false positives. Filtering is a first layer, not a complete multilingual moderation service; existing administrative suspension tools remain available.


## September 15: defense reports and settlement value

Real player attacks save a private, structured defense report in the same transaction as the gold transfer. Keep the latest 50 reports, including successful defenses. Reports show attacker name at the time, time, outcome, rolled attack/defense, gold/troop/weapon/armor losses and the shield expiration granted. Current PvP does not kill defenders or destroy their equipment. An unread banner appears when the realm loads and updates during play; explicit acknowledgement is saved across devices and never deletes history. General activity retains older attack messages; detailed reports begin with this release.

Settlement costs and capacities are unchanged; tribute is now 30/65/140/290/600/1,200 per five minutes. Incremental tribute repays the five upgrades in approximately 1.9/6.7/12.2/17.5/22.2 collected hours before faction bonuses (previously 4.4/20/45.8/90.3/166.7). Offline income remains capped at 12 hours per absence. Existing realms receive the new rates on their next accrual, including pending ticks within that cap. These are income-only payback estimates; spending, raids, bank interest and loot change actual balances.
