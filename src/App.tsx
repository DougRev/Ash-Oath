import { DefenseNotice, DefenseLog } from './components/DefenseLog';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Check, CircleAlert, X } from 'lucide-react';
import { GameContext } from './game/context';
import type { ModalName, OnlineContext } from './game/context';
import type { Action, Page, GameState } from './game/types';
import { useRealm } from './game/useRealm';
import { Shell } from './components/Shell';
import {
  ActivityDialog,
  BattleDialog,
  ChestDialog,
  FactionDialog,
  GuideDialog,
  SettingsDialog,
} from './components/Modals';
import { Overview } from './pages/Overview';
import { Settlement } from './pages/Settlement';
import { Army } from './pages/Army';
import { Dungeons } from './pages/Dungeons';
import { War } from './pages/War';
import { Trader } from './pages/Trader';
import { AccountGate, RealmLoading } from './components/Account';
import { demoMode, functions } from './lib/firebase';
import { httpsCallable } from 'firebase/functions';
import './admin.css';
import './combat.css';
import { useCloudRealm } from './game/useCloudRealm';
import type { User } from 'firebase/auth';

interface RealmStore {
  game: GameState;
  warning: string;
  busy?: boolean;
  act: (action: Action) => GameState | Promise<GameState>;
  reset?: () => void;
  online?: OnlineContext;
  pendingAction?: Action | null;
}
function DemoGame() {
  const realm = useRealm();
  return <GameApp realm={realm} />;
}
function CloudGame({ user }: { user: User }) {
  const cloud = useCloudRealm(user);
  const [admin, setAdmin] = useState(false);
  const [dashboard, setDashboard] = useState(false);
  useEffect(() => {
    let alive = true;
    void httpsCallable<Record<string, never>, { admin: boolean }>(
      functions,
      'getAdminAccess',
    )({})
      .then((r) => {
        if (alive) setAdmin(r.data.admin);
      })
      .catch(() => {
        if (alive) setAdmin(false);
      });
    return () => {
      alive = false;
    };
  }, [user.uid]);
  if (admin && dashboard)
    return (
      <Suspense fallback={<RealmLoading error="" retry={() => {}} />}>
        <AdminDashboard back={() => setDashboard(false)} />
      </Suspense>
    );
  if (!cloud.realm) return <RealmLoading error={cloud.error} retry={() => void cloud.refresh()} />;
  if (cloud.realm.suspended)
    return (
      <RealmLoading
        error="This realm is suspended. Contact the game administrator."
        retry={() => void cloud.refresh()}
      />
    );
  return (
    <>
      <GameApp realm={{ ...cloud, game: cloud.realm.game }} />
      {admin && (
        <button className="button button-secondary admin-switch" onClick={() => setDashboard(true)}>
          Admin dashboard
        </button>
      )}
    </>
  );
}
const AdminDashboard = lazy(() => import('./pages/Admin'));
export default function App() {
  return demoMode ? (
    <DemoGame />
  ) : (
    <AccountGate>{(user) => <CloudGame key={user.uid} user={user} />}</AccountGate>
  );
}

