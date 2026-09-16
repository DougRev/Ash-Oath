import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { TIERS } from '../game/data';
import { Button } from '../components/ui';
import { friendlyError } from '../components/Account';
import type { Tactic } from '../game/types';
type Report = {
  revision: number;
  income: number;
  rows: {
    name: string;
    chance: number;
    min: number;
    max: number;
    defeat: number;
    replacementMin: number;
    replacementMax: number;
    baseGold: number;
  }[];
};
const forecast = httpsCallable<
  { uid: string; troops: number; tactic: Tactic; mode: 'army' | 'personal' },
  Report
>(functions, 'adminDungeonForecast');
export default function AdminBalance({ uid }: { uid?: string }) {
  const [troops, setTroops] = useState(6);
  const [tactic, setTactic] = useState<Tactic>('balanced');
  const [mode, setMode] = useState<'army' | 'personal'>('army');
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function calculate() {
    if (!uid) return;
    setBusy(true);
    setError('');
    setReport(null);
    try {
      setReport((await forecast({ uid, troops, tactic, mode })).data);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-panel admin-balance">
      <h2>Economy & dungeon balance</h2>
      <p>Administrator forecasts only. These estimates never spend gold, AP, or troops.</p>
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tier</th>
              <th>Upgrade gold</th>
              <th>Gold / 5 min</th>
              <th>Saving from previous tier</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map((tier, i) => (
              <tr key={tier.name}>
                <td>{tier.name}</td>
                <td>{tier.cost.toLocaleString()}</td>
                <td>{tier.income}</td>
                <td>
                  {i
                    ? `${(tier.cost / TIERS[i - 1].income / 12).toFixed(1)} hours`
                    : 'Starting home'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Saving times exclude starting funds, faction bonuses, raids and expenses. The 12-hour
        offline cap requires regular collection.
      </p>
      {!uid ? (
        <p>Select a player with Manage to inspect their current army.</p>
      ) : (
        <>
          <p>
            Models all stages, including locked ones, using the selected realm’s current equipment
            and companion. Personal mode models a fresh single battle; it does not predict an entire
            expedition.
          </p>
          <div className="admin-actions">
            <label>
              Deployed troops{' '}
              <input
                type="number"
                min={1}
                max={1000}
                value={troops}
                onChange={(e) => {
                  setTroops(Number(e.target.value));
                  setReport(null);
                }}
              />
            </label>
            <label>
              Formation{' '}
              <select
                value={tactic}
                onChange={(e) => {
                  setTactic(e.target.value as Tactic);
                  setReport(null);
                }}
              >
                <option value="balanced">Balanced</option>
                <option value="guarded">Guarded</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </label>
            <label>
              Deployment{' '}
              <select
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as 'army' | 'personal');
                  setReport(null);
                }}
              >
                <option value="army">Army</option>
                <option value="personal">Personal</option>
              </select>
            </label>
            <Button
              disabled={busy || !Number.isInteger(troops) || troops < 1 || troops > 1000}
              onClick={() => void calculate()}
            >
              {busy ? 'Calculating…' : 'Calculate casualty forecast'}
            </Button>
          </div>
          {error && <p role="alert">{error}</p>}
          {report && (
            <>
              <p>
                Realm revision {report.revision} · Tribute {report.income} gold / tick. Victory
                losses are bounds; strength rolls determine actual losses. Gold varies ±10%; item
                sales excluded. Personal rewards remain at risk until extraction.
              </p>
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>Win chance</th>
                      <th>Victory deaths</th>
                      <th>Defeat deaths</th>
                      <th>Victory recruit cost (gear extra)</th>
                      <th>Base reward gold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row.name}>
                        <td>{row.name}</td>
                        <td>{Math.round(row.chance * 100)}%</td>
                        <td>
                          {row.min}–{row.max}
                        </td>
                        <td>{row.defeat}</td>
                        <td>
                          {row.replacementMin}–{row.replacementMax}
                        </td>
                        <td>{row.baseGold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
