import React, { useState } from "react";
import PosLayout from "./layouts/PosLayout";
import ProductSetupLayout from "./layouts/ProductSetupLayout";
import StockReceiveLayout from "./layouts/StockReceiveLayout";

type Screen = "POS" | "PRODUCT_SETUP" | "STOCK_RECEIVE";

type UserRole = "OWNER" | "CASHIER" | null;

declare global {
  interface Window {
    duka: {
      user: {
        login: (pin: string) => Promise<{ role: UserRole }>;
      };
      notify: {
        sendLowStockReport: () => Promise<void>;
        ownerHelp: (context?: string) => Promise<void>;
      };
    };
  }
}

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>("POS");
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [showOwnerPrompt, setShowOwnerPrompt] = useState(false);
  const [ownerPin, setOwnerPin] = useState("");
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null);
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);
  const [notifyLoading, setNotifyLoading] = useState(false);

  const requireOwnerFor = (target: Screen) => {
    if (userRole === "OWNER") {
      setScreen(target);
      return;
    }
    setPendingScreen(target);
    setOwnerPin("");
    setOwnerError(null);
    setShowOwnerPrompt(true);
  };

  const handleOwnerLogin = async () => {
    const pin = ownerPin.trim();
    if (!pin) {
      setOwnerError("Enter owner PIN.");
      return;
    }
    setOwnerError(null);
    try {
      const result = await window.duka.user.login(pin);
      if (result.role === "OWNER") {
        setUserRole("OWNER");
        setShowOwnerPrompt(false);
        if (pendingScreen) {
          setScreen(pendingScreen);
          setPendingScreen(null);
        }
      } else {
        setOwnerError("You are not registered as OWNER.");
      }
    } catch {
      setOwnerError("Incorrect PIN or login error.");
    }
  };

  const handleOwnerHelp = async () => {
    setNotifyLoading(true);
    setNotifyMessage(null);
    try {
      await window.duka.notify.ownerHelp("Header owner help button");
      setNotifyMessage("Owner has been notified via WhatsApp.");
    } catch {
      setNotifyMessage("Failed to contact owner via WhatsApp.");
    } finally {
      setNotifyLoading(false);
    }
  };

  const handleLowStockReport = async () => {
    setNotifyLoading(true);
    setNotifyMessage(null);
    try {
      await window.duka.notify.sendLowStockReport();
      setNotifyMessage("Low stock report sent to owner via WhatsApp.");
    } catch {
      setNotifyMessage("Failed to send low stock report.");
    } finally {
      setNotifyLoading(false);
    }
  };

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
            onClick={() => requireOwnerFor("PRODUCT_SETUP")}
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
            onClick={() => requireOwnerFor("STOCK_RECEIVE")}
            className={`rounded px-2 py-1 ${
              screen === "STOCK_RECEIVE"
                ? "bg-slate-800 text-emerald-300"
                : "hover:bg-slate-800/60"
            }`}
          >
            Receive Stock
          </button>
          <button
            type="button"
            onClick={handleOwnerHelp}
            className="rounded px-2 py-1 hover:bg-slate-800/60"
          >
            Owner help
          </button>
          {userRole === "OWNER" && (
            <button
              type="button"
              onClick={handleLowStockReport}
              className="rounded px-2 py-1 hover:bg-slate-800/60"
            >
              Send low stock report
            </button>
          )}
        </nav>
      </header>
      {notifyMessage && (
        <div className="px-4 py-1 text-[11px] text-amber-300 border-b border-slate-800">
          {notifyMessage}
        </div>
      )}
      {notifyLoading && (
        <div className="px-4 py-1 text-[11px] text-slate-300 border-b border-slate-800">
          Sending notification…
        </div>
      )}
      {renderScreen()}
      {showOwnerPrompt && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 p-4 text-xs shadow-lg">
            <h2 className="mb-2 text-sm font-semibold">Owner PIN required</h2>
            <p className="mb-2 text-[11px] opacity-70">
              Only the shop owner can open this screen. Enter the owner PIN
              below.
            </p>
            <input
              type="password"
              value={ownerPin}
              onChange={(e) => setOwnerPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleOwnerLogin();
                }
              }}
              className="mb-2 w-full rounded border border-slate-700 bg-transparent px-2 py-1 text-xs outline-none focus:border-emerald-400"
              placeholder="Owner PIN"
            />
            {ownerError && (
              <p className="mb-2 text-[11px] text-red-400">{ownerError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowOwnerPrompt(false)}
                className="rounded px-2 py-1 hover:bg-slate-800/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOwnerLogin}
                className="rounded bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;