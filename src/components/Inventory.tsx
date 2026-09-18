import { companionBonus, abilityBonus, petXpFor } from '../game/companions';
import { useState } from 'react';

import { Check, Coins, Gem, Shield, Sword, X } from 'lucide-react';

import { useGame } from '../game/context';

import { Button, EmptyState, ItemTile } from './ui';

import {
  armorSetProgress,
  companionLevel,
  equipmentSlot,
  runeDiscovered,
} from '../game/engine';

import type { ItemKind } from '../game/types';

export function Inventory({ trading = false }: { trading?: boolean }) {
  const { game, act } = useGame();

  const [filter, setFilter] = useState<ItemKind | 'all' | 'equipped'>('all');

  const items = game.inventory.filter(
    (i) =>
      filter === 'all' ||
      (filter === 'equipped' ? game.equipped.includes(i.id) : i.kind === filter),
  );

  const tabs = [
    { id: 'all', label: 'All items' },

    { id: 'weapon', label: 'Weapons' },

    { id: 'armor', label: 'Armor' },

    { id: 'rune', label: 'Runes' },

    { id: 'pet', label: 'Companions' },

    { id: 'equipped', label: 'Equipped' },
  ] as const;

  return (
    <section className="inventory-section">
      <div className="section-heading">
        <h2>{trading ? 'Your inventory' : 'Your equipment & discoveries'}</h2>

        <span className="subtle-label">{game.inventory.length} ITEMS</span>
      </div>

      <div className="filter-tabs" aria-label="Filter inventory">
        {tabs
          .filter((t) => t.id !== 'rune' || runeDiscovered(game))
          .map((t) => (
            <button
              key={t.id}

              aria-pressed={filter === t.id}

              className={filter === t.id ? 'selected' : ''}

              onClick={() => setFilter(t.id)}
            >
              {t.label}
            </button>
          ))}
      </div>

      {game.expedition ? (
        <p className="inventory-lock">
          Your loadout is locked while you’re on an expedition. Extract to change equipment.
        </p>
      ) : null}

      {items.length ? (
        <div className="inventory-grid">
          {items.map((item) => {
            const equipped = game.equipped.includes(item.id);

            const current = game.inventory.find(
              (i) =>
                game.equipped.includes(i.id) &&
                (equipmentSlot(item)
                  ? equipmentSlot(i) === equipmentSlot(item)
                  : i.kind === item.kind),
            );

            const isRuneFull =
              item.kind === 'rune' &&
              game.inventory.filter((i) => i.kind === 'rune' && game.equipped.includes(i.id))
                .length >= 2;

            return (
              <ItemTile
                key={item.id}

                item={item}

                equipped={equipped}

                comparison={
                  !equipped && current && item.kind !== 'pet'
                    ? item.power - current.power
                    : undefined
                }

                action={
                  <>
                    {item.kind === 'pet' && (
                      <div className="companion-details">
                        <strong>Bond level {companionLevel(item)} / 500</strong>
                        <progress
                          aria-label="Companion level progress"
                          value={(item.xp ?? 0) - petXpFor(companionLevel(item))}
                          max={
                            companionLevel(item) === 500
                              ? 1
                              : petXpFor(companionLevel(item) + 1) - petXpFor(companionLevel(item))
                          }
                        />
                        <small>
                          {item.xp ?? 0} / {petXpFor(Math.min(500, companionLevel(item) + 1))} XP ·
                          +{companionBonus(item)}% strength and dungeon casualty reduction while
                          healthy.
                        </small>
                        <small>
                          +20 XP per victory, +40 per boss. Defeat grants 5 XP. A defeated companion
                          escapes injured for 30 minutes; it never dies.
                        </small>
                        <small>
                          Innate quality: +{((item.quality ?? 0) / 100).toFixed(2)}%. Each bond
                          level adds 0.02% strength and protection.
                        </small>
                        <small>
                          <strong>{item.ability ?? 'guardian'}</strong>: +
                          {(abilityBonus(item) * 100).toFixed(2)}%{' '}
                          {item.ability === 'ferocity'
                            ? 'army attack'
                            : item.ability === 'scavenger'
                              ? 'dungeon gold'
                              : 'additional dungeon casualty reduction'}
                          . Passive while healthy; grows by 0.004% per level.
                        </small>
                        {(item.injuredUntil ?? 0) > Date.now() && (
                          <>
                            <small>
                              Recovering until {new Date(item.injuredUntil!).toLocaleTimeString()}
                            </small>
                            <Button
                              variant="secondary"
                              disabled={!!game.expedition || game.gold < 120}
                              onClick={() => act({ type: 'healPet', id: item.id })}
                            >
                              Treat injury · 120 gold
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    <Button
                      variant="secondary"

                      disabled={!!game.expedition || (!equipped && isRuneFull)}

                      onClick={() => act({ type: equipped ? 'unequip' : 'equip', id: item.id })}
                    >
                      {equipped ? (
                        <>
                          <X size={12} />
                          Unequip
                        </>
                      ) : isRuneFull ? (
                        'Rune slots full'
                      ) : (
                        <>
                          <Check size={13} />
                          Equip
                        </>
                      )}
                    </Button>

                    {trading ? (
                      <Button
                        variant="ghost"

                        disabled={equipped || !game.buildings.trader}

                        onClick={() => act({ type: 'sell', id: item.id })}

                        aria-label={`Sell ${item.name} for ${item.value} gold`}
                      >
                        <Coins size={13} />

                        {item.value}
                      </Button>
                    ) : null}
                  </>
                }
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="gem"

          title={
            filter === 'rune'
              ? 'Ancient power awaits.'
              : filter === 'pet'
                ? 'A companion is out there.'
                : 'Your next discovery awaits.'
          }
        >
          {filter === 'rune'
            ? 'Runes rarely drop in dungeons. Equip up to two for a bonus to your army and character.'
            : filter === 'pet'
              ? 'Rare creatures can join you after dungeon victories. Harder areas improve your chances.'
              : 'Venture into a dungeon or open a chest to discover new equipment.'}
        </EmptyState>
      )}
    </section>
  );
}

export function LoadoutSummary() {
  const { game } = useGame();

  const slots = [
    { id: 'weapon', kind: 'weapon', label: 'Weapon', icon: Sword },
    { id: 'helm', kind: 'armor', label: 'Helm', icon: Shield },
    { id: 'chest', kind: 'armor', label: 'Chest', icon: Shield },
    { id: 'greaves', kind: 'armor', label: 'Greaves', icon: Shield },
    { id: 'boots', kind: 'armor', label: 'Boots', icon: Shield },
    { id: 'shield', kind: 'armor', label: 'Shield', icon: Shield },
    { id: 'rune', kind: 'rune', label: 'Runes', icon: Gem },
  ] as const;
  const sets = armorSetProgress(game);

  return (
    <>
      <div className="loadout-summary">
        {slots
          .filter((slot) => slot.kind !== 'rune' || runeDiscovered(game))
          .map((slot) => {
            const equipped = game.inventory.filter(
              (i) =>
                game.equipped.includes(i.id) &&
                (slot.kind === 'rune'
                  ? i.kind === 'rune'
                  : equipmentSlot(i) === slot.id),
            );

            const Icon = slot.icon;

            return (
              <div key={slot.id}>
                <Icon size={23} />

                <span>
                  <small>{slot.label}</small>

                  <strong>{equipped.map((i) => i.name).join(' + ') || 'Empty slot'}</strong>
                </span>
              </div>
            );
          })}
      </div>
      <section className="armor-set-progress" aria-label="Armor set bonuses">
        <div className="section-heading">
          <div>
            <h2>Armor sets</h2>
            <p>Collect matching pieces from their home dungeon to activate permanent loadout bonuses.</p>
          </div>
        </div>
        <div className="armor-set-grid">
          {sets.map((set) => (
            <article key={set.id}>
              <span>{set.count} / 5 equipped</span>
              <h3>{set.name}</h3>
              <small>{set.dungeon === 0 ? 'Whispering Woods' : set.dungeon === 1 ? 'Hollowcrypt' : 'Ember Citadel'}</small>
              <ul>
                {set.bonuses.map((bonus) => (
                  <li className={set.count >= bonus.pieces ? 'active' : ''} key={bonus.pieces}>
                    <strong>{bonus.pieces} pieces</strong> {bonus.text}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
