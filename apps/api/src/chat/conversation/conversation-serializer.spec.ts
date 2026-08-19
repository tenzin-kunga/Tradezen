import { ConversationSerializer } from './conversation-serializer';
import type { ChatMessage } from '../../ai/ai-client';

describe('ConversationSerializer', () => {
  it('serializes a tool_call message with structured args', () => {
    const msg: ChatMessage = {
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: 'c1',
          type: 'function',
          function: { name: 'get_analytics', arguments: '{"x":1}' },
        },
      ],
    };
    const row = ConversationSerializer.serialize(msg);
    expect(row.role).toBe('assistant');
    expect(row.metadata.type).toBe('tool_call');
    expect(row.metadata.toolName).toBe('get_analytics');
    expect(row.metadata.toolCallId).toBe('c1');
    expect(row.metadata.args).toEqual({ x: 1 });
    expect(row.metadata.version).toBe(1);
  });

  it('serializes a tool_result message with structured + display data', () => {
    const msg: ChatMessage = {
      role: 'tool',
      content: '{"winRate":63,"profitFactor":2.1}',
      tool_call_id: 'c1',
      name: 'get_analytics',
    };
    const row = ConversationSerializer.serialize(msg);
    expect(row.metadata.type).toBe('tool_result');
    expect(row.metadata.toolCallId).toBe('c1');
    expect(row.metadata.result).toEqual({ winRate: 63, profitFactor: 2.1 });
    expect(row.metadata.text).toBe('{"winRate":63,"profitFactor":2.1}');
  });

  it('round-trips a tool call + result into OpenAI-shaped messages', () => {
    const call: ChatMessage = {
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: 'c1',
          type: 'function',
          function: { name: 'get_analytics', arguments: '{}' },
        },
      ],
    };
    const result: ChatMessage = {
      role: 'tool',
      content: '{"winRate":63}',
      tool_call_id: 'c1',
      name: 'get_analytics',
    };
    const callRow = ConversationSerializer.serialize(call);
    const resultRow = ConversationSerializer.serialize(result);

    const backCall = ConversationSerializer.deserialize(callRow, true);
    const backResult = ConversationSerializer.deserialize(resultRow, true);

    expect(backCall.role).toBe('assistant');
    expect(backCall.tool_calls?.[0].id).toBe('c1');
    expect(backCall.tool_calls?.[0].function.name).toBe('get_analytics');
    expect(backResult.role).toBe('tool');
    expect(backResult.tool_call_id).toBe('c1');
    expect((backResult as { historical?: boolean }).historical).toBe(true);
  });

  it('marks rehydrated rows as historical', () => {
    const result: ChatMessage = {
      role: 'tool',
      content: 'hi',
      tool_call_id: 'c1',
      name: 'get_analytics',
    };
    const back = ConversationSerializer.deserialize(
      ConversationSerializer.serialize(result),
      true,
    );
    expect((back as { historical?: boolean }).historical).toBe(true);
  });

  it('falls back to plain role mapping for legacy rows (no version)', () => {
    const back = ConversationSerializer.deserialize({
      role: 'user',
      content: 'hi',
      metadata: {},
    });
    expect(back.role).toBe('user');
    expect(back.content).toBe('hi');
  });
});
