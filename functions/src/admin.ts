import { createHash } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { CAMPAIGN_ID, DATABASE_ID, type RealmDocument } from '../../src/game/online';
import { publicRealm } from './combat';
import { dungeonForecast, stats, winChance } from '../../src/game/engine';
import { DUNGEONS } from '../../src/game/data';
const options = {
  region: 'us-central1',
  maxInstances: 3,
  minInstances: 0,
  memory: '256MiB' as const,
  timeoutSeconds: 30,
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
};
const database = () => getFirestore(DATABASE_ID);
async function identity(request: CallableRequest) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const user = await getAuth().getUser(request.auth.uid);
  if (user.disabled || !user.emailVerified || request.auth.token.email_verified !== true)
    throw new HttpsError('permission-denied', 'A verified account is required.');
  return user;
}
async function requireAdmin(request: CallableRequest) {
  const user = await identity(request);
  const role = await database().doc(`adminRoles/${user.uid}`).get();
  if (role.data()?.role !== 'admin')
    throw new HttpsError('permission-denied', 'Admin access required.');
  return user.uid;
}
const id = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);
export const adminDungeonForecast = onCall(options, async (request) => {
  await requireAdmin(request);
  const parsed = z
    .object({
      uid: id,
      troops: z.number().int().min(1).max(1000),
      tactic: z.enum(['balanced', 'guarded', 'aggressive']),
      mode: z.enum(['army', 'personal']),
    })
    .strict()
    .safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid forecast.');
  const { uid, troops, tactic, mode } = parsed.data;
  const doc = await database().doc(`realms/${uid}`).get();
  if (!doc.exists) throw new HttpsError('not-found', 'Realm not found.');
  const { game, revision } = doc.data() as RealmDocument;
  const available = game.expedition?.troops ?? game.troops.offense;
  if (troops > available)
    throw new HttpsError('invalid-argument', `Only ${available} troops available.`);
  const now = Date.now();
  return {
    revision,
    income: stats(game, now).income,
    rows: DUNGEONS.flatMap((d, dungeon) =>
      d.enemy.map((enemy, i) => {
        const f = dungeonForecast(game, mode, tactic, dungeon, i + 1, troops, now);
        return {
          name: `${d.name} · ${i + 1}`,
          chance: winChance(f.power, enemy),
          min: f.victoryLossMin,
          max: f.victoryLossMax,
          defeat: f.defeatLosses,
          replacementMin: f.victoryLossMin * 60,
          replacementMax: f.victoryLossMax * 60,
          baseGold: Math.floor(d.gold[i] * (mode === 'personal' ? 1.5 : 1)),
        };
      }),
    ),
  };
});
export const getAdminAccess = onCall(options, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  if (request.auth.token.email_verified !== true) return { admin: false };
  const user = await identity(request);
  const db = database();
  const role = db.doc(`adminRoles/${user.uid}`);
  const hash = createHash('sha256')
    .update((user.email || '').toLowerCase())
    .digest('hex');
  const invite = db.doc(`adminInvitations/${hash}`);
  return db.runTransaction(async (tx) => {
    const [r, i] = await tx.getAll(role, invite);
    if (r.data()?.role === 'admin') return { admin: true };
    const invitation = i.data();
    if (
      invitation?.email !== user.email?.toLowerCase() ||
      invitation?.consumedBy ||
      invitation?.expiresAt < Date.now()
    )
      return { admin: false };
    tx.set(role, { role: 'admin', grantedAt: Date.now() });
    tx.update(invite, { consumedBy: user.uid, consumedAt: Date.now() });
    tx.create(db.collection('adminAudit').doc(), {
      actor: user.uid,
      target: user.uid,
      action: 'accept-invitation',
      reason: 'Verified owner invitation accepted',
      at: Date.now(),
    });
    return { admin: true };
  });
});
export const adminOverview = onCall(options, async (request) => {
  await requireAdmin(request);
  const db = database();
  const [realms, enlisted, suspended, campaign, audit] = await Promise.all([
    db.collection('realms').count().get(),
    db.collection('publicRealms').where('enlisted', '==', true).count().get(),
    db.collection('realms').where('suspended', '==', true).count().get(),
    db.doc(`campaigns/${CAMPAIGN_ID}`).get(),
    db.collection('adminAudit').orderBy('at', 'desc').limit(25).get(),
  ]);
  return {
    realms: realms.data().count,
    enlisted: enlisted.data().count,
    suspended: suspended.data().count,
    campaign: campaign.data() || null,
    audit: audit.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
});
export const adminPlayers = onCall(options, async (request) => {
  await requireAdmin(request);
  const parsed = z
    .object({ search: z.string().trim().max(254).optional(), after: id.optional() })
    .strict()
    .safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid player search.');
  const db = database();
  let docs;
  if (parsed.data.search) {
    const search = parsed.data.search;
    let uid = search;
    if (search.includes('@')) {
      try {
        uid = (await getAuth().getUserByEmail(search)).uid;
      } catch (e) {
        if ((e as { code?: string }).code === 'auth/user-not-found')
          return { players: [], next: null };
        throw e;
      }
    }
    if (!id.safeParse(uid).success) return { players: [], next: null };
    const d = await db.doc(`realms/${uid}`).get();
    docs = d.exists ? [d] : [];
  } else {
    let q = db.collection('realms').orderBy(FieldPath.documentId()).limit(26);
    if (parsed.data.after) q = q.startAfter(parsed.data.after);
    docs = (await q.get()).docs;
  }
  const more = docs.length > 25;
  docs = docs.slice(0, 25);
  const users = docs.length
    ? (await getAuth().getUsers(docs.map((d) => ({ uid: d.id })))).users
    : [];
  return {
    players: docs.map((d) => {
      const r = d.data() as RealmDocument;
      const u = users.find((u) => u.uid === d.id);
      return {
        uid: d.id,
        email: u?.email || '',
        name: r.game.name,
        level: r.game.level,
        faction: r.game.faction,
        gold: r.game.gold,
        bankGold: r.game.bankGold ?? 0,
        ap: r.game.ap,
        renown: r.game.renown,
        enlisted: r.enlisted,
        suspended: !!r.suspended,
        revision: r.revision,
      };
    }),
    next: more ? docs.at(-1)!.id : null,
  };
});
export const adminModerate = onCall(options, async (request) => {
  const actor = await requireAdmin(request);
  const parsed = z
    .object({
      uid: id,
      suspended: z.boolean(),
      reason: z.string().trim().min(8).max(300),
      revision: z.number().int().nonnegative(),
      requestId: z.string().uuid(),
    })
    .strict()
    .safeParse(request.data);
  if (!parsed.success)
    throw new HttpsError(
      'invalid-argument',
      'Provide a player, revision and reason (8–300 characters).',
    );
  const data = parsed.data;
  if (data.uid === actor)
    throw new HttpsError('failed-precondition', 'You cannot suspend your own account.');
  const db = database(),
    ref = db.doc(`realms/${data.uid}`),
    audit = db.doc(`adminAudit/${data.requestId}`);
  return db.runTransaction(async (tx) => {
    const [realm, role, prior] = await tx.getAll(ref, db.doc(`adminRoles/${data.uid}`), audit);
    if (role.data()?.role === 'admin')
      throw new HttpsError('failed-precondition', 'Admin accounts cannot be moderated here.');
    if (prior.exists) {
      const a = prior.data()!;
      if (
        a.actor !== actor ||
        a.target !== data.uid ||
        a.suspended !== data.suspended ||
        a.reason !== data.reason ||
        a.revision !== data.revision
      )
        throw new HttpsError('already-exists', 'Request ID already used.');
      return { ok: true };
    }
    if (!realm.exists) throw new HttpsError('not-found', 'Realm not found.');
    const before = realm.data() as RealmDocument;
    if (before.revision !== data.revision)
      throw new HttpsError(
        'aborted',
        'The realm changed. Refresh the player before applying this action.',
      );
    const next = {
      ...before,
      suspended: data.suspended,
      enlisted: false,
      revision: before.revision + 1,
    };
    // Restore starts a fresh accrual window; suspended time earns no tribute.
    next.game = { ...before.game, lastTick: Date.now() };
    tx.set(ref, next);
    tx.set(db.doc(`publicRealms/${data.uid}`), publicRealm(data.uid, next));
    tx.create(audit, {
      actor,
      target: data.uid,
      action: data.suspended ? 'suspend' : 'restore',
      suspended: data.suspended,
      reason: data.reason,
      revision: data.revision,
      at: Date.now(),
    });
    return { ok: true };
  });
});
