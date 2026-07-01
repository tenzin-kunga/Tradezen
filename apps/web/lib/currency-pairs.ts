export interface CurrencyMarketInfo {
  pairs: string[];
  assets: string[];
}

export const CURRENCY_MARKET_INFO: Record<string, CurrencyMarketInfo> = {
  USD: {
    pairs: [
      "EURUSD",
      "GBPUSD",
      "USDJPY",
      "USDCAD",
      "USDCHF",
      "AUDUSD",
      "NZDUSD",
    ],
    assets: ["Gold", "S&P 500", "Dow Jones"],
  },
  EUR: {
    pairs: ["EURUSD", "EURGBP", "EURJPY", "EURCHF", "EURAUD", "EURNZD"],
    assets: ["Euro Stoxx 50", "DAX"],
  },
  GBP: {
    pairs: ["GBPUSD", "EURGBP", "GBPJPY", "GBPCHF", "GBPAUD"],
    assets: ["FTSE 100"],
  },
  JPY: {
    pairs: ["USDJPY", "EURJPY", "GBPJPY", "AUDJPY", "CHFJPY", "CADJPY"],
    assets: ["Nikkei 225"],
  },
  CAD: {
    pairs: ["USDCAD", "EURCAD", "CADJPY", "GBPCAD"],
    assets: ["WTI Crude Oil"],
  },
  AUD: {
    pairs: ["AUDUSD", "EURAUD", "AUDJPY", "AUDCAD", "NZDAUD"],
    assets: ["Gold", "Iron Ore"],
  },
  NZD: {
    pairs: ["NZDUSD", "EURNZD", "NZDJPY"],
    assets: ["Dairy"],
  },
  CHF: {
    pairs: ["USDCHF", "EURCHF", "GBPCHF", "CHFJPY"],
    assets: ["Gold"],
  },
  CNY: {
    pairs: ["USDCNY", "EURCNY"],
    assets: ["Hang Seng", "Shanghai Composite"],
  },
};