const pages: Page[] = ['overview', 'settlement', 'army', 'dungeons', 'war', 'trader'];
function currentPage(): Page {
  const hash = window.location.hash.slice(1) as Page;
  return pages.includes(hash) ? hash : 'overview';
}
function readSound() {
  try {
    return localStorage.getItem('ash-and-oath.sound') === 'on';
  } catch {
    return false;
  }
}
function GameApp({ realm }: { realm: RealmStore }) {
  const [page, setPage] = useState<Page>(currentPage);
  const [modal, setModal] = useState<ModalName>(null);
  const [sound, setSound] = useState(readSound);
  const [notification, setNotification] = useState<{
    text: string;
    error: boolean;
    id: number;
  } | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const toast = useCallback(
    (text: string, error = false) => setNotification({ text, error, id: Date.now() }),
    [],
  );
  useEffect(() => {
    if (!notification) return;
    const id = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(id);
  }, [notification]);
  useEffect(() => {
    const change = () => setPage(currentPage());
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  function navigate(next: Page) {
    window.location.hash = next;
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function chime() {
    try {
      audio.current ??= new AudioContext();
      const ctx = audio.current;
      void ctx.resume();
      [392, 493.88, 587.33].forEach((frequency, i) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.075);
        gain.gain.linearRampToValueAtTime(0.025, ctx.currentTime + i * 0.075 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.075 + 0.7);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(ctx.currentTime + i * 0.075);
        oscillator.stop(ctx.currentTime + i * 0.075 + 0.8);
      });
    } catch {
      /* Audio is optional; gameplay remains available. */
    }
  }
  function toggleSound() {
    setSound(!sound);
    try {
      localStorage.setItem('ash-and-oath.sound', !sound ? 'on' : 'off');
    } catch {
      /* Settings work for this visit. */
    }
    if (!sound) chime();
  }
  async function act(action: Action) {
    try {
      const next = await realm.act(action);
      if (action.type === 'fight' || action.type === 'attack' || action.type === 'raidRival') {
        setModal('battle');
        if (sound && next.lastBattle?.won) chime();
      } else if (action.type === 'chest') {
        setModal('chest');
        if (sound) chime();
      } else if (action.type !== 'advance' && action.type !== 'readDefenseReports') {
        toast(
          action.type === 'unequip'
            ? 'Item returned to your inventory.'
            : action.type === 'rename'
              ? 'Your commander name is saved.'
              : action.type === 'enlist'
                ? action.enabled
                  ? 'Your realm has joined the battlefield.'
                  : 'Your realm has left the battlefield.'
                : next.activity[0].text,
        );
        if (sound) chime();
      }
      return next;
    } catch (error) {
      toast(error instanceof Error ? error.message : 'This action could not be completed.', true);
      return null;
    }
  }
  const content =
    page === 'settlement' ? (
      <Settlement />
    ) : page === 'army' ? (
      <Army />
    ) : page === 'dungeons' ? (
      <Dungeons />
    ) : page === 'war' ? (
      <War />
    ) : page === 'trader' ? (
      <Trader />
    ) : (
      <Overview />
    );
  return (
    <GameContext.Provider
      value={{
        game: realm.game,
        page,
        navigate,
        act,
        open: setModal,
        toast,
        busy: !!realm.busy,
        online: realm.online,
      }}
    >
      <Shell sound={sound} onSound={toggleSound} warning={realm.warning}>
        {realm.pendingAction && !realm.busy && (
          <div className="warning-banner">
            <span>A previous order needs confirmation.</span>
            <button className="text-link" onClick={() => void act(realm.pendingAction!)}>
              Confirm pending order
            </button>
          </div>
        )}
        <DefenseNotice />
        {content}
      </Shell>
      {modal === 'faction' ? (
        <FactionDialog />
      ) : modal === 'battle' && realm.game.lastBattle ? (
        <BattleDialog key={realm.game.lastBattle.id} />
      ) : modal === 'chest' && realm.game.lastLoot ? (
        <ChestDialog key={realm.game.lastLoot.id} />
      ) : modal === 'settings' ? (
        <SettingsDialog
          reset={
            realm.reset
              ? () => {
                  realm.reset!();
                  navigate('overview');
                }
              : undefined
          }
          sound={sound}
          onSound={toggleSound}
        />
      ) : modal === 'help' ? (
        <GuideDialog />
      ) : modal === 'defense' ? (
        <DefenseLog />
      ) : modal === 'activity' ? (
        <ActivityDialog />
      ) : null}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {realm.busy && (
          <div className="toast" role="status">
            <span className="status-dot" />
            Your orders are being carried out…
          </div>
        )}
        {notification ? (
          <div className={`toast ${notification.error ? 'error' : ''}`} key={notification.id}>
            {notification.error ? <CircleAlert size={18} /> : <Check size={18} />}
            <span>{notification.text}</span>
            <button aria-label="Dismiss notification" onClick={() => setNotification(null)}>
              <X size={16} />
            </button>
          </div>
        ) : null}
      </div>
    </GameContext.Provider>
  );
}
