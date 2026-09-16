# Economy review - September 12, 2026

## Progression target

The old economy multiplied passive income 23-fold from Homestead to Citadel, while allowing a player starting with 1,800 gold to buy Settlement immediately and reach Citadel in about 6.6 hours of perfect saving. It made troop replacement and equipment increasingly trivial.

New income per five minutes: 30 / 45 / 70 / 110 / 170 / 250. Tier purchase prices: 0 / 800 / 6,000 / 22,000 / 65,000 / 160,000. Capacity and military unlocks are unchanged. Perfect passive saving now takes approximately 163 hours after the immediate Settlement purchase. Checking less often than every 12 hours makes this longer. This is a baseline, not a promise about active play.

## Why rewards and basic purchases remain unchanged

New recruits still cost 60 gold. Recovered weapons and armor can equip replacements at no additional purchase cost. Starting gold remains 1,800, so Settlement + Armory + Blacksmith leaves 300 for five replacements. A Homestead earns a replacement soldier every ten minutes; a Settlement earns one in roughly seven minutes. Recovery is slower but always available through tribute, even after losing the entire offensive army.

Dungeon base gold still ranges from 95 to 2,500, with personal runs carrying a 1.5 multiplier and extraction risk. Gear sale values remain 45 / 80 / 160 / 380 / 900 by rarity. Low-tier raids are modest gold sources; advanced raids and item sales are the active route through larger construction costs. AP still regenerates at 5 per five minutes, capped at 60: at most 12 sustainable army raids per hour, versus about 8.6 personal encounters, before considering player attention and casualties.

Chests remain optional sinks at 250 / 800 / 2,400, rather than a prerequisite for army readiness. Building prices and weapon unlocks remain accessible. The existing 2,000-gold daily logistics contribution cap becomes a meaningful choice against military replacement and expansion. PvP plunder and its 1,000-gold reserve are unchanged; a large saved treasury remains exposed for enlisted players.

## Cost of combat

Ordinary victory base casualties increase from 6% to 12%; boss victories from 10% to 20%; defeat from 25% to 45%. The minimum victory pressure increases from 35% to 50% of the adjusted rate. All losses round upward and stop at the deployed troop count. Formation, enemy counters, armor and companion modifiers still apply.

For 100 troops with no protection and no formation counter, an ordinary balanced victory has bounds of 6-12 deaths (360-720 replacement gold), and a boss victory 10-20 (600-1,200). Balanced defeat loses 45 (2,700 gold to replace). Aggressive increases exposure; Guarded and counters reduce it. These are bounds, not averages: enemy strength relative to the rolled party strength determines a winning battle's actual losses. Small parties still risk at least one soldier.

Players see qualitative danger and actual battle outcomes. Administrators can inspect all-stage forecasts, victory replacement costs and base rewards against any selected player's current equipment. The endpoint requires a currently verified administrator, performs no writes and cannot be used by ordinary accounts.

## Existing realms and limitations

Existing gold, equipment, buildings and progression are preserved. Pending tribute uses the new rate at its next settlement, with the existing offline cap. PvP casualties are unchanged in this dungeon-focused pass.

This is a deliberate first balance pass. Active farming, gear sales, personal extraction and optimized formations can shorten the passive timeline significantly. No simulated timeline should be interpreted as a measured retention result. The admin report exposes these tradeoffs for further tuning without disclosing hidden pools in the player interface.

## Validation

Engine coverage includes income timing, offline caps, casualties across party sizes and formations, reserve protection and equipment recovery. Backend coverage includes read-only administrator forecasting, invalid deployment rejection and immediate role revocation. Playwright checks desktop/mobile dungeon preparation and administrator forecasts. Browser plugin not available; regular Playwright used under the frontend testing skill fallback.


## September 14: recruitment and equipment attrition

Recruitment, transfers and each equipment order now have independent quantities. Orders show prices and stock, support affordability/shortage shortcuts, and allow atomic purchase-and-equip. Existing stored kits can still be equipped for free; replacing a weapon returns the old one to storage.

