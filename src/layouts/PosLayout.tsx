import React, { useEffect, useMemo, useState } from "react";

type ThemeName = "duka-dark" | "high-vis" | "daylight";

type ProductSummary = {
  id: number;
  name: string;
  price: number;
};

type CartItem = ProductSummary & {
  quantity: number;
};

declare global {
  interface Window {
    duka: {
      product: {
        search: (query: string) => Promise<ProductSummary[]>;
      };
      sale: {
        create: (payload: {
          items: { productId: number; quantity: number; unitPrice: number }[];
          paymentMethod: "CASH" | "MPESA";
        }) => Promise<{ id: number }>;
      };
      printer: {
        printSaleReceipt: (saleId: number) => Promise<void>;
      };
    };
  }
}

const THEME_STORAGE_KEY = "duka-os-theme";

/**
 * useTheme toggles a root-level class on <html> so Tailwind can style
 * the entire app based on the active theme.
 */
function useTheme(): [ThemeName, (theme: ThemeName) => void] {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return "duka-dark";
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as
      | ThemeName
      | null;
    return stored ?? "duka-dark";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.classList.remove("duka-dark", "high-vis", "daylight");
    root.classList.add(theme);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  const setTheme = (next: ThemeName) => {
    setThemeState(next);
  };

  return [theme, setTheme];
}

const THEMES: ThemeName[] = ["duka-dark", "high-vis", "daylight"];

export const PosLayout: React.FC = () => {
  const [theme, setTheme] = useTheme();

  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setProductsLoading(true);
      setProductsError(null);

      try {
        const result = await window.duka.product.search("");
        if (!cancelled) {
          setProducts(result);
        }
      } catch (error: any) {
        if (!cancelled) {
          // Network / IPC errors are expected in the field; we surface a simple message.
          setProductsError("Failed to load products. Try restarting the app.");
        }
      } finally {
        if (!cancelled) {
          setProductsLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const addToCart = (product: ProductSummary) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (!existing) {
        return [...current, { ...product, quantity: 1 }];
      }
      return current.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => setCart([]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const cycleTheme = () => {
    const index = THEMES.indexOf(theme);
    const next = THEMES[(index + 1) % THEMES.length];
    setTheme(next);
  };

  const handlePay = async () => {
    if (cart.length === 0 || isPaying) return;

    setIsPaying(true);
    setPayError(null);

    try {
      const sale = await window.duka.sale.create({
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
        // Cash is the simplest happy path; MPESA uses the PaymentService.
        paymentMethod: "CASH",
      });

      try {
        // Printing is best-effort; sale should not be rolled back if the printer is offline.
        await window.duka.printer.printSaleReceipt(sale.id);
      } catch (error: any) {
        setPayError(
          "Sale saved but printing failed. Check the receipt printer."
        );
      }

      setCart([]);
    } catch (error: any) {
      setPayError("Failed to complete sale. Try again.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className={`min-h-screen flex ${theme}`}>
      {/* LEFT: Product grid (high-usage area) */}
      <section className="w-3/5 border-r border-slate-700/40 p-4 flex flex-col">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Duka POS
            </h1>
            <p className="text-xs opacity-70">
              Tap products, keep the right side for money.
            </p>
          </div>
          <button
            type="button"
            onClick={cycleTheme}
            className="text-xs rounded border border-current px-2 py-1"
          >
            Theme: {theme}
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          {productsLoading ? (
            <div className="text-xs opacity-70">Loading products…</div>
          ) : productsError ? (
            <div className="text-xs text-red-500">{productsError}</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className="flex flex-col items-start rounded-lg border border-slate-700/30 bg-slate-900/5 p-3 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <span className="line-clamp-2 text-xs font-medium">
                    {product.name}
                  </span>
                  <span className="mt-2 text-sm font-semibold">
                    KES {product.price.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* RIGHT: Cart & Pay button (high-value area) */}
      <section className="w-2/5 p-4 flex flex-col">
        <header className="mb-2">
          <h2 className="text-sm font-semibold tracking-tight">Cart</h2>
        </header>

        <div className="flex-1 overflow-auto rounded-lg border border-slate-700/30 bg-slate-900/5 p-3">
          {cart.length === 0 ? (
            <p className="text-xs opacity-70">
              Cart is empty. Tap items on the left to add.
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {cart.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-[11px] opacity-70">
                      {item.quantity} × KES {item.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      KES {(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="rounded-full border border-current px-2 text-[10px]"
                    >
                      −
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={clearCart}
            className="rounded border border-slate-700/40 px-3 py-1 text-[11px]"
            disabled={cart.length === 0 || isPaying}
          >
            Clear
          </button>
          <div className="text-right">
            <div className="text-[11px] opacity-70">Total</div>
            <div className="text-lg font-semibold">
              KES {total.toFixed(2)}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePay}
          className="mt-3 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-60"
          disabled={cart.length === 0 || isPaying}
        >
          {isPaying ? "Processing..." : "Pay"}
        </button>
        {payError && (
          <p className="mt-2 text-xs text-red-500">
            {payError}
          </p>
        )}
      </section>
    </div>
  );
};

export default PosLayout;