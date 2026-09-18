import { bankLevel, bankCapacity, bankRate, bankUpgradeCost, MAX_BANK } from '../game/progression';
import { useState } from 'react';
import { useGame } from '../game/context';
import { BANK_DEPOSIT_FEE } from '../game/data';
import { format } from '../game/engine';
import { Button, Gold } from './ui';
export function Bank() {
  const { game, act, busy, navigate } = useGame();
  const [direction, setDirection] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const savings = game.bankGold ?? 0;
  const room = Math.max(0, bankCapacity(game) - savings);
  const maxDeposit = Math.ceil((room + 1) / (1 - BANK_DEPOSIT_FEE)) - 1;
  const available = direction === 'deposit' ? Math.min(game.gold, maxDeposit) : savings;
  const value = Number(amount);
  const fee = direction === 'deposit' ? Math.ceil(value * BANK_DEPOSIT_FEE) : 0;
  const valid =
    Number.isSafeInteger(value) && value > fee && value <= available && value <= 1_000_000_000;
  return (
    <section className="panel bank-panel" aria-label="Bank">
      <div>
        <span className="letter-label">THE BANK</span>
        <h2>Keep tomorrow's gold safe.</h2>
        <p>
          Banked gold cannot be stolen in PvP. Withdraw it before buying upgrades or equipment.
          Tribute and battle rewards arrive in your treasury.
        </p>
      </div>
      {!game.buildings.bank ? (
        <>
          <p>
            Build at Settlement for 1,000 gold. Deposits cost 5%, rounded up; withdrawals are free.
            Interest starts at 0.001% per turn; upgrade for more capacity and interest.
          </p>
          <Button
            disabled={busy || (game.level >= 1 && game.gold < 1000)}
            onClick={() =>
              game.level < 1
                ? navigate('settlement')
                : void act({ type: 'build', building: 'bank' })
            }
          >
            {game.level < 1 ? 'Reach Settlement to unlock' : 'Build Bank · 1,000 gold'}
          </Button>
        </>
      ) : (
        <>
          <div className="progression-upgrade">
            <h3>
              Bank level {bankLevel(game)} / {MAX_BANK}
            </h3>
            <p>
              Capacity: {format(bankCapacity(game))} gold · {(bankRate(game) * 100).toFixed(3)}%
              interest per turn.
            </p>
            <p>
              Interest stays protected, with fractional gold carried forward. Accrual stops at
              capacity and shares the 12-hour offline limit. Existing savings above capacity remain
              safe; withdraw or upgrade to resume deposits and interest.
            </p>
            <Button
              disabled={busy || bankLevel(game) >= MAX_BANK || game.gold < bankUpgradeCost(game)}
              onClick={() => act({ type: 'upgradeBank' })}
            >
              {bankLevel(game) >= MAX_BANK
                ? 'Fully upgraded'
                : `Double capacity to ${format(bankCapacity(game) * 2)} · ${format(bankUpgradeCost(game))} gold`}
            </Button>
          </div>
          <div className="bank-balances">
            <div>
              <small>Available treasury</small>
              <Gold amount={game.gold} />
            </div>
            <div>
              <small>Protected savings</small>
              <Gold amount={savings} />
            </div>
          </div>
          <div className="bank-controls">
            <label>
              Bank action
              <select
                value={direction}
                disabled={busy}
                onChange={(e) => {
                  setDirection(e.target.value as 'deposit' | 'withdraw');
                  setAmount('');
                }}
              >
                <option value="deposit">Deposit</option>
                <option value="withdraw">Withdraw</option>
              </select>
            </label>
            <label>
              Gold amount
              <input
                type="number"
                min={direction === 'deposit' ? 2 : 1}
                max={Math.min(available, 1_000_000_000)}
                step={1}
                value={amount}
                disabled={busy}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <Button
              variant="secondary"
              disabled={busy || !available}
              onClick={() => setAmount(String(Math.min(available, 1_000_000_000)))}
            >
              Maximum
            </Button>
            <Button
              disabled={busy || !valid}
              onClick={async () => {
                if (await act({ type: 'bank', direction, amount: value })) setAmount('');
              }}
            >
              {direction === 'deposit' ? 'Deposit gold' : 'Withdraw gold'}
            </Button>
          </div>
          <p role="status">
            {valid
              ? direction === 'deposit'
                ? `${format(value)} leaves your treasury. Fee: ${format(fee)}. Protected deposit: ${format(value - fee)} gold.`
                : `${format(value)} gold returns to your treasury and becomes available to spend or plunder.`
              : 'Choose an amount within your available balance.'}
          </p>
          <small>
            Deposits cost 5%, rounded up. Withdrawals are free. Interest is credited to savings each
            turn, up to capacity.
          </small>
        </>
      )}
    </section>
  );
}
