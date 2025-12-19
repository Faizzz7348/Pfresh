import {
  type TableRow,
  type InsertTableRow,
  type TableColumn,
  type InsertTableColumn,
  type ImageWithCaption,
  type RouteOptimizationResult,
  type InsertRouteOptimizationResult,
  type LayoutPreferences,
  type InsertLayoutPreferences,
  type Page,
  type InsertPage,
  type GlobalSettings,
  type InsertGlobalSettings,
  type SharedTableState,
  type InsertSharedTableState,
  type SavedShareLink,
  type InsertSavedShareLink,
  type CustomTable,
  type InsertCustomTable,
  type CustomTableRow,
  type InsertCustomTableRow,
  tableRows,
  tableColumns,
  routeOptimizationResult,
  layoutPreferences,
  pages,
  globalSettings,
  sharedTableStates,
  savedShareLinks,
  customTables,
  customTableRows,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, asc, desc } from "drizzle-orm";

export interface IStorage {
  // Table rows
  getTableRows(): Promise<TableRow[]>;
  getTableRow(id: string): Promise<TableRow | undefined>;
  getQlKitchenRow(): Promise<TableRow | undefined>;
  createTableRow(row: InsertTableRow): Promise<TableRow>;
  updateTableRow(
    id: string,
    updates: Partial<InsertTableRow>,
  ): Promise<TableRow | undefined>;
  deleteTableRow(id: string): Promise<boolean>;
  reorderTableRows(rowIds: string[]): Promise<TableRow[]>;
  bulkUpdateColorByRoute(route: string, color: string): Promise<TableRow[]>;

  // Table columns
  getTableColumns(): Promise<TableColumn[]>;
  getTableColumn(id: string): Promise<TableColumn | undefined>;
  createTableColumn(column: InsertTableColumn): Promise<TableColumn>;
  updateTableColumn(
    id: string,
    updates: Partial<InsertTableColumn>,
  ): Promise<TableColumn | undefined>;
  deleteTableColumn(id: string): Promise<boolean>;
  reorderTableColumns(columnIds: string[]): Promise<TableColumn[]>;

  // Route optimization results
  getSavedRoutes(): Promise<RouteOptimizationResult[]>;
  getSavedRoute(id: string): Promise<RouteOptimizationResult | undefined>;
  saveRoute(route: InsertRouteOptimizationResult): Promise<RouteOptimizationResult>;
  deleteSavedRoute(id: string): Promise<boolean>;

  // Layout preferences
  getLayoutPreferences(userId: string): Promise<LayoutPreferences | undefined>;
  saveLayoutPreferences(userId: string, layout: InsertLayoutPreferences): Promise<LayoutPreferences>;

  // Pages
  getPages(): Promise<Page[]>;
  getPage(id: string): Promise<Page | undefined>;
  createPage(page: InsertPage): Promise<Page>;
  updatePage(id: string, updates: Partial<InsertPage>): Promise<Page | undefined>;
  deletePage(id: string): Promise<boolean>;

  // Global settings
  getGlobalSetting(key: string): Promise<GlobalSettings | undefined>;
  setGlobalSetting(key: string, value: string): Promise<GlobalSettings>;

  // Shared table states
  createSharedTableState(state: InsertSharedTableState): Promise<SharedTableState>;
  getSharedTableState(shareId: string): Promise<SharedTableState | undefined>;

  // Saved share links
  getSavedShareLinks(): Promise<SavedShareLink[]>;
  getSavedShareLink(id: string): Promise<SavedShareLink | undefined>;
  createSavedShareLink(link: InsertSavedShareLink): Promise<SavedShareLink>;
  updateSavedShareLinkRemark(id: string, remark: string): Promise<SavedShareLink | undefined>;
  deleteSavedShareLink(id: string): Promise<boolean>;

