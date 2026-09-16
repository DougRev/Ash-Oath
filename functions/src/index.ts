import { randomInt, createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { accrue, applyAction, newGame, validSave } from '../../src/game/engine';
import {
  CAMPAIGN_ID,
  CAMPAIGN_START,
  CAMPAIGN_END,
  DATABASE_ID,
  INVENTORY_CAP,
  type RealmDocument,
  type RealmResponse,
} from '../../src/game/online';
import { commandSchema, realmRequestSchema } from './validation';
import { publicRealm, resolvePvp } from './combat';

initializeApp();
const db = getFirestore(DATABASE_ID);
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 3,
  minInstances: 0,
  memory: '256MiB',
  timeoutSeconds: 30,
});
const options = { enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true' };
const realmRef = (uid: string) => db.collection('realms').doc(uid);
const profileRef = (uid: string) => db.collection('publicRealms').doc(uid);
const campaignRef = db.collection('campaigns').doc(CAMPAIGN_ID);
const secureRandom = () => randomInt(0, 0x100000000) / 0x100000000;
function authenticated(auth: { uid: string } | undefined) {
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in to enter your realm.');
  return auth.uid;
}

export const getRealm = onCall(options, async (request): Promise<RealmResponse> => {
  const uid = authenticated(request.auth);
  const parsed = realmRequestSchema.safeParse(request.data ?? {});
  if (!parsed.success)
    throw new HttpsError(
      'invalid-argument',
      parsed.error.issues.some((i) => i.message.includes('profanity'))
        ? 'Choose a name without profanity or abusive language.'
        : 'Invalid realm request.',
    );
  return db.runTransaction(async (tx) => {
    const now = Date.now();
    const [snapshot, campaign] = await tx.getAll(realmRef(uid), campaignRef);
    if (snapshot.data()?.suspended)
      throw new HttpsError(
        'permission-denied',
        'This realm is suspended. Contact the game administrator.',
      );
    let realm: RealmDocument;
    if (!snapshot.exists) {
      const game = newGame(now);
      game.name = parsed.data.name ?? `Wanderer ${uid.slice(-6)}`;
      realm = { game, revision: 0, enlisted: false, shieldUntil: 0, lastActionAt: 0 };
      tx.create(realmRef(uid), realm);
      tx.set(profileRef(uid), publicRealm(uid, realm));
    } else {
      realm = snapshot.data() as RealmDocument;
      const next = accrue(realm.game, now);
      if (next !== realm.game) {
        realm = { ...realm, game: next, revision: realm.revision + 1 };
        tx.set(realmRef(uid), realm);
        tx.set(profileRef(uid), publicRealm(uid, realm));
      }
    }
    if (!campaign.exists)
      tx.create(campaignRef, {
        name: 'The Founders’ Campaign',
        startsAt: CAMPAIGN_START,
        endsAt: CAMPAIGN_END,
        scores: { iron: 0, verdant: 0, ashen: 0, tide: 0 },
      });
    return { realm, serverTime: now };
  });
});

export const performAction = onCall(options, async (request): Promise<RealmResponse> => {
  const uid = authenticated(request.auth);
  const parsed = commandSchema.safeParse(request.data);
  if (!parsed.success)
    throw new HttpsError(
      'invalid-argument',
      parsed.error.issues.some((i) => i.message.includes('profanity'))
        ? 'Choose a name without profanity or abusive language.'
        : 'Invalid game action.',
    );
  const command = parsed.data;
  const { action, requestId } = command;
  if (
    (action.type === 'attack' || (action.type === 'enlist' && action.enabled)) &&
    request.auth?.token.email_verified !== true
  )
    throw new HttpsError('permission-denied', 'Verify your email before joining PvP.');
  if (action.type === 'attack' && action.opponent === uid)
    throw new HttpsError('invalid-argument', 'You cannot attack your own realm.');
  const receiptRef = realmRef(uid).collection('receipts').doc(requestId);
  const fingerprint = createHash('sha256').update(JSON.stringify(command)).digest('hex');
  return db.runTransaction(async (tx) => {
    const now = Date.now();
    const [snapshot, receipt] = await tx.getAll(realmRef(uid), receiptRef);
    if (snapshot.data()?.suspended)
      throw new HttpsError(
        'permission-denied',
        'This realm is suspended. Contact the game administrator.',
      );
    if (receipt.exists) {
      const saved = receipt.data()!;
      if (saved.fingerprint !== fingerprint)
        throw new HttpsError('already-exists', 'This request ID was used for a different action.');
      return { ...saved.response, serverTime: now } as RealmResponse;
    }
    if (!snapshot.exists) throw new HttpsError('failed-precondition', 'Load your realm first.');
    const before = snapshot.data() as RealmDocument;
    if (before.revision !== command.revision)
      throw new HttpsError(
        'aborted',
        'Your realm changed on the server. Review the refreshed state and try again.',
      );
    if (now - before.lastActionAt < 500)
      throw new HttpsError(
        'resource-exhausted',
        'Your previous orders are still arriving. Wait a moment.',
      );
    let next = structuredClone(before);
    let defender: RealmDocument | undefined;
    // All reads precede writes, including the other player in a PvP transfer.
    const target = action.type === 'attack' ? await tx.get(realmRef(action.opponent)) : undefined;
    try {
      if (action.type === 'attack') {
        if (!target?.exists) throw new Error('That realm no longer exists.');
        const resolved = resolvePvp(
          before,
          target.data() as RealmDocument,
          action.opponent,
          action.tactic,
          now,
          secureRandom,
        );
        next = resolved.attacker;
        defender = { ...resolved.defender, revision: resolved.defender.revision + 1 };
      } else if (action.type === 'enlist') {
        if (!before.game.faction || before.game.level < 1)
          throw new Error('Choose a faction and reach Settlement tier before enlisting.');
        if (
          !action.enabled &&
          now - Math.max(0, ...Object.values(before.game.opponents).map((o) => o.lastAttack)) <
            3600000
        )
          throw new Error('Remain enlisted for one hour after your last outgoing attack.');
        next.game = structuredClone(accrue(before.game, now));
        next.enlisted = action.enabled;
      } else if (action.type === 'rename') {
        next.game = structuredClone(accrue(before.game, now));
        next.game.name = action.name;
      } else {
        if (
          (action.type === 'fight' || action.type === 'chest') &&
          before.game.inventory.length + (before.game.expedition?.items.length ?? 0) >
            INVENTORY_CAP - 3
        )
          throw new Error(
            'Your 200-slot vault is almost full. Sell some stored items before seeking more loot.',
          );
        next.game = applyAction(before.game, action, now, secureRandom);
      }
    } catch (error) {
      throw new HttpsError(
        'failed-precondition',
        error instanceof Error ? error.message : 'Those orders cannot be carried out.',
      );
    }
    if (
      !validSave(next.game) ||
      !Number.isSafeInteger(next.game.gold) ||
      next.game.inventory.length > INVENTORY_CAP
    )
      throw new HttpsError('internal', 'The realm could not be saved. No resources were spent.');
    next.revision = before.revision + 1;
    next.lastActionAt = now;
    const response: RealmResponse = { realm: next, serverTime: now };
    tx.set(realmRef(uid), next);
    tx.set(profileRef(uid), publicRealm(uid, next));
    if (defender && action.type === 'attack') {
      tx.set(realmRef(action.opponent), defender);
      tx.set(profileRef(action.opponent), publicRealm(action.opponent, defender));
    }
    const earned = next.game.renown - before.game.renown;
    if (earned > 0 && next.game.faction && now >= CAMPAIGN_START && now < CAMPAIGN_END)
      tx.update(campaignRef, { [`scores.${next.game.faction}`]: FieldValue.increment(earned) });
    tx.create(receiptRef, {
      fingerprint,
      response,
      createdAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + 7 * 86400000),
    });
    return response;
  });
});

export {
  getAdminAccess,
  adminOverview,
  adminPlayers,
  adminModerate,
  adminDungeonForecast,
} from './admin';
