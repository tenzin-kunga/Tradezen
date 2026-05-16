import { Injectable, Logger } from '@nestjs/common';
import { db } from '../../db/drizzle';
import { auditLog } from '../../db/schema';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGIN_LOCKOUT'
  | 'PASSWORD_CHANGE'
  | 'SETTINGS_UPDATE'
  | 'TRADE_CREATE'
  | 'TRADE_UPDATE'
  | 'TRADE_DELETE'
  | 'CSV_IMPORT'
  | 'CHAT_MESSAGE'
  | 'RATE_LIMIT_EXCEEDED';

@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  async log(params: {
    userId?: number;
    action: AuditAction;
    resource?: string;
    resourceId?: number;
    ip?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await db.insert(auditLog).values({
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        ip: params.ip,
        userAgent: params.userAgent,
        details: params.details,
      });
    } catch (error) {
      this.logger.error(`Audit log failed: ${(error as Error).message}`);
    }
  }
}
