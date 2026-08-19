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
import { ToolCapability as ToolCap } from "@/lib/workspace/types";
import type { ToolDefinition } from "@/lib/workspace/types";
import AssistantWorkspace from "@/components/assistant/AssistantWorkspace";
import { getResourceManager } from "@/lib/workspace/resource-manager";
import { createConversationResource } from "@/lib/workspace/resource";

const ASSISTANT_TOOLS: ToolDefinition[] = [
  {
    name: "open_assistant",
    description: "Open the AI trading assistant",
    parameters: {},
    async execute() {
      getResourceManager().open(
        createConversationResource("new", "New Conversation"),
      );
      return { content: "Opened assistant" };
    },
  },
];

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
    icon: <Sparkles size={18} />,
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
    new ToolCap(ASSISTANT_TOOLS),
  ],
};
