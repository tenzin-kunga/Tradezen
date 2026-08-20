import { test, expect, mock } from "bun:test";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import type { UseChatReturn } from "../useChat";
import { getReadyThreads } from "@/lib/chat/activity";
import type {
  Thread,
  ThreadMessage,
  StreamChatParams,
} from "@/lib/api/assistant";

// ─── Minimal DOM for React 18 createRoot under bun ──────────────────────────

const g = globalThis as unknown as Record<string, unknown>;
g.IS_REACT_ACT_ENVIRONMENT = true;
g.window = globalThis;
g.self = globalThis;
g.navigator = { userAgent: "bun" };
for (const name of [
  "Element",
  "Node",
  "Text",
  "Comment",
  "HTMLElement",
  "HTMLDivElement",
  "HTMLIFrameElement",
  "Document",
  "DocumentFragment",
  "Event",
  "CustomEvent",
  "MouseEvent",
  "KeyboardEvent",
  "FocusEvent",
  "InputEvent",
  "UIEvent",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "HTMLButtonElement",
  "HTMLFormElement",
]) {
  if (!g[name]) g[name] = class {};
}

interface FakeElement {
  nodeType: number;
  nodeName: string;
  tagName: string;
  ownerDocument: unknown;
  appendChild: (c: FakeElement) => FakeElement;
  removeChild: (c: FakeElement) => FakeElement;
  insertBefore: (c: FakeElement) => FakeElement;
  addEventListener: () => void;
  removeEventListener: () => void;
  setAttribute: () => void;
  removeAttribute: () => void;
  getAttribute: () => string | null;
  style: Record<string, unknown>;
  childNodes: FakeElement[];
  firstChild: null;
  textContent: string;
  innerHTML: string;
}

