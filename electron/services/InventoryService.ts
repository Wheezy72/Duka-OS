import { PrismaClient, PaymentMethod, StockEventReason } from "@prisma/client";

export interface SaleItemInput {
  productId: number;
  quantity: number; // Always in smallest sellable unit (e.g. kilos, pieces).
  unitPrice: number;
}

export interface ProcessSaleInput {
  items: SaleItemInput[];
  paymentMethod: PaymentMethod;
}

/**
 * InventoryService is responsible for stock movement and sale persistence.
 * It knows nothing about Electron or IPC.
 */
export class InventoryService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Receive stock into the shop (e.g. new delivery).
   * Increments stockQty and writes RESTOCK StockEvents.
   */
  async receiveStock(
    entries: { productId: number; quantity: number }[]
  ): Promise<void> {
    if (!entries || entries.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        if (!Number.isFinite(entry.quantity) || entry.quantity <= 0) continue;

        await tx.product.update({
          where: { id: entry.productId },
          data: {
            stockQty: {
              increment: entry.quantity,
            },
          },
        });

        await tx.stockEvent.create({
          data: {
            productId: entry.productId,
            delta: entry.quantity,
            reason: StockEventReason.RESTOCK,
          },
        });
      }
    });
  }

  /**
   * Processes a sale and applies all stock movements atomically.
   *
   * Important business rules:
   * - Never block sales because of low stock; we allow negative stock.
   * - If a child product is short and has a bulk parent, we "break" parent stock
   *   into child units using conversionFactor.
   * - Every stock change writes a StockEvent for forensic auditing.
   */
  async processSale(input: ProcessSaleInput) {
    const { items, paymentMethod } = input;

    if (!items || items.length === 0) {
      throw new Error("Sale requires at least one item");
    }

    return this.prisma.$transaction(async (tx) => {
      let total = 0;

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            parent: true,
          },
        });

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        const saleQty = item.quantity;
        total += item.unitPrice * saleQty;

        let childStock = product.stockQty;
        const parent = product.parent;

        // Never pre-block the sale. We just try to fulfill it.
        if (
          childStock < saleQty &&
          parent &&
          product.conversionFactor &&
          product.conversionFactor > 0
        ) {
          const shortfall = saleQty - childStock;
          const parentsToBreak = Math.ceil(
            shortfall / product.conversionFactor
          );

          const parentDelta = -parentsToBreak;
          const childDeltaFromBulk = parentsToBreak * product.conversionFactor;

          // Parent can go negative; we don't block the sale.
          await tx.product.update({
            where: { id: parent.id },
            data: {
              stockQty: {
                increment: parentDelta, // negative value
              },
            },
          });

          await tx.stockEvent.create({
            data: {
              productId: parent.id,
              delta: parentDelta,
              reason: StockEventReason.BULK_BREAK_SOURCE,
            },
          });

          // Child receives units from bulk break before we sell them.
          await tx.product.update({
            where: { id: product.id },
            data: {
              stockQty: {
                increment: childDeltaFromBulk,
              },
            },
          });

          await tx.stockEvent.create({
            data: {
              productId: product.id,
              delta: childDeltaFromBulk,
              reason: StockEventReason.BULK_BREAK_DEST,
            },
          });

          childStock += childDeltaFromBulk;
        }

        // Now decrement the child stock for the actual sale.
        // This is allowed to go negative.
        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQty: {
              decrement: saleQty,
            },
          },
        });

        await tx.stockEvent.create({
          data: {
            productId: product.id,
            delta: -saleQty,
            reason: StockEventReason.SALE,
          },
        });
      }

      const sale = await tx.sale.create({
        data: {
          total,
          paymentMethod,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceAtSale: item.unitPrice,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return sale;
    });
  }
}