import { PrismaClient } from "@prisma/client";
import { InventoryService } from "./InventoryService";

/**
 * Small harness to exercise InventoryService bulk-breaking behaviour.
 *
 * Run this against your dev database (after `npx prisma migrate dev`):
 *
 *   ts-node electron/services/InventoryServiceHarness.ts
 *
 * It will:
 * - Upsert a bulk parent product (a sack).
 * - Upsert a child product (kilo units) with a conversionFactor.
 * - Perform a sale that intentionally forces a bulk break.
 * - Log resulting stocks and recent StockEvents.
 */
async function run() {
  const prisma = new PrismaClient();
  const inventory = new InventoryService(prisma);

  await prisma.$connect();

  try {
    const parent = await prisma.product.upsert({
      where: { barcode: "HARNESS_PARENT_SACK" },
      update: {
        stockQty: 2,
        isBulkParent: true,
        price: 5000,
      },
      create: {
        name: "HARNESS 50kg Sack",
        barcode: "HARNESS_PARENT_SACK",
        stockQty: 2,
        price: 5000,
        isBulkParent: true,
      },
    });

    const child = await prisma.product.upsert({
      where: { barcode: "HARNESS_CHILD_KILO" },
      update: {
        stockQty: 0,
        parentProductId: parent.id,
        conversionFactor: 50,
        price: 100,
      },
      create: {
        name: "HARNESS 1kg Unit",
        barcode: "HARNESS_CHILD_KILO",
        stockQty: 0,
        price: 100,
        parentProductId: parent.id,
        conversionFactor: 50,
        isBulkParent: false,
      },
    });

    console.log("Before sale:");
    console.log(
      "  Parent stockQty (sacks):",
      parent.stockQty,
      "Product ID:",
      parent.id
    );
    console.log(
      "  Child stockQty (kilos):",
      child.stockQty,
      "Product ID:",
      child.id
    );

    // Sell 60kg when we start with 0 child stock and 2 parent sacks (2 x 50kg).
    const sale = await inventory.processSale({
      items: [
        {
          productId: child.id,
          quantity: 60,
          unitPrice: child.price,
        },
      ],
      paymentMethod: "CASH",
    });

    const parentAfter = await prisma.product.findUnique({
      where: { id: parent.id },
    });
    const childAfter = await prisma.product.findUnique({
      where: { id: child.id },
    });

    const events = await prisma.stockEvent.findMany({
      where: {
        productId: { in: [parent.id, child.id] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    console.log("\nAfter sale ID", sale.id);
    console.log(
      "  Parent stockQty (sacks):",
      parentAfter?.stockQty,
      "Product ID:",
      parent.id
    );
    console.log(
      "  Child stockQty (kilos):",
      childAfter?.stockQty,
      "Product ID:",
      child.id
    );

    console.log("\nRecent StockEvents (latest 10):");
    for (const ev of events) {
      console.log(
        `  [${ev.createdAt.toISOString()}] productId=${ev.productId}, delta=${ev.delta}, reason=${ev.reason}`
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error("InventoryServiceHarness failed:", err);
  process.exit(1);
});