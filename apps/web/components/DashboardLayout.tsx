"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";
import type { LayoutWidget } from "@/lib/layout-types";

function DragHandle({ listeners, attributes }: any) {
  return (
    <button
      {...attributes}
      {...listeners}
      style={{
        background: "none",
        border: "none",
        cursor: "grab",
        color: "var(--text-dim, #6b7280)",
        padding: 4,
        borderRadius: 4,
        display: "flex",
        fontSize: 16,
        lineHeight: 1,
        touchAction: "none",
      }}
      aria-label="Drag to reorder"
    >
      ⋮⋮
    </button>
  );
}

function WidgetControls({
  widget,
  onToggleVisibility,
  onCycleSize,
}: {
  widget: LayoutWidget;
  onToggleVisibility: () => void;
  onCycleSize: () => void;
}) {
  const sizeLabel = widget.size === "S" ? "SM" : widget.size === "M" ? "MD" : "LG";
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <button
        onClick={onCycleSize}
        style={{
          background: "none",
          border: "1px solid var(--border, #23252d)",
          borderRadius: 4,
          padding: "2px 5px",
          fontSize: 9,
          color: "var(--text-dim, #6b7280)",
          cursor: "pointer",
          fontFamily: "inherit",
          lineHeight: "14px",
        }}
        aria-label="Cycle size"
      >
        {sizeLabel}
      </button>
      <button
        onClick={onToggleVisibility}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-dim, #6b7280)",
          padding: 2,
          display: "flex",
        }}
        aria-label={widget.visible ? "Hide widget" : "Show widget"}
      >
        {widget.visible ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        )}
      </button>
    </div>
  );
}

function SortableWidgetRow({
  widget,
  children,
  onToggleVisibility,
  onCycleSize,
}: {
  widget: LayoutWidget;
  children: ReactNode;
  onToggleVisibility: () => void;
  onCycleSize: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} className="fade-up">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ paddingTop: 16, flexShrink: 0 }}>
          <DragHandle attributes={attributes} listeners={listeners} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
        <div style={{ paddingTop: 16, flexShrink: 0 }}>
          <WidgetControls
            widget={widget}
            onToggleVisibility={onToggleVisibility}
            onCycleSize={onCycleSize}
          />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayoutManager({
  layout,
  onReorder,
  onUpdateWidget,
  onReset,
  onToggleVisibility,
  onCycleSize,
  renderWidget,
}: {
  layout: { widgets: LayoutWidget[] };
  onReorder: (widgets: LayoutWidget[]) => void;
  onUpdateWidget: (id: string, patch: Partial<LayoutWidget>) => void;
  onReset: () => void;
  onToggleVisibility: (id: string) => void;
  onCycleSize: (id: string) => void;
  renderWidget: (widget: LayoutWidget) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibleWidgets = layout.widgets.filter((w) => w.visible);
  const hiddenWidgets = layout.widgets.filter((w) => !w.visible);
  const widgetIds = visibleWidgets.map((w) => w.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleWidgets.findIndex((w) => w.id === active.id);
    const newIndex = visibleWidgets.findIndex((w) => w.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...visibleWidgets];
    reordered.splice(newIndex, 0, reordered.splice(oldIndex, 1)[0]);

    const hiddenIds = new Set(hiddenWidgets.map((w) => w.id));
    const result = [
      ...reordered,
      ...layout.widgets.filter((w) => hiddenIds.has(w.id)),
    ];
    onReorder(result);
  };

  return (
    <div>
      {hiddenWidgets.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-dim, #6b7280)", alignSelf: "center" }}>
            {hiddenWidgets.length} hidden
          </span>
          <button
            onClick={onReset}
            style={{
              background: "none",
              border: "1px solid var(--border, #23252d)",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 11,
              color: "var(--text-dim, #6b7280)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Reset Layout
          </button>
        </div>
      )}

      {hiddenWidgets.length === 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button
            onClick={onReset}
            style={{
              background: "none",
              border: "1px solid var(--border, #23252d)",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 11,
              color: "var(--text-dim, #6b7280)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Reset Layout
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgetIds} strategy={verticalListSortingStrategy}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {visibleWidgets.map((widget) => (
              <SortableWidgetRow
                key={widget.id}
                widget={widget}
                onToggleVisibility={() => onToggleVisibility(widget.id)}
                onCycleSize={() => onCycleSize(widget.id)}
              >
                {renderWidget(widget)}
              </SortableWidgetRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {hiddenWidgets.length > 0 && (
        <details style={{ marginTop: 24 }}>
          <summary
            style={{
              fontSize: 11,
              color: "var(--text-dim, #6b7280)",
              cursor: "pointer",
              padding: "8px 0",
              userSelect: "none",
            }}
          >
            Hidden Widgets ({hiddenWidgets.length})
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
            {hiddenWidgets.map((widget) => {
              if (!widget?.id) return null;
              return (
                <div key={widget.id} className="fade-up">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px dashed var(--border, #23252d)",
                      background: "var(--bg-surface, #111214)",
                      opacity: 0.5,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--text-dim, #6b7280)", flex: 1 }}>
                      {widget.id.replace(/-/g, " ")}
                    </span>
                  <button
                    onClick={() => onToggleVisibility(widget.id)}
                    style={{
                      background: "none",
                      border: "1px solid var(--border, #23252d)",
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: 10,
                      color: "var(--text-dim, #6b7280)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Show
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
