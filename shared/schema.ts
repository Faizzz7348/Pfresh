import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, jsonb, integer, uniqueIndex, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Media type with caption and type support (images and videos)
export const mediaSchema = z.object({
  url: z.string(),
  caption: z.string().optional().default(""), // Title/caption
  description: z.string().optional().default(""), // Description
  type: z.enum(["image", "video"]).default("image"),
  thumbnail: z.string().optional(), // For video thumbnails
  mimeType: z.string().optional(), // MIME type for uploaded files
});

export type MediaWithCaption = z.infer<typeof mediaSchema>;

// Keep backward compatibility
export const imageSchema = mediaSchema;
export type ImageWithCaption = MediaWithCaption;

export const tableRows = pgTable("table_rows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  no: integer("no").notNull().default(0),
  route: text("route").notNull().default(""),
  code: text("code").notNull().default(""),
  location: text("location").notNull().default(""),
  delivery: text("delivery").notNull().default(""),
  info: text("info").notNull().default(""),
  tngSite: text("tng_site").notNull().default(""),
  tngRoute: text("tng_route").notNull().default(""),
  destination: text("destination").notNull().default("0.00"),
  tollPrice: text("toll_price").notNull().default("0.00"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  images: jsonb("images").$type<MediaWithCaption[]>().notNull().default([]),
  qrCode: text("qr_code").default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  deliveryAlt: text("delivery_alt").notNull().default("normal"),
  markerColor: text("marker_color").notNull().default("#3b82f6"),
}, (table) => ({
  uniqueSpecialSort: uniqueIndex("ux_one_special_sortorder").on(table.sortOrder).where(sql`${table.sortOrder} = -1`)
}));

export const tableColumns = pgTable("table_columns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  dataKey: text("data_key").notNull(),
  type: text("type").notNull().default("text"), // text, number, currency, images, select
  sortOrder: integer("sort_order").notNull().default(0),
  isEditable: text("is_editable").notNull().default("true"),
  options: jsonb("options").$type<string[]>().default([]),
});

export const insertTableRowSchema = createInsertSchema(tableRows, {
  latitude: z.union([z.string(), z.number()]).transform(val => val === null || val === undefined ? null : String(val)).optional().nullable(),
  longitude: z.union([z.string(), z.number()]).transform(val => val === null || val === undefined ? null : String(val)).optional().nullable(),
}).omit({
  id: true,
  sortOrder: true,
});

export const insertTableColumnSchema = createInsertSchema(tableColumns).omit({
  id: true,
  sortOrder: true,
});

// Route Optimization Schema
export const routeOptimizationResult = pgTable("route_optimization_result", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalOrder: jsonb("original_order").$type<string[]>().notNull(),
  optimizedOrder: jsonb("optimized_order").$type<string[]>().notNull(),
  originalDistance: decimal("original_distance", { precision: 8, scale: 2 }).notNull(),
  optimizedDistance: decimal("optimized_distance", { precision: 8, scale: 2 }).notNull(),
  timeSaved: decimal("time_saved", { precision: 8, scale: 2 }).notNull(),
  fuelSaved: decimal("fuel_saved", { precision: 8, scale: 2 }).notNull(),
  algorithm: text("algorithm").notNull().default("nearest_neighbor"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRouteOptimizationSchema = createInsertSchema(routeOptimizationResult).omit({
  id: true,
  createdAt: true,
});

// Layout preferences for saving column visibility and order (per-user)
export const layoutPreferences = pgTable("layout_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().default("default"),
  columnOrder: jsonb("column_order").$type<string[]>().notNull().default([]),
  columnVisibility: jsonb("column_visibility").$type<Record<string, boolean>>().notNull().default({}),
  creatorName: text("creator_name").notNull().default("Somebody"),
  creatorUrl: text("creator_url").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: uniqueIndex("layout_user_id_idx").on(table.userId)
}));

export const insertLayoutPreferencesSchema = createInsertSchema(layoutPreferences).omit({
  id: true,
  updatedAt: true,
});

// Pages for header carousel
export const pages = pgTable("pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull().default(""),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertPageSchema = createInsertSchema(pages).omit({
  id: true,
});

