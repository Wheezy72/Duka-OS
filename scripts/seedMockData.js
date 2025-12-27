const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

/**
 * seedMockData populates the dev database with:
 * - One OWNER and one CASHIER user.
 * - A few sample products with barcodes.
 * - Some basic stock levels.
 *
 * Run with:
 *   node scripts/seedMockData.js
 *
 * Make sure you've run `npx prisma migrate dev` first.
 */

const prisma = new PrismaClient();

function hashPin(pin) {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

async function main() {
  console.log("Seeding mock data...");

  // Users
  const ownerPin = "8453";
  const cashierPin = "5629";

  const owner = await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: {
      pinHash: hashPin(ownerPin),
      role: "OWNER",
    },
  });

  const cashier = await prisma.user.upsert({
    where: { id: 2 },
    update: {},
    create: {
      pinHash: hashPin(cashierPin),
      role: "CASHIER",
    },
  });

  console.log("Owner user ID:", owner.id, "PIN:", ownerPin);
  console.log("Cashier user ID:", cashier.id, "PIN:", cashierPin);

  // Products
  const products = [
    {
      name: "Fresha Milk 500ml",
      barcode: "600000000001",
      price: 60,
      stockQty: 24,
    },
    {
      name: "Festive Bread 400g",
      barcode: "600000000002",
      price: 65,
      stockQty: 18,
    },
    {
      name: "Sugar 1kg",
      barcode: "600000000003",
      price: 150,
      stockQty: 30,
    },
    {
      name: "Cooking Oil 1L",
      barcode: "600000000004",
      price: 350,
      stockQty: 20,
    },
    {
      name: "Maize Flour 2kg",
      barcode: "600000000005",
      price: 230,
      stockQty: 25,
    },
  ];

  for (const p of products) {
    const created = await prisma.product.upsert({
      where: { barcode: p.barcode },
      update: {
        name: p.name,
        price: p.price,
        stockQty: p.stockQty,
      },
      create: {
        name: p.name,
        barcode: p.barcode,
        price: p.price,
        stockQty: p.stockQty,
        isBulkParent: false,
      },
    });
    console.log("Product:", created.name, "ID:", created.id);
  }

  console.log("Mock data seeding done.");
}

main()
  .catch((err) => {
    console.error("seedMockData failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });