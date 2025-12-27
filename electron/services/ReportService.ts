import { PrismaClient, PaymentMethod } from "@prisma/client";
import fs from "fs";
import path from "path";

/**
 * ReportService provides simple owner reports and CSV exports.
 */
export class ReportService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Returns totals for a given day (by local date string YYYY-MM-DD).
   */
  async getDailySummary(dateISO: string) {
    const [year, month, day] = dateISO.split("-").map((n) => Number(n));
    if (!year || !month || !day) {
      throw new Error("Invalid date");
    }
    const start = new Date(year, month - 1, day, 0, 0, 0);
    const end = new Date(year, month - 1, day + 1, 0, 0, 0);

    const sales = await this.prisma.sale.findMany({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        total: true,
        paymentMethod: true,
      },
    });

    let total = 0;
    let cash = 0;
    let mpesa = 0;

    for (const s of sales) {
      total += s.total;
      if (s.paymentMethod === PaymentMethod.CASH) cash += s.total;
      if (s.paymentMethod === PaymentMethod.MPESA) mpesa += s.total;
    }

    return {
      date: dateISO,
      saleCount: sales.length,
      total,
      byMethod: {
        CASH: cash,
        MPESA: mpesa,
      },
    };
  }

  /**
   * Exports a CSV of all sales for a given day.
   * Returns the file path.
   */
  async exportDailyCsv(dateISO: string): Promise<string> {
    const [year, month, day] = dateISO.split("-").map((n) => Number(n));
    if (!year || !month || !day) {
      throw new Error("Invalid date");
    }
    const start = new Date(year, month - 1, day, 0, 0, 0);
    const end = new Date(year, month - 1, day + 1, 0, 0, 0);

    const sales = await this.prisma.sale.findMany({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const rows: string[] = [];
    rows.push("sale_id,created_at,payment_method,total,product_id,quantity,price_at_sale");

    for (const sale of sales) {
      if (sale.items.length === 0) {
        rows.push(
          [
            sale.id,
            sale.createdAt.toISOString(),
            sale.paymentMethod,
            sale.total.toFixed(2),
            "",
            "",
            "",
          ].join(",")
        );
      } else {
        for (const item of sale.items) {
          rows.push(
            [
              sale.id,
              sale.createdAt.toISOString(),
              sale.paymentMethod,
              sale.total.toFixed(2),
              item.productId,
              item.quantity,
              item.priceAtSale.toFixed(2),
            ].join(",")
          );
        }
      }
    }

    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const fileName = `sales-${dateISO}.csv`;
    const filePath = path.join(exportDir, fileName);
    fs.writeFileSync(filePath, rows.join("\n"), "utf8");

    return filePath;
  }
}