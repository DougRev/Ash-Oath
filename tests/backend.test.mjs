import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

// Deliberately hard-coded demo project + loopback: these tests cannot use live data.
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
initializeApp({ projectId: 'demo-ash-and-oath' });
const db = getFirestore('(default)');
const adminAuth = getAuth();
const api = 'http://127.0.0.1:5001/demo-ash-and-oath/us-central1/';
const { newGame } = require('./lib/src/game/engine.js');
const { publicRealm } = require('./lib/functions/src/combat.js');

async function account(verified = false) {
  const email = `qa-${randomUUID()}@example.test`,
    password = 'emulator-test-only-123';
  const r = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  let a = await r.json();
  assert.ok(a.localId, JSON.stringify(a));
  if (verified) {
    await adminAuth.updateUser(a.localId, { emailVerified: true });
    a = await (
      await fetch(
        'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        },
      )
    ).json();
  }
  return { uid: a.localId, token: a.idToken };
}
async function call(a, name, data) {
  const r = await fetch(api + name, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(a ? { Authorization: `Bearer ${a.token}` } : {}),
    },
    body: JSON.stringify({ data }),
  });
  const body = await r.json();
  return { status: r.status, ...body };
}
async function seed(a, values = {}) {
  const realm = {
    game: { ...newGame(), ...values },
    revision: 0,
    enlisted: false,
    shieldUntil: 0,
    lastActionAt: 0,
  };
  await db.doc(`realms/${a.uid}`).set(realm);
  await db.doc(`publicRealms/${a.uid}`).set(publicRealm(a.uid, realm));
  return realm;
}
const command = (action, revision = 0, requestId = randomUUID()) => ({
  action,
  revision,
  requestId,
});
async function saved(a) {
  return (await db.doc(`realms/${a.uid}`).get()).data();
}

test('authentication is required; server creates one realm and never accepts imported gold', async () => {
  assert.equal((await call(null, 'getRealm', {})).error.status, 'UNAUTHENTICATED');
  const a = await account();
  assert.equal((await call(a, 'getRealm', { gold: 999999 })).error.status, 'INVALID_ARGUMENT');
  const first = (await call(a, 'getRealm', { name: 'QA Commander' })).result;
  assert.equal(first.realm.game.gold, 1800);
  assert.equal(first.realm.game.ap, 36);
  const again = (await call(a, 'getRealm', { name: 'Changed' })).result;
  assert.equal(again.realm.game.name, 'QA Commander');
  assert.equal(again.realm.revision, 0);
});
test('the configured game database rejects direct client tampering and cross-account reads', async () => {
  const a = await account(),
    b = await account();
  await call(a, 'getRealm', {});
  const endpoint = `http://127.0.0.1:8080/v1/projects/demo-ash-and-oath/databases/(default)/documents/realms/${a.uid}`;
  assert.equal(
    (await fetch(endpoint, { headers: { Authorization: `Bearer ${a.token}` } })).status,
    200,
  );
  assert.equal(
    (await fetch(endpoint, { headers: { Authorization: `Bearer ${b.token}` } })).status,
    403,
  );
  assert.equal((await fetch(endpoint)).status, 403);
  const forged = await fetch(endpoint, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${a.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { gold: { integerValue: '999999' } } }),
  });
  assert.equal(forged.status, 403);
  assert.equal((await saved(a)).game.gold, 1800);
});

