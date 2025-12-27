const { PrismaClient } = require("@prisma/client");
const { PaymentService } = require("../electron/services/PaymentService");
const { WhatsAppService } = require("../electron/services/WhatsAppService");

/**
 * checkHealth runs a few basic checks to confirm that:
 * - The database is reachable.
 * - Core tables have data.
 * - External integrations (M-Pesa, WhatsApp) are roughly reachable.
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

  // Try M-Pesa PaymentService construction (will throw early if env is missing).
  try {
    const paymentService = new PaymentService();
    const ts =
      typeof paymentService.getTimestamp === "function"
        ? paymentService.getTimestamp()
        : "n/a";
    console.log("Sample timestamp from PaymentService:", ts);
    console.log(
      "Note: full M-Pesa auth is exercised when you run a real STK push from the app."
    );
  } catch (err) {
    console.warn(
      "⚠ M-Pesa configuration or network may not be fully set:",
      err.message
    );
  }

  // Try WhatsAppService construction.
  try {
    const whatsapp = new WhatsAppService();
    console.log(
      "WhatsApp owner number configured:",
      (whatsapp && whatsapp.ownerNumber) || "(not accessible)"
    );
    console.log(
      "Note: actual send is not executed in this health check to avoid spamming."
    );
  } catch (err) {
    console.warn(
      "⚠ WhatsApp configuration may be missing:",
      err.message
    );
  }

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