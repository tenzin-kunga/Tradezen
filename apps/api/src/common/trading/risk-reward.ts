export function calculateRiskReward(
  entryPrice: number,
  stopLoss: number | null,
  takeProfit: number | null,
): number | null {
  if (stopLoss == null || takeProfit == null) return null;
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  if (risk === 0) return null;
  return Math.round((reward / risk) * 100) / 100;
}
