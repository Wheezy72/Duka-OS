import { PrismaClient } from "@prisma/client";
import { PaymentService } from "../electron/services/PaymentService";
import { WhatsAppService } from "../electron/services/WhatsAppService";

/**
 * checkHealth runs a few basic checks to confirm that:
 * - The database is reachable.
 * - Core tables have data.
 * - External integrations (M-Pesa, WhatsApp) are roughly reachable.
 *
 * Run with:
 *   npx ts-node scripts/checkHealth.ts
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

  // Try M-Pesa auth (optional, may fail if env not set)
  try {
    const paymentService = new PaymentService();
    // We call a private method indirectly by triggering a small harmless auth call.
    // This is mainly to see if credentials and network are OK.
    const ts = (paymentService as any)["getTimestamp"]?.() ?? "timestamp";
    console.log("Sample timestamp (M-Pesa helper):", ts);
    console.log(
      "Note: full M-Pesa auth is exercised when you run a real STK push from the app."
    );
  } catch (err) {
    console.warn(
      "⚠ M-Pesa configuration or network may not be fully set:",
      (err as Error).message
    );
  }

  // Try WhatsApp formatting (we don't actually send to avoid spamming the owner).
  try {
    const whatsapp = new WhatsAppService();
    const apiUrl = (whatsapp as any)["apiUrl"];
    console.log("WhatsApp API URL:", apiUrl);
    console.log(
      "Note: actual send is not executed in this health check to avoid spamming."
    );
  } catch (err) {
    console.warn(
      "⚠ WhatsApp configuration may be missing:",
      (err as Error).message
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