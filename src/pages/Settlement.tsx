import { barracksCapacity } from '../game/progression';
import {
  ArrowRight,
  Castle,
  Check,
  Coins,
  Hammer,
  LockKeyhole,
  Shield,
  Store,
  Swords,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useGame } from '../game/context';
import { BUILDINGS, TIERS } from '../game/data';
import { format, stats } from '../game/engine';
import { Button, Gold, Note, PageIntro } from '../components/ui';
import { realmImage, RealmProgress } from './Overview';

const buildingIcons = {
  armory: Swords,
  blacksmith: Hammer,
  trader: Store,
  watchtower: Shield,
  bank: LockKeyhole,
};
export function Settlement() {
  const { game, act, navigate } = useGame();
  const tier = TIERS[game.level];
  const next = TIERS[game.level + 1];
  const st = stats(game);
  return (
    <>
      <PageIntro
        title="Give your people a place to belong."
        description="From a quiet hearth to a kingdom. Every stone is part of your story."
      />
      <div className="settlement-layout">
        <section className="realm-scene settlement-scene">
          <img
            src={realmImage(game.level)}
            alt={`Your ${tier.name.toLowerCase()} overlooks the valley`}
          />
          <div className="map-pins">
            {BUILDINGS.filter((b) => game.buildings[b.id] && b.id !== 'bank').map((b, i) => {
              const Icon = buildingIcons[b.id];
              return (
                <button
                  key={b.id}
                  className={`map-pin pin-${i}`}
                  title={b.name}
                  onClick={() =>
                    navigate(
                      b.id === 'trader'
                        ? 'trader'
                        : b.id === 'watchtower' || b.id === 'bank'
                          ? 'war'
                          : 'army',
                    )
                  }
                >
                  <Icon size={19} />
                  <span>{b.name}</span>
                </button>
              );
            })}
          </div>
          <div className="realm-caption">
            <span className="letter-label">YOUR DOMAIN · LEVEL {game.level + 1}</span>
            <h2>{tier.name}</h2>
            <p>{tier.description}</p>
          </div>
          <RealmProgress level={game.level} />
        </section>
        <section className="upgrade-panel panel">
          <span className="panel-icon">
            <Castle size={31} strokeWidth={1.2} />
          </span>
          <span className="letter-label">THE NEXT CHAPTER</span>
          <h2>{next ? `A ${next.name.toLowerCase()} awaits.` : 'A citadel for the ages.'}</h2>
          <p>
            {next?.description ??
              'Your home has reached its greatest form. Now build a legacy beyond its walls.'}
          </p>
          <div className="upgrade-benefits">
            <div>
              <Coins size={18} />
              <span>Gold / 5 minutes</span>
              <strong>
                {format(st.income)}
                <ArrowRight size={12} />
                {next
                  ? format(Math.floor(next.income * (game.faction === 'verdant' ? 1.05 : 1)))
                  : format(st.income)}
              </strong>
            </div>
            <div>
              <Users size={18} />
              <span>Troop capacity</span>
              <strong>
                {barracksCapacity(game, tier.capacity)}
                <ArrowRight size={12} />
                {barracksCapacity(game, next?.capacity ?? tier.capacity)}
              </strong>
            </div>
            <div>
              <TrendingUp size={18} />
              <span>New opportunities</span>
              <strong>
                {game.level === 0
                  ? 'Blacksmith & trader'
                  : game.level === 1
                    ? 'Longbows & expeditions'
                    : game.level === 2
                      ? 'Royal halberds'
                      : 'Income & troop capacity'}
              </strong>
            </div>
          </div>
          {next && (
            <p className="settlement-value">
              +
              {format(
                (Math.floor(next.income * (game.faction === 'verdant' ? 1.05 : 1)) - st.income) *
                  12,
              )}{' '}
              gold per hour. Upgrade cost recovered in about{' '}
              {(
                next.cost /
                ((Math.floor(next.income * (game.faction === 'verdant' ? 1.05 : 1)) - st.income) *
                  12)
              ).toFixed(1)}{' '}
              hours of collected tribute alone.
            </p>
          )}
          {next ? (
            <>
              <Button
                className="full-width"
                disabled={game.gold < next.cost}
                onClick={() => act({ type: 'upgrade' })}
              >
                Upgrade to {next.name}
                <Gold amount={next.cost} />
              </Button>
              <small className="center-muted">
                {game.gold < next.cost
                  ? `${format(next.cost - game.gold)} more gold needed`
                  : 'Instant construction · Permanent income increase'}
              </small>
            </>
          ) : (
            <Button onClick={() => navigate('war')}>
              Leave your mark
              <ArrowRight size={16} />
            </Button>
          )}
        </section>
      </div>
      <div className="section-heading buildings-heading">
        <h2>The foundations of a realm</h2>
        <span className="subtle-label">
          {Object.values(game.buildings).filter(Boolean).length} / {BUILDINGS.length} BUILT
        </span>
      </div>
      <div className="building-grid">
        {BUILDINGS.map((b) => {
          const Icon = buildingIcons[b.id];
          const built = game.buildings[b.id];
          const locked = game.level < b.level;
          return (
            <article className={`building-card panel ${built ? 'is-built' : ''}`} key={b.id}>
              <div className="building-card-top">
                <span className="building-icon">
                  <Icon size={31} strokeWidth={1.15} />
                </span>
                <span className={built ? 'positive building-status' : 'building-status muted'}>
                  {built ? (
                    <>
                      <Check size={13} />
                      Operational
                    </>
                  ) : locked ? (
                    <>
                      <LockKeyhole size={12} />
                      {TIERS[b.level].name}
                    </>
                  ) : (
                    'Ready to build'
                  )}
                </span>
              </div>
              <h3>{b.name}</h3>
              <p>{b.description}</p>
              <div className="building-benefit">{b.benefit}</div>
              {built ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate(
                      b.id === 'trader'
                        ? 'trader'
                        : b.id === 'watchtower' || b.id === 'bank'
                          ? 'war'
                          : 'army',
                    )
                  }
                >
                  {b.id === 'watchtower' ? 'View your defenses' : 'Visit building'}
                  <ArrowRight size={14} />
                </Button>
              ) : (
                <Button
                  variant={locked ? 'secondary' : 'primary'}
                  disabled={locked || game.gold < b.cost}
                  onClick={() => act({ type: 'build', building: b.id })}
                >
                  {locked ? 'Expand to unlock' : 'Construct'}
                  {!locked ? <Gold amount={b.cost} /> : <LockKeyhole size={14} />}
                </Button>
              )}
            </article>
          );
        })}
      </div>
      <Note>
        Your people work while you’re away. Tribute arrives automatically every 5 minutes, for up to
        12 hours offline.
      </Note>
    </>
  );
}
