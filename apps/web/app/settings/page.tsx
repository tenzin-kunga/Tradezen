"use client";

import { User, Palette, TrendingUp, Bell, Database, Bot } from "lucide-react";
import { SettingsProvider, SettingsShell } from "@/components/settings";
import { ProfileSection } from "@/components/settings/sections/ProfileSection";
import { InterfaceSection } from "@/components/settings/sections/InterfaceSection";
import { TradingSection } from "@/components/settings/sections/TradingSection";
import { AIProviderSection } from "@/components/settings/sections/AIProviderSection";
import { NotificationSection } from "@/components/settings/sections/NotificationSection";
import { DataPrivacySection } from "@/components/settings/sections/DataPrivacySection";
import { SectionHeader } from "@/components/settings/components/SectionHeader";
import type { SettingsSection, Surface } from "@/components/settings/types";

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "profile",
    title: "Profile",
    description: "Your identity and current session",
    icon: User,
    displayOrder: 10,
    category: "account",
    surface: "raised",
    importance: "primary",
    component: ProfileSection,
  },
  {
    id: "interface",
    title: "Interface",
    description: "Theme, density, and display preferences",
    icon: Palette,
    displayOrder: 20,
    category: "workspace",
    surface: "raised",
    importance: "primary",
    component: InterfaceSection,
  },
  {
    id: "trading",
    title: "Trading Defaults",
    description: "Defaults applied to new trades",
    icon: TrendingUp,
    displayOrder: 30,
    category: "workspace",
    surface: "raised",
    importance: "primary",
    component: TradingSection,
  },
  {
    id: "ai-providers",
    title: "AI Providers",
    description: "Configure API keys for cloud AI providers",
    icon: Bot,
    displayOrder: 35,
    category: "workspace",
    surface: "raised",
    importance: "primary",
    component: AIProviderSection,
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "What to be alerted about",
    icon: Bell,
    displayOrder: 40,
    category: "preferences",
    surface: "raised",
    importance: "secondary",
    component: NotificationSection,
  },
  {
    id: "data-privacy",
    title: "Data & Privacy",
    description: "Manage your data and account",
    icon: Database,
    displayOrder: 50,
    category: "account",
    surface: "raised",
    importance: "advanced",
    component: DataPrivacySection,
  },
];

const surfaceStyle: Record<Surface, string> = {
  page: "surface-0",
  raised: "surface-1",
  panel: "surface-2",
};

function SettingsPageContent() {
  const sorted = SETTINGS_SECTIONS.sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  return (
    <SettingsShell>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1
          style={{
            fontSize: "var(--section-title)",
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
            fontFamily: "var(--font-display)",
            letterSpacing: "0.04em",
          }}
        >
          Settings
        </h1>
        <p
          style={{
            fontSize: "var(--meta)",
            color: "var(--text-dim)",
            marginTop: "var(--space-1)",
          }}
        >
          Configure your workspace
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--section-gap)",
        }}
      >
        {sorted.map((section) => (
          <div
            key={section.id}
            className={surfaceStyle[section.surface]}
            style={{
              borderRadius: "var(--radius-xl)",
              padding: "var(--space-5)",
            }}
          >
            <SectionHeader
              icon={section.icon}
              title={section.title}
              description={section.description}
            />
            <section.component />
          </div>
        ))}
      </div>
    </SettingsShell>
  );
}

export default function SettingsPage() {
  return (
    <SettingsProvider>
      <SettingsPageContent />
    </SettingsProvider>
  );
}