test('forged actions, extra fields, invalid enums, negative counts, clock control and paths are rejected', async () => {
  const a = await account();
  await call(a, 'getRealm', {});
  for (const action of [
    { type: 'advance' },
    { type: 'recruit', role: 'offense', count: -10 },
    { type: 'arm', role: '__proto__', count: 1 },
    { type: 'fight', mode: 'personal', dungeon: 0, stage: 99, tactic: 'balanced' },
    { type: 'chest', tier: 0, gold: 0 },
    { type: 'attack', opponent: '../../realms', tactic: 'balanced' },
    { type: 'rename', name: 'x'.repeat(25) },
  ]) {
    assert.equal(
      (await call(a, 'performAction', command(action))).error?.status,
      'INVALID_ARGUMENT',
      JSON.stringify(action),
    );
  }
  assert.equal((await saved(a)).game.gold, 1800);
});
test('concurrent identical orders spend once; mismatched replay is rejected; stale revision cannot spend', async () => {
  const a = await account();
  await call(a, 'getRealm', {});
  const c = command({ type: 'build', building: 'armory' });
  const results = await Promise.all([call(a, 'performAction', c), call(a, 'performAction', c)]);
  for (const r of results) assert.equal(r.result?.realm.game.gold, 1500, JSON.stringify(r));
  assert.equal((await saved(a)).revision, 1);
  assert.equal(
    (await call(a, 'performAction', { ...c, action: { type: 'upgrade' } })).error.status,
    'ALREADY_EXISTS',
  );
  assert.equal(
    (await call(a, 'performAction', command({ type: 'upgrade' }))).error.status,
    'ABORTED',
  );
  assert.equal((await saved(a)).game.gold, 1500);
});
test('different simultaneous purchases cannot double-spend a shared revision', async () => {
  const a = await account();
  await call(a, 'getRealm', {});
  const results = await Promise.all([
    call(a, 'performAction', command({ type: 'upgrade' })),
    call(a, 'performAction', command({ type: 'build', building: 'armory' })),
  ]);
  assert.equal(results.filter((r) => r.result).length, 1);
  assert.equal(results.filter((r) => r.error?.status === 'ABORTED').length, 1);
  const realm = await saved(a);
  assert.equal(realm.revision, 1);
  assert.equal(realm.game.gold, realm.game.level === 1 ? 1000 : 1500);
});
test('server time accrues once with the offline cap; clients cannot supply a timestamp', async () => {
  const a = await account();
  const now = Date.now();
  await seed(a, { lastTick: now - 24 * 3600000 });
  const first = (await call(a, 'getRealm', {})).result.realm;
  assert.equal(first.game.gold, 1800 + 144 * 30);
  assert.equal(first.game.ap, 60);
  assert.equal((await call(a, 'getRealm', {})).result.realm.game.gold, first.game.gold);
  assert.equal(
    (await call(a, 'getRealm', { now: now + 999999999 })).error.status,
    'INVALID_ARGUMENT',
  );
});
test('chest retry returns the same item; full inventory and invalid purchases preserve treasury', async () => {
  const a = await account();
  await seed(a, {
    level: 1,
    buildings: { armory: true, blacksmith: true, trader: true, watchtower: false },
  });
  const c = command({ type: 'chest', tier: 0 });
  const first = await call(a, 'performAction', c);
  const second = await call(a, 'performAction', c);
  assert.ok(first.result, JSON.stringify(first));
  assert.deepEqual(first.result.realm.game.lastLoot, second.result.realm.game.lastLoot);
  assert.equal((await saved(a)).game.gold, 1550);
  assert.equal((await saved(a)).game.chestsOpened, 1);
  const r = await saved(a);
  r.game.inventory = Array.from({ length: 199 }, (_, i) => ({
    ...r.game.inventory[0],
    id: `r${i + 1}`,
  }));
  r.game.seq = 200;
  r.lastActionAt = 0;
  await db.doc(`realms/${a.uid}`).set(r);
  assert.equal(
    (await call(a, 'performAction', command({ type: 'chest', tier: 0 }, 1))).error.status,
    'FAILED_PRECONDITION',
  );
  assert.equal((await saved(a)).game.gold, 1550);
});
test('army victory and extraction credit campaign once, with no duplicate loot', async () => {
  const a = await account();
  await call(a, 'getRealm', {});
  await seed(a, { faction: 'iron' });
  const before = (await db.doc('campaigns/founders').get()).data().scores.iron;
  const c = command({ type: 'fight', mode: 'army', dungeon: 0, stage: 1, tactic: 'aggressive' });
  const first = await call(a, 'performAction', c);
  assert.equal(first.result.realm.game.lastBattle.won, true);
  await call(a, 'performAction', c);
  assert.equal((await db.doc('campaigns/founders').get()).data().scores.iron, before + 5);
  const r = await saved(a);
  r.game.expedition = { dungeon: 0, nextStage: 2, gold: 200, items: [], renown: 5 };
  r.lastActionAt = 0;
  await db.doc(`realms/${a.uid}`).set(r);
  const extract = command({ type: 'extract' }, r.revision);
  const banked = (await call(a, 'performAction', extract)).result.realm;
  await call(a, 'performAction', extract);
  assert.equal((await saved(a)).game.gold, banked.game.gold);
  assert.equal((await db.doc('campaigns/founders').get()).data().scores.iron, before + 10);
});
test('PvP verifies identity, atomically transfers gold, preserves defenders and shields the victim', async () => {
  const a = await account(true),
    d = await account(true),
    other = await account(true);
  await call(a, 'getRealm', {});
  await seed(a, { faction: 'iron', level: 1 });
  await seed(d, { faction: 'tide', level: 1, gold: 5000 });
  await seed(other, { faction: 'ashen', level: 1 });
  for (const u of [a, d, other]) await db.doc(`realms/${u.uid}`).update({ enlisted: true });
  const c = command({ type: 'attack', opponent: d.uid, tactic: 'aggressive' });
  const result = await call(a, 'performAction', c);
  assert.ok(result.result, JSON.stringify(result));
  const loot = result.result.realm.game.lastBattle.gold;
  assert.ok(loot >= 750 && loot <= 4900);
  await call(a, 'performAction', c);
  const ar = await saved(a),
    dr = await saved(d);
  assert.equal(ar.game.gold, 1800 + loot);
  assert.equal(dr.game.gold, 5000 - loot);
  assert.equal(ar.game.gold + dr.game.gold, 6800);
  assert.equal(ar.game.ap, 28);
  assert.equal(dr.game.troops.defense, 4);
  assert.ok(dr.shieldUntil > Date.now());
  assert.equal(dr.revision, 1);
  assert.equal(dr.game.defenseReports.length, 1);
  const report = dr.game.defenseReports[0];
  assert.equal(report.goldLost, loot);
  assert.equal(report.attackerName, ar.game.name);
  assert.equal(report.defended, false);
  assert.equal(report.troopsLost + report.weaponsLost + report.armorLost, 0);
  assert.equal(report.shieldUntil, dr.shieldUntil);
  const acknowledge = command({ type: 'readDefenseReports', through: report.seq }, 1);
  assert.ok((await call(d, 'performAction', acknowledge)).result);
  assert.ok((await call(d, 'performAction', acknowledge)).result);
  assert.equal((await saved(d)).game.defenseReadSeq, report.seq);
  assert.equal((await saved(d)).game.gold, dr.game.gold);

  assert.equal(
    (
      await call(
        other,
        'performAction',
        command({ type: 'attack', opponent: d.uid, tactic: 'balanced' }),
      )
    ).error.status,
    'FAILED_PRECONDITION',
  );
  await db.doc(`realms/${a.uid}`).update({ lastActionAt: 0 });
  assert.equal(
    (await call(a, 'performAction', command({ type: 'enlist', enabled: false }, 1))).error.status,
    'FAILED_PRECONDITION',
  );
  const unverified = await account();
  await seed(unverified, { faction: 'iron', level: 1 });
  assert.equal(
    (await call(unverified, 'performAction', command({ type: 'enlist', enabled: true }))).error
      .status,
    'PERMISSION_DENIED',
  );
});

