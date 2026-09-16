import { after, before, test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ash-and-oath-rules',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'realms/alice'), { game: { gold: 1000 }, revision: 0 });
    await setDoc(doc(db, 'realms/alice/receipts/test'), { secret: 'server only' });
    await setDoc(doc(db, 'publicRealms/alice'), { name: 'Alice', enlisted: true });
    await setDoc(doc(db, 'campaigns/founders'), { scores: { iron: 5 } });
  });
});
after(async () => {
  await env?.cleanup();
});
test('unauthenticated reads and writes are denied everywhere', async () => {
  const db = env.unauthenticatedContext().firestore();
  for (const path of [
    'realms/alice',
    'publicRealms/alice',
    'campaigns/founders',
    'anything/test',
  ]) {
    await assertFails(getDoc(doc(db, path)));
    await assertFails(setDoc(doc(db, path), { gold: 1 }));
  }
});
test('owner can read their private realm, but cannot list or access another player or receipts', async () => {
  const db = env.authenticatedContext('alice').firestore();
  await assertSucceeds(getDoc(doc(db, 'realms/alice')));
  await assertFails(getDoc(doc(db, 'realms/bob')));
  await assertFails(getDocs(query(collection(db, 'realms'), limit(10))));
  await assertFails(getDoc(doc(db, 'realms/alice/receipts/test')));
});
test('even owner and forged admin claims cannot create, modify, delete or inject nested game documents', async () => {
  const db = env.authenticatedContext('alice', { admin: true }).firestore();
  for (const path of [
    'realms/alice',
    'publicRealms/alice',
    'campaigns/founders',
    'realms/alice/items/forged',
    'realms/alice/receipts/replay',
  ]) {
    await assertFails(setDoc(doc(db, path), { gold: 999999, uid: 'alice', admin: true }));
    await assertFails(updateDoc(doc(db, path), { 'game.gold': 999999 }));
    await assertFails(deleteDoc(doc(db, path)));
  }
});
test('signed-in players can read limited public projections and campaign; unbounded listing is denied', async () => {
  const db = env.authenticatedContext('bob').firestore();
  await assertSucceeds(getDoc(doc(db, 'publicRealms/alice')));
  await assertSucceeds(getDocs(query(collection(db, 'publicRealms'), limit(50))));
  await assertFails(getDocs(query(collection(db, 'publicRealms'), limit(51))));
  await assertFails(getDocs(collection(db, 'publicRealms')));
  await assertSucceeds(getDoc(doc(db, 'campaigns/founders')));
  await assertFails(getDocs(collection(db, 'campaigns')));
});
