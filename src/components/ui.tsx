import { companionBonus, petPortrait } from '../game/companions';
import { useContext, useEffect, useId, useRef } from 'react';
import { GameContext } from '../game/context';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import {
  ArrowRight,
  Check,
  Coins,
  Crown,
  Flame,
  Gem,
  Leaf,
  PawPrint,
  Shield,
  Sparkles,
  Sword,
  Swords,
  Waves,
  X,
  Zap,
} from 'lucide-react';
import type { FactionId, Item } from '../game/types';
import { format } from '../game/engine';

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  const game = useContext(GameContext);
  return (
    <button
      className={`button button-${variant} ${className}`}
      {...props}
      disabled={props.disabled || game?.busy}
    >
      {children}
    </button>
  );
}
export function Gold({ amount }: { amount: number }) {
  return (
    <span className="inline-resource">
      <Coins size={15} />
      {format(amount)}
    </span>
  );
}
export function AP({ amount }: { amount: number }) {
  return (
    <span className="inline-resource">
      <Zap size={14} />
      {amount} AP
    </span>
  );
}
export function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowRight size={15} />
    </button>
  );
}
export function PageIntro({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function FactionIcon({ faction, size = 24 }: { faction: FactionId | null; size?: number }) {
  const Icon =
    faction === 'iron'
      ? Shield
      : faction === 'verdant'
        ? Leaf
        : faction === 'ashen'
          ? Flame
          : faction === 'tide'
            ? Waves
            : Crown;
  return <Icon size={size} strokeWidth={1.4} />;
}
export function ItemIcon({ item, size = 34 }: { item: Pick<Item, 'kind'>; size?: number }) {
  const Icon =
    item.kind === 'weapon'
      ? Sword
      : item.kind === 'armor'
        ? Shield
        : item.kind === 'rune'
          ? Gem
          : PawPrint;
  return <Icon size={size} strokeWidth={1.25} />;
}
export function ItemTile({
  item,
  equipped,
  action,
  comparison,
  current,
}: {
  item: Item;
  equipped?: boolean;
  action?: ReactNode;
  comparison?: number;
  current?: Item[];
}) {
  const stat =
    item.kind === 'weapon'
      ? 'hero attack'
      : item.kind === 'armor'
        ? 'hero defense'
        : item.kind === 'rune'
          ? '% all strength'
          : '% all strength';
  return (
    <article className={`item-tile rarity-${item.rarity}`}>
      <div className="item-tile-top">
        <span className="rarity-label">{item.rarity}</span>
        {equipped ? (
          <span className="equipped-tag">
            <Check size={12} />
            Equipped
          </span>
        ) : null}
      </div>
      <div className="item-art">
        <>
          {item.kind === 'pet' ? (
            <img
              className="companion-portrait"
              src={petPortrait(item)}
              alt={item.name}
              loading="lazy"
            />
          ) : (
            <ItemIcon item={item} />
          )}
        </>
      </div>
      <h3>{item.name}</h3>
      <p>
        +
        {item.kind === 'pet'
          ? (item.injuredUntil ?? 0) > Date.now()
            ? 0
            : companionBonus(item)
          : item.power}
        {stat.startsWith('%') ? stat : ` ${stat}`}
      </p>
      {comparison !== undefined ? (
        <span className={comparison > 0 ? 'positive item-compare' : 'muted item-compare'}>
          {comparison > 0 ? '+' : ''}
          {comparison} vs. equipped
        </span>
      ) : null}
      {current && !equipped && (
        <div className="loot-current">
          <small>Currently equipped</small>
          {current.length ? (
            current.map((old) => (
              <p key={old.id}>
                {old.name}: +{old.kind === 'pet' ? companionBonus(old) : old.power}
                {old.kind === 'pet' || old.kind === 'rune' ? '%' : ''}
                {old.kind === 'pet' ? ` · ${old.ability ?? 'guardian'}` : ''}
              </p>
            ))
          ) : (
            <p>Empty slot</p>
          )}
          {item.kind === 'pet' && <p>New ability: {item.ability ?? 'guardian'}</p>}
          {item.kind === 'rune' && current.length >= 2 && (
            <small>Both rune slots are full. Unequip a rune in your inventory first.</small>
          )}
        </div>
      )}
      {action ? <div className="item-actions">{action}</div> : null}
    </article>
  );
}
export function EmptyState({
  icon = 'swords',
  title,
  children,
}: {
  icon?: 'swords' | 'gem';
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon === 'gem' ? <Gem size={30} /> : <Swords size={30} />}
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      aria-labelledby={id}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const box = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-heading">
        <h2 id={id}>{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="note">
      <Sparkles size={16} />
      <span>{children}</span>
    </div>
  );
}
