import { Leaderboard } from '../components/Leaderboard';
import { useState } from 'react';
import { Bank } from '../components/Bank';
import { RivalStrongholds } from '../components/RivalStrongholds';
import {
  ArrowRight,
  CalendarDays,
  Crown,
  Flag,
  Medal,
  Shield,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react';
import { useGame } from '../game/context';
import { FACTIONS, OPPONENTS, SEASON_MS, TIERS } from '../game/data';
import { PVP_COOLDOWN } from '../game/online';
import { format, powerFor } from '../game/engine';
import { useClock } from '../game/useRealm';
import { AP, Button, Dialog, FactionIcon, Gold, Note, PageIntro } from '../components/ui';
import { Influence } from './Overview';
import { Forecast, TacticPicker } from './Dungeons';
import type { Tactic } from '../game/types';

export function War() {
  const { game, act, open, online } = useGame();
  const now = useClock();
  const [tab, setTab] = useState<'battlefield' | 'season'>('battlefield');
  const [target, setTarget] = useState<string | null>(null);
  const [tactic, setTactic] = useState<Tactic>('balanced');
  const [enlistConfirm, setEnlistConfirm] = useState(false);
  const faction = FACTIONS.find((f) => f.id === game.faction);
  const days = Math.max(
    0,
    Math.ceil(((online?.campaign?.endsAt ?? game.createdAt + SEASON_MS) - now) / 86400000),
  );
  const donationUsed =
    game.donations.day === Math.floor(now / 86400000) ? game.donations.amount : 0;
  const targets = online
    ? online.opponents
        .filter((o) => o.faction && Math.abs(o.level - game.level) <= 1)
        .map((o) => ({
          ...o,
          realm: TIERS[o.level].name,
          cooldown: Math.max(
            o.shieldUntil - now,
            PVP_COOLDOWN - (now - (game.opponents[o.id]?.lastAttack ?? 0)),
          ),
        }))
    : OPPONENTS.map((o) => ({
        ...o,
        level: 1,
        enlisted: true,
        plunder: Math.max(0, o.gold - (game.opponents[o.id]?.plundered ?? 0)),
        cooldown: 60000 - (now - (game.opponents[o.id]?.lastAttack ?? 0)),
      }));
  const opponent = targets.find((o) => o.id === target);
  return (
    <>
      <PageIntro
        title="No kingdom stands alone."
        description="Choose where you stand. Fight for your banner. Leave a mark on the age."
        action={
          <span className="season-days">
            <CalendarDays size={17} />
            {days ? `${days} days remaining` : 'Campaign complete'}
          </span>
        }
      />
      <RivalStrongholds />
      <Bank />
      <Leaderboard />
      <p className="note">
        Factions compete together for seasonal glory, but sharing a banner does not protect your
        treasury. Same-faction raids are allowed without war renown. Personal alliance invitations
        and clans are not active yet.
      </p>
      <div className="war-layout">
        <section className="war-season-hero">
          <img src="/art/stronghold.webp" alt="A fortress at the heart of the faction war" />
          <div>
            <span className="letter-label">{online ? 'FOUNDERS’ CAMPAIGN' : 'LOCAL PLAYTEST'}</span>
            <h2>The Sundering</h2>
            <p>
              Four banners. A broken crown.
              <br />
              One world to rebuild.
            </p>
            <span className="simulation-pill">
              {online ? 'Shared world · Live players' : 'Local season · Simulated opponents'}
            </span>
          </div>
        </section>
        <section className="panel faction-standings">
          <div className="section-heading">
            <h2>A world divided</h2>
            <Flag size={18} />
          </div>
          <Influence />
          <p className="muted small-copy">
            {online
              ? 'Real renown earned by players through battles, dungeon spoils, and capped contributions.'
              : 'Illustrative standings plus your local renown.'}
          </p>
        </section>
      </div>
      <div className="allegiance-bar panel">
        <span className="allegiance-emblem" style={{ color: faction?.color }}>
          <FactionIcon faction={game.faction} size={36} />
        </span>
        <div>
          <span className="letter-label">YOUR ALLEGIANCE</span>
          <h3>{faction?.name ?? 'Which banner will you carry?'}</h3>
          <p>
            {faction ? `${faction.motto} ${faction.bonus}.` : 'Four factions need your strength.'}
          </p>
        </div>
        {faction ? (
          <div className="renown-total">
            <Sparkles size={20} />
            <strong>{format(game.renown)}</strong>
            <span>Your renown</span>
            <Button variant="secondary" onClick={() => open('faction')}>
              Change faction
            </Button>
          </div>
        ) : (
          <Button onClick={() => open('faction')}>
            Choose your faction
            <ArrowRight size={15} />
          </Button>
        )}
      </div>
      <div className="page-tabs">
        <button
          className={tab === 'battlefield' ? 'selected' : ''}
          aria-pressed={tab === 'battlefield'}
          onClick={() => setTab('battlefield')}
        >
          <Swords size={16} />
          The battlefield
        </button>
        <button
          className={tab === 'season' ? 'selected' : ''}
          aria-pressed={tab === 'season'}
          onClick={() => setTab('season')}
        >
          <Trophy size={16} />
          Campaign & rewards
        </button>
      </div>
      {tab === 'battlefield' ? (
        <>
          {online && (
            <section className="panel enlist-panel">
              <Shield size={26} />
              <div>
                <h2>
                  {online.enlisted
                    ? 'Your banner is on the battlefield.'
                    : 'Build in peace. Enlist when ready.'}
                </h2>
                <p>
                  {online.enlisted
                    ? 'Other enlisted realms within one tier can attack you. All treasury gold is exposed; bank savings are protected.'
                    : 'PvE and the war effort remain open while you prepare your defenses. PvP unlocks at Settlement tier with a verified email.'}
                </p>
                {online.shieldUntil > now && (
                  <p className="positive">
                    Recovery shield: {Math.ceil((online.shieldUntil - now) / 60000)} minutes.
                    Attacking ends your shield.
                  </p>
                )}
              </div>
              <Button
                variant="secondary"
                disabled={!game.faction || game.level < 1 || !online.user.emailVerified}
                onClick={() =>
                  online.enlisted
                    ? void act({ type: 'enlist', enabled: false })
                    : setEnlistConfirm(true)
                }
              >
                {online.enlisted ? 'Leave battlefield' : 'Enlist for PvP'}
              </Button>
              {!online.user.emailVerified && (
                <button className="text-link" onClick={() => open('settings')}>
                  Verify email in settings
                </button>
              )}
            </section>
          )}
          <section className="panel battlefield">
            <div className="section-heading">
              <h2>Beyond the safety of your walls</h2>
              <span className="simulation-label">
                {online ? 'ENLISTED REALMS · WITHIN ONE TIER' : 'SIMULATED REALMS'}
              </span>
            </div>
            <p className="muted">
              Showing up to 50 nearby aligned realms, including peaceful players. Both commanders
              must enlist to fight. Only your attacking troops join the battle.
            </p>
            <div className="opponents-table">
              <div className="opponent-header">
                <span>COMMANDER & REALM</span>
                <span>FACTION</span>
                <span>DEFENSE</span>
                <span>EXPOSED GOLD</span>
                <span />
              </div>
              {targets.map((o) => {
                const f = FACTIONS.find((f) => f.id === o.faction)!;
                const cooldown = Math.max(0, Math.ceil(o.cooldown / 60000));

                return (
                  <div className="opponent-row" key={o.id}>
                    <div className="opponent-identity">
                      <span className="realm-avatar" style={{ color: f.color }}>
                        {o.name.charAt(0)}
                      </span>
                      <div>
                        <strong>{o.name}</strong>
                        <span>{o.realm}</span>
                      </div>
                    </div>
                    <span className="opponent-faction" style={{ color: f.color }}>
                      <FactionIcon faction={o.faction} size={16} />
                      {f.name}
                    </span>
                    <span className="opponent-defense">
                      <Shield size={14} />
                      {o.defense === 0 ? 'Undefended' : o.defense}
                    </span>
                    <span className="opponent-gold">
                      <Gold amount={o.plunder} />
                    </span>
                    <Button
                      variant="secondary"
                      disabled={
                        !o.enlisted ||
                        cooldown > 0 ||
                        !!game.expedition ||
                        (!!online && !online.enlisted)
                      }
                      onClick={() => (!game.faction ? open('faction') : setTarget(o.id))}
                    >
                      {!o.enlisted
                        ? 'Not enlisted'
                        : cooldown
                          ? `${cooldown}m recovery`
                          : !o.plunder
                            ? 'Scout treasury'
                            : online && !online.enlisted
                              ? 'Enlist to attack'
                              : 'Scout & attack'}
                    </Button>
                  </div>
                );
              })}
            </div>
            {targets.length === 0 && (
              <div className="battlefield-empty">
                <Flag size={32} />
                <h3>The frontier is quiet.</h3>
                <p>
                  There are no aligned commanders within one tier of your realm yet. Explore
                  dungeons, grow your settlement, and return as more players join.
                </p>
              </div>
            )}
          </section>
          <Note>
            {online
              ? 'Skirmishes cost 8 AP. All treasury gold can be raided. Victory margin and a separate loot roll determine the share captured; dominant victories take 90-98%. Bank savings are never exposed. A victory against another faction awards 20 renown; same-faction raids award none. Any victory shields the defender for one hour. Repeat attacks require ten minutes. Leaving PvP requires one hour since your last outgoing attack. Forecasts can change before your orders arrive.'
              : 'Demo skirmishes cost 8 AP and have a one-minute repeat cooldown.'}
          </Note>
        </>
      ) : (
        <div className="season-details-grid">
          <section className="panel season-rules">
            <span className="section-icon">
              <Crown size={30} />
            </span>
            <h2>A victory that becomes history.</h2>
            <p>
              {online
                ? 'The first 28-day campaign records shared faction renown. The faction with the highest total at the closing time leads the campaign; equal totals share the honor.'
                : 'The demo previews our seasonal war design.'}
            </p>
            <div className="score-breakdown">
              <div>
                <strong>20</strong>
                <span>Renown per PvP win</span>
              </div>
              <div>
                <strong>5–90</strong>
                <span>Per dungeon stage</span>
              </div>
              <div>
                <strong>100</strong>
                <span>Daily logistics cap</span>
              </div>
            </div>
            <p className="muted small-copy">
              This founding campaign measures participation. Full territory warfare, population
              balancing, cosmetic reward delivery, and competitive seasonal resets are still in
              development. Your settlement will not reset automatically.
            </p>
            {online?.campaign && (
              <p className="small-copy">
                Campaign closes {new Date(online.campaign.endsAt).toLocaleString()}. Renown earned
                afterward stays on your character but does not change this campaign’s score.
              </p>
            )}
          </section>
          <section className="panel season-rewards">
            <Medal size={29} />
            <h2>A legacy worth earning.</h2>
            <div className="reward-row">
              <Crown />
              <div>
                <h3>Planned: the victor’s chronicle</h3>
                <p>Winning banners, titles, and settlement decorations will remember each age.</p>
              </div>
            </div>
            <div className="reward-row">
              <Shield />
              <div>
                <h3>A fair new beginning</h3>
                <p>
                  Future competitive seasons will favor cosmetic legacy over permanent combat
                  advantages. A limited first-week offline-storage bonus is under consideration.
                </p>
              </div>
            </div>
            <span className="simulation-label">REWARD SYSTEM · IN DEVELOPMENT</span>
          </section>
        </div>
      )}
      <section className="war-donation panel">
        <span className="donation-icon">
          <Flag size={29} />
        </span>
        <div>
          <h2>Supply the war effort.</h2>
          <p>Every 100 gold earns 5 renown. Daily limit: {format(donationUsed)} / 2,000 gold.</p>
          <div className="donation-track">
            <span style={{ width: `${(donationUsed / 2000) * 100}%` }} />
          </div>
        </div>
        <Button
          disabled={!game.faction || game.gold < 100 || donationUsed + 100 > 2000}
          onClick={() => act({ type: 'donate', amount: 100 })}
        >
          Contribute
          <Gold amount={100} />
        </Button>
      </section>
      {enlistConfirm && (
        <Dialog title="Raise your war banner?" onClose={() => setEnlistConfirm(false)}>
          <div className="dialog-body">
            <p>
              Enlisting lets other players attack your realm, even while you are offline. You can
              lose up to 98% of all treasury gold in a dominant raid. Only bank savings are
              protected. Your garrison and buildings remain intact.
            </p>
            <p>Build defenses first. After you attack, you must remain enlisted for one hour.</p>
            <Button
              onClick={async () => {
                if (await act({ type: 'enlist', enabled: true })) setEnlistConfirm(false);
              }}
            >
              Enlist my realm
              <Swords size={16} />
            </Button>
          </div>
        </Dialog>
      )}
      {opponent && (
        <Dialog title={`Scout ${opponent.name}`} onClose={() => setTarget(null)}>
          <div className="dialog-body">
            <p className="muted">
              {opponent.name} guards this {opponent.realm.toLowerCase()}. Your garrison stays home.
            </p>
            <TacticPicker pvp tactic={tactic} setTactic={setTactic} />
            <Forecast power={powerFor(game, 'pvp', tactic)} enemy={opponent.defense} />
            <div className="scout-spoils">
              <span>Last seen exposed treasury</span>
              <Gold amount={opponent.plunder} />
            </div>
            <p className="small-copy muted">
              This is the exposed balance, not a guaranteed payout. Narrow wins capture 15-40%;
              solid wins 40-70%; decisive wins 65-90%; dominant wins 90-98%. Capture rounds down,
              with a minimum of 1 gold. Dominant means rolled attack is at least twice the defense.
              Treasury and defenses are checked again when the attack arrives.
            </p>
            <p className="small-copy muted">
              Victory against another faction earns 20 renown; same-faction raids earn none. Defeat
              spends AP and may cost attacking troops. Your own recovery shield ends when you
              attack.
            </p>
            <Button
              className="full-width"
              disabled={game.ap < 8 || game.troops.offense === 0}
              onClick={async () => {
                if (await act({ type: 'attack', opponent: opponent.id, tactic })) setTarget(null);
              }}
            >
              Launch skirmish
              <AP amount={8} />
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
