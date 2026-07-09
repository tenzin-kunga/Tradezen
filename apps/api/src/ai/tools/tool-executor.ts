import { Logger } from '@nestjs/common';
import type { ToolCall } from '../ai-client';
import { ToolCatalog, type ToolResult } from './tool-catalog';

export class ToolExecutor {
  private readonly logger = new Logger(ToolExecutor.name);

  constructor(private readonly catalog: ToolCatalog) {}

  async run(call: ToolCall, userId: string): Promise<ToolResult> {
    const spec = this.catalog.get(call.function.name);
    if (!spec) {
      return {
        content: `Unknown tool: ${call.function.name}`,
        success: false,
        metadata: { latencyMs: 0, source: 'tool-executor' },
      };
    }

    let args: Record<string, unknown>;
    try {
      args = JSON.parse(call.function.arguments || '{}') as Record<
        string,
        unknown
      >;
    } catch (e) {
      return {
        content: `Invalid tool arguments for ${call.function.name}: ${
          e instanceof Error ? e.message : 'parse error'
        }`,
        success: false,
        metadata: { latencyMs: 0, source: 'tool-executor' },
      };
    }

    const start = Date.now();
    try {
      const result = await Promise.race([
        spec.executor.execute(args, { userId }),
        this.timeout(spec.timeoutMs),
      ]);
      result.metadata.latencyMs = Date.now() - start;
      return result;
    } catch (e) {
      this.logger.warn(`Tool ${call.function.name} failed: ${e}`);
      return {
        content: `Tool ${call.function.name} failed: ${
          e instanceof Error ? e.message : 'unknown error'
        }`,
        success: false,
        metadata: { latencyMs: Date.now() - start, source: 'tool-executor' },
      };
    }
  }

  private timeout(ms: number): Promise<ToolResult> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms),
    );
  }
}
