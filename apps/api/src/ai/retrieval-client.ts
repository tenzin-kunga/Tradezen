import { Injectable, Logger } from '@nestjs/common';
import type { RetrievalRequest, RetrievalResult } from '@tradezen/types';
import { AITimeoutError, AIServiceError } from './ai-errors';

@Injectable()
export class RetrievalClient {
  private readonly logger = new Logger(RetrievalClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly enabled: boolean;
  private readonly shadow: boolean;

  constructor() {
    // Feature flags (Slice 5/6). Default off:
    //  - RETRIEVAL_CLIENT_ENABLED: serve RAG from Python /retrieval.
    //  - RETRIEVAL_CLIENT_SHADOW: run both paths, serve the old result, and
    //    record a comparison — no behavior change (Slice 6 evaluation).
    this.enabled =
      (process.env.RETRIEVAL_CLIENT_ENABLED ?? 'false').toLowerCase() ===
      'true';
    this.shadow =
      (process.env.RETRIEVAL_CLIENT_SHADOW ?? 'false').toLowerCase() === 'true';
    // /retrieval lives at the root of the AI service, not under /v1.
    this.baseUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';
    this.apiKey = process.env.AI_SERVICE_API_KEY ?? 'tradezen-internal';
    this.timeoutMs = Number(process.env.RETRIEVAL_CLIENT_TIMEOUT_MS ?? 5000);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isShadow(): boolean {
    return this.shadow;
  }

  /** Shadow mode implies the client must call Python even when not serving. */
  shouldCall(): boolean {
    return this.enabled || this.shadow;
  }

  /**
   * Calls Python /retrieval. Never throws on service problems: on failure it
   * returns an empty RetrievalResult (RAG degraded), never a hard failure.
   */
  async search(
    userId: string,
    request: RetrievalRequest,
  ): Promise<RetrievalResult> {
    const empty: RetrievalResult = {
      requestId: request.requestId,
      documents: [],
      debug: {
        candidates: 0,
        filtered: 0,
        latencyMs: 0,
        method: 'vector',
        breakdown: {},
        degraded: true,
      },
    };

    if (!this.shouldCall()) {
      this.logger.debug('RetrievalClient disabled — RAG degraded');
      return empty;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const resp = await fetch(`${this.baseUrl}/retrieval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': this.apiKey,
        },
        // user_id from trusted server-side auth, not client input (§15)
        body: JSON.stringify({ ...request, user_id: userId }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        this.logger.warn(
          `Retrieval service returned ${resp.status}: ${body.slice(0, 200)}`,
        );
        return empty;
      }

      const data = (await resp.json()) as Partial<RetrievalResult>;
      if (!Array.isArray(data.documents)) {
        this.logger.warn('Malformed retrieval response — missing documents');
        return { ...empty, requestId: data.requestId ?? request.requestId };
      }
      return data as RetrievalResult;
    } catch (error) {
      const classified = classifyRetrievalError(
        error,
        this.baseUrl,
        this.timeoutMs,
      );
      if (classified instanceof AITimeoutError) {
        this.logger.warn(`Retrieval timed out after ${this.timeoutMs}ms`);
      } else {
        this.logger.warn(`Retrieval unavailable: ${classified.message}`);
      }
      return empty;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

function classifyRetrievalError(
  error: unknown,
  baseUrl: string,
  timeoutMs: number,
): AIServiceError {
  if (error instanceof AIServiceError) return error;
  const cause = error instanceof Error ? error : new Error(String(error));
  if (cause.name === 'AbortError') {
    return new AITimeoutError(timeoutMs, cause);
  }
  return new AIServiceError(
    `Retrieval request failed: ${cause.message}`,
    cause,
  );
}
