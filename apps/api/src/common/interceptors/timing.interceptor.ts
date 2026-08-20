import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface RequestMeta {
  method?: string;
  url?: string;
  id?: string;
}

interface ResponseMeta {
  statusCode?: number;
}

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('TimingInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestMeta>();
    const res = context.switchToHttp().getResponse<ResponseMeta>();
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
          this.logger.log({
            event: 'request_completed',
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            durationMs: Math.round(duration * 100) / 100,
            requestId: req.id,
          });
        },
        error: (error: Error) => {
          const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
          this.logger.error({
            event: 'request_failed',
            method: req.method,
            url: req.url,
            statusCode: res.statusCode ?? 500,
            durationMs: Math.round(duration * 100) / 100,
            requestId: req.id,
            errorMessage: error.message,
          });
        },
      }),
    );
  }
}
