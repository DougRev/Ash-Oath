import { useState } from 'react';
import { Shield, Swords } from 'lucide-react';
import { useGame } from '../game/context';
import { RIVALS, RIVAL_COOLDOWN, RIVAL_DAILY_WINS } from '../game/rivals';
import { TIERS } from '../game/data';
import { powerFor } from '../game/engine';
import { useClock } from '../game/useRealm';
import type { Tactic } from '../game/types';
import { AP, Button, Dialog, Gold } from './ui';
import { Forecast, TacticPicker } from '../pages/Dungeons';
export function RivalStrongholds() {
  const { game, act, busy, open } = useGame();
  const now = useClock();
  const [tier, setTier] = useState(game.level),
    [target, setTarget] = useState<string | null>(null),
    [tactic, setTactic] = useState<Tactic>('balanced');
  const wonToday = game.rivalRaids?.day === Math.floor(now / 86400000) ? game.rivalRaids.wins : 0;
  const remaining = RIVAL_DAILY_WINS - wonToday;
  const rival = RIVALS.find((r) => r.id === target);
  const cooldown = (id: string) =>
    Math.max(0, (game.rivalRaids?.last[id] ?? 0) + RIVAL_COOLDOWN - now);
  const blocked = (r: (typeof RIVALS)[number]) =>
    busy ||
    !remaining ||
    Math.abs(game.level - r.level) > 1 ||
    cooldown(r.id) > 0 ||
    !!game.expedition ||
    game.ap < 8 ||
    !game.troops.offense;
  return (
    <section className="panel rival-panel" aria-label="AI rival strongholds">
      <div className="section-heading">
        <div>
          <span className="letter-label">AI RIVALS · RAID FOR GOLD</span>
          <h2>A frontier worth fighting for.</h2>
        </div>
        <span className="simulation-pill">
          {remaining} / {RIVAL_DAILY_WINS} paid victories left today
        </span>
      </div>
      <p>
        These commanders are AI, not player accounts. Raid their strongholds for gold without
        enlisting against real players. Defeat can cost attacking troops; your garrison stays home.
      </p>
      <label>
        Scout settlement tier{' '}
        <select value={tier} onChange={(e) => setTier(Number(e.target.value))}>
          {TIERS.map((t, i) => (
            <option key={t.name} value={i}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <div className="rival-grid">
        {RIVALS.filter((r) => r.level === tier).map((r) => (
          <article className="rival-card" key={r.id}>
            <span className="letter-label">AI · {r.title}</span>
            <h3>{r.name}</h3>
            <p>{r.realm} stronghold</p>
            <div className="rival-stats">
              <span>
                <Shield size={15} />
                {r.defense} defense
              </span>
              <Gold amount={r.gold} />
            </div>
            <Button
              variant="secondary"
              disabled={blocked(r)}
              onClick={() => (game.faction ? setTarget(r.id) : open('faction'))}
            >
              {Math.abs(game.level - r.level) > 1
                ? 'Outside your tier range'
                : !remaining
                  ? 'Daily bounties collected'
                  : cooldown(r.id) > 0
                    ? `Regrouping: ${Math.ceil(cooldown(r.id) / 60000)}m`
                    : 'Scout AI rival'}
            </Button>
          </article>
        ))}
      </div>
      <small>
        8 AP per attempt · Each rival regroups for 30 minutes · Paid victories reset at midnight
        UTC. No season renown is awarded. Stronger rivals offer larger bounties.
      </small>
      {rival && (
        <Dialog title={`Scout ${rival.name} (AI)`} onClose={() => setTarget(null)}>
          <div className="dialog-body">
            <p>
              AI-controlled {rival.realm.toLowerCase()}. Your entire offensive army joins this raid.
              Defeat spends AP and can kill troops.
            </p>
            <TacticPicker pvp tactic={tactic} setTactic={setTactic} />
            <Forecast power={powerFor(game, 'pvp', tactic)} enemy={rival.defense} />
            <div className="scout-spoils">
              <span>Victory bounty</span>
              <Gold amount={rival.gold} />
            </div>
            <p className="muted">
              This does not enlist you, end your player recovery shield, or award season renown.
            </p>
            <Button
              className="full-width"
              disabled={blocked(rival) || !game.faction}
              onClick={async () => {
                if (await act({ type: 'raidRival', rival: rival.id, tactic })) setTarget(null);
              }}
            >
              Raid AI stronghold <Swords size={16} />
              <AP amount={8} />
            </Button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
