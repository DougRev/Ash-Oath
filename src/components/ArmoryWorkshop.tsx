import { useState } from 'react';
import { ArrowRight, Shield, Sword, LockKeyhole } from 'lucide-react';
import { useGame } from '../game/context';
import { assignedWeapons, equipmentFor, format } from '../game/engine';
import { UNIT_WEAPONS, TIERS } from '../game/data';
import type { Role, UnitWeapon } from '../game/types';
import { Button } from './ui';
import { ForceSummary } from './ArmyManagement';

type Kit = UnitWeapon | 'armor';
const KITS = [
  ...UNIT_WEAPONS.map((w) => ({ ...w, id: w.id as Kit })),
  {
    id: 'armor' as Kit,
    name: 'Padded armor',
    level: 1,
    unitCost: 80,
    bonus: 4,
    description:
      '+4 garrison defense per soldier. Up to 20% fewer dungeon casualties at full coverage.',
  },
];
export function ArmoryWorkshop({ role, setRole }: { role: Role; setRole: (role: Role) => void }) {
  const { game } = useGame();
  const [kit, setKit] = useState<Kit>('militia');
  const gear = equipmentFor(game, role);
  return (
    <div className="armory-command">
      <div className="force-selector" aria-label="Choose force">
        {(['offense', 'defense'] as const).map((r) => (
          <button key={r} aria-pressed={role === r} onClick={() => setRole(r)}>
            {r === 'offense' ? 'Offense' : 'Defense'} <span>{game.troops[r]} soldiers</span>
          </button>
        ))}
      </div>
      <ForceSummary role={role} compact />
      <div className="armory-layout">
        <section className="kit-catalog" aria-label="Equipment catalog">
          <h2>Equipment</h2>
          <p>Choose a kit to manage.</p>
          <div className="kit-columns">
            <span>Kit</span>
            <span>Equipped</span>
            <span>Stored</span>
            <span>Gold / kit</span>
          </div>
          {KITS.map((w) => {
            const owned = w.id === 'armor' ? gear.armorOwned : (gear.weapons[w.id] ?? 0);
            const equipped =
              w.id === 'armor' ? gear.armorEquipped : (assignedWeapons(game, role)[w.id] ?? 0);
            const Icon = w.id === 'armor' ? Shield : Sword;
            return (
              <button
                key={w.id}
                className="kit-choice"
                aria-label={`Manage ${w.name}`}
                aria-pressed={kit === w.id}
                onClick={() => setKit(w.id)}
              >
                <span className="kit-name">
                  <Icon size={23} />
                  <span>
                    {w.name}
                    {game.level < w.level && (
                      <small>
                        <LockKeyhole size={12} />
                        {TIERS[w.level].name} required
                      </small>
                    )}
                  </span>
                </span>
                <strong>{equipped}</strong>
                <span>{owned - equipped}</span>
                <span>{w.unitCost}</span>
              </button>
            );
          })}
        </section>
        <KitInspector key={`${role}-${kit}`} role={role} kit={kit} />
      </div>
      <p className="armory-footnote">
        Fallen soldiers lose equipped weapons and armor. Stored kits and reserves remain safe.
      </p>
    </div>
  );
}
function KitInspector({ role, kit }: { role: Role; kit: Kit }) {
  const { game, act, navigate } = useGame();
  const w = KITS.find((w) => w.id === kit)!;
  const armor = kit === 'armor';
  const gear = equipmentFor(game, role);
  const equipped = armor ? gear.armorEquipped : (assignedWeapons(game, role)[kit] ?? 0);
  const owned = armor ? gear.armorOwned : (gear.weapons[kit] ?? 0);
  const stored = owned - equipped;
  const [mode, setMode] = useState<'equip' | 'buy' | 'store'>(stored > 0 ? 'equip' : 'buy');
  const [quantity, setQuantity] = useState(1);
  const [buyEquip, setBuyEquip] = useState(true);
  const valid = Number.isInteger(quantity) && quantity > 0 && quantity <= 1000;
  const locked = role === 'offense' && !!game.expedition;
  const armed = Object.values(assignedWeapons(game, role)).reduce((a, n) => a + n, 0);
  const gap = game.troops[role] - (armor ? equipped : armed);
  const maxEquip = Math.min(stored, game.troops[role] - equipped);
  const maxBuy = Math.max(
    0,
    Math.min(
      1000 - owned,
      Math.floor(game.gold / w.unitCost),
      buyEquip ? game.troops[role] - equipped : 1000,
    ),
  );
  const maximum = mode === 'equip' ? maxEquip : mode === 'store' ? equipped : maxBuy;
  const equipping = mode === 'equip' || (mode === 'buy' && buyEquip);
  const replace = equipping && !armor && valid ? Math.max(0, quantity - gap) : 0;
  const nextEquipped =
    equipped + (valid ? (mode === 'store' ? -quantity : equipping ? quantity : 0) : 0);
  const error = !valid
    ? 'Enter a whole quantity from 1 to 1,000.'
    : mode === 'buy' && !game.buildings.blacksmith
      ? 'Build the Blacksmith to buy gear.'
      : mode === 'buy' && game.level < w.level
        ? `Reach ${TIERS[w.level].name} to purchase this kit.`
        : (mode !== 'buy' || buyEquip) && locked
          ? 'Extract before changing offensive equipment.'
          : quantity > maximum
            ? mode === 'equip'
              ? 'Not enough stored kits or soldiers.'
              : mode === 'store'
                ? 'Not that many kits are equipped.'
                : game.gold < quantity * w.unitCost
                  ? 'Not enough gold for this order.'
                  : buyEquip && equipped + quantity > game.troops[role]
                    ? 'Not enough soldiers for this order.'
                    : 'This order exceeds storage capacity.'
            : '';
  const shortfall = mode === 'buy' ? Math.max(0, gap - stored) : Math.min(gap, stored);
  return (
    <section className="kit-inspector" aria-label="Manage selected equipment">
      <h2>{w.name}</h2>
      <p>{armor ? w.description : `${4 + w.bonus} strength per soldier. ${w.description}`}</p>
      <div className="kit-stock">
        <span>
          Owned<strong>{owned}</strong>
        </span>
        <span>
          Equipped<strong>{equipped}</strong>
        </span>
        <span>
          Stored<strong>{stored}</strong>
        </span>
      </div>
      <div className="kit-modes" aria-label="Equipment action">
        {(['equip', 'buy', 'store'] as const).map((m) => (
          <button
            key={m}
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              setQuantity(1);
            }}
          >
            {m === 'equip' ? 'Equip stored' : m === 'buy' ? 'Buy gear' : 'Store gear'}
          </button>
        ))}
      </div>
      <label className="kit-quantity">
        {mode === 'equip'
          ? 'Soldiers to equip'
          : mode === 'buy'
            ? 'Kits to purchase'
            : 'Kits to store'}
        <input
          type="number"
          min={1}
          max={1000}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </label>
      {mode === 'buy' && (
        <label className="buy-destination">
          After purchase
          <select
            value={buyEquip ? 'equip' : 'storage'}
            onChange={(e) => setBuyEquip(e.target.value === 'equip')}
          >
            <option value="equip">Equip these soldiers now</option>
            <option value="storage">Keep kits in storage</option>
          </select>
        </label>
      )}
      <div className="command-presets">
        {mode !== 'store' && (
          <button disabled={!shortfall} onClick={() => setQuantity(shortfall)}>
            Fill {armor ? 'armor' : 'weapon'} gap ({shortfall})
          </button>
        )}
        <button disabled={!maximum} onClick={() => setQuantity(maximum)}>
          {mode === 'buy' ? 'Max affordable' : 'Maximum'} ({maximum})
        </button>
      </div>
      <div className="kit-review" role="status">
        <small>Order review</small>
        {!error ? (
          <>
            <h3>
              {equipped}
              <ArrowRight size={17} />
              {nextEquipped} {armor ? 'armor kits' : w.name.toLowerCase()} equipped
            </h3>
            <p>
              {mode === 'store'
                ? `${quantity} kit${quantity === 1 ? ' returns' : 's return'} to storage. ${quantity} soldier${quantity === 1 ? ' loses' : 's lose'} this equipment.`
                : mode === 'buy' && !buyEquip
                  ? `${quantity} kit${quantity === 1 ? ' goes' : 's go'} to storage. Your loadout stays the same.`
                  : replace
                    ? `${quantity - replace} unarmed soldiers receive weapons. ${replace} other weapons return to storage, starting with the weakest.`
                    : `${quantity} soldier${quantity === 1 ? ' receives' : 's receive'} ${armor ? 'armor' : 'weapons'}. No kits replaced.`}
            </p>
          </>
        ) : (
          <p>{error}</p>
        )}
        <Button
          disabled={!!error}
          onClick={() =>
            mode === 'buy'
              ? act({ type: 'buyKit', role, kit, count: quantity, equip: buyEquip })
              : act({ type: 'equipKit', role, kit, count: nextEquipped })
          }
        >
          {mode === 'buy'
            ? `${buyEquip ? 'Buy & equip' : 'Buy to storage'} · ${format(valid ? quantity * w.unitCost : 0)} gold`
            : mode === 'equip'
              ? `Equip ${valid ? quantity : 0} stored · Free`
              : `Store ${valid ? quantity : 0} kit${quantity === 1 ? '' : 's'} · Free`}
        </Button>
      </div>
      {!game.buildings.blacksmith && (
        <Button variant="ghost" onClick={() => navigate('settlement')}>
          Visit settlement to build Blacksmith
        </Button>
      )}
      <p className="inspector-note">
        {mode === 'equip'
          ? 'Stored gear is free to equip. Use Buy gear when you need more.'
          : mode === 'buy'
            ? `${w.unitCost} gold per kit. Replaced gear stays owned; you never pay to reuse it.`
            : 'Stored gear provides no combat power until equipped again.'}
        {armor ? ' Armor covers your strongest soldiers first.' : ''}
      </p>
    </section>
  );
}
