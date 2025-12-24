# Duka-OS 🧺

Duka-OS is a **Retail Operating System** for Kenyan shops.

Think of it as a **digital counter book** + **reliable cash register** + **M-Pesa helper** + **receipt printer** — all in one calm, simple screen.

---

## 🏪 What Duka-OS Actually Does

### 1. Helps You Sell Fast

- Left side: **Products**
  - Big buttons for your items (flour, sugar, bread, etc.).
  - Tap to add to the cart.
- Right side: **Cart & Payment**
  - Shows what the customer is buying.
  - Shows the **total** clearly.
  - Buttons for:
    - **Pay Cash**
    - **Pay with M-Pesa**

The layout is designed so cashiers can build **muscle memory**:
- Left hand taps products.
- Right side handles money.

---

## 💰 Payments: Cash & M-Pesa

### Cash

1. Add items to the cart.
2. Tap **Pay Cash**.
3. Duka-OS:
   - Saves the sale.
   - Updates stock.
   - Prints a receipt (if the printer is connected).

If the printer is off or unplugged:
- The sale is still saved.
- Duka-OS will tell you the receipt failed to print.

---

### M-Pesa (STK Push)

1. Add items to the cart.
2. Enter the customer’s **M-Pesa number** (e.g. `07xx...`).
3. Tap **Pay with M-Pesa**.
4. The customer gets the normal **M-Pesa popup** on their phone.

After that:
- Tap **Check Status** in Duka-OS to see what happened.

Possible messages:

- **Payment confirmed**
  - Duka-OS:
    - Saves the sale as an M-Pesa payment.
    - Prints a receipt.
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

Duka-OS can print **simple, clean receipts** on a small USB thermal printer.

A receipt includes:

- Header: **“DUKA OS”** centered at the top.
- List of items:
  - Name and quantity (e.g. `Sugar 1kg x2`).
  - Price per item and total per line.
- Total to pay.
- Footer: **“Thank You”**.

If the printer is not found:
- Duka-OS shows a clear message.
- Sales still save — you just won’t get the slip until the printer is fixed.

---

## ▶️ How to Run Duka-OS (Simple View)

This is a simple checklist for the **shop owner** and the **tech person** helping them.

### A. For the Shop Owner

Ask your tech person to:

1. **Install Duka-OS on the shop computer.**
2. **Connect the receipt printer** with a USB cable.
3. **Check that M-Pesa is working**:
   - Do a test sale for a small amount.
   - Confirm on your phone that the money arrived.
4. **Show your staff**:
   - How to add items.
   - How to take cash.
   - How to take M-Pesa.
   - How to read the messages on the right side.

After that:
- You just open the Duka-OS app like any other program.
- Log in (if you have user accounts set up).
- Start selling.

You don’t need to touch any “code” or “commands”.  
That’s what the tech person is for.

---

### B. For the Tech Person (High Level, No Deep Tech)

You don’t need to be a full programmer, but you should be comfortable installing apps.

1. **Get the project**
   - Download or clone the Duka-OS project to a folder on the computer.

2. **Install requirements**
   - Install:
     - Node.js (for the app itself).
     - Git (to pull updates, optional but useful).
   - In the project folder, install dependencies (once):

     ```bash
     npm install
     ```

3. **Set up the database**
   - In the same folder:

     ```bash
     npx prisma migrate dev
     ```

   - This creates the local database file used by Duka-OS.

4. **Configure M-Pesa (optional but recommended)**
   - Ask the shop owner for their Safaricom M-Pesa credentials (from the Safaricom portal).
   - Put them in a `.env` file (or however you usually store env variables):

     - `MPESA_KEY`
     - `MPESA_SECRET`
     - `MPESA_SHORT_CODE`
     - `MPESA_PASSKEY`
     - `MPESA_CALLBACK_URL` (can be via ngrok in testing)

5. **Run the app in development mode**

   ```bash
   npm run dev
   ```

   - This should:
     - Open the Duka-OS window.
     - Show the POS layout.
     - Let you test sales and receipts.

6. **Set up the receipt printer**
   - Plug in the USB thermal printer.
   - If printing fails, open `DEV_GUIDE.md` and follow:
     - “Printer Not Found?” section to set the correct Vendor ID / Product ID.

7. **(Optional) Package it**
   - If you want a single installer for Windows/macOS later:
     - You can use Electron packaging tools (this is more advanced and can be added when needed).

For detailed technical steps (for developers), see **`DEV_GUIDE.md`** in this project.

---

## 👩‍👩‍👦 For the Shop Owner

Duka-OS is designed for:

- **Dukas**
- **Mini supermarkets**
- **Kiosks**
- **Small shops with many repeat customers**

It helps you:

- See what is being sold.
- Track stock, even when selling from sacks.
- Keep a clean record for:
  - Cash
  - M-Pesa
- Survive:
  - **Power cuts** (special database mode for safer saving).
  - **Slow internet** (M-Pesa manual verification mode).

You don’t need to understand how it’s built.  
You just need to know:

- It **remembers your sales**.
- It **prints receipts**.
- It **respects your reality** (power, network, M-Pesa quirks).

---

## 👨‍💻 For the Technician / Developer

If you want the full technical map:

- Read **`DEV_GUIDE.md`** (in the same folder as this README).
- It explains:
  - Folder structure.
  - How data flows inside the app.
  - How to fix common issues.

---

## 🌍 Why Duka-OS Exists

Kenyan shops deal with:

- Power cuts.
- Unstable internet.
- Customers paying by:
  - Cash.
  - M-Pesa.
  - Sometimes both.
- Stock in strange units:
  - Sacks, pieces, loose grams, etc.

Duka-OS is built to **respect that reality**:

- It’s okay if stock goes negative — it doesn’t just block sales.
- It never hides M-Pesa failures behind fancy messages.
- It tries to **stay out of the way** and let you serve customers.

---

## 🧭 How to Think About It

If you’re non-technical, just remember:

- **Left side:** “What the customer is buying.”
- **Right side:** “How they are paying.”
- **Printer:** “What goes in their hand.”
- **M-Pesa messages:** “What keeps you safe from confusion and double charges.”

Everything else is there so that:

- When something goes wrong,
- The next technician or developer can fix it
- **Without breaking your shop.**