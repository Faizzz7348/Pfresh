import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTableRowSchema, insertTableColumnSchema, insertRouteOptimizationSchema, insertLayoutPreferencesSchema, insertPageSchema, insertSharedTableStateSchema, insertSavedShareLinkSchema, insertCustomTableSchema, insertCustomTableRowSchema, type RouteOptimizationRequest } from "@shared/schema";
import { z } from "zod";
import { optimizeRoute } from "./routeOptimizer";
import { calculateRoutesForDestinations } from "./openrouteservice";

// UUID validation schema
const uuidSchema = z.string().uuid();

export async function registerRoutes(app: Express): Promise<Server> {
  // Table rows routes
  app.get("/api/table-rows", async (req, res) => {
    try {
      const rows = await storage.getTableRows();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch table rows" });
    }
  });

  app.get("/api/table-rows/:id", async (req, res) => {
    try {
      // Validate UUID parameter
      const validationResult = uuidSchema.safeParse(req.params.id);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid row ID format" });
      }
      
      const row = await storage.getTableRow(req.params.id);
      if (!row) {
        return res.status(404).json({ message: "Row not found" });
      }
      res.json(row);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch table row" });
    }
  });

  app.get("/api/ql-kitchen", async (req, res) => {
    try {
      const row = await storage.getQlKitchenRow();
      if (!row) {
        return res.status(404).json({ message: "QL Kitchen row not found" });
      }
      res.json(row);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch QL Kitchen row" });
    }
  });

  app.post("/api/table-rows", async (req, res) => {
    try {
      const validatedData = insertTableRowSchema.parse(req.body);
      const row = await storage.createTableRow(validatedData);
      res.status(201).json(row);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create table row" });
      }
    }
  });

  app.patch("/api/table-rows/:id", async (req, res) => {
    try {
      // Validate UUID parameter
      const validationResult = uuidSchema.safeParse(req.params.id);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid row ID format" });
      }
      
      // Normalize snake_case keys to camelCase for consistency
      const normalizedBody = Object.fromEntries(
        Object.entries(req.body).map(([key, value]) => {
          const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
          return [camelKey, value];
        })
      );

      // Special validation for currency field (tngRoute)
      if (normalizedBody.tngRoute !== undefined) {
        const currencyValue = String(normalizedBody.tngRoute);
        if (currencyValue !== "" && isNaN(Number(currencyValue))) {
          return res.status(400).json({ 
            message: "Invalid currency value", 
            details: "Currency value must be a number" 
          });
        }
        // Format currency as decimal string with 2 decimal places if it's a number
        if (currencyValue !== "" && !isNaN(Number(currencyValue))) {
          normalizedBody.tngRoute = Number(currencyValue).toFixed(2);
        }
      }
      
      console.log('Attempting to update row with data:', JSON.stringify(normalizedBody, null, 2));
      const updates = insertTableRowSchema.partial().parse(normalizedBody);
      const row = await storage.updateTableRow(req.params.id, updates);
      if (!row) {
        return res.status(404).json({ message: "Row not found" });
      }
      res.json(row);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Zod validation error:', JSON.stringify(error.errors, null, 2));
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error(`Error updating row ${req.params.id}:`, error);
        res.status(500).json({ message: "Failed to update table row" });
      }
    }
  });

  app.delete("/api/table-rows/:id", async (req, res) => {
    try {
      // Validate UUID parameter
      const validationResult = uuidSchema.safeParse(req.params.id);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid row ID format" });
      }
      
      const success = await storage.deleteTableRow(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Row not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete table row" });
    }
  });

  app.post("/api/table-rows/reorder", async (req, res) => {
    try {
      const { rowIds } = req.body;
      if (!Array.isArray(rowIds)) {
        return res.status(400).json({ message: "rowIds must be an array" });
      }
      
      // Validate all IDs are UUIDs
      for (const id of rowIds) {
        const validationResult = uuidSchema.safeParse(id);
        if (!validationResult.success) {
          return res.status(400).json({ message: "All row IDs must be valid UUIDs" });
        }
      }
      const rows = await storage.reorderTableRows(rowIds);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder table rows" });
    }
  });

  app.put("/api/table-rows/bulk-update-color", async (req, res) => {
    try {
      const { route, color } = req.body;
      if (!route || !color) {
        return res.status(400).json({ message: "route and color are required" });
      }
      
      const updatedRows = await storage.bulkUpdateColorByRoute(route, color);
      res.json({ message: "Colors updated successfully", count: updatedRows.length, rows: updatedRows });
    } catch (error) {
      console.error('Error bulk updating colors:', error);
      res.status(500).json({ message: "Failed to bulk update colors" });
    }
  });

  // Table columns routes
  app.get("/api/table-columns", async (req, res) => {
    try {
      const columns = await storage.getTableColumns();
      res.json(columns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch table columns" });
    }
  });

  app.post("/api/table-columns", async (req, res) => {
    try {
      const validatedData = insertTableColumnSchema.parse(req.body);
      const column = await storage.createTableColumn(validatedData);
      res.status(201).json(column);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create table column" });
      }
    }
  });

  app.patch("/api/table-columns/:id", async (req, res) => {
    try {
      // Validate UUID parameter
      const validationResult = uuidSchema.safeParse(req.params.id);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid column ID format" });
      }
      
      const updates = insertTableColumnSchema.partial().parse(req.body);
      const column = await storage.updateTableColumn(req.params.id, updates);
      if (!column) {
        return res.status(404).json({ message: "Column not found" });
      }
      res.json(column);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update table column" });
      }
    }
  });

  app.post("/api/table-columns/reorder", async (req, res) => {
    try {
      const { columnIds } = req.body;
      if (!Array.isArray(columnIds)) {
        return res.status(400).json({ message: "columnIds must be an array" });
      }
      
      // Validate all IDs are UUIDs
      for (const id of columnIds) {
        const validationResult = uuidSchema.safeParse(id);
        if (!validationResult.success) {
          return res.status(400).json({ message: "All column IDs must be valid UUIDs" });
        }
      }
      const columns = await storage.reorderTableColumns(columnIds);
      res.json(columns);
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder table columns" });
    }
  });

  app.delete("/api/table-columns/:id", async (req, res) => {
    try {
      // Validate UUID parameter
      const validationResult = uuidSchema.safeParse(req.params.id);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid column ID format" });
      }
      
      const success = await storage.deleteTableColumn(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Column not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete table column" });
    }
  });

  // Add image to row
  app.post("/api/table-rows/:id/images", async (req, res) => {
    try {
      // Validate UUID parameter
      const validationResult = uuidSchema.safeParse(req.params.id);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid row ID format" });
      }
      
      const { imageUrl, caption } = req.body;
      if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ message: "imageUrl is required" });
      }

      const row = await storage.getTableRow(req.params.id);
      if (!row) {
        return res.status(404).json({ message: "Row not found" });
      }

      // Check if image URL already exists to prevent duplicates
      const existingImageUrls = row.images.map(img => img.url);
      if (existingImageUrls.includes(imageUrl)) {
        return res.status(400).json({ message: "Image URL already exists for this row" });
      }

      const newImage = {
        url: imageUrl,
        caption: caption && typeof caption === 'string' ? caption : "",
        type: "image" as const,
      };
      const updatedImages = [...row.images, newImage];
      const updatedRow = await storage.updateTableRow(req.params.id, { images: updatedImages });
      res.json(updatedRow);
    } catch (error) {
      res.status(500).json({ message: "Failed to add image to row" });
    }
  });

  // Update image in row
  app.patch("/api/table-rows/:id/images/:imageIndex", async (req, res) => {
    try {
      // Validate UUID parameter
      const validationResult = uuidSchema.safeParse(req.params.id);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid row ID format" });
      }
      
      const { imageUrl, caption } = req.body;
      const imageIndex = parseInt(req.params.imageIndex);
      
      // Validate imageIndex is a valid integer
      if (isNaN(imageIndex) || imageIndex < 0 || !Number.isInteger(imageIndex)) {
        return res.status(400).json({ message: "Image index must be a non-negative integer" });
      }

      const row = await storage.getTableRow(req.params.id);
      if (!row) {
        return res.status(404).json({ message: "Row not found" });
      }

      if (imageIndex >= row.images.length) {
        return res.status(400).json({ message: "Invalid image index" });
      }

      // Check if updating to a URL that already exists in another image
      if (imageUrl !== undefined) {
        const existingImageUrls = row.images.map((img, idx) => idx !== imageIndex ? img.url : null).filter(Boolean);
        if (existingImageUrls.includes(imageUrl)) {
          return res.status(400).json({ message: "Image URL already exists for this row" });
        }
      }

      const updatedImages = [...row.images];
      updatedImages[imageIndex] = {
        url: imageUrl !== undefined ? imageUrl : updatedImages[imageIndex].url,
        caption: caption !== undefined ? caption : updatedImages[imageIndex].caption,
        type: updatedImages[imageIndex].type || "image",
        thumbnail: updatedImages[imageIndex].thumbnail
      };
      
      const updatedRow = await storage.updateTableRow(req.params.id, { images: updatedImages });
      res.json(updatedRow);
    } catch (error) {
      res.status(500).json({ message: "Failed to update image" });
    }
  });

  // Delete image from row
  app.delete("/api/table-rows/:id/images/:imageIndex?", async (req, res) => {
    try {
      // Validate UUID parameter
      const validationResult = uuidSchema.safeParse(req.params.id);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid row ID format" });
      }
      
      const row = await storage.getTableRow(req.params.id);
      if (!row) {
        return res.status(404).json({ message: "Row not found" });
      }

      let updatedImages: typeof row.images;
      if (req.params.imageIndex === undefined) {
        // Delete all images
        updatedImages = [];
      } else {
        // Delete specific image
        const imageIndex = parseInt(req.params.imageIndex);
        
        // Validate imageIndex is a valid integer
        if (isNaN(imageIndex) || imageIndex < 0 || !Number.isInteger(imageIndex)) {
          return res.status(400).json({ message: "Image index must be a non-negative integer" });
        }
        
        if (imageIndex >= row.images.length) {
          return res.status(400).json({ message: "Invalid image index" });
        }
        updatedImages = row.images.filter((_, index) => index !== imageIndex);
      }

      const updatedRow = await storage.updateTableRow(req.params.id, { images: updatedImages });
      res.json(updatedRow);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete image(s)" });
    }
  });

  // QR Image Proxy to handle CORS issues
  app.get("/api/proxy-image", async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "URL parameter required" });
      }

      // Security checks
      if (!url.match(/^https?:\/\//)) {
        return res.status(400).json({ error: "Only HTTP/HTTPS URLs allowed" });
      }

      if (url.length > 2000) {
        return res.status(400).json({ error: "URL too long" });
      }

      // Fetch the image with timeout and size limit
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'QR-Scanner-Bot/1.0'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch image" });
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        return res.status(415).json({ error: "Not an image" });
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
        return res.status(413).json({ error: "Image too large" });
      }

      // Set CORS headers and stream the image
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300'
      });

      // Convert ReadableStream to Buffer and send
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
      
    } catch (error: any) {
      console.error("Proxy image error:", error);
      if (error.name === 'AbortError') {
        res.status(408).json({ error: "Request timeout" });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Calculate toll prices endpoint
  app.post("/api/calculate-tolls", async (req, res) => {
    try {
      const requestSchema = z.object({
        rowIds: z.array(z.string().uuid()).optional(),
      });

      const validatedData = requestSchema.parse(req.body);

      // Get rows to calculate tolls for
      let rows;
      if (validatedData.rowIds && validatedData.rowIds.length > 0) {
        const allRows = await storage.getTableRows();
        rows = allRows.filter(row => validatedData.rowIds!.includes(row.id));
      } else {
        rows = await storage.getTableRows();
        // Filter out the QL Kitchen row (sortOrder -1)
        rows = rows.filter(row => row.sortOrder !== -1);
      }

      // Calculate distances and toll prices for lorry-optimized routes
      const routeData = await calculateRoutesForDestinations(rows);

      // Update rows with distances and toll prices
      for (const row of rows) {
        const updates: any = {};
        
        if (routeData.distances[row.id] !== undefined) {
          updates.kilometer = routeData.distances[row.id].toString();
        }
        
        if (routeData.tollPrices[row.id] !== undefined) {
          updates.tollPrice = routeData.tollPrices[row.id].toFixed(2);
        }
        
        if (Object.keys(updates).length > 0) {
          await storage.updateTableRow(row.id, updates);
        }
      }

      res.json({ 
        success: true, 
        distances: routeData.distances,
        tollPrices: routeData.tollPrices,
        message: `Updated distances and toll prices for ${Object.keys(routeData.tollPrices).length} destinations`
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error("Toll calculation error:", error);
        res.status(500).json({ message: "Failed to calculate toll prices" });
      }
    }
  });

  // Route Optimization endpoint
  app.post("/api/optimize-route", async (req, res) => {
    try {
      const requestSchema = z.object({
        rowIds: z.array(z.string().uuid()).optional(),
        startLocation: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }).optional(),
        algorithm: z.enum(['nearest_neighbor', 'genetic', 'simulated_annealing']).optional(),
        prioritizeTrip: z.boolean().optional(),
        maxDistance: z.number().optional(),
        vehicleSpecs: z.object({
          type: z.string(),
          fuelType: z.string(),
          tollClass: z.number(),
        }).optional(),
      });

      const validatedData = requestSchema.parse(req.body) as RouteOptimizationRequest;

      // Get all rows or specific rows
      let rows;
      if (validatedData.rowIds && validatedData.rowIds.length > 0) {
        const allRows = await storage.getTableRows();
        rows = allRows.filter(row => validatedData.rowIds!.includes(row.id));
      } else {
        rows = await storage.getTableRows();
        // Filter out the QL Kitchen row (sortOrder -1)
        rows = rows.filter(row => row.sortOrder !== -1);
      }

      // Filter to only rows with valid coordinates
      const validRows = rows.filter(row => 
        row.latitude && 
        row.longitude && 
        !isNaN(parseFloat(row.latitude)) && 
        !isNaN(parseFloat(row.longitude)) &&
        parseFloat(row.latitude) !== 0 && 
        parseFloat(row.longitude) !== 0
      );

      if (validRows.length < 2) {
        return res.status(400).json({ 
          message: `At least 2 locations with valid coordinates are required for optimization. Found ${validRows.length}.` 
        });
      }

      // Run optimization on valid rows only
      const result = optimizeRoute(
        validRows,
        validatedData.algorithm || 'nearest_neighbor',
        validatedData.startLocation,
        validatedData.prioritizeDelivery || false
      );

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        console.error("Route optimization error:", error);
        res.status(500).json({ message: "Failed to optimize route" });
      }
    }
  });

  // Save route optimization result
  app.post("/api/save-route", async (req, res) => {
    try {
      const validatedData = insertRouteOptimizationSchema.parse(req.body);
      const savedRoute = await storage.saveRoute(validatedData);
      res.status(201).json(savedRoute);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Save route error:", error);
        res.status(500).json({ message: "Failed to save route" });
      }
    }
  });

  // Get all saved routes
  app.get("/api/saved-routes", async (req, res) => {
    try {
      const savedRoutes = await storage.getSavedRoutes();
      res.json(savedRoutes);
    } catch (error) {
      console.error("Get saved routes error:", error);
      res.status(500).json({ message: "Failed to fetch saved routes" });
    }
  });

  // Get a specific saved route
  app.get("/api/saved-routes/:id", async (req, res) => {
    try {
      const validationResult = uuidSchema.safeParse(req.params.id);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid route ID format" });
      }

      const savedRoute = await storage.getSavedRoute(req.params.id);
      if (!savedRoute) {
        return res.status(404).json({ message: "Saved route not found" });
      }
      res.json(savedRoute);
    } catch (error) {
      console.error("Get saved route error:", error);
      res.status(500).json({ message: "Failed to fetch saved route" });
    }
  });

  // Delete a saved route
  app.delete("/api/saved-routes/:id", async (req, res) => {
    try {
      const validationResult = uuidSchema.safeParse(req.params.id);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid route ID format" });
      }

      const success = await storage.deleteSavedRoute(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Saved route not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Delete saved route error:", error);
      res.status(500).json({ message: "Failed to delete saved route" });
    }
  });

  // Layout preferences routes
  app.get("/api/layout", async (req, res) => {
    try {
      const userIdSchema = z.string().min(1, "userId cannot be empty");
      const validationResult = userIdSchema.safeParse(req.query.userId);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "userId is required",
          errors: validationResult.error.errors 
        });
      }
      
      const userId = validationResult.data;
      const layout = await storage.getLayoutPreferences(userId);
      
      if (!layout) {
        return res.status(404).json({ message: "No saved layout found" });
      }
      
      res.json(layout);
    } catch (error) {
      console.error("Get layout preferences error:", error);
      res.status(500).json({ message: "Failed to fetch layout preferences" });
    }
  });

  app.post("/api/layout", async (req, res) => {
    try {
      const userIdSchema = z.string().min(1, "userId cannot be empty");
      const userIdValidation = userIdSchema.safeParse(req.body.userId);
      
      if (!userIdValidation.success) {
        return res.status(400).json({ 
          message: "userId is required",
          errors: userIdValidation.error.errors 
        });
      }
      
      const userId = userIdValidation.data;
      const { userId: _, ...layoutData } = req.body;
      const validatedData = insertLayoutPreferencesSchema.parse(layoutData);
      const layout = await storage.saveLayoutPreferences(userId, validatedData);
      res.status(200).json(layout);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Save layout preferences error:", error);
        res.status(500).json({ message: "Failed to save layout preferences" });
      }
    }
  });

  // Pages routes
  app.get("/api/pages", async (req, res) => {
    try {
      const pages = await storage.getPages();
      res.json(pages);
    } catch (error) {
      console.error("Get pages error:", error);
      res.status(500).json({ message: "Failed to fetch pages" });
    }
  });

  app.get("/api/pages/:id", async (req, res) => {
    try {
      const validationResult = uuidSchema.safeParse(req.params.id);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid page ID format" });
      }
      
      const page = await storage.getPage(req.params.id);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("Get page error:", error);
      res.status(500).json({ message: "Failed to fetch page" });
    }
  });

  app.post("/api/pages", async (req, res) => {
    try {
      console.log("Received page creation request:", JSON.stringify(req.body, null, 2));
      const validatedData = insertPageSchema.parse(req.body);
      console.log("Validated page data:", JSON.stringify(validatedData, null, 2));
      const page = await storage.createPage(validatedData);
      console.log("Page created successfully:", JSON.stringify(page, null, 2));
      res.status(201).json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Create page error:", error);
        console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
        res.status(500).json({ 
          message: "Failed to create page",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });

  app.patch("/api/pages/:id", async (req, res) => {
    try {
      const validationResult = uuidSchema.safeParse(req.params.id);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid page ID format" });
      }
      
      const updates = insertPageSchema.partial().parse(req.body);
      const page = await storage.updatePage(req.params.id, updates);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Update page error:", error);
        res.status(500).json({ message: "Failed to update page" });
      }
    }
  });

  app.delete("/api/pages/:id", async (req, res) => {
    try {
      const validationResult = uuidSchema.safeParse(req.params.id);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid page ID format" });
      }
      
      const success = await storage.deletePage(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Page not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Delete page error:", error);
      res.status(500).json({ message: "Failed to delete page" });
    }
  });

  // Global settings routes
  app.get("/api/global-settings/:key", async (req, res) => {
    try {
      const key = req.params.key;
      const setting = await storage.getGlobalSetting(key);
      if (!setting) {
        // Return default value for footerCompanyName if not found
        if (key === 'footerCompanyName') {
          return res.json({ key, value: 'Vending Machine' });
        }
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      console.error("Get global setting error:", error);
      res.status(500).json({ message: "Failed to fetch global setting" });
    }
  });

  app.post("/api/global-settings", async (req, res) => {
    try {
      const schema = z.object({
        key: z.string(),
        value: z.string(),
      });
      const { key, value } = schema.parse(req.body);
      const setting = await storage.setGlobalSetting(key, value);
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Set global setting error:", error);
        res.status(500).json({ message: "Failed to save global setting" });
      }
    }
  });

  // Shared table state routes
  app.post("/api/share-table", async (req, res) => {
    try {
      const validatedData = insertSharedTableStateSchema.parse(req.body);
      const sharedState = await storage.createSharedTableState(validatedData);
      res.status(201).json(sharedState);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Create shared table state error:", error);
        res.status(500).json({ message: "Failed to create shared table state" });
      }
    }
  });

  app.get("/api/share-table/:shareId", async (req, res) => {
    try {
      const shareId = req.params.shareId;
      const sharedState = await storage.getSharedTableState(shareId);
      if (!sharedState) {
        return res.status(404).json({ message: "Shared table state not found" });
      }
      res.json(sharedState);
    } catch (error) {
      console.error("Get shared table state error:", error);
      res.status(500).json({ message: "Failed to fetch shared table state" });
    }
  });

  // Saved share links routes
  app.get("/api/saved-share-links", async (req, res) => {
    try {
      const links = await storage.getSavedShareLinks();
      res.json(links);
    } catch (error) {
      console.error("Get saved share links error:", error);
      res.status(500).json({ message: "Failed to fetch saved share links" });
    }
  });

  app.post("/api/saved-share-links", async (req, res) => {
    try {
      const validatedData = insertSavedShareLinkSchema.parse(req.body);
      const savedLink = await storage.createSavedShareLink(validatedData);
      res.status(201).json(savedLink);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Create saved share link error:", error);
        res.status(500).json({ message: "Failed to save share link" });
      }
    }
  });

  app.patch("/api/saved-share-links/:id/remark", async (req, res) => {
    try {
      const schema = z.object({
        remark: z.string(),
      });
      const { remark } = schema.parse(req.body);
      const updated = await storage.updateSavedShareLinkRemark(req.params.id, remark);
      if (!updated) {
        return res.status(404).json({ message: "Saved share link not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Update saved share link remark error:", error);
        res.status(500).json({ message: "Failed to update remark" });
      }
    }
  });

  app.delete("/api/saved-share-links/:id", async (req, res) => {
    try {
      const success = await storage.deleteSavedShareLink(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Saved share link not found" });
      }
      res.json({ message: "Saved share link deleted successfully" });
    } catch (error) {
      console.error("Delete saved share link error:", error);
      res.status(500).json({ message: "Failed to delete saved share link" });
    }
  });

  // Custom Tables routes
  app.get("/api/custom-tables", async (req, res) => {
    try {
      const tables = await storage.getCustomTables();
      res.json(tables);
    } catch (error) {
      console.error("Get custom tables error:", error);
      res.status(500).json({ message: "Failed to fetch custom tables" });
    }
  });

  app.get("/api/custom-tables/:id", async (req, res) => {
    try {
      const table = await storage.getCustomTable(req.params.id);
      if (!table) {
        return res.status(404).json({ message: "Custom table not found" });
      }
      res.json(table);
    } catch (error) {
      console.error("Get custom table error:", error);
      res.status(500).json({ message: "Failed to fetch custom table" });
    }
  });

  app.get("/api/custom-tables/:id/rows", async (req, res) => {
    try {
      const rows = await storage.getCustomTableRows(req.params.id);
      res.json(rows);
    } catch (error) {
      console.error("Get custom table rows error:", error);
      res.status(500).json({ message: "Failed to fetch custom table rows" });
    }
  });

  app.get("/api/custom-tables/share/:shareId", async (req, res) => {
    try {
      const table = await storage.getCustomTableByShareId(req.params.shareId);
      if (!table) {
        return res.status(404).json({ message: "Custom table not found" });
      }
      res.json(table);
    } catch (error) {
      console.error("Get custom table by shareId error:", error);
      res.status(500).json({ message: "Failed to fetch custom table" });
    }
  });

  app.post("/api/custom-tables", async (req, res) => {
    try {
      const { name, description, rowIds } = req.body;
      
      // Validate required fields
      if (!name || !rowIds || !Array.isArray(rowIds) || rowIds.length === 0) {
        return res.status(400).json({ message: "Name and at least one row ID are required" });
      }

      // Generate unique share ID
      const shareId = Math.random().toString(36).substring(2, 8);
      
      // Create custom table
      const tableData = insertCustomTableSchema.parse({
        name,
        shareId,
        description: description || "",
      });
      
      const customTable = await storage.createCustomTable(tableData, rowIds);
      res.status(201).json(customTable);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Create custom table error:", error);
        res.status(500).json({ message: "Failed to create custom table" });
      }
    }
  });

  app.patch("/api/custom-tables/:id", async (req, res) => {
    try {
      const updates = insertCustomTableSchema.partial().parse(req.body);
      const table = await storage.updateCustomTable(req.params.id, updates);
      if (!table) {
        return res.status(404).json({ message: "Custom table not found" });
      }
      res.json(table);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Update custom table error:", error);
        res.status(500).json({ message: "Failed to update custom table" });
      }
    }
  });

  app.put("/api/custom-tables/:id/rows", async (req, res) => {
    try {
      const { name, description, rowIds } = req.body;
      
      // Validate required fields
      if (!rowIds || !Array.isArray(rowIds) || rowIds.length === 0) {
        return res.status(400).json({ message: "At least one row ID is required" });
      }

      // Update custom table metadata
      if (name || description !== undefined) {
        await storage.updateCustomTable(req.params.id, { name, description });
      }

      // Delete existing custom table rows
      await storage.deleteCustomTableRows(req.params.id);

      // Create new custom table rows
      for (const rowId of rowIds) {
        await storage.createCustomTableRow({
          customTableId: req.params.id,
          tableRowId: rowId
        });
      }

      const table = await storage.getCustomTable(req.params.id);
      res.json(table);
    } catch (error) {
      console.error("Update custom table rows error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update custom table rows" });
      }
    }
  });

  app.delete("/api/custom-tables/:id", async (req, res) => {
    try {
      const success = await storage.deleteCustomTable(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Custom table not found" });
      }
      res.json({ message: "Custom table deleted successfully" });
    } catch (error) {
      console.error("Delete custom table error:", error);
      res.status(500).json({ message: "Failed to delete custom table" });
    }
  });

  // ImgBB image upload route
  app.post("/api/upload-image", async (req, res) => {
    try {
      const { image, name } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: "Image data is required" });
      }

      const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
      if (!IMGBB_API_KEY) {
        return res.status(500).json({ error: "ImgBB API key not configured" });
      }

      // Remove data URL prefix if present
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      // Upload to ImgBB
      const formData = new URLSearchParams();
      formData.append('key', IMGBB_API_KEY);
      formData.append('image', base64Data);
      formData.append('name', name || 'upload');

      const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'ImgBB upload failed');
      }

      const data = await response.json();
      
      if (data.success) {
        res.json({ 
          url: data.data.url,
          display_url: data.data.display_url,
          thumb: data.data.thumb?.url,
          delete_url: data.data.delete_url
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('ImgBB upload error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to upload image'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
