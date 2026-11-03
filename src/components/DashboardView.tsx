/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  ShieldCheck, AlertCircle, RefreshCcw, 
  Package, Truck, UserCheck, Inbox, ArrowUpRight, 
  FolderLock, Layers, Milestone, HelpCircle, Check, X, ChevronDown,
  FileText, Search, Cpu, CheckCircle2, DollarSign, CreditCard, Coins,
  Bike, MapPin, Archive, Database, User, Activity, Clock,
  PackageCheck, Send, Eye, EyeOff
} from "lucide-react";
import { Repair, SystemSettings } from "../types";
import { hasRealJalaliDate } from "../utils/dateUtils";
import { normalizeRepairCompany, REPAIR_COMPANIES } from "../utils/repairCompany";

// Map string names to actual Lucide component types for dynamic customizable icons
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Inbox, FileText, Search, Cpu, CheckCircle2, DollarSign, CreditCard, 
  Truck, Bike, MapPin, Archive, Package, Database, User, Activity, Clock,
  PackageCheck, Send, UserCheck
};

interface DashboardViewProps {
  repairs: Repair[];
  onSetGlobalFilter: (tab: 'repairs' | 'consignment', type: string, value: any, label: string) => void;
  settings?: SystemSettings | null;
}

export default function DashboardView({ repairs, onSetGlobalFilter, settings }: DashboardViewProps) {
  const [showInventory, setShowInventory] = React.useState(false);
  const [showFinancialAmount, setShowFinancialAmount] = React.useState(false);

  // Dynamic icon resolver using user's customized icon settings
  const getCustomIcon = (key: string, fallbackName: string, className = "w-10 h-10 text-white/95") => {
    const iconName = settings ? (settings as any)[key] : fallbackName;
    const IconComponent = ICON_MAP[iconName] || ICON_MAP[fallbackName];
    return <IconComponent className={className} />;
  };
  
  // Helpers
  const isRepair = (r: Repair) => !!(r.deviceModel && r.deviceModel.trim() !== "");
  const isConsignment = (r: Repair) => !!(r.replacementName && r.replacementName.trim() !== "");

  // 1. Calculate general stats
  const totalRepairs = repairs.filter(isRepair).length;
  const totalConsignments = repairs.filter(isConsignment).length;

  const repairedCount = repairs.filter(r => isRepair(r) && r.currentStep === 5).length;
  const unrepairedCount = repairs.filter(r => isRepair(r) && r.currentStep < 5).length;

  // 2. Shipping states under "ارسال"
  const shipMethodCounts = {
    notSent: repairs.filter(r => isRepair(r) && (r.shipMethod === "ارسال نشده" || !r.shipMethod)).length,
    handover: repairs.filter(r => isRepair(r) && r.shipMethod === "تحویل حضوری").length,
    customerCourier: repairs.filter(r => isRepair(r) && r.shipMethod === "پیک مشتری").length,
    companyCourier: repairs.filter(r => isRepair(r) && r.shipMethod === "پیک شرکت").length,
  };

  // 3. Repair company distribution (Percentages & Counts)
  const companyCounts = Object.fromEntries(
    REPAIR_COMPANIES.map((company) => [company, 0])
  ) as Record<string, number>;

  // Include incomplete repair records too, unless they are pure consignment rows.
  const isRepairCompanyRecord = (r: Repair) =>
    isRepair(r) || (!r.isConsignment && !isConsignment(r));

  // Supplement with live data from database
  repairs.forEach(r => {
    if (isRepairCompanyRecord(r)) {
      const company = normalizeRepairCompany(r.repairCompany);
      companyCounts[company] += 1;
    }
  });

  const companyTotal = Object.values(companyCounts).reduce((a, b) => a + b, 0);

  // 4. Repairs detailed stats
  const contractStats = {
    yes: repairs.filter(r => isRepair(r) && r.contract === "دارد").length,
    no: repairs.filter(r => isRepair(r) && r.contract === "ندارد").length,
    pending: repairs.filter(r => isRepair(r) && (!r.contract || r.contract === "درحال بررسی")).length,
  };

  const warrantyStats = {
    yes: repairs.filter(r => isRepair(r) && r.warranty === "دارد").length,
    no: repairs.filter(r => isRepair(r) && r.warranty === "ندارد").length,
    pending: repairs.filter(r => isRepair(r) && (!r.warranty || r.warranty === "درحال بررسی")).length,
  };

  const costApprovedStats = {
    yes: repairs.filter(r => isRepair(r) && r.costApproved === "شده است").length,
    no: repairs.filter(r => isRepair(r) && r.costApproved === "نشده است").length,
    pending: repairs.filter(r => isRepair(r) && (!r.costApproved || r.costApproved === "درحال بررسی")).length,
  };

  const paymentStats = {
    paid: repairs.filter(r => isRepair(r) && r.paymentStatus === "شده است").length,
    unpaid: repairs.filter(r => isRepair(r) && r.paymentStatus === "نشده است").length,
    pending: repairs.filter(r => isRepair(r) && (!r.paymentStatus || r.paymentStatus === "درحال بررسی")).length,
  };

  const receiveStatusStats = {
    yes: repairs.filter(r => isConsignment(r) && hasRealJalaliDate(r.replacementReceiveDate)).length,
    no: repairs.filter(r => isConsignment(r) && !hasRealJalaliDate(r.replacementReceiveDate)).length,
  };

  const consignmentDevices = repairs.filter(isConsignment);
  const modelInventory: Record<string, { available: number; sent: number }> = {};
  
  consignmentDevices.forEach(r => {
    const model = r.replacementName?.trim() || r.deviceModel?.trim() || "مدل نامشخص";
    if (!modelInventory[model]) {
      modelInventory[model] = { available: 0, sent: 0 };
    }
    const hasReceiveDate = hasRealJalaliDate(r.replacementReceiveDate);
    if (hasReceiveDate) {
      modelInventory[model].available += 1;
    } else {
      modelInventory[model].sent += 1;
    }
  });

  const availableCount = receiveStatusStats.yes; // موجود در انبار (دارای تاریخ دریافت)
  const sentCount = receiveStatusStats.no;      // دست مشتری (بدون تاریخ دریافت)

  // 5. Consignment detailed stats
  const pureAmaniCount = repairs.filter(r => isConsignment(r) && !isRepair(r)).length;
  const replacementCount = repairs.filter(r => isConsignment(r) && isRepair(r)).length;

  const consignmentStats = {
    hasContract: repairs.filter(r => isConsignment(r) && r.contract === "دارد").length,
    noContract: repairs.filter(r => isConsignment(r) && r.contract === "ندارد").length,
    pendingContract: repairs.filter(r => isConsignment(r) && r.contract === "درحال بررسی").length,
  };

  // 6. Stepper flow stages count ("وضعیت کالا")
  const stepCounts = {
    step1: repairs.filter(r => isRepair(r) && (r.currentStep === 1 || !r.currentStep)).length,
    step2: repairs.filter(r => isRepair(r) && r.currentStep === 2).length,
    step3: repairs.filter(r => isRepair(r) && r.currentStep === 3).length,
    step4: repairs.filter(r => isRepair(r) && r.currentStep === 4).length,
    step5: repairs.filter(r => isRepair(r) && r.currentStep === 5).length,
  };

  // 7. Financial statistics for paid & shipped items
  const parseCost = (costStr?: string): number => {
    if (!costStr) return 0;
    const cleanStr = String(costStr)
      .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
      .replace(/[^0-9]/g, "");
    return parseInt(cleanStr, 10) || 0;
  };

  const paidAndSentRepairs = repairs.filter(r => 
    isRepair(r) && 
    r.paymentStatus === "شده است" && 
    (r.currentStep === 5 || (r.shipMethod && r.shipMethod !== "ارسال نشده")) &&
    r.quotedCost && r.quotedCost.trim() !== ""
  );

  const totalPaidAndSentCost = paidAndSentRepairs.reduce((sum, r) => sum + parseCost(r.quotedCost), 0);
  const paidAndSentCount = paidAndSentRepairs.length;

  const totalQuotedCostAll = repairs.filter(r => isRepair(r) && r.quotedCost && r.quotedCost.trim() !== "").reduce((sum, r) => sum + parseCost(r.quotedCost), 0);
  const totalQuotedCountAll = repairs.filter(r => isRepair(r) && r.quotedCost && r.quotedCost.trim() !== "").length;

  const settledPercentage = totalQuotedCostAll > 0 ? Math.round((totalPaidAndSentCost / totalQuotedCostAll) * 100) : 0;

  const formatToman = (num: number) => {
    return num.toLocaleString('fa-IR') + " تومان";
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 pt-8 space-y-8 bg-[#ebf2fc] select-none" id="dashboard-view" dir="rtl">
      
      {/* 3-Column main layout (RTL) */}
      <div className="flex flex-col lg:flex-row gap-8" id="dashboard-main-layout">
        
        {/* Right side column: "وضعیت تعمیرات" (Top) and "وضعیت امانی" (Bottom) */}
        <div className="w-full lg:w-[272px] shrink-0 flex flex-col gap-8" id="dashboard-right-column">
          
          {/* CARD 1: وضعیت تعمیرات */}
          <div className="relative bg-white border border-slate-300 rounded-xl p-5 pt-8 space-y-3 shadow-md">
            <div className="absolute -top-7 right-6 bg-[#253b51] text-white px-5 py-1.5 rounded-t-lg font-black text-xs shadow-xs border-t border-x border-slate-600">
              وضعیت تعمیرات
            </div>

            <div className="space-y-3">
              {/* Row 1: تعداد تعمیرشده */}
              <div 
                onClick={() => onSetGlobalFilter('repairs', 'repaired', true, 'تعمیرشده')}
                className="bg-[#f1f5f9] hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200/50 px-3 py-2 rounded-lg flex justify-between items-center h-12 cursor-pointer transition-all active:scale-98 group"
                title="کلیک برای فیلتر دستگاه‌های تعمیرشده"
              >
                <span className="text-xs font-bold text-slate-600 group-hover:text-emerald-700 transition-colors">تعداد تعمیرشده</span>
                <div className="w-12 h-8 rounded-lg bg-white border border-slate-200 group-hover:border-emerald-400 flex items-center justify-center font-bold text-slate-800 group-hover:text-emerald-700 font-mono text-xs transition-all shadow-xs">
                  {repairedCount}
                </div>
              </div>

              {/* Row 2: تعداد تعمیرنشده */}
              <div 
                onClick={() => onSetGlobalFilter('repairs', 'unrepaired', true, 'در حال تعمیر (تعمیر نشده)')}
                className="bg-[#f1f5f9] hover:bg-amber-50 hover:border-amber-300 border border-slate-200/50 px-3 py-2 rounded-lg flex justify-between items-center h-12 cursor-pointer transition-all active:scale-98 group"
                title="کلیک برای فیلتر دستگاه‌های در حال تعمیر"
              >
                <span className="text-xs font-bold text-slate-600 group-hover:text-amber-700 transition-colors">تعداد تعمیرنشده</span>
                <div className="w-12 h-8 rounded-lg bg-white border border-slate-200 group-hover:border-amber-400 flex items-center justify-center font-bold text-slate-800 group-hover:text-amber-700 font-mono text-xs transition-all shadow-xs">
                  {unrepairedCount}
                </div>
              </div>

              {/* Row 3: قرارداد */}
              <div className="bg-[#f1f5f9] border border-slate-200/50 px-3 py-2 rounded-lg flex justify-between items-center h-12">
                <span className="text-xs font-bold text-slate-600">قرارداد</span>
                <div className="flex gap-2">
                  {/* Yes (Check) */}
                  <div 
                    onClick={() => onSetGlobalFilter('repairs', 'contract', 'دارد', 'قرارداد: دارد')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: دارای قرارداد"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{contractStats.yes}</span>
                  </div>
                  {/* No (X) */}
                  <div 
                    onClick={() => onSetGlobalFilter('repairs', 'contract', 'ندارد', 'قرارداد: ندارد')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-rose-400 hover:bg-rose-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: بدون قرارداد"
                  >
                    <X className="w-3.5 h-3.5 text-rose-500 stroke-[3]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{contractStats.no}</span>
                  </div>
                  {/* Pending (Refresh) */}
                  <div 
                    onClick={() => onSetGlobalFilter('repairs', 'contract', 'درحال بررسی', 'قرارداد: درحال بررسی')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: قرارداد در حال بررسی"
                  >
                    <RefreshCcw className="w-3 h-3 text-amber-500 stroke-[2.5]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{contractStats.pending}</span>
                  </div>
                </div>
              </div>

              {/* Row 4: گارانتی */}
              <div className="bg-[#f1f5f9] border border-slate-200/50 px-3 py-2 rounded-lg flex justify-between items-center h-12">
                <span className="text-xs font-bold text-slate-600">گارانتی</span>
                <div className="flex gap-2">
                  <div 
                    onClick={() => onSetGlobalFilter('repairs', 'warranty', 'دارد', 'گارانتی: دارد')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: دارای گارانتی"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{warrantyStats.yes}</span>
                  </div>
                  <div 
                    onClick={() => onSetGlobalFilter('repairs', 'warranty', 'ندارد', 'گارانتی: ندارد')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-rose-400 hover:bg-rose-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: بدون گارانتی"
                  >
                    <X className="w-3.5 h-3.5 text-rose-500 stroke-[3]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{warrantyStats.no}</span>
                  </div>
                  <div 
                    onClick={() => onSetGlobalFilter('repairs', 'warranty', 'درحال بررسی', 'گارانتی: درحال بررسی')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: گارانتی در حال بررسی"
                  >
                    <RefreshCcw className="w-3 h-3 text-amber-500 stroke-[2.5]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{warrantyStats.pending}</span>
                  </div>
                </div>
              </div>

              {/* Row 5: تائید هزینه */}
              <div className="bg-[#f1f5f9] border border-slate-200/50 px-3 py-2 rounded-lg flex justify-between items-center h-12">
                <span className="text-xs font-bold text-slate-600">تائید هزینه</span>
                <div className="flex gap-2">
                  <div 
                    onClick={() => onSetGlobalFilter('repairs', 'costApproved', 'شده است', 'تایید هزینه: شده است')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: هزینه تایید شده"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{costApprovedStats.yes}</span>
                  </div>
                  <div 
                    onClick={() => onSetGlobalFilter('repairs', 'costApproved', 'نشده است', 'تایید هزینه: نشده است')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-rose-400 hover:bg-rose-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: هزینه تایید نشده"
                  >
                    <X className="w-3.5 h-3.5 text-rose-500 stroke-[3]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{costApprovedStats.no}</span>
                  </div>
                  <div 
                    onClick={() => onSetGlobalFilter('repairs', 'costApproved', 'درحال بررسی', 'تایید هزینه: درحال بررسی')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: تایید هزینه در حال بررسی"
                  >
                    <RefreshCcw className="w-3 h-3 text-amber-500 stroke-[2.5]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{costApprovedStats.pending}</span>
                  </div>
                </div>
              </div>

              {/* Row 6: پرداخت */}
              <div className="bg-[#f1f5f9] border border-slate-200/50 px-3 py-2 rounded-lg flex justify-between items-center h-12">
                <span className="text-xs font-bold text-slate-600">وضعیت پرداخت</span>
                <div className="flex gap-2">
                  <div 
                    onClick={() => onSetGlobalFilter('repairs', 'paymentStatus', 'شده است', 'پرداخت: تسویه شده')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: تسویه شده"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{paymentStats.paid}</span>
                  </div>
                  <div 
                    onClick={() => onSetGlobalFilter('repairs', 'paymentStatus', 'نشده است', 'پرداخت: تسویه نشده')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-rose-400 hover:bg-rose-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: تسویه نشده"
                  >
                    <X className="w-3.5 h-3.5 text-rose-500 stroke-[3]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{paymentStats.unpaid}</span>
                  </div>
                  <div 
                    onClick={() => onSetGlobalFilter('repairs', 'paymentStatus', 'درحال بررسی', 'پرداخت: درحال بررسی')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: درحال بررسی"
                  >
                    <RefreshCcw className="w-3 h-3 text-amber-500 stroke-[2.5]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{paymentStats.pending}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* CARD 2: وضعیت امانی */}
          <div className="relative bg-white border border-slate-300 rounded-xl p-5 pt-8 space-y-3 shadow-md">
            <div className="absolute -top-7 right-6 bg-[#253b51] text-white px-5 py-1.5 rounded-t-lg font-black text-xs shadow-xs border-t border-x border-slate-600">
              وضعیت امانی
            </div>

            <div className="space-y-3">
              {/* Row 1: تعداد امانی */}
              <div 
                onClick={() => onSetGlobalFilter('consignment', 'itemType', 'امانی', 'نوع کالا: امانی')}
                className="bg-[#f1f5f9] hover:bg-sky-50 hover:border-sky-300 border border-slate-200/50 px-3 py-2 rounded-lg flex justify-between items-center h-12 cursor-pointer transition-all active:scale-98 group"
                title="کلیک برای فیلتر کالاهای امانی"
              >
                <span className="text-xs font-bold text-slate-600 group-hover:text-sky-700 transition-colors">تعداد امانی</span>
                <div className="w-12 h-8 rounded-lg bg-white border border-slate-200 group-hover:border-sky-400 flex items-center justify-center font-bold text-slate-800 group-hover:text-sky-700 font-mono text-xs transition-all shadow-xs">
                  {pureAmaniCount}
                </div>
              </div>

              {/* Row 2: تعداد جایگزین */}
              <div 
                onClick={() => onSetGlobalFilter('consignment', 'itemType', 'جایگزین', 'نوع کالا: جایگزین')}
                className="bg-[#f1f5f9] hover:bg-amber-50 hover:border-amber-300 border border-slate-200/50 px-3 py-2 rounded-lg flex justify-between items-center h-12 cursor-pointer transition-all active:scale-98 group"
                title="کلیک برای فیلتر کالاهای جایگزین"
              >
                <span className="text-xs font-bold text-slate-600 group-hover:text-amber-700 transition-colors">تعداد جایگزین</span>
                <div className="w-12 h-8 rounded-lg bg-white border border-slate-200 group-hover:border-amber-400 flex items-center justify-center font-bold text-slate-800 group-hover:text-amber-700 font-mono text-xs transition-all shadow-xs">
                  {replacementCount}
                </div>
              </div>

              {/* Row 3: وضعیت دریافت */}
              <div className="bg-[#f1f5f9] border border-slate-200/50 px-3 py-2 rounded-lg flex justify-between items-center h-12">
                <span className="text-xs font-bold text-slate-600">وضعیت دریافت</span>
                <div className="flex gap-2">
                  <div 
                    onClick={() => onSetGlobalFilter('consignment', 'receiveStatus', 'دارد', 'وضعیت دریافت: دریافت شده')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: دارای تاریخ دریافت"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{receiveStatusStats.yes}</span>
                  </div>
                  <div 
                    onClick={() => onSetGlobalFilter('consignment', 'receiveStatus', 'ندارد', 'وضعیت دریافت: دریافت نشده')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-rose-400 hover:bg-rose-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: بدون تاریخ دریافت"
                  >
                    <X className="w-3.5 h-3.5 text-rose-500 stroke-[3]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{receiveStatusStats.no}</span>
                  </div>
                </div>
              </div>

              {/* Row 4: قرارداد */}
              <div className="bg-[#f1f5f9] border border-slate-200/50 px-3 py-2 rounded-lg flex justify-between items-center h-12">
                <span className="text-xs font-bold text-slate-600">قرارداد</span>
                <div className="flex gap-2">
                  <div 
                    onClick={() => onSetGlobalFilter('consignment', 'contract', 'دارد', 'امانی دارای قرارداد')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: امانی دارای قرارداد"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{consignmentStats.hasContract}</span>
                  </div>
                  <div 
                    onClick={() => onSetGlobalFilter('consignment', 'contract', 'ندارد', 'امانی بدون قرارداد')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-rose-400 hover:bg-rose-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: امانی بدون قرارداد"
                  >
                    <X className="w-3.5 h-3.5 text-rose-500 stroke-[3]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{consignmentStats.noContract}</span>
                  </div>
                  <div 
                    onClick={() => onSetGlobalFilter('consignment', 'contract', 'درحال بررسی', 'امانی قرارداد درحال بررسی')}
                    className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 rounded-md py-1 px-2.5 min-w-[38px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="فیلتر: امانی با قرارداد در حال بررسی"
                  >
                    <RefreshCcw className="w-3 h-3 text-amber-500 stroke-[2.5]" />
                    <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{consignmentStats.pendingContract}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Center / Left visual layout container */}
        <div className="flex-1 flex flex-col gap-8" id="dashboard-left-center-container">
          
          {/* Top Row layout: Send & Consignment on left (stacked, equal size), Repair Company in middle (Column 1 in RTL) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch" id="dashboard-top-row">
            
            {/* Column 1 (RTL Right = Screen Middle): "ارسال" and "انبار امانی" stacked vertically (SWAPPED TO BE IN THE MIDDLE) */}
            <div className="flex flex-col gap-8" id="send-and-consignment-column">
              
              {/* CARD 3: ارسال */}
              <div className="relative bg-white border border-slate-300 rounded-xl p-5 pt-8 flex-1 flex flex-col justify-between shadow-md min-h-[190px]">
                <div className="absolute -top-7 right-6 bg-[#253b51] text-white px-5 py-1.5 rounded-t-lg font-black text-xs shadow-xs border-t border-x border-slate-600">
                  ارسال
                </div>

                {/* Shipping icons container with compact circles */}
                <div className="grid grid-cols-4 gap-3 w-full mt-2 flex-1 items-center">
                  
                  {/* پیک شرکتی */}
                  <div 
                    onClick={() => onSetGlobalFilter('repairs', 'shipMethod', 'پیک شرکت', 'نحوه ارسال: پیک شرکتی')}
                    className="flex flex-col items-center justify-center space-y-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all p-0.5 group"
                    title="فیلتر: پیک شرکتی"
                  >
                    <div className="w-18 h-18 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:bg-emerald-50 group-hover:border-emerald-300 transition-colors shadow-xs">
                      {getCustomIcon("iconShipCompany", "Truck", "w-10 h-10 text-slate-500 group-hover:text-emerald-600 transition-colors")}
                    </div>
                    <span className="text-xs font-bold text-slate-600 text-center group-hover:text-emerald-700 transition-colors">پیک شرکتی</span>
                    <span className="text-sm font-black text-slate-800 font-mono leading-none group-hover:text-emerald-700 transition-colors">{shipMethodCounts.companyCourier}</span>
                  </div>

                  {/* پیک مشتری */}
                  <div 
                    onClick={() => onSetGlobalFilter('repairs', 'shipMethod', 'پیک مشتری', 'نحوه ارسال: پیک مشتری')}
                    className="flex flex-col items-center justify-center space-y-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all p-0.5 group"
                    title="فیلتر: پیک مشتری"
                  >
                    <div className="w-18 h-18 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:bg-emerald-50 group-hover:border-emerald-300 transition-colors shadow-xs">
                      {getCustomIcon("iconShipCustomer", "User", "w-10 h-10 text-slate-500 group-hover:text-emerald-600 transition-colors")}
                    </div>
                    <span className="text-xs font-bold text-slate-600 text-center group-hover:text-emerald-700 transition-colors">پیک مشتری</span>
                    <span className="text-sm font-black text-slate-800 font-mono leading-none group-hover:text-emerald-700 transition-colors">{shipMethodCounts.customerCourier}</span>
                  </div>

                  {/* تحویل حضوری */}
                  <div 
                    onClick={() => onSetGlobalFilter('repairs', 'shipMethod', 'تحویل حضوری', 'نحوه ارسال: تحویل حضوری')}
                    className="flex flex-col items-center justify-center space-y-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all p-0.5 group"
                    title="فیلتر: تحویل حضوری"
                  >
                    <div className="w-18 h-18 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:bg-emerald-50 group-hover:border-emerald-300 transition-colors shadow-xs">
                      {getCustomIcon("iconShipHandover", "MapPin", "w-10 h-10 text-slate-500 group-hover:text-emerald-600 transition-colors")}
                    </div>
                    <span className="text-xs font-bold text-slate-600 text-center group-hover:text-emerald-700 transition-colors">تحویل حضوری</span>
                    <span className="text-sm font-black text-slate-800 font-mono leading-none group-hover:text-emerald-700 transition-colors">{shipMethodCounts.handover}</span>
                  </div>

                  {/* ارسال نشده */}
                  <div 
                    onClick={() => onSetGlobalFilter('repairs', 'shipMethod', 'ارسال نشده', 'نحوه ارسال: ارسال نشده')}
                    className="flex flex-col items-center justify-center space-y-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all p-0.5 group"
                    title="فیلتر: ارسال نشده"
                  >
                    <div className="w-18 h-18 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:bg-rose-50 group-hover:border-rose-300 transition-colors shadow-xs">
                      {getCustomIcon("iconShipNotSent", "Archive", "w-10 h-10 text-slate-500 group-hover:text-rose-600 transition-colors")}
                    </div>
                    <span className="text-xs font-bold text-slate-600 text-center group-hover:text-rose-700 transition-colors">ارسال نشده</span>
                    <span className="text-sm font-black text-slate-800 font-mono leading-none group-hover:text-rose-700 transition-colors">{shipMethodCounts.notSent}</span>
                  </div>

                </div>
              </div>

              {/* CARD 6: انبار امانی (Horizontal Bar matching user's layout) */}
              <div className="relative bg-white border border-slate-300 rounded-xl px-6 py-4 flex items-center justify-between shadow-md min-h-[80px] h-20" id="consignment-horizontal-bar">
                
                 {/* Rightmost in RTL: Select button "موجودی انبار" */}
                <button
                  onClick={() => setShowInventory(true)}
                  className="flex items-center gap-2 border-2 border-blue-400 bg-blue-50/20 text-[#253b51] hover:bg-blue-100/40 active:scale-98 transition-all px-3 py-1.5 rounded-xl font-black text-xs cursor-pointer select-none shadow-xs"
                  id="inventory-dropdown-trigger"
                  title="مشاهده جزئیات موجودی به تفکیک مدل"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  {getCustomIcon("iconInventory", "Package", "w-4 h-4 text-[#253b51]")}
                  <span>موجودی انبار</span>
                </button>

                {/* Center in RTL: Returned / Available count */}
                <div 
                  onClick={() => onSetGlobalFilter('consignment', 'receiveStatus', 'دارد', 'موجود در انبار (دارای تاریخ دریافت)')}
                  className="flex items-center gap-3 cursor-pointer hover:scale-105 active:scale-95 transition-all p-0.5 group"
                  title="فیلتر: امانی‌های موجود در انبار (دارای تاریخ دریافت)"
                >
                  <div className="flex flex-col items-end">
                    <span className="text-2xl font-black text-slate-800 font-mono group-hover:text-emerald-700 transition-colors">{availableCount}</span>
                    <span className="text-[10px] font-bold text-slate-500">موجود در انبار</span>
                  </div>
                  {getCustomIcon("iconInventoryReceived", "PackageCheck", "w-8 h-8 text-emerald-600 group-hover:text-emerald-700 transition-colors")}
                </div>

                {/* Leftmost in RTL: Active / Sent count */}
                <div 
                  onClick={() => onSetGlobalFilter('consignment', 'receiveStatus', 'ندارد', 'دست مشتری (بدون تاریخ دریافت)')}
                  className="flex items-center gap-3 cursor-pointer hover:scale-105 active:scale-95 transition-all p-0.5 group"
                  title="فیلتر: امانی‌های دست مشتری (بدون تاریخ دریافت)"
                >
                  <div className="flex flex-col items-end">
                    <span className="text-2xl font-black text-slate-800 font-mono group-hover:text-amber-700 transition-colors">{sentCount}</span>
                    <span className="text-[10px] font-bold text-slate-500">دست مشتری</span>
                  </div>
                  {getCustomIcon("iconInventorySent", "Send", "w-8 h-8 text-amber-600 group-hover:text-amber-700 transition-colors")}
                </div>

              </div>

            </div>

            {/* Column 2 (RTL Left = Screen Left): CARD 4: شرکت تعمیر کننده (SWAPPED TO LEFT COLUMN) */}
            <div className="relative bg-white border border-slate-300 rounded-xl p-5 pt-8 shadow-md h-full flex flex-col justify-between min-h-[190px]">
              <div>
                <div className="absolute -top-7 right-6 bg-[#253b51] text-white px-5 py-1.5 rounded-t-lg font-black text-xs shadow-xs border-t border-x border-slate-600">
                  شرکت تعمیر کننده
                </div>

                <div className="space-y-3 mt-3">
                  {Object.entries(companyCounts).map(([company, count]) => {
                    const percent = companyTotal > 0 ? Math.round((count / companyTotal) * 100) : 0;
                    
                    return (
                      <div 
                        key={company} 
                        onClick={() => onSetGlobalFilter('repairs', 'repairCompany', company, `شرکت تعمیرکننده: ${company}`)}
                        className="flex items-center justify-between gap-3 text-xs cursor-pointer py-1.5 px-1 rounded-md hover:bg-slate-50 transition-all active:scale-99 group hover:border-slate-300" 
                        id={`company-row-${company}`}
                        title={`فیلتر دستگاه‌های تعمیرشده توسط ${company}`}
                      >
                        {/* Name of company (Rightmost in RTL) */}
                        <span className="font-bold text-slate-700 w-12 text-right group-hover:text-emerald-700 transition-colors">{company}</span>
                        
                        {/* Count (Middle) */}
                        <span className="text-xs text-slate-500 font-mono w-10 text-center group-hover:text-emerald-700 transition-colors">{count}</span>

                        {/* Progress Bar */}
                        <div className="flex-1 bg-slate-100 rounded-md h-3.5 overflow-hidden border border-slate-300 group-hover:border-emerald-300 transition-all">
                          <div 
                            className={`h-full transition-all duration-1000 ${
                              company === "مکسا" 
                                ? "bg-[#253b51] group-hover:bg-[#1a2b3d]" 
                                : "bg-[#708b9f] group-hover:bg-emerald-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>

                        {/* Percentage (Leftmost in RTL) */}
                        <span className="font-black text-slate-800 font-mono w-10 text-xs text-left group-hover:text-emerald-700 transition-colors">{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* CARD 5 (Wide): وضعیت کالا - Placed back inside the column next to repairs column */}
          <div className="relative bg-white border border-slate-300 rounded-xl p-5 pt-8 shadow-md flex flex-col justify-between min-h-[330px]" id="dashboard-status-wide-card">
            <div className="absolute -top-7 right-6 bg-[#253b51] text-white px-5 py-1.5 rounded-t-lg font-black text-xs shadow-xs border-t border-x border-slate-600">
              وضعیت کالا
            </div>

            {/* Stepper Container: Right-pointing Arrow Cards in Navy Blue on Clean Light Background (Ordered Left-to-Right) */}
            <div className="w-full overflow-x-auto mt-2 pb-2" id="dashboard-stepper-scroller">
              <div className="w-full min-w-[850px] flex flex-row items-stretch h-[235px] rounded-2xl border border-slate-200/90 p-2.5 bg-[#f0f4fa]/80 shadow-xs gap-2" id="dashboard-stepper-container" dir="ltr">
                
                {[
                  {
                    step: 1,
                    title: "دریافت دستگاه",
                    count: stepCounts.step1,
                    iconKey: "iconStep1",
                    fallbackIcon: "Inbox",
                    cardBg: "bg-[#1c2d3f]",
                    clipStyle: "polygon(0% 0%, calc(100% - 22px) 0%, 100% 50%, calc(100% - 22px) 100%, 0% 100%)",
                    badgeBg: "bg-blue-500/25 text-blue-200 border-blue-400/40",
                  },
                  {
                    step: 2,
                    title: "بررسی اولیه",
                    count: stepCounts.step2,
                    iconKey: "iconStep2",
                    fallbackIcon: "Search",
                    cardBg: "bg-[#21354a]",
                    clipStyle: "polygon(0% 0%, calc(100% - 22px) 0%, 100% 50%, calc(100% - 22px) 100%, 0% 100%, 22px 50%)",
                    badgeBg: "bg-sky-500/25 text-sky-200 border-sky-400/40",
                  },
                  {
                    step: 3,
                    title: "تائید هزینه",
                    count: stepCounts.step3,
                    iconKey: "iconStep3",
                    fallbackIcon: "DollarSign",
                    cardBg: "bg-[#263e56]",
                    clipStyle: "polygon(0% 0%, calc(100% - 22px) 0%, 100% 50%, calc(100% - 22px) 100%, 0% 100%, 22px 50%)",
                    badgeBg: "bg-amber-500/25 text-amber-200 border-amber-400/40",
                  },
                  {
                    step: 4,
                    title: "تایید نهایی و پرداخت",
                    count: stepCounts.step4,
                    iconKey: "iconStep4",
                    fallbackIcon: "CreditCard",
                    cardBg: "bg-[#2b4762]",
                    clipStyle: "polygon(0% 0%, calc(100% - 22px) 0%, 100% 50%, calc(100% - 22px) 100%, 0% 100%, 22px 50%)",
                    badgeBg: "bg-indigo-500/25 text-indigo-200 border-indigo-400/40",
                  },
                  {
                    step: 5,
                    title: "تحویل و ارسال",
                    count: stepCounts.step5,
                    iconKey: "iconStep5",
                    fallbackIcon: "Truck",
                    cardBg: "bg-[#30506e]",
                    clipStyle: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 22px 50%)",
                    badgeBg: "bg-emerald-500/25 text-emerald-200 border-emerald-400/40",
                  },
                ].map((s) => (
                  <div
                    key={s.step}
                    onClick={() => onSetGlobalFilter('repairs', 'currentStep', s.step, `وضعیت: ${s.title}`)}
                    style={{ clipPath: s.clipStyle }}
                    className={`flex-1 ${s.cardBg} hover:brightness-125 active:scale-98 transition-all duration-200 cursor-pointer flex flex-col justify-between items-center text-center p-4 pt-3.5 pb-3 text-white relative group select-none`}
                    title={`فیلتر: ${s.title}`}
                  >
                    {/* Step Header Badge */}
                    <div className="w-full flex items-center justify-start shrink-0 px-3">
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-md border ${s.badgeBg} font-mono`}>
                        #{s.step}
                      </span>
                    </div>

                    {/* Icon Container */}
                    <div className="w-13 h-13 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner group-hover:scale-110 group-hover:bg-white/25 transition-all my-1.5 shrink-0">
                      {getCustomIcon(s.iconKey, s.fallbackIcon, "w-7 h-7 text-white")}
                    </div>

                    {/* Step Title */}
                    <span className="text-xs md:text-sm font-black text-white group-hover:text-orange-500 transition-colors leading-snug px-3 shrink-0">
                      {s.title}
                    </span>

                    {/* Rectangular Count Box */}
                    <div className="w-[85%] bg-[#0a121a]/80 border border-white/15 rounded-xl py-1.5 px-3 flex items-center justify-between gap-2 shadow-inner group-hover:border-orange-500 transition-colors mt-2 shrink-0">
                      <span className="text-[10px] font-bold text-slate-300">تعداد:</span>
                      <span className="text-lg font-black text-white font-mono leading-none group-hover:text-orange-500">
                        {s.count}
                      </span>
                    </div>
                  </div>
                ))}

              </div>
            </div>
          </div>

        </div>

      </div>

      {/* نمودارهای دایره‌ای و کارت کارکرد مالی */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-[98%] mx-auto" id="dashboard-pie-charts-row">
        <DonutChart
          title="تفکیک وضعیت دستگاه‌ها"
          data={[
            { label: "دریافت دستگاه", value: stepCounts.step1, color: "#3b82f6", onClick: () => onSetGlobalFilter('repairs', 'currentStep', 1, 'وضعیت: دریافت دستگاه') },
            { label: "بررسی اولیه", value: stepCounts.step2, color: "#8b5cf6", onClick: () => onSetGlobalFilter('repairs', 'currentStep', 2, 'وضعیت: بررسی اولیه') },
            { label: "تائید هزینه", value: stepCounts.step3, color: "#f59e0b", onClick: () => onSetGlobalFilter('repairs', 'currentStep', 3, 'وضعیت: اعلام هزینه') },
            { label: "تایید نهایی و پرداخت", value: stepCounts.step4, color: "#10b981", onClick: () => onSetGlobalFilter('repairs', 'currentStep', 4, 'وضعیت: تایید نهایی و پرداخت') },
            { label: "تحویل و ارسال", value: stepCounts.step5, color: "#ef4444", onClick: () => onSetGlobalFilter('repairs', 'currentStep', 5, 'وضعیت: تحویل و ارسال') },
          ]}
        />
        <DonutChart
          title="وضعیت امانی‌ها (در دست مشتری یا انبار مکسا)"
          data={[
            { label: "در دست مشتری", value: sentCount, color: "#d97706", onClick: () => onSetGlobalFilter('consignment', 'receiveStatus', 'ندارد', 'دست مشتری (بدون تاریخ دریافت)') },
            { label: "انبار مکسا", value: availableCount, color: "#059669", onClick: () => onSetGlobalFilter('consignment', 'receiveStatus', 'دارد', 'موجود در انبار (دارای تاریخ دریافت)') },
          ]}
        />
        <DonutChart
          title="آمار پرداختی‌ها"
          data={[
            { label: "تسویه شده", value: paymentStats.paid, color: "#059669", onClick: () => onSetGlobalFilter('repairs', 'paymentStatus', 'شده است', 'پرداخت: شده است') },
            { label: "تسویه نشده", value: paymentStats.unpaid, color: "#dc2626", onClick: () => onSetGlobalFilter('repairs', 'paymentStatus', 'نشده است', 'پرداخت: نشده است') },
            { label: "درحال بررسی", value: paymentStats.pending, color: "#d97706", onClick: () => onSetGlobalFilter('repairs', 'paymentStatus', 'درحال بررسی', 'پرداخت: درحال بررسی') },
          ]}
        />

        {/* کارت جمع هزینه‌های تسویه‌شده */}
        <div 
          onClick={() => onSetGlobalFilter('repairs', 'paymentStatus', 'شده است', 'پرداخت: تسویه شده')}
          className="bg-white border border-slate-300 rounded-xl p-5 shadow-md flex flex-col justify-between min-h-[220px] h-[240px] relative hover:border-slate-400 transition-all cursor-pointer group"
          title="مشاهده لیست دستگاه‌های تسویه‌شده"
          dir="rtl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 w-full">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-600" />
              کارکرد مالی تسویه‌شده
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              تسویه‌شده
            </span>
          </div>

          {/* Central Total Box */}
          <div className="flex-1 flex flex-col items-center justify-center my-1 bg-gradient-to-br from-slate-900 to-[#1a2a3a] text-white p-4 rounded-xl shadow-inner group-hover:scale-[1.01] transition-transform w-full">
            <span className="text-[10px] text-slate-300 font-bold mb-1">جمع کل درآمد:</span>
            <div className="flex items-center justify-center gap-2.5" dir="ltr">
              <span className="text-lg md:text-xl font-black text-emerald-400 font-mono tracking-tight text-center">
                {showFinancialAmount ? formatToman(totalPaidAndSentCost) : "****"}
              </span>
              <button
                type="button"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  setShowFinancialAmount(true);
                }}
                onPointerUp={(event) => {
                  event.stopPropagation();
                  setShowFinancialAmount(false);
                }}
                onPointerCancel={() => setShowFinancialAmount(false)}
                onPointerLeave={() => setShowFinancialAmount(false)}
                onKeyDown={(event) => {
                  if (event.key === " " || event.key === "Enter") {
                    event.preventDefault();
                    setShowFinancialAmount(true);
                  }
                }}
                onKeyUp={(event) => {
                  if (event.key === " " || event.key === "Enter") {
                    event.preventDefault();
                    setShowFinancialAmount(false);
                  }
                }}
                onBlur={() => setShowFinancialAmount(false)}
                onClick={(event) => event.stopPropagation()}
                onContextMenu={(event) => event.preventDefault()}
                className="rounded-lg p-1.5 text-emerald-300 transition-colors hover:bg-white/10 hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
                title="برای نمایش مبلغ، دکمه را نگه دارید"
                aria-label="نمایش موقت مبلغ کل"
              >
                {showFinancialAmount ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <span className="text-[11px] font-bold text-slate-300 mt-2 bg-white/10 px-3 py-1 rounded-full">
              تعداد: <span className="font-mono text-emerald-300 font-black">{paidAndSentCount.toLocaleString('fa-IR')}</span> دستگاه
            </span>
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold pt-1 border-t border-slate-100 w-full">
            <span>وضعیت: تسویه‌شده و ارسال‌شده</span>
            <span className="text-emerald-600 group-hover:underline">مشاهده لیست ←</span>
          </div>
        </div>
      </div>

      {/* Dynamic Inventory Modal */}
      {showInventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fade-in" dir="rtl" id="inventory-modal-overlay">
          <div className="bg-[#ebf2fc] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[85vh]" id="inventory-modal-card">
            
            {/* Header */}
            <div className="relative bg-[#0e2238] py-5 pr-5 pl-16 text-white flex items-center justify-between border-b border-slate-800" id="inventory-modal-header">
              <div className="flex items-center gap-2">
                <span className="text-base font-black">وضعیت موجودی انبار امانی به تفکیک مدل</span>
              </div>
              <button 
                onClick={() => setShowInventory(false)}
                className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-rose-600/90 text-white transition-colors hover:bg-rose-700 cursor-pointer"
                aria-label="بستن"
                title="بستن"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content list */}
            <div className="p-6 overflow-y-auto space-y-4" id="inventory-modal-body">
              {Object.keys(modelInventory).length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-bold text-sm">هیچ مدل امانی در سیستم ثبت نشده است.</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(modelInventory).map(([model, counts]) => {
                    const isAvailable = counts.available > 0;
                    return (
                      <div 
                        key={model}
                        className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm transition-all hover:border-slate-300"
                      >
                        <div className="flex flex-col text-right">
                          <span className="text-sm font-black text-slate-800">{model}</span>
                          <div className="flex gap-4 mt-2 text-[10px] font-bold text-slate-500">
                            <span>موجود در انبار: <strong className="text-emerald-600 font-mono text-xs">{counts.available}</strong></span>
                            <span>ارسالی به مشتری: <strong className="text-amber-600 font-mono text-xs">{counts.sent}</strong></span>
                          </div>
                        </div>

                        <div>
                          {isAvailable ? (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-full border border-emerald-200">
                              موجود
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-rose-50 text-rose-700 text-[10px] font-extrabold rounded-full border border-rose-200">
                              ناموجود
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end" id="inventory-modal-footer">
              <button 
                onClick={() => setShowInventory(false)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                بستن صفحه
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// DonutChart component implemented with pure SVG, distinct colors and dynamic hover tooltips
interface DonutChartProps {
  title: string;
  data: {
    label: string;
    value: number;
    color: string;
    onClick?: () => void;
  }[];
}

function DonutChart({ title, data }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  const [tooltip, setTooltip] = React.useState<{
    label: string;
    value: number;
    percent: number;
    color: string;
    x: number;
    y: number;
  } | null>(null);

  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const cardRef = React.useRef<HTMLDivElement>(null);

  // Calculate percentages
  let accumPercent = 0;
  const slices = data.map(item => {
    const percent = total > 0 ? (item.value / total) * 100 : 0;
    const offset = accumPercent;
    accumPercent += percent;
    return {
      ...item,
      percent,
      offset: 100 - offset
    };
  });

  const handleMouseMove = (e: React.MouseEvent, slice: any) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + 12;
    const y = e.clientY - rect.top - 36;
    setTooltip({
      label: slice.label,
      value: slice.value,
      percent: Math.round(slice.percent),
      color: slice.color,
      x,
      y
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div 
      ref={cardRef}
      className="relative bg-white border border-slate-300 rounded-xl p-5 shadow-md flex flex-col items-center justify-between min-h-[220px] h-[240px]" 
      dir="rtl"
    >
      <h4 className="text-xs font-black text-slate-700 mb-3 w-full text-right border-b border-slate-100 pb-1.5">{title}</h4>
      
      {total === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 space-y-2 py-4">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r="15.91549430918954"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="5"
            />
          </svg>
          <span className="text-xs text-slate-400 font-bold">داده‌ای ثبت نشده است</span>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full gap-4 flex-1">
          {/* SVG Donut */}
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
              <circle
                cx="20"
                cy="20"
                r="15.91549430918954"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="5.5"
              />
              {slices.map((slice, index) => {
                if (slice.percent === 0) return null;
                const dashOffset = slice.offset;
                const isHovered = hoveredIndex === index;
                return (
                  <circle
                    key={index}
                    cx="20"
                    cy="20"
                    r="15.91549430918954"
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isHovered ? "7.5" : "5.5"}
                    strokeDasharray={`${slice.percent} ${100 - slice.percent}`}
                    strokeDashoffset={dashOffset}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseMove={(e) => handleMouseMove(e, slice)}
                    onMouseLeave={() => {
                      setHoveredIndex(null);
                      handleMouseLeave();
                    }}
                    onClick={slice.onClick}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-slate-800 font-mono leading-none">{total}</span>
              <span className="text-[10px] text-slate-400 font-bold mt-0.5">کل</span>
            </div>
          </div>

          {/* Legends */}
          <div className="flex-1 flex flex-col justify-center space-y-1.5 text-right">
            {slices.map((slice, index) => (
              <div 
                key={index} 
                onClick={slice.onClick}
                className={`flex items-center justify-between text-xs font-bold py-1 px-1.5 rounded transition-all ${slice.onClick ? 'cursor-pointer hover:bg-slate-100' : ''}`}
                title={slice.onClick ? "برای اعمال فیلتر کلیک کنید" : undefined}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }}></span>
                  <span className="text-slate-600 truncate max-w-[140px]">{slice.label}</span>
                </div>
                <span className="text-slate-800 font-mono mr-1.5 shrink-0">{slice.value} <span className="text-slate-400 text-[10px]">({Math.round(slice.percent)}%)</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Tooltip next to cursor */}
      {tooltip && (
        <div 
          className="absolute z-50 bg-slate-900/95 text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none border border-slate-700/50 flex flex-col items-start gap-0.5"
          style={{ 
            left: `${tooltip.x}px`, 
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-8px'
          }}
          dir="rtl"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tooltip.color }}></span>
            <span>{tooltip.label}</span>
          </div>
          <div className="text-[10px] text-slate-300">
            تعداد: <span className="font-bold text-white font-mono">{tooltip.value}</span> ({tooltip.percent}٪)
          </div>
        </div>
      )}

    </div>
  );
}
