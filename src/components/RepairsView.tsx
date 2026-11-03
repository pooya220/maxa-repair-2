/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Search, Plus, ListFilter, AlertCircle, Cpu, Clock, Download } from "lucide-react";
import { Repair } from "../types";
import { repairExportColumns } from "../utils/csvUtils";
import ExportModal from "./ExportModal";

interface RepairsViewProps {
  repairs: Repair[];
  onAddRepair: () => void;
  onEditRepair: (repair: Repair) => void;
  globalFilter: any;
  onClearGlobalFilter: () => void;
  onShowNotification: (message: string, type?: 'success' | 'error') => void;
  isAdmin?: boolean;
}

export default function RepairsView({
  repairs,
  onAddRepair,
  onEditRepair,
  globalFilter,
  onClearGlobalFilter,
  onShowNotification,
  isAdmin = true,
}: RepairsViewProps) {
  // Filters and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);

  // Filter repairs list
  const filteredList = repairs.filter((item) => {
    // 1. Hide only pure loaner/consignment rows. Incomplete repair records
    // (for example a newly created test row without a model yet) stay visible.
    const isPureConsignment =
      !item.deviceModel?.trim() && !!item.replacementName?.trim();
    if (isPureConsignment) return false;

    // 2. Apply global dashboard filter if active for repairs
    if (globalFilter && globalFilter.tab === 'repairs') {
      const { type, value } = globalFilter;
      if (type === 'repaired' && item.currentStep !== 5) return false;
      if (type === 'unrepaired' && item.currentStep >= 5) return false;
      if (type === 'contract' && (item.contract || 'درحال بررسی') !== value) return false;
      if (type === 'warranty' && (item.warranty || 'درحال بررسی') !== value) return false;
      if (type === 'costApproved' && (item.costApproved || 'درحال بررسی') !== value) return false;
      if (type === 'paymentStatus' && (item.paymentStatus || 'درحال بررسی') !== value) return false;
      if (type === 'repairCompany' && item.repairCompany !== value) return false;
      if (type === 'currentStep' && item.currentStep !== value) return false;
      if (type === 'shipMethod') {
        if (value === "ارسال نشده") {
          if (item.shipMethod && item.shipMethod !== "ارسال نشده") return false;
        } else {
          if (item.shipMethod !== value) return false;
        }
      }
    }

    // 3. Search query matching (searches everywhere across all fields)
    if (searchQuery.trim() !== "") {
      const term = searchQuery.toLowerCase().trim();
      const matchCustomer = item.customerName?.toLowerCase().includes(term);
      const matchSerial = item.serialNumber?.toLowerCase().includes(term);
      const matchModel = item.deviceModel?.toLowerCase().includes(term);
      const matchContact = item.contactPerson?.toLowerCase().includes(term);
      const matchContactNum = item.contactNumber?.toLowerCase().includes(term);
      const matchProblem = item.problem?.toLowerCase().includes(term);
      const matchId = item.id?.toString().includes(term);
      const matchRepl = item.hasReplacement?.toLowerCase().includes(term);

      if (
        !matchCustomer &&
        !matchSerial &&
        !matchModel &&
        !matchContact &&
        !matchContactNum &&
        !matchProblem &&
        !matchId &&
        !matchRepl
      ) {
        return false;
      }
    }

    return true;
  });

  // Sort descending by ID to match latest first
  const sortedList = [...filteredList].sort((a, b) => b.id - a.id);

  const handleExport = () => {
    setShowExportModal(true);
  };

  return (
    <>
      <div className="flex-1 overflow-hidden p-6 flex flex-col space-y-4 bg-[#ebf2fc]" id="repairs-view">
      
      {/* Top Filter and Search Action Row */}
      <div className="flex items-center justify-between shrink-0 gap-4" id="repairs-top-row">
        
        {/* Right side in RTL (Visually Right): Clear Filter Button */}
        <div className="w-48 flex justify-start select-none" id="clear-filter-top-right">
          {(searchQuery.trim() !== "" || (globalFilter && globalFilter.tab === 'repairs')) && (
            <button
              onClick={() => {
                setSearchQuery("");
                onClearGlobalFilter();
              }}
              className="h-10 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="پاک کردن تمامی فیلترها"
            >
              <span>حذف فیلتر</span>
              <span className="font-sans font-black text-sm">×</span>
            </button>
          )}
        </div>

        {/* Center: Centered Search Bar with no column selector */}
        <div className="flex-1 flex justify-center" id="search-bar-center">
          <div className="flex items-center bg-white border border-slate-300 rounded-lg px-3 h-10 w-full max-w-md shadow-xs focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400 transition-all" id="search-container">
            <div className="relative flex-1 flex items-center">
              <input
                type="text"
                placeholder="جستجو در تمام فیلدها و مشخصات پرونده..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 pr-1 pl-6 py-2 border-none focus:outline-none placeholder-slate-400 font-semibold text-right"
                id="search-input"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-1" />
            </div>
          </div>
        </div>

        {/* Left side in RTL (Visually Left): Add Button (Premium Solid Orange) */}
        <div className="w-48 flex justify-end" id="add-repair-top-left">
          <button
            onClick={() => {
              if (!isAdmin) {
                onShowNotification("شما مجوز انجام این عملیات را ندارید.", "error");
                return;
              }
              onAddRepair();
            }}
            className="w-10 h-10 bg-[#e05a2b] hover:bg-[#c9491e] active:bg-[#b03d15] border border-[#e05a2b] rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-md shrink-0 group"
            title="پذیرش دستگاه جدید"
            id="add-repair-btn"
          >
            <Plus className="w-6 h-6 text-white group-hover:scale-110 transition-transform" strokeWidth={3} />
          </button>
        </div>

      </div>

      {/* Grid Table Workspace */}
      <div className="bg-white rounded-lg border border-slate-300 overflow-hidden flex flex-col flex-1 shadow-sm" id="repairs-table-container">
        
        {/* Responsive Table Wrap */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-center border-collapse select-none">
            
            {/* Header matches Screenshot perfectly */}
            <thead>
              <tr className="bg-[#1a2a3a] text-white text-xs font-bold sticky top-0 z-10 h-11 border-b border-slate-300">
                <th className="px-3 py-2 border border-slate-300/80 text-center w-20">شماره ردیف</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">نام مشتری</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">مدل دستگاه</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">شماره سریال</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">مشکل دستگاه</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">وضعیت</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">شخص رابط</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">شماره رابط</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">تاریخ دریافت</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">جایگزین</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="text-xs text-slate-800">
              {sortedList.length > 0 ? (
                sortedList.map((item) => {
                  const stepsMapping = ["نامعلوم", "دریافت دستگاه", "بررسی اولیه", "اعلام هزینه", "تایید نهایی و پرداخت", "تحویل و ارسال"];
                  const statusText = stepsMapping[item.currentStep || 1];

                  return (
                    <tr
                      key={item.id}
                      onDoubleClick={() => onEditRepair(item)}
                      className="hover:bg-slate-50 transition-all cursor-pointer group h-10"
                      title="جهت ویرایش و جزئیات دابل کلیک کنید"
                    >
                      {/* Database ID */}
                      <td className="px-3 py-2 border border-slate-200 text-center font-bold text-slate-800 font-mono">
                        {item.id}
                      </td>

                      {/* Customer Name */}
                      <td className="px-3 py-2 border border-slate-200 text-center font-medium max-w-[200px] truncate" title={item.customerName}>
                        {item.customerName}
                      </td>

                      {/* Model */}
                      <td className="px-3 py-2 border border-slate-200 text-center font-medium">
                        {item.deviceModel}
                      </td>

                      {/* Serial */}
                      <td className="px-3 py-2 border border-slate-200 font-mono text-slate-600 text-center truncate max-w-[150px]" dir="ltr">
                        {item.serialNumber}
                      </td>

                      {/* Problem */}
                      <td className="px-3 py-2 border border-slate-200 text-center text-slate-600 max-w-[180px] truncate" title={item.problem}>
                        {item.problem || "—"}
                      </td>

                      {/* Status - Plain Text */}
                      <td className="px-3 py-2 border border-slate-200 text-center text-slate-700 font-medium">
                        {statusText}
                      </td>

                      {/* Contact person */}
                      <td className="px-3 py-2 border border-slate-200 text-center text-slate-600">
                        {item.contactPerson || "—"}
                      </td>

                      {/* Contact phone */}
                      <td className="px-3 py-2 border border-slate-200 font-mono text-slate-600 text-center" dir="ltr">
                        {item.contactNumber || "—"}
                      </td>

                      {/* Receive Date */}
                      <td className="px-3 py-2 border border-slate-200 text-center font-mono text-slate-600">
                        {item.receiveDate || "—"}
                      </td>

                      {/* Replacement indicator - Plain Text */}
                      <td className="px-3 py-2 border border-slate-200 text-center text-slate-600 font-medium">
                        {item.hasReplacement || "ندارد"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-400" />
                      <span className="text-sm">هیچ دستگاه تعمیری مطابق فیلترهای بالا یافت نشد.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>

        {/* Footer/Summary indicators */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-semibold select-none text-slate-700 shrink-0" id="table-footer-status">
          <div className="flex items-center gap-2 flex-1">
            {globalFilter && globalFilter.tab === 'repairs' ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">وضعیت فیلتر:</span>
                <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-0.5 rounded-md flex items-center gap-1 text-[11px]">
                  <span>داشبورد:</span>
                  <strong className="text-[#e05a2b] font-bold">"{globalFilter.label}"</strong>
                </span>
                <button
                  onClick={onClearGlobalFilter}
                  className="mr-2 text-rose-600 hover:text-rose-700 transition-all font-bold cursor-pointer text-xs flex items-center gap-1"
                  title="پاک کردن فیلتر داشبورد"
                >
                  <span>حذف فیلتر</span>
                  <span className="font-sans font-black text-sm">×</span>
                </button>
              </div>
            ) : searchQuery.trim() ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">وضعیت فیلتر:</span>
                <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-0.5 rounded-md flex items-center gap-1 text-[11px]">
                  <span>جستجو:</span>
                  <strong className="text-[#e05a2b] font-bold">"{searchQuery}"</strong>
                </span>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mr-2 text-rose-600 hover:text-rose-700 transition-all font-bold cursor-pointer text-xs flex items-center gap-1"
                  title="پاک کردن جستجو"
                >
                  <span>حذف فیلتر</span>
                  <span className="font-sans font-black text-sm">×</span>
                </button>
              </div>
            ) : (
              <span className="text-slate-500 font-bold text-[11px]">
                جهت مشاهده جزئیات و عیب‌یابی هر پرونده، روی ردیف مربوطه دابل کلیک کنید.
              </span>
            )}
            <button
              onClick={handleExport}
              className="order-first inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 transition-colors hover:bg-sky-100"
              title="دریافت خروجی از موارد فیلترشده"
            >
              <Download className="h-3.5 w-3.5" />
              خروجی Excel (CSV)
            </button>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-slate-700 font-bold text-[11px]">تعداد آیتم‌ها: {sortedList.length}</span>
          </div>
        </div>

      </div>

      </div>
      {showExportModal && (
        <ExportModal
          title="انتخاب خروجی تعمیرات"
          rows={sortedList}
          columns={repairExportColumns}
          filename={`repairs-${new Date().toISOString().slice(0, 10)}.csv`}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </>
  );
}
