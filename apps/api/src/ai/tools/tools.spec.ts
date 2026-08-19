import { Planner } from './planner';
import { ToolCatalog, type ToolSpec } from './tool-catalog';
import { ToolExecutor } from './tool-executor';
import { AgentRuntime } from './agent-runtime';
import { toolsForIntent } from './intent';
import type { AIClient, ChatResponse, ToolCall } from '../ai-client';

function makeCatalog(): ToolCatalog {
  const catalog = new ToolCatalog();
  const spec: ToolSpec = {
    permission: 'read',
    timeoutMs: 1000,
    cacheTTLMs: 0,
    definition: {
      type: 'function',
      function: {
        name: 'get_analytics',
        description: 'd',
        parameters: { type: 'object', properties: {} },
      },
    },
    executor: {
      execute: async () => ({
        content: '{"winRate":0.5}',
        success: true,
        metadata: { latencyMs: 1, source: 'test' },
      }),
    },
  };
  catalog.register(spec);
  return catalog;
}

describe('Planner', () => {
  const planner = new Planner(3);

  it('finishes when no tool calls and under limit', () => {
    const resp: ChatResponse = {
      content: 'hi',
      model: 'm',
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    };
    expect(planner.decide(resp, 1)).toEqual({ kind: 'finish', content: 'hi' });
  });

  it('executes tool when tool_calls present', () => {
    const tc: ToolCall = {
      id: '1',
      type: 'function',
      function: { name: 'get_analytics', arguments: '{}' },
    };
    const resp: ChatResponse = {
      content: '',
      model: 'm',
      tool_calls: [tc],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    };
    const d = planner.decide(resp, 1);
    expect(d.kind).toBe('execute_tool');
  });

  it('forces max_iterations past the limit', () => {
    const resp: ChatResponse = {
      content: 'partial',
      model: 'm',
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    };
    const d = planner.decide(resp, 3) as any;
    expect(d.kind).toBe('max_iterations');
  });
});

describe('ToolExecutor', () => {
  it('runs a registered tool and returns its result', async () => {
    const exec = new ToolExecutor(makeCatalog());
    const call: ToolCall = {
      id: '1',
      type: 'function',
      function: { name: 'get_analytics', arguments: '{}' },
    };
    const r = await exec.run(call, 'user-1');
    expect(r.success).toBe(true);
    expect(r.content).toContain('winRate');
  });

  it('returns failure for unknown tool', async () => {
    const exec = new ToolExecutor(makeCatalog());
    const call: ToolCall = {
      id: '1',
      type: 'function',
      function: { name: 'nope', arguments: '{}' },
    };
    const r = await exec.run(call, 'user-1');
    expect(r.success).toBe(false);
  });

  it('returns failure for invalid json args', async () => {
    const exec = new ToolExecutor(makeCatalog());
    const call: ToolCall = {
      id: '1',
      type: 'function',
      function: { name: 'get_analytics', arguments: '{bad' },
    };
    const r = await exec.run(call, 'user-1');
    expect(r.success).toBe(false);
  });
});

describe('toolsForIntent', () => {
  it('maps a known intent to a tool subset', () => {
    expect(toolsForIntent('portfolio')).toContain('get_portfolio');
    expect(toolsForIntent('portfolio')).not.toContain('search_research');
  });

  it('falls back to default for unknown intent', () => {
    expect(toolsForIntent('bogus')).toContain('get_analytics');
  });
});

describe('AgentRuntime', () => {
  function fakeClient(responses: ChatResponse[]): AIClient {
    let i = 0;
    return {
      complete: async () => responses[Math.min(i++, responses.length - 1)],
    } as unknown as AIClient;
  }

  it('streams final answer when no tools are called', async () => {
    const client = fakeClient([
      {
        content: 'Answer here',
        model: 'm',
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      },
    ]);
    const runtime = new AgentRuntime(
      client,
      new Planner(3),
      new ToolExecutor(makeCatalog()),
    );
    const tokens: string[] = [];
    await runtime.run(
      'u',
      [{ role: 'user', content: 'go' }],
      { tools: [] },
      {
        onToken: (t) => tokens.push(t),
        onToolStatus: () => {},
        onDone: () => {},
      },
    );
    expect(tokens.join('')).toContain('Answer here');
  });

  it('executes a tool then emits a final answer', async () => {
    const tc: ToolCall = {
      id: 't1',
      type: 'function',
      function: { name: 'get_analytics', arguments: '{}' },
    };
    const client = fakeClient([
      {
        content: '',
        model: 'm',
        tool_calls: [tc],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      },
      {
        content: 'Based on analytics',
        model: 'm',
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      },
    ]);
    const runtime = new AgentRuntime(
      client,
      new Planner(3),
      new ToolExecutor(makeCatalog()),
    );
    const statuses: string[] = [];
    const tokens: string[] = [];
    await runtime.run(
      'u',
      [{ role: 'user', content: 'go' }],
      { tools: makeCatalog().getDefinitions() },
      {
        onToken: (t) => tokens.push(t),
        onToolStatus: (e) => statuses.push(e.status),
        onDone: () => {},
      },
    );
    expect(statuses).toEqual(['started', 'completed']);
    expect(tokens.join('')).toContain('Based on analytics');
  });
});
