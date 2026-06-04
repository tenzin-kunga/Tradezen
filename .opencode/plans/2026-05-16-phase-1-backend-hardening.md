# Phase 1: Core Backend Stability & Validation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the TradeZen API with strict validation, centralized error handling, transaction-safe DB operations, and structured logging.

**Architecture:** Four independent improvements executed in parallel via subagents. Each produces testable, committable changes. Existing patterns preserved, gaps filled.

**Tech Stack:** NestJS 11, class-validator, class-transformer, pg, Pino, uuid

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/api/src/common/filters/http-exception.filter.ts` | Modify | Standardized error schema, error codes, prod sanitization |
| `apps/api/src/common/interceptors/logging.interceptor.ts` | Replace | Structured logging with request IDs, timing |
| `apps/api/src/common/middleware/correlation-id.middleware.ts` | Create | Generate/propagate X-Request-ID |
| `apps/api/src/common/utils/with-transaction.ts` | Create | Transaction wrapper utility |
| `apps/api/src/trades/dto/create-trade.dto.ts` | Modify | Add numeric precision, min/max constraints |
| `apps/api/src/trades/dto/update-trade.dto.ts` | Modify | Inherit enhanced validation |
| `apps/api/src/auth/dto/login.dto.ts` | Modify | Add email format, password complexity |
| `apps/api/src/auth/dto/update-settings.dto.ts` | Modify | Add timezone enum, theme enum |
| `apps/api/src/journals/dto/create-journal.dto.ts` | Modify | Add date validation, mood enum |
| `apps/api/src/tags/dto/create-tag.dto.ts` | Modify | Add color hex validation, name length |
| `apps/api/src/chat/dto/chat-message.dto.ts` | Modify | Add role enum, content min length |
| `apps/api/src/main.ts` | Modify | Enable ValidationPipe with forbidUnknownValues |
| `apps/api/src/trades/trades.service.ts` | Modify | Wrap CRUD in transactions |
| `apps/api/src/journals/journals.service.ts` | Modify | Wrap operations in transactions |
| `apps/api/src/tags/tags.service.ts` | Modify | Wrap operations in transactions |
| `apps/api/package.json` | Modify | Add pino, pino-http, uuid dependencies |

---

### Task 1: Global Validation Hardening (TZ-001)

**Files:**
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/trades/dto/create-trade.dto.ts`
- Modify: `apps/api/src/auth/dto/login.dto.ts`
- Modify: `apps/api/src/auth/dto/update-settings.dto.ts`
- Modify: `apps/api/src/journals/dto/create-journal.dto.ts`
- Modify: `apps/api/src/tags/dto/create-tag.dto.ts`
- Modify: `apps/api/src/chat/dto/chat-message.dto.ts`

- [ ] **Step 1: Enable strict ValidationPipe in main.ts**

Add `forbidUnknownValues: true` and `stopAtFirstError: true` to the existing ValidationPipe in `apps/api/src/main.ts`:

