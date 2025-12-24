import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { WhatsAppService } from "./services/WhatsAppService";
import { NotificationService } from "./services/NotificationService";
import {
  InventoryService,
  ProcessSaleInput,
} from "./services/InventoryService";
import { UserService } from "./services/UserService";
import { ProductService } from "./services/ProductService";
import { PaymentService } from "./services/PaymentService";
import { PrinterService } from "./services/PrinterService";
import { ReceiptService } from "./services/ReceiptService";

let mainWindow: BrowserWindow | null = null;

// Single PrismaClient for the whole Electron process.
// This avoids SQLite file locks and keeps connection handling predictable.
const prisma = new PrismaClient();

const inventoryService = new InventoryService(prisma);
const userService = new UserService(prisma);
const productService = new ProductService(prisma);
const paymentService = new PaymentService();
const printerService = new PrinterService();
const receiptService = new ReceiptService(prisma, printerService);
const whatsappService = new WhatsAppService();
const notificationService = new NotificationService(prisma, whatsappService);

async function initDatabase() {
  await prisma.$connect();

  // WAL mode is safer for power cuts and lets reads continue while writes happen.
  await prisma.$executeRawUnsafe(`PRAGMA journal_mode = WAL;`);
  // FULL means SQLite syncs to disk properly before confirming the write.
  await prisma.$executeRawUnsafe(`PRAGMA synchronous = FULL;`);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      // Preload is where the IPC bridge lives – Renderer never sees Prisma.
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const indexHtml = path.join(__dirname, "../renderer/index.html");

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
  } else {
    await mainWindow.loadURL(`file://${indexHtml}`);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function boot() {
  await initDatabase();
  await createWindow();
}

// ---- Electron lifecycle ----------------------------------------------------

app.on("ready", () => {
  boot().catch((err) => {
    // If boot fails we want it loud and obvious during development.
    console.error("Failed to boot Duka-OS main process:", err);
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async (event) => {
  // Give Prisma a chance to flush WAL and close cleanly.
  event.preventDefault();
  try {
    await prisma.$disconnect();
  } finally {
    app.exit(0);
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    void createWindow();
  }
});

// ---- IPC handlers: thin wrappers over services ----------------------------

// Sales / inventory.
ipcMain.handle(
  "sale:create",
  async (_event, payload: ProcessSaleInput) => {
    return inventoryService.processSale(payload);
  }
);

// Receive stock into inventory (e.g. deliveries).
ipcMain.handle(
  "stock:receive",
  async (
    _event,
    payload: { entries: { productId: number; quantity: number }[] }
  ) => {
    return inventoryService.receiveStock(payload.entries);
  }
);>
// User login by PIN.
ipcMain.handle("user:login", async (_event, pin: string) => {
  return userService.loginWithPin(pin);
});

// Product search for POS grid.
ipcMain.handle("product:search", async (_event, query: string) => {
  return productService.searchProducts(query);
});

// Scan lookup tuned for barcode scanners.
ipcMain.handle("product:scanLookup", async (_event, term: string) => {
  return productService.scanLookup(term);
});

// Create a simple ad-hoc product (e.g. avocados from your tree).
ipcMain.handle(
  "product:createCustom",
  async (_event, payload: { name: string; price: number }) => {
    return productService.createCustomProduct(payload.name, payload.price);
  }
);

// Upsert a basic catalog product from a scanned barcode.
ipcMain.handle(
  "product:upsertBasic",
  async (
    _event,
    payload: { barcode: string; name: string; price: number }
  ) => {
    return productService.upsertBasicProduct(
      payload.barcode,
      payload.name,
      payload.price
    );
  }
);

// Payments: M-Pesa STK (single default channel for now).
ipcMain.handle(
  "payment:initiateSTK",
  async (_event, payload: { phone: string; amount: number }) => {
    return paymentService.initiateSTK(payload.phone, payload.amount);
  }
);

ipcMain.handle(
  "payment:checkStatus",
  async (_event, checkoutRequestId: string) => {
    return paymentService.checkStatus(checkoutRequestId);
  }
);

// Printing: sale receipt by sale ID.
ipcMain.handle(
  "printer:printSaleReceipt",
  async (_event, saleId: number) => {
    return receiptService.printSaleReceipt(saleId);
  }
);

// Notifications: low stock report via WhatsApp.
ipcMain.handle(
  "notify:lowStock",
  async (_event, threshold?: number) => {
    return notificationService.sendLowStockReport(
      typeof threshold === "number" ? threshold : undefined
    );
  }
);

// Notifications: owner help request (e.g. forgotten PIN).
ipcMain.handle(
  "notify:ownerHelp",
  async (_event, context?: string) => {
    return notificationService.sendOwnerHelpRequest(context);
  }
);