test('admin endpoints reject ordinary users and enforce verified, single-use invitations', async () => {
  const { createHash } = await import('node:crypto');
  const player = await account();
  for (const name of ['adminOverview', 'adminPlayers', 'adminModerate', 'adminDungeonForecast']) {
    assert.equal((await call(null, name, {})).error.status, 'UNAUTHENTICATED');
    assert.equal((await call(player, name, {})).error.status, 'PERMISSION_DENIED');
  }
  const user = await adminAuth.getUser(player.uid);
  const invite = db.doc(
    'adminInvitations/' + createHash('sha256').update(user.email).digest('hex'),
  );
  await invite.set({ email: user.email, expiresAt: Date.now() + 60000 });
  assert.equal((await call(player, 'getAdminAccess', {})).result.admin, false);
  assert.equal((await db.doc(`adminRoles/${player.uid}`).get()).exists, false);
  const owner = await account(true),
    ownerUser = await adminAuth.getUser(owner.uid);
  await db
    .doc('adminInvitations/' + createHash('sha256').update(ownerUser.email).digest('hex'))
    .set({ email: ownerUser.email, expiresAt: Date.now() + 60000 });
  assert.equal((await call(owner, 'getAdminAccess', {})).result.admin, true);
  assert.equal((await call(owner, 'getAdminAccess', {})).result.admin, true);
  assert.equal((await call(owner, 'adminOverview', {})).status, 200);
  await db.doc(`adminRoles/${owner.uid}`).delete();
  assert.equal((await call(owner, 'getAdminAccess', {})).result.admin, false);
  assert.equal((await call(owner, 'adminOverview', {})).error.status, 'PERMISSION_DENIED');
});

