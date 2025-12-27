# Duka-OS 🧺

Duka-OS is a **Retail Operating System** for Kenyan shops.

Think of it as a **digital counter book** + **reliable cash register** + **M-Pesa helper** + **receipt printer** — all in one calm, simple screen.

---

## 🏪 What Duka-OS Actually Does

### 1. Helps You Sell Fast

- Left side: **Products**
  - Scan with a barcode scanner into the “Scan barcode” box.
  - Or tap quick buttons for common items (sukuma, bread, etc.).
- Right side: **Cart & Payment**
  - Shows what the customer is buying.
  - Shows the **total** clearly.
  - Buttons for:
    - **Pay Cash** (opens cash drawer, prints receipt).
    - **Pay with M-Pesa** (STK push, no drawer open).

The layout is designed so cashiers can build **muscle memory**:
- Left hand scans or taps products.
- Right side handles the money.

---

## 💰 Payments: Cash & M-Pesa

### Cash

1. Scan or add items to the cart.
2. Tap **Pay Cash**.
3. Duka-OS:
   - Saves the sale.
   - Updates stock.
   - Prints a receipt (if the printer is connected).
   - Sends a pulse to open the **cash drawer** (via the receipt printer).

If the printer or drawer is off or unplugged:
- The sale is still saved.
- Duka-OS will say printing failed, but it **will not cancel** the sale.

---

### M-Pesa (STK Push)

1. Scan or add items to the cart.
2. Enter the customer’s **M-Pesa number** (e.g. `07xx...`).
3. Tap **Pay with M-Pesa**.
4. The customer gets the normal **M-Pesa popup** on their phone.

After that:
- Tap **Check Status** to see what happened.

Possible messages:

- **Payment confirmed**
  - Duka-OS:
    - Saves the sale as an M-Pesa payment.
    - Prints a receipt.
    - **Does not** open the cash drawer (no cash is changing hands).
- **Still pending**
  - Duka-OS tells you it’s still processing.
  - Ask the customer to check their phone.
- **Payment failed**
  - Duka-OS shows that it did not go through.
- **Manual verify needed**
  - Network is weak or Safaricom is slow.
  - Duka-OS tells you to **check manually**:
    - Ask the customer to show their SMS.
    - Or check your M-Pesa statements.
  - This is on purpose, to avoid **double charging**.

Duka-OS will **never try M-Pesa again on its own**.  
If you want to retry, you must press the button again yourself.

---

## 📦 Stock & Inventory

Duka-OS is built for **real shops**, not just supermarkets.

It understands things like:

- **Sacks to kilos**
  - Example:
    - You buy a 50kg sack of sugar.
    - You sell it as 1kg packets.
- Duka-OS can:
  - Break a **bulk item** (like a sack) into smaller units (like kilos).
  - Keep track of how many sacks are left.
  - Keep track of how many kilos are left.
- It keeps a **hidden log** every time:
  - Stock goes out because of a **sale**.
  - Stock is **broken** from sack → kilo.
  - Stock is **added** when you restock.

This means:
- When stock “doesn’t add up”, there’s a **trail** to investigate.
- You can always ask “Why did this go down?” and Duka-OS can show you.

---

## 🧾 Receipts

Duka-OS prints **simple, clean receipts** on a small USB thermal printer.

A receipt includes:

- Header:
  - Your shop name from `DUKA_NAME` (e.g. “MY MINI MART”).
  - Optional contact line from `DUKA_CONTACT` (e.g. phone / location).
- List of items:
  - Name and quantity (e.g. `Sugar 1kg x2`).
  - Price per item and total per line.
- Total to pay.
- Footer: **“Thank You”**.

If the printer is not found:
- Duka-OS shows a clear message.
- Sales still save — you just won’t get the slip until the printer is fixed.

---

## 📊 Reports (for the Owner)

There is an **Owner-only Reports tab**:

- Pick a date.
- See:
  - **Total sales** for that day.
  - **Total Cash**.
  - **Total M-Pesa**.
  - **Number of sales**.
- Tap **Download CSV**:
  - Duka-OS exports a CSV file (e.g. `exports/sales-2025-01-15.csv`).
  - You can open it in Excel or share with an accountant.

---

## ▶️ How to Run Duka-OS on Your Machine

This is a simple checklist for the **shop owner** and the **tech person** helping them.

### A. For the Shop Owner

Ask your tech person to:

1. **Install Duka-OS on the shop computer.**
2. **Connect the receipt printer** with a USB cable.
3. **Connect the cash drawer** to the receipt printer (if you have one).
4. **Check that M-Pesa is working**:
   - Do a test sale for a small amount.
   - Confirm on your phone that the money arrived.
5. **Show your staff**:
   - How to scan items.
   - How to take cash.
   - How to take M-Pesa.
   - How to read the messages on the right side.
   - How to log in / log out.

After that:
- You just open the Duka-OS app like any other program.
- Log in with your PIN.
- Start selling.

