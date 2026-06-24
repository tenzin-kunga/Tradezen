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
import { useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import type { LayoutWidget } from "@/lib/layout-types";
import { WIDGET_TITLES } from "@/lib/layout-types";
import WidgetCard from "@/components/design-system/WidgetCard";

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
        padding: 2,
        borderRadius: 4,
        display: "flex",
        fontSize: 14,
        lineHeight: 1,
        touchAction: "none",
      }}
      aria-label="Drag to reorder"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="9" cy="5" r="1.5" fill="currentColor" />
        <circle cx="15" cy="5" r="1.5" fill="currentColor" />
        <circle cx="9" cy="12" r="1.5" fill="currentColor" />
        <circle cx="15" cy="12" r="1.5" fill="currentColor" />
        <circle cx="9" cy="19" r="1.5" fill="currentColor" />
        <circle cx="15" cy="19" r="1.5" fill="currentColor" />
      </svg>
    </button>
  );
}

function SortableWidget({
  widget,
  children,
  onToggleVisibility,
  onCycleSize,
  noCard,
}: {
  widget: LayoutWidget;
  children: ReactNode;
  onToggleVisibility: () => void;
  onCycleSize: () => void;
  noCard?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 1 : 0,
  };

  if (noCard) {
    return (
      <div ref={setNodeRef} style={style} className="fade-up">
        {children}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="fade-up">
      <WidgetCard
        widget={widget}
        dragHandle={<DragHandle listeners={listeners} attributes={attributes} />}
        onToggleVisibility={onToggleVisibility}
        onCycleSize={onCycleSize}
      >
        {children}
      </WidgetCard>
    </div>
  );
}

export default function DashboardGridLayout({
  layout,
  onReorder,
  onReset,
  onToggleVisibility,
  onCycleSize,
  renderWidget,
}: {
  layout: { widgets: LayoutWidget[] };
  onReorder: (widgets: LayoutWidget[]) => void;
  onReset: () => void;
  onToggleVisibility: (id: string) => void;
  onCycleSize: (id: string) => void;
  renderWidget: (widget: LayoutWidget) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibleWidgets = useMemo(
    () => layout.widgets.filter((w) => w.visible),
    [layout.widgets],
  );
  const hiddenWidgets = useMemo(
    () => layout.widgets.filter((w) => !w.visible),
    [layout.widgets],
  );

  const col0 = useMemo(
    () =>
      visibleWidgets
        .filter((w) => w.column === 0)
        .sort((a, b) => a.order - b.order),
    [visibleWidgets],
  );
  const col1 = useMemo(
    () =>
      visibleWidgets
        .filter((w) => w.column === 1)
        .sort((a, b) => a.order - b.order),
    [visibleWidgets],
  );

  const col0Ids = useMemo(() => col0.map((w) => w.id), [col0]);
  const col1Ids = useMemo(() => col1.map((w) => w.id), [col1]);

  const findWidget = useCallback(
    (id: string) => layout.widgets.find((w) => w.id === id),
    [layout.widgets],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeWidget = findWidget(String(active.id));
      const overWidget = findWidget(String(over.id));
      if (!activeWidget || !overWidget) return;

      const targetCol = overWidget.column;

      const result = layout.widgets
        .filter((w) => w.id !== activeWidget.id)
        .map((w) => ({ ...w }));

      result.push({ ...activeWidget, column: targetCol });

      const rebuildCol = (col: 0 | 1) =>
        result
          .filter((w) => w.column === col)
          .sort((a, b) => a.order - b.order);

      const r0 = rebuildCol(0);
      const r1 = rebuildCol(1);

      const target = targetCol === 0 ? r0 : r1;
      const activeIdx = target.findIndex((w) => w.id === activeWidget.id);

      let insertBefore = target.length;
      if (overWidget.column === targetCol) {
        const overIdx = target.findIndex((w) => w.id === overWidget.id);
        if (overIdx >= 0) insertBefore = overIdx;
      }

      target.splice(activeIdx, 1);
      target.splice(
        insertBefore > activeIdx ? insertBefore - 1 : insertBefore,
        0,
        { ...activeWidget } as LayoutWidget,
      );

      const orders = new Map<string, number>();
      r0.forEach((w, i) => orders.set(w.id, i));
      r1.forEach((w, i) => orders.set(w.id, i));

      const final = result.map((w) => ({
        ...w,
        order: orders.get(w.id) ?? w.order,
      }));

      onReorder(final);
    },
    [layout.widgets, findWidget, onReorder],
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {hiddenWidgets.length > 0 && (
            <div className="flex items-center gap-2">
              <span
                className="text-xs"
                style={{ color: "var(--text-dim, #6b7280)" }}
              >
                {hiddenWidgets.length} hidden
              </span>
              <div className="relative group">
                <button
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    border: "1px solid var(--border, #23252d)",
                    color: "var(--text-dim, #6b7280)",
                    background: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  + Add Widget
                </button>
                <div
                  className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-10 hidden group-hover:block"
                  style={{
                    background: "var(--bg-surface, #111214)",
                    border: "1px solid var(--border, #23252d)",
                    minWidth: 160,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                >
                  {hiddenWidgets.map((w) => (
                    <button
                      key={w.id}
                      className="block w-full text-left px-3 py-2 text-xs hover:opacity-80"
                      style={{
                        color: "var(--text-primary, #e5e7eb)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                      onClick={() => onToggleVisibility(w.id)}
                    >
                      {WIDGET_TITLES[w.id] ?? w.id}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onReset}
          className="text-xs px-2.5 py-1.5 rounded"
          style={{
            border: "1px solid var(--border, #23252d)",
            color: "var(--text-dim, #6b7280)",
            background: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Reset Layout
        </button>
      </div>

      {/* Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Column 0 */}
          <div className="flex flex-col gap-3">
            {col0.length === 0 ? (
              <div
                className="rounded-xl flex items-center justify-center min-h-[120px]"
                style={{
                  border: "1px dashed var(--border, #23252d)",
                  background: "var(--bg-surface, #111214)",
                  opacity: 0.3,
                }}
              >
                <span className="text-xs" style={{ color: "var(--text-dim, #6b7280)" }}>
                  Drop widgets here
                </span>
              </div>
            ) : (
              <SortableContext
                items={col0Ids}
                strategy={verticalListSortingStrategy}
              >
                {col0.map((widget) => (
                  <SortableWidget
                    key={widget.id}
                    widget={widget}
                    noCard={widget.id === "analytics-insights" || widget.id === "ai-coach"}
                    onToggleVisibility={() => onToggleVisibility(widget.id)}
                    onCycleSize={() => onCycleSize(widget.id)}
                  >
                    {renderWidget(widget)}
                  </SortableWidget>
                ))}
              </SortableContext>
            )}
          </div>

          {/* Column 1 */}
          <div className="flex flex-col gap-3">
            {col1.length === 0 ? (
              <div
                className="rounded-xl flex items-center justify-center min-h-[120px]"
                style={{
                  border: "1px dashed var(--border, #23252d)",
                  background: "var(--bg-surface, #111214)",
                  opacity: 0.3,
                }}
              >
                <span className="text-xs" style={{ color: "var(--text-dim, #6b7280)" }}>
                  Drop widgets here
                </span>
              </div>
            ) : (
              <SortableContext
                items={col1Ids}
                strategy={verticalListSortingStrategy}
              >
                {col1.map((widget) => (
                  <SortableWidget
                    key={widget.id}
                    widget={widget}
                    noCard={widget.id === "analytics-insights" || widget.id === "ai-coach"}
                    onToggleVisibility={() => onToggleVisibility(widget.id)}
                    onCycleSize={() => onCycleSize(widget.id)}
                  >
                    {renderWidget(widget)}
                  </SortableWidget>
                ))}
              </SortableContext>
            )}
          </div>
        </div>
      </DndContext>

      {/* Hidden section */}
      {hiddenWidgets.length > 0 && (
        <details style={{ marginTop: 24 }}>
          <summary
            className="text-xs cursor-pointer py-2 select-none"
            style={{ color: "var(--text-dim, #6b7280)" }}
          >
            All Widgets ({layout.widgets.length})
          </summary>
          <div className="flex flex-col gap-2 mt-2">
            {layout.widgets.map((widget) => (
              <div
                key={widget.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  border: "1px dashed var(--border, #23252d)",
                  background: "var(--bg-surface, #111214)",
                  opacity: widget.visible ? 1 : 0.5,
                }}
              >
                <span
                  className="text-xs flex-1"
                  style={{ color: "var(--text-dim, #6b7280)" }}
                >
                  {WIDGET_TITLES[widget.id] ?? widget.id}
                </span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{
                    border: "1px solid var(--border, #23252d)",
                    color: "var(--text-dim, #6b7280)",
                  }}
                >
                  Col {widget.column + 1}
                </span>
                <span className="text-[9px]" style={{ color: "var(--text-dim, #6b7280)" }}>
                  {widget.visible ? "Visible" : "Hidden"}
                </span>
                <button
                  onClick={() => onToggleVisibility(widget.id)}
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    border: "1px solid var(--border, #23252d)",
                    color: "var(--text-dim, #6b7280)",
                    background: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {widget.visible ? "Hide" : "Show"}
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
