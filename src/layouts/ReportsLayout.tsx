import React, { useEffect, useState } from "react";

declare global {
  interface Window {
    duka: {
      report: {
        getDaily: (
          dateISO: string
        ) => Promise<{
          date: string;
          saleCount: number;
          total: number;
          byMethod: { CASH: number; MPESA: number };
        }>;
        exportDailyCsv: (dateISO: string) => Promise<{ filePath: string }>;
      };
    };
  }
}

const todayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const ReportsLayout: React.FC = () => {
  const [date, setDate] = useState<string>(todayISO());
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{
    saleCount: number;
    total: number;
    byMethod: { CASH: number; MPESA: number };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportInfo, setExportInfo] = useState<string | null>(null);

  const load = async (selectedDate: string) => {
    setLoading(true);
    setError(null);
    setExportInfo(null);
    try {
      const result = await window.duka.report.getDaily(selectedDate);
      setSummary({
        saleCount: result.saleCount,
        total: result.total,
        byMethod: result.byMethod,
      });
    } catch {
      setError("Failed to load report. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(date);
  }, []);

  const handleDateChange = (value: string) => {
    setDate(value);
    void load(value);
  };

  const handleExport = async () => {
    setExportInfo(null);
    setError(null);
    try {
      const res = await window.duka.report.exportDailyCsv(date);
      setExportInfo(`CSV saved to: ${res.filePath}`);
    } catch {
      setError("Failed to export CSV. Check disk permissions.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-40px)] bg-slate-950 text-slate-100 flex items-start justify-center px-4 py-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[12px]">
              {/* simple icon-like shape */}
              ⓡ
            </span>
            <span>Daily Report</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <label className="opacity-70">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="rounded border border-slate-700 bg-slate-950/80 px-2 py-0.5 text-[11px] outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-[11px] opacity-70">Loading…</p>
        ) : error ? (
          <p className="text-[11px] text-red-400">{error}</p>
        ) : summary ? (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-[11px] opacity-70">Total sales</div>
                <div className="mt-1 text-lg font-semibold">
                  KES {summary.total.toFixed(2)}
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-[11px] opacity-70">Cash</div>
                <div className="mt-1 text-sm font-semibold">
                  KES {summary.byMethod.CASH.toFixed(2)}
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-[11px] opacity-70">M-Pesa</div>
                <div className="mt-1 text-sm font-semibold">
                  KES {summary.byMethod.MPESA.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 flex items-center justify-between">
              <div className="text-[11px] opacity-70">Number of sales</div>
              <div className="text-sm font-semibold">
                {summary.saleCount}
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <p className="text-[11px] opacity-70">
                Export this day's sales as a CSV file for backup or accounting.
              </p>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white shadow-md hover:bg-emerald-700"
              >
                <span className="inline-block h-3 w-3 border-b border-l border-white rotate-[-45deg]" />
                <span>Download CSV</span>
              </button>
            </div>

            {exportInfo && (
              <p className="mt-2 text-[11px] text-emerald-300">
                {exportInfo}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[11px] opacity-70">No data for this day.</p>
        )}
      </div>
    </div>
  );
};

export default ReportsLayout;