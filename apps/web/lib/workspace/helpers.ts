import type { ComponentType } from "react";
import type { RouteConfig, WorkspaceModule } from "./types";
import type { WorkspaceResource } from "./types";
import { RouteCapability } from "./types";
import { getModuleRegistry } from "./module-registry";

export interface ResolvedModule {
  component: ComponentType<{ resource: WorkspaceResource }>;
  route: RouteConfig;
  module: WorkspaceModule;
}

// ponytail: today returns routes[0]; upgrade for permissions/feature-flags/multi-view
function getDefaultRoute(mod: WorkspaceModule): RouteConfig | null {
  const cap = mod.capabilities.find((c) => c.kind === "route") as
    | RouteCapability
    | undefined;
  if (!cap || cap.routes.length === 0) return null;
  return cap.routes[0];
}

export function resolveModuleComponent(
  moduleId: string,
): ResolvedModule | null {
  const mod = getModuleRegistry().get(moduleId);
  if (!mod) return null;

  const route = getDefaultRoute(mod);
  if (!route) return null;

  return {
    component: route.component,
    route,
    module: mod,
  };
}
