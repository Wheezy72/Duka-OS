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
   * Lookup tuned for barcode scanners:
   * - First try an exact barcode match.
   * - If nothing is found, fall back to a fuzzy search.
   */
  async scanLookup(term: string): Promise<Product | null> {
    const trimmed = term.trim();
    if (!trimmed) return null;

    // Exact barcode match first (most scanners send full barcode).
    const byBarcode = await this.prisma.product.findUnique({
      where: { barcode: trimmed },
    });
    if (byBarcode) return byBarcode;

    // Fallback to the general search and pick the first result.
    const results = await this.searchProducts(trimmed);
    if (results.length === 0) return null;
    return results[0];
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

  /**
   * Upsert a basic catalog product from a scanned barcode.
   *
   * If a product with this barcode exists, we update its name/price.
   * Otherwise we create a new product seeded with this barcode.
   *
   * This lets owners stand at the counter, scan one of each new item,
   * and teach the system what that barcode means without touching code.
   */
  async upsertBasicProduct(
    barcode: string,
    name: string,
    price: number
  ): Promise<Product> {
    const trimmedBarcode = barcode.trim();
    const trimmedName = name.trim();

    if (!trimmedBarcode) {
      throw new Error("Barcode is required");
    }
    if (!trimmedName) {
      throw new Error("Product name is required");
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Product price must be a positive number");
    }

    const existing = await this.prisma.product.findUnique({
      where: { barcode: trimmedBarcode },
    });

    if (existing) {
      return this.prisma.product.update({
        where: { id: existing.id },
        data: {
          name: trimmedName,
          price,
        },
      });
    }

    return this.prisma.product.create({
      data: {
        name: trimmedName,
        barcode: trimmedBarcode,
        price,
        stockQty: 0,
        isBulkParent: false,
      },
    });
  }
},
    });
  }
}