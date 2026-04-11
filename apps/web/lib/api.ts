const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const createTrade = async (data: {
  symbol: string;
  direction: "buy" | "sell";
  entry: number;
  exit: number;
  lot: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  strategy?: string | null;
  notes?: string | null;
  fomo_check?: boolean;
  trend_alignment?: boolean;
  vengeance_trade?: boolean;
}) => {
  const res = await fetch(`${API}/trades`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getTrades = async () => {
  const res = await fetch(`${API}/trades`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const uploadTradeImage = async (id: string, file: File) => {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${API}/trades/${id}/image`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
