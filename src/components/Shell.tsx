import {
  BookOpen,
  Castle,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Coins,
  Crown,
  DoorOpen,
  Flag,
  Home,
  Menu,
  Settings,
  Shield,
  Swords,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { FACTIONS, SEASON_MS, TICK_MS, TIERS } from '../game/data';
import { format, stats } from '../game/engine';
import { useGame } from '../game/context';
import { useClock } from '../game/useRealm';
import type { Page } from '../game/types';
import { FactionIcon } from './ui';

export const NAV = [
  { id: 'overview' as Page, label: 'Overview', icon: Home },
  { id: 'settlement' as Page, label: 'Settlement', icon: Castle },
  { id: 'army' as Page, label: 'Army & Armory', icon: Swords },
  { id: 'dungeons' as Page, label: 'Dungeons', icon: DoorOpen },
  { id: 'war' as Page, label: 'War Room', icon: Flag },
  { id: 'trader' as Page, label: 'The Trader', icon: Coins },
];
export function Brand() {
  return (
    <div className="brand">
      <div className="brand-crest">
        <SwordMark />
        <Crown size={46} strokeWidth={1} />
      </div>
      <div className="brand-name">
        ASH <span>&</span> OATH
      </div>
      <div className="brand-tagline">A REALM WORTH FIGHTING FOR</div>
    </div>
  );
}
function SwordMark() {
  return (
    <svg className="sword-mark" viewBox="0 0 30 84" aria-hidden="true">
      <path
        d="m15 2 4 8-2 49-2 20-2-20-2-49 4-8Zm-9 48h18M10 15h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}
function Sidebar({ mobile, close }: { mobile: boolean; close: () => void }) {
  const { game, page, navigate, open, online } = useGame();
  const now = useClock();
  const sidebar = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!mobile) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const root = sidebar.current!;
    root.querySelector<HTMLButtonElement>('.mobile-close')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const buttons = Array.from(
        root.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
      ).filter((button) => button.getClientRects().length > 0);
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    root.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      root.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [mobile]);
  const f = FACTIONS.find((f) => f.id === game.faction);
  const remaining = Math.max(
    0,
    Math.ceil(((online?.campaign?.endsAt ?? game.createdAt + SEASON_MS) - now) / 86400000),
  );
  return (
    <>
      <div className={`sidebar-scrim ${mobile ? 'visible' : ''}`} onClick={close} />
      <aside
        ref={sidebar}
        role={mobile ? 'dialog' : undefined}
        aria-modal={mobile || undefined}
        aria-label={mobile ? 'Realm navigation' : undefined}
        className={`sidebar ${mobile ? 'mobile-open' : ''}`}
      >
        <button className="mobile-close icon-button" onClick={close} aria-label="Close navigation">
          <X />
        </button>
        <Brand />
        <div className="nav-label">YOUR DOMAIN</div>
        <nav aria-label="Main navigation">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              aria-current={page === id ? 'page' : undefined}
              onClick={() => {
                navigate(id);
                close();
              }}
            >
              <Icon size={20} strokeWidth={1.5} />
              <span>{label}</span>
              {page === id ? <span className="nav-indicator" /> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="season-summary"
            onClick={() => {
              navigate('war');
              close();
            }}
          >
            <span className="ornament">✦</span>
            <span className="letter-label">{online ? 'FOUNDERS’ CAMPAIGN' : 'SEASON I'}</span>
            <strong>The Sundering</strong>
            <span className="season-rule" />
            <span className="muted">
              {remaining ? `${remaining} days remaining` : 'Season chronicle available'}
            </span>
          </button>
          <button
            className="profile"
            onClick={() => {
              open(game.faction ? 'settings' : 'faction');
              close();
            }}
          >
            <span className={`avatar faction-${game.faction ?? 'none'}`}>
              <FactionIcon faction={game.faction} size={25} />
            </span>
            <span>
              <strong>{game.name}</strong>
              <small>{f ? f.name : `${TIERS[game.level].name} · Level ${game.level + 1}`}</small>
            </span>
          </button>
          <button
            className="settings-link"
            onClick={() => {
              open('settings');
              close();
            }}
          >
            <Settings size={16} />
            Settings & save
          </button>
        </div>
      </aside>
    </>
  );
}
function ResourceBar({
  onMenu,
  sound,
  onSound,
}: {
  onMenu: () => void;
  sound: boolean;
  onSound: () => void;
}) {
  const { game, open } = useGame();
  const now = useClock();
  const st = stats(game);
  const remaining = Math.max(0, Math.ceil((TICK_MS - Math.max(0, now - game.lastTick)) / 1000));
  const countdown = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  return (
    <header className="resource-bar">
      <button className="menu-button icon-button" aria-label="Open navigation" onClick={onMenu}>
        <Menu />
      </button>
      <div className="resource gold-resource">
        <Coins className="resource-icon" size={27} strokeWidth={1.4} />
        <div>
          <strong data-testid="gold">{format(game.gold)}</strong>
          <span>Gold</span>
        </div>
        <small className="positive">+{format(st.income)} / 5 min</small>
      </div>
      <div className="resource ap-resource">
        <Zap className="resource-icon" size={26} strokeWidth={1.4} />
        <div>
          <strong data-testid="ap">
            {game.ap} <em>/ 60</em>
          </strong>
          <span>Action Points</span>
        </div>
        <small className="positive">+5 / 5 min</small>
      </div>
      <div className="resource troop-resource">
        <Users className="resource-icon" size={23} strokeWidth={1.4} />
        <div>
          <strong>{game.troops.offense + game.troops.defense}</strong>
          <span>Troops</span>
        </div>
      </div>
      <div className="resource tribute-resource">
        <Clock3 size={20} strokeWidth={1.4} />
        <div>
          <span>Next tribute</span>
          <strong className="timer">{countdown}</strong>
        </div>
      </div>
      <div className="header-actions">
        <button
          className={`icon-button ${sound ? 'sound-on' : ''}`}
          aria-label={sound ? 'Mute game sounds' : 'Enable game sounds'}
          aria-pressed={sound}
          onClick={onSound}
        >
          {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
        </button>
        <button className="help-button" aria-label="Open field guide" onClick={() => open('help')}>
          <CircleHelp size={18} />
          <span>Guide</span>
        </button>
      </div>
    </header>
  );
}
export function Shell({
  children,
  sound,
  onSound,
  warning,
}: {
  children: ReactNode;
  sound: boolean;
  onSound: () => void;
  warning: string;
}) {
  const { page, open, online, busy } = useGame();
  const [mobile, setMobile] = useState(false);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Sidebar mobile={mobile} close={() => setMobile(false)} />
      <div className="main-shell">
        <ResourceBar onMenu={() => setMobile(true)} sound={sound} onSound={onSound} />
        <main id="main" tabIndex={-1}>
          <div className="breadcrumb">
            <span>Your domain</span>
            <ChevronRight size={12} />
            <span>{NAV.find((n) => n.id === page)?.label}</span>
            <button onClick={() => open('settings')} className="local-status">
              <span className="status-dot" />
              <span>{online ? 'Cloud realm' : 'Local demo'}</span>
              <span className="desktop-only">
                · {online ? (busy ? 'Saving orders' : 'Server confirmed') : 'Saved on this device'}
              </span>
              <Check size={12} />
            </button>
          </div>
          {warning ? (
            <div className="warning-banner" role="alert">
              {warning}
            </div>
          ) : null}
          <div key={page} className="page-content">
            {children}
          </div>
          <footer className="app-footer">
            <span>
              <Shield size={13} />A home worth protecting.
            </span>
            <button onClick={() => open('help')}>
              <BookOpen size={13} />
              Field guide
            </button>
            <span>
              ASH & OATH <span className="muted">/</span> PLAYABLE ALPHA
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
