import { useState } from 'react';
import { Shield, Swords } from 'lucide-react';
import { useGame } from '../game/context';
import { assignedWeapons, equipmentFor, stats, format } from '../game/engine';
import { UNIT_WEAPONS } from '../game/data';
import { barracksCost, barracksLevel, MAX_BARRACKS } from '../game/progression';
import type { Role } from '../game/types';
import { Button } from './ui';

export function ForceSummary({
  role,
  compact = false,
  onEquip,
}: {
  role: Role;
  compact?: boolean;
  onEquip?: () => void;
}) {
  const { game } = useGame();
  const st = stats(game);
  const gear = equipmentFor(game, role);
  const total = game.troops[role];
  const weapons = Object.values(assignedWeapons(game, role)).reduce((sum, n) => sum + n, 0);
  const armor = Math.min(total, gear.armorEquipped);
  const offensive = role === 'offense';
  const Icon = offensive ? Swords : Shield;
  if (compact)
    return (
      <div
        role="region"
        className="force-strip"
        aria-label={`${offensive ? 'Offense' : 'Defense'} readiness`}
      >
        <span>
          <strong>{format(total)}</strong> soldiers
        </span>
        <span>
          <strong>{format(offensive ? st.attack : st.defense)}</strong>{' '}
          {offensive ? 'attack' : 'defense'} power
        </span>
        <span className={total - weapons ? 'needs-gear' : ''}>
          <strong>{total - weapons}</strong> need weapons
        </span>
        <span>
          <strong>{total - armor}</strong> need armor
        </span>
      </div>
    );
  return (
    <section className="force-card" aria-label={`${offensive ? 'Offense' : 'Defense'} overview`}>
      <header>
        <Icon size={30} />
        <div>
          <h2>{offensive ? 'Offense' : 'Defense'}</h2>
          <p>{offensive ? 'The Vanguard' : 'The Garrison'}</p>
        </div>
      </header>
      <div className="force-numbers">
        <div>
          <strong>{format(total)}</strong>
          <span>soldiers</span>
        </div>
        <div>
          <strong>{format(offensive ? st.attack : st.defense)}</strong>
          <span>{offensive ? 'Attack' : 'Defense'} power</span>
        </div>
      </div>
      <div className="readiness-line">
        <span>Weapons</span>
        <progress aria-label={`${role} weapon coverage`} value={weapons} max={Math.max(1, total)} />
        <strong>
          {weapons} / {total}
        </strong>
      </div>
      <div className="readiness-line">
        <span>Armor</span>
        <progress aria-label={`${role} armor coverage`} value={armor} max={Math.max(1, total)} />
        <strong>
          {armor} / {total}
        </strong>
      </div>
      <p className="gear-gaps">
        <span className={total - weapons ? 'needs-gear' : ''}>{total - weapons} need weapons</span>
        <span>{total - armor} need armor</span>
      </p>
      <p className="force-mix">
        {UNIT_WEAPONS.filter((w) => (assignedWeapons(game, role)[w.id] ?? 0) > 0)
          .map((w) => `${assignedWeapons(game, role)[w.id]} ${w.name}`)
          .join(' · ') || 'No weapons assigned.'}
      </p>
      {offensive && game.expedition && (
        <p className="force-deployment">
          {game.expedition.troops ?? total} on expedition ·{' '}
          {total - (game.expedition.troops ?? total)} at home. Equipment locked until extraction.
        </p>
      )}
      <Button variant="secondary" onClick={onEquip}>
        Equip {offensive ? 'offense' : 'defense'}
      </Button>
    </section>
  );
}

