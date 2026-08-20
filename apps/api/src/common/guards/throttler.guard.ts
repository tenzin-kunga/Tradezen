import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerRequest } from '@nestjs/throttler';
import type { Request, Response } from 'express';

@Injectable()
export class ThrottlerEventsGuard extends ThrottlerGuard {
  private readonly logger = new Logger('ThrottlerEvents');

  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const result = await super.handleRequest(requestProps);
    if (!result) {
      const { context } = requestProps;
      const req = context.switchToHttp().getRequest<Request>();
      const res = context.switchToHttp().getResponse<Response>();
      res.setHeader('Retry-After', Math.ceil(requestProps.ttl / 1000));
      this.logger.warn({
        event: 'rate_limit_exceeded',
        ip: req.ip,
        url: req.url,
        requestId: req.id,
        limit: requestProps.limit,
        ttl: requestProps.ttl,
      });
    }
    return result;
  }
}
