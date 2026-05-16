import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const logger = context.switchToHttp().getResponse().req?.log ?? console;
        logger.info?.({
          event: 'request_completed',
          method: req.method,
          url: req.url,
          statusCode: context.switchToHttp().getResponse().statusCode,
          durationMs: duration,
          requestId: req.id,
        });
      }),
    );
  }
}
