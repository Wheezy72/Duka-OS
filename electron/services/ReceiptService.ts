import { PrismaClient } from "@prisma/client";
import { PrinterService, SaleWithItemsAndProducts } from "./PrinterService";

/**
 * ReceiptService coordinates between the database and the USB printer.
 * It stays Electron-agnostic so we can test it in isolation.
 */
export class ReceiptService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly printerService: PrinterService
  ) {}

  async printSaleReceipt(saleId: number): Promise<void> {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!sale) {
      throw new Error(`Sale ${saleId} not found`);
    }

    await this.printerService.printReceipt(
      sale as unknown as SaleWithItemsAndProducts
    );
  }
}