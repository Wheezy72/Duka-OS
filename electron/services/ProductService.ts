import { PrismaClient, Product } from "@prisma/client";

/**
 * ProductService owns product lookup, search, and simple creation logic.
 */
export class ProductService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Simple search over name and barcode, tuned for POS speed.
   */
  async searchProducts(query: string): Promise<Product[]> {
    const trimmed = query.trim();

    if (!trimmed) {
      // When cashier opens the POS, show a stable grid of common items.
      return this.prisma.product.findMany({
        orderBy: { name: "asc" },
        take: 50,
      });
    }

    return this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          { barcode: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: 50,
    });
  }

  /**
   * Creates a simple product from the POS, for cases like selling avocados
   * from your own tree or new items without barcodes.
   *
   * We don't force a barcode here. Stock starts at 0 so it doesn't interfere
   * with counted inventory until the owner decides to manage it.
   */
  async createCustomProduct(name: string, price: number): Promise<Product> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Product name is required");
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Product price must be a positive number");
    }

    return this.prisma.product.create({
      data: {
        name: trimmedName,
        price,
        stockQty: 0,
        isBulkParent: false,
      },
    });
  }
}