export function ArmyManagement({ onEquip }: { onEquip: (role: Role) => void }) {
  const { game, act } = useGame();
  const st = stats(game);
  const total = game.troops.offense + game.troops.defense;
  const [role, setRole] = useState<Role>('offense');
  const [count, setCount] = useState(1);
  const [from, setFrom] = useState<Role>('offense');
  const [transfer, setTransfer] = useState(1);
  const free = Math.max(0, st.capacity - total),
    affordable = Math.min(free, Math.floor(game.gold / 60));
  const valid = Number.isInteger(count) && count > 0 && count <= 1000;
  return (
    <div className="army-command">
      <div className="force-grid">
        <ForceSummary role="offense" onEquip={() => onEquip('offense')} />
        <ForceSummary role="defense" onEquip={() => onEquip('defense')} />
      </div>
      <section className="barracks-band" aria-label="Barracks capacity">
        <div>
          <h3>Barracks</h3>
          <span>
            Level {barracksLevel(game)} / {MAX_BARRACKS}
          </span>
        </div>
        <div className="capacity-track">
          <progress aria-label="Troop capacity" value={total} max={st.capacity} />
          <span>
            <strong>
              {total} / {st.capacity}
            </strong>{' '}
            troop capacity · {free} free beds
          </span>
        </div>
        <Button
          variant="secondary"
          disabled={
            !game.buildings.armory ||
            barracksLevel(game) >= MAX_BARRACKS ||
            game.gold < barracksCost(game)
          }
          onClick={() => act({ type: 'upgradeBarracks' })}
        >
          {barracksLevel(game) >= MAX_BARRACKS
            ? 'Fully expanded'
            : `Expand barracks · ${format(barracksCost(game))} gold`}
        </Button>
      </section>
      {!game.buildings.armory && (
        <div className="command-notice">
          <p>Build the Armory to recruit, transfer soldiers, and expand your barracks.</p>
          <Button
            disabled={game.gold < 300}
            onClick={() => act({ type: 'build', building: 'armory' })}
          >
            Build Armory · 300 gold
          </Button>
        </div>
      )}
      <div className="command-forms">
        <section aria-label="Recruit soldiers">
          <h2>Recruit soldiers</h2>
          <p>60 gold each. New recruits arrive without weapons or armor.</p>
          <div className="command-inputs">
            <label>
              Destination
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="offense">Offense</option>
                <option value="defense">Defense</option>
              </select>
            </label>
            <label>
              Recruits to hire
              <input
                type="number"
                min={1}
                max={1000}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="command-presets">
            {[1, 5, 10].map((n) => (
              <button key={n} onClick={() => setCount(n)}>
                {n}
              </button>
            ))}
            <button disabled={!affordable} onClick={() => setCount(affordable)}>
              Max affordable ({affordable})
            </button>
          </div>
          <p className="order-review" role="status">
            {valid
              ? `${count} unarmed recruit${count === 1 ? '' : 's'} · ${format(count * 60)} gold`
              : 'Enter a whole quantity from 1 to 1,000.'}
            {valid && count > free
              ? ' · Not enough beds.'
              : valid && count > affordable
                ? ' · Not enough gold.'
                : ''}
          </p>
          <Button
            disabled={!game.buildings.armory || !valid || count > affordable}
            onClick={() => act({ type: 'recruit', role, count })}
          >
            Recruit {valid ? count : 0} {count === 1 ? 'soldier' : 'soldiers'}
          </Button>
        </section>
        <section aria-label="Transfer soldiers">
          <h2>Transfer soldiers</h2>
          <p>Move existing soldiers between your two forces.</p>
          <div className="command-inputs">
            <label>
              Transfer direction
              <select value={from} onChange={(e) => setFrom(e.target.value as Role)}>
                <option value="offense">Offense to defense</option>
                <option value="defense">Defense to offense</option>
              </select>
            </label>
            <label>
              Soldiers to transfer
              <input
                type="number"
                min={1}
                max={game.troops[from]}
                value={transfer}
                onChange={(e) => setTransfer(Number(e.target.value))}
              />
            </label>
          </div>
          <p className="transfer-explanation">
            Gear stays in the source armory. Transferred soldiers arrive unarmed and unarmored.
          </p>
          {game.expedition && <p className="needs-gear">Extract before transferring soldiers.</p>}
          <Button
            variant="secondary"
            disabled={
              !game.buildings.armory ||
              !!game.expedition ||
              !Number.isInteger(transfer) ||
              transfer < 1 ||
              transfer > game.troops[from]
            }
            onClick={() => act({ type: 'assign', from, count: transfer })}
          >
            Transfer {Number.isInteger(transfer) && transfer > 0 ? transfer : 0}{' '}
            {transfer === 1 ? 'soldier' : 'soldiers'}
          </Button>
        </section>
      </div>
    </div>
  );
}
