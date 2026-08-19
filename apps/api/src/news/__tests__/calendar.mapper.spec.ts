import { mapEntry } from '../calendar.mapper';

describe('mapEntry', () => {
  it('normalizes standard faireconomy format', () => {
    const raw = {
      title: 'Non-Farm Payrolls',
      country: 'United States',
      currency: 'USD',
      impact: 'High',
      date: '2025-01-10 13:30:00',
      actual: '256K',
      forecast: '160K',
      previous: '212K',
    };
    const event = mapEntry(raw);
    expect(event.title).toBe('Non-Farm Payrolls');
    expect(event.currency).toBe('USD');
    expect(event.impact).toBe('high');
    expect(event.actual).toBe('256K');
    expect(event.released).toBe(true);
    expect(event.date).toBe('2025-01-10');
    expect(event.timestamp).toContain('2025-01-10');
  });

  it('converts dot-separated date format to ISO', () => {
    const raw = {
      title: 'CPI',
      country: 'United States',
      currency: 'USD',
      impact: 'medium',
      date: '2025.01.15 08:30:00',
      actual: '',
      forecast: '0.3%',
      previous: '0.1%',
    };
    const event = mapEntry(raw);
    expect(event.date).toBe('2025-01-15');
    expect(event.timestamp).toContain('2025-01-15');
  });

  it('handles camelCase field names (Name, Currency, Impact)', () => {
    const raw = {
      Name: 'GDP',
      Currency: 'United States',
      Impact: 'low',
      Date: '2025-02-01 10:00:00',
    };
    const event = mapEntry(raw);
    expect(event.title).toBe('GDP');
    expect(event.country).toBe('United States');
    expect(event.impact).toBe('low');
  });

  it('defaults impact to low for unrecognized values', () => {
    const raw = {
      title: 'Holiday',
      country: 'United States',
      currency: 'USD',
      impact: 'holiday',
      date: '2025-01-01',
    };
    const event = mapEntry(raw);
    expect(event.impact).toBe('low');
  });

  it('sets released to false when actual is empty', () => {
    const raw = {
      title: 'NFP',
      country: 'United States',
      currency: 'USD',
      impact: 'high',
      date: '2025-07-10 13:30:00',
      actual: '',
      forecast: '175K',
      previous: '200K',
    };
    const event = mapEntry(raw);
    expect(event.released).toBe(false);
  });

  it('sets released to false when actual is "0"', () => {
    const raw = {
      title: 'NFP',
      country: 'United States',
      currency: 'USD',
      impact: 'high',
      date: '2025-07-10 13:30:00',
      actual: '0',
      forecast: '175K',
      previous: '200K',
    };
    const event = mapEntry(raw);
    expect(event.released).toBe(false);
  });

  it('generates correct id from country-title-date', () => {
    const raw = {
      title: 'Core CPI',
      country: 'United States',
      currency: 'USD',
      impact: 'high',
      date: '2025-01-15',
    };
    const event = mapEntry(raw);
    expect(event.id).toBe('United-States-core-cpi-2025-01-15');
  });

  it('handles missing fields gracefully', () => {
    const raw = {};
    const event = mapEntry(raw);
    expect(event.title).toBe('Unknown');
    expect(event.country).toBe('');
    expect(event.impact).toBe('low');
    expect(event.released).toBe(false);
  });
});
