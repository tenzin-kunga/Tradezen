"use client";

import type { ReactNode } from "react";
import WorkspaceSidebar from "./WorkspaceSidebar";

export default function WorkspaceShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-primary, #0a0a0f)",
      }}
    >
      <WorkspaceSidebar />
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {children}
      </main>
    </div>
  );
}