test('admin moderation preserves progress, blocks commands, audits once and restores safely', async () => {
  const owner = await account(true),
    player = await account(true);
  await db.doc(`adminRoles/${owner.uid}`).set({ role: 'admin' });
  await seed(owner);
  await seed(player, { gold: 4321 });
  const data = {
    uid: player.uid,
    suspended: true,
    reason: 'Investigating reported abuse',
    revision: 0,
    requestId: randomUUID(),
  };
  assert.equal(
    (await call(owner, 'adminModerate', { ...data, uid: owner.uid })).error.status,
    'FAILED_PRECONDITION',
  );
  assert.equal(
    (await call(owner, 'adminModerate', { ...data, reason: '' })).error.status,
    'INVALID_ARGUMENT',
  );
  assert.equal((await call(owner, 'adminModerate', data)).status, 200);
  assert.equal((await call(owner, 'adminModerate', data)).status, 200);
  assert.equal((await saved(player)).game.gold, 4321);
  assert.equal((await saved(player)).revision, 1);
  assert.equal((await call(player, 'getRealm', {})).error.status, 'PERMISSION_DENIED');
  assert.equal(
    (await call(player, 'performAction', command({ type: 'build', building: 'armory' }, 1))).error
      .status,
    'PERMISSION_DENIED',
  );
  assert.equal(
    (await call(owner, 'adminModerate', { ...data, suspended: false, requestId: randomUUID() }))
      .error.status,
    'ABORTED',
  );
  assert.equal(
    (
      await call(owner, 'adminModerate', {
        ...data,
        suspended: false,
        revision: 1,
        requestId: randomUUID(),
      })
    ).status,
    200,
  );
  assert.equal((await call(player, 'getRealm', {})).result.realm.game.gold, 4321);
  assert.equal((await saved(player)).enlisted, false);
  const result = await call(owner, 'adminPlayers', { search: player.uid });
  assert.equal(result.result.players[0].uid, player.uid);
  assert.equal(result.result.players[0].suspended, false);
  assert.equal(
    (await call(player, 'adminPlayers', { search: owner.uid })).error.status,
    'PERMISSION_DENIED',
  );
  const direct = await fetch(
    `http://127.0.0.1:8080/v1/projects/demo-ash-and-oath/databases/(default)/documents/adminRoles/${owner.uid}`,
    { headers: { Authorization: `Bearer ${owner.token}` } },
  );
  assert.equal(direct.status, 403);
});

test('server validates deployment and retries cannot duplicate dungeon losses or companion XP', async () => {
  const a = await account(true);
  await seed(a, {
    faction: 'iron',
    level: 4,
    troops: { offense: 100, defense: 10 },
    arms: { offense: 100, defense: 10 },
  });
  const fight = {
    type: 'fight',
    mode: 'personal',
    dungeon: 0,
    stage: 1,
    tactic: 'guarded',
    troops: 20,
  };
  assert.equal(
    (await call(a, 'performAction', command({ ...fight, troops: 0 }))).error.status,
    'INVALID_ARGUMENT',
  );
  assert.equal(
    (await call(a, 'performAction', command({ ...fight, troops: 101 }))).error.status,
    'FAILED_PRECONDITION',
  );
  const cmd = command(fight),
    first = await call(a, 'performAction', cmd);
  assert.equal(first.status, 200);
  const after = first.result.realm;
  assert.ok(after.game.lastBattle.casualties > 0);
  assert.equal(after.game.troops.offense, 100 - after.game.lastBattle.casualties);
  const replay = await call(a, 'performAction', cmd);
  assert.equal(replay.result.realm.revision, after.revision);
  assert.equal(replay.result.realm.game.troops.offense, after.game.troops.offense);
  await new Promise((r) => setTimeout(r, 550));
  assert.equal(
    (await call(a, 'performAction', command({ ...fight, stage: 2, troops: 20 }, after.revision)))
      .error.status,
    'FAILED_PRECONDITION',
  );
  assert.equal((await saved(a)).game.troops.defense, 10);
});

