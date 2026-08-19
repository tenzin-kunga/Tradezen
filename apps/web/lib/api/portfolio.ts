const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function authFetch(
  url: string,
  opts: RequestInit = {},
): Promise<Response> {
  const { getAccessToken } = await import("@/lib/api");
  const token = getAccessToken();

  const headers: Record<string, string> = {
    ...((opts.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(url, { ...opts, headers, credentials: "include" });
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || res.statusText);
  }
  return res.json();
}

export interface PortfolioSummary {
  totalTrades: number;
  realizedPnl: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  fomoTrades: number;
  vengeanceTrades: number;
}

export interface SymbolPosition {
  symbol: string;
  trades: number;
  wins: number;
  realizedPnl: number;
  winRate: number;
  avgPnl: number;
  longs: number;
  shorts: number;
  allocationPct: number;
}

export interface StrategyAttribution {
  strategy: string;
  trades: number;
  realizedPnl: number;
  winRate: number;
}

export interface Portfolio {
  summary: PortfolioSummary;
  symbols: SymbolPosition[];
  strategies: StrategyAttribution[];
  byDirection: { long: number; short: number };
}

export async function getPortfolio(): Promise<Portfolio> {
  const res = await authFetch(`${API}/portfolio`);
  return handleResponse<Portfolio>(res);
}