Fallen attacking soldiers permanently destroy their assigned weapons and armor in dungeon and PvP casualties. Earlier equipment-recovery assumptions above are superseded. The 60-gold casualty replacement estimates cover recruits only: replacing their lost equipment costs extra. Reserves and stored inventory remain safe. Armor covers the strongest soldiers first, consistent with deployment and casualty ordering. Battle reports disclose actual destroyed kit counts.

Validation: 37 engine tests and 21 backend scenarios passed, including atomic orders, immutable failed orders, receipt retries, mixed equipment, and casualty/reserve inventory accounting. Targeted browser flows passed for recruitment quantities, purchase/equip, dungeon preparation and mobile layout.

Deployment verified against the production bundle on September 14. Disposable live-account checks passed for atomic buy-and-equip, mixed loadouts, casualty gear destruction, unarmed replacement recruits and replay protection. Temporary accounts and their fixtures were removed.


## September 14 progression update

The previous casualty pass did not price in permanent equipment attrition adequately. Ordinary victory rates are now 4% and boss rates 8%; defeat stays 45%. Winning losses apply the enemy-strength ratio to the unrounded base, avoiding the previous double rounding. Dungeon gold has increased at all 15 stages. The prepared 20-soldier woodland boss regression keeps at least 65% of gold after replacing units and destroyed gear. This is a representative scenario, not a guaranteed profit floor for oversized/aggressive parties.

Other additions: explicit chest rarity odds and guarantee progress; global top-50 power rankings; 20 paid barracks expansions; one faction change per shared season; server-side name filtering; same-faction raids without renown; equipped-item loot comparisons; eight bank levels with capacity and tiny tick-based interest; level-500 companions with bounded random quality and one growing passive ability. Five built-in-generated companion portraits are documented in design/companion-art.md.

Validation: 43 engine tests, 25 backend scenarios, and targeted browser flows passed. Coverage includes expanded capacity enforcement, fractional interest and caps, concurrent/replayed commands, faction-change allowance, profanity on both entry points, same-faction gold conservation with no renown, companion progression/caps and valid-save compatibility. Desktop/mobile screenshots were inspected; companion action layout and mobile ranking column order were corrected.

Production deployment verified. Disposable live-account checks passed for progression upgrades, one seasonal switch, name filtering, public power, interest capping/replay, mixed gear and casualty persistence; all temporary accounts and fixtures were removed. The live interest fixture uses the callable server timestamp to avoid local-machine clock skew.

## September 15 — settlement return on investment

Upgrade purchase prices and troop capacities remain unchanged. The previous tribute curve made the later upgrades poor investments: their additional income needed multiple days of collected tribute to repay the purchase, while a barracks expansion offered more immediate military value.

| Upgrade | Cost | Old gold / turn | New gold / turn | Old incremental payback | New incremental payback |
| --- | ---: | ---: | ---: | ---: | ---: |
| Settlement | 800 | 45 | 65 | 4.4 h | 1.9 h |
| Village | 6,000 | 70 | 140 | 20.0 h | 6.7 h |
| Castle | 22,000 | 110 | 290 | 45.8 h | 12.2 h |
| Stronghold | 65,000 | 170 | 600 | 90.3 h | 17.5 h |
| Citadel | 160,000 | 250 | 1,200 | 166.7 h | 22.2 h |

Homestead remains 30 gold per turn. A turn is five minutes. Payback uses the difference from the previous tier's income, before faction bonuses; these are collected hours, with the existing 12-hour offline cap. This keeps progressively longer savings goals while making each purchase useful. Existing upgraded players benefit automatically, avoiding a price cut that would disadvantage earlier purchases. Stronger tribute also replenishes exposed PvP treasuries. Monitor treasury growth, upgrade timing, and the share of gold earned from raids after release; these estimates are mathematical targets, not live-player telemetry.

QA: 45 engine tests including all-tier offline caps and incremental payback. Dedicated browser flow covers returning-player notice, loss details, account-persisted acknowledgement, and settlement payback rendering on mobile. Browser plugin not available; used repository Playwright against local Firebase emulators. Incoming reports use the existing private realm document and atomic PvP transaction; no additional polling or public history collection.
