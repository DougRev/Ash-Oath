import { seasonKey } from '../game/progression';
import { serverNow } from '../game/clock';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Backpack,
  Check,
  Clock3,
  Coins,
  Download,
  Flag,
  Gem,
  Heart,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Trophy,
  Volume2,
} from 'lucide-react';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { friendlyError } from './Account';
import { useGame } from '../game/context';
import { FACTIONS, TICK_MS } from '../game/data';
import { format } from '../game/engine';
import { Button, Dialog, FactionIcon, ItemTile } from './ui';
import type { FactionId } from '../game/types';

export function FactionDialog() {
  const { game, act, open } = useGame();
  const [choice, setChoice] = useState<FactionId | null>(game.faction);
  const selected = FACTIONS.find((f) => f.id === choice);
  return (
    <Dialog
      title="The world is at war. Choose your oath."
      className="faction-dialog"
      onClose={() => open(null)}
    >
      <div className="dialog-body">
        <p className="dialog-lead">
          You have a house, a handful of loyal people, and a choice. Four banners rise on the
          horizon. Which one will you call your own?
        </p>
        <div className="faction-options">
          {FACTIONS.map((f) => (
            <button
              key={f.id}
              className={`faction-choice ${choice === f.id ? 'selected' : ''}`}
              style={{ '--faction-color': f.color } as React.CSSProperties}
              onClick={() => setChoice(f.id)}
              aria-pressed={choice === f.id}
              disabled={!!game.faction && game.factionChangedSeason === seasonKey(serverNow())}
            >
              <div className="faction-choice-top">
                <span className="faction-choice-sigil">
                  <FactionIcon faction={f.id} size={42} />
                </span>
                {choice === f.id ? <Check size={18} /> : <span className="choice-circle" />}
              </div>
              <h3>{f.name}</h3>
              <em>{f.motto}</em>
              <p>{f.description}</p>
              <span className="faction-bonus">
                <Sparkles size={13} />
                {f.bonus}
              </span>
            </button>
          ))}
        </div>
        <div className="oath-footer">
          <p>
            You may change faction once per 28-day season. Earned faction points stay with the
            original faction.
            <br />
            <span className="muted">Your story starts with a choice, not a purchase.</span>
          </p>
          <Button
            disabled={
              !choice ||
              choice === game.faction ||
              (!!game.faction && game.factionChangedSeason === seasonKey(serverNow())) ||
              !!game.expedition
            }
            onClick={async () => {
              if (choice && (await act({ type: 'faction', id: choice }))) open(null);
            }}
          >
            {game.faction
              ? game.factionChangedSeason === seasonKey(serverNow())
                ? 'Season change already used'
                : 'Change faction'
              : selected
                ? `Join the ${selected.name}`
                : 'Choose your banner'}
            <Flag size={16} />
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
export function BattleDialog() {
  const { game, act, open, online } = useGame();
  const b = game.lastBattle!;
  const [ready, setReady] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 1000);
    return () => clearTimeout(id);
  }, []);
  return (
    <Dialog
      title="Battle report"
      className={`battle-dialog ${b.won ? 'battle-won' : 'battle-lost'}`}
      onClose={() => open(null)}
    >
      <div className="battle-report-scene">
        <img
          src={
            b.mode === 'pvp'
              ? '/art/stronghold.webp'
              : b.boss
                ? `/art/${['thornbound-boss', 'oathless-boss', 'flame-boss'][b.dungeon ?? 0]}.webp`
                : `/art/${['dungeon', 'crypt', 'ember'][b.dungeon ?? 0]}.webp`
          }
          alt="The battlefield after your expedition"
        />
        <div className={`battle-result ${ready ? 'revealed' : ''}`}>
          <span className="battle-result-emblem">
            {ready ? (
              b.won ? (
                <Trophy size={39} strokeWidth={1.2} />
              ) : (
                <Skull size={39} strokeWidth={1.2} />
              )
            ) : (
              <Swords size={39} />
            )}
          </span>
          <span className="letter-label">
            {b.mode === 'pvp'
              ? online
                ? 'PLAYER SKIRMISH'
                : 'SIMULATED SKIRMISH'
              : b.mode === 'personal'
                ? 'PERSONAL EXPEDITION'
                : 'ARMY RAID'}
          </span>
          <h2>
            {ready ? (b.won ? 'Victory is yours.' : 'Live to fight again.') : 'Steel meets fate…'}
          </h2>
          <p>{b.title}</p>
        </div>
      </div>
      <div className="dialog-body">
        <div className="battle-totals">
          <div>
            <strong>{format(b.power)}</strong>
            <small>Your formation</small>
          </div>
          <div>
            <strong>{b.roll.toFixed(2)}×</strong>
            <small>Battle roll</small>
          </div>
          <div>
            <strong className={b.won ? 'positive' : 'danger-text'}>{format(b.finalPower)}</strong>
            <small>Final strength</small>
          </div>
          <div>
            <strong>{format(b.enemy)}</strong>
            <small>Enemy strength</small>
          </div>
        </div>
        <div className={`battle-receipt ${ready ? 'revealed' : ''}`}>
          {b.won ? (
            <div className="victory-loot">
              <span>
                <Coins size={18} />+{format(b.gold)} gold
              </span>
              <span>
                <Sparkles size={18} />+{b.renown} renown
              </span>
              {b.mode === 'personal' ? (
                <span className="gold-text">
                  <Backpack size={16} />
                  Unbanked
                </span>
              ) : (
                <span className="positive">
                  <Check size={16} />
                  Secured
                </span>
              )}
            </div>
          ) : (
            <div className="defeat-cost">
              <Heart size={17} />
              {b.casualties} attacking troops lost.
              {b.mode === 'personal'
                ? ` ${b.lostItems} equipped/carried items and all satchel gold were lost.`
                : ' Your home and defenders are safe.'}
            </div>
          )}
          {b.won && b.casualties > 0 && (
            <p className="defeat-cost">
              Victory came at a cost: {b.casualties} of {b.deployed} deployed soldiers fell.
            </p>
          )}
          {b.gearLost && (b.gearLost.weapons > 0 || b.gearLost.armor > 0) && (
            <p className="defeat-cost">
              Equipment destroyed: {b.gearLost.weapons} weapon kits and {b.gearLost.armor} armor
              kits. Stored gear was untouched.
            </p>
          )}
          {b.deployed !== undefined && (
            <div className="combat-exchange">
              <h3>{b.boss ? 'Boss clash' : 'Decisive exchange'}</h3>
              <p>
                Character: {b.heroDamage} damage · Units: {b.armyDamage} damage · Enemy:{' '}
                {b.enemyDamage} troop damage
              </p>
              <small>
                One resolved combat exchange. Damage and casualties come from the saved server
                result.
              </small>
            </div>
          )}
          <ol className="battle-log">
            {b.lines.map((line, i) => (
              <li key={line}>
                <span>0{i + 1}</span>
                {line}
              </li>
            ))}
          </ol>
          {b.items.length > 0 ? (
            <div className="battle-items">
              {b.items.map((item) => (
                <ItemTile
                  key={item.id}
                  item={item}
                  current={game.inventory.filter(
                    (i) => i.kind === item.kind && game.equipped.includes(i.id),
                  )}
                  comparison={
                    ['weapon', 'armor'].includes(item.kind)
                      ? item.power -
                        (game.inventory.find(
                          (i) => i.kind === item.kind && game.equipped.includes(i.id),
                        )?.power ?? 0)
                      : undefined
                  }
                  equipped={game.equipped.includes(item.id)}
                  action={
                    b.mode !== 'personal' || !game.expedition ? (
                      <Button
                        variant="secondary"
                        disabled={
                          game.equipped.includes(item.id) ||
                          !game.inventory.some((i) => i.id === item.id) ||
                          (item.kind === 'rune' &&
                            game.inventory.filter(
                              (i) => i.kind === 'rune' && game.equipped.includes(i.id),
                            ).length >= 2)
                        }
                        onClick={() => act({ type: 'equip', id: item.id })}
                      >
                        {game.equipped.includes(item.id) ? 'Equipped' : 'Equip item'}
                      </Button>
                    ) : (
                      <small>Extract safely before equipping this item.</small>
                    )
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
        <div className="dialog-actions">
          {!ready ? (
            <Button variant="secondary" onClick={() => setReady(true)}>
              Skip animation
            </Button>
          ) : null}
          {game.expedition ? (
            <>
              <Button
                variant="secondary"
                onClick={async () => {
                  if (await act({ type: 'extract' })) open(null);
                }}
              >
                Extract & bank loot
                <Backpack size={15} />
              </Button>
              <Button onClick={() => open(null)}>
                {game.expedition.nextStage > 5
                  ? 'Review your expedition'
                  : 'Consider the next stage'}
                <ArrowRight size={15} />
              </Button>
            </>
          ) : (
            <Button onClick={() => open(null)}>
              Return to your realm
              <ArrowRight size={15} />
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
export function ChestDialog() {
  const { game, act, open } = useGame();
  const item = game.lastLoot!;
  const [revealed, setRevealed] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), 950);
    return () => clearTimeout(id);
  }, []);
  return (
    <Dialog
      title="A new story, uncovered."
      className={`chest-dialog rarity-${item.rarity}`}
      onClose={() => open(null)}
    >
      <div className={`chest-reveal ${revealed ? 'revealed' : ''}`}>
        <img src="/art/chest.webp" alt="An opened treasure chest glowing with warm gold light" />
        <div className="chest-reveal-sparks" />
        <span>
          {revealed ? `${item.rarity.toUpperCase()} DISCOVERY` : 'SOMETHING STIRS WITHIN…'}
        </span>
      </div>
      <div className="dialog-body">
        {revealed ? (
          <>
            <ItemTile item={item} equipped={game.equipped.includes(item.id)} />
            <p className="center-muted">
              Safely added to your inventory. Your epic+ guarantee is{' '}
              {game.pity === 0 ? 'reset' : `${game.pity} / 9 before a guaranteed opening`}.
            </p>
            <div className="dialog-actions">
              <Button variant="secondary" onClick={() => open(null)}>
                Keep in inventory
              </Button>
              <Button
                disabled={game.equipped.includes(item.id) || !!game.expedition}
                onClick={async () => {
                  if (await act({ type: 'equip', id: item.id })) open(null);
                }}
              >
                Equip discovery
                <Check size={16} />
              </Button>
            </div>
          </>
        ) : (
          <div className="opening-message">
            <h2>Fortune holds its breath.</h2>
            <Button variant="ghost" onClick={() => setRevealed(true)}>
              Reveal now
              <ArrowRight size={15} />
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
export function SettingsDialog({
  reset,
  sound,
  onSound,
}: {
  reset?: () => void;
  sound: boolean;
  onSound: () => void;
}) {
  const { game, act, open, toast, online } = useGame();
  const [commanderName, setCommanderName] = useState(game.name);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [resetText, setResetText] = useState('');
  const [resetting, setResetting] = useState(false);
  function downloadSave() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ash-and-oath-realm.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Dialog title="Your realm, your pace." onClose={() => open(null)}>
      <div className="dialog-body settings-body">
        <div className="settings-row">
          <Volume2 size={21} />
          <div>
            <h3>Sound effects</h3>
            <p>Soft tones for discoveries and victories.</p>
          </div>
          <button
            className={`toggle ${sound ? 'on' : ''}`}
            role="switch"
            aria-label="Sound effects"
            aria-checked={sound}
            onClick={onSound}
          >
            <span />
          </button>
        </div>
        <div className="settings-row">
          <Download size={21} />
          <div>
            <h3>{online ? 'Your realm is saved in the cloud.' : 'Your realm is saved locally.'}</h3>
            <p>
              {online
                ? 'Every order is confirmed by the game server. Export a read-only snapshot of your progress.'
                : 'Stored automatically in this browser. Export a backup before clearing browser data.'}
            </p>
          </div>
          <Button variant="secondary" onClick={downloadSave}>
            Export
          </Button>
        </div>
        {!online && (
          <section className="demo-controls">
            <span className="letter-label">LOCAL PLAYTEST TOOLS</span>
            <h3>Try the idle loop without the wait.</h3>
            <p>
              Advance one tribute interval to receive gold and AP. This is a demo control; it does
              not advance cooldowns or the season.
            </p>
            <Button
              variant="secondary"
              onClick={async () => {
                const result = await act({ type: 'advance' });
                if (result)
                  toast(
                    `Five minutes of tribute: +${format(result.tribute!.gold)} gold, +${result.tribute!.ap} AP.`,
                  );
              }}
            >
              <Clock3 size={16} />
              Camp for {TICK_MS / 60000} minutes
            </Button>
          </section>
        )}
        <div className="settings-limits">
          <Shield size={18} />
          <p>
            {online
              ? 'Cloud realm · ' +
                online.user.email +
                '. PvP enlistment is voluntary. Only bank savings are protected from plunder.'
              : 'Single-player demo. Enemy realms and faction standings are simulated; local saves are separate from online accounts.'}
          </p>
        </div>
        {online && (
          <section className="account-settings">
            <label>
              Commander name
              <input
                value={commanderName}
                onChange={(e) => setCommanderName(e.target.value)}
                minLength={3}
                maxLength={24}
              />
            </label>
            <Button
              variant="secondary"
              onClick={() => act({ type: 'rename', name: commanderName })}
            >
              Save name
            </Button>
            <p className="muted">Your commander name is visible to other players.</p>
            {!online.user.emailVerified && (
              <Button
                variant="secondary"
                disabled={sendingVerification}
                onClick={async () => {
                  setSendingVerification(true);
                  try {
                    await sendEmailVerification(online.user);
                    toast('Verification email sent. Follow the link, then sign out and back in.');
                  } catch (e) {
                    toast(friendlyError(e), true);
                  } finally {
                    setSendingVerification(false);
                  }
                }}
              >
                Send verification email
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await signOut(auth);
                } catch (e) {
                  toast(friendlyError(e), true);
                }
              }}
            >
              Sign out
            </Button>
          </section>
        )}
        {!online && (
          <div className="reset-area">
            {resetting ? (
              <>
                <label>
                  Type RESET to erase this local realm.
                  <input
                    aria-label="Reset confirmation"
                    value={resetText}
                    onChange={(e) => setResetText(e.target.value)}
                    placeholder="RESET"
                  />
                </label>
                <Button
                  variant="danger"
                  disabled={resetText !== 'RESET'}
                  onClick={() => {
                    reset?.();
                    open(null);
                    toast('A new chapter begins. Your realm has been reset.');
                  }}
                >
                  Erase realm & start again
                </Button>
              </>
            ) : (
              <button className="reset-link" onClick={() => setResetting(true)}>
                Start a new realm
              </button>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
export function GuideDialog() {
  const { open, navigate } = useGame();
  return (
    <Dialog title="A wanderer’s field guide" onClose={() => open(null)}>
      <div className="dialog-body guide-body">
        <p className="dialog-lead">
          A small home is still something worth fighting for. Here’s where your story begins.
        </p>
        {[
          {
            icon: Flag,
            title: '1. Choose an oath',
            text: 'Four factions, four small bonuses. Your choice opens dungeons and the war effort. Enlist separately when you are ready for PvP.',
          },
          {
            icon: Coins,
            title: '2. Put your gold to work',
            text: 'Start with 1,800 gold and 36 AP. Every 5 minutes brings 120+ gold and 5 AP. AP caps at 60; tribute accrues for up to 12 hours offline.',
          },
          {
            icon: Swords,
            title: '3. Raise and arm your troops',
            text: 'Build an armory for 300 gold. Recruits cost 60 gold, and basic blacksmith equipment costs 50 each; advanced kits cost more. Attackers venture out. Defenders stay home.',
          },
          {
            icon: Gem,
            title: '4. Explore, discover, improve',
            text: 'Army raids cost 5 AP; PvP costs 8. Clear five stages to defeat a dungeon boss and unlock the next area. Equip discovered loot and choose the size of your dungeon party.',
          },
          {
            icon: Backpack,
            title: '5. Know when to come home',
            text: 'At Village tier, lead personal expeditions for 7 AP per stage and 50% more gold. Extract to bank your satchel. Defeat loses equipped non-companion items and everything carried. Your bonded companion escapes injured.',
          },
          {
            icon: Shield,
            title: '6. Read the enemy',
            text: 'Charging enemies favor Guarded, Channeling favors Aggressive, and Fortified favors Balanced. A counter gives +20% strength and fewer losses. Every dungeon win can kill deployed troops; reserves stay home.',
          },
          {
            icon: Heart,
            title: '7. Care for your companion',
            text: 'Equip a discovered companion to add strength and reduce dungeon casualties. It gains 20 XP per victory, 40 per boss, up to bond level 500 with small incremental gains and a passive ability. Defeat injures it for 30 minutes. Treatment costs 120 gold at home.',
          },
          {
            icon: Trophy,
            title: '8. Write the next chapter',
            text: 'Earn renown in battles, dungeons, and capped gold donations. The founding campaign tracks faction totals. Seasonal resets and rewards are still planned.',
          },
        ].map((t) => (
          <div className="guide-row" key={t.title}>
            <t.icon size={22} />
            <div>
              <h3>{t.title}</h3>
              <p>{t.text}</p>
            </div>
          </div>
        ))}
        <Button
          className="full-width"
          onClick={() => {
            open(null);
            navigate('settlement');
          }}
        >
          Back to building your story
          <ArrowRight size={16} />
        </Button>
      </div>
    </Dialog>
  );
}
export function ActivityDialog() {
  const { game, open } = useGame();
  return (
    <Dialog title="The chronicles of your realm" onClose={() => open(null)}>
      <div className="dialog-body">
        <p className="muted">Your latest 40 chapters, saved as they happen.</p>
        <div className="chronicle-list">
          {game.activity.map((a) => (
            <div key={a.id}>
              <span className="chronicle-dot" />
              <div>
                <p>{a.text}</p>
                <small>
                  {new Date(a.time).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
