import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./index";
import { symbols } from "./symbols";

export const researchStatus = ["idea", "active", "on_hold", "closed"] as const;
export const researchConviction = ["low", "medium", "high"] as const;

export const researchProjects = pgTable(
  "research_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    symbolId: uuid("symbol_id").references(() => symbols.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    status: text("status").notNull().default("idea"),
    conviction: text("conviction").notNull().default("medium"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_research_projects_user").on(table.userId),
    index("idx_research_projects_symbol").on(table.symbolId),
    index("idx_research_projects_status").on(table.status),
  ],
);

export const researchNotes = pgTable(
  "research_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => researchProjects.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    version: integer("version").notNull().default(1),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("idx_research_notes_project").on(table.projectId)],
);

export const researchChecklists = pgTable(
  "research_checklists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => researchProjects.id, { onDelete: "cascade" }),
    thesisComplete: boolean("thesis_complete").notNull().default(false),
    valuationComplete: boolean("valuation_complete").notNull().default(false),
    risksReviewed: boolean("risks_reviewed").notNull().default(false),
    earningsReviewed: boolean("earnings_reviewed").notNull().default(false),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("idx_research_checklists_project").on(table.projectId)],
);

export const researchTags = pgTable(
  "research_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => researchProjects.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    color: text("color").notNull().default("#888888"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("idx_research_tags_project").on(table.projectId)],
);

export const researchActivity = pgTable(
  "research_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => researchProjects.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // created | note_updated | checklist_updated | status_changed | ai_query | tag_added
    detail: jsonb("detail").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("idx_research_activity_project").on(table.projectId)],
);
