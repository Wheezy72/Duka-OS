import { PrismaClient, Product } from "@prisma/client";

/**
 * ProductService owns product lookup and search logic.
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
}