import { useCallback, useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { Button } from '../components/ui';
import { friendlyError } from '../components/Account';
import type { AdminPlayer, AdminSummary } from '../game/admin';
import '../admin.css';
import AdminBalance from './AdminBalance';
const overview = httpsCallable<Record<string, never>, AdminSummary>(functions, 'adminOverview');
const players = httpsCallable<
  { search?: string; after?: string },
  { players: AdminPlayer[]; next: string | null }
>(functions, 'adminPlayers');
const moderate = httpsCallable(functions, 'adminModerate');
export default function AdminDashboard({ back }: { back: () => void }) {
  const [summary, setSummary] = useState<AdminSummary | null>(null),
    [rows, setRows] = useState<AdminPlayer[]>([]),
    [next, setNext] = useState<string | null>(null);
  const [search, setSearch] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<AdminPlayer | null>(null),
    [reason, setReason] = useState('');
  const refresh = useCallback(async (searchValue = '', after?: string) => {
    setBusy(true);
    setError('');
    try {
      const [s, p] = await Promise.all([
        overview({}),
        players({ search: searchValue, ...(after ? { after } : {}) }),
      ]);
      setSummary(s.data);
      setRows(p.data.players);
      setNext(p.data.next);
      setSelected(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function apply() {
    if (!selected) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await moderate({
        uid: selected.uid,
        suspended: !selected.suspended,
        reason,
        revision: selected.revision,
        requestId: crypto.randomUUID(),
      });
      setNotice(
        `${selected.name} ${selected.suspended ? 'restored' : 'suspended'}. Action recorded.`,
      );
      setReason('');
      await refresh(search);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-dashboard">
      <header className="admin-heading">
        <div>
          <span className="letter-label">ASH & OATH · ADMINISTRATION</span>
          <h1>The steward’s desk</h1>
          <p>Manage the world. Your own realm awaits whenever you’re ready.</p>
        </div>
        <Button variant="secondary" onClick={back}>
          Return to my realm
        </Button>
      </header>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <AdminBalance key={selected?.uid ?? 'none'} uid={selected?.uid} />
      <section className="admin-stats" aria-label="Game overview">
        {[
          ['Player realms', summary?.realms],
          ['Enlisted in PvP', summary?.enlisted],
          ['Suspended realms', summary?.suspended],
        ].map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value ?? '—'}</strong>
          </article>
        ))}
      </section>
      <section className="admin-panel">
        <div className="admin-section-title">
          <div>
            <h2>Player management</h2>
            <p>Search an exact email or player ID. Browse 25 realms per page.</p>
          </div>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setSearch('');
              void refresh();
            }}
          >
            Refresh / all players
          </Button>
        </div>
        <form
          className="admin-search"
          onSubmit={(e) => {
            e.preventDefault();
            void refresh(search);
          }}
        >
          <label htmlFor="player-search">Email or player ID</label>
          <input
            id="player-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="commander@example.com"
          />
          <Button disabled={busy}>Search players</Button>
        </form>
        {busy && <p role="status">Loading…</p>}
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Commander</th>
                <th>Faction / tier</th>
                <th>Treasury</th>
                <th>Status</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.uid}>
                  <td>
                    <strong>{p.name}</strong>
                    <small>{p.email}</small>
                    <small>{p.uid}</small>
                  </td>
                  <td>
                    {p.faction || 'Unaligned'} ·{' '}
                    {['Homestead', 'Settlement', 'Village', 'Castle', 'Stronghold', 'Citadel'][
                      p.level
                    ] || p.level}
                  </td>
                  <td>
                    {p.gold.toLocaleString()} gold
                    <small>{(p.bankGold ?? 0).toLocaleString()} protected in bank</small>
                    <small>
                      {p.ap} AP · {p.renown} renown
                    </small>
                  </td>
                  <td>{p.suspended ? 'Suspended' : p.enlisted ? 'Enlisted' : 'Active'}</td>
                  <td>
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setSelected(p);
                        setReason('');
                        setError('');
                      }}
                    >
                      Manage {p.name}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!busy && !rows.length && (
          <p>No matching realms. An account gets a realm when it first enters the game.</p>
        )}
        {next && (
          <Button variant="secondary" disabled={busy} onClick={() => void refresh('', next)}>
            Next 25 players
          </Button>
        )}
        {selected && (
          <section className="admin-moderation" aria-label="Moderation action">
            <h3>
              {selected.suspended ? 'Restore' : 'Suspend'} {selected.name}
            </h3>
            <p>
              {selected.suspended
                ? 'Restore gameplay access. The player can choose to enlist again.'
                : 'Block gameplay actions and remove this realm from PvP. Progress is preserved; tribute stops during suspension.'}
            </p>
            <label htmlFor="moderation-reason">Reason (required, visible to administrators)</label>
            <textarea
              id="moderation-reason"
              minLength={8}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="admin-actions">
              <Button
                variant={selected.suspended ? 'primary' : 'danger'}
                disabled={busy || reason.trim().length < 8}
                onClick={() => void apply()}
              >
                Confirm {selected.suspended ? 'restoration' : 'suspension'}
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setSelected(null)}>
                Cancel
              </Button>
            </div>
          </section>
        )}
      </section>
      <div className="admin-columns">
        <section className="admin-panel">
          <h2>{summary?.campaign?.name || 'Founding campaign'}</h2>
          <p>Live faction renown. Refresh to update.</p>
          {Object.entries(summary?.campaign?.scores || {}).map(([faction, score]) => (
            <div className="admin-score" key={faction}>
              <span>{faction}</span>
              <strong>{score.toLocaleString()}</strong>
            </div>
          ))}
        </section>
        <section className="admin-panel">
          <h2>Infrastructure & billing</h2>
          <p>
            Usage-based Firebase services power game actions, cloud saves and website delivery. This
            dashboard does not display your invoice.
          </p>
          <p>
            <a
              href="https://console.firebase.google.com/project/ash-and-oath/usage"
              target="_blank"
              rel="noreferrer"
            >
              Open Firebase usage ↗
            </a>
          </p>
          <p>
            <a
              href="https://console.cloud.google.com/billing?project=ash-and-oath"
              target="_blank"
              rel="noreferrer"
            >
              Open Google Cloud billing ↗
            </a>
          </p>
          <small>Function instance limits and budget alerts are not spending caps.</small>
        </section>
      </div>
      <section className="admin-panel">
        <h2>Admin activity</h2>
        <p>Latest 25 actions. Reasons and identities are private to administrators.</p>
        {summary?.audit.map((a) => (
          <article className="admin-audit" key={a.id}>
            <strong>
              {a.action} · {new Date(a.at).toLocaleString()}
            </strong>
            <p>{a.reason}</p>
            <small>
              Actor: {a.actor} · Player: {a.target}
            </small>
          </article>
        ))}
        {!summary?.audit.length && <p>No administration actions yet.</p>}
      </section>
    </main>
  );
}
