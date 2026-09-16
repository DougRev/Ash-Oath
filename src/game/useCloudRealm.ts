import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { collection, doc, limit, onSnapshot, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../lib/firebase';
import { friendlyError } from '../components/Account';
import type { Action } from './types';
import {
  CAMPAIGN_ID,
  type Campaign,
  type PublicRealm,
  type RealmDocument,
  type RealmResponse,
} from './online';
import { TICK_MS } from './data';
import { serverNow, syncServerClock } from './clock';

const fetchRealm = httpsCallable<Record<string, never>, RealmResponse>(functions, 'getRealm');
type Command = { requestId: string; revision: number; action: Action };
const sendAction = httpsCallable<Command, RealmResponse>(functions, 'performAction');
export function useCloudRealm(user: User) {
  const [realm, setRealm] = useState<RealmDocument | null>(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [busy, setBusy] = useState(false);
  const [opponents, setOpponents] = useState<PublicRealm[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const ref = useRef<RealmDocument | null>(null);
  const actionBusy = useRef(false);
  const refreshing = useRef(false);
  const nextAutoRefresh = useRef(0);
  const refreshFailures = useRef(0);
  const alive = useRef(true);
  const pending = useRef<Command | null>(null);
  const pendingKey = `ash-and-oath.pending.${user.uid}`;
  const accept = useCallback(
    (next: RealmDocument) => {
      if (!alive.current || auth.currentUser?.uid !== user.uid) return;
      if (!ref.current || next.revision >= ref.current.revision) {
        ref.current = next;
        setRealm(next);
      }
    },
    [user.uid],
  );
  const refresh = useCallback(async () => {
    if (refreshing.current || actionBusy.current) return;
    refreshing.current = true;
    try {
      const response = await fetchRealm({});
      syncServerClock(response.data.serverTime);
      refreshFailures.current = 0;
      nextAutoRefresh.current = 0;
      accept(response.data.realm);
      setError('');
      setWarning('');
    } catch (e) {
      nextAutoRefresh.current =
        Date.now() + Math.min(300000, 15000 * 2 ** refreshFailures.current++);
      if (alive.current) {
        if (!ref.current) setError(friendlyError(e));
        else setWarning(friendlyError(e));
      }
    } finally {
      refreshing.current = false;
    }
  }, [accept]);
  useEffect(() => {
    alive.current = true;
    try {
      pending.current = JSON.parse(localStorage.getItem(pendingKey) || 'null');
    } catch {
      pending.current = null;
    }
    void refresh();
    // Realtime listeners are required: incoming attacks and actions on another device
    // must update the player immediately. No economic decisions happen in these callbacks.
    const stopRealm = onSnapshot(
      doc(db, 'realms', user.uid),
      (s) => {
        if (s.exists()) accept(s.data() as RealmDocument);
      },
      (e) => setWarning(friendlyError(e)),
    );
    const stopCampaign = onSnapshot(
      doc(db, 'campaigns', CAMPAIGN_ID),
      (s) => {
        if (s.exists()) setCampaign(s.data() as Campaign);
      },
      (e) => setWarning(friendlyError(e)),
    );
    const tick = () => {
      if (
        Date.now() >= nextAutoRefresh.current &&
        document.visibilityState === 'visible' &&
        (!ref.current || serverNow() - ref.current.game.lastTick >= TICK_MS)
      )
        void refresh();
    };
    const timer = setInterval(tick, 5000);
    const online = () => void refresh();
    const offline = () =>
      setWarning(
        'You are offline. Reconnect before issuing orders. Your confirmed progress is saved.',
      );
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      alive.current = false;
      stopRealm();
      stopCampaign();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [accept, pendingKey, refresh, user.uid]);
  const level = realm?.game.level;
  useEffect(() => {
    if (level === undefined) return;
    return onSnapshot(
      query(
        collection(db, 'publicRealms'),
        where('level', '>=', Math.max(0, level - 1)),
        where('level', '<=', level + 1),
        limit(50),
      ),
      (s) =>
        setOpponents(s.docs.map((d) => d.data() as PublicRealm).filter((o) => o.id !== user.uid)),
      (e) => setWarning(friendlyError(e)),
    );
  }, [level, user.uid]);
  const act = async (action: Action) => {
    if (!ref.current || actionBusy.current)
      throw new Error('Wait for your current orders to finish.');
    if (!navigator.onLine) throw new Error('Reconnect to issue orders.');
    if (pending.current && JSON.stringify(pending.current.action) !== JSON.stringify(action))
      throw new Error(
        'A previous order has an uncertain result. Retry that order to confirm it before issuing another.',
      );
    const command = pending.current ?? {
      requestId: crypto.randomUUID(),
      revision: ref.current.revision,
      action,
    };
    pending.current = command;
    try {
      localStorage.setItem(pendingKey, JSON.stringify(command));
    } catch {
      /* The in-memory request remains retryable. */
    }
    actionBusy.current = true;
    setBusy(true);
    try {
      let response;
      try {
        response = await sendAction(command);
      } catch (e) {
        if (
          !['functions/unavailable', 'functions/deadline-exceeded', 'functions/internal'].includes(
            (e as { code: string }).code,
          )
        )
          throw e;
        response = await sendAction(command); // Same ID: a timeout must never buy twice or reroll loot.
      }
      syncServerClock(response.data.serverTime);
      accept(response.data.realm);
      pending.current = null;
      try {
        localStorage.removeItem(pendingKey);
      } catch {
        /* No pending mutation remains. */
      }
      setWarning('');
      return response.data.realm.game;
    } catch (e) {
      const uncertain = [
        'functions/unavailable',
        'functions/deadline-exceeded',
        'functions/internal',
      ].includes((e as { code: string }).code);
      if (!uncertain) {
        pending.current = null;
        try {
          localStorage.removeItem(pendingKey);
        } catch {
          /* Best effort. */
        }
      } else
        setWarning(
          'Your last order is awaiting confirmation. Use “Confirm pending order” to recover its result.',
        );
      throw new Error(friendlyError(e));
    } finally {
      actionBusy.current = false;
      setBusy(false);
      void refresh();
    }
  };
  return {
    realm,
    error,
    warning,
    busy,
    act,
    refresh,
    pendingAction: pending.current?.action ?? null,
    online: {
      user,
      opponents,
      campaign,
      enlisted: realm?.enlisted ?? false,
      shieldUntil: realm?.shieldUntil ?? 0,
    },
  };
}
