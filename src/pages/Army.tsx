import '../army-command.css';
import { ArmoryWorkshop } from '../components/ArmoryWorkshop';
import type { Role } from '../game/types';
import { useState } from 'react';
import { Sword, Shield, UserRound, Swords } from 'lucide-react';
import { useGame } from '../game/context';
import { stats, runeDiscovered } from '../game/engine';
import { PageIntro, Note } from '../components/ui';
import { Inventory, LoadoutSummary } from '../components/Inventory';
import { ArmyManagement } from '../components/ArmyManagement';
export function Army() {
  const { game } = useGame();
  const st = stats(game);
  const [tab, setTab] = useState<'troops' | 'armory' | 'hero'>('troops');
  const [role, setRole] = useState<Role>('offense');
  return (
    <>
      <PageIntro title="Army & Armory" description="Command your forces. Equip every soldier." />
      <div className="page-tabs">
        <button
          className={tab === 'troops' ? 'selected' : ''}
          aria-pressed={tab === 'troops'}
          onClick={() => setTab('troops')}
        >
          <Swords size={17} />
          Army
        </button>
        <button
          className={tab === 'armory' ? 'selected' : ''}
          aria-pressed={tab === 'armory'}
          onClick={() => setTab('armory')}
        >
          <Shield size={17} />
          Armory
        </button>
        <button
          className={tab === 'hero' ? 'selected' : ''}
          aria-pressed={tab === 'hero'}
          onClick={() => setTab('hero')}
        >
          <UserRound size={17} />
          Your character
        </button>
      </div>
      {tab === 'troops' ? (
        <ArmyManagement
          onEquip={(r) => {
            setRole(r);
            setTab('armory');
          }}
        />
      ) : tab === 'armory' ? (
        <ArmoryWorkshop role={role} setRole={setRole} />
      ) : (
        <>
          {' '}
          <div className="hero-profile panel">
            <div className="hero-sigil">
              <UserRound size={66} strokeWidth={0.8} />
            </div>

            <div>
              <span className="letter-label">THE ONE WHO SWORE THE OATH</span>

              <h2>{game.name}</h2>

              <p>Your army follows your banner. Your character leads the way.</p>

              <div className="hero-stat-line">
                <span>
                  <Sword size={16} />
                  {st.heroAttack} attack
                </span>

                <span>
                  <Shield size={16} />
                  {st.heroDefense} defense
                </span>

                {runeDiscovered(game) && <span>+{Math.round(st.runes * 100)}% runes</span>}
              </div>
            </div>

            <div className="personal-strength">
              <strong>{st.personal}</strong>

              <span>Expedition strength</span>

              <small>Hero + 65% army strength</small>
            </div>
          </div>
          <LoadoutSummary />
          <Note>
            Personal expeditions unlock at Village. If you fall, equipped non-companion items and
            unbanked loot are lost. Bonded companions survive with injuries. Everything stored at
            home stays safe.
          </Note>
          <Inventory />
        </>
      )}
    </>
  );
}
