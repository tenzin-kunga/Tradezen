import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { ApiErrorResponse, ApiErrorCode } from '../types/api-error.types';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionHandler');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';
    let errorCode = ApiErrorCode.INTERNAL_ERROR;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message =
          typeof obj.message === 'string' ? obj.message : exception.message;
        error = typeof obj.error === 'string' ? obj.error : 'Error';

        if (status === HttpStatus.UNAUTHORIZED) {
          errorCode = ApiErrorCode.UNAUTHORIZED;
        } else if (status === HttpStatus.FORBIDDEN) {
          errorCode = ApiErrorCode.FORBIDDEN;
        } else if (status === HttpStatus.NOT_FOUND) {
          errorCode = ApiErrorCode.NOT_FOUND;
        } else if (status === HttpStatus.CONFLICT) {
          errorCode = ApiErrorCode.CONFLICT;
        } else if (status === HttpStatus.BAD_REQUEST) {
          errorCode = ApiErrorCode.VALIDATION_FAILED;
        }
      } else {
        message = String(res);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(`Unknown exception type: ${typeof exception}`);
    }

    const apiResponse: ApiErrorResponse = {
      statusCode: status,
      error,
      message,
      errorCode,
      requestId: request.id,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (process.env.NODE_ENV === 'production') {
      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        apiResponse.message = 'An unexpected error occurred';
      }
    }

    response.status(status).json(apiResponse);
  }
}