You don’t need to touch any “code” or “commands”.  
That’s what the tech person is for.

---

### B. For the Tech Person – Step-by-Step Setup

You don’t need to be a full programmer, but you should be comfortable with a terminal.

#### 1. Get the code

Clone or download the Duka-OS project:

```bash
git clone <repo-url> duka-os
cd duka-os
```

#### 2. Install dependencies

You need:

- Node.js (LTS is fine).
- npm (comes with Node).

In the project folder:

```bash
npm install
```

#### 3. Configure environment variables

Create a `.env` file in the project root (next to `package.json`) and set:

**Branding:**

```env
DUKA_NAME=My Mini Mart
DUKA_CONTACT=0712 345 678 - Market Rd
```

**M-Pesa (Safaricom portal gives you these):**

```env
MPESA_KEY=...
MPESA_SECRET=...
MPESA_SHORT_CODE=...
MPESA_PASSKEY=...
MPESA_CALLBACK_URL=https://your-callback-url
```

**WhatsApp (for owner alerts):**

```env
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_OWNER_NUMBER=2547XXXXXXXX
```

You can skip M-Pesa and WhatsApp in early testing; Duka-OS will just show errors when those features are used.

#### 4. Set up the database

Run Prisma migrations:

```bash
npx prisma migrate dev
```

This creates `prisma/dev.db` with the schema (products, sales, users, stock, etc.).

#### 5. Seed mock data (so the UI isn’t empty)

Use the seed script to create:

- An OWNER user (PIN `8453`).
- A CASHIER user (PIN `5629`).
- Some common products with barcodes and stock.

```bash
npx ts-node scripts/seedMockData.ts
```

It will print the IDs and PINs so you know what to use for testing.

#### 6. Run a quick health check

Optional, but useful:

```bash
npx ts-node scripts/checkHealth.ts
```

You should see:

- DB connected.
- Counts of products, users, sales.
- Some info about M-Pesa and WhatsApp setup (or warnings if env is missing).

#### 7. Run the app in development mode

```bash
npm run dev
```

This should:

- Start the Electron app.
- Open a window with the **Duka-OS Login** screen.

Log in with:

- OWNER PIN: `8453`
- CASHIER PIN: `5629`

#### 8. Set up the receipt printer and cash drawer

- Plug in the USB thermal printer.
- Connect the cash drawer to the printer (RJ11 jack).

If printing fails:

- Open `DEV_GUIDE.md`.
- Follow the “Printer not found?” section to set:

  - `PRINTER_VENDOR_ID`
  - `PRINTER_PRODUCT_ID`

inside `PrinterService.ts` to match your actual device.

Drawer:

- The drawer will open automatically after successful **cash** payments (not M-Pesa), if your printer supports the `ESC p` command.

---

## 👩‍👩‍👦 For the Shop Owner (Everyday Use)

You’ll mostly do:

- Open the app.
- Enter your PIN:
  - OWNER for full access.
  - CASHIER for POS only.
- Sell:

  - Scan items or tap quick buttons.
  - For cash:
    - Tap **Pay Cash**.
    - Receipt prints, drawer opens.
  - For M-Pesa:
    - Enter number, tap **Pay with M-Pesa**, then **Check Status**.
    - Drawer stays closed.

- Owner-only actions:
  - Product Setup (teach Duka-OS new barcodes).
  - Receive Stock (record deliveries).
  - Reports (see daily totals, download CSV).
  - Add user (new PINs for staff).
  - Send low-stock report (WhatsApp).

---

## 👨‍💻 For the Technician / Developer

For the full internals:

- Read **`DEV_GUIDE.md`** – it covers:
  - Folder structure.
  - Services (Inventory, Payment, Reporting, Printer, WhatsApp).
  - IPC wiring.
  - How to debug common issues (printer, M-Pesa, DB locking).

---

## 🌍 Why Duka-OS Exists

Kenyan shops deal with:

- Power cuts.
- Unstable internet.
- Customers paying by:
  - Cash.
  - M-Pesa.
- Stock in tricky units:
  - Sacks, pieces, scoops, etc.

Duka-OS is built to **respect that reality**:

- Negative stock is allowed (sales don’t block just because you forgot to “receive stock”).
- M-Pesa failures are not hidden behind vague messages.
- Everything can be traced:
  - Who sold what.
  - What stock moved.
  - When low stock alerts were sent.

---

## 🧭 How to Think About It

If you’re non-technical, just remember:

- **Left side:** “What the customer is buying.”
- **Right side:** “How they are paying.”
- **Printer & drawer (cash):** “What goes in their hand and when you need change.”
- **M-Pesa messages:** “What keeps you safe from confusion and double charges.”
- **Reports:** “What lets you sleep at night knowing the numbers add up.”

Everything else is there so that:

- When something goes wrong,
- The next technician or developer can fix it
- **Without breaking your shop.**