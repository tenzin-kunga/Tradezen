import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

export type Surface = "page" | "raised" | "panel";

export const SURFACE_CLASSES: Record<Surface, string> = {
  page: "surface-0",
  raised: "surface-1",
  panel: "surface-2",
};

export type Importance = "primary" | "secondary" | "advanced";

export interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  displayOrder: number;
  category: string;
  surface: Surface;
  importance: Importance;
  component: ComponentType;
  permissions?: string[];
  featureFlag?: string | (() => boolean);
}

export interface SettingFieldProps<T = unknown> {
  value: T;
  onChange: (value: T) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
  error?: string | null;
}

export type NotificationGroupData = {
  id: string;
  title: string;
  defaultExpanded: boolean;
  notifications: Array<{
    type: string;
    label: string;
    description: string;
  }>;
};

export type SaveResult =
  | { status: "success" }
  | { status: "validation_failed"; errors: Record<string, string> }
  | { status: "network_error"; message: string }
  | { status: "conflict"; message: string };
