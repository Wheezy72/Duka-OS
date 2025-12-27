# Duka-OS Developer Guide

Welcome to Duka-OS – a production-grade retail OS tuned for Kenyan dukas and mini-supermarkets.

This guide gives you enough context to safely extend the system without breaking the core guarantees:

- **One-way data flow** from UI down to the database.
- **Append-only stock history** so we can always explain where inventory went.
- **Stable, calm POS UI** that cashiers can trust during a rush.

---

## 1. Project Structure

At the top level the project is split into a few main areas:

```text
.
├── electron/          # Electron main process + services (business logic)
│   ├── main.ts        # Boot sequence, IPC wiring, DB init
│   └── services/      # Inventory, Payments, Printing, Auth, Products, Reports...
├── prisma/            # Prisma schema & migrations (SQLite)
│   └── schema.prisma
├── src/               # Renderer (Vite + React + TypeScript)
│   ├── main.tsx       # React entrypoint
│   ├── App.tsx        # Top-level app shell + navigation + auth
│   └── layouts/       # Screen layouts
│       ├── PosLayout.tsx
│       ├── ProductSetupLayout.tsx
│       ├── StockReceiveLayout.tsx
│       └── ReportsLayout.tsx
└── scripts/           # One-off scripts (seed, health checks)
    ├── seedMockData.ts
    └── checkHealth.ts
```text
.
├── electron/        # Electron main process + services (business logic)
│   ├── main.ts      # Boot sequence, IPC wiring, DB init, IPC handlers
│   ├── preload.ts   # IPC bridge → exposes window.duka.* to the renderer
│   └── services/    # Inventory, Payments, Printing, Auth, Products...
├── prisma/          # Prisma schema & migrations (SQLite)
│   └── schema.prisma
└── src/             # Renderer (Vite + React + TypeScript)
    └── layouts/
        └── PosLayout.tsx
```

### 1.1 Electron (Main Process)

- **`electron/main.ts`**
  - Boots Prisma/SQLite and configures WAL mode.
  - Creates the `BrowserWindow` with secure defaults:
    - `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
  - Registers IPC handlers (e.g. `sale:create`, `user:login`, `product:search`, `payment:initiateSTK`, `printer:printSaleReceipt`, `drawer:open`, `report:getDaily`, `report:exportDailyCsv`).
  - IPC handlers are **thin** – they just call service methods.

- **`electron/services/InventoryService.ts`**
  - Owns stock movement and sale creation logic.
  - Handles **bulk breaking** (e.g., sack → kilos) inside a single DB transaction.
  - Writes `StockEvent` rows for every stock change (forensic trail).
  - Supports `receiveStock` (stock in) with `RESTOCK` StockEvents.

- **`electron/services/PaymentService.ts`**
  - Handles M-Pesa STK Push (online payments).
  - Uses Safaricom’s REST APIs (sandbox vs production based on `NODE_ENV`).
  - Returns explicit statuses and never auto-retries.

- **`electron/services/PrinterService.ts`**
  - Talks directly to a USB thermal printer using raw bytes (via `usb`).
  - Formats a simple receipt:
    - Header: shop name (`DUKA_NAME`) and contact (`DUKA_CONTACT`).
    - Items, line totals, and `TOTAL`.
    - Footer: “Thank You”.
  - Can send an ESC/POS pulse to **open the cash drawer** via the printer (`openCashDrawer`).
  - Vendor/Product IDs are definable in code so techs can fix printers on-site.

- **`electron/services/ReceiptService.ts`**
  - Fetches a sale with items/products from Prisma and calls `PrinterService.printReceipt`.