test('equipment purchases are authoritative, idempotent and separate from equipping', async () => {
  const a = await account(true);
  await seed(a, {
    level: 3,
    gold: 20000,
    buildings: { armory: true, blacksmith: true, trader: true, watchtower: false },
  });
  assert.equal(
    (
      await call(
        a,
        'performAction',
        command({ type: 'buyKit', role: 'offense', kit: 'spear', count: -1 }),
      )
    ).error.status,
    'INVALID_ARGUMENT',
  );
  const order = command({ type: 'buyKit', role: 'offense', kit: 'spear', count: 5 });
  const first = await call(a, 'performAction', order);
  assert.equal(first.status, 200);
  assert.equal(first.result.realm.game.arms.offense, 6);
  assert.equal(first.result.realm.game.armyEquipment.offense.weapons.spear, 5);
  assert.equal(first.result.realm.game.gold, 19650);
  const again = await call(a, 'performAction', order);
  assert.equal(again.result.realm.game.gold, 19650);
  await new Promise((r) => setTimeout(r, 550));
  assert.equal(
    (
      await call(
        a,
        'performAction',
        command({ type: 'equipKit', role: 'offense', kit: 'spear', count: 6 }, 1),
      )
    ).error.status,
    'FAILED_PRECONDITION',
  );
  const equip = await call(
    a,
    'performAction',
    command({ type: 'equipKit', role: 'offense', kit: 'spear', count: 5 }, 1),
  );
  assert.equal(equip.status, 200);
  assert.equal(equip.result.realm.game.gold, 19650);
  assert.equal(equip.result.realm.game.arms.offense, 6);
});

test('admin forecasts are read-only, bounded to the player army and revoked with the role', async () => {
  const owner = await account(true),
    player = await account(true);
  await db.doc(`adminRoles/${owner.uid}`).set({ role: 'admin' });
  await seed(player);
  const before = await saved(player);
  const data = { uid: player.uid, troops: 6, tactic: 'balanced', mode: 'army' };
  assert.equal(
    (await call(player, 'adminDungeonForecast', data)).error.status,
    'PERMISSION_DENIED',
  );
  const result = await call(owner, 'adminDungeonForecast', data);
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.equal(result.result.rows.length, 15);
  assert.equal(result.result.income, 30);
  assert.ok(result.result.rows.every((r) => r.min >= 1 && r.max <= 6 && r.defeat <= 6));
  assert.deepEqual(await saved(player), before);
  for (const bad of [
    { troops: 7 },
    { troops: 0 },
    { troops: 1.5 },
    { tactic: 'cheat' },
    { extra: true },
  ]) {
    assert.equal(
      (await call(owner, 'adminDungeonForecast', { ...data, ...bad })).error.status,
      'INVALID_ARGUMENT',
    );
  }
  await db.doc(`adminRoles/${owner.uid}`).delete();
  assert.equal((await call(owner, 'adminDungeonForecast', data)).error.status, 'PERMISSION_DENIED');
});

test('bank retries spend once and PvP never plunders protected savings', async () => {
  const a = await account(true),
    d = await account(true);
  await call(a, 'getRealm', {});
  await seed(a, { faction: 'iron', level: 1 });
  await seed(d, {
    faction: 'tide',
    level: 1,
    gold: 10000,
    buildings: { armory: true, blacksmith: true, trader: true, watchtower: false, bank: true },
  });
  const deposit = command({ type: 'bank', direction: 'deposit', amount: 5000 });
  const deposited = await call(d, 'performAction', deposit);
  assert.equal(deposited.result.realm.game.gold, 5000);
  assert.equal(deposited.result.realm.game.bankGold, 4750);
  await call(d, 'performAction', deposit);
  assert.equal((await saved(d)).game.bankGold, 4750);
  for (const u of [a, d])
    await db.doc(`realms/${u.uid}`).update({ enlisted: true, lastActionAt: 0 });
  const attack = command({ type: 'attack', opponent: d.uid, tactic: 'aggressive' });
  const won = await call(a, 'performAction', attack);
  const loot = won.result.realm.game.lastBattle.gold;
  assert.ok(loot >= 750 && loot <= 4900);
  const after = await saved(d);
  assert.equal(after.game.gold, 5000 - loot);
  assert.equal(after.game.bankGold, 4750);
  await call(a, 'performAction', attack);
  assert.equal((await saved(d)).game.bankGold, 4750);
  const withdraw = command({ type: 'bank', direction: 'withdraw', amount: 4750 }, after.revision);
  const restored = await call(d, 'performAction', withdraw);
  assert.equal(restored.result.realm.game.gold, 9750 - loot);
  assert.equal(restored.result.realm.game.bankGold, 0);
  await call(d, 'performAction', withdraw);
  assert.equal((await saved(d)).game.gold, 9750 - loot);
  assert.equal((await db.doc(`publicRealms/${d.uid}`).get()).data().bankGold, undefined);
});

