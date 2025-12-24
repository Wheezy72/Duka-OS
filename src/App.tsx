import React, { useState } from "react";
import PosLayout from "./layouts/PosLayout";
import ProductSetupLayout from "./layouts/ProductSetupLayout";
import StockReceiveLayout from "./layouts/StockReceiveLayout";

type Screen = "POS" | "PRODUCT_SETUP" | "STOCK_RECEIVE";

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>("POS");

  const renderScreen = () => {
    if (screen === "PRODUCT_SETUP") return <ProductSetupLayout />;
    if (screen === "STOCK_RECEIVE") return <StockReceiveLayout />;
    return <PosLayout />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-xs">
        <div className="font-semibold tracking-tight">Duka-OS</div>
        <nav className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScreen("POS")}
            className={`rounded px-2 py-1 ${
              screen === "POS"
                ? "bg-slate-800 text-emerald-300"
                : "hover:bg-slate-800/60"
            }`}
          >
            POS
          </button>
          <button
            type="button"
            onClick={() => setScreen("PRODUCT_SETUP")}
            className={`rounded px-2 py-1 ${
              screen === "PRODUCT_SETUP"
                ? "bg-slate-800 text-emerald-300"
                : "hover:bg-slate-800/60"
            }`}
          >
            Product Setup
          </button>
          <button
            type="button"
            onClick={() => setScreen("STOCK_RECEIVE")}
            className={`rounded px-2 py-1 ${
              screen === "STOCK_RECEIVE"
                ? "bg-slate-800 text-emerald-300"
                : "hover:bg-slate-800/60"
            }`}
          >
            Receive Stock
          </button>
        </nav>
      </header>
      {renderScreen()}
    </div>
  );
};

export default App;