- **`electron/services/NotificationService.ts`** + **`WhatsAppService.ts`**
  - Wrap WhatsApp Cloud API for:
    - Low-stock reports.
    - Owner help requests (e.g. forgotten PIN).
  - Use env vars: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_OWNER_NUMBER`.

- **`electron/services/ReportService.ts`**
  - Provides daily sales summaries and CSV exports.
  - Uses `Sale` + `SaleItem` to calculate totals and save `exports/sales-YYYY-MM-DD.csv`.

- **Other services**
  - `UserService` – PIN login + user creation using hashed PINs (`sha256`).
  - `ProductService` – product lookup, barcode scan lookup, custom products.

### 1.2 Prisma (Database Layer)

- **`prisma/schema.prisma`**
  - SQLite datasource with a file-based DB (e.g. `dev.db`).
  - Models:
    - `Product` – stock, pricing, bulk/child relationships, conversion factors.
    - `Sale` / `SaleItem` – sales and line items (with `priceAtSale` snapshot).
    - `StockEvent` – append-only log of all stock movements.
    - `User` – hashed PIN and role (`OWNER`, `CASHIER`).
    - `Shift` – shift-level cash controls.

Run migrations:

```bash
npx prisma migrate dev
```

Regenerate the Prisma client after any schema change:

```bash
npx prisma generate
```

### 1.3 Renderer (React + Vite)

- **`src/main.tsx`**
  - React entrypoint that renders `App` into `#root`.

- **`src/App.tsx`**
  - Top-level app shell:
    - Handles login screen (PIN).
    - Tracks `userRole` (`OWNER` or `CASHIER`).
    - Shows a header with:
      - App name.
      - “Logged in as: …” pill.
      - Navigation tabs: POS, Product Setup, Receive Stock, Reports.
      - Owner controls: Add user, low-stock threshold, “Send low stock report”, “Owner help”.
      - Logout button.
    - Routes to different layouts based on state (no React Router; just simple state).

- **`src/layouts/PosLayout.tsx`**
  - Main POS layout:
    - **Left**:
      - Scan box: barcode scanner types here and hits Enter.
      - Custom item section (for items without barcodes e.g. avocados from your tree).
      - Quick grid of common items.
    - **Right**:
      - Cart, totals.
      - M-Pesa number, Pay Cash, Pay with M-Pesa.
      - Status messages for payments.
  - Uses a `useTheme` hook that toggles a root class on `<html>`.
  - Themes:
    - `duka-dark` – calm night mode.
    - `high-vis` – for bright kiosks.
    - `daylight` – neutral daytime mode.

- **`src/layouts/ProductSetupLayout.tsx`**
  - Owner screen to “teach” Duka-OS about new products using a barcode scanner:
    - Scan a barcode.
    - If known, shows existing name/price.
    - If new, lets you enter name/price.
    - Saves a `Product` with that barcode.

- **`src/layouts/StockReceiveLayout.tsx`**
  - Owner screen for receiving deliveries:
    - Scan barcode.
    - See product details.
    - Enter units received.
    - Calls `InventoryService.receiveStock` to update stock and write `RESTOCK` events.

- **`src/layouts/ReportsLayout.tsx`**
  - Owner screen for daily sales:
    - Pick a date.
    - See total sales, Cash total, M-Pesa total, and sale count.
    - “Download CSV” button writes `exports/sales-YYYY-MM-DD.csv`.

The rule is always: **renderer → preload (`window.duka`) → main (IPC) → services → DB**.

---

## 2. Architecture: One-Way Data Flow

The core architectural rule:

> **UI (Renderer) → IPC Bridge → Electron Main → Services (Business Logic) → Database (Prisma/SQLite)**

### 2.1 Rules

1. **UI must NEVER talk to Prisma directly**
   - React and hooks should never import `@prisma/client`.
   - All data access goes through IPC channels that are handled in `electron/main.ts`.

2. **IPC Handlers must be thin wrappers**
   - No business logic in `ipcMain.handle` blocks.
   - Handlers just unpack the payload, call a service, and return the result.
   - All branching and decisions live in services.

3. **Services must be Electron-agnostic and testable**
   - Services should only depend on:
     - `@prisma/client` (for DB access).
     - Node libs (e.g. `crypto`, `usb`, `fetch`).
   - No imports from `electron` or the renderer.
   - You should be able to unit test services in plain Node.js.

### 2.2 Bulk / Sack-to-Kilo Logic

Inventory is designed for real dukas:

- `Product.isBulkParent`
  - Example: 50kg sack of sugar.
- `Product.conversionFactor`
  - Lives on **child** products. Example: 50kg sack → 50 × 1kg units.
- `Product.parentProductId`
  - Child product points to its bulk parent.

When a sale is processed:

1. **Never pre-block on stock.**
   - We do not check “is there enough?” and reject the sale.
   - We always attempt to fulfill and allow negative stock if necessary.