  // Custom tables
  getCustomTables(): Promise<CustomTable[]>;
  getCustomTable(id: string): Promise<CustomTable | undefined>;
  getCustomTableByShareId(shareId: string): Promise<CustomTable | undefined>;
  getCustomTableRows(customTableId: string): Promise<TableRow[]>;
  createCustomTable(table: InsertCustomTable, rowIds: string[]): Promise<CustomTable>;
  updateCustomTable(id: string, updates: Partial<InsertCustomTable>): Promise<CustomTable | undefined>;
  deleteCustomTable(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private tableRows: Map<string, TableRow>;
  private tableColumns: Map<string, TableColumn>;
  private savedRoutes: Map<string, RouteOptimizationResult>;
  private layoutPrefs: Map<string, LayoutPreferences>;
  private pages: Map<string, Page>;
  private sharedStates: Map<string, SharedTableState>;

  constructor() {
    this.tableRows = new Map();
    this.tableColumns = new Map();
    this.savedRoutes = new Map();
    this.layoutPrefs = new Map();
    this.pages = new Map();
    this.sharedStates = new Map();

    // Initialize with sample data
    this.initializeData();
    this.ensureCoreColumns();
  }

  private initializeData() {
    // Initialize default columns - these are permanent core columns
    const defaultColumns: TableColumn[] = [
      {
        id: randomUUID(),
        name: "ID",
        dataKey: "id",
        type: "text",
        sortOrder: 1,
        isEditable: "false",
        options: [] as string[],
      },
      {
        id: randomUUID(),
        name: "No",
        dataKey: "no",
        type: "text",
        sortOrder: 2,
        isEditable: "false",
        options: [] as string[],
      },
      {
        id: randomUUID(),
        name: "Route",
        dataKey: "route",
        type: "select",
        sortOrder: 3,
        isEditable: "true",
        options: [
          "KL 1",
          "KL 2",
          "KL 3",
          "KL 4",
          "KL 5",
          "KL 6",
          "KL 7",
          "SL 1",
          "SL 2",
          "SL 3",
        ] as string[],
      },
      {
        id: randomUUID(),
        name: "Code",
        dataKey: "code",
        type: "text",
        sortOrder: 4,
        isEditable: "true",
        options: [] as string[],
      },
      {
        id: randomUUID(),
        name: "Location",
        dataKey: "location",
        type: "text",
        sortOrder: 5,
        isEditable: "true",
        options: [] as string[],
      },
      {
        id: randomUUID(),
        name: "Delivery",
        dataKey: "delivery",
        type: "select",
        sortOrder: 6,
        isEditable: "true",
        options: ["Daily", "Weekday", "Alt 1", "Alt 2"] as string[],
      },
      {
        id: randomUUID(),
        name: "Trip",
        dataKey: "trip",
        type: "select",
        sortOrder: 7,
        isEditable: "true",
        options: ["Daily", "Weekday", "Alt 1", "Alt 2"] as string[],
      },
      {
        id: randomUUID(),
        name: "Parking",
        dataKey: "tngRoute",
        type: "currency",
        sortOrder: 8,
        isEditable: "true",
        options: [] as string[],
      },
      {
        id: randomUUID(),
        name: "Info",
        dataKey: "info",
        type: "text",
        sortOrder: 9,
        isEditable: "true",
        options: [] as string[],
      },
      {
        id: randomUUID(),
        name: "Images",
        dataKey: "images",
        type: "images",
        sortOrder: 10,
        isEditable: "false",
        options: [] as string[],
      },
      {
        id: randomUUID(),
        name: "Toll Price",
        dataKey: "tollPrice",
        type: "currency",
        sortOrder: 11,
        isEditable: "false",
        options: [] as string[],
      },
      {
        id: randomUUID(),
        name: "Latitude",
        dataKey: "latitude",
        type: "text",
        sortOrder: 13,
        isEditable: "true",
        options: [] as string[],
      },
      {
        id: randomUUID(),
        name: "Longitude",
        dataKey: "longitude",
        type: "text",
        sortOrder: 14,
        isEditable: "true",
        options: [] as string[],
      },
    ];

    defaultColumns.forEach((column) => {
      this.tableColumns.set(column.id, column);
    });

    // Initialize sample rows
    const defaultRows: TableRow[] = [
      {
        id: randomUUID(),
        no: 999,
        route: "Warehouse",
        code: "QL001",
        location: "QL Kitchen",
        delivery: "Daily",
        info: "Special QL Kitchen warehouse route",
        tngSite: "QL Central",
        tngRoute: "0.00",
        destination: "0.00",
        tollPrice: "0.00",
        latitude: "3.139003",
        longitude: "101.686855",
        images: [],
        qrCode: "",
        sortOrder: -1,
        active: true,
        deliveryAlt: "normal",
        markerColor: "#3b82f6",
      },
      {
        id: randomUUID(),
        no: 1,
        route: "KL-01",
        code: "CODE001",
        location: "Kuala Lumpur",
        delivery: "Daily",
        info: "Sample information for row 1",
        tngSite: "TnG KL Central",
        tngRoute: "15.50",
        destination: "25.00",
        tollPrice: "0.00",
        latitude: "3.139003",
        longitude: "101.686855",
        images: [
          {
            url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
            caption: "Modern city skyline",
            description: "",
            type: "image",
          },
          {
            url: "https://images.unsplash.com/photo-1573167507387-4d8c0a67ceb2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
            caption: "Urban landscape",
            description: "",
            type: "image",
          },
        ],
        qrCode: "",
        sortOrder: 0,
        active: true,
        deliveryAlt: "normal",
        markerColor: "#3b82f6",
      },
      {
        id: randomUUID(),
        no: 2,
        route: "SG-02",
        code: "CODE002",
        location: "Selangor",
        delivery: "Weekday",
        info: "Details for Selangor route",
        tngSite: "TnG Shah Alam",
        tngRoute: "22.75",
        destination: "18.50",
        tollPrice: "0.00",
        latitude: "3.085602",
        longitude: "101.532303",
        images: [
          {
            url: "https://images.unsplash.com/photo-1560472355-536de3962603?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
            caption: "Suburban area",
            description: "",
            type: "image",
          },
        ],
        qrCode: "",
        sortOrder: 1,
        active: true,
        deliveryAlt: "normal",
        markerColor: "#3b82f6",
      },
      {
        id: randomUUID(),
        no: 3,
        route: "JB-03",
        code: "CODE003",
        location: "Johor Bahru",
        delivery: "Alt 1",
        info: "Information about Johor Bahru delivery",
        tngSite: "TnG JB Plaza",
        tngRoute: "8.90",
        destination: "12.75",
        tollPrice: "0.00",
        latitude: "1.464651",
        longitude: "103.761475",
        images: [],
        qrCode: "",
        sortOrder: 2,
        active: true,
        deliveryAlt: "normal",
        markerColor: "#3b82f6",
      },
      {
        id: randomUUID(),
        no: 4,
        route: "PG-04",
        code: "CODE004",
        location: "Penang",
        delivery: "Alt 2",
        info: "Penang delivery information",
        tngSite: "TnG Georgetown",
        tngRoute: "32.40",
        destination: "28.75",
        tollPrice: "0.00",
        latitude: "5.414184",
        longitude: "100.329113",
        images: [
          {
            url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
            caption: "Georgetown bridge",
            description: "",
            type: "image",
          },
        ],
        qrCode: "",
        sortOrder: 3,
        active: true,
        deliveryAlt: "normal",
        markerColor: "#3b82f6",
      },
      {
        id: randomUUID(),
        no: 5,
        route: "KT-05",
        code: "CODE005",
        location: "Kota Kinabalu",
        delivery: "Daily",
        info: "Extended delivery to East Malaysia",
        tngSite: "TnG KK Mall",
        tngRoute: "45.20",
        destination: "35.60",
        tollPrice: "0.00",
        latitude: "5.974407",
        longitude: "116.095692",
        images: [],
        qrCode: "",
        sortOrder: 4,
        active: true,
        deliveryAlt: "normal",
        markerColor: "#3b82f6",
      },
    ];

    defaultRows.forEach((row) => {
      this.tableRows.set(row.id, row);
    });
  }

  private ensureCoreColumns() {
    const existingColumns = Array.from(this.tableColumns.values());
    const tollPriceColumn = existingColumns.find(col => col.dataKey === 'tollPrice');
    
    if (!tollPriceColumn) {
      const imagesColumn = existingColumns.find(col => col.dataKey === 'images');
      const imagesSortOrder = imagesColumn ? imagesColumn.sortOrder : 10;
      
      // Create Toll Price column right after Images
      const tollPriceCol: TableColumn = {
        id: randomUUID(),
        name: "Toll Price",
        dataKey: "tollPrice",
        type: "currency",
        sortOrder: imagesSortOrder + 1,
        isEditable: "false",
        options: [],
      };
      
      this.tableColumns.set(tollPriceCol.id, tollPriceCol);
      
      // Adjust sortOrder of subsequent columns
      const currentColumns = Array.from(this.tableColumns.values());
      currentColumns.forEach(col => {
        if (col.sortOrder > imagesSortOrder && col.id !== tollPriceCol.id) {
          col.sortOrder += 1;
          this.tableColumns.set(col.id, col);
        }
      });
    }
  }

  // Table rows methods
  async getTableRows(): Promise<TableRow[]> {
    return Array.from(this.tableRows.values()).sort((a, b) => {
      // QL Kitchen always at top
      if (a.sortOrder === -1) return -1;
      if (b.sortOrder === -1) return 1;
      
      // Sort by code numerically
      const codeA = parseInt(a.code || "0") || 0;
      const codeB = parseInt(b.code || "0") || 0;
      return codeA - codeB;
    });
  }

  async getTableRow(id: string): Promise<TableRow | undefined> {
    return this.tableRows.get(id);
  }

  async getQlKitchenRow(): Promise<TableRow | undefined> {
    return Array.from(this.tableRows.values()).find(
      row => row.location === "QL Kitchen" && row.sortOrder === -1
    );
  }

  async createTableRow(insertRow: InsertTableRow): Promise<TableRow> {
    const id = randomUUID();
    const maxSortOrder = Math.max(
      ...Array.from(this.tableRows.values()).map((r) => r.sortOrder),
      -1,
    );
    const row: TableRow = {
      no: insertRow.no || 0,
      route: insertRow.route || "",
      code: insertRow.code || "",
      location: insertRow.location || "",
      delivery: insertRow.delivery || "",
      info: insertRow.info || "",
      tngSite: insertRow.tngSite || "",
      tngRoute: insertRow.tngRoute || "",
      destination: insertRow.destination || "0.00",
      tollPrice: insertRow.tollPrice || "0.00",
      latitude: insertRow.latitude || null,
      longitude: insertRow.longitude || null,
      images: (insertRow.images as ImageWithCaption[]) || [],
      qrCode: insertRow.qrCode || "",
      id,
      sortOrder: maxSortOrder + 1,
      active: insertRow.active !== undefined ? insertRow.active : true,
      deliveryAlt: insertRow.deliveryAlt || "normal",
      markerColor: insertRow.markerColor || "#3b82f6",
    };
    this.tableRows.set(id, row);
    return row;
  }

  async updateTableRow(
    id: string,
    updates: Partial<InsertTableRow>,
  ): Promise<TableRow | undefined> {
    const existingRow = this.tableRows.get(id);
    if (!existingRow) return undefined;

    const updatedRow = { ...existingRow, ...updates } as TableRow;
    this.tableRows.set(id, updatedRow);
    return updatedRow;
  }

  async deleteTableRow(id: string): Promise<boolean> {
    return this.tableRows.delete(id);
  }

  async reorderTableRows(rowIds: string[]): Promise<TableRow[]> {
    rowIds.forEach((id, index) => {
      const row = this.tableRows.get(id);
      if (row) {
        row.sortOrder = index;
        this.tableRows.set(id, row);
      }
    });
    return this.getTableRows();
  }

  async bulkUpdateColorByRoute(route: string, color: string): Promise<TableRow[]> {
    const updatedRows: TableRow[] = [];
    this.tableRows.forEach((row) => {
      if (row.route === route) {
        row.markerColor = color;
        this.tableRows.set(row.id, row);
        updatedRows.push(row);
      }
    });
    return updatedRows;
  }

  // Table columns methods
  async getTableColumns(): Promise<TableColumn[]> {
    return Array.from(this.tableColumns.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
  }

  async getTableColumn(id: string): Promise<TableColumn | undefined> {
    return this.tableColumns.get(id);
  }

  async createTableColumn(
    insertColumn: InsertTableColumn,
  ): Promise<TableColumn> {
    const id = randomUUID();
    const maxSortOrder = Math.max(
      ...Array.from(this.tableColumns.values()).map((c) => c.sortOrder),
      -1,
    );
    const column: TableColumn = {
      name: insertColumn.name,
      dataKey: insertColumn.dataKey,
      type: insertColumn.type || "text",
      isEditable: insertColumn.isEditable || "true",
      options: (insertColumn.options || []) as string[],
      id,
      sortOrder: maxSortOrder + 1,
    };
    this.tableColumns.set(id, column);
    return column;
  }

  async updateTableColumn(
    id: string,
    updates: Partial<InsertTableColumn>,
  ): Promise<TableColumn | undefined> {
    const existingColumn = this.tableColumns.get(id);
    if (!existingColumn) return undefined;

    const updatedColumn = { ...existingColumn, ...updates } as TableColumn;
    this.tableColumns.set(id, updatedColumn);
    return updatedColumn;
  }

  async deleteTableColumn(id: string): Promise<boolean> {
    // Get the column to check if it's a core column
    const column = this.tableColumns.get(id);
    if (!column) return false;
    
    // Prevent deletion of core columns (based on dataKey)
    const coreDataKeys = [
      "id",
      "no", 
      "route",
      "code",
      "location",
      "trip",
      "info",
      "tngRoute",
      "latitude",
      "longitude",
      "kilometer",
      "images",
    ];
    if (coreDataKeys.includes(column.dataKey)) {
      return false; // Cannot delete core columns
    }
    return this.tableColumns.delete(id);
  }

  async reorderTableColumns(columnIds: string[]): Promise<TableColumn[]> {
    columnIds.forEach((id, index) => {
      const column = this.tableColumns.get(id);
      if (column) {
        column.sortOrder = index;
        this.tableColumns.set(id, column);
      }
    });
    return this.getTableColumns();
  }

  // Route optimization results methods
  async getSavedRoutes(): Promise<RouteOptimizationResult[]> {
    return Array.from(this.savedRoutes.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getSavedRoute(id: string): Promise<RouteOptimizationResult | undefined> {
    return this.savedRoutes.get(id);
  }

  async saveRoute(route: InsertRouteOptimizationResult): Promise<RouteOptimizationResult> {
    const id = randomUUID();
    const savedRoute: RouteOptimizationResult = {
      id,
      ...route,
      originalOrder: [...route.originalOrder] as string[],
      optimizedOrder: [...route.optimizedOrder] as string[],
      algorithm: route.algorithm || "nearest_neighbor",
      createdAt: new Date(),
    };
    this.savedRoutes.set(id, savedRoute);
    return savedRoute;
  }

  async deleteSavedRoute(id: string): Promise<boolean> {
    return this.savedRoutes.delete(id);
  }

  // Layout preferences methods
  async getLayoutPreferences(userId: string): Promise<LayoutPreferences | undefined> {
    return this.layoutPrefs.get(userId);
  }

  async saveLayoutPreferences(userId: string, layout: InsertLayoutPreferences): Promise<LayoutPreferences> {
    const existingLayout = this.layoutPrefs.get(userId);
    const id = existingLayout?.id || randomUUID();
    const savedLayout: LayoutPreferences = {
      id,
      userId,
      columnOrder: Array.from(layout.columnOrder || []) as string[],
      columnVisibility: { ...(layout.columnVisibility || {}) },
      creatorName: layout.creatorName || existingLayout?.creatorName || "Somebody",
      creatorUrl: layout.creatorUrl || existingLayout?.creatorUrl || "",
      updatedAt: new Date(),
    };
    this.layoutPrefs.set(userId, savedLayout);
    return savedLayout;
  }

  // Pages methods
  async getPages(): Promise<Page[]> {
    return Array.from(this.pages.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getPage(id: string): Promise<Page | undefined> {
    return this.pages.get(id);
  }

  async createPage(page: InsertPage): Promise<Page> {
    const id = randomUUID();
    const newPage: Page = {
      id,
      title: page.title || "",
      description: page.description || "",
      sortOrder: page.sortOrder || this.pages.size,
    };
    this.pages.set(id, newPage);
    return newPage;
  }

  async updatePage(id: string, updates: Partial<InsertPage>): Promise<Page | undefined> {
    const page = this.pages.get(id);
    if (!page) return undefined;

    const updatedPage: Page = {
      ...page,
      ...updates,
    };
    this.pages.set(id, updatedPage);
    return updatedPage;
  }

  async deletePage(id: string): Promise<boolean> {
    return this.pages.delete(id);
  }

  async getGlobalSetting(key: string): Promise<GlobalSettings | undefined> {
    // For in-memory storage, return default values
    if (key === 'footerCompanyName') {
      return {
        id: randomUUID(),
        key: 'footerCompanyName',
        value: 'App v1.0.0',
        updatedAt: new Date(),
      };
    }
    return undefined;
  }

  async setGlobalSetting(key: string, value: string): Promise<GlobalSettings> {
    // For in-memory storage, just return the setting
    return {
      id: randomUUID(),
      key,
      value,
      updatedAt: new Date(),
    };
  }

  // Shared table states methods
  async createSharedTableState(state: InsertSharedTableState): Promise<SharedTableState> {
    const id = randomUUID();
    const sharedState: SharedTableState = {
      id,
      shareId: state.shareId,
      tableState: {
        filters: {
          searchTerm: state.tableState.filters.searchTerm,
          routeFilters: Array.from(state.tableState.filters.routeFilters) as string[],
          deliveryFilters: Array.from(state.tableState.filters.deliveryFilters) as string[],
        },
        sorting: state.tableState.sorting,
        columnVisibility: { ...state.tableState.columnVisibility },
        columnOrder: Array.from(state.tableState.columnOrder) as string[],
      },
      createdAt: new Date(),
      expiresAt: state.expiresAt || null,
    };
    this.sharedStates.set(state.shareId, sharedState);
    return sharedState;
  }

  async getSharedTableState(shareId: string): Promise<SharedTableState | undefined> {
    return this.sharedStates.get(shareId);
  }

  // Saved share links methods (in-memory)
  private savedLinks: Map<string, SavedShareLink> = new Map();

  async getSavedShareLinks(): Promise<SavedShareLink[]> {
    return Array.from(this.savedLinks.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getSavedShareLink(id: string): Promise<SavedShareLink | undefined> {
    return this.savedLinks.get(id);
  }

  async createSavedShareLink(link: InsertSavedShareLink): Promise<SavedShareLink> {
    const id = randomUUID();
    const saved: SavedShareLink = {
      id,
      shareId: link.shareId,
      url: link.url,
      remark: link.remark || "",
      createdAt: new Date(),
    };
    this.savedLinks.set(id, saved);
    return saved;
  }

  async updateSavedShareLinkRemark(id: string, remark: string): Promise<SavedShareLink | undefined> {
    const link = this.savedLinks.get(id);
    if (link) {
      const updated = { ...link, remark };
      this.savedLinks.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteSavedShareLink(id: string): Promise<boolean> {
    return this.savedLinks.delete(id);
  }

  // Custom tables methods (in-memory)
  private customTablesMap: Map<string, CustomTable> = new Map();
  private customTableRowsMap: Map<string, CustomTableRow[]> = new Map();

  async getCustomTables(): Promise<CustomTable[]> {
    return Array.from(this.customTablesMap.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getCustomTable(id: string): Promise<CustomTable | undefined> {
    return this.customTablesMap.get(id);
  }

  async getCustomTableByShareId(shareId: string): Promise<CustomTable | undefined> {
    return Array.from(this.customTablesMap.values()).find(
      table => table.shareId === shareId
    );
  }

  async getCustomTableRows(customTableId: string): Promise<TableRow[]> {
    const customRows = this.customTableRowsMap.get(customTableId) || [];
    return customRows
      .map(cr => this.tableRows.get(cr.tableRowId))
      .filter((row): row is TableRow => row !== undefined)
      .sort((a, b) => {
        const aRow = customRows.find(cr => cr.tableRowId === a.id);
        const bRow = customRows.find(cr => cr.tableRowId === b.id);
        return (aRow?.sortOrder || 0) - (bRow?.sortOrder || 0);
      });
  }

  async createCustomTable(table: InsertCustomTable, rowIds: string[]): Promise<CustomTable> {
    const id = randomUUID();
    const customTable: CustomTable = {
      id,
      name: table.name,
      shareId: table.shareId,
      description: table.description || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.customTablesMap.set(id, customTable);

    // Create associations
    const tableRowsAssoc = rowIds.map((rowId, index) => ({
      id: randomUUID(),
      customTableId: id,
      tableRowId: rowId,
      sortOrder: index,
      createdAt: new Date(),
    }));
    this.customTableRowsMap.set(id, tableRowsAssoc);

    return customTable;
  }

  async updateCustomTable(id: string, updates: Partial<InsertCustomTable>): Promise<CustomTable | undefined> {
    const table = this.customTablesMap.get(id);
    if (table) {
      const updated = { ...table, ...updates, updatedAt: new Date() };
      this.customTablesMap.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteCustomTable(id: string): Promise<boolean> {
    this.customTableRowsMap.delete(id);
    return this.customTablesMap.delete(id);
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize with sample data if tables are empty
    this.initializeData().catch(console.error);
    this.ensureCoreColumns().catch(console.error);
  }

  private async initializeData() {
    try {
      // Check if data already exists
      const existingColumns = await db.select().from(tableColumns);
      const existingRows = await db.select().from(tableRows);

      if (existingColumns.length === 0) {
        // Initialize default columns - these are permanent core columns
        const defaultColumns: Omit<TableColumn, "id">[] = [
          {
            name: "ID",
            dataKey: "id",
            type: "text",
            sortOrder: 1,
            isEditable: "false",
            options: [] as string[],
          },
          {
            name: "No",
            dataKey: "no",
            type: "text",
            sortOrder: 2,
            isEditable: "false",
            options: [] as string[],
          },
          {
            name: "Route",
            dataKey: "route",
            type: "select",
            sortOrder: 3,
            isEditable: "true",
            options: [
              "KL 1",
              "KL 2",
              "KL 3",
              "KL 4",
              "KL 5",
              "KL 6",
              "KL 7",
              "SL 1",
              "SL 2",
              "SL 3",
            ] as string[],
          },
          {
            name: "Code",
            dataKey: "code",
            type: "text",
            sortOrder: 4,
            isEditable: "true",
            options: [] as string[],
          },
          {
            name: "Location",
            dataKey: "location",
            type: "text",
            sortOrder: 5,
            isEditable: "true",
            options: [] as string[],
          },
          {
            name: "Delivery",
            dataKey: "delivery",
            type: "select",
            sortOrder: 6,
            isEditable: "true",
            options: ["Daily", "Weekday", "Alt 1", "Alt 2"] as string[],
          },
          {
            name: "Trip",
            dataKey: "trip",
            type: "select",
            sortOrder: 7,
            isEditable: "true",
            options: ["Daily", "Weekday", "Alt 1", "Alt 2"] as string[],
          },
          {
            name: "Parking",
            dataKey: "tngRoute",
            type: "currency",
            sortOrder: 8,
            isEditable: "true",
            options: [] as string[],
          },
          {
            name: "Info",
            dataKey: "info",
            type: "text",
            sortOrder: 9,
            isEditable: "true",
            options: [] as string[],
          },
          {
            name: "Images",
            dataKey: "images",
            type: "images",
            sortOrder: 10,
            isEditable: "false",
            options: [] as string[],
          },
          {
            name: "Kilometer",
            dataKey: "kilometer",
            type: "number",
            sortOrder: 11,
            isEditable: "false",
            options: [] as string[],
          },
          {
            name: "Toll Price",
            dataKey: "tollPrice",
            type: "currency",
            sortOrder: 12,
            isEditable: "false",
            options: [] as string[],
          },
          {
            name: "Latitude",
            dataKey: "latitude",
            type: "text",
            sortOrder: 13,
            isEditable: "true",
            options: [] as string[],
          },
          {
            name: "Longitude",
            dataKey: "longitude",
            type: "text",
            sortOrder: 14,
            isEditable: "true",
            options: [] as string[],
          },
        ];

        const columnsWithOrder = defaultColumns;
        await db.insert(tableColumns).values(columnsWithOrder);
      }

      // Always ensure QL Kitchen row exists
      const qlKitchenExists = existingRows.some(row => 
        row.route === "Warehouse" && row.location === "QL Kitchen" && row.sortOrder === -1
      );

      if (!qlKitchenExists) {
        try {
          // Add QL Kitchen row
          await db.insert(tableRows).values({
            no: 999,
            route: "Warehouse",
            code: "QL001",
            location: "QL Kitchen",
            delivery: "Daily",
            info: "Special QL Kitchen warehouse route",
            tngSite: "QL Central",
            tngRoute: "0.00",
            destination: "0.00",
            tollPrice: "0.00",
            latitude: "3.139003",
            longitude: "101.686855",
            images: [],
            qrCode: "",
            sortOrder: -1,
            active: true,
            deliveryAlt: "normal",
            markerColor: "#3b82f6",
          });
        } catch (error: any) {
          // If constraint error for duplicate sort_order, ignore it as the row already exists
          if (error.code !== '23505' || !error.detail?.includes('sort_order')) {
            throw error;
          }
        }
      }

      if (existingRows.length === 0) {
        // Initialize sample rows
        const defaultRows: Omit<TableRow, "id" | "sortOrder">[] = [
          {
            no: 1,
            route: "KL-01",
            code: "CODE001",
            location: "Kuala Lumpur",
            delivery: "Daily",
            info: "Sample information for row 1",
            tngSite: "TnG KL Central",
            tngRoute: "15.50",
            destination: "25.00",
            tollPrice: "0.00",
            latitude: "3.139003",
            longitude: "101.686855",
            images: [
              {
                url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
                caption: "KL city center",
                description: "",
                type: "image",
              },
              {
                url: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
                caption: "Petronas Towers",
                description: "",
                type: "image",
              },
            ],
            qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://maps.google.com/?q=3.139003,101.686855",
            active: true,
            deliveryAlt: "normal",
            markerColor: "#3b82f6",
          },
          {
            no: 2,
            route: "SG-02",
            code: "CODE002",
            location: "Selangor",
            delivery: "Weekday",
            info: "Details for Selangor route",
            tngSite: "TnG Shah Alam",
            tngRoute: "22.75",
            destination: "18.50",
            tollPrice: "0.00",
            latitude: "3.085602",
            longitude: "101.532303",
            images: [
              {
                url: "https://images.unsplash.com/photo-1605649487212-183a9c785351?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
                caption: "Selangor district",
                description: "",
                type: "image",
              },
            ],
            qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://maps.google.com/?q=3.085602,101.532303",
            active: true,
            deliveryAlt: "normal",
            markerColor: "#3b82f6",
          },
          {
            no: 3,
            route: "JB-03",
            code: "CODE003",
            location: "Johor Bahru",
            delivery: "Alt 1",
            info: "Information about Johor Bahru delivery",
            tngSite: "TnG JB Plaza",
            tngRoute: "8.90",
            destination: "12.75",
            tollPrice: "0.00",
            latitude: "1.464651",
            longitude: "103.761475",
            images: [],
            qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://fmvending.web.app/location/JB-03",
            active: true,
            deliveryAlt: "normal",
            markerColor: "#3b82f6",
          },
          {
            no: 4,
            route: "PG-04",
            code: "CODE004",
            location: "Penang",
            delivery: "Alt 2",
            info: "Penang delivery information",
            tngSite: "TnG Georgetown",
            tngRoute: "32.40",
            destination: "28.75",
            tollPrice: "0.00",
            latitude: "5.414184",
            longitude: "100.329113",
            images: [
              {
                url: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
                caption: "Penang heritage",
                description: "",
                type: "image",
              },
            ],
            qrCode: "",
            active: true,
            deliveryAlt: "normal",
            markerColor: "#3b82f6",
          },
          {
            no: 5,
            route: "KT-05",
            code: "CODE005",
            location: "Kota Kinabalu",
            delivery: "Daily",
            info: "Extended delivery to East Malaysia",
            tngSite: "TnG KK Mall",
            tngRoute: "45.20",
            destination: "35.60",
            tollPrice: "0.00",
            latitude: "5.974407",
            longitude: "116.095692",
            images: [],
            qrCode: "",
            active: true,
            deliveryAlt: "normal",
            markerColor: "#3b82f6",
          },
        ];

        for (let i = 0; i < defaultRows.length; i++) {
          const row = defaultRows[i];
          // Give QL Kitchen special sortOrder to always appear at top
          const sortOrder = row.location === "QL Kitchen" ? -1 : i - 1;
          await db.insert(tableRows).values({
            no: row.no,
            route: row.route,
            code: row.code,
            location: row.location,
            delivery: row.delivery,
            info: row.info,
            tngSite: row.tngSite,
            tngRoute: row.tngRoute,
            destination: row.destination,
            latitude: row.latitude,
            longitude: row.longitude,
            images: row.images,
            qrCode: row.qrCode,
            sortOrder: sortOrder,
          });
        }
      }
    } catch (error) {
      console.error("Error initializing database data:", error);
    }
  }

  private async ensureCoreColumns() {
    try {
      const existingColumns = await this.getTableColumns();
      const kilometerColumn = existingColumns.find(col => col.dataKey === 'kilometer');
      const tollPriceColumn = existingColumns.find(col => col.dataKey === 'tollPrice');
      
      if (!kilometerColumn) {
        const infoColumn = existingColumns.find(col => col.dataKey === 'info');
        const infoSortOrder = infoColumn ? infoColumn.sortOrder : 6;
        
        // Create Kilometer column right after Info
        await db.insert(tableColumns).values({
          name: "Kilometer",
          dataKey: "kilometer",
          type: "number",
          sortOrder: infoSortOrder + 1,
          isEditable: "false",
          options: [],
        });
        
        // Adjust sortOrder of subsequent columns
        for (const col of existingColumns) {
          if (col.sortOrder > infoSortOrder) {
            await db
              .update(tableColumns)
              .set({ sortOrder: col.sortOrder + 1 })
              .where(eq(tableColumns.id, col.id));
          }
        }
      }
      
      if (!tollPriceColumn) {
        // Refresh columns after potential kilometer insertion
        const updatedColumns = await this.getTableColumns();
        const kilometerCol = updatedColumns.find(col => col.dataKey === 'kilometer');
        const kilometerSortOrder = kilometerCol ? kilometerCol.sortOrder : 11;
        
        // Create Toll Price column right after Kilometer
        await db.insert(tableColumns).values({
          name: "Toll Price",
          dataKey: "tollPrice",
          type: "currency",
          sortOrder: kilometerSortOrder + 1,
          isEditable: "false",
          options: [],
        });
        
        // Adjust sortOrder of subsequent columns
        for (const col of updatedColumns) {
          if (col.sortOrder > kilometerSortOrder) {
            await db
              .update(tableColumns)
              .set({ sortOrder: col.sortOrder + 1 })
              .where(eq(tableColumns.id, col.id));
          }
        }
      }
    } catch (error) {
      console.error("Error ensuring core columns:", error);
    }
  }

  // Table rows methods
  async getTableRows(): Promise<TableRow[]> {
    return await db.select().from(tableRows).orderBy(asc(tableRows.sortOrder));
  }

  async getTableRow(id: string): Promise<TableRow | undefined> {
    const [row] = await db.select().from(tableRows).where(eq(tableRows.id, id));
    return row || undefined;
  }

  async getQlKitchenRow(): Promise<TableRow | undefined> {
    const [row] = await db.select().from(tableRows).where(eq(tableRows.sortOrder, -1));
    return row || undefined;
  }

  async createTableRow(insertRow: InsertTableRow): Promise<TableRow> {
    const existingRows = await this.getTableRows();
    const maxSortOrder = Math.max(...existingRows.map((r) => r.sortOrder), -1);

    const [row] = await db
      .insert(tableRows)
      .values({
        no: insertRow.no || 0,
        route: insertRow.route || "",
        code: insertRow.code || "",
        location: insertRow.location || "",
        delivery: insertRow.delivery || "",
        info: insertRow.info || "",
        tngSite: insertRow.tngSite || "",
        tngRoute: insertRow.tngRoute || "",
        tollPrice: insertRow.tollPrice || "0.00",
        latitude: insertRow.latitude || null,
        longitude: insertRow.longitude || null,
        images: (insertRow.images as ImageWithCaption[]) || [],
        sortOrder: maxSortOrder + 1,
      })
      .returning();

    return row;
  }

  async updateTableRow(
    id: string,
    updates: Partial<InsertTableRow>,
  ): Promise<TableRow | undefined> {
    // Get existing row to check constraints
    const existingRow = await this.getTableRow(id);
    if (!existingRow) return undefined;

    // Filter out undefined values and check if there are valid updates
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    // Prevent any row from being set to sortOrder -1 except QL Kitchen
    if (filteredUpdates.sortOrder === -1 && existingRow.location !== "QL Kitchen") {
      throw new Error("Only QL Kitchen row can have sortOrder -1");
    }

    // If no valid updates after filtering, return the existing row
    if (Object.keys(filteredUpdates).length === 0) {
      return this.getTableRow(id);
    }

    const [updatedRow] = await db
      .update(tableRows)
      .set(filteredUpdates as any)
      .where(eq(tableRows.id, id))
      .returning();

    return updatedRow || undefined;
  }

  async deleteTableRow(id: string): Promise<boolean> {
    const result = await db.delete(tableRows).where(eq(tableRows.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async reorderTableRows(rowIds: string[]): Promise<TableRow[]> {
    // Get the QL Kitchen row to preserve its -1 sortOrder
    const qlKitchenRow = await this.getQlKitchenRow();
    
    // Filter out the QL Kitchen row from reordering if it exists
    const filteredRowIds = qlKitchenRow 
      ? rowIds.filter(id => id !== qlKitchenRow.id)
      : rowIds;
    
    // Batch update all rows in parallel for better performance
    await Promise.all(
      filteredRowIds.map((id, index) =>
        db
          .update(tableRows)
          .set({ sortOrder: index })
          .where(eq(tableRows.id, id))
      )
    );
    
    return this.getTableRows();
  }

  async bulkUpdateColorByRoute(route: string, color: string): Promise<TableRow[]> {
    const updatedRows = await db
      .update(tableRows)
      .set({ markerColor: color })
      .where(eq(tableRows.route, route))
      .returning();
    
    return updatedRows;
  }

  // Table columns methods
  async getTableColumns(): Promise<TableColumn[]> {
    return await db
      .select()
      .from(tableColumns)
      .orderBy(asc(tableColumns.sortOrder));
  }

  async getTableColumn(id: string): Promise<TableColumn | undefined> {
    const [column] = await db
      .select()
      .from(tableColumns)
      .where(eq(tableColumns.id, id));
    return column || undefined;
  }

  async createTableColumn(
    insertColumn: InsertTableColumn,
  ): Promise<TableColumn> {
    const existingColumns = await this.getTableColumns();
    const maxSortOrder = Math.max(
      ...existingColumns.map((c) => c.sortOrder),
      -1,
    );

    const columnData = {
      name: insertColumn.name,
      dataKey: insertColumn.dataKey,
      type: insertColumn.type || "text",
      isEditable: insertColumn.isEditable || "true",
      options: (insertColumn.options || []) as string[],
      sortOrder: maxSortOrder + 1,
    };

    const [column] = await db
      .insert(tableColumns)
      .values(columnData)
      .returning();

    return column;
  }

  async updateTableColumn(
    id: string,
    updates: Partial<InsertTableColumn>,
  ): Promise<TableColumn | undefined> {
    const updateData = {
      ...updates,
      options: updates.options ? (updates.options as string[]) : undefined,
    };

    const [updatedColumn] = await db
      .update(tableColumns)
      .set(updateData)
      .where(eq(tableColumns.id, id))
      .returning();

    return updatedColumn || undefined;
  }

  async deleteTableColumn(id: string): Promise<boolean> {
    // Get the column to check if it's a core column
    const column = await this.getTableColumn(id);
    if (!column) return false;

    // Prevent deletion of core columns (based on dataKey)
    const coreDataKeys = [
      "id",
      "no",
      "route",
      "code",
      "location",
      "trip",
      "info",
      "tngRoute",
      "latitude",
      "longitude",
      "images",
    ];
    if (coreDataKeys.includes(column.dataKey)) {
      return false; // Cannot delete core columns
    }

    const result = await db.delete(tableColumns).where(eq(tableColumns.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async reorderTableColumns(columnIds: string[]): Promise<TableColumn[]> {
    for (let i = 0; i < columnIds.length; i++) {
      await db
        .update(tableColumns)
        .set({ sortOrder: i })
        .where(eq(tableColumns.id, columnIds[i]));
    }
    return this.getTableColumns();
  }

  // Route optimization results methods
  async getSavedRoutes(): Promise<RouteOptimizationResult[]> {
    return await db
      .select()
      .from(routeOptimizationResult)
      .orderBy(desc(routeOptimizationResult.createdAt));
  }

  async getSavedRoute(id: string): Promise<RouteOptimizationResult | undefined> {
    const [route] = await db
      .select()
      .from(routeOptimizationResult)
      .where(eq(routeOptimizationResult.id, id));
    return route || undefined;
  }

  async saveRoute(route: InsertRouteOptimizationResult): Promise<RouteOptimizationResult> {
    const [savedRoute] = await db
      .insert(routeOptimizationResult)
      .values({
        ...route,
        originalOrder: [...route.originalOrder] as string[],
        optimizedOrder: [...route.optimizedOrder] as string[],
      })
      .returning();
    return savedRoute;
  }

  async deleteSavedRoute(id: string): Promise<boolean> {
    const result = await db
      .delete(routeOptimizationResult)
      .where(eq(routeOptimizationResult.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Layout preferences methods
  async getLayoutPreferences(userId: string): Promise<LayoutPreferences | undefined> {
    const [layout] = await db
      .select()
      .from(layoutPreferences)
      .where(eq(layoutPreferences.userId, userId))
      .limit(1);
    return layout || undefined;
  }

  async saveLayoutPreferences(userId: string, layout: InsertLayoutPreferences): Promise<LayoutPreferences> {
    // Check if layout preferences already exist for this user
    const existing = await this.getLayoutPreferences(userId);
    
    if (existing) {
      // Update existing preferences
      const [updated] = await db
        .update(layoutPreferences)
        .set({
          columnOrder: Array.from(layout.columnOrder || []) as string[],
          columnVisibility: { ...(layout.columnVisibility || {}) },
          creatorName: layout.creatorName !== undefined ? layout.creatorName : existing.creatorName,
          creatorUrl: layout.creatorUrl !== undefined ? layout.creatorUrl : existing.creatorUrl,
          updatedAt: new Date(),
        })
        .where(eq(layoutPreferences.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert new preferences
      const [saved] = await db
        .insert(layoutPreferences)
        .values({
          userId,
          columnOrder: Array.from(layout.columnOrder || []) as string[],
          columnVisibility: { ...(layout.columnVisibility || {}) },
          creatorName: layout.creatorName || "Somebody",
          creatorUrl: layout.creatorUrl || "",
        })
        .returning();
      return saved;
    }
  }

  // Pages methods
  async getPages(): Promise<Page[]> {
    return await db
      .select()
      .from(pages)
      .orderBy(asc(pages.sortOrder));
  }

  async getPage(id: string): Promise<Page | undefined> {
    const [page] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, id));
    return page || undefined;
  }

  async createPage(page: InsertPage): Promise<Page> {
    const [newPage] = await db
      .insert(pages)
      .values({
        title: page.title || "",
        description: page.description || "",
        sortOrder: page.sortOrder || 0,
      })
      .returning();
    return newPage;
  }

  async updatePage(id: string, updates: Partial<InsertPage>): Promise<Page | undefined> {
    const [updated] = await db
      .update(pages)
      .set(updates)
      .where(eq(pages.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePage(id: string): Promise<boolean> {
    const result = await db
      .delete(pages)
      .where(eq(pages.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getGlobalSetting(key: string): Promise<GlobalSettings | undefined> {
    const [setting] = await db
      .select()
      .from(globalSettings)
      .where(eq(globalSettings.key, key))
      .limit(1);
    return setting;
  }

  async setGlobalSetting(key: string, value: string): Promise<GlobalSettings> {
    const existing = await this.getGlobalSetting(key);
    
    if (existing) {
      const [updated] = await db
        .update(globalSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(globalSettings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(globalSettings)
        .values({ key, value })
        .returning();
      return created;
    }
  }

  // Shared table states methods
  async createSharedTableState(state: InsertSharedTableState): Promise<SharedTableState> {
    const [sharedState] = await db
      .insert(sharedTableStates)
      .values(state as any)
      .returning();
    return sharedState;
  }

  async getSharedTableState(shareId: string): Promise<SharedTableState | undefined> {
    const [state] = await db
      .select()
      .from(sharedTableStates)
      .where(eq(sharedTableStates.shareId, shareId))
      .limit(1);
    return state || undefined;
  }

  // Saved share links methods
  async getSavedShareLinks(): Promise<SavedShareLink[]> {
    const links = await db
      .select()
      .from(savedShareLinks)
      .orderBy(desc(savedShareLinks.createdAt));
    return links;
  }

  async getSavedShareLink(id: string): Promise<SavedShareLink | undefined> {
    const [link] = await db
      .select()
      .from(savedShareLinks)
      .where(eq(savedShareLinks.id, id))
      .limit(1);
    return link || undefined;
  }

  async createSavedShareLink(link: InsertSavedShareLink): Promise<SavedShareLink> {
    const [saved] = await db
      .insert(savedShareLinks)
      .values(link)
      .returning();
    return saved;
  }

  async updateSavedShareLinkRemark(id: string, remark: string): Promise<SavedShareLink | undefined> {
    const [updated] = await db
      .update(savedShareLinks)
      .set({ remark })
      .where(eq(savedShareLinks.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteSavedShareLink(id: string): Promise<boolean> {
    const result = await db
      .delete(savedShareLinks)
      .where(eq(savedShareLinks.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Custom tables methods
  async getCustomTables(): Promise<CustomTable[]> {
    const tables = await db
      .select()
      .from(customTables)
      .orderBy(desc(customTables.createdAt));
    return tables;
  }

  async getCustomTable(id: string): Promise<CustomTable | undefined> {
    const [table] = await db
      .select()
      .from(customTables)
      .where(eq(customTables.id, id))
      .limit(1);
    return table || undefined;
  }

  async getCustomTableByShareId(shareId: string): Promise<CustomTable | undefined> {
    const [table] = await db
      .select()
      .from(customTables)
      .where(eq(customTables.shareId, shareId))
      .limit(1);
    return table || undefined;
  }

  async getCustomTableRows(customTableId: string): Promise<TableRow[]> {
    const rows = await db
      .select({
        id: tableRows.id,
        no: tableRows.no,
        route: tableRows.route,
        code: tableRows.code,
        location: tableRows.location,
        delivery: tableRows.delivery,
        info: tableRows.info,
        tngSite: tableRows.tngSite,
        tngRoute: tableRows.tngRoute,
        destination: tableRows.destination,
        tollPrice: tableRows.tollPrice,
        latitude: tableRows.latitude,
        longitude: tableRows.longitude,
        images: tableRows.images,
        qrCode: tableRows.qrCode,
        sortOrder: customTableRows.sortOrder,
        active: tableRows.active,
        deliveryAlt: tableRows.deliveryAlt,
        markerColor: tableRows.markerColor,
      })
      .from(customTableRows)
      .innerJoin(tableRows, eq(customTableRows.tableRowId, tableRows.id))
      .where(eq(customTableRows.customTableId, customTableId))
      .orderBy(asc(customTableRows.sortOrder));
    return rows;
  }

  async createCustomTable(table: InsertCustomTable, rowIds: string[]): Promise<CustomTable> {
    // Create the custom table
    const [customTable] = await db
      .insert(customTables)
      .values(table)
      .returning();

    // Create the associations with table rows
    if (rowIds && rowIds.length > 0) {
      const tableRowsValues = rowIds.map((rowId, index) => ({
        customTableId: customTable.id,
        tableRowId: rowId,
        sortOrder: index,
      }));

      await db
        .insert(customTableRows)
        .values(tableRowsValues);
    }

    return customTable;
  }

  async updateCustomTable(id: string, updates: Partial<InsertCustomTable>): Promise<CustomTable | undefined> {
    const [updated] = await db
      .update(customTables)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customTables.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCustomTableRows(customTableId: string): Promise<boolean> {
    const result = await db
      .delete(customTableRows)
      .where(eq(customTableRows.customTableId, customTableId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async createCustomTableRow(row: InsertCustomTableRow): Promise<CustomTableRow> {
    const [created] = await db
      .insert(customTableRows)
      .values(row)
      .returning();
    return created;
  }

  async deleteCustomTable(id: string): Promise<boolean> {
    const result = await db
      .delete(customTables)
      .where(eq(customTables.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

// Use MemStorage (local in-memory storage) in development when no DATABASE_URL is set
export const storage = (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL)
  ? new MemStorage() 
  : new DatabaseStorage();
