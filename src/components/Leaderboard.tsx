import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGame } from '../game/context';
import type { PublicRealm } from '../game/online';
import { FACTIONS, TIERS } from '../game/data';
import { stats, format } from '../game/engine';

export function Leaderboard() {
  const { game, online } = useGame();
  const [players, setPlayers] = useState<PublicRealm[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!online) return;
    return onSnapshot(
      query(collection(db, 'publicRealms'), orderBy('power', 'desc'), limit(50)),
      (result) => {
        setPlayers(result.docs.map((doc) => doc.data() as PublicRealm));
        setLoaded(true);
        setError('');
      },
      () => {
        setError('Rankings could not be loaded. Please reconnect.');
        setLoaded(true);
      },
    );
  }, [online?.user.uid]);
  const st = stats(game);
  const ownPower = st.attack + st.defense + 2 * (st.heroAttack + st.heroDefense);
  return (
    <section className="panel leaderboard" aria-label="Overall power leaderboard">
      <h2>The realm's strongest</h2>
      <p>
        Global top 50, across all factions and settlement tiers. Power = army attack + realm defense
        + twice your character's weapon and armor strength. Only equipped forces count. Rankings
        update when a realm saves; equal power shares rank.
      </p>
      <p>
        Your power: <strong>{format(ownPower)}</strong>
      </p>
      {!online ? (
        <p>Sign in to see the global rankings.</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : !loaded ? (
        <p>Loading rankings…</p>
      ) : !players.length ? (
        <p>No ranked realms yet.</p>
      ) : (
        <div className="leaderboard-scroll">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Commander</th>
                <th>Power</th>
                <th>Faction</th>
                <th>Realm</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className={p.id === online.user.uid ? 'own-ranking' : ''}>
                  <td>{players.findIndex((other) => other.power === p.power) + 1}</td>
                  <td>
                    {p.name}
                    {p.id === online.user.uid ? ' (you)' : ''}
                  </td>
                  <td>{format(p.power ?? 0)}</td>
                  <td>{FACTIONS.find((f) => f.id === p.faction)?.name ?? 'Unaligned'}</td>
                  <td>{TIERS[p.level].name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