2. **If child stock is low and a parent exists:**
   - Break the required number of parent units into child units using `conversionFactor`.
   - This happens **inside a Prisma transaction** so stock and `StockEvent`s stay in sync.

3. **Audit trail via `StockEvent`:**
   - `reason = BULK_BREAK_SOURCE` for parent decrement.
   - `reason = BULK_BREAK_DEST` for child increment.
   - `reason = SALE` for the actual sale deduction.
   - Because this table is append-only, you can reconstruct stock history later.

---

## 3. Environment Variables

Duka-OS relies on a few environment variables, especially for M-Pesa, WhatsApp, and receipt branding.

### 3.1 Core

- `NODE_ENV` – `development` or `production` (impacts M-Pesa base URL).

### 3.2 Branding

- `DUKA_NAME` – Shop name printed on receipts (e.g. `MY MINI MART`).
- `DUKA_CONTACT` – Contact line printed on receipts (e.g. `0712 345 678 - Market Rd`).

### 3.3 M-Pesa

- `MPESA_KEY` – Safaricom consumer key.
- `MPESA_SECRET` – Safaricom consumer secret.
- `MPESA_SHORT_CODE` – Till/PayBill shortcode.
- `MPESA_PASSKEY` – Passkey for STK push.
- `MPESA_CALLBACK_URL` – Public HTTPS URL for M-Pesa callbacks (can be an `ngrok`/tunnel URL in dev).

### 3.4 WhatsApp (Owner alerts)

- `WHATSAPP_ACCESS_TOKEN` – WhatsApp Cloud API access token.
- `WHATSAPP_PHONE_NUMBER_ID` – Phone number ID from Facebook/Meta.
- `WHATSAPP_OWNER_NUMBER` – Owner’s WhatsApp phone in international format (e.g. `2547XXXXXXXX`).

If WhatsApp variables are missing, Duka-OS will log warnings and features like “Owner help” and low-stock reports will fail gracefully instead of crashing.Database Models Overview

Summarised from `schema.prisma`:

### 3.1 Product

- Fields:
  - `id`, `name`, `barcode?`, `stockQty`, `price`
  - `isBulkParent` (boolean)
  - `conversionFactor?` (float; on child: parent units → child units)
  - `parentProductId?` (self-relation)
- Relationships:
  - `parent` / `children`
  - `saleItems`
  - `stockEvents`

### 3.2 Sale & SaleItem

- `Sale`:
  - `total` (float, KES)
  - `paymentMethod` (`CASH`, `MPESA`)
  - `isSynced` (bool for cloud sync later)
  - `createdAt`
- `SaleItem`:
  - Links `Sale` to `Product`.
  - `quantity` (float)
  - `priceAtSale` (float; snapshot of unit price at the moment of sale).

### 3.3 StockEvent (Append-Only Log)

- Fields:
  - `productId`
  - `delta` (float; positive or negative)
  - `reason` (`SALE`, `BULK_BREAK_SOURCE`, `BULK_BREAK_DEST`, `RESTOCK`)
  - `createdAt`
- Never update or delete rows; always append.

This table is your forensic audit trail when things don’t add up.

### 3.4 User & Shift

- `User`:
  - `pinHash` – hashed PIN (no plain text PINs).
  - `role` – `OWNER` or `CASHIER`.
- `Shift`:
  - `cashStart` – float placed in till at open.
  - `cashEnd` – expected closing cash from system.
  - `actualCash` – physically counted closing cash.
  - `openedAt`, `closedAt`.

---

## 4. Electron Boot Sequence

File: **`electron/main.ts`**

### 4.1 Steps

1. **Create a single `PrismaClient`**
   - Shared across the process to avoid “database is locked”.

2. **Initialize the DB**
   - Connect and run PRAGMAs:
     - `PRAGMA journal_mode = WAL;`
       - WAL is more resilient to power cuts and lets reads happen while writes commit.
     - `PRAGMA synchronous = FULL;`
       - Ensures data is on disk before SQLite reports success.

3. **Create the main `BrowserWindow`**
   - Load Vite dev server in development.
   - Load built `index.html` in production.
   - Attach `preload.js` so the renderer gets `window.duka` instead of raw `ipcRenderer`.

