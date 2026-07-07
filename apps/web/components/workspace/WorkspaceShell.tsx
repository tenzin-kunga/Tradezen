"use client";

import { useState } from "react";
import WorkspaceSidebar from "./WorkspaceSidebar";
import WorkspaceTabs from "./WorkspaceTabs";
import ContextPanel from "./ContextPanel";
import Breadcrumbs from "./Breadcrumbs";
import { useWorkspace } from "@/lib/workspace/workspace-context";

function WorkspaceContent() {
  const {
    resourceManager,
    activeResource,
    open,
    back,
    forward,
    canGoBack,
    canGoForward,
  } = useWorkspace();

  const tabs = resourceManager.getTabs();
  const activeId = resourceManager.getActiveId();
  const [contextCollapsed, setContextCollapsed] = useState(false);

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
        {/* Tab bar */}
        <WorkspaceTabs
          tabs={tabs}
          activeId={activeId}
          onSelect={(id) => {
            resourceManager.setActive(id);
            const resource = tabs.find((t) => t.id === id)?.resource;
            if (resource) open(resource);
          }}
          onClose={(id) => resourceManager.close(id)}
          onPin={(id) => resourceManager.togglePin(id)}
        />

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
                  padding: "4px 12px",
                  borderBottom: "1px solid var(--border, #23252d)",
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={back}
                  disabled={!canGoBack}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    background: "transparent",
                    border: "none",
                    cursor: canGoBack ? "pointer" : "default",
                    color: canGoBack
                      ? "var(--text-muted, #9ca3af)"
                      : "var(--text-dim, #6b7280)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: canGoBack ? 1 : 0.5,
                  }}
                  title="Back"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  onClick={forward}
                  disabled={!canGoForward}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    background: "transparent",
                    border: "none",
                    cursor: canGoForward ? "pointer" : "default",
                    color: canGoForward
                      ? "var(--text-muted, #9ca3af)"
                      : "var(--text-dim, #6b7280)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: canGoForward ? 1 : 0.5,
                  }}
                  title="Forward"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>

              {/* Page content */}
              <div style={{ flex: 1, overflow: "hidden" }}>
                {/* This is where the routed page content goes */}
                {/* For now, we render the children prop */}
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

      {/* Context panel */}
      <ContextPanel
        resource={activeResource}
        collapsed={contextCollapsed}
        onToggle={() => setContextCollapsed(!contextCollapsed)}
      />
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
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-primary, #0a0a0f)",
      }}
    >
      <WorkspaceContent />
    </div>
  );
}
