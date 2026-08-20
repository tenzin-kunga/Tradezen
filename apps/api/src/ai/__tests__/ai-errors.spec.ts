import {
  classifyError,
  AIServiceUnavailableError,
  AITimeoutError,
  AIServiceResponseError,
} from '../ai-errors';

describe('classifyError', () => {
  const baseUrl = 'http://ai-service:8000/v1';
  const timeoutMs = 30000;

  it('passes through AIServiceError subclasses', () => {
    const original = new AIServiceResponseError(400, 'bad request');
    const classified = classifyError(original, baseUrl, timeoutMs);
    expect(classified).toBe(original);
    expect(classified).toBeInstanceOf(AIServiceResponseError);
  });

  it('classifies abort-named error as AITimeoutError', () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    const classified = classifyError(abortError, baseUrl, timeoutMs);
    expect(classified).toBeInstanceOf(AITimeoutError);
    expect(classified.message).toContain('30000ms');
  });

  it('classifies timeout message as AITimeoutError', () => {
    const timeoutError = new Error('network timeout');
    const classified = classifyError(timeoutError, baseUrl, timeoutMs);
    expect(classified).toBeInstanceOf(AITimeoutError);
  });

  it('classifies ECONNREFUSED as AIServiceUnavailableError', () => {
    const connError = new Error('connect ECONNREFUSED 127.0.0.1:8000');
    (connError as { code?: string }).code = 'ECONNREFUSED';
    const classified = classifyError(connError, baseUrl, timeoutMs);
    expect(classified).toBeInstanceOf(AIServiceUnavailableError);
    expect(classified.message).toContain(baseUrl);
  });

  it('classifies ECONNRESET as AIServiceUnavailableError', () => {
    const resetError = new Error('read ECONNRESET');
    (resetError as { code?: string }).code = 'ECONNRESET';
    const classified = classifyError(resetError, baseUrl, timeoutMs);
    expect(classified).toBeInstanceOf(AIServiceUnavailableError);
  });

  it('classifies ENOTFOUND as AIServiceUnavailableError', () => {
    const dnsError = new Error('getaddrinfo ENOTFOUND ai-service');
    (dnsError as { code?: string }).code = 'ENOTFOUND';
    const classified = classifyError(dnsError, baseUrl, timeoutMs);
    expect(classified).toBeInstanceOf(AIServiceUnavailableError);
  });

  it('classifies unknown errors as AIServiceUnavailableError (fallback)', () => {
    const unknown = new Error('something weird happened');
    const classified = classifyError(unknown, baseUrl, timeoutMs);
    expect(classified).toBeInstanceOf(AIServiceUnavailableError);
  });

  it('classifies non-Error values as AIServiceUnavailableError', () => {
    const classified = classifyError('string error', baseUrl, timeoutMs);
    expect(classified).toBeInstanceOf(AIServiceUnavailableError);
    expect(classified.cause?.message).toBe('string error');
  });

  it('preserves original cause chain', () => {
    const original = new Error('connection refused');
    (original as { code?: string }).code = 'ECONNREFUSED';
    const classified = classifyError(original, baseUrl, timeoutMs);
    expect(classified.cause).toBe(original);
  });
});