test('concurrent bank deposits cannot double-spend and malformed transfers are rejected', async () => {
  const a = await account();
  await call(a, 'getRealm', {});
  await seed(a, {
    level: 1,
    buildings: { armory: false, blacksmith: false, trader: false, watchtower: false, bank: true },
  });
  for (const amount of [-1, 0, 1.5, 1000000001])
    assert.equal(
      (await call(a, 'performAction', command({ type: 'bank', direction: 'deposit', amount })))
        .error.status,
      'INVALID_ARGUMENT',
    );
  const results = await Promise.all(
    [1, 2].map(() =>
      call(a, 'performAction', command({ type: 'bank', direction: 'deposit', amount: 1500 })),
    ),
  );
  assert.equal(results.filter((r) => r.result).length, 1);
  const savedRealm = await saved(a);
  assert.equal(savedRealm.game.gold, 300);
  assert.equal(savedRealm.game.bankGold, 1425);
});

test('a racing deposit and incoming attack conserve gold and cannot raid the bank', async () => {
  const a = await account(true),
    d = await account(true);
  await call(a, 'getRealm', {});
  await seed(a, { level: 1, faction: 'iron' });
  await seed(d, {
    level: 1,
    faction: 'tide',
    gold: 10000,
    buildings: { armory: false, blacksmith: false, trader: false, watchtower: false, bank: true },
  });
  for (const u of [a, d]) await db.doc(`realms/${u.uid}`).update({ enlisted: true });
  const [attack, deposit] = await Promise.all([
    call(a, 'performAction', command({ type: 'attack', opponent: d.uid, tactic: 'aggressive' })),
    call(d, 'performAction', command({ type: 'bank', direction: 'deposit', amount: 5000 })),
  ]);
  assert.ok(attack.result, JSON.stringify(attack));
  const attacker = await saved(a),
    defender = await saved(d);
  const bank = defender.game.bankGold ?? 0;
  assert.equal(bank, deposit.result ? 4750 : 0);
  assert.equal(attacker.game.gold + defender.game.gold + bank, 11800 - (deposit.result ? 250 : 0));
  const exposed = deposit.result ? 5000 : 10000;
  assert.ok(attack.result.realm.game.lastBattle.gold >= Math.floor(exposed * 0.15));
  assert.ok(attack.result.realm.game.lastBattle.gold <= Math.floor(exposed * 0.98));
});

test('AI bounties are authoritative, replay once, and cannot affect real PvP or campaign score', async () => {
  const a = await account();
  await call(a, 'getRealm', {});
  await seed(a, { faction: 'iron' });
  const campaign = (await db.doc('campaigns/founders').get()).data().scores.iron;
  const c = command({ type: 'raidRival', rival: 'ai-0-0', tactic: 'balanced' });
  const r = await call(a, 'performAction', c);
  assert.ok(r.result, JSON.stringify(r));
  assert.equal(r.result.realm.game.gold, 2200);
  assert.equal(r.result.realm.game.rivalRaids.wins, 1);
  assert.equal(r.result.realm.enlisted, false);
  assert.equal((await call(a, 'performAction', c)).result.realm.game.gold, 2200);
  assert.equal((await saved(a)).game.ap, 28);
  assert.equal((await db.doc('campaigns/founders').get()).data().scores.iron, campaign);
  await db.doc(`realms/${a.uid}`).update({ lastActionAt: 0 });
  const retry = await call(a, 'performAction', command(c.action, 1));
  assert.equal(retry.error.status, 'FAILED_PRECONDITION');
  assert.equal(
    (await call(a, 'performAction', command({ ...c.action, gold: 999999 }, 1))).error.status,
    'INVALID_ARGUMENT',
  );
});

