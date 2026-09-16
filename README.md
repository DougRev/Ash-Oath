# Ash & Oath

A fantasy idle strategy RPG: grow a homestead into a citadel, choose a faction,
raise an army, explore dungeons, and decide how much treasure to risk.

React + TypeScript + Vite, with Firebase Authentication, Firestore Standard
Native mode, and second-generation callable Cloud Functions. Original artwork
and fonts are served with the app.

## Current status — September 11, 2026

The initial multiplayer alpha is deployed at **https://ash-and-oath.web.app**.
Google and email/password sign-in are enabled in the live `ash-and-oath` project.
Blaze billing is enabled. The app uses the existing Standard `(default)` Firestore
database in `nam5` (US multi-region), with callable functions in `us-central1`.
Live checks verified account creation, authoritative purchases, idempotent retries,
restored saves, private reads and rejected client writes. Temporary check data was removed.

The playable Firebase emulator preview is `http://127.0.0.1:5180` while the local
servers are running. Emulator accounts/data are disposable and separate from
production. No local demo progress or test accounts are uploaded to Firebase.

## Run the Firebase version locally

Prerequisites: Node 22, Firebase CLI, and Java 21 for the Firestore emulator.

```sh
npm install
npm --prefix functions install
npm run emulators
```

In another terminal:

```sh
npm run dev:emulator -- --port 5180
```

Create an account in the preview. Test email verification/password-reset links
appear in the Auth emulator log; they are not real emails. The Emulator UI is
`http://127.0.0.1:4000`.

On the current Windows workstation, portable Java 21 and Node 22 were placed in
`%LOCALAPPDATA%/ash-oath-dev`; the emulator launcher detects them automatically.
Other machines can use their own installed Java/Node runtimes. Nothing modifies
the machine's global PATH.

`npm run dev:live` reads the supplied `.env.production.local` and connects to the
real Firebase project. `npm run build` also uses that file. Only
the explicitly selected public Firebase Web SDK fields enter the bundle; the
environment file is ignored by Git. The Firebase web API key identifies the
project and does not grant authority to write game data.

The original localStorage prototype remains available with `npm run dev:demo`.
It alone exposes camp/reset tools and simulated opponents. Existing prototype
saves remain on their original browser origin.

## Implemented gameplay

- Four factions with disclosed, modest specialties.
- Six settlement tiers, four buildings, expanding troop capacity and income.
- Server-timed gold and 5 AP every five minutes; 60 AP cap, 12-hour offline cap.
- Separate offensive and defensive militia; recruitment, reassignment, four weapon standards
  with settlement unlocks, owned kit storage, explicit equipping, optional armor,
  unarmed recruitment, and selectable dungeon party sizes.
- Three dungeons with five stages each, unique boss artwork, formation counters, tactical
  casualty forecasts, losses on victory and saved damage reports.
- Personal expeditions at Village tier: locked loadout, carried loot, extraction,
  and loss of equipped non-companion/carried items on defeat.
- Weapons, armor, hidden-until-discovery rune slots, and a bonded companion with levels,
  injury/recovery and casualty protection; equipping and selling loot.
- Gold-only chests with hidden loot pools and persisted epic-or-better pity.
- Real, voluntary PvP against enlisted accounts, including offline defenders.
- Shared faction renown during a fixed founding campaign, live chronicles,
  cloud saves, commander aliases, email verification, sign-in/out and password reset.

## Admin dashboard

An invited, verified administrator can switch between normal play and a private
management dashboard. It includes realm counts, exact email/UID search, pagination,
faction totals, suspension/restoration and a private audit log. Roles are checked
on every server call; client-side role grants and direct data writes are forbidden.
See `FIREBASE_SETUP.md` for invitation and moderation details.

## Backend authority

The client sends a validated intent, an expected realm revision, and a UUID.
`performAction` reads the authenticated user's realm inside a Firestore
transaction, checks prerequisites, uses server time and cryptographic randomness,
and commits the result with an idempotency receipt. Retrying a timed-out request
returns the same committed result without another charge or loot roll. A stale
revision requires the player to review updated state before issuing a new order.

`getRealm` creates a starting realm once and settles earned tribute on demand.
No scheduled per-player ticking job is necessary. Realtime document listeners
are intentional: incoming attacks and commands on another device must update
the active session immediately. Public matchmaking uses an indexed, bounded
realtime query instead of scanning private realms.