4. **Wire IPC handlers**
   - `sale:create` → `InventoryService.processSale`
   - `user:login` → `UserService.loginWithPin`
   - `product:search` → `ProductService.searchProducts`
   - `payment:initiateSTK` / `payment:checkStatus` → `PaymentService`
   - `printer:printSaleReceipt` → `ReceiptService` → `PrinterService`

5. **Clean shutdown**
   - On `before-quit`, disconnect Prisma so WAL is flushed and the DB is cleanly closed.

---

## 5. Troubleshooting

### 5.1 “Database is locked”

Symptoms:

- Requests to Prisma hang or throw “database is locked”.
- App crashes during heavy use or after a hard power cut.

Steps:

1. **Close the app completely**
   - Ensure no Electron processes remain in Task Manager / Activity Monitor.

2. **Delete SQLite sidecar files**
   - In the `prisma/` (or wherever `dev.db` lives) directory, delete:
     - `dev.db-shm`
     - `dev.db-wal`
   - These are the shared memory and write-ahead log files.
   - SQLite recreates them on next startup.

3. **Restart the app**
   - Prisma will reconnect and reapply WAL configuration on boot.

### 5.2 “Printer not found”

Symptoms:

- Printing does nothing or errors from `PrinterService`.
- Logs: “USB receipt printer not found. Check VendorID/ProductID.”

Steps:

1. **Check `PrinterService.ts`**
   - Open `electron/services/PrinterService.ts`.
   - Look for:

     ```ts
     private static readonly PRINTER_VENDOR_ID = 0x1234;
     private static readonly PRINTER_PRODUCT_ID = 0x0001;
     ```

2. **Find the actual IDs**
   - On Windows:
     - Open Device Manager → right click the printer → Properties → Details.
     - Select “Hardware Ids” and note the `VID_XXXX` and `PID_YYYY`.
   - On Linux/macOS:
     - Run `lsusb` and find the line for your printer.

3. **Update the constants**
   - Replace the vendor/product IDs in `PrinterService.ts` with the real values.
   - Rebuild / restart Electron.

4. **Permission issues (Linux)**
   - You may need a udev rule to give the Electron process permission to talk to USB.

### 5.3 M-Pesa issues

#### “M-Pesa config error on startup”

If the app crashes early with a message like:

> Missing M-Pesa configuration. Ensure MPESA_KEY, MPESA_SECRET, MPESA_SHORT_CODE and MPESA_PASSKEY are set.

Check your `.env` or environment variables (see below).

#### STK Push fails or is slow

- Frontend should show an error and optionally switch to **manual mode**.
- The `PaymentService`:
  - **Does not auto-retry** STK Push to avoid double billing.
  - Returns `manualMode: true` on errors so the UI can fall back to cash/manual verification.

#### Status not clear

If the status polling fails or returns an unknown result code:

- `PaymentService.checkStatus` returns:

  ```ts
  { status: "MANUAL_VERIFY_NEEDED", reason: "..." }
  ```

- Cashier should:
  - Check the customer’s M-Pesa SMS.
  - Verify with owner or in the M-Pesa app/portal.

---

## 6. Environment Variables

Set these in your `.env` or system environment before running Electron or migrations.

### 6.1 Core

- **`NODE_ENV`**
  - `development` or `production`.
  - Controls which M-Pesa base URL is used.
    - `development` → `https://sandbox.safaricom.co.ke`
    - `production` → `https://api.safaricom.co.ke`

- **`MPESA_KEY`**
  - Safaricom M-Pesa API consumer key (from the portal/app).

- **`MPESA_SECRET`**
  - Safaricom M-Pesa API consumer secret.

### 6.2 M-Pesa STK Push

Required for STK Push to work:

- **`MPESA_SHORT_CODE`**
  - Your paybill/till number used as `BusinessShortCode`.

- **`MPESA_PASSKEY`**
  - Lipa Na M-Pesa online passkey (Safaricom portal).

- **`MPESA_CALLBACK_URL`**
  - Public HTTPS URL where Safaricom posts STK callback results.
  - In development you can use tools like `ngrok` to expose a local endpoint.

---

## 7. Working with the POS UI

File: **`src/layouts/PosLayout.tsx`**

