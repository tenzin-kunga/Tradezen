import type { ReactNode } from "react";

// ─── Resource ────────────────────────────────

export type ResourceType =
  | "trade"
  | "journal"
  | "conversation"
  | "research"
  | "watchlist"
  | "calendar"
  | "file"
  | "report"
  | "knowledge_folder"
  | "knowledge_document";

export interface WorkspaceResource {
  id: string;
  type: ResourceType;
  title: string;
  icon?: ReactNode;
  url: string;
  metadata?: Record<string, unknown>;
}

// ─── Event Bus ───────────────────────────────

export type WorkspaceEventType =
  | "trade.created"
  | "trade.updated"
  | "trade.deleted"
  | "journal.saved"
  | "watchlist.created"
  | "watchlist.updated"
  | "watchlist.deleted"
  | "conversation.created"
  | "conversation.renamed"
  | "conversation.deleted"
  | "context.changed"
  | "workspace.tabOpened"
  | "workspace.tabClosed"
  | "assistant.messageCompleted";

export interface WorkspaceEvent {
  type: WorkspaceEventType;
  resource?: WorkspaceResource;
  payload?: unknown;
  timestamp: number;
}

export type EventHandler = (event: WorkspaceEvent) => void;

// ─── Tab ─────────────────────────────────────

export interface Tab {
  id: string;
  resource: WorkspaceResource;
  pinned: boolean;
  closable: boolean;
}

// ─── Capabilities ────────────────────────────

export interface WorkspaceCapability {
  readonly kind: string;
}

export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  title?: string;
}

export interface SlashCommand {
  namespace: "global" | "ai" | "module";
  command: string;
  label: string;
  description: string;
  icon?: ReactNode;
  handler: (args: string) => void;
}

export interface ContextContributor {
  priority: number;
  budget: number; // max tokens to contribute
  estimateTokens(resource: WorkspaceResource): number;
  getContext(resource: WorkspaceResource): Promise<ContextSlice>;
}

export interface ContextSlice {
  source: string;
  data: Record<string, unknown>;
  tokens: number; // actual tokens used
}

export interface SearchResult {
  resource: WorkspaceResource;
  score: number;
  highlights: string[];
  actions: WorkspaceAction[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon?: ReactNode;
  action: () => void;
}

export interface WidgetConfig {
  id: string;
  title: string;
  component: React.ComponentType;
  size?: "sm" | "md" | "lg";
}

export interface ShortcutConfig {
  key: string;
  label: string;
  handler: () => void;
}

export interface ActionConfig {
  id: string;
  label: string;
  icon?: ReactNode;
  handler: (context: WorkspaceResource) => void;
}

// ─── Module ──────────────────────────────────

export interface ModuleMetadata {
  id: string;
  name: string;
  icon: ReactNode;
  description?: string;
  navGroup: "primary" | "secondary" | "tools";
  navOrder: number;
}

export interface WorkspaceModule {
  metadata: ModuleMetadata;
  capabilities: WorkspaceCapability[];
}

// ─── Tool Registry ───────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: unknown, context: ContextSlice[]) => Promise<ToolResult>;
}

export interface ToolResult {
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ToolRegistry {
  register(tool: ToolDefinition): void;
  get(name: string): ToolDefinition | undefined;
  getAll(): ToolDefinition[];
}

export interface AgentRuntime {
  execute(
    toolName: string,
    args: unknown,
    context: ContextSlice[],
  ): Promise<ToolResult>;
}

// ─── Workspace Action ────────────────────────

export interface WorkspaceAction {
  id: string;
  label: string;
  icon?: ReactNode;
  run(context: WorkspaceContext): Promise<void>;
}

export interface WorkspaceContext {
  resource: WorkspaceResource | null;
  selection: WorkspaceResource | null;
  context: ContextSlice[];
}

// ─── Manager Interfaces ──────────────────────

export interface ResourceManager {
  open(resource: WorkspaceResource): void;
  close(id: string): void;
  getActive(): WorkspaceResource | null;
  getAll(): WorkspaceResource[];
  getTabs(): Tab[];
  getActiveId(): string | null;
  setActive(id: string): void;
  togglePin(id: string): void;
  subscribe(listener: () => void): () => void;
  back(): void;
  forward(): void;
  canGoBack(): boolean;
  canGoForward(): boolean;
}

export interface SelectionManager {
  getSelected(): WorkspaceResource | null;
  select(resource: WorkspaceResource): void;
  subscribe(listener: () => void): () => void;
}

// ─── Capability Classes ──────────────────────

export class RouteCapability implements WorkspaceCapability {
  readonly kind = "route" as const;
  constructor(public routes: RouteConfig[]) {}
}

export class SearchCapability implements WorkspaceCapability {
  readonly kind = "search" as const;
  constructor(public provider: SearchProvider) {}
}

export class ContextCapability implements WorkspaceCapability {
  readonly kind = "context" as const;
  constructor(public contributor: ContextContributor) {}
}

export class ToolCapability implements WorkspaceCapability {
  readonly kind = "tool" as const;
  constructor(public tools: ToolDefinition[]) {}
}

export class WidgetCapability implements WorkspaceCapability {
  readonly kind = "widget" as const;
  constructor(public widgets: WidgetConfig[]) {}
}

export class CommandCapability implements WorkspaceCapability {
  readonly kind = "command" as const;
  constructor(public commands: SlashCommand[]) {}
}

export class ShortcutCapability implements WorkspaceCapability {
  readonly kind = "shortcut" as const;
  constructor(public shortcuts: ShortcutConfig[]) {}
}

export class ActionCapability implements WorkspaceCapability {
  readonly kind = "action" as const;
  constructor(public actions: ActionConfig[]) {}
}

// ─── Inspector ───────────────────────────────

export interface InspectorSection {
  id: string;
  title: string;
  component: React.ComponentType<{ resource: WorkspaceResource }>;
  priority: number;
}

export class InspectorCapability implements WorkspaceCapability {
  readonly kind = "inspector" as const;
  constructor(public sections: InspectorSection[]) {}
}

// ─── Collection ──────────────────────────────

export type CollectionType =
  | "watchlist"
  | "research_folder"
  | "memory"
  | "conversation_folder";

export interface WorkspaceCollection {
  id: string;
  type: CollectionType;
  name: string;
  icon?: ReactNode;
  metadata?: Record<string, unknown>;
}

// ─── Search Registry ─────────────────────────

export interface SearchProvider {
  search(query: string): Promise<SearchResult[]>;
  recent(): Promise<SearchResult[]>;
  favorites(): Promise<SearchResult[]>;
  related(resource: WorkspaceResource): Promise<SearchResult[]>;
  quickActions(): QuickAction[];
}
