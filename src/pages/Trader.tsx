import { ArrowRight, Coins, PackageOpen, ShieldCheck, Store } from 'lucide-react';
import { useGame } from '../game/context';
import { CHESTS, RARITIES } from '../game/data';
import { Button, Gold, PageIntro } from '../components/ui';
import { Inventory } from '../components/Inventory';

export function Trader() {
  const { game, act, navigate } = useGame();
  return (
    <>
      <PageIntro
        title="Fortune favors the curious."
        description="The road brings unusual things. Trade your gold for a little possibility."
        action={
          <span className="trader-wallet">
            <Coins size={17} />
            Earned gold only
          </span>
        }
      />
      <section className="trader-welcome panel">
        <span className="trader-portrait">
          <Store size={38} strokeWidth={1.1} />
        </span>
        <div>
          <h2>“Something for the journey?”</h2>
          <p>
            Take your time, wanderer. Every chest has a story. And I pay fair gold for the things
            you no longer need.
          </p>
          <span>ORREN · TRAVELING MERCHANT</span>
        </div>
      </section>
      {!game.buildings.trader ? (
        <div className="unlock-banner">
          <PackageOpen size={28} />
          <div>
            <h3>A merchant needs a place to set up shop.</h3>
            <p>
              {game.level < 1
                ? 'Reach Settlement tier, then build your Trading Post for 250 gold.'
                : 'Your settlement is ready for a Trading Post. Build it for 250 gold.'}
            </p>
          </div>
          <Button
            onClick={() =>
              game.level >= 1 ? act({ type: 'build', building: 'trader' }) : navigate('settlement')
            }
            disabled={game.level >= 1 && game.gold < 250}
          >
            {game.level >= 1 ? 'Build Trading Post' : 'Visit settlement'}
            {game.level >= 1 ? <Gold amount={250} /> : <ArrowRight size={15} />}
          </Button>
        </div>
      ) : null}
      <div className="chest-grid">
        {CHESTS.map((chest, i) => (
          <article className={`chest-card panel chest-tier-${i}`} key={chest.name}>
            <div className="chest-art">
              <img src="/art/chest.webp" alt={`An ornate oak and gold ${chest.name}`} />
              <span className="chest-tier-label">
                {['THE OPEN ROAD', 'THE FIELD OF BATTLE', 'THE STUFF OF LEGENDS'][i]}
              </span>
            </div>
            <div className="chest-card-copy">
              <h2>{chest.name}</h2>
              <p>{chest.text}</p>
              <dl className="chest-odds" aria-label={`${chest.name} rarity chances`}>
                {RARITIES.map((rarity, j) => (
                  <div key={rarity}>
                    <dt>{rarity}</dt>
                    <dd>{Number((chest.odds[j] * 100).toFixed(2))}%</dd>
                  </div>
                ))}
              </dl>

              <Button
                className="full-width"
                disabled={!game.buildings.trader || game.gold < chest.cost}
                onClick={() => act({ type: 'chest', tier: i })}
              >
                Open chest
                <Gold amount={chest.cost} />
              </Button>
            </div>
          </article>
        ))}
      </div>
      <div className="fair-loot-note">
        <ShieldCheck size={18} />
        <span>
          Base odds per opening. After 9 chests without epic or legendary loot, the next gives at
          least epic. Progress is shared across chest tiers.
        </span>
        <small>
          {game.chestsOpened} opened · {game.pity}/9 toward guarantee
        </small>
      </div>
      <Inventory trading />
    </>
  );
}
