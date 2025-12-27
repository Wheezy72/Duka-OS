import { PrismaClient } from "@prisma/client";
import { WhatsAppService } from "./WhatsAppService";

/**
 * NotificationService coordinates higher-level notifications like
 * low-stock reports and forgotten PIN requests.
 */
export class NotificationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly whatsapp: WhatsAppService
  ) {}

  /**
   * Sends a low-stock report to the owner via WhatsApp.
   *
   * For now, "low stock" means stockQty <= threshold (e.g. 5 units).
   */
  async sendLowStockReport(threshold = 5): Promise<void> {
    const lowStock = await this.prisma.product.findMany({
      where: {
        stockQty: {
          lte: threshold,
        },
      },
      orderBy: { name: "asc" },
      take: 50,
    });

    if (lowStock.length === 0) {
      await this.whatsapp.sendOwnerMessage(
        "Duka-OS: No products are below the current low-stock threshold."
      );
      return;
    }

    const lines = lowStock.map(
      (p) => `• ${p.name} – stock: ${p.stockQty.toFixed(2)}`
    );

    const message =
      "Duka-OS low stock report:\n\n" +
      lines.join("\n") +
      "\n\n(Threshold: " +
      threshold +
      " units)";

    await this.whatsapp.sendOwnerMessage(message);
  }

  /**
   * Sends a basic WhatsApp message to the owner letting them know
   * that someone at this terminal needs help (e.g. forgotten PIN).
   */
  async sendOwnerHelpRequest(context?: string): Promise<void> {
    const msg =
      "Duka-OS: Someone at the shop terminal has requested owner help" +
      (context ? ` (${context})` : "") +
      ". Please contact them to assist (e.g. PIN reset or access issue).";
    await this.whatsapp.sendOwnerMessage(msg);
  }
}