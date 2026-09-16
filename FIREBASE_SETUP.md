# Firebase deployment handoff

Live alpha: https://ash-and-oath.web.app

Target project: `ash-and-oath`. Web app: `1:765976384314:web:9ee4986ea07b6d35c83603`.
Functions: Node 22, second generation, `us-central1`. Database: existing `(default)`,
Standard Native edition, `nam5` US multi-region. Blaze billing is enabled.

## Deployed September 11, 2026

- Google and email/password authentication. Google provider is managed in the
  Firebase Console; email/password and authorized domains are also represented
  in `firebase.json`.
- Authorized domains: `ash-and-oath.web.app`, `ash-and-oath.firebaseapp.com`,
  `localhost`, and `127.0.0.1`.
- Firestore access rules and Standard-compatible matchmaking index.
- `getRealm` and `performAction` callable functions; Firebase Hosting production build.
- Seven-day Artifact Registry container-image cleanup policy in `us-central1`.

Live checks passed for temporary account creation, saved server purchases,
idempotent command replay, reload, private access and rejected client writes.
The temporary account and its game documents were removed afterward.
Emulator tests additionally cover Google sign-in and returning Google accounts.
`.env.production.local` is preserved and ignored by Git.

## Updating the deployment

Use the existing database. Do not create a second database or deploy an emulator build.

```sh
npm run build:functions
firebase deploy --only firestore,functions --project ash-and-oath
npm run build
firebase deploy --only hosting --project ash-and-oath
```

The functions codebase is named `ash-and-oath`; deploys do not request deletion
of unrelated functions. Local integration tests target disposable demo projects.

## Before broad launch

- Register the web app with Firebase App Check / reCAPTCHA Enterprise. Add the
  public site key as `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` and set
  `ENFORCE_APP_CHECK=true` in the functions environment, then deploy/rebuild both.
  Enforcement stays off until a valid provider has been configured. No debug
  App Check token or service-account secret belongs in a Vite environment variable.
- Verify authorized domains, email templates, password policy, quota alerts,
  actual deployed IAM/service account permissions, logging and billing budgets.
  `maxInstances: 3` per function bounds compute scaling, not total costs.
- Activate seven-day receipt expiry using a Firestore TTL policy on collection
  group `receipts`, field `expiresAt`. Documents already carry the Timestamp;
  automatic TTL deletion is not activated by this change. Old expected revisions
  prevent an expired receipt from allowing the same purchase to be replayed.
- Replace the initial shared score document with partitioned counters before
  high concurrency; add matchmaking pagination beyond the first 50 eligible
  enlisted realms, moderation, anti-bot and multi-account/collusion protections.
- Specify and implement the first competitive season's real rollover/reward
  rules before describing alpha participation totals as a complete seasonal war.

Firebase references: [callable functions](https://firebase.google.com/docs/functions/callable),
[deployment prerequisites](https://firebase.google.com/docs/functions/get-started),
[App Check enforcement](https://firebase.google.com/docs/app-check/cloud-functions).

## Administration

Sign in with the verified Google account matching the private owner invitation,
then select **Admin dashboard**. **Return to my realm** resumes normal gameplay.
The owner invitation created September 11 expires October 11, 2026 if unclaimed;
accepted roles remain until explicitly revoked. No password was created or changed.

The dashboard shows realm counts, exact email/UID search, 25-player pagination,
faction scores, suspension/restoration with mandatory reasons, and the latest
25 admin audit records. It links to Firebase usage and Cloud Billing; it does not
fetch invoices or change budgets. Admin privileges never grant game gold or equipment.

Access is checked on every admin callable using verified Firebase identity and a
private `adminRoles/{uid}` document. `getAdminAccess` consumes a server-created
email invitation exactly once. Client rules deny all access to roles, invitations
and audit records, including for administrators; approved operations use callables.
Revoking the role takes effect at the next admin request and cannot be undone by
reusing the consumed invitation. There is no public role-granting endpoint.

Suspension blocks game calls, removes PvP enlistment and preserves progress.
Restoration begins a fresh tribute interval. Actions use revision checks and
idempotent audit IDs; self-suspension and moderation of administrators are blocked.
This is game moderation, not deletion or disabling of Firebase Authentication.

Validation: 11 backend scenarios passed, including invitation verification,
revocation, access denial, suspension, restoration, replay and stale revisions.
The admin browser scenario verifies activation, search, returning to gameplay,
no runtime errors, and desktop/mobile layouts. Browser skill not available;
regular Playwright was used for the automated local UI test.

## Dungeon tactics update — September 11, 2026

See `MECHANICS.md` for the shipped rule set. Dungeon requests accept an optional
validated deployment count (omission preserves compatibility with older clients).
Personal expeditions persist surviving party size; new offensive gear and role
changes cannot alter an active expedition. New weapon/discovery/companion fields
are optional on existing saves; no bulk rewrite or reset is required.

The release adds boss artwork, loss forecasts and saved damage reports. Chest
item types are now weapon/armor only; existing companions and runes are retained.
Validation: 27 engine tests; 12 backend scenarios, including deployment tampering
and idempotent casualty handling; dedicated desktop/mobile UI flow verifying the
watchtower route, weapon refit, hidden rune UI, selected party and boss report.
Firestore rules were unchanged. Production build passed.

## Owned army equipment update

Army kits are now persisted separately from assigned weapon and armor counts.
Recruitment never auto-assigns gear. `buyKit` and `equipKit` callables are validated
through the existing authoritative command endpoint; purchases have idempotency
receipts. Equipping previously purchased kits is free. Legacy current kits and
weapon types identifiable in retained refit history migrate without a bulk reset.
The old `weapon` command only switches an owned weapon; it no longer charges refit
fees. The old `arm` command remains a buy-and-equip action for older clients.

Loot pool and probability UI, previews, rarity hints and the visible pity counter
are removed; underlying rewards are unchanged. Validation: 29 engine tests,
13 backend scenarios and the updated desktop/mobile workshop-to-dungeon UI flow.
