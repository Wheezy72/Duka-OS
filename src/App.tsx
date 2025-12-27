import React, { useState } from "react";
import PosLayout from "./layouts/PosLayout";
import ProductSetupLayout from "./layouts/ProductSetupLayout";
import StockReceiveLayout from "./layouts/StockReceiveLayout";
import ReportsLayout from "./layouts/ReportsLayout";

type Screen = "POS" | "PRODUCT_SETUP" | "STOCK_RECEIVE" | "REPORTS";

type UserRole = "OWNER" | "CASHIER" | null;

declare global {
  interface Window {
    duka: {
      user: {
        login: (pin: string) => Promise<{ role: UserRole }>;
        create: (pin: string, role: "OWNER" | "CASHIER") => Promise<{
          id: number;
          role: "OWNER" | "CASHIER";
        }>;
      };
      notify: {
        sendLowStockReport: (threshold?: number) => Promise<void>;
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
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginInfo, setLoginInfo] = useState<string | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState<string>("5");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginLockedUntil, setLoginLockedUntil] = useState<number | null>(null);
  const [showUserCreate, setShowUserCreate] = useState(false);
  const [newUserPin, setNewUserPin] = useState("");
  const [newUserRole, setNewUserRole] =
    useState<"OWNER" | "CASHIER">("CASHIER");
  const [newUserError, setNewUserError] = useState<string | null>(null);
  const [newUserInfo, setNewUserInfo] = useState<string | null>(null);

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
    const threshold = Number(lowStockThreshold);
    const thresholdValue =
      Number.isFinite(threshold) && threshold > 0 ? threshold : undefined;
    try {
      await window.duka.notify.sendLowStockReport(thresholdValue);
      setNotifyMessage("Low stock report sent to owner via WhatsApp.");
    } catch {
      setNotifyMessage("Failed to send low stock report.");
    } finally {
      setNotifyLoading(false);
    }
  };

  const handleLogin = async () => {
    const now = Date.now();
    if (loginLockedUntil && now < loginLockedUntil) {
      setLoginError(
        "Too many wrong PIN attempts. Please wait a bit before trying again."
      );
      return;
    }

    const pin = loginPin.trim();
    if (!pin) {
      setLoginError("Enter your PIN.");
      return;
    }
    setLoginError(null);
    setLoginInfo(null);
    try {
      const result = await window.duka.user.login(pin);
      if (result.role === "OWNER" || result.role === "CASHIER") {
        setUserRole(result.role);
        setScreen("POS");
        setLoginAttempts(0);
        setLoginLockedUntil(null);
      } else {
        setLoginError("Unknown user role.");
      }
    } catch {
      const attempts = loginAttempts + 1;
      setLoginAttempts(attempts);
      if (attempts >= 5) {
        setLoginLockedUntil(Date.now() + 30_000); // 30 seconds
        setLoginError(
          "Too many wrong PIN attempts. Please wait 30 seconds before trying again."
        );
      } else {
        setLoginError("Incorrect PIN or login error.");
      }
    }
  };

  const handleForgotPin = async () => {
    setLoginInfo(null);
    setLoginError(null);
    setNotifyLoading(true);
    try {
      await window.duka.notify.ownerHelp("Forgot PIN at login screen");
      setLoginInfo(
        "We’ve notified the owner via WhatsApp; wait for them to reset your PIN."
      );
    } catch {
      setLoginError("Failed to reach owner via WhatsApp.");
    } finally {
      setNotifyLoading(false);
    }
  };

  const renderScreen = () => {
    if (screen === "PRODUCT_SETUP") retur <<ProductSetupLayout />;
    if (screen === "STOCK_RECEIVE") retur <<StockReceiveLayout />;
    if (screen === "REPORTS") retur <nReportsLayout />;
    retur <nPosLayout />;_code
 new;</ };

  if (!userRole) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="w-full max-w-xs rounded-lg border border-slate-800 bg-slate-900/90 p-5 text-xs shadow-xl">
          <h1 className="mb-3 text-sm font-semibold tracking-tight">
            Duka-OS Login
          </h1>
          <p className="mb-2 text-[11px] opacity-70">
            Enter your PIN to start using the POS.
          </p>
          <input
            type="password"
            value={loginPin}
            onChange={(e) => setLoginPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleLogin();
              }
            }}
            placeholder="PIN"
            className="mb-2 w-full rounded border border-slate-700 bg-transparent px-2 py-1 text-xs outline-none focus:border-emerald-400"
          />
          {loginError && (
            <p className="mb-2 text-[11px] text-red-400">{loginError}</p>
          )}
          {loginInfo && (
            <p className="mb-2 text-[11px] text-emerald-300">{loginInfo}</p>
          )}
          <div className="flex justify-between items-center gap-2">
            <button
              type="button"
              onClick={handleForgotPin}
              className="rounded px-2 py-1 text-[11px] hover:bg-slate-800/60"
            >
              Forgot PIN?
            </button>
            <button
              type="button"
              onClick={handleLogin}
              className="rounded bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="font-semibold tracking-tight">Duka-OS</div>
          <div className="rounded-full border border-slate-700/70 bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-200">
            Logged in as:{" "}
            <span className="font-semibold">
              {userRole === "OWNER"
                ? "Owner"
                : userRole === "CASHIER"
                ? "Cashier"
                : "Unknown"}
            </span>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScreen("POS")}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 ${
              screen === "POS"
                ? "bg-slate-800 text-emerald-300"
                : "hover:bg-slate-800/60"
            }`}
          >
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            <span>POS</span>
          </button>
          <button
            type="button"
            onClick={() => requireOwnerFor("PRODUCT_SETUP")}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 ${
              screen === "PRODUCT_SETUP"
                ? "bg-slate-800 text-emerald-300"
                : "hover:bg-slate-800/60"
            }`}
          >
            <span className="inline-block h-2 w-2 border border-slate-300" />
            <span>Product Setup</span>
          </button>
          <button
            type="button"
            onClick={() => requireOwnerFor("STOCK_RECEIVE")}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 ${
              screen === "STOCK_RECEIVE"
                ? "bg-slate-800 text-emerald-300"
                : "hover:bg-slate-800/60"
            }`}
          >
            <span className="inline-block h-2 w-2 border-b border-l border-slate-300 rotate-[-45deg]" />
            <span>Receive Stock</span>
          </button>
          {userRole === "OWNER" && (
            <button
              type="button"
              onClick={() => requireOwnerFor("REPORTS")}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 ${
                screen === "REPORTS"
                  ? "bg-slate-800 text-emerald-300"
                  : "hover:bg-slate-800/60"
              }`}
            >
              <span className="inline-block h-2 w-3 border-b border-slate-300" />
              <span>Reports</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleOwnerHelp}
            className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-800/60"
          >
            <span className="inline-block h-2 w-2 rounded-full border border-slate-300" />
            <span>Owner help</span>
          </button>
          {userRole === "OWNER" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setNewUserPin("");
                  setNewUserRole("CASHIER");
                  setNewUserError(null);
                  setNewUserInfo(null);
                  setShowUserCreate(true);
                }}
                className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-800/60"
              >
                <span className="inline-block h-2 w-2 border border-slate-300" />
                <span>Add user</span>
              </button>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="opacity-70">Low stock &lt;=</span>
                <input
                  type="number"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-12 rounded border border-slate-700 bg-transparent px-1 py-0.5 text-[11px] outline-none focus:border-emerald-400"
                />
                <span className="opacity-70">units</span>
              </div>
              <button
                type="button"
                onClick={handleLowStockReport}
                className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-800/60"
              >
                <span className="inline-block h-2 w-2 border-b border-slate-300" />
                <span>Send low stock report</span>
              </button>
            </>
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
      {showUserCreate && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 p-4 text-xs shadow-lg">
            <h2 className="mb-2 text-sm font-semibold">Add user</h2>
            <p className="mb-2 text-[11px] opacity-70">
              Create a new user PIN. For now we only track role (Owner or Cashier).
            </p>
            <div className="mb-2 flex items-center gap-2 text-[11px]">
              <span>Role:</span>
              <select
                value={newUserRole}
                onChange={(e) =>
                  setNewUserRole(e.target.value as "OWNER" | "CASHIER")
                }
                className="rounded border border-slate-700 bg-transparent px-2 py-1 text-[11px] outline-none focus:border-emerald-400"
              >
                <option value="CASHIER">Cashier</option>
                <option value="OWNER">Owner</option>
              </select>
            </div>
            <input
              type="password"
              value={newUserPin}
              onChange={(e) => setNewUserPin(e.target.value)}
              className="mb-2 w-full rounded border border-slate-700 bg-transparent px-2 py-1 text-xs outline-none focus:border-emerald-400"
              placeholder="New PIN (4–6 digits)"
            />
            {newUserError && (
              <p className="mb-2 text-[11px] text-red-400">{newUserError}</p>
            )}
            {newUserInfo && (
              <p className="mb-2 text-[11px] text-emerald-300">
                {newUserInfo}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUserCreate(false)}
                className="rounded px-2 py-1 hover:bg-slate-800/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setNewUserError(null);
                  setNewUserInfo(null);
                  try {
                    await window.duka.user.create(newUserPin, newUserRole);
                    setNewUserInfo("User created successfully.");
                    setNewUserPin("");
                  } catch (err: any) {
                    setNewUserError(
                      err?.message || "Failed to create user. Check PIN strength."
                    );
                  }
                }}
                className="rounded bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;