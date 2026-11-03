/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Search, Plus, AlertCircle, Download } from "lucide-react";
import { Repair } from "../types";
import { hasRealJalaliDate } from "../utils/dateUtils";
import { repairExportColumns } from "../utils/csvUtils";
import ExportModal from "./ExportModal";

interface ConsignmentViewProps {
  repairs: Repair[];
  onAddConsignment: () => void;
  onEditConsignment: (consignment: Repair) => void;
  globalFilter: any;
  onClearGlobalFilter: () => void;
  onShowNotification: (message: string, type?: 'success' | 'error') => void;
  isAdmin?: boolean;
}

export default function ConsignmentView({
  repairs,
  onAddConsignment,
  onEditConsignment,
  globalFilter,
  onClearGlobalFilter,
  onShowNotification,
  isAdmin = true,
}: ConsignmentViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);

  // Filter list
  const filteredList = repairs.filter((item) => {
    // 1. Must have RDModel (replacementName) to be shown in Loaner Devices (امانی‌ها) view
    const hasRDModel = !!(item.replacementName && item.replacementName.trim() !== "");
    if (!hasRDModel) return false;

    // 2. Apply global dashboard filter if active for consignment
    if (globalFilter && globalFilter.tab === 'consignment') {
      const { type, value } = globalFilter;
      if (type === 'all') {
        // no extra constraint, just all consignments
      } else if (type === 'itemType') {
        const isRepairDevice = !!(item.deviceModel && item.deviceModel.trim() !== "");
        if (value === 'امانی' && isRepairDevice) return false;
        if (value === 'جایگزین' && !isRepairDevice) return false;
      } else if (type === 'receiveStatus') {
        const hasReceiveDate = hasRealJalaliDate(item.replacementReceiveDate);
        if (value === 'دارد' && !hasReceiveDate) return false;
        if (value === 'ندارد' && hasReceiveDate) return false;
      } else if (type === 'hasReplacement' && item.hasReplacement !== value) {
        return false;
      } else if (type === 'contract' && item.contract !== value) {
        return false;
      } else if (type === 'isPilot') {
        const isPilotItem = item.contract === "دارد";
        if (value === "دارد" && !isPilotItem) return false;
        if (value === "ندارد" && isPilotItem) return false;
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
      const matchOtherInfo = item.initialOtherInfo?.toLowerCase().includes(term);
      const matchContract = item.contract?.toLowerCase().includes(term);
      const matchReplacementName = item.replacementName?.toLowerCase().includes(term);
      const matchReplacementSerial = item.replacementSerial?.toLowerCase().includes(term);
      const matchId = item.id?.toString().includes(term);

      if (
        !matchCustomer &&
        !matchSerial &&
        !matchModel &&
        !matchContact &&
        !matchContactNum &&
        !matchOtherInfo &&
        !matchContract &&
        !matchReplacementName &&
        !matchReplacementSerial &&
        !matchId
      ) {
        return false;
      }
    }

    return true;
  });

  const formatDate = (val?: string) => {
    return hasRealJalaliDate(val) ? val!.trim() : "—";
  };

  const sortedList = [...filteredList].sort((a, b) => b.id - a.id);

  const handleExport = () => {
    setShowExportModal(true);
  };

  return (
    <>
      <div className="flex-1 overflow-hidden p-6 flex flex-col space-y-4 bg-[#ebf2fc]" id="consignment-view">
      
      {/* Top Filter and Search Action Row */}
      <div className="flex items-center justify-between shrink-0 gap-4" id="consignment-top-row">
        
        {/* Right side in RTL (Visually Right): Clear Filter Button */}
        <div className="w-48 flex justify-start select-none" id="clear-filter-top-right">
          {(searchQuery.trim() !== "" || (globalFilter && globalFilter.tab === 'consignment')) && (
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
                placeholder="جستجو در تمام فیلدها و مشخصات امانی..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 pr-1 pl-6 py-2 border-none focus:outline-none placeholder-slate-400 font-semibold text-right"
                id="search-input"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-1" />
            </div>
          </div>
        </div>

        {/* Left side in RTL (Visually Left): Add Button (Navy Blue theme) */}
        <div className="w-48 flex justify-end" id="add-consignment-top-left">
          <button
            onClick={() => {
              if (!isAdmin) {
                onShowNotification("شما مجوز انجام این عملیات را ندارید.", "error");
                return;
              }
              onAddConsignment();
            }}
            className="w-10 h-10 bg-[#253b51] hover:bg-[#1a2a3a] active:bg-[#152230] border border-[#253b51] rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-md shrink-0 group"
            title="ثبت امانی جدید"
            id="add-consignment-btn"
          >
            <Plus className="w-6 h-6 text-white group-hover:scale-110 transition-transform" strokeWidth={3} />
          </button>
        </div>

      </div>

      {/* Grid Table Workspace */}
      <div className="bg-white rounded-lg border border-slate-300 overflow-hidden flex flex-col flex-1 shadow-sm" id="consignment-table-container">
        
        {/* Table Wrap */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-center border-collapse select-none">
            
            {/* Header: Orange styled header matching screenshot perfectly */}
            <thead>
              <tr className="bg-[#e05a2b] text-white text-xs font-bold sticky top-0 z-10 h-11 border-b border-slate-300">
                <th className="px-3 py-2 border border-slate-300/80 text-center w-20">شماره ردیف</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">نام مشتری</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">شخص رابط</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">شماره رابط</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">سایر اطلاعات</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">اتصال به پرونده</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">قرارداد</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">مدل امانی / جایگزین</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">سریال امانی / جایگزین</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">مدل اصلی پرونده</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">تاریخ ارسال</th>
                <th className="px-3 py-2 border border-slate-300/80 text-center">تاریخ دریافت</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="text-xs text-slate-800">
              {sortedList.length > 0 ? (
                sortedList.map((item) => {
                  const hasDevice = !!(item.deviceModel && item.deviceModel.trim() !== "");
                  const relatedRepairId = item.relatedRepairId?.trim();
                  const connectionRepairId = relatedRepairId && /^\d+$/.test(relatedRepairId)
                    ? relatedRepairId
                    : hasDevice ? String(item.id) : undefined;
                  return (
                    <tr
                      key={item.id}
                      onDoubleClick={() => onEditConsignment(item)}
                      className="hover:bg-slate-50 transition-all cursor-pointer group h-10"
                      title="جهت ویرایش و مشاهده جزئیات دابل کلیک کنید"
                    >
                      <td className="px-3 py-2 border border-slate-200 text-center font-bold text-slate-800 font-mono">
                        {item.id}
                      </td>
                      {/* Customer Name */}
                      <td className="px-3 py-2 border border-slate-200 text-center font-medium max-w-[200px] truncate" title={item.customerName}>
                        {item.customerName}
                      </td>

                      {/* Contact Person */}
                      <td className="px-3 py-2 border border-slate-200 text-center text-slate-600">
                        {item.contactPerson || "—"}
                      </td>

                      {/* Contact Phone */}
                      <td className="px-3 py-2 border border-slate-200 font-mono text-slate-600 text-center" dir="ltr">
                        {item.contactNumber || "—"}
                      </td>

                      {/* Other Info / Problem description */}
                      <td className="px-3 py-2 border border-slate-200 text-center text-slate-600 max-w-[180px] truncate" title={item.initialOtherInfo || item.problem}>
                        {item.initialOtherInfo || item.problem || "—"}
                      </td>

                      {/* Connection to Repair (اتصال به پرونده) */}
                      <td className="px-3 py-2 border border-slate-200 text-center text-slate-600 font-bold">
                        {connectionRepairId ? (
                          <span className="text-teal-600 font-bold text-[11px]">
                            پرونده {connectionRepairId}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">مستقل</span>
                        )}
                      </td>

                      {/* Contract */}
                      <td className="px-3 py-2 border border-slate-200 text-center text-slate-700">
                        {item.contract || "—"}
                      </td>

                      {/* RDModel (Replacement Device Name) */}
                      <td className="px-3 py-2 border border-slate-200 text-center text-slate-800 font-bold">
                        {item.replacementName || "—"}
                      </td>

                      {/* RDSerial (Replacement Device Serial) */}
                      <td className="px-3 py-2 border border-slate-200 text-center font-mono text-slate-600" dir="ltr">
                        {item.replacementSerial || "—"}
                      </td>

                      {/* Device Model (Main repair device) */}
                      <td className="px-3 py-2 border border-slate-200 text-center text-slate-600 font-medium">
                        {item.deviceModel || "—"}
                      </td>

                      {/* Send Date (تاریخ ارسال) */}
                      <td className="px-3 py-2 border border-slate-200 text-center font-mono text-slate-600">
                        {formatDate(item.replacementSendDate || item.receiveDate)}
                      </td>

                      {/* Receive Date (تاریخ دریافت) */}
                      <td className="px-3 py-2 border border-slate-200 text-center font-mono text-slate-600">
                        {formatDate(item.replacementReceiveDate)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-400" />
                      <span className="text-sm">هیچ کالای امانی مطابق جستجوی شما یافت نشد.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>

        {/* Summary Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-semibold select-none text-slate-700 shrink-0" id="table-footer-status">
          <div className="flex items-center gap-2 flex-1">
            {globalFilter && globalFilter.tab === 'consignment' ? (
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
                جهت ویرایش و تحویل کالا یا فیش چاپی امانی، روی ردیف مربوطه دابل کلیک کنید.
              </span>
            )}
            <button
              onClick={handleExport}
              className="order-first inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700 transition-colors hover:bg-orange-100"
              title="دریافت خروجی از موارد فیلترشده"
            >
              <Download className="h-3.5 w-3.5" />
              خروجی Excel (CSV)
            </button>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-slate-700 font-bold text-[11px]">تعداد کالا‌های امانی: {sortedList.length}</span>
          </div>
        </div>

      </div>

      </div>
      {showExportModal && (
        <ExportModal
          title="انتخاب خروجی امانی‌ها"
          rows={sortedList}
          columns={repairExportColumns}
          filename={`consignments-${new Date().toISOString().slice(0, 10)}.csv`}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </>
  );
}
