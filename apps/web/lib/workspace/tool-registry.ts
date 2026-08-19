import type {
  ToolDefinition,
  ToolRegistry,
  ToolResult,
  ContextSlice,
  AgentRuntime,
} from "./types";

class ToolRegistryImpl implements ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      console.warn(
        `[ToolRegistry] Tool "${tool.name}" already registered, overwriting`,
      );
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
}

class AgentRuntimeImpl implements AgentRuntime {
  private toolRegistry: ToolRegistry;

  constructor(toolRegistry: ToolRegistry) {
    this.toolRegistry = toolRegistry;
  }

  async execute(
    toolName: string,
    args: unknown,
    context: ContextSlice[],
  ): Promise<ToolResult> {
    const tool = this.toolRegistry.get(toolName);
    if (!tool) {
      return {
        content: `Tool "${toolName}" not found`,
        metadata: { error: true },
      };
    }
    return tool.execute(args, context);
  }
}

let toolRegistryInstance: ToolRegistryImpl | null = null;
let agentRuntimeInstance: AgentRuntimeImpl | null = null;

export function getToolRegistry(): ToolRegistryImpl {
  if (!toolRegistryInstance) {
    toolRegistryInstance = new ToolRegistryImpl();
  }
  return toolRegistryInstance;
}

export function getAgentRuntime(): AgentRuntimeImpl {
  if (!agentRuntimeInstance) {
    agentRuntimeInstance = new AgentRuntimeImpl(getToolRegistry());
  }
  return agentRuntimeInstance;
}
