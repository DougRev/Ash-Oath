import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleArrowUp,
  Crown,
  Shield,
  Sparkles,
  Swords,
} from 'lucide-react';
import { useGame } from '../game/context';
import { FACTIONS, TIERS } from '../game/data';
import { format, stats } from '../game/engine';
import { Button, FactionIcon, PageIntro, TextLink } from '../components/ui';

export function realmImage(level: number) {
  return `/art/${level >= 3 ? 'stronghold' : level >= 1 ? 'village' : 'homestead'}.webp`;
}
export function RealmProgress({ level }: { level: number }) {
  return (
    <div className="realm-progress">
      {TIERS.map((tier, i) => (
        <div
          key={tier.name}
          className={`realm-step ${i <= level ? 'reached' : ''} ${i === level ? 'current' : ''}`}
        >
          <span>{i < level ? <Check size={9} /> : null}</span>
          <small>{i === 0 ? 'Home' : tier.name}</small>
        </div>
      ))}
    </div>
  );
}
export function Influence({ compact = false }: { compact?: boolean }) {
  const { game, online } = useGame();
  const total = FACTIONS.reduce(
    (sum, f) =>
      sum +
      (online
        ? (online.campaign?.scores[f.id] ?? 0)
        : f.score + (f.id === game.faction ? game.renown : 0)),
    0,
  );
  return (
    <div className={`influence-list ${compact ? 'compact' : ''}`}>
      {FACTIONS.map((f) => {
        const score = online
          ? (online.campaign?.scores[f.id] ?? 0)
          : f.score + (f.id === game.faction ? game.renown : 0);
        const pct = total ? Math.round((score / total) * 100) : 0;
        return (
          <div className="influence-row" key={f.id}>
            <span className="faction-symbol" style={{ color: f.color }}>
              <FactionIcon faction={f.id} size={23} />
            </span>
            <span className="faction-name">
              {f.name}
              {f.id === game.faction ? <small>Your faction</small> : null}
            </span>
            <div className="influence-track">
              <span style={{ width: `${pct}%`, background: f.color }} />
            </div>
            <span className="influence-percent">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
export function Overview() {
  const { game, navigate, open, online } = useGame();
  const st = stats(game);
  const tier = TIERS[game.level];
  const steps = [
    {
      title: 'Swear an oath',
      text: game.faction
        ? `Standing with the ${FACTIONS.find((f) => f.id === game.faction)!.name}.`
        : 'Choose a faction to stand beside.',
      cta: 'Choose a faction',
      done: !!game.faction,
      action: () => open('faction'),
    },
    {
      title: 'Raise your banners',
      text: game.buildings.armory
        ? 'Your armory is ready. A growing army awaits.'
        : 'Build an armory and recruit your first troops.',
      cta: 'Go to army & armory',
      done: game.buildings.armory,
      action: () => navigate('army'),
    },
    {
      title: 'Into the unknown',
      text: game.cleared[0]
        ? 'The woods remember your first victory.'
        : 'Complete a stage in the Whispering Woods.',
      cta: 'Enter the dungeons',
      done: game.cleared[0] > 0,
      action: () => navigate('dungeons'),
    },
  ];
  const allDone = steps.every((s) => s.done);
  return (
    <>
      <PageIntro
        title="Every kingdom begins with a home."
        description="Build your legacy. Choose your allegiance. Survive the Sundering."
      />
      <div className="overview-primary">
        <section className="realm-scene" aria-label="Your homestead">
          <img
            src={realmImage(game.level)}
            alt={
              game.level === 0
                ? 'Your timber cottage overlooking a misty mountain valley and a distant castle'
                : 'Your growing medieval realm in a mountain valley'
            }
            fetchPriority="high"
          />
          <button className="explore-link" onClick={() => navigate('settlement')}>
            <span>Explore your realm</span>
            <span className="circle-arrow">
              <ArrowRight size={19} />
            </span>
          </button>
          <div className="realm-caption">
            <span className="letter-label">YOUR {tier.name.toUpperCase()}</span>
            <h2>{tier.story}</h2>
            <p>
              Level {game.level + 1}
              <span>·</span>+{format(st.income)} gold every 5 minutes
            </p>
            <Button onClick={() => navigate('settlement')}>
              {game.level < 5 ? 'Expand your settlement' : 'Manage your citadel'}
              <ArrowRight size={16} />
            </Button>
          </div>
          <RealmProgress level={game.level} />
        </section>
        <section className="chapter-panel panel">
          <h2>{allDone ? 'Your legend continues' : 'Your next chapter'}</h2>
          <div className="chapter-steps">
            {steps.map((step, i) => (
              <div className={`chapter-step ${step.done ? 'complete' : ''}`} key={step.title}>
                <span className="step-number">{step.done ? <Check size={18} /> : `0${i + 1}`}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  {!step.done ? (
                    <TextLink onClick={step.action}>{step.cta}</TextLink>
                  ) : (
                    <span className="step-complete">Chapter complete</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {allDone ? (
            <TextLink onClick={() => navigate('war')}>Leave your mark on the war</TextLink>
          ) : (
            <p className="chapter-quote">Greatness begins with a single oath.</p>
          )}
        </section>
      </div>
      <section className="stats-band" aria-label="Realm strength">
        <div>
          <Swords />
          <span>
            <strong>{format(st.attack)}</strong>
            <small>Army attack</small>
          </span>
          <span className="stat-context">{game.troops.offense} attackers</span>
        </div>
        <div>
          <Shield />
          <span>
            <strong>{format(st.defense)}</strong>
            <small>Realm defense</small>
          </span>
          <span className="stat-context">{game.troops.defense} defenders</span>
        </div>
        <div>
          <Sparkles />
          <span>
            <strong>{format(game.renown)}</strong>
            <small>Season renown</small>
          </span>
          <span className="stat-context">{game.wins} victories</span>
        </div>
      </section>
      <div className="overview-secondary">
        <section className="beyond-panel panel">
          <div className="section-heading">
            <h2>Beyond your borders</h2>
            <span className="subtle-label">DUNGEON EXPEDITIONS</span>
          </div>
          <div className="dungeon-preview">
            <button
              className="dungeon-preview-image"
              onClick={() => navigate('dungeons')}
              aria-label="Explore Whispering Woods"
            >
              <img src="/art/dungeon.webp" alt="An ancient archway deep in the Whispering Woods" />
            </button>
            <div className="dungeon-preview-copy">
              <h3>Whispering Woods</h3>
              <p>A forgotten path. An uneasy silence.</p>
              <span className="stage-label">Stage {Math.min(5, game.cleared[0] + 1)} of 5</span>
              <span className="positive odds-label">
                <span className="status-dot" />
                {game.cleared[0] === 5
                  ? 'Area conquered'
                  : st.attack >= [55, 85, 120, 165, 220][Math.min(game.cleared[0], 4)]
                    ? 'Favorable odds'
                    : 'A worthy challenge'}
              </span>
              <Button onClick={() => navigate('dungeons')}>
                Enter dungeon<span className="button-cost">5 AP</span>
                <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        </section>
        <section className="war-preview panel">
          <div className="section-heading">
            <h2>The war never sleeps</h2>
            <Crown size={17} />
          </div>
          <Influence compact />
          <div className="war-preview-footer">
            <span className="simulation-label">
              {online ? 'Live campaign standings' : 'Simulated standings'}
            </span>
            <TextLink onClick={() => navigate('war')}>Open the war room</TextLink>
          </div>
        </section>
      </div>
      <section className="activity-strip">
        <span className="activity-strip-title">
          <CircleArrowUp size={17} />
          Your story is unfolding.
        </span>
        <span className="subtle-label">LATEST REALM ACTIVITY</span>
        <p>{game.activity[0].text}</p>
        <button onClick={() => open('activity')}>
          View all
          <ChevronRight size={14} />
        </button>
      </section>
    </>
  );
}