Client Firestore writes are denied, including owner writes. Players may read
only their private realm, bounded public combat projections, and a campaign
document. Email, inventory, total treasury, satchel, receipts and revisions are
not exposed in public projections. The 200-slot vault, bounded command payloads,
40-entry activity history and pruned cooldown map bound document growth.

### PvP rules

Enlistment requires a faction, Settlement tier and a verified email. Attacks cost
8 AP and must target an enlisted enemy within one tier. Victory captures a random share of all unbanked treasury gold based on victory margin, awards 20 renown and shields the victim
for one hour. Repeat attacks require ten minutes. Attacking removes your own
shield. A player cannot leave the battlefield until one hour after their most
recent outgoing attack. Incoming attacks preserve garrison troops and buildings.

Both accounts, both public projections, campaign points and the attacker's receipt
are committed atomically. Scout estimates can change before a command arrives;
the server always checks current defense, gold, eligibility and shields.

### Campaign boundary

The Founders' Campaign runs September 11–October 9, 2026 (UTC). Its score is real
earned renown; the highest faction total leads, and tied factions share honors.
Scores stop increasing at the closing time. Character progression continues.
This is an alpha participation campaign: territory control, population balancing,
guilds, automatic seasonal resets and cosmetic reward delivery are not implemented.
No reset or next-season buff is promised by the current UI.

The exact current rules, costs, combat formulas and companion behavior are in [MECHANICS.md](MECHANICS.md). The broader seasonal design remains in `GAME_DESIGN.md`.

## Validation

```sh
npm test
npm run test:integration
npm run build
```

Stop an existing emulator session before running `test:integration`; that command
starts an isolated suite, runs backend/rules/browser tests and shuts it down.
It targets hard-coded demo project IDs and loopback endpoints, never live data.

- 29 deterministic engine tests cover the economy and all original game systems.
- 13 backend integration tests cover identity, payload forgery, replay, concurrent
  spend, stale revisions, offline accrual, chest limits, extraction, shared scoring,
  verified enlistment, PvP gold conservation, recovery shields, admin invitation
  verification, role revocation and audited suspension/restoration.
- 4 security-rule suites cover owner access, private data isolation, bounded
  public queries, nested paths and forbidden creates/updates/deletes.
- 5 browser scenarios cover Google and email account creation, faction choice, purchases, another
  session, lost-response recovery, reload, alias changes, sign-out, account
  recovery UI, returning Google accounts, the admin dashboard and responsive layouts
  at 360, 390, 768 and 1536 pixels.

## Deployment

See `FIREBASE_SETUP.md` for the prepared deployment sequence and outstanding
project configuration. Build and deploy functions/rules before hosting the client.
Do not publish an emulator build.

This is an initial multiplayer alpha. Before a broad competitive launch, complete
App Check registration/enforcement, abuse/collusion controls, production IAM and
monitoring review, receipt retention, pagination and scalable faction counters.
The current per-account command limit and function instance cap are not a spending
cap or protection against large numbers of newly created accounts.

## Source map

| Path                          | Purpose                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| `src/game/engine.ts`          | Shared pure economy, combat, loot and progression rules    |
| `functions/src/index.ts`      | Authenticated transactional commands and receipts          |
| `functions/src/combat.ts`     | Real PvP and sanitized public projections                  |
| `functions/src/validation.ts` | Strict runtime command schemas                             |
| `src/game/useCloudRealm.ts`   | Cloud session, retries, realtime updates and accrual       |
| `src/lib/firebase.ts`         | Allowlisted Web SDK configuration and emulator isolation   |
| `firestore.rules`             | Default-deny access rules                                  |
| `tests/`                      | Engine, backend, rules and browser coverage                |
| `DESIGN_SYSTEM.md`            | Visual specification                                       |
| `design/`                     | Original image concepts, source art and generation prompts |
| `public/art/`                 | Optimized WebP artwork                                     |

Run `node scripts/optimize-art.mjs` to rebuild the optimized artwork while
preserving the source PNG illustrations.

The Bank unlocks at Settlement for 1,000 gold. Manual deposits protect savings from PvP, with a 5% deposit fee and free withdrawals. The War Room shows nearby peaceful realms with a Not enlisted status; both commanders must enlist to attack.

AI strongholds now provide 18 labeled targets across settlement tiers, with 12 paid wins per UTC day and account-specific 30-minute target cooldowns. Army loadouts support mixed weapon counts and proportional dungeon counters; one upgraded kit upgrades one soldier while retaining the rest of the army. See MECHANICS.md for current rules.