### 7.1 Layout Philosophy

- **Left 60%** – Product grid.
  - High-frequency area; cashier taps here most of the time.
  - Designed for “muscle memory” – stable grid positions.
- **Right 40%** – Cart and Pay button.
  - High-value area; money and totals live here.
  - Large “Pay” button anchored at the bottom.

### 7.2 Themes

The `useTheme` hook:

- Stores the active theme in `localStorage` (`duka-os-theme`).
- Toggles one of three root classes on `<html>`:
  - `duka-dark`
  - `high-vis`
  - `daylight`

In your Tailwind/global CSS, map these to styles:

```css
/* examples – adjust in your Tailwind setup */
.duka-dark {
  @apply bg-slate-900 text-slate-100;
}

.high-vis {
  @apply bg-black text-yellow-400 border-2 border-yellow-400;
}

.daylight {
  @apply bg-gray-100 text-gray-900;
}
```

### 7.3 Wiring to the Backend

`PosLayout` is already wired to the backend via the preload bridge:

- On mount:
  - Calls `window.duka.product.search("")` to populate the product grid.
- On **cash** payment:
  - Calls `window.duka.sale.create({ items, paymentMethod: "CASH" })`.
  - On success, calls `window.duka.printer.printSaleReceipt(sale.id)`.
- On **M-Pesa** payment:
  - Takes the phone number from the M-Pesa input.
  - Calls `window.duka.payment.initiateSTK(phone, total)`:
    - On `status: "OK"` → stores `checkoutRequestId` and shows “STK push sent” message.
    - On error with `manualMode: true` → surfaces a “use manual verification” message.
  - “Check Status” button calls `window.duka.payment.checkStatus(checkoutRequestId)`:
    - On `status: "SUCCESS"` → creates a sale with `paymentMethod: "MPESA"` and prints a receipt.
    - On `PENDING` → shows “still pending” message.
    - On `FAILED` → shows failure reason.
    - On `MANUAL_VERIFY_NEEDED` → instructs the cashier to manually verify before releasing goods.

Throughout this flow:

- The renderer only talks to `window.duka.*`.
- `window.duka.*` calls IPC handlers.
- IPC handlers call services.
- Services talk to Prisma/SQLite.

### 7.4 InventoryService Harness

For manual testing of bulk-breaking behaviour, there is a small harness:

- **File**: `electron/services/InventoryServiceHarness.ts`
- What it does:
  - Upserts:
    - A “parent sack” product (`barcode: "HARNESS_PARENT_SACK"`) with `isBulkParent = true`.
    - A “child kilo” product (`barcode: "HARNESS_CHILD_KILO"`) with `conversionFactor = 50` and `parentProductId` pointing to the sack.
  - Runs a sale via `InventoryService.processSale` that sells 60kg when the child has 0 stock and the parent has 2 sacks.
  - Prints:
    - Parent and child `stockQty` before/after.
    - The latest few `StockEvent` rows for those products.

To run it against your dev DB (after migrations):

```bash
ts-node electron/services/InventoryServiceHarness.ts
```

You should see:

- Parent stock going down (possibly negative if you tweak quantities).
- Child stock going up from bulk break, then down for the sale.
- `StockEvent` rows with reasons:
  - `BULK_BREAK_SOURCE`
  - `BULK_BREAK_DEST`
  - `SALE`

---

## 8. Adding New Features Safely

When adding new functionality:

1. **Start at the service layer**
   - Add or extend a service under `electron/services/`.
   - Keep it free of Electron-specific imports.

2. **Expose it via IPC**
   - In `electron/main.ts`, add a new `ipcMain.handle` that calls the service.

3. **Add renderer hooks/components**
   - Use the preload bridge to call the IPC channel.
   - Keep React components focused on UI state and events.

4. **Update `schema.prisma` if needed**
   - Add new fields or tables.
   - Run `npx prisma migrate dev` and commit the migration.

5. **Document**
   - If it changes core flows or ops, add a note to this guide.

---

You now have the essentials to work comfortably inside Duka-OS:

- **Where the files live**.
- **How data flows** from button click to SQLite.
- **How inventory and payments behave under real-world conditions**.

When in doubt, keep logic in services, keep IPC slim, and always preserve the stock audit trail.