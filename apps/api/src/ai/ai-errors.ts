export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class AIServiceUnavailableError extends AIServiceError {
  constructor(host: string, cause?: Error) {
    super(`AI service unavailable at ${host}`, cause);
    this.name = 'AIServiceUnavailableError';
  }
}

export class AITimeoutError extends AIServiceError {
  constructor(timeoutMs: number, cause?: Error) {
    super(`AI service request timed out after ${timeoutMs}ms`, cause);
    this.name = 'AITimeoutError';
  }
}

export class AIServiceResponseError extends AIServiceError {
  constructor(
    public readonly statusCode: number,
    body: string,
  ) {
    super(`AI service returned ${statusCode}: ${body}`);
    this.name = 'AIServiceResponseError';
  }
}

export class AIProtocolError extends AIServiceError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'AIProtocolError';
  }
}

const RETRYABLE_CODES = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EPIPE',
  'EAI_AGAIN',
];

export function classifyError(
  error: unknown,
  baseUrl: string,
  timeoutMs: number,
): AIServiceError {
  if (error instanceof AIServiceError) return error;

  const cause = error instanceof Error ? error : new Error(String(error));
  const msg = cause.message ?? '';

  if (
    cause.name === 'AbortError' ||
    msg.includes('abort') ||
    msg.includes('timeout')
  ) {
    return new AITimeoutError(timeoutMs, cause);
  }

  const code = (cause as any).code ?? '';
  if (RETRYABLE_CODES.includes(code)) {
    return new AIServiceUnavailableError(baseUrl, cause);
  }

  return new AIServiceUnavailableError(baseUrl, cause);
}
