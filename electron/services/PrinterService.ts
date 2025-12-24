import usb, { Device, OutEndpoint } from "usb";
import { Product, Sale, SaleItem } from "@prisma/client";

export type SaleWithItemsAndProducts = Sale & {
  items: (SaleItem & { product: Product })[];
};

/**
 * PrinterService sends raw bytes to a USB thermal printer.
 *
 * Why raw USB:
 * - Bypasses flaky Windows print drivers and dialogs.
 * - Gives tight control over formatting for tiny 58mm/80mm slips.
 */
export class PrinterService {
  // Update these IDs to match the actual device in Device Manager.
  // They are kept here so a tech can quickly fix "Printer not found" on-site.
  private static readonly PRINTER_VENDOR_ID = 0x1234;
  private static readonly PRINTER_PRODUCT_ID = 0x0001;

  /**
   * Finds the first USB device that matches the configured Vendor/Product ID.
   */
  private findPrinter(): Device | null {
    const devices = usb.getDeviceList();
    return (
      devices.find(
        (d) =>
          d.deviceDescriptor.idVendor === PrinterService.PRINTER_VENDOR_ID &&
          d.deviceDescriptor.idProduct === PrinterService.PRINTER_PRODUCT_ID
      ) || null
    );
  }

  /**
   * Builds a simple text receipt as an ASCII buffer.
   *
   * We rely on the printer's default font and left/right padding rather than
   * complex markup – less to break in a busy shop.
   */
  private buildReceiptBuffer(sale: SaleWithItemsAndProducts): Buffer {
    const maxWidth = 32; // Characters per line for typical 58mm printers.

    const lines: string[] = [];

    lines.push(this.centerText("DUKA OS", maxWidth));
    lines.push(this.centerText("------------------------------", maxWidth));
    lines.push("");

    let total = 0;

    for (const item of sale.items) {
      const name = item.product.name;
      const lineTotal = item.priceAtSale * item.quantity;
      total += lineTotal;

      const qtyPart =
        item.quantity === 1 ? "" : ` x${this.formatNumber(item.quantity)}`;
      const leftText = `${name}${qtyPart}`.slice(0, maxWidth);

      const rightText = this.formatMoney(lineTotal);
      lines.push(this.leftRight(leftText, rightText, maxWidth));
    }

    lines.push("");
    lines.push(this.leftRight("TOTAL", this.formatMoney(total), maxWidth));
    lines.push("");
    lines.push(this.centerText("Thank You", maxWidth));
    lines.push("");
    lines.push(""); // Feed a bit of paper.

    const content = lines.join("\n");

    // Basic ESC/POS reset + text + full cut at the end.
    const ESC = "\x1b";
    const GS = "\x1d";
    const reset = `${ESC}@`;
    const cut = `${GS}V\x00`;

    const full = reset + content + "\n\n" + cut;
    return Buffer.from(full, "ascii");
  }

  private centerText(text: string, width: number): string {
    const len = text.length;
    if (len >= width) return text.slice(0, width);

    const leftPad = Math.floor((width - len) / 2);
    const rightPad = width - len - leftPad;
    return " ".repeat(leftPad) + text + " ".repeat(rightPad);
  }

  private leftRight(left: string, right: string, width: number): string {
    const available = width - right.length - 1;
    const trimmedLeft = left.length > available ? left.slice(0, available) : left;
    const spaces = width - trimmedLeft.length - right.length;
    return trimmedLeft + " ".repeat(Math.max(spaces, 1)) + right;
  }

  private formatMoney(value: number): string {
    return value.toFixed(2);
  }

  private formatNumber(value: number): string {
    // Use fixed decimals only when needed, e.g. 1.5kg flour.
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }

  /**
   * Sends the receipt buffer to the printer over USB.
   */
  async printReceipt(sale: SaleWithItemsAndProducts): Promise<void> {
    const device = this.findPrinter();
    if (!device) {
      throw new Error("USB receipt printer not found. Check VendorID/ProductID.");
    }

    device.open();

    try {
      const iface = device.interfaces[0];
      if (!iface) {
        throw new Error("USB printer has no usable interface.");
      }

      // Some printers present themselves as HID and have a kernel driver.
      if (iface.isKernelDriverActive()) {
        try {
          iface.detachKernelDriver();
        } catch {
          // If detaching fails we still try; worst case the write fails loudly.
        }
      }

      iface.claim();

      const endpoint = iface.endpoints.find(
        (ep) => ep.direction === "out"
      ) as OutEndpoint | undefined;

      if (!endpoint) {
        throw new Error("USB printer has no OUT endpoint.");
      }

      const buffer = this.buildReceiptBuffer(sale);

      await new Promise<void>((resolve, reject) => {
        endpoint.transfer(buffer, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // A tiny delay before releasing helps some cheap printers flush.
      await new Promise((resolve) => setTimeout(resolve, 50));

      iface.release(true, (err) => {
        // We don't throw here; printing already succeeded or failed above.
        device.close();
        if (err) {
          // Surface in logs if the caller wants, but it's not fatal.
          console.warn("Failed to release USB printer interface:", err);
        }
      });
    } catch (error) {
      try {
        device.close();
      } catch {
        // Ignore close errors; they're usually harmless.
      }
      throw error;
    }
  }
}