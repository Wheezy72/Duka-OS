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
        upsertBasic: (
          barcode: string,
          name: string,
          price: number
        ) => Promise<ProductSummary>;
      };
    };
  }
}

/**
 * ProductSetupLayout is a simple screen for the shop owner to teach
 * Duka-OS about new products using the barcode scanner.
 *
 * Flow:
 * - Scan a barcode from a box of goods (e.g. 500ml Fresha).
 * - If we know it, we show the existing name/price so you can adjust.
 * - If we don't, you type name + price once and save.
 * - From then on, scanning that barcode at the POS just works.
 */
export const ProductSetupLayout: React.FC = () => {
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    const code = barcode.trim();
    if (!code) return;

    setLoading(true);
    setStatus(null);

    try {
      const existing = await window.duka.product.scanLookup(code);
      if (existing) {
        setName(existing.name);
        setPrice(existing.price.toString());
        setStatus("Known product. You can adjust name or price and Save.");
      } else {
        setName("");
        setPrice("");
        setStatus("New product. Enter name and price, then Save.");
      }
    } catch {
      setStatus("Failed to look up barcode. Check connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const code = barcode.trim();
    const trimmedName = name.trim();
    const priceValue = Number(price);

    if (!code || !trimmedName || !Number.isFinite(priceValue) || priceValue <= 0) {
      setStatus("Enter a barcode, valid name, and positive price.");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const product = await window.duka.product.upsertBasic(
        code,
        trimmedName,
        priceValue
      );
      setStatus(
        `Saved product: ${product.name} @ KES ${product.price.toFixed(
          2
        )}. You can now scan it at the POS.`
      );
    } catch {
      setStatus("Failed to save product. Ask your tech to check logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-950/80 p-6 shadow-lg">
        <h1 className="text-lg font-semibold tracking-tight mb-4">
          Product Setup
        </h1>
        <p className="text-xs opacity-70 mb-4">
          Stand at the counter with your scanner. For each type of product
          (e.g. Fresha 500ml, Festive Bread, etc.), scan one item, enter its
          name and price once, and save. After that, the POS will recognize it
          whenever you scan it during a sale.
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
                  handleScan();
                }
              }}
              placeholder="Scan or type barcode, then hit Enter"
              className="w-full rounded border border-slate-700 bg-transparent px-2 py-1 text-xs outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px]">Product name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fresha Milk 500ml"
              className="w-full rounded border border-slate-700 bg-transparent px-2 py-1 text-xs outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px]">Price (KES)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 60"
              className="w-full rounded border border-slate-700 bg-transparent px-2 py-1 text-xs outline-none focus:border-emerald-400"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save product"}
          </button>

          {status && (
            <p className="mt-2 text-[11px] text-amber-300">{status}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductSetupLayout;