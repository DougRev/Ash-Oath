import { Shield } from 'lucide-react';
import { useGame } from '../game/context';
import { format } from '../game/engine';
import { Button, Dialog } from './ui';
import '../defense-log.css';

export function DefenseNotice() {
  const { game, open } = useGame();
  const unread = (game.defenseReports ?? []).filter((r) => r.seq > (game.defenseReadSeq ?? 0));
  return (
    <section
      className={`defense-notice ${unread.length ? 'has-attacks' : ''}`}
      aria-label="Defense notifications"
    >
      <Shield size={20} aria-hidden="true" />
      <div aria-live="polite">
        {unread.length ? (
          <>
            <strong>
              {unread.length} unread attack {unread.length === 1 ? 'report' : 'reports'}
            </strong>
            <span>
              {format(unread.reduce((sum, r) => sum + r.goldLost, 0))} gold lost · Review what
              happened to your realm.
            </span>
          </>
        ) : (
          <span>Your realm’s defense history</span>
        )}
      </div>
      <Button variant="secondary" onClick={() => open('defense')}>
        Attack log
      </Button>
    </section>
  );
}

export function DefenseLog() {
  const { game, open, act } = useGame();
  const reports = game.defenseReports ?? [];
  const unread = reports.filter((r) => r.seq > (game.defenseReadSeq ?? 0));
  return (
    <Dialog title="Attack log" onClose={() => open(null)}>
      <div className="dialog-body defense-log">
        <p className="muted">
          Your latest 50 incoming attacks, newest first. Bank savings are protected. Your garrison
          currently loses no soldiers or gear in PvP.
        </p>
        {unread.length > 0 && (
          <Button
            onClick={() =>
              act({ type: 'readDefenseReports', through: Math.max(...reports.map((r) => r.seq)) })
            }
          >
            Mark reports as read
          </Button>
        )}
        {reports.length === 0 && (
          <p>
            No incoming attack reports yet. Attacks recorded before this update remain in your
            general activity history.
          </p>
        )}
        {reports.map((r) => (
          <article
            key={r.seq}
            className="defense-report"
            aria-label={`Attack by ${r.attackerName}`}
          >
            <header>
              <h3>{r.attackerName}</h3>
              <strong className={r.defended ? 'positive' : 'needs-gear'}>
                {r.defended ? 'Defense held' : 'Realm plundered'}
              </strong>
            </header>
            <small>
              {new Date(r.time).toLocaleString()}{' '}
              {r.seq > (game.defenseReadSeq ?? 0) ? ' · Unread' : ''}
            </small>
            <dl>
              <div>
                <dt>Gold lost</dt>
                <dd>{format(r.goldLost)}</dd>
              </div>
              <div>
                <dt>Soldiers lost</dt>
                <dd>{format(r.troopsLost)}</dd>
              </div>
              <div>
                <dt>Weapons lost</dt>
                <dd>{format(r.weaponsLost)}</dd>
              </div>
              <div>
                <dt>Armor lost</dt>
                <dd>{format(r.armorLost)}</dd>
              </div>
            </dl>
            <p>
              {format(r.attackPower)} rolled attack against {format(r.defensePower)} defense.
            </p>
            {!r.defended && (
              <p>Recovery shield granted until {new Date(r.shieldUntil).toLocaleString()}.</p>
            )}
          </article>
        ))}
        <Button variant="ghost" onClick={() => open('activity')}>
          View general activity history
        </Button>
      </div>
    </Dialog>
  );
}
