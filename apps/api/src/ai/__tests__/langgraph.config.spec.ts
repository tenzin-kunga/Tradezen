// Mock @langchain/openai to avoid ESM import issues in Jest
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation((config: unknown) => config),
}));

import { normalizeAiBaseUrl } from '../langgraph.config';

describe('normalizeAiBaseUrl', () => {
  it.each([
    ['http://host', 'http://host/v1'],
    ['http://host/', 'http://host/v1'],
    ['http://host/v1', 'http://host/v1'],
    ['http://host/v1/', 'http://host/v1'],
    ['http://ai-service:8000', 'http://ai-service:8000/v1'],
    ['http://localhost:8000/', 'http://localhost:8000/v1'],
  ])('normalizes %s → %s', (input, expected) => {
    expect(normalizeAiBaseUrl(input)).toBe(expected);
  });

  it('does not produce /v1/v1 when input already ends with /v1', () => {
    const result = normalizeAiBaseUrl('http://host/v1');
    expect(result).not.toContain('/v1/v1');
    expect(result).toBe('http://host/v1');
  });

  it('strips trailing slash before appending /v1', () => {
    expect(normalizeAiBaseUrl('http://host/')).toBe('http://host/v1');
  });

  it('is idempotent — normalizing twice yields the same result', () => {
    const inputs = [
      'http://host',
      'http://host/',
      'http://host/v1',
      'http://host/v1/',
      'http://ai-service:8000',
      'http://localhost:8000/',
    ];
    for (const input of inputs) {
      const once = normalizeAiBaseUrl(input);
      const twice = normalizeAiBaseUrl(once);
      expect(once).toBe(twice);
    }
  });
});
