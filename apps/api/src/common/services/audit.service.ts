import { Injectable, Logger } from '@nestjs/common';
import { pool } from '../../db';

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
      await pool.query(
        `INSERT INTO audit_log (user_id, action, resource, resource_id, ip, user_agent, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          params.userId,
          params.action,
          params.resource,
          params.resourceId,
          params.ip,
          params.userAgent,
          params.details ? JSON.stringify(params.details) : null,
        ],
      );
    } catch (error) {
      this.logger.error(`Audit log failed: ${(error as Error).message}`);
    }
  }
}