// Global settings for footer and other app-wide configurations
export const globalSettings = pgTable("global_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGlobalSettingsSchema = createInsertSchema(globalSettings).omit({
  id: true,
  updatedAt: true,
});

// Shared table states for shareable view-only URLs
export const sharedTableStates = pgTable("shared_table_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shareId: text("share_id").notNull().unique(),
  tableState: jsonb("table_state").$type<{
    filters: {
      searchTerm: string;
      routeFilters: string[];
      deliveryFilters: string[];
    };
    sorting: {
      column: string;
      direction: 'asc' | 'desc';
    } | null;
    columnVisibility: Record<string, boolean>;
    columnOrder: string[];
  }>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const insertSharedTableStateSchema = createInsertSchema(sharedTableStates).omit({
  id: true,
  createdAt: true,
});

// Saved share links for users to bookmark their generated share links
export const savedShareLinks = pgTable("saved_share_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shareId: text("share_id").notNull(),
  url: text("url").notNull(),
  remark: text("remark").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSavedShareLinkSchema = createInsertSchema(savedShareLinks).omit({
  id: true,
  createdAt: true,
});

export type InsertTableRow = z.infer<typeof insertTableRowSchema>;
export type TableRow = typeof tableRows.$inferSelect;
export type InsertTableColumn = z.infer<typeof insertTableColumnSchema>;
export type TableColumn = typeof tableColumns.$inferSelect;
export type RouteOptimizationResult = typeof routeOptimizationResult.$inferSelect;
export type InsertRouteOptimizationResult = z.infer<typeof insertRouteOptimizationSchema>;
export type LayoutPreferences = typeof layoutPreferences.$inferSelect;
export type InsertLayoutPreferences = z.infer<typeof insertLayoutPreferencesSchema>;
export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;
export type GlobalSettings = typeof globalSettings.$inferSelect;
export type InsertGlobalSettings = z.infer<typeof insertGlobalSettingsSchema>;
export type SharedTableState = typeof sharedTableStates.$inferSelect;
export type InsertSharedTableState = z.infer<typeof insertSharedTableStateSchema>;
export type SavedShareLink = typeof savedShareLinks.$inferSelect;
export type InsertSavedShareLink = z.infer<typeof insertSavedShareLinkSchema>;

// Custom Tables - User-created tables with selected locations
export const customTables = pgTable("custom_tables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  shareId: text("share_id").notNull().unique(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Custom Table Rows - Many-to-many relationship between custom tables and table rows
export const customTableRows = pgTable("custom_table_rows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customTableId: varchar("custom_table_id").notNull().references(() => customTables.id, { onDelete: 'cascade' }),
  tableRowId: varchar("table_row_id").notNull().references(() => tableRows.id, { onDelete: 'cascade' }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCustomTableSchema = createInsertSchema(customTables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomTableRowSchema = createInsertSchema(customTableRows).omit({
  id: true,
  createdAt: true,
});

export type CustomTable = typeof customTables.$inferSelect;
export type InsertCustomTable = z.infer<typeof insertCustomTableSchema>;
export type CustomTableRow = typeof customTableRows.$inferSelect;
export type InsertCustomTableRow = z.infer<typeof insertCustomTableRowSchema>;

// Route Optimization Types
export interface RouteOptimizationRequest {
  rowIds?: string[];
  startLocation?: { latitude: number; longitude: number };
  algorithm?: 'nearest_neighbor' | 'genetic' | 'simulated_annealing';
  prioritizeDelivery?: boolean;
  maxDistance?: number;
  vehicleSpecs?: {
    type: string; // e.g., "lorry refrigerator 1 ton"
    fuelType: string; // e.g., "diesel"
    tollClass: number; // e.g., 1 for class 1 lorry
  };
}

export interface RouteOptimizationResponse {
  originalOrder: string[];
  optimizedOrder: string[];
  originalDistance: number;
  optimizedDistance: number;
  timeSaved: number; // in minutes
  fuelSaved: number; // in liters
  distanceSaved: number;
  algorithm: string;
  optimizationFactors: {
    distanceReduction: number;
    timeEfficiency: number;
    fuelEfficiency: number;
  };
}