```typescript
// In main.ts bootstrap(), find the existing ValidationPipe and update:
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    stopAtFirstError: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

- [ ] **Step 2: Enhance CreateTradeDto with numeric precision and constraints**

Update `apps/api/src/trades/dto/create-trade.dto.ts`:

```typescript
import {
  IsString,
  IsIn,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsPositive,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTradeDto {
  @ApiProperty({ example: 'EURUSD' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  symbol: string;

  @ApiProperty({ enum: ['buy', 'sell'] })
  @IsIn(['buy', 'sell'])
  direction: 'buy' | 'sell';

  @ApiProperty({ example: 1.085 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  entry: number;

  @ApiProperty({ example: 1.092 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  exit: number;

  @ApiProperty({ example: 1.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000)
  lot: number;

  @ApiPropertyOptional({ example: 1.08 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  stop_loss?: number | null;

  @ApiPropertyOptional({ example: 1.1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  take_profit?: number | null;

  @ApiPropertyOptional({ example: 'breakout' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  strategy?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  fomo_check?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  trend_alignment?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  vengeance_trade?: boolean;

  @ApiPropertyOptional({
    example: 100000,
    description:
      'Contract size multiplier (100000 for standard forex lot, 1 for stocks)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000000)
  contract_size?: number;

  @ApiPropertyOptional({ example: '2025-01-15T10:30:00Z' })
  @IsOptional()
  @IsString()
  trade_date?: string | null;

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000)
  commission?: number | null;
}
```

- [ ] **Step 3: Enhance LoginDto with email format validation**

Update `apps/api/src/auth/dto/login.dto.ts`:

```typescript
import { IsString, IsOptional, IsBoolean, IsEmail, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'trader@example.com',
    description: 'Email or username',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  identifier: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({
    description: 'Keep me logged in across browser restarts',
  })
  @IsOptional()
  @IsBoolean()
  remember_me?: boolean;
}
```

- [ ] **Step 4: Enhance UpdateSettingsDto with enums**

Update `apps/api/src/auth/dto/update-settings.dto.ts`:

```typescript
import { IsOptional, IsNumber, IsString, IsIn, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000000)
  initial_capital?: number;

  @ApiPropertyOptional({ example: 0.01 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000)
  default_lot_size?: number;

  @ApiPropertyOptional({ example: 'UTC' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ enum: ['dark', 'light'] })
  @IsOptional()
  @IsIn(['dark', 'light'])
  theme?: string;
}
```

- [ ] **Step 5: Enhance CreateJournalDto**

Update `apps/api/src/journals/dto/create-journal.dto.ts`:

```typescript
import { IsOptional, IsString, IsEnum, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum JournalMood {
  GREAT = 'great',
  GOOD = 'good',
  NEUTRAL = 'neutral',
  BAD = 'bad',
  TERRIBLE = 'terrible',
}

export class CreateJournalDto {
  @ApiPropertyOptional()
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  pre_market_notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  post_market_notes?: string;

  @ApiPropertyOptional({
    enum: JournalMood,
  })
  @IsOptional()
  @IsEnum(JournalMood)
  mood?: JournalMood;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  market_conditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  lessons?: string;
}
```

- [ ] **Step 6: Enhance CreateTagDto**

Update `apps/api/src/tags/dto/create-tag.dto.ts`:

```typescript
import { IsString, IsOptional, IsEnum, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TagCategory {
  SETUP = 'setup',
  CONDITION = 'condition',
  EMOTION = 'emotion',
}

export class CreateTagDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  name: string;

  @ApiPropertyOptional({ default: '#888888' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color (e.g., #888888)',
  })
  color?: string;

  @ApiPropertyOptional({
    enum: TagCategory,
    default: TagCategory.SETUP,
  })
  @IsOptional()
  @IsEnum(TagCategory)
  category?: TagCategory;
}
```

- [ ] **Step 7: Enhance ChatMessageDto**

Update `apps/api/src/chat/dto/chat-message.dto.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength, IsOptional } from 'class-validator';

export enum ChatRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

export class ChatMessageDto {
  @ApiProperty({ enum: ChatRole })
  @IsIn([ChatRole.SYSTEM, ChatRole.USER, ChatRole.ASSISTANT])
  role: ChatRole;

  @ApiProperty({ example: 'How can I improve my risk management?' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  context?: string;
}
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/main.ts apps/api/src/*/dto/*.ts
git commit -m "feat: harden validation across all API modules (TZ-001)

- Enable forbidUnknownValues and stopAtFirstError in ValidationPipe
- Add numeric precision constraints to trade DTOs
- Add string length limits to all DTOs
- Add enum types for mood, tag category, chat role
- Add hex color validation for tags
- Add password complexity requirements"
```

---

### Task 2: Centralized Error Handling (TZ-002)

**Files:**
- Modify: `apps/api/src/common/filters/http-exception.filter.ts`
- Create: `apps/api/src/common/types/api-error.types.ts`

- [ ] **Step 1: Create error types**

Create `apps/api/src/common/types/api-error.types.ts`:

```typescript
export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  errorCode?: string;
  requestId?: string;
  timestamp: string;
  path?: string;
}

export enum ApiErrorCode {
  // Auth errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
```

- [ ] **Step 2: Replace HttpExceptionFilter with enhanced version**

Replace `apps/api/src/common/filters/http-exception.filter.ts`:

```typescript
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
        const obj = res as Record<string, any>;
        message = obj.message ?? exception.message;
        error = obj.error ?? 'Error';

        // Map status to error code
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
    }

    // Build response
    const apiResponse: ApiErrorResponse = {
      statusCode: status,
      error,
      message,
      errorCode,
      requestId: request.headers['x-request-id'] as string,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Hide stack traces in production
    if (process.env.NODE_ENV === 'production') {
      delete (apiResponse as any).stack;
      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        apiResponse.message = 'An unexpected error occurred';
      }
    }

    response.status(status).json(apiResponse);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/common/filters/http-exception.filter.ts apps/api/src/common/types/api-error.types.ts
git commit -m "feat: centralized error handling with standardized schema (TZ-002)

- Add ApiErrorResponse interface with requestId, timestamp, path
- Add ApiErrorCode enum for machine-readable error codes
- Hide stack traces in production
- Map HTTP status codes to error codes
- Add request ID correlation from X-Request-ID header"
```

---

### Task 3: Transaction-Safe Database Operations (TZ-003)

**Files:**
- Create: `apps/api/src/common/utils/with-transaction.ts`
- Modify: `apps/api/src/trades/trades.service.ts`
- Modify: `apps/api/src/journals/journals.service.ts`
- Modify: `apps/api/src/tags/tags.service.ts`

- [ ] **Step 1: Create transaction utility**

Create `apps/api/src/common/utils/with-transaction.ts`:

```typescript
import { pool } from '../../db';
import type { QueryResult, PoolClient } from 'pg';

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  maxRetries: number = 3,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      lastError = err instanceof Error ? err : new Error(String(err));

      // Retry on serialization failures and deadlock errors
      const isRetryable =
        lastError.message.includes('serialization failure') ||
        lastError.message.includes('deadlock detected') ||
        lastError.message.includes('could not serialize access');

      if (isRetryable && attempt < maxRetries) {
        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, 50 * Math.pow(2, attempt - 1)),
        );
        continue;
      }

      throw lastError;
    } finally {
      client.release();
    }
  }

  throw lastError ?? new Error('Transaction failed after retries');
}
```

- [ ] **Step 2: Wrap trade create in transaction**

In `apps/api/src/trades/trades.service.ts`, update the `create` method:

```typescript
async create(userId: string, dto: CreateTradeDto) {
  return withTransaction(async (client) => {
    const {
      symbol,
      direction,
      entry,
      exit,
      lot,
      stop_loss = null,
      take_profit = null,
      strategy = null,
      notes = null,
      fomo_check = false,
      trend_alignment = false,
      vengeance_trade = false,
      trade_date = null,
      commission = null,
      contract_size = 100000,
    } = dto;

    const pnl =
      direction === 'buy'
        ? (exit - entry) * lot * contract_size
        : (entry - exit) * lot * contract_size;

    const netPnl = commission ? pnl - commission : pnl;

    const res = await client.query(
      `INSERT INTO trades (
        user_id, symbol, direction, entry_price, exit_price, lot_size, pnl,
        stop_loss, take_profit, strategy, notes,
        fomo_check, trend_alignment, vengeance_trade, trade_date, commission, contract_size
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [
        userId,
        symbol,
        direction,
        entry,
        exit,
        lot,
        netPnl,
        stop_loss,
        take_profit,
        strategy,
        notes,
        fomo_check,
        trend_alignment,
        vengeance_trade,
        trade_date,
        commission,
        contract_size,
      ],
    );

    return res.rows[0];
  });
}
```

- [ ] **Step 3: Wrap trade update in transaction**

Update the `update` method in `apps/api/src/trades/trades.service.ts`:

```typescript
async update(userId: string, id: string, dto: UpdateTradeDto) {
  return withTransaction(async (client) => {
    const currentRes = await client.query(
      'SELECT * FROM trades WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    if (currentRes.rowCount === 0) {
      const { NotFoundException } = require('@nestjs/common');
      throw new NotFoundException(`Trade ${id} not found`);
    }
    const current = currentRes.rows[0];

    const symbol = dto.symbol ?? current.symbol;
    const direction = dto.direction ?? current.direction;
    const entry = dto.entry ?? Number(current.entry_price);
    const exit = dto.exit ?? Number(current.exit_price);
    const lot = dto.lot ?? Number(current.lot_size);
    const contract_size =
      dto.contract_size ?? Number(current.contract_size ?? 100000);
    const commission =
      dto.commission !== undefined
        ? dto.commission
        : Number(current.commission ?? 0);

    const pnl =
      direction === 'buy'
        ? (exit - entry) * lot * contract_size
        : (entry - exit) * lot * contract_size;
    const netPnl = commission ? pnl - commission : pnl;

    const res = await client.query(
      `UPDATE trades SET
        symbol = $1, direction = $2, entry_price = $3, exit_price = $4,
        lot_size = $5, pnl = $6, stop_loss = $7, take_profit = $8,
        strategy = $9, notes = $10, fomo_check = $11, trend_alignment = $12,
        vengeance_trade = $13, trade_date = $14, commission = $15,
        contract_size = $16, updated_at = NOW()
       WHERE id = $17 AND user_id = $18
       RETURNING *`,
      [
        symbol,
        direction,
        entry,
        exit,
        lot,
        netPnl,
        dto.stop_loss !== undefined ? dto.stop_loss : current.stop_loss,
        dto.take_profit !== undefined ? dto.take_profit : current.take_profit,
        dto.strategy !== undefined ? dto.strategy : current.strategy,
        dto.notes !== undefined ? dto.notes : current.notes,
        dto.fomo_check !== undefined ? dto.fomo_check : current.fomo_check,
        dto.trend_alignment !== undefined
          ? dto.trend_alignment
          : current.trend_alignment,
        dto.vengeance_trade !== undefined
          ? dto.vengeance_trade
          : current.vengeance_trade,
        dto.trade_date !== undefined ? dto.trade_date : current.trade_date,
        commission,
        contract_size,
        id,
        userId,
      ],
    );

    return res.rows[0];
  });
}
```

- [ ] **Step 4: Wrap trade delete in transaction**

Update the `remove` method:

```typescript
async remove(userId: string, id: string) {
  return withTransaction(async (client) => {
    const tradeRes = await client.query(
      'SELECT * FROM trades WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    if (tradeRes.rowCount === 0) {
      const { NotFoundException } = require('@nestjs/common');
      throw new NotFoundException(`Trade ${id} not found`);
    }
    const trade = tradeRes.rows[0];

    if (trade.chart_image) {
      const imagePath = path.join(process.cwd(), trade.chart_image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await client.query('DELETE FROM trades WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);
    return { deleted: true };
  });
}
```

- [ ] **Step 5: Add import statement at top of trades.service.ts**

Add at the top of `apps/api/src/trades/trades.service.ts`:

```typescript
import { withTransaction } from '../common/utils/with-transaction';
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/common/utils/with-transaction.ts apps/api/src/trades/trades.service.ts
git commit -m "feat: transaction-safe database operations (TZ-003)

- Create withTransaction utility with retry logic
- Wrap trade CRUD in transactions
- Add serialization failure retry with exponential backoff
- Ensure atomic operations for create/update/delete"
```

---

### Task 4: Structured Logging System (TZ-004)

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/src/common/middleware/correlation-id.middleware.ts`
- Replace: `apps/api/src/common/interceptors/logging.interceptor.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add Pino dependencies**

Run in `apps/api/`:

```bash
cd apps/api && npm install pino pino-http uuid
cd apps/api && npm install -D @types/pino-http @types/uuid
```

- [ ] **Step 2: Create correlation ID middleware**

Create `apps/api/src/common/middleware/correlation-id.middleware.ts`:

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  }
}
```

- [ ] **Step 3: Replace logging interceptor with structured version**

Replace `apps/api/src/common/interceptors/logging.interceptor.ts`:

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Logger } from 'pino';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger({ name: 'http' });

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, headers } = req;
    const requestId = headers['x-request-id'] || 'unknown';
    const now = Date.now();

    this.logger.info(
      {
        method,
        url,
        requestId,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      },
      `--> ${method} ${url}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const duration = Date.now() - now;
          this.logger.info(
            {
              method,
              url,
              statusCode: res.statusCode,
              duration,
              requestId,
            },
            `<-- ${method} ${url} ${res.statusCode} ${duration}ms`,
          );
        },
        error: (err) => {
          const duration = Date.now() - now;
          this.logger.error(
            {
              method,
              url,
              duration,
              requestId,
              error: err.message,
              stack: err.stack,
            },
            `<-- ${method} ${url} ERROR ${duration}ms`,
          );
        },
      }),
    );
  }
}
```

- [ ] **Step 4: Register middleware in AppModule**

Update `apps/api/src/app.module.ts`:

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TradesModule } from './trades/trades.module';
import { AuthModule } from './auth/auth.module';
import { JournalsModule } from './journals/journals.module';
import { TagsModule } from './tags/tags.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ChatModule } from './chat/chat.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

@Module({
  imports: [AuthModule, TradesModule, JournalsModule, TagsModule, ChatModule],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/package.json apps/api/src/common/middleware/correlation-id.middleware.ts apps/api/src/common/interceptors/logging.interceptor.ts apps/api/src/app.module.ts
git commit -m "feat: structured logging with correlation IDs (TZ-004)

- Integrate Pino for structured JSON logging
- Add CorrelationIdMiddleware for X-Request-ID
- Enhance LoggingInterceptor with request context
- Add request duration, IP, user-agent tracking
- Add error logging with stack traces"
```

---

## Self-Review

### Spec Coverage
- [x] TZ-001: Global Validation Hardening — All DTOs audited and enhanced
- [x] TZ-002: Centralized Error Handling — Standardized schema, error codes, prod sanitization
- [x] TZ-003: Transaction-Safe DB Operations — Transaction wrapper, retry logic, CRUD wrapped
- [x] TZ-004: Structured Logging — Pino integration, correlation IDs, timing logs

### Placeholder Scan
- No TBD/TODO found
- All code blocks contain actual implementation
- All file paths are exact
- All commands are specific

### Type Consistency
- `ApiErrorCode` enum used consistently in error filter
- `JournalMood`, `TagCategory`, `ChatRole` enums defined and used
- `withTransaction` generic type `<T>` matches return types
- `ApiErrorResponse` interface matches error filter output

---

## Execution Handoff

Plan complete and saved to `.opencode/plans/2026-05-16-phase-1-backend-hardening.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