function makeFakeEl(): FakeElement {
  const children: FakeElement[] = [];
  return {
    nodeType: 1,
    nodeName: "DIV",
    tagName: "DIV",
    ownerDocument: g.document,
    appendChild: (c: FakeElement) => {
      children.push(c);
      return c;
    },
    removeChild: (c: FakeElement) => {
      const i = children.indexOf(c);
      if (i >= 0) children.splice(i, 1);
      return c;
    },
    insertBefore: (c: FakeElement) => {
      children.push(c);
      return c;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    getAttribute: () => null,
    style: {},
    childNodes: children,
    firstChild: null,
    textContent: "",
    innerHTML: "",
  };
}

g.document = {
  nodeType: 9,
  createElement: () => makeFakeEl(),
  createTextNode: () => makeFakeEl(),
  documentElement: makeFakeEl(),
  getElementById: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
};

// ─── Mocked modules ──────────────────────────────────────────────────────────

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const state: {
  threads: Array<Partial<Thread> & { id: string }>;
  lastThread: string | null;
  createCalls: {
    title: string | undefined;
    d: ReturnType<typeof deferred<{ id: string }>>;
  }[];
  msgCalls: { id: string; d: ReturnType<typeof deferred<ThreadMessage[]>> }[];
  streamCalls: {
    params: StreamChatParams;
    d: ReturnType<typeof deferred<void>>;
  }[];
  titleCalls: [string, string][];
  msgFixture: Record<string, ThreadMessage[]>;
} = {
  threads: [],
  lastThread: null,
  createCalls: [],
  msgCalls: [],
  streamCalls: [],
  titleCalls: [],
  msgFixture: {},
};

function resetState() {
  state.threads = [];
  state.lastThread = null;
  state.createCalls = [];
  state.msgCalls = [];
  state.streamCalls = [];
  state.titleCalls = [];
  state.msgFixture = {};
}

mock.module("@/lib/api/assistant", () => ({
  getThreads: async () => [...state.threads],
  searchThreads: async () => [...state.threads],
  createThread: (title?: string) => {
    const d = deferred<{ id: string }>();
    state.createCalls.push({ title, d });
    return d.promise;
  },
  deleteThread: async () => {},
  getThreadMessages: (id: string) => {
    const d = deferred<ThreadMessage[]>();
    state.msgCalls.push({ id, d });
    return d.promise;
  },
  updateThreadTitle: async (id: string, title: string) => {
    state.titleCalls.push([id, title]);
  },
  togglePinThread: async () => ({ pinned: false }),
  streamChat: (params: StreamChatParams) => {
    const d = deferred<void>();
    state.streamCalls.push({ params, d });
    return d.promise;
  },
}));

mock.module("@/lib/api/assistant/stream", () => ({
  cancelStream: async () => {},
}));

mock.module("@/hooks/use-realtime", () => ({
  useRealtime: () => {},
}));

mock.module("@/lib/workspace/persistence", () => ({
  loadChatModel: () => "",
  saveChatModel: () => {},
  loadLastThread: () => state.lastThread,
  saveLastThread: (id: string | null) => {
    state.lastThread = id;
  },
}));

// ─── Harness ────────────────────────────────────────────────────────────────

let useChatModule: typeof import("../useChat") | null = null;
async function getUseChat() {
  if (!useChatModule) useChatModule = await import("../useChat");
  return useChatModule;
}

interface Handles {
  api: UseChatReturn;
  send: UseChatReturn["send"];
  create: UseChatReturn["createThread"];
  selectThread: UseChatReturn["selectThread"];
  refreshThreads: UseChatReturn["refreshThreads"];
}

function renderHook() {
  const container = makeFakeEl();
  let handles: Handles | null = null;
  let root!: Root;
  const Harness = () => {
    const c = useChatModule!.useChat();
    handles = {
      api: c,
      send: c.send,
      create: c.createThread,
      selectThread: c.selectThread,
      refreshThreads: c.refreshThreads,
    };
    return null;
  };
  act(() => {
    root = createRoot(container as unknown as Element);
    root.render(React.createElement(Harness));
  });
  return {
    h: () => {
      if (!handles) throw new Error("not rendered");
      return handles;
    },
    unmount: () => act(() => root.unmount()),
  };
}

// Deterministic microtask drain (no timers) so chained async work settles.
async function settle() {
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}

async function ticks(n = 10) {
  for (let i = 0; i < n; i++) await Promise.resolve();
}

function resolveMsgLoads(fixture: Record<string, ThreadMessage[]> = {}) {
  for (const c of state.msgCalls) {
    c.d.resolve(fixture[c.id] ?? []);
  }
  state.msgCalls.length = 0;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test("pending '+' create followed by quick send resolves to exactly one thread", async () => {
  resetState();
  await getUseChat();
  const h = renderHook();
  await settle();

  let createP!: Promise<string>;
  let sendP!: Promise<void>;
  await act(async () => {
    createP = h.h().create(); // sidebar "+" — async, in flight
    sendP = h.h().send("hello"); // quick send before creation resolves
  });
  // Both calls must coalesce into a SINGLE API create.
  expect(state.createCalls.length).toBe(1);

  await act(async () => {
    state.createCalls[0].d.resolve({ id: "T1" });
    await ticks();
    expect(state.streamCalls.length).toBe(1);
    state.streamCalls[0].params.onDone();
    state.streamCalls[0].d.resolve();
    await Promise.all([createP, sendP]);
  });
  await settle();

  expect(state.createCalls.length).toBe(1); // never created a second thread
  expect(state.streamCalls[0].params.threadId).toBe("T1");
  expect(state.titleCalls[0][0]).toBe("T1");
  expect(state.lastThread).toBe("T1");
  expect(h.h().api.thread?.id).toBe("T1");
  expect(
    h.h().api.messages.some((m) => m.role === "user" && m.content === "hello"),
  ).toBe(true);
});

test("normal send with no active thread creates one thread and uses its id", async () => {
  resetState();
  await getUseChat();
  const h = renderHook();
  await settle();

  await act(async () => {
    const p = h.h().send("hi");
    state.createCalls[0].d.resolve({ id: "T1" });
    await ticks();
    state.streamCalls[0].params.onDone();
    state.streamCalls[0].d.resolve();
    await p;
  });
  await settle();

  expect(state.createCalls.length).toBe(1);
  expect(state.streamCalls[0].params.threadId).toBe("T1");
  expect(state.titleCalls[0][0]).toBe("T1");
});

test("history for a newly created thread never leaks the previous conversation", async () => {
  resetState();
  state.threads = [{ id: "T1", title: "First" }];
  state.lastThread = "T1";
  state.msgFixture["T1"] = [
    {
      role: "assistant",
      content: "old history",
      metadata: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ];
  await getUseChat();
  const h = renderHook();
  await settle();
  await act(async () => {
    resolveMsgLoads(state.msgFixture);
  });
  await settle();
  expect(h.h().api.messages.map((m) => m.content)).toContain("old history");

  await act(async () => {
    const createP = h.h().create();
    const sendP = h.h().send("hello");
    state.createCalls[0].d.resolve({ id: "T2" });
    await ticks();
    // The stale closure's messages (T1's history) must not be forwarded.
    expect(state.streamCalls[0].params.messages).toEqual([
      { role: "user", content: "hello" },
    ]);
    state.streamCalls[0].params.onDone();
    state.streamCalls[0].d.resolve();
    await Promise.all([createP, sendP]);
  });
  await settle();
  expect(state.streamCalls[0].params.threadId).toBe("T2");
});

test("sending again on the active thread reuses it — no second thread is created", async () => {
  resetState();
  await getUseChat();
  const h = renderHook();
  await settle();

  await act(async () => {
    const p = h.h().send("first");
    state.createCalls[0].d.resolve({ id: "T1" });
    await ticks();
    state.streamCalls[0].params.onDone();
    state.streamCalls[0].d.resolve();
    await p;
  });
  await settle();
  expect(h.h().api.thread?.id).toBe("T1");

  // Second send uses the now-active thread from the fresh render's closure.
  await act(async () => {
    const p = h.h().send("second");
    expect(state.createCalls.length).toBe(1); // no new create
    state.streamCalls[1].params.onDone();
    state.streamCalls[1].d.resolve();
    await p;
  });
  await settle();

  expect(state.createCalls.length).toBe(1);
  expect(state.streamCalls[1].params.threadId).toBe("T1");
  expect(h.h().api.messages.filter((m) => m.role === "user")).toHaveLength(2);
});

test("an active stream is not wiped by an unrelated thread-list restore", async () => {
  resetState();
  state.threads = [{ id: "T1", title: "First" }];
  state.lastThread = "T1";
  await getUseChat();
  const h = renderHook();
  await settle();
  await act(async () => {
    resolveMsgLoads();
  });
  await settle();
  expect(h.h().api.thread?.id).toBe("T1");

  // Start a stream (left pending) — sending state is now "active".
  let sendP!: Promise<void>;
  await act(async () => {
    sendP = h.h().send("hello");
  });
  expect(state.streamCalls.length).toBe(1);

  // Tokens are flowing.
  await act(async () => {
    state.streamCalls[0].params.onToken("partial");
  });
  await settle();
  const partial = h.h().api.messages.find((m) => m.role === "assistant");
  expect(partial?.content).toBe("partial");

  // A thread-list refresh re-runs the restore effect; it must be skipped while
  // a stream is active, otherwise it would wipe the in-progress conversation.
  await act(async () => {
    await h.h().refreshThreads();
  });
  await settle();
  expect(h.h().api.messages.find((m) => m.role === "assistant")?.content).toBe(
    "partial",
  );

  // Finish the stream cleanly.
  await act(async () => {
    state.streamCalls[0].params.onDone();
    state.streamCalls[0].d.resolve();
    await sendP;
  });
  await settle();
  expect(h.h().api.status).toBe("complete");
});

test("stale load for an inactive thread can never overwrite current messages", async () => {
  resetState();
  state.threads = [
    { id: "T1", title: "First" },
    { id: "T2", title: "Second" },
  ];
  await getUseChat();
  const h = renderHook();
  await settle();

  await act(async () => {
    await h.h().selectThread("T1");
    await h.h().selectThread("T2"); // switches away while T1's load is pending
  });
  // T1's load resolves AFTER the switch — the guard must discard it.
  await act(async () => {
    state.msgCalls[0].d.resolve([
      {
        role: "assistant",
        content: "STALE",
        metadata: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    await Promise.resolve();
  });
  await settle();
  expect(h.h().api.messages.some((m) => m.content === "STALE")).toBe(false);

  // T2's load (current thread) still lands.
  await act(async () => {
    state.msgCalls[1].d.resolve([
      {
        role: "assistant",
        content: "FRESH",
        metadata: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    await Promise.resolve();
  });
  await settle();
  expect(h.h().api.messages.some((m) => m.content === "FRESH")).toBe(true);
});

test("older background stream finishing cannot clear a newer stream's state", async () => {
  resetState();
  state.threads = [
    { id: "T1", title: "First" },
    { id: "T2", title: "Second" },
  ];
  state.lastThread = "T1";
  await getUseChat();
  const h = renderHook();
  await settle();
  await act(async () => {
    resolveMsgLoads();
  });
  await settle();

  // Establish a completed send on the restored T1 (no create — thread exists).
  await act(async () => {
    const p = h.h().send("first");
    state.streamCalls[0].params.onDone();
    state.streamCalls[0].d.resolve();
    await p;
  });
  await settle();

  // Create T2 and send to it (stream A, foreground).
  await act(async () => {
    const p = h.h().create();
    state.createCalls[0].d.resolve({ id: "T2" });
    await p;
  });
  await settle();
  let sendA!: Promise<void>;
  await act(async () => {
    sendA = h.h().send("to T2");
  });
  expect(state.streamCalls[1].params.threadId).toBe("T2");

  // Switch back to T1 and send there (stream B, newer).
  await act(async () => {
    await h.h().selectThread("T1");
    const load = state.msgCalls.find((c) => c.id === "T1");
    load?.d.resolve([]);
  });
  await settle();
  let sendB!: Promise<void>;
  await act(async () => {
    sendB = h.h().send("to T1");
  });
  expect(state.streamCalls[2].params.threadId).toBe("T1");

  // Finish B (newer) first — the older stream A is still active.
  await act(async () => {
    state.streamCalls[2].params.onDone();
    state.streamCalls[2].d.resolve();
    await sendB;
  });
  await settle();
  expect(h.h().api.status).toBe("complete");

  // A's (older, T2) tokens must never leak into T1's view — guarded by thread id.
  await act(async () => {
    state.streamCalls[1].params.onToken("FROM_A");
  });
  await settle();
  expect(h.h().api.messages.some((m) => m.content.includes("FROM_A"))).toBe(
    false,
  );

  // A thread-list change while A is still active must not wipe T1's view.
  await act(async () => {
    await h.h().refreshThreads();
  });
  await settle();
  expect(h.h().api.thread?.id).toBe("T1");
  expect(h.h().api.messages.length).toBeGreaterThan(0);

  // Finish A (older, background) — it only marks T2 ready, never clears T1.
  await act(async () => {
    state.streamCalls[1].params.onDone();
    state.streamCalls[1].d.resolve();
    await sendA;
  });
  await settle();
  expect(getReadyThreads().has("T2")).toBe(true);
  expect(h.h().api.messages.length).toBeGreaterThan(0);
});

test("selectThread on the already-active streaming thread is a no-op", async () => {
  resetState();
  state.threads = [{ id: "T1", title: "First" }];
  state.lastThread = "T1";
  await getUseChat();
  const h = renderHook();
  await settle();
  await act(async () => {
    resolveMsgLoads();
  });
  await settle();

  let sendP!: Promise<void>;
  await act(async () => {
    sendP = h.h().send("hello");
  });
  await act(async () => {
    state.streamCalls[0].params.onToken("flow");
  });
  await settle();

  // Re-selecting the live thread must not clear its in-progress messages.
  await act(async () => {
    await h.h().selectThread("T1");
  });
  await settle();
  expect(h.h().api.messages.find((m) => m.role === "assistant")?.content).toBe(
    "flow",
  );

  await act(async () => {
    state.streamCalls[0].params.onDone();
    state.streamCalls[0].d.resolve();
    await sendP;
  });
  await settle();
});

test("identical titles never affect which thread a message routes to", async () => {
  resetState();
  state.threads = [
    { id: "T1", title: "What is DCA?" },
    { id: "T2", title: "What is DCA?" },
  ];
  state.lastThread = "T2";
  await getUseChat();
  const h = renderHook();
  await settle();
  await act(async () => {
    resolveMsgLoads();
  });
  await settle();
  expect(h.h().api.thread?.id).toBe("T2");

  await act(async () => {
    const p = h.h().send("tell me more");
    expect(state.createCalls.length).toBe(0); // active T2, no create needed
    expect(state.streamCalls.length).toBe(1);
    // Routing is by thread id, never by title.
    expect(state.streamCalls[0].params.threadId).toBe("T2");
    state.streamCalls[0].params.onDone();
    state.streamCalls[0].d.resolve();
    await p;
  });
  await settle();

  // Title update (first exchange) targets the right thread id.
  expect(state.titleCalls[0][0]).toBe("T2");
  expect(state.titleCalls[0][1]).toBe("tell me more");
});