test('mixed weapons persist and one purchased upgrade keeps other soldiers armed', async () => {
  const a = await account();
  await call(a, 'getRealm', {});
  await seed(a, {
    level: 3,
    gold: 5000,
    faction: 'iron',
    buildings: { armory: true, blacksmith: true, trader: false, watchtower: false },
  });
  const buy = await call(
    a,
    'performAction',
    command({ type: 'buyKit', role: 'offense', kit: 'halberd', count: 1 }),
  );
  assert.ok(buy.result);
  await db.doc(`realms/${a.uid}`).update({ lastActionAt: 0 });
  const c = command({ type: 'equipKit', role: 'offense', kit: 'halberd', count: 1 }, 1);
  const equipped = await call(a, 'performAction', c);
  assert.equal(equipped.result.realm.game.arms.offense, 6);
  assert.equal(equipped.result.realm.game.armyEquipment.offense.equippedWeapons.militia, 5);
  assert.equal(equipped.result.realm.game.armyEquipment.offense.equippedWeapons.halberd, 1);
  await call(a, 'performAction', c);
  assert.equal((await saved(a)).game.gold, 4850);
});

test('an undefended realm with less than 1000 gold can be raided while bank savings remain safe', async () => {
  const a = await account(true),
    d = await account(true);
  await call(a, 'getRealm', {});
  await seed(a, { level: 1, faction: 'iron' });
  await seed(d, {
    level: 1,
    faction: 'tide',
    gold: 183,
    bankGold: 9000,
    troops: { offense: 10, defense: 0 },
    arms: { offense: 6, defense: 0 },
    buildings: { armory: true, blacksmith: true, trader: false, watchtower: false, bank: true },
  });
  for (const u of [a, d]) await db.doc(`realms/${u.uid}`).update({ enlisted: true });
  const profile = publicRealm(d.uid, await saved(d));
  assert.equal(profile.plunder, 183);
  assert.equal(profile.defense, 0);
  const c = command({ type: 'attack', opponent: d.uid, tactic: 'balanced' });
  const first = await call(a, 'performAction', c);
  assert.ok(first.result, JSON.stringify(first));
  const battle = first.result.realm.game.lastBattle;
  assert.ok(battle.gold >= 164 && battle.gold <= 179);
  assert.match(battle.lines.join(' '), /Dominant victory/);
  assert.equal((await saved(d)).game.gold, 183 - battle.gold);
  assert.equal((await saved(d)).game.bankGold, 9000);
  const replay = await call(a, 'performAction', c);
  assert.deepEqual(replay.result.realm.game.lastBattle, battle);
});

test('buy-and-equip is atomic and casualty equipment destruction is replay-safe', async () => {
  const a = await account();
  await call(a, 'getRealm', {});
  await seed(a, {
    level: 1,
    faction: 'iron',
    gold: 5000,
    buildings: { armory: true, blacksmith: true, trader: false, watchtower: false },
  });
  const purchase = command({
    type: 'buyKit',
    role: 'offense',
    kit: 'spear',
    count: 2,
    equip: true,
  });
  const armed = await call(a, 'performAction', purchase);
  assert.equal(armed.result.realm.game.gold, 4860);
  assert.equal(armed.result.realm.game.armyEquipment.offense.equippedWeapons.spear, 2);
  assert.equal((await call(a, 'performAction', purchase)).result.realm.game.gold, 4860);
  await db.doc(`realms/${a.uid}`).update({ lastActionAt: 0 });
  const fight = command(
    { type: 'fight', mode: 'army', dungeon: 0, stage: 1, tactic: 'aggressive', troops: 1 },
    1,
  );
  const defeat = await call(a, 'performAction', fight);
  assert.ok(defeat.result, JSON.stringify(defeat));
  assert.deepEqual(defeat.result.realm.game.lastBattle.gearLost, { weapons: 1, armor: 0 });
  assert.equal(defeat.result.realm.game.armyEquipment.offense.weapons.spear, 1);
  await call(a, 'performAction', fight);
  assert.equal((await saved(a)).game.armyEquipment.offense.weapons.spear, 1);
});

