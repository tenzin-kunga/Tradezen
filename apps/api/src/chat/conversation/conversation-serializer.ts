import type { ChatMessage } from '../../ai/ai-client';
import { ToolLifecycleStatus } from '../../ai/tools/tool-lifecycle';

export const CONVERSATION_METADATA_VERSION = 1;

export type ConversationMessageType = 'message' | 'tool_call' | 'tool_result';

export interface ToolCallMetadata {
  version: number;
  type: ConversationMessageType;
  toolName?: string;
  toolCallId?: string;
  status?: ToolLifecycleStatus;
  success?: boolean;
  latencyMs?: number;
  args?: Record<string, unknown>;
  result?: unknown;
  text?: string;
  historical?: boolean;
  [key: string]: unknown;
}

export interface StoredMessageRow {
  role: string;
  content: string;
  metadata: Record<string, unknown>;
}

function isToolCallMessage(msg: ChatMessage): boolean {
  return (
    msg.role === 'assistant' &&
    Array.isArray(msg.tool_calls) &&
    msg.tool_calls.length > 0
  );
}

function toToolCallMetadata(msg: ChatMessage): ToolCallMetadata {
  const call = msg.tool_calls?.[0];
  return {
    version: CONVERSATION_METADATA_VERSION,
    type: 'tool_call',
    toolName: msg.tool_calls?.[0]?.function.name,
    toolCallId: call?.id,
    status: ToolLifecycleStatus.STARTED,
    args: call ? safeParseArgs(call.function.arguments) : undefined,
  };
}

function toToolResultMetadata(msg: ChatMessage): ToolCallMetadata {
  const result = tryParseStructured(msg.content);
  return {
    version: CONVERSATION_METADATA_VERSION,
    type: 'tool_result',
    toolCallId: msg.tool_call_id,
    toolName: msg.name,
    status: ToolLifecycleStatus.COMPLETED,
    result: result.structured,
    text: result.text,
  };
}

function safeParseArgs(raw: string | undefined): Record<string, unknown> {
  try {
    return JSON.parse(raw || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

function tryParseStructured(content: string): {
  structured: unknown;
  text: string;
} {
  try {
    return { structured: JSON.parse(content), text: content };
  } catch {
    return { structured: { text: content }, text: content };
  }
}

export const ConversationSerializer = {
  serialize(msg: ChatMessage): StoredMessageRow {
    if (isToolCallMessage(msg)) {
      const meta = toToolCallMetadata(msg);
      return {
        role: 'assistant',
        content: JSON.stringify(meta.args ?? {}),
        metadata: meta,
      };
    }
    if (msg.role === 'tool') {
      const meta = toToolResultMetadata(msg);
      return {
        role: 'tool',
        content: meta.text ?? msg.content,
        metadata: meta,
      };
    }
    const meta: ToolCallMetadata = {
      version: CONVERSATION_METADATA_VERSION,
      type: 'message',
    };
    return { role: msg.role, content: msg.content, metadata: meta };
  },

  deserialize(row: StoredMessageRow, historical = false): ChatMessage {
    const meta = (row.metadata ?? {}) as Partial<ToolCallMetadata>;
    if (meta.version === undefined) {
      return { role: row.role as ChatMessage['role'], content: row.content };
    }
    return deserializeVersioned(row, meta, historical);
  },
};

function deserializeVersioned(
  row: StoredMessageRow,
  meta: Partial<ToolCallMetadata>,
  historical: boolean,
): ChatMessage {
  switch (meta.version) {
    case 1:
      return deserializeV1(row, meta, historical);
    default:
      // Unknown future version — best-effort fallback.
      return { role: row.role as ChatMessage['role'], content: row.content };
  }
}

function deserializeV1(
  row: StoredMessageRow,
  meta: Partial<ToolCallMetadata>,
  historical: boolean,
): ChatMessage {
  if (meta.type === 'tool_call') {
    return {
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: meta.toolCallId ?? '',
          type: 'function',
          function: {
            name: meta.toolName ?? 'unknown',
            arguments: JSON.stringify(meta.args ?? {}),
          },
        },
      ],
    };
  }
  if (meta.type === 'tool_result') {
    // Replay safety: rehydrated tool results are historical, never "running now".
    return {
      role: 'tool',
      content: meta.text ?? row.content,
      tool_call_id: meta.toolCallId,
      name: meta.toolName,
      // ponytail: historical flag lives on the message so future write-tool
      // tooling can distinguish "ran yesterday" from "running now".
      ...(historical ? { historical: true as const } : {}),
    };
  }
  return { role: row.role as ChatMessage['role'], content: row.content };
}
