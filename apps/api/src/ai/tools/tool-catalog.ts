import type { ToolDefinition } from '../ai-client';
import type { WorkspaceAction } from '../context/context-provider';

export type ToolPermission = 'read' | 'write' | 'system';

export interface ToolMetadata {
  latencyMs: number;
  source: string;
  rowCount?: number;
  [key: string]: unknown;
}

export type PartialToolMetadata = Partial<ToolMetadata>;

export interface ToolResult {
  content: string;
  success: boolean;
  metadata: ToolMetadata;
  suggestedActions?: WorkspaceAction[];
}

export interface ToolExecutor {
  execute(
    args: Record<string, unknown>,
    ctx: ToolExecContext,
  ): Promise<ToolResult>;
}

export interface ToolExecContext {
  userId: string;
}

export interface ToolSpec {
  definition: ToolDefinition;
  permission: ToolPermission;
  timeoutMs: number;
  cacheTTLMs: number;
  executor: ToolExecutor;
}

export class ToolCatalog {
  private readonly specs = new Map<string, ToolSpec>();

  register(spec: ToolSpec): void {
    this.specs.set(spec.definition.function.name, spec);
  }

  getDefinitions(): ToolDefinition[] {
    return [...this.specs.values()].map((s) => s.definition);
  }

  get(name: string): ToolSpec | undefined {
    return this.specs.get(name);
  }

  names(): string[] {
    return [...this.specs.keys()];
  }
}