test('profanity is blocked on both creation and rename without changing the saved name', async () => {
  const a = await account();
  assert.equal((await call(a, 'getRealm', { name: 'F U C K' })).error.status, 'INVALID_ARGUMENT');
  assert.equal((await db.doc(`realms/${a.uid}`).get()).exists, false);
  await call(a, 'getRealm', { name: 'Scunthorpe' });
  assert.equal(
    (await call(a, 'performAction', command({ type: 'rename', name: 'Sh1thead' }))).error.status,
    'INVALID_ARGUMENT',
  );
  assert.equal((await saved(a)).game.name, 'Scunthorpe');
});

test('building upgrades and seasonal faction changes are atomic and replay-safe', async () => {
  const a = await account();
  await seed(a, {
    level: 1,
    gold: 10000,
    faction: 'iron',
    buildings: { armory: true, bank: true, blacksmith: true, trader: false, watchtower: false },
  });
  const c = command({ type: 'upgradeBarracks' });
  const upgraded = await call(a, 'performAction', c);
  assert.equal(upgraded.result.realm.game.barracksLevel, 1);
  assert.equal((await call(a, 'performAction', c)).result.realm.game.gold, 9400);
  await db.doc(`realms/${a.uid}`).update({ lastActionAt: 0 });
  const bank = await call(a, 'performAction', command({ type: 'upgradeBank' }, 1));
  assert.equal(bank.result.realm.game.bankLevel, 2);
  await db.doc(`realms/${a.uid}`).update({ lastActionAt: 0 });
  const change = command({ type: 'faction', id: 'tide' }, 2);
  assert.equal((await call(a, 'performAction', change)).result.realm.game.faction, 'tide');
  assert.equal((await call(a, 'performAction', change)).result.realm.game.faction, 'tide');
  await db.doc(`realms/${a.uid}`).update({ lastActionAt: 0 });
  assert.equal(
    (await call(a, 'performAction', command({ type: 'faction', id: 'ashen' }, 3))).error.status,
    'FAILED_PRECONDITION',
  );
  const profile = (await db.doc(`publicRealms/${a.uid}`).get()).data();
  assert.equal(profile.faction, 'tide');
  assert.ok(profile.power > 0);
});

test('same-faction PvP transfers gold but awards no renown or campaign score', async () => {
  const a = await account(true),
    d = await account(true);
  await seed(a, { level: 1, faction: 'iron' });
  await seed(d, {
    level: 1,
    faction: 'iron',
    troops: { offense: 6, defense: 0 },
    arms: { offense: 6, defense: 0 },
  });
  await db.doc(`realms/${a.uid}`).update({ enlisted: true });
  await db.doc(`realms/${d.uid}`).update({ enlisted: true });
  const before = (await db.doc('campaigns/founders').get()).data().scores.iron;
  const r = await call(
    a,
    'performAction',
    command({ type: 'attack', opponent: d.uid, tactic: 'balanced' }),
  );
  assert.equal(r.result.realm.game.lastBattle.won, true);
  assert.equal(r.result.realm.game.lastBattle.renown, 0);
  assert.equal((await db.doc('campaigns/founders').get()).data().scores.iron, before);
  assert.equal((await saved(a)).game.gold + (await saved(d)).game.gold, 3600);
});

test('interest accrues on server time once and rejects deposits exceeding capacity', async () => {
  const a = await account();
  await seed(a, {
    level: 1,
    bankGold: 4999,
    bankInterestRemainder: 0.99,
    lastTick: Date.now() - 300000,
    buildings: { armory: false, bank: true, blacksmith: false, trader: false, watchtower: false },
  });
  const r = (await call(a, 'getRealm', {})).result.realm;
  assert.equal(r.game.bankGold, 5000);
  assert.equal((await call(a, 'getRealm', {})).result.realm.game.bankGold, 5000);
  assert.equal(
    (
      await call(
        a,
        'performAction',
        command({ type: 'bank', direction: 'deposit', amount: 2 }, r.revision),
      )
    ).error.status,
    'FAILED_PRECONDITION',
  );
  assert.equal((await saved(a)).game.bankGold, 5000);
});
