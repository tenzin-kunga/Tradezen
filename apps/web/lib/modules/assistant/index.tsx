"use client";

import { Sparkles } from "lucide-react";
import type {
  WorkspaceModule,
  RouteCapability,
  ContextCapability,
  CommandCapability,
} from "@/lib/workspace/types";
import { RouteCapability as RouteCap } from "@/lib/workspace/types";
import { ContextCapability as ContextCap } from "@/lib/workspace/types";
import { CommandCapability as CommandCap } from "@/lib/workspace/types";
import AssistantWorkspace from "@/components/assistant/AssistantWorkspace";

const COMMANDS: CommandCapability["commands"] = [
  {
    namespace: "module",
    command: "assistant",
    label: "Open Assistant",
    description: "Open the AI trading assistant",
    handler: () => {},
  },
  {
    namespace: "ai",
    command: "research",
    label: "Research",
    description: "Research a symbol or topic",
    handler: () => {},
  },
  {
    namespace: "ai",
    command: "review",
    label: "Review",
    description: "Review your recent trades",
    handler: () => {},
  },
  {
    namespace: "ai",
    command: "explain",
    label: "Explain",
    description: "Explain a trade or pattern",
    handler: () => {},
  },
];

const CONTEXT_CONTRIBUTOR: ContextCapability["contributor"] = {
  priority: 5,
  budget: 200,
  estimateTokens(_resource) {
    return 50;
  },
  async getContext(resource) {
    return {
      source: "assistant",
      data: {
        conversationId: resource.metadata?.conversationId || resource.id,
        title: resource.title,
      },
      tokens: 30,
    };
  },
};

export const AssistantModule: WorkspaceModule = {
  metadata: {
    id: "assistant",
    name: "Assistant",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: <Sparkles size={18} /> as any,
    description: "AI trading assistant",
    navGroup: "primary",
    navOrder: 1,
  },
  capabilities: [
    new RouteCap([
      {
        path: "/assistant",
        component: AssistantWorkspace,
        title: "Assistant",
      },
    ]),
    new ContextCap(CONTEXT_CONTRIBUTOR),
    new CommandCap(COMMANDS),
  ],
};
