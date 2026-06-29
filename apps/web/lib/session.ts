export function getTradingSession(dateStr: string): string {
  if (!dateStr) return "--";
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) return "--";
  const h = dt.getUTCHours();
  if (h >= 13 && h < 18) return "NY OPEN";
  if (h >= 7 && h < 13) return "LONDON";
  return "ASIAN";
}
