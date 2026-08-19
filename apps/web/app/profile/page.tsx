"use client";

import { User, TrendingUp } from "lucide-react";
import { SettingsProvider, SettingsShell } from "@/components/settings";
import { SectionHeader } from "@/components/settings/components/SectionHeader";
import { useSettings } from "@/components/settings/context/SettingsContext";
import { TradingSection } from "@/components/settings/sections/TradingSection";
import { useAuth } from "@/lib/auth-context";

function PersonalDetailsSection() {
  const { values, update, validationErrors } = useSettings();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
    >
      <div>
        <label
          style={{
            display: "block",
            fontSize: "var(--label)",
            fontWeight: 500,
            color: "var(--text-muted)",
            marginBottom: "var(--space-1)",
          }}
        >
          Username
        </label>
        <input
          type="text"
          value={values.username}
          onChange={(e) => update("username", e.target.value)}
          className="input-glass text-xs"
          style={{ width: "100%" }}
          placeholder="trader01"
        />
        {validationErrors.username ? (
          <p
            style={{
              fontSize: "var(--meta)",
              color: "var(--accent-loss)",
              marginTop: "var(--space-1)",
            }}
          >
            {validationErrors.username}
          </p>
        ) : (
          <p
            style={{
              fontSize: "var(--meta)",
              color: "var(--text-dim)",
              marginTop: "var(--space-1)",
            }}
          >
            3–30 characters: letters, numbers, and underscores only.
          </p>
        )}
      </div>

      <div>
        <label
          style={{
            display: "block",
            fontSize: "var(--label)",
            fontWeight: 500,
            color: "var(--text-muted)",
            marginBottom: "var(--space-1)",
          }}
        >
          Email
        </label>
        <input
          type="email"
          value={values.email}
          onChange={(e) => update("email", e.target.value)}
          className="input-glass text-xs"
          style={{ width: "100%" }}
          placeholder="trader@example.com"
        />
        {validationErrors.email && (
          <p
            style={{
              fontSize: "var(--meta)",
              color: "var(--accent-loss)",
              marginTop: "var(--space-1)",
            }}
          >
            {validationErrors.email}
          </p>
        )}
      </div>
    </div>
  );
}

function ProfileHeader() {
  const { user } = useAuth();
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-5)",
        paddingBottom: "var(--space-5)",
        marginBottom: "var(--space-5)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--bg-surface-hover)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "var(--text-lg)",
          fontWeight: 700,
          color: "var(--accent)",
          fontFamily: "var(--font-display)",
          flexShrink: 0,
        }}
      >
        {user?.username?.charAt(0)?.toUpperCase() ?? "?"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "var(--label)",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {user?.username ?? "—"}
        </div>
        <div
          style={{
            fontSize: "var(--meta)",
            color: "var(--text-muted)",
            marginTop: 2,
          }}
        >
          {user?.email ?? "—"}
        </div>
        {memberSince && (
          <div
            style={{
              fontSize: "var(--meta)",
              color: "var(--text-dim)",
              marginTop: 2,
            }}
          >
            Member since {memberSince}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--accent-profit)",
            boxShadow: "0 0 6px var(--accent-profit)",
          }}
        />
        <span
          style={{
            fontSize: "var(--meta)",
            fontWeight: 600,
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          ACTIVE
        </span>
      </div>
    </div>
  );
}

function ProfilePageContent() {
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
          Profile
        </h1>
        <p
          style={{
            fontSize: "var(--meta)",
            color: "var(--text-dim)",
            marginTop: "var(--space-1)",
          }}
        >
          Your identity, account, and trading preferences
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--section-gap)",
        }}
      >
        <div
          className="surface-1"
          style={{
            borderRadius: "var(--radius-xl)",
            padding: "var(--space-5)",
          }}
        >
          <ProfileHeader />
          <SectionHeader
            icon={User}
            title="Personal Details"
            description="Your identity and how others see you"
          />
          <PersonalDetailsSection />
        </div>

        <div
          className="surface-1"
          style={{
            borderRadius: "var(--radius-xl)",
            padding: "var(--space-5)",
          }}
        >
          <SectionHeader
            icon={TrendingUp}
            title="Trading Preferences"
            description="Defaults applied to new trades"
          />
          <TradingSection />
        </div>
      </div>
    </SettingsShell>
  );
}

export default function ProfilePage() {
  return (
    <SettingsProvider>
      <ProfilePageContent />
    </SettingsProvider>
  );
}
