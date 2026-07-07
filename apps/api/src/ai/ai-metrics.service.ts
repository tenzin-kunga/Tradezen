import { Injectable, Logger } from '@nestjs/common';

export interface AiMetricsSnapshot {
  requests: number;
  failures: number;
  retries: number;
  timeouts: number;
  circuitBreakerOpens: number;
}

@Injectable()
export class AiMetricsService {
  private readonly logger = new Logger('AiMetrics');

  private counters = {
    requests: 0,
    failures: 0,
    retries: 0,
    timeouts: 0,
    circuitBreakerOpens: 0,
  };

  incRequest(): void {
    this.counters.requests++;
  }

  incFailure(): void {
    this.counters.failures++;
  }

  incRetry(): void {
    this.counters.retries++;
  }

  incTimeout(): void {
    this.counters.timeouts++;
  }

  incCircuitBreakerOpen(): void {
    this.counters.circuitBreakerOpens++;
  }

  snapshot(): AiMetricsSnapshot {
    return { ...this.counters };
  }

  logSnapshot(): void {
    this.logger.log({
      msg: 'ai_metrics',
      ...this.counters,
    });
  }
}
