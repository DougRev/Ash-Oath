import { test, expect } from '@playwright/test';

test('account, cloud actions, a second session and lost-response recovery', async ({
  page,
  browser,
}) => {
  const email = `ui-${Date.now()}@example.test`,
    password = 'Only-emulator-123';
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5180');
  await page.getByRole('button', { name: 'New here? Create your account', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Every kingdom begins with a home.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Choose a faction', exact: true }).click();
  await page.getByRole('button', { name: /Iron Covenant Together/ }).click();
  await page.getByRole('button', { name: 'Join the Iron Covenant', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Settlement', exact: true }).click();
  // Calls have an intentional server rate limit. UI reading between actions normally covers it.
  await page.waitForTimeout(550);
  await page.getByRole('button', { name: /Upgrade to Settlement/ }).click();
  await expect(page.locator('header').getByText('1,000', { exact: true })).toBeVisible();

  const secondContext = await browser.newContext();
  const second = await secondContext.newPage();
  await second.goto('http://127.0.0.1:5180');
  await second.getByLabel('Email', { exact: true }).fill(email);
  await second.getByLabel('Password', { exact: true }).fill(password);
  await second.getByRole('button', { name: 'Enter your realm', exact: true }).click();
  await expect(second.locator('header').getByText('1,000', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'The Trader', exact: true }).click();
  await page.getByRole('button', { name: /Build Trading Post/ }).click();
  await expect(second.locator('header').getByText('750', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'The Trader', exact: true }).click();
  await page.waitForTimeout(550);
  // Let the server commit but discard both responses; retry must recover the original receipt.
  let dropped = 0;
  await page.route('**/us-central1/performAction', async (route) => {
    if (
      route.request().method() === 'POST' &&
      route.request().postDataJSON()?.data?.action?.type === 'chest' &&
      dropped < 2
    ) {
      dropped++;
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await page
    .getByRole('button', { name: /Open chest/ })
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: 'Confirm pending order', exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await expect(second.locator('header').getByText('500', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm pending order', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'A new story, uncovered.' })).toBeVisible();
  await expect(second.locator('header').getByText('500', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.reload();
  await expect(page.locator('header').getByText('500', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'War Room', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Build in peace. Enlist when ready.' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enlist for PvP', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Settings & save', exact: true }).click();
  await expect(page.getByText('Your realm is saved in the cloud.', { exact: true })).toBeVisible();
  await expect(page.getByText('LOCAL PLAYTEST TOOLS', { exact: true })).toHaveCount(0);
  await page.getByLabel('Commander name', { exact: true }).fill('Cloud Commander');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(
    second.getByRole('button', { name: 'Cloud Commander Iron Covenant', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Return to your realm.' })).toBeVisible();
  expect(errors).toEqual([]);
  await secondContext.close();
});

test('account layout fits mobile and desktop with accessible recovery', async ({ page }) => {
  await page.goto('http://127.0.0.1:5180');
  for (const width of [360, 390, 768, 1536]) {
    await page.setViewportSize({ width, height: 960 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: 'Forgot your password?', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Find your way home.' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Return to your realm.' })).toBeVisible();
});

test('Google sign-in restores the same saved realm after signing out', async ({ page }) => {
  const email = `google-${Date.now()}@example.test`;
  await page.goto('http://127.0.0.1:5180');
  let popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  let popup = await popupPromise;
  // The emulator refreshes its account list after loading; wait before opening its form.
  await popup.waitForLoadState('networkidle');
  await popup.getByText('Add new account', { exact: true }).click();
  await popup.getByLabel('Email', { exact: true }).fill(email);
  await popup.getByRole('button', { name: 'Sign in with Google.com', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Every kingdom begins with a home.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Settings & save', exact: true }).click();
  await page.getByLabel('Commander name', { exact: true }).fill('Google Commander');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(page.getByText('Your commander name is saved.', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Send verification email', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  popup = await popupPromise;
  await popup.getByText(email, { exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Google Commander Homestead · Level 1', exact: true }),
  ).toBeVisible();
});

test('admin invitation opens management while preserving the player realm', async ({ page }) => {
  const { createRequire } = await import('node:module');
  const { createHash } = await import('node:crypto');
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const { initializeApp } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const app = initializeApp({ projectId: 'demo-ash-and-oath' }, `admin-ui-${Date.now()}`);
  const db = getFirestore(app, '(default)');
  const email = `admin-ui-${Date.now()}@example.test`;
  await db
    .doc('adminInvitations/' + createHash('sha256').update(email).digest('hex'))
    .set({ email, expiresAt: Date.now() + 600000 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5180');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState('networkidle');
  await popup.getByText('Add new account', { exact: true }).click();
  await popup.getByLabel('Email', { exact: true }).fill(email);
  await popup.getByRole('button', { name: 'Sign in with Google.com', exact: true }).click();
  await page.getByRole('button', { name: 'Admin dashboard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The steward’s desk' })).toBeVisible();
  await page.getByLabel('Email or player ID').fill(email);
  await page.getByRole('button', { name: 'Search players', exact: true }).click();
  const playerRow = page.locator('tbody tr').filter({ hasText: email });
  await expect(playerRow).toHaveCount(1);
  await expect(playerRow).toContainText(email);
  await playerRow.getByRole('button', { name: /^Manage / }).click();
  await page.getByRole('button', { name: 'Calculate casualty forecast' }).click();
  await expect(page.getByText(/^Whispering Woods . 1$/, { exact: true })).toBeVisible();
  await expect(
    page.getByRole('columnheader', { name: 'Victory deaths', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/admin-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/admin-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Return to my realm', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Every kingdom begins with a home.' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('dungeon party, weapon refit, hidden discoveries and watchtower route', async ({ page }) => {
  const { createRequire } = await import('node:module');
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const app = require('firebase-admin/app').initializeApp(
    { projectId: 'demo-ash-and-oath' },
    `combat-ui-${Date.now()}`,
  );
  const db = require('firebase-admin/firestore').getFirestore(app, '(default)');
  const email = `combat-ui-${Date.now()}@example.test`,
    password = 'Emulator-only-123';
  const user = await require('firebase-admin/auth')
    .getAuth(app)
    .createUser({ email, password, emailVerified: true });
  const game = require('./lib/src/game/engine.js').newGame();
  Object.assign(game, {
    level: 4,
    gold: 30000,
    faction: 'iron',
    troops: { offense: 100, defense: 10 },
    arms: { offense: 100, defense: 10 },
    buildings: { armory: true, blacksmith: true, trader: true, watchtower: true },
    cleared: [4, 0, 0],
  });
  const realm = { game, revision: 0, enlisted: false, shieldUntil: 0, lastActionAt: 0 };
  await db.doc(`realms/${user.uid}`).set(realm);
  await db
    .doc(`publicRealms/${user.uid}`)
    .set(require('./lib/functions/src/combat.js').publicRealm(user.uid, realm));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5180');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Enter your realm', exact: true }).click();
  await page.getByRole('button', { name: 'Settlement', exact: true }).click();
  await page.getByRole('button', { name: 'The Watchtower', exact: true }).click();
  await expect(page).toHaveURL(/#war$/);
  await page.goto('http://127.0.0.1:5180/#army');
  await page.getByRole('button', { name: 'Armory', exact: true }).click();
  await page.getByRole('button', { name: 'Manage Sentinel spears' }).click();
  const inspector = page.getByRole('region', { name: 'Manage selected equipment' });
  await inspector.getByLabel('Kits to purchase').fill('20');
  await inspector.getByLabel('After purchase').selectOption('storage');
  await inspector.getByRole('button', { name: /Buy to storage/ }).click();
  await expect(inspector.locator('.kit-stock')).toContainText('Stored20');
  await page.waitForTimeout(550);
  await inspector.getByRole('button', { name: 'Equip stored', exact: true }).click();
  await inspector.getByLabel('Soldiers to equip').fill('20');
  await inspector.getByRole('button', { name: /Equip 20 stored/ }).click();
  await expect(inspector.locator('.kit-stock')).toContainText('Equipped20');
  await page.waitForTimeout(550);
  await page.getByRole('button', { name: 'Manage Militia blades' }).click();
  await inspector.getByLabel('Soldiers to equip').fill('20');
  await inspector.getByRole('button', { name: /Equip 20 stored/ }).click();
  await expect(inspector.locator('.kit-stock')).toContainText('Equipped100');
  await page.waitForTimeout(550);
  await page.getByRole('button', { name: 'Manage Sentinel spears' }).click();
  await inspector.getByLabel('Soldiers to equip').fill('20');
  await inspector.getByRole('button', { name: /Equip 20 stored/ }).click();
  await expect(inspector.locator('.kit-stock')).toContainText('Equipped20');
  const equippedSave = (await db.doc(`realms/${user.uid}`).get()).data();
  expect(equippedSave.game.gold).toBe(28600);
  expect(equippedSave.game.armyEquipment.offense.weapons.spear).toBe(20);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/armory-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.screenshot({ path: 'test-results/weapons-desktop.png', fullPage: true });
  await page.goto('http://127.0.0.1:5180/#dungeons');
  await expect(page.locator('body')).not.toContainText(
    /runes|drop pool|gear drop|probabilities|victory spoils/i,
  );
  await page.getByLabel('Offensive soldiers to deploy', { exact: true }).fill('20');
  await expect(page.getByText(/20 deployed · 80 attackers stay home/)).toBeVisible();
  await page.getByRole('button', { name: 'Lead personally', exact: false }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Aggressive', exact: true }).click();
  await expect(page.locator('.casualty-forecast')).not.toContainText(/\d/);
  await expect(page.locator('.casualty-forecast')).toContainText('Even victory costs lives');
  await page.screenshot({ path: 'test-results/dungeon-preparation.png', fullPage: true });
  await page.getByRole('button', { name: 'Lead the expedition', exact: false }).click();
  await expect(page.getByRole('dialog', { name: 'Battle report' })).toBeVisible();
  await expect(page.getByText(/Victory came at a cost:/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Boss clash' })).toBeVisible();
  await expect(page.getByText(/Character: \d+ damage · Units:/)).toBeVisible();
  await expect(page.locator('.battle-receipt')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'test-results/boss-report.png', fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/boss-mobile.png', fullPage: false });
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.getByLabel('Offensive soldiers to deploy', { exact: true })).toBeDisabled();
  const saved = (await db.doc(`realms/${user.uid}`).get()).data();
  expect(saved.game.lastBattle.deployed).toBe(20);
  expect(saved.game.troops.offense).toBe(100 - saved.game.lastBattle.casualties);
  expect(saved.game.troops.defense).toBe(10);
  expect(errors).toEqual([]);
});

test('peaceful neighbors stay visible and bank transfers persist on desktop and mobile', async ({
  page,
}) => {
  const { createRequire } = await import('node:module');
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const app = require('firebase-admin/app').initializeApp(
    { projectId: 'demo-ash-and-oath' },
    `bank-ui-${Date.now()}`,
  );
  const db = require('firebase-admin/firestore').getFirestore(app, '(default)');
  const auth = require('firebase-admin/auth').getAuth(app);
  const email = `bank-ui-${Date.now()}@example.test`,
    password = 'Emulator-only-123';
  const user = await auth.createUser({ email, password, emailVerified: true });
  const peer = await auth.createUser({
    email: `peer-${Date.now()}@example.test`,
    password,
    emailVerified: true,
  });
  const { newGame } = require('./lib/src/game/engine.js');
  const { publicRealm } = require('./lib/functions/src/combat.js');
  const own = {
    game: { ...newGame(), level: 5, faction: 'iron', gold: 6000 },
    revision: 0,
    enlisted: true,
    shieldUntil: 0,
    lastActionAt: 0,
  };
  const other = {
    game: { ...newGame(), level: 5, faction: 'tide', name: `Neighbor ${peer.uid.slice(-5)}` },
    revision: 0,
    enlisted: false,
    shieldUntil: 0,
    lastActionAt: 0,
  };
  await db.doc(`realms/${user.uid}`).set(own);
  await db.doc(`publicRealms/${user.uid}`).set(publicRealm(user.uid, own));
  await db.doc(`realms/${peer.uid}`).set(other);
  await db.doc(`publicRealms/${peer.uid}`).set(publicRealm(peer.uid, other));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5180/#war');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Enter your realm', exact: true }).click();
  await page.getByRole('button', { name: 'War Room', exact: true }).click();
  const neighbor = page.locator('.opponent-row').filter({ hasText: other.game.name });
  await expect(neighbor.getByRole('button', { name: 'Not enlisted' })).toBeDisabled();
  other.enlisted = true;
  await db.doc(`realms/${peer.uid}`).update({ enlisted: true });
  await db.doc(`publicRealms/${peer.uid}`).set(publicRealm(peer.uid, other));
  await expect(neighbor.getByRole('button', { name: 'Scout & attack' })).toBeEnabled();
  // An old zero snapshot must not prevent scouting a newly funded, undefended realm.
  await db.doc(`publicRealms/${peer.uid}`).update({ plunder: 0, defense: 0 });
  await expect(neighbor).toContainText('Undefended');
  await expect(neighbor.getByRole('button', { name: 'Scout treasury' })).toBeEnabled();
  await neighbor.getByRole('button', { name: 'Scout treasury' }).click();
  await expect(page.getByRole('dialog')).toContainText('Last seen exposed treasury');
  await expect(page.getByRole('dialog')).toContainText('dominant wins');
  await expect(page.getByRole('dialog')).not.toContainText(String.fromCharCode(65533));
  await page.screenshot({ path: 'test-results/pvp-scout.png', fullPage: false });
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  const bank = page.getByRole('region', { name: 'Bank', exact: true });
  await bank.getByRole('button', { name: /Build Bank/ }).click();
  await expect(bank.getByLabel('Gold amount')).toBeVisible();
  await page.waitForTimeout(550);
  await bank.getByLabel('Gold amount').fill('1000');
  await bank.getByRole('button', { name: 'Deposit gold', exact: true }).click();
  await expect(bank.locator('.bank-balances')).toContainText('950');
  await page.reload();
  await expect(bank.locator('.bank-balances')).toContainText('950');
  await page.screenshot({ path: 'test-results/bank-desktop.png', fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await bank.getByLabel('Bank action').selectOption('withdraw');
  await bank.getByRole('button', { name: 'Maximum', exact: true }).click();
  await bank.getByRole('button', { name: 'Withdraw gold', exact: true }).click();
  await expect(bank.locator('.bank-balances')).toContainText('4,950');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/bank-mobile.png', fullPage: false });
  expect(errors).toEqual([]);
});

test('one weapon upgrade preserves the army and AI raids open a saved battle report', async ({
  page,
}) => {
  const { createRequire } = await import('node:module');
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const app = require('firebase-admin/app').initializeApp(
    { projectId: 'demo-ash-and-oath' },
    `rivals-ui-${Date.now()}`,
  );
  const db = require('firebase-admin/firestore').getFirestore(app, '(default)');
  const email = `rivals-ui-${Date.now()}@example.test`,
    password = 'Emulator-only-123';
  const user = await require('firebase-admin/auth')
    .getAuth(app)
    .createUser({ email, password, emailVerified: true });
  const game = require('./lib/src/game/engine.js').newGame();
  Object.assign(game, {
    level: 3,
    gold: 10000,
    faction: 'iron',
    buildings: { armory: true, blacksmith: true, trader: true, watchtower: false },
  });
  const realm = { game, revision: 0, enlisted: false, shieldUntil: 0, lastActionAt: 0 };
  await db.doc(`realms/${user.uid}`).set(realm);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5180/#army');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Enter your realm', exact: true }).click();
  await page.goto('http://127.0.0.1:5180/#army');
  await page.getByRole('button', { name: 'Armory', exact: true }).click();
  await page.getByRole('button', { name: 'Manage Royal halberds' }).click();
  const inspector = page.getByRole('region', { name: 'Manage selected equipment' });
  await inspector.getByRole('button', { name: /Buy & equip/ }).click();
  await expect(inspector.locator('.kit-stock')).toContainText('Equipped1');
  await page.getByRole('button', { name: 'Army', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Offense overview' })).toContainText(
    '0 need weapons',
  );
  await page.screenshot({ path: 'test-results/mixed-army-desktop.png', fullPage: true });
  await page.reload();
  await expect(page.getByRole('region', { name: 'Offense overview' })).toContainText(
    '1 Royal halberds',
  );
  await page.getByLabel('Recruits to hire', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Recruit 3 soldiers', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Offense overview' })).toContainText(
    '3 need weapons',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/army-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  // Reset only this emulator fixture to a starter realm for a guaranteed, useful bounty.
  const starter = require('./lib/src/game/engine.js').newGame();
  starter.faction = 'iron';
  await db.doc(`realms/${user.uid}`).set({ ...realm, game: starter, revision: 3 });
  await page.goto('http://127.0.0.1:5180/#war');
  const rivals = page.getByRole('region', { name: 'AI rival strongholds' });
  await rivals.getByLabel('Scout settlement tier').selectOption('0');
  await expect(rivals.locator('.rival-card')).toHaveCount(3);
  await page.screenshot({ path: 'test-results/rivals-desktop.png', fullPage: false });
  await rivals
    .locator('.rival-card')
    .filter({ hasText: 'Bramble Camp' })
    .getByRole('button', { name: 'Scout AI rival' })
    .click();
  await page.getByRole('button', { name: /Raid AI stronghold/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Bramble Camp (AI)');
  await expect(page.getByRole('dialog')).toContainText('400');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(rivals).toContainText('11 / 12 paid victories');
  await expect(
    rivals.locator('.rival-card').filter({ hasText: 'Bramble Camp' }).getByRole('button'),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/rivals-mobile.png', fullPage: false });
  expect(errors).toEqual([]);
});

test('progression update shows odds, rankings, upgrades, companion growth and loot comparisons', async ({
  page,
}) => {
  const { createRequire } = await import('node:module');
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const app = require('firebase-admin/app').initializeApp(
    { projectId: 'demo-ash-and-oath' },
    `progression-${Date.now()}`,
  );
  const db = require('firebase-admin/firestore').getFirestore(app, '(default)');
  const email = `progression-${Date.now()}@example.test`,
    password = 'Emulator-only-123';
  const user = await require('firebase-admin/auth')
    .getAuth(app)
    .createUser({ email, password, emailVerified: true });
  const game = require('./lib/src/game/engine.js').newGame();
  Object.assign(game, {
    name: 'Progression Tester',
    cleared: [4, 0, 0],
    level: 4,
    gold: 30000,
    barracksLevel: 3,
    faction: 'iron',
    troops: { offense: 100, defense: 10 },
    arms: { offense: 100, defense: 10 },
    buildings: { armory: true, blacksmith: true, trader: true, watchtower: true, bank: true },
  });
  game.inventory.push({
    id: 'r999',
    name: 'Silverfang Wolf',
    kind: 'pet',
    rarity: 'rare',
    power: 4,
    quality: 125,
    ability: 'ferocity',
    abilityRoll: 150,
    xp: 100,
    value: 160,
  });
  game.equipped.push('r999');
  game.seq = 999;
  const realm = { game, revision: 0, enlisted: false, shieldUntil: 0, lastActionAt: 0 };
  await db.doc(`realms/${user.uid}`).set(realm);
  await db
    .doc(`publicRealms/${user.uid}`)
    .set(require('./lib/functions/src/combat.js').publicRealm(user.uid, realm));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5180/#trader');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Enter your realm', exact: true }).click();
  await page.goto('http://127.0.0.1:5180/#trader');
  await expect(page.locator('.chest-odds')).toHaveCount(3);
  await expect(page.locator('.chest-odds').first()).toContainText('55%');
  await expect(page.locator('.chest-odds').last()).toContainText('32%');
  await page.screenshot({ path: 'test-results/chest-odds.png', fullPage: true });
  await page.getByRole('button', { name: 'Companions', exact: true }).click();
  await expect(page.locator('.companion-details')).toContainText('2 / 500');
  await expect(page.locator('.companion-details')).toContainText('ferocity');
  await expect(page.locator('.companion-portrait')).toBeVisible();
  expect(
    await page
      .locator('.companion-portrait')
      .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
  ).toBe(true);
  await page.locator('.companion-details').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/companion-growth.png' });
  await page.goto('http://127.0.0.1:5180/#army');
  await page.getByRole('button', { name: /Double to/ }).click();
  await expect(page.getByRole('region', { name: 'Barracks capacity' })).toContainText(
    'Level 4 / 6',
  );
  await expect(page.getByRole('region', { name: 'Barracks capacity' })).toContainText('110 / 1,760');
  await page.goto('http://127.0.0.1:5180/#war');
  await page.getByRole('button', { name: /Double capacity/ }).click();
  await expect(page.getByRole('heading', { name: 'Bank level 2 / 8' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Overall power leaderboard' })).toContainText(
    'Progression Tester',
  );
  await page.getByRole('button', { name: 'Change faction', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('button')
    .filter({ has: page.getByRole('heading', { name: 'Tidebound' }) })
    .click();
  await dialog.getByRole('button', { name: 'Change faction', exact: false }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.allegiance-bar')).toContainText('Tidebound');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('region', { name: 'Overall power leaderboard' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/leaderboard-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:5180/#dungeons');
  await page.getByRole('button', { name: /Send your army/ }).click();
  await expect(page.getByRole('dialog', { name: 'Battle report' })).toBeVisible();
  await expect(page.locator('.battle-items .item-compare').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('army overhaul exposes both forces and accurately previews partial equipment orders', async ({
  page,
}) => {
  const { createRequire } = await import('node:module');
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const app = require('firebase-admin/app').initializeApp(
    { projectId: 'demo-ash-and-oath' },
    `army-overhaul-${Date.now()}`,
  );
  const db = require('firebase-admin/firestore').getFirestore(app, '(default)');
  const email = `army-${Date.now()}@example.test`,
    password = 'Emulator-only-123';
  const user = await require('firebase-admin/auth')
    .getAuth(app)
    .createUser({ email, password, emailVerified: true });
  const game = require('./lib/src/game/engine.js').newGame();
  Object.assign(game, {
    level: 1,
    gold: 9850,
    faction: 'iron',
    barracksLevel: 1,
    troops: { offense: 20, defense: 10 },
    arms: { offense: 18, defense: 8 },
    buildings: { armory: true, blacksmith: true, trader: true, watchtower: false },
    armyEquipment: {
      offense: {
        weapons: { militia: 15, spear: 10 },
        equippedWeapons: { militia: 12, spear: 6 },
        armorOwned: 14,
        armorEquipped: 12,
      },
      defense: {
        weapons: { militia: 8 },
        equippedWeapons: { militia: 8 },
        armorOwned: 6,
        armorEquipped: 6,
      },
    },
  });
  await db
    .doc(`realms/${user.uid}`)
    .set({ game, revision: 0, enlisted: false, shieldUntil: 0, lastActionAt: 0 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:5180/#army');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Enter your realm', exact: true }).click();
  await page.goto('http://127.0.0.1:5180/#army');
  const offense = page.getByRole('region', { name: 'Offense overview' }),
    defense = page.getByRole('region', { name: 'Defense overview' });
  await expect(offense).toContainText('2 need weapons');
  await expect(offense).toContainText('8 need armor');
  await expect(defense).toContainText('4 need armor');
  await page.screenshot({ path: 'test-results/army-overhaul-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Equip offense', exact: true }).click();
  await page.getByRole('button', { name: 'Manage Sentinel spears' }).click();
  const inspector = page.getByRole('region', { name: 'Manage selected equipment' });
  await inspector.getByRole('button', { name: 'Fill weapon gap (2)', exact: true }).click();
  await expect(inspector.locator('.kit-review')).toContainText(
    '2 soldiers receive weapons. No kits replaced.',
  );
  await page.screenshot({ path: 'test-results/armory-overhaul-desktop.png', fullPage: true });
  await inspector.getByRole('button', { name: /Equip 2 stored/ }).click();
  await expect(inspector.locator('.kit-stock')).toContainText('Equipped8');
  await expect(page.getByRole('region', { name: 'Offense readiness' })).toContainText(
    '0 need weapons',
  );
  await page.waitForTimeout(550);
  await inspector.getByRole('button', { name: 'Buy gear', exact: true }).click();
  await inspector.getByLabel('Kits to purchase').fill('2');
  await expect(inspector.locator('.kit-review')).toContainText('2 other weapons return to storage');
  await inspector.getByRole('button', { name: /Buy & equip/ }).click();
  await expect(inspector.locator('.kit-stock')).toContainText('Equipped10');
  let saved = (await db.doc(`realms/${user.uid}`).get()).data();
  expect(saved.game.gold).toBe(9710);
  expect(saved.game.armyEquipment.offense.equippedWeapons.militia).toBe(10);
  await page.waitForTimeout(550);
  await inspector.getByRole('button', { name: 'Store gear', exact: true }).click();
  await inspector.getByRole('button', { name: /Store 1 kit/ }).click();
  await expect(inspector.locator('.kit-stock')).toContainText('Equipped9');
  await inspector.getByLabel('Kits to store').fill('0');
  await expect(inspector.getByRole('button', { name: /Store 0 kits/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Manage Royal halberds' }).click();
  await expect(inspector).toContainText('Reach Castle');
  await expect(inspector.getByRole('button', { name: /Buy & equip/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Manage Padded armor' }).click();
  await inspector.getByRole('button', { name: 'Fill armor gap (2)', exact: true }).click();
  await page.waitForTimeout(550);
  await inspector.getByRole('button', { name: /Equip 2 stored/ }).click();
  await expect(inspector.locator('.kit-stock')).toContainText('Equipped14');
  await page.getByRole('button', { name: 'Defense 10 soldiers', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Defense readiness' })).toContainText(
    '4 need armor',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (await page.getByRole('button', { name: 'Dismiss notification' }).isVisible())
    await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/armory-overhaul-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Army', exact: true }).click();
  await page.getByLabel('Soldiers to transfer').fill('3');
  await page.getByRole('button', { name: 'Transfer 3 soldiers' }).click();
  await expect(defense).toContainText('5 need weapons');
  await expect(offense).toContainText('0 need weapons');
  await page.waitForTimeout(550);
  await page.getByRole('combobox', { name: 'Destination', exact: true }).selectOption('defense');
  await page.getByLabel('Recruits to hire').fill('2');
  await page.getByRole('button', { name: 'Recruit 2 soldiers' }).click();
  await expect(defense).toContainText('7 need weapons');
  if (await page.getByRole('button', { name: 'Dismiss notification' }).isVisible())
    await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/army-overhaul-mobile.png', fullPage: true });
  saved = (await db.doc(`realms/${user.uid}`).get()).data();
  await db.doc(`realms/${user.uid}`).update({
    'game.expedition': { troops: 5, dungeon: 0, nextStage: 2, gold: 0, items: [], renown: 0 },
    revision: saved.revision + 1,
  });
  await page.reload();
  await expect(offense).toContainText('5 on expedition');
  await expect(page.getByRole('button', { name: 'Transfer 1 soldier' })).toBeDisabled();
  await page.getByRole('button', { name: 'Equip offense', exact: true }).click();
  await page.getByRole('button', { name: 'Manage Sentinel spears' }).click();
  await expect(inspector).toContainText('Extract before changing offensive equipment');
  expect(errors).toEqual([]);
});

test('returning player sees defense losses, can acknowledge persistently and inspect settlement value', async ({
  page,
}) => {
  const { createRequire } = await import('node:module');
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const app = require('firebase-admin/app').initializeApp(
    { projectId: 'demo-ash-and-oath' },
    `defense-${Date.now()}`,
  );
  const db = require('firebase-admin/firestore').getFirestore(app, '(default)');
  const email = `defense-${Date.now()}@example.test`,
    password = 'Emulator-only-123';
  const user = await require('firebase-admin/auth')
    .getAuth(app)
    .createUser({ email, password, emailVerified: true });
  const game = require('./lib/src/game/engine.js').newGame();

  game.faction = 'iron';
  game.seq = 100;
  game.defenseReports = [
    {
      seq: 90,
      attackerName: 'Cairn Ironhand',
      time: Date.now() - 3600000,
      defended: false,
      goldLost: 432,
      troopsLost: 0,
      weaponsLost: 0,
      armorLost: 0,
      attackPower: 500,
      defensePower: 100,
      shieldUntil: Date.now(),
    },
  ];
  await db
    .doc(`realms/${user.uid}`)
    .set({ game, revision: 0, enlisted: true, shieldUntil: 0, lastActionAt: 0 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5180/#overview');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Enter your realm', exact: true }).click();
  const notice = page.getByRole('region', { name: 'Defense notifications' });
  await expect(notice).toContainText('1 unread attack report');
  await expect(notice).toContainText('432 gold lost');
  await page.getByRole('button', { name: 'Attack log', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Attack log' });
  await expect(dialog).toContainText('Cairn Ironhand');
  await expect(dialog).toContainText('Realm plundered');
  await page.screenshot({ path: 'test-results/defense-log-desktop.png' });
  await dialog.getByRole('button', { name: 'Mark reports as read' }).click();
  await expect(dialog.getByRole('button', { name: 'Mark reports as read' })).toHaveCount(0);
  await page.reload();
  await expect(notice).not.toContainText('unread');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Attack log', exact: true }).click();
  await expect(dialog).toContainText('432');
  await page.screenshot({ path: 'test-results/defense-log-mobile.png' });
  await dialog.getByRole('button', { name: 'Close dialog' }).click();
  await page.goto('http://127.0.0.1:5180/#settlement');
  await expect(page.locator('.settlement-value')).toContainText('+420 gold per hour');
  await expect(page.locator('.settlement-value')).toContainText('1.9 hours');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/settlement-value-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
