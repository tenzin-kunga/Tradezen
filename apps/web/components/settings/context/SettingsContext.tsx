"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { updateSettings, updateProfile } from "@/lib/api";
import type { SaveResult } from "../types";

type UserSettings = {
  username: string;
  email: string;
  initial_capital: number;
  default_lot_size: number;
  timezone: string;
  theme: string;
};

type SettingsContextType = {
  values: UserSettings;
  defaults: UserSettings;
  dirty: boolean;
  saving: boolean;
  lastSaved: Date | null;
  validationErrors: Record<string, string>;
  hasUnsavedChanges: boolean;
  update: <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => void;
  reset: () => void;
  save: () => Promise<SaveResult>;
  clearDirty: () => void;
};

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(
    (key) =>
      (a as Record<string, unknown>)[key] ===
      (b as Record<string, unknown>)[key],
  );
}

function validateSettings(values: UserSettings): Record<string, string> {
  const errors: Record<string, string> = {};
  if (values.initial_capital < 0) {
    errors.initial_capital = "Cannot be negative";
  }
  if (values.default_lot_size <= 0) {
    errors.default_lot_size = "Must be positive";
  }
  if (values.username.length < 3 || values.username.length > 30) {
    errors.username = "Username must be 3–30 characters";
  }
  if (!/^[a-zA-Z0-9_]+$/.test(values.username)) {
    errors.username = "Letters, numbers, and underscores only";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email address";
  }
  return errors;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, syncUser } = useAuth();
  const { setTheme } = useTheme();

  const [values, setValues] = useState<UserSettings>({
    username: "",
    email: "",
    initial_capital: 0,
    default_lot_size: 0.01,
    timezone: "UTC",
    theme: "dark",
  });

  const [defaults, setDefaults] = useState<UserSettings>({
    username: "",
    email: "",
    initial_capital: 0,
    default_lot_size: 0.01,
    timezone: "UTC",
    theme: "dark",
  });

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user) {
      const initial: UserSettings = {
        username: user.username ?? "",
        email: user.email ?? "",
        initial_capital: user.initial_capital ?? 0,
        default_lot_size: user.default_lot_size ?? 0.01,
        timezone: user.timezone ?? "UTC",
        theme: user.theme ?? "dark",
      };
      setValues(initial);
      setDefaults(initial);
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const dirty = useMemo(() => !deepEqual(values, defaults), [values, defaults]);
  const validationErrors = useMemo(() => validateSettings(values), [values]);

  const update = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      if (key === "theme") {
        setTheme(value as Parameters<typeof setTheme>[0]);
      }
    },
    [setTheme],
  );

  const reset = useCallback(() => {
    setValues(defaults);
  }, [defaults]);

  const clearDirty = useCallback(() => {
    setDefaults(values);
  }, [values]);

  const save = useCallback(async (): Promise<SaveResult> => {
    const errors = validateSettings(values);
    if (Object.keys(errors).length > 0) {
      return { status: "validation_failed", errors };
    }

    setSaving(true);
    try {
      let updated = await updateSettings({
        initial_capital: values.initial_capital,
        default_lot_size: values.default_lot_size,
        timezone: values.timezone,
        theme: values.theme,
      });
      if (values.username !== defaults.username || values.email !== defaults.email) {
        updated = await updateProfile({
          username: values.username !== defaults.username ? values.username : undefined,
          email: values.email !== defaults.email ? values.email : undefined,
        });
      }
      syncUser(updated);
      setDefaults(values);
      const now = new Date();
      setLastSaved(now);

      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => {
        savedTimerRef.current = null;
        setLastSaved(null);
      }, 2000);

      return { status: "success" };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save settings";
      return { status: "network_error", message };
    } finally {
      setSaving(false);
    }
  }, [values, defaults.email, defaults.username, syncUser]);

  return (
    <SettingsContext.Provider
      value={{
        values,
        defaults,
        dirty,
        saving,
        lastSaved,
        validationErrors,
        hasUnsavedChanges: dirty,
        update,
        reset,
        save,
        clearDirty,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
