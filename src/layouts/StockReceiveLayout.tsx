import React, { useState } from "react";

type ProductSummary = {
  id: number;
  name: string;
  price: number;
};

declare global {
  interface Window {
    duka: {
      product: {
        scanLookup: (term: string) => Promise<ProductSummary | null>;
      };
      stock: {
        receive: (
          entries: { productId: number; quantity: number }[]
        ) => Promise<void>;
      };
    };
  }
}

/**
 * StockReceiveLayout helps the owner receive deliveries using the barcode
 * scanner so stock levels stay in sync with reality.
 *
 * Flow:
 * - Scan the barcode from a box/crate.
 * - Enter how many units came in.
 * - Save.
 * - Repeat for each product type in the delivery.
 */
export const StockReceiveLayout: React.FC = () => {
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [quantity, setQuantity] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  const handleScanLookup = async () => {
    const code = barcode.trim();
    if (!code) return;

    setLoadingLookup(true);
    setStatus(null);
    setProduct(null);

    try {
      const result = await window.duka.product.scanLookup(code);
      if (!result) {
        setStatus(
          "No product found for this barcode. Use Product Setup to register it first."
        );
        return;
      }
      setProduct(result);
      setStatus(`Ready to receive stock for ${result.name}.`);
    } catch {
      setStatus("Failed to look up product. Try again.");
    } finally {
      setLoadingLookup(false);
    }
  };

  const handleReceive = async () => {
    if (!product) {
      setStatus("Scan a product first.");
      return;
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setStatus("Enter a positive quantity received.");
      return;
    }

    setLoadingSave(true);
    setStatus(null);

    try {
      await window.duka.stock.receive([
        {
          productId: product.id,
          quantity: qty,
        },
      ]);

      setStatus(
        `Recorded ${qty} units received for ${product.name}. Stock is now updated.`
      );
      setQuantity("");
      setBarcode("");
      setProduct(null);
    } catch {
      setStatus("Failed to record stock. Ask your tech to check logs.");
    } finally {
      setLoadingSave(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <h1 className="text-lg font-semibold tracking-tight mb-3">
          Receive Stock
        </h1>
        <p className="text-xs opacity-70 mb-4">
          When deliveries arrive, scan one item from each product type, enter
          how many units came in, and save. This keeps your stock levels in
          Duka-OS closer to what is actually on your shelves.
        </p>

        <div className="space-y-3 text-xs">
          <div>
            <label className="mb-1 block text-[11px]">Scan barcode</label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleScanLookup();
                }
              }}
              placeholder="Scan or type barcode, then hit Enter"
              className="w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs outline-none focus:border-emerald-400"
            />
          </div>

          {product && (
            <div className="rounded border border-slate-700 bg-slate-900/80 px-3 py-2 text-[11px]">
              <div className="font-medium">{product.name}</div>
              <div className="opacity-70">
                Current POS price: KES {product.price.toFixed(2)}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px]">
              Quantity received (units)
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 24"
              className="w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs outline-none focus:border-emerald-400"
            />
          </div>

          <button
            type="button"
            onClick={handleReceive}
            disabled={loadingSave}
            className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-60"
          >
            {loadingSave ? "Saving..." : "Save received stock"}
          </button>

          {status && (
            <p className="mt-2 text-[11px] text-amber-300">{status}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockReceiveLayout;