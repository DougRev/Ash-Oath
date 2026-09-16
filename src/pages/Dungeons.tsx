import { useState } from 'react';

import {
  ArrowRight,
  Backpack,
  Check,
  ChevronRight,
  Coins,
  Crown,
  DoorOpen,
  LockKeyhole,
  ShieldAlert,
  Skull,
  Swords,
  UserRound,
} from 'lucide-react';

import { useGame } from '../game/context';

import { DUNGEONS, TACTICS, enemyStyle } from '../game/data';

import {
  availableDungeon,
  format,
  dungeonForecast,
  stageAvailable,
  winChance,
} from '../game/engine';

import { AP, Button, Note, PageIntro } from '../components/ui';

import type { Tactic } from '../game/types';

export function TacticPicker({
  tactic,

  setTactic,
  pvp = false,
}: {
  tactic: Tactic;
  pvp?: boolean;

  setTactic: (t: Tactic) => void;
}) {
  return (
    <div className="tactic-picker">
      <label>Battle formation</label>

      <div>
        {TACTICS.map((t) => (
          <button
            key={t.id}

            aria-pressed={t.id === tactic}

            className={t.id === tactic ? 'selected' : ''}

            onClick={() => setTactic(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>

      <small>
        {pvp
          ? tactic === 'aggressive'
            ? '+15% strength · up to 20% losses on defeat'
            : tactic === 'guarded'
              ? '−10% strength · up to 5% losses on defeat'
              : 'Full strength · up to 10% losses on defeat'
          : TACTICS.find((t) => t.id === tactic)!.description}
      </small>
    </div>
  );
}

export function Forecast({ power, enemy }: { power: number; enemy: number }) {
  const chance = Math.round(winChance(power, enemy) * 100);

  return (
    <div className="forecast">
      <div className="forecast-title">
        <span>Battle forecast</span>

        <strong className={chance >= 70 ? 'positive' : chance >= 35 ? 'gold-text' : 'danger-text'}>
          {chance >= 70 ? 'Favorable' : chance >= 35 ? 'Contested' : 'Dangerous'} · {chance}%
        </strong>
      </div>

      <div className="forecast-strength">
        <span>
          <Swords size={15} />

          {format(power)}

          <small>Your strength</small>
        </span>

        <span className="versus">VS</span>

        <span>
          {format(enemy)}

          <ShieldAlert size={15} />

          <small>Enemy strength</small>
        </span>
      </div>

      <div className="forecast-track">
        <span style={{ width: `${Math.min(98, Math.max(2, (power / (power + enemy)) * 100))}%` }} />
      </div>

      <small className="forecast-range">
        Your roll: {format(power * 0.85)}–{format(power * 1.15)} strength · ±15% variance
      </small>
    </div>
  );
}

export function Dungeons() {
  const { game, act, open } = useGame();

  const [selected, setSelected] = useState(game.expedition?.dungeon ?? 0);

  const [selectedStage, setSelectedStage] = useState(Math.min(5, game.cleared[selected] + 1));

  const [chosenMode, setMode] = useState<'army' | 'personal'>(
    game.expedition ? 'personal' : 'army',
  );

  const [tactic, setTactic] = useState<Tactic>('balanced');

  const [partySize, setPartySize] = useState(game.troops.offense);

  const [acknowledged, setAcknowledged] = useState(false);

  const area = game.expedition?.dungeon ?? selected;

  const d = DUNGEONS[area];

  const stage = game.expedition ? Math.min(5, game.expedition.nextStage) : selectedStage;

  const mode = game.expedition ? 'personal' : chosenMode;

  const cost = mode === 'personal' ? 7 : 5;

  const troops = game.expedition?.troops ?? Math.min(game.troops.offense, Math.max(1, partySize));

  const forecast = dungeonForecast(game, mode, tactic, area, stage, troops);

  const power = forecast.power;

  const style = enemyStyle(area, stage);

  const atExit = !!game.expedition && game.expedition.nextStage > 5;

  const locked = !availableDungeon(game, area);

  const canFight =
    !locked &&
    !atExit &&
    stageAvailable(game, area, stage) &&
    game.ap >= cost &&
    (mode !== 'personal' || acknowledged || !!game.expedition) &&
    troops > 0;

  async function fight() {
    if (!game.faction) {
      open('faction');

      return;
    }

    const result = await act({ type: 'fight', mode, dungeon: area, stage, tactic, troops });

    if (result?.lastBattle?.won) setSelectedStage(Math.min(5, stage + 1));
  }

  return (
    <>
      <PageIntro
        title="Some paths are worth the risk."

        description="Send your army into the unknown. Or lead them yourself, with everything to lose."
      />

      <div className="dungeon-area-tabs" aria-label="Dungeon areas">
        {DUNGEONS.map((dungeon, i) => {
          const unlocked = availableDungeon(game, i);

          return (
            <button
              className={`area-tab ${area === i ? 'selected' : ''} ${!unlocked ? 'area-locked' : ''}`}

              aria-pressed={area === i}

              key={dungeon.name}

              disabled={!!game.expedition && i !== area}

              onClick={() => {
                setSelected(i);

                setSelectedStage(Math.min(5, game.cleared[i] + 1));
              }}
            >
              <span className="area-number">
                {unlocked ? `0${i + 1}` : <LockKeyhole size={17} />}
              </span>

              <span>
                <strong>{dungeon.name}</strong>

                <small>
                  {unlocked
                    ? `${game.cleared[i]} / 5 stages cleared`
                    : `Defeat ${DUNGEONS[i - 1].name}'s boss`}
                </small>
              </span>

              {game.cleared[i] === 5 ? (
                <Check size={16} className="positive" />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          );
        })}
      </div>

      {game.expedition ? (
        <section className="expedition-banner">
          <Backpack size={29} />

          <div>
            <h3>
              {atExit
                ? 'The dungeon is conquered. Come home.'
                : 'Your expedition is still out there.'}
            </h3>

            <p>
              {format(game.expedition.gold)} gold · {game.expedition.items.length} items ·{' '}
              {game.expedition.renown} renown unbanked. Extract now or risk it all on the next
              stage.
            </p>
          </div>

          <Button onClick={() => act({ type: 'extract' })}>
            Extract safely
            <ArrowRight size={15} />
          </Button>
        </section>
      ) : null}

      <div className="dungeon-layout">
        <section className={`dungeon-scene ${d.color}`}>
          <img
            src={`/art/${area === 0 ? 'dungeon' : area === 1 ? 'crypt' : 'ember'}.webp`}

            alt={`${d.name}, a dangerous and atmospheric dungeon`}
          />

          <div className="dungeon-scene-top">
            <span className="region-label">{d.region}</span>

            <span className="stage-chip">{game.cleared[area]} / 5 CLEARED</span>
          </div>

          <div className="dungeon-scene-caption">
            <h2>{d.name}</h2>

            <p>{d.description}</p>

            <div className="stage-path">
              {d.names.map((name, i) => {
                const openStage = stageAvailable(game, area, i + 1);

                return (
                  <button
                    key={name}

                    disabled={!openStage || !!game.expedition}

                    className={`${stage === i + 1 ? 'current' : ''} ${game.cleared[area] > i ? 'complete' : ''}`}

                    title={`${i + 1}. ${name}`}

                    aria-label={`Stage ${i + 1}: ${name}${!openStage ? ', locked' : ''}`}

                    aria-pressed={stage === i + 1}

                    onClick={() => setSelectedStage(i + 1)}
                  >
                    <span>
                      {game.cleared[area] > i ? (
                        <Check size={16} />
                      ) : i === 4 ? (
                        <Skull size={18} />
                      ) : !openStage ? (
                        <LockKeyhole size={13} />
                      ) : (
                        i + 1
                      )}
                    </span>

                    <small>{i === 4 ? 'BOSS' : `STAGE ${i + 1}`}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="raid-preparation panel">
          <div className="section-heading">
            <span className="letter-label">
              {stage === 5 ? 'BOSS ENCOUNTER' : `STAGE ${stage} OF 5`}
            </span>

            {stage === 5 ? <Crown size={19} /> : <DoorOpen size={19} />}
          </div>

          {stage === 5 && (
            <img
              className="boss-portrait"
              src={`/art/${['thornbound-boss', 'oathless-boss', 'flame-boss'][area]}.webp`}
              alt={d.names[4]}
            />
          )}
          <h2>{d.names[stage - 1]}</h2>

          <div className="raid-mode" aria-label="Expedition mode">
            <button
              className={mode === 'army' ? 'selected' : ''}

              disabled={!!game.expedition}

              onClick={() => setMode('army')}

              aria-pressed={mode === 'army'}
            >
              <Swords size={16} />
              Army raid
            </button>

            <button
              className={mode === 'personal' ? 'selected' : ''}

              disabled={game.level < 2 || !!game.expedition}

              onClick={() => setMode('personal')}

              aria-pressed={mode === 'personal'}
            >
              {game.level < 2 ? <LockKeyhole size={14} /> : <UserRound size={16} />}Lead personally
            </button>
          </div>

          <p className="mode-description">
            {mode === 'army'
              ? 'Your attackers march. Rewards are banked after every victory.'
              : 'Lead an offensive party. Earn 50% more gold and carry every reward until you extract.'}

            {game.level < 2 ? <small>Personal expeditions unlock at Village.</small> : null}
          </p>

          <div className="party-picker">
            <label htmlFor="dungeon-party">Offensive soldiers to deploy</label>

            <input
              id="dungeon-party"
              type="number"
              min={1}
              max={game.troops.offense}
              value={troops}
              disabled={!!game.expedition}
              onChange={(e) => setPartySize(Number(e.target.value))}
            />

            <input
              aria-label="Deployment size"
              type="range"
              min={1}
              max={Math.max(1, game.troops.offense)}
              value={troops}
              disabled={!!game.expedition}
              onChange={(e) => setPartySize(Number(e.target.value))}
            />

            <small>
              {troops} deployed · {game.troops.offense - troops} attackers stay home · all{' '}
              {game.troops.defense} defenders stay home
              {mode === 'personal' ? ' · Character joins' : ''}
            </small>

            {game.expedition && <small>Survivors only. No reinforcements until you extract.</small>}
          </div>

          <div className="enemy-intel">
            <strong>{style.name} enemy</strong>
            <p>
              {style.description} A correct formation grants +20% strength and reduces casualties by
              25%.
            </p>
            {forecast.weaponMatch > 0 && (
              <small>
                Weapon advantage: +{(forecast.weaponMatch * 10).toFixed(1)}% strength, based on
                party coverage.
              </small>
            )}
          </div>

          <TacticPicker tactic={tactic} setTactic={setTactic} />

          <small className="casualty-forecast">
            Even victory costs lives. Bosses are especially dangerous, and defeat can wipe out your
            deployed troops. Reserves stay safe. Fallen soldiers lose their equipped weapons and
            armor.
          </small>

          <Forecast power={power} enemy={d.enemy[stage - 1]} />

          {mode === 'personal' && !game.expedition ? (
            <label className="risk-ack">
              <input
                type="checkbox"

                checked={acknowledged}

                onChange={(e) => setAcknowledged(e.target.checked)}
              />

              <span>
                I understand: defeat destroys my equipped non-companion items and all unbanked loot.
                My bonded companion survives injured.
              </span>
            </label>
          ) : null}

          {locked ? (
            <div className="locked-message">
              <LockKeyhole size={17} />
              Defeat the previous area’s boss to enter.
            </div>
          ) : atExit ? (
            <Button className="full-width" onClick={() => act({ type: 'extract' })}>
              Return with your spoils
              <ArrowRight size={16} />
            </Button>
          ) : (
            <Button className="full-width" disabled={!!game.faction && !canFight} onClick={fight}>
              {!game.faction
                ? 'Swear an oath to begin'
                : game.expedition
                  ? 'Push deeper'
                  : mode === 'personal'
                    ? 'Lead the expedition'
                    : 'Send your army'}

              <AP amount={cost} />
            </Button>
          )}

          {game.ap < cost ? (
            <small className="center-muted">
              Need {cost - game.ap} more AP. +5 AP every 5 minutes.
            </small>
          ) : null}
        </section>
      </div>

      <div className="dungeon-info-grid">
        <section className="panel risk-panel">
          <ShieldAlert size={22} />

          <h3>Know what you’re risking.</h3>

          <p>
            Every dungeon battle can kill deployed troops, even a victory. Personal expeditions also
            risk equipped non-companion items and the entire satchel. Bonded companions survive
            defeat injured.
          </p>

          <span className="positive">
            <Coins size={14} />
            Your home and stored inventory stay safe.
          </span>
        </section>
      </div>

      <Note>
        Cleared stages can be raided again. Defeat the fifth-stage boss to open the next region.
        Your garrison never leaves home.
      </Note>
    </>
  );
}
