import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const SHEETS_FILE = path.join(process.cwd(), "sheets.json");

// Middleware to parse large JSON (e.g. Base64 custom logos)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper to load sheets
async function getSheetsData(): Promise<any[]> {
  try {
    if (!fs.existsSync(SHEETS_FILE)) {
      return [];
    }
    const raw = await fs.promises.readFile(SHEETS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error reading sheets file, resetting to empty:", error);
    return [];
  }
}

// Helper to save sheets
async function saveSheetsData(sheets: any[]): Promise<void> {
  await fs.promises.writeFile(SHEETS_FILE, JSON.stringify(sheets, null, 2), "utf-8");
}

// API Routes
// GET all sheets (metadata only)
app.get("/api/sheets", async (req, res) => {
  try {
    const sheets = await getSheetsData();
    // Return only metadata for list selection to save bandwidth
    const list = sheets.map((s) => ({
      id: s.id,
      name: s.name,
      updatedAt: s.updatedAt || new Date().toISOString(),
      rowCount: s.rows?.length || 0,
      totalWages: s.totals?.totalManualMoney || 0,
      selectedLogoId: s.selectedLogoId || "crown"
    }));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load sheets: " + err.message });
  }
});

// GET single sheet detail
app.get("/api/sheets/:id", async (req, res) => {
  try {
    const sheets = await getSheetsData();
    const sheet = sheets.find((s) => s.id === req.params.id);
    if (!sheet) {
      return res.status(404).json({ error: "Sheet not found" });
    }
    res.json(sheet);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch sheet: " + err.message });
  }
});

// POST save/update sheet
app.post("/api/sheets", async (req, res) => {
  try {
    const { id, name, rows, selectedLogoId, uploadedLogo, totals } = req.body;
    if (!name || !Array.isArray(rows)) {
      return res.status(400).json({ error: "Name and rows array are required" });
    }

    const sheets = await getSheetsData();
    const existingIndex = id ? sheets.findIndex((s) => s.id === id) : -1;

    const targetId = id || `sheet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newSheet = {
      id: targetId,
      name,
      rows,
      selectedLogoId: selectedLogoId || "crown",
      uploadedLogo: uploadedLogo || null,
      totals: totals || null,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex > -1) {
      sheets[existingIndex] = newSheet;
    } else {
      sheets.push(newSheet);
    }

    await saveSheetsData(sheets);
    res.json(newSheet);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save sheet: " + err.message });
  }
});

// DELETE sheet
app.delete("/api/sheets/:id", async (req, res) => {
  try {
    const sheets = await getSheetsData();
    const filtered = sheets.filter((s) => s.id !== req.params.id);
    if (filtered.length === sheets.length) {
      return res.status(404).json({ error: "Sheet not found" });
    }
    await saveSheetsData(filtered);
    res.json({ success: true, message: "Sheet deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete sheet: " + err.message });
  }
});

// Serve Vite Assets & Handle Single Page Applications Routing
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();
