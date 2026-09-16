export function pvpLootBand(finalPower: number, defense: number) {
  const ratio = defense > 0 ? finalPower / defense : finalPower > 0 ? Infinity : 0;
  if (ratio >= 2) return { name: 'Dominant victory', min: 0.9, max: 0.98 };
  if (ratio >= 1.5) return { name: 'Decisive victory', min: 0.65, max: 0.9 };
  if (ratio >= 1.2) return { name: 'Solid victory', min: 0.4, max: 0.7 };
  if (ratio >= 1) return { name: 'Narrow victory', min: 0.15, max: 0.4 };
  return { name: 'Defeat', min: 0, max: 0 };
}
export function pvpLoot(treasury: number, finalPower: number, defense: number, roll: number) {
  const band = pvpLootBand(finalPower, defense);
  const rate = band.min + (band.max - band.min) * Math.max(0, Math.min(1, roll));
  const gold =
    treasury > 0 && rate > 0 ? Math.min(treasury, Math.max(1, Math.floor(treasury * rate))) : 0;
  return { ...band, rate, gold };
}
