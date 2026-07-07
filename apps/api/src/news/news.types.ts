export interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  currency: string;
  impact: 'high' | 'medium' | 'low';
  actual: string;
  forecast: string;
  previous: string;
  date: string;
  time: string;
  timestamp: string;
  provider: 'faireconomy';
  released: boolean;
}
