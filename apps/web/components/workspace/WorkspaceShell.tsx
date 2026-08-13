"use client";

import WorkspaceSidebar from "./WorkspaceSidebar";
import Breadcrumbs from "./Breadcrumbs";
import { ErrorBoundary } from "./ErrorBoundary";
import { IconButton } from "@/components/primitives/IconButton";
import { useWorkspace } from "@/lib/workspace/workspace-context";

function WorkspaceContent({ children }: { children?: React.ReactNode }) {
  const {
    resourceManager,
    activeResource,
    open,
    back,
    forward,
    canGoBack,
    canGoForward,
  } = useWorkspace();

  return (
    <>
      <WorkspaceSidebar />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* Breadcrumbs */}
        <Breadcrumbs resource={activeResource} />

        {/* Main content area — renders children (the page content) */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
          }}
        >
          {/* Children are the page content (e.g., AssistantWorkspace) */}
          {activeResource ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Navigation controls */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--border, #23252d)",
                  flexShrink: 0,
                }}
              >
                <IconButton
                  size={26}
                  onClick={back}
                  disabled={!canGoBack}
                  title="Back"
                  style={{ opacity: canGoBack ? 1 : 0.4 }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </IconButton>
                <IconButton
                  size={26}
                  onClick={forward}
                  disabled={!canGoForward}
                  title="Forward"
                  style={{ opacity: canGoForward ? 1 : 0.4 }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </IconButton>
              </div>

              {/* Page content */}
              <div style={{ flex: 1, overflow: "hidden" }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <ErrorBoundary>{children as any}</ErrorBoundary>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--text-muted, #9ca3af)",
                fontSize: 13,
              }}
            >
              Open a resource from the sidebar
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function WorkspaceShell({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div
      className="tz-backdrop"
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-primary, #0a0a0f)",
      }}
    >
      <WorkspaceContent>{children}</WorkspaceContent>
    </div>
  );
}
