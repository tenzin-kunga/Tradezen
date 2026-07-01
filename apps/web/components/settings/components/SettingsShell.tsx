import type { ReactNode } from "react";
import { StickySaveBar } from "./StickySaveBar";

export function SettingsShell({ children }: { children: ReactNode }) {
  return (
    <>
      <div
        style={{
          maxWidth: "var(--settings-width)",
          margin: "0 auto",
          padding: "0 var(--space-6)",
        }}
      >
        {children}
      </div>
      <StickySaveBar />
    </>
  );
}
