const { PrismaClient } = require("@prisma/client");

/**
 * checkHealth runs a few basic checks to confirm that:
 * - The database is reachable.
 * - Core tables have data.
 *
 * Run with:
 *   node scripts/checkHealth.js
 */

const prisma = new PrismaClient();

async function main() {
  console.log("Running Duka-OS health check...");

  await prisma.$connect();
  console.log("✔ DB connected");

  const productCount = await prisma.product.count();
  const userCount = await prisma.user.count();
  const saleCount = await prisma.sale.count();

  console.log("Products:", productCount);
  console.log("Users:", userCount);
  console.log("Sales:", saleCount);

  console.log(
    "Note: M-Pesa and WhatsApp integrations are exercised when using the app UI."
  );

  console.log("Health check complete.");
}

main()
  .catch((err) => {
    console.error("checkHealth failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });