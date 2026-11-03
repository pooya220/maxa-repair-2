import React from "react";
import { Download, X, CheckSquare, Square } from "lucide-react";
import type { Repair } from "../types";
import { downloadCsv } from "../utils/csvUtils";
import type { ExportColumn } from "../utils/csvUtils";

interface ExportModalProps {
  title: string;
  rows: Repair[];
  columns: ExportColumn<Repair>[];
  filename: string;
  onClose: () => void;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  return String(value);
}

export default function ExportModal({ title, rows, columns, filename, onClose }: ExportModalProps) {
  const [selectedColumns, setSelectedColumns] = React.useState<Set<string>>(
    () => new Set(columns.map((column) => column.key)),
  );
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(
    () => new Set(rows.map((row) => row.id)),
  );

  const allColumnsSelected = selectedColumns.size === columns.length;
  const allRowsSelected = selectedRows.size === rows.length;

  const toggleColumn = (key: string) => {
    setSelectedColumns((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleRow = (id: number) => {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownload = () => {
    const activeColumns = columns.filter((column) => selectedColumns.has(column.key));
    const activeRows = rows.filter((row) => selectedRows.has(row.id));
    downloadCsv(
      filename,
      activeColumns.map((column) => column.label),
      activeRows.map((row) => activeColumns.map((column) => column.getValue(row))),
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" dir="rtl" id="export-modal">
        <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative flex items-center justify-between border-b border-slate-200 bg-slate-50 py-4 pr-5 pl-16">
          <div>
            <h2 className="text-base font-black text-slate-800">{title}</h2>
            <p className="mt-1 text-[11px] text-slate-500">ستون‌ها و ردیف‌هایی را که باید در فایل Excel باشند انتخاب کنید.</p>
          </div>
          <button onClick={onClose} className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-rose-600/90 text-white transition-colors hover:bg-rose-700 cursor-pointer" title="بستن" aria-label="بستن">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-5 lg:grid-cols-[minmax(0,1fr)_310px]">
          <section className="flex min-h-0 flex-col rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <h3 className="text-xs font-black text-slate-700">ستون‌های خروجی</h3>
                <span className="text-[10px] text-slate-500">{selectedColumns.size} از {columns.length} ستون</span>
              </div>
              <button
                onClick={() => setSelectedColumns(allColumnsSelected ? new Set() : new Set(columns.map((column) => column.key)))}
                className="text-[11px] font-bold text-sky-700 hover:text-sky-900"
              >
                {allColumnsSelected ? "لغو انتخاب همه" : "انتخاب همه ستون‌ها"}
              </button>
            </div>
            <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-1 overflow-y-auto p-3 sm:grid-cols-2">
              {columns.map((column) => {
                const checked = selectedColumns.has(column.key);
                return (
                  <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-700 hover:bg-slate-50">
                    <input type="checkbox" checked={checked} onChange={() => toggleColumn(column.key)} className="h-4 w-4 accent-sky-600" />
                    <span className={checked ? "font-bold" : "text-slate-500"}>{column.label}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <h3 className="text-xs font-black text-slate-700">ردیف‌های خروجی</h3>
                <span className="text-[10px] text-slate-500">{selectedRows.size} از {rows.length} ردیف</span>
              </div>
              <button
                onClick={() => setSelectedRows(allRowsSelected ? new Set() : new Set(rows.map((row) => row.id)))}
                className="text-[11px] font-bold text-sky-700 hover:text-sky-900"
              >
                {allRowsSelected ? "لغو انتخاب همه" : "انتخاب همه ردیف‌ها"}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {rows.map((row) => {
                const checked = selectedRows.has(row.id);
                return (
                  <label key={row.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs hover:bg-slate-50">
                    <input type="checkbox" checked={checked} onChange={() => toggleRow(row.id)} className="h-4 w-4 accent-sky-600" />
                    {checked ? <CheckSquare className="h-4 w-4 text-sky-600" /> : <Square className="h-4 w-4 text-slate-300" />}
                    <span className="font-mono font-bold text-slate-700">{row.id}</span>
                    <span className="min-w-0 truncate text-slate-600">{displayValue(row.customerName)}</span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4">
          <span className="text-[11px] text-slate-500">{selectedRows.size} ردیف و {selectedColumns.size} ستون انتخاب شده</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">انصراف</button>
            <button
              onClick={handleDownload}
              disabled={!selectedRows.size || !selectedColumns.size}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              دریافت خروجی Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
