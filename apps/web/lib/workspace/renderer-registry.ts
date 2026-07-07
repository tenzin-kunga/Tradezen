import type { ResourceType, WorkspaceResource } from "./types";
import type { ComponentType } from "react";

export interface ResourceRendererProps {
  resource: WorkspaceResource;
}

type ResourceRenderer = ComponentType<ResourceRendererProps>;

class RendererRegistryImpl {
  private renderers = new Map<ResourceType, ResourceRenderer>();
  private loading = new Map<ResourceType, Promise<ResourceRenderer>>();

  register(type: ResourceType, renderer: ResourceRenderer): void {
    this.renderers.set(type, renderer);
  }

  registerLazy(
    type: ResourceType,
    loader: () => Promise<{ default: ResourceRenderer }>,
  ): void {
    this.loading.set(
      type,
      loader().then((mod) => {
        const renderer = mod.default;
        this.renderers.set(type, renderer);
        this.loading.delete(type);
        return renderer;
      }),
    );
  }

  get(type: ResourceType): ResourceRenderer | undefined {
    return this.renderers.get(type);
  }

  async resolve(type: ResourceType): Promise<ResourceRenderer | undefined> {
    if (this.renderers.has(type)) {
      return this.renderers.get(type);
    }
    if (this.loading.has(type)) {
      return this.loading.get(type);
    }
    return undefined;
  }

  has(type: ResourceType): boolean {
    return this.renderers.has(type) || this.loading.has(type);
  }
}

let instance: RendererRegistryImpl | null = null;

export function getRendererRegistry(): RendererRegistryImpl {
  if (!instance) {
    instance = new RendererRegistryImpl();
  }
  return instance;
}
