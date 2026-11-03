import React, { useState, useEffect } from "react";
import { Printer, X, Loader2 } from "lucide-react";
import { Repair, SystemSettings, PrintLayoutConfig, PrintFieldConfig } from "../types";

const DEFAULT_FIELDS_RECEIPT = [
  { key: "id", label: "شماره پرونده", x: 10, y: 10, fontSize: 13, visible: true },
  { key: "customerName", label: "نام شرکت / مشتری", x: 10, y: 15, fontSize: 13, visible: true },
  { key: "receiveDate", label: "تاریخ دریافت", x: 10, y: 20, fontSize: 13, visible: true },
  { key: "deviceModel", label: "مدل دستگاه", x: 10, y: 25, fontSize: 13, visible: true },
  { key: "serialNumber", label: "شماره سریال", x: 10, y: 30, fontSize: 13, visible: true },
  { key: "accessories", label: "متعلقات", x: 10, y: 35, fontSize: 13, visible: true },
  { key: "problem", label: "مشکل دستگاه", x: 10, y: 40, fontSize: 13, visible: true },
  { key: "contactPerson", label: "نام رابط / شخص رابط", x: 10, y: 45, fontSize: 13, visible: true },
  { key: "contactNumber", label: "شماره تماس / شماره رابط", x: 10, y: 50, fontSize: 13, visible: true }
];

const DEFAULT_FIELDS_INSPECTION = [
  { key: "id", label: "شماره پرونده", x: 10, y: 10, fontSize: 13, visible: true },
  { key: "customerName", label: "نام شرکت / مشتری", x: 10, y: 15, fontSize: 13, visible: true },
  { key: "deviceModel", label: "مدل دستگاه", x: 10, y: 20, fontSize: 13, visible: true },
  { key: "serialNumber", label: "شماره سریال", x: 10, y: 25, fontSize: 13, visible: true },
  { key: "problem", label: "مشکل بررسی اولیه", x: 10, y: 30, fontSize: 13, visible: true },
  { key: "repairCompany", label: "شرکت تعمیر کننده", x: 10, y: 35, fontSize: 13, visible: true },
  { key: "initialSendDate", label: "تاریخ ارسال اولیه", x: 10, y: 40, fontSize: 13, visible: true }
];

const DEFAULT_FIELDS_SHIPPING = [
  { key: "id", label: "شماره پرونده", x: 10, y: 10, fontSize: 13, visible: true },
  { key: "customerName", label: "نام شرکت / مشتری", x: 10, y: 15, fontSize: 13, visible: true },
  { key: "deviceModel", label: "مدل دستگاه", x: 10, y: 20, fontSize: 13, visible: true },
  { key: "serialNumber", label: "شماره سریال", x: 10, y: 25, fontSize: 13, visible: true },
  { key: "shipDate", label: "تاریخ ارسال نهایی", x: 10, y: 30, fontSize: 13, visible: true },
  { key: "shipMethod", label: "نحوه ارسال", x: 10, y: 35, fontSize: 13, visible: true },
  { key: "trackingCode", label: "تلفن/کد رهگیری", x: 10, y: 40, fontSize: 13, visible: true },
  { key: "receiverAddress", label: "آدرس گیرنده", x: 10, y: 45, fontSize: 13, visible: true }
];

export default function PrintPage() {
  const [repair, setRepair] = useState<Repair | null>(null);
  const [printType, setPrintType] = useState<'receipt' | 'inspection' | 'shipping'>('receipt');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Parse URL query params
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    const typeParam = params.get("type") as 'receipt' | 'inspection' | 'shipping' | null;
    const dataParam = params.get("data");

    if (typeParam) {
      setPrintType(typeParam);
    } else {
      try {
        const storedType = localStorage.getItem("print_type") as 'receipt' | 'inspection' | 'shipping';
        if (storedType) {
          setPrintType(storedType);
        }
      } catch (err) {
        console.error("Error reading print_type:", err);
      }
    }

    const loadDataAndSettings = async () => {
      try {
        // Fetch layout settings
        const res = await fetch("/api/settings");
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setSettings(data);
          }
        }

        // Try to load repair from dataParam first
        if (dataParam) {
          try {
            const parsed = JSON.parse(decodeURIComponent(dataParam));
            if (parsed && typeof parsed === "object") {
              setRepair(parsed);
              return; // Successfully parsed from URL!
            }
          } catch (e) {
            console.error("Error parsing URL dataParam:", e);
          }
        }

        // Try to fetch from API if we have an ID
        if (idParam) {
          const repairRes = await fetch(`/api/repairs/${idParam}`);
          if (repairRes.ok) {
            const contentType = repairRes.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const repairData = await repairRes.json();
              setRepair(repairData);
              return;
            }
          }
        }

        // Fallback to localStorage if URL parameters were not successful
        const storedRepair = localStorage.getItem("print_repair_data");
        if (storedRepair) {
          setRepair(JSON.parse(storedRepair));
        }
      } catch (err) {
        console.error("Error fetching print settings/data:", err);
        // Direct localStorage fallback on error
        try {
          const storedRepair = localStorage.getItem("print_repair_data");
          if (storedRepair) {
            setRepair(JSON.parse(storedRepair));
          }
        } catch (e) {
          console.error("Second-level localStorage fallback failed:", e);
        }
      } finally {
        setLoading(false);
      }
    };

    loadDataAndSettings();
  }, []);

  // Automatic print trigger once loaded
  useEffect(() => {
    if (!loading && repair && settings) {
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (err) {
          console.error("Auto print failed:", err);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, repair, settings]);

  const getActivePrintLayout = (): PrintLayoutConfig => {
    if (!settings) {
      const defaultFields = 
        printType === 'receipt' ? DEFAULT_FIELDS_RECEIPT : 
        printType === 'inspection' ? DEFAULT_FIELDS_INSPECTION : 
        DEFAULT_FIELDS_SHIPPING;
      return { backgroundImageUrl: "", fields: defaultFields, orientation: 'landscape' };
    }
    
    let layout;
    if (printType === 'receipt') {
      layout = settings.printLayoutReceipt || { backgroundImageUrl: "", fields: DEFAULT_FIELDS_RECEIPT };
    } else if (printType === 'inspection') {
      layout = settings.printLayoutInspection || { backgroundImageUrl: "", fields: DEFAULT_FIELDS_INSPECTION };
    } else {
      layout = settings.printLayoutShipping || { backgroundImageUrl: "", fields: DEFAULT_FIELDS_SHIPPING };
    }

    return {
      backgroundImageUrl: layout.backgroundImageUrl || "",
      fields: (layout.fields || []).map((field) => ({ ...field, width: field.width ?? 35 })),
      orientation: layout.orientation || 'landscape'
    };
  };

  const getRepairFieldValue = (key: string) => {
    if (!repair) return "";
    
    // Exact matching values like in getRepairFieldValue from DetailModal
    switch (key) {
      case "id": return repair.id ? `REC-${String(repair.id).padStart(5, '0')}` : "جدید";
      case "customerName": return repair.customerName || "—";
      case "receiveDate": return repair.receiveDate || "—";
      case "deviceModel": return repair.deviceModel || "—";
      case "serialNumber": return repair.serialNumber || "—";
      case "accessories": return repair.accessories || "—";
      case "problem": return repair.problem || "—";
      case "contactPerson": return repair.contactPerson || "—";
      case "contactNumber": return repair.contactNumber || "—";
      case "repairCompany": return repair.repairCompany || "—";
      case "initialSendDate": return repair.initialSendDate || "—";
      case "shipDate": return repair.shipDate || "—";
      case "shipMethod": return repair.shipMethod || "—";
      case "trackingCode": return repair.trackingCode || "—";
      case "receiverAddress": return repair.receiverAddress || "—";
      default: return (repair as any)[key] || "—";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-400 gap-3 font-sans" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-sm font-bold">در حال بارگذاری قالب چاپی...</span>
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-400 gap-3 font-sans text-center p-6" dir="rtl">
        <X className="w-10 h-10 text-rose-500" />
        <h2 className="text-base font-black text-white">داده پرونده جهت چاپ پیدا نشد</h2>
        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">لطفاً این پنجره را بسته و مجدداً از پرونده بر روی دکمه پرینت کلیک نمایید.</p>
        <button
          onClick={() => window.close()}
          className="mt-4 px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
        >
          بستن این صفحه
        </button>
      </div>
    );
  }

  const activeLayout = getActivePrintLayout();
  const isPortrait = activeLayout.orientation === 'portrait';

  return (
    <div className="min-h-screen bg-slate-900/95 flex flex-col items-center justify-start p-4 md:p-6 overflow-y-auto font-sans text-right print:p-0 print:bg-white" dir="rtl">
      
      {/* Control bar - Hidden when printing */}
      <div className="w-full max-w-[297mm] bg-slate-800 text-white rounded-2xl p-4 mb-6 flex items-center justify-between shadow-xl border border-slate-700/50 print:hidden select-none animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
            <Printer className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black">
              {printType === 'receipt' && "نسخه چاپ فیش رسید دریافت دستگاه"}
              {printType === 'inspection' && "نسخه چاپ برگه بررسی اولیه دستگاه"}
              {printType === 'shipping' && "نسخه چاپ حواله ارسال نهایی دستگاه"}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">کاغذ به صورت خودکار قالب‌بندی شده و آماده چاپ نهایی است.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              try {
                window.print();
              } catch (err) {
                console.error("Print call failed:", err);
              }
            }}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-900/30 active:scale-95 animate-pulse"
          >
            <Printer className="w-4 h-4" />
            <span>ارسال به چاپگر</span>
          </button>
          
          <button
            type="button"
            onClick={() => window.close()}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
            <span>بستن صفحه</span>
          </button>
        </div>
      </div>

      {/* Styled A4 Sheet for Screen Preview - Hidden when printing */}
      <div 
        className="bg-white text-slate-900 shadow-2xl border border-slate-300 relative select-all overflow-hidden p-0 mb-8 transition-all duration-300 print:hidden" 
        id="screen-preview-sheet" 
        style={{ 
          width: isPortrait ? '210mm' : '297mm',
          height: isPortrait ? '297mm' : '210mm',
          aspectRatio: isPortrait ? '210/297' : '297/210'
        }}
      >
        {/* Background template overlay */}
        {activeLayout.backgroundImageUrl ? (
          <img
            src={activeLayout.backgroundImageUrl}
            alt="Template Background"
            className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-8 select-none bg-slate-50/50">
            <Printer className="w-12 h-12 text-slate-300 mb-2" />
            <p className="text-slate-400 text-xs font-black">تصویر قالب پیش‌زمینه آپلود نشده است.</p>
          </div>
        )}

        {/* Configured fields layout rendering */}
        {activeLayout.fields && activeLayout.fields.map((field) => {
          if (!field || !field.key || !field.visible) return null;
          const val = getRepairFieldValue(field.key);
          return (
            <div
              key={field.key}
              style={{
                position: "absolute",
                right: `${field.x}%`,
                top: `${field.y}%`,
                fontSize: `${field.fontSize}px`,
                fontWeight: "bold",
                color: "black",
                whiteSpace: "pre-wrap",
                direction: "rtl",
                textAlign: "right",
                overflowWrap: "anywhere",
                width: `${Math.min(field.width ?? 35, Math.max(5, 100 - field.x))}%`,
                lineHeight: "1.4",
                boxSizing: "border-box"
              }}
              title={field.label}
            >
              {val}
            </div>
          );
        })}
      </div>

      {/* Pure Print Container (A4) - Only Visible when printing */}
      <div 
        id="print-actual-document" 
        className="hidden print:block relative bg-white" 
        dir="rtl"
        style={{
          width: isPortrait ? '210mm' : '297mm',
          height: isPortrait ? '297mm' : '210mm'
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            html, body {
              width: ${isPortrait ? '210mm' : '297mm'} !important;
              height: ${isPortrait ? '297mm' : '210mm'} !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }
            body * {
              visibility: hidden !important;
            }
            #print-actual-document, #print-actual-document * {
              visibility: visible !important;
            }
            #print-actual-document {
              display: block !important;
              visibility: visible !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: ${isPortrait ? '210mm' : '297mm'} !important;
              height: ${isPortrait ? '297mm' : '210mm'} !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              background: white !important;
              page-break-after: avoid !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              size: A4 ${isPortrait ? 'portrait' : 'landscape'};
              margin: 0 !important;
            }
          }
        ` }} />

        {/* Background template image if enabled */}
        {activeLayout.backgroundImageUrl && (
          <img
            src={activeLayout.backgroundImageUrl}
            alt="Template Background"
            className="absolute inset-0 w-full h-full object-fill"
            referrerPolicy="no-referrer"
          />
        )}

        {/* Overlaid printable fields in absolute percentages */}
        {activeLayout.fields && activeLayout.fields.map((field) => {
          if (!field || !field.key || !field.visible) return null;
          const val = getRepairFieldValue(field.key);
          return (
            <div
              key={field.key}
              style={{
                position: "absolute",
                right: `${field.x}%`,
                top: `${field.y}%`,
                fontSize: `${field.fontSize}px`,
                fontWeight: "bold",
                color: "black",
                whiteSpace: "pre-wrap",
                direction: "rtl",
                textAlign: "right",
                overflowWrap: "anywhere",
                width: `${Math.min(field.width ?? 35, Math.max(5, 100 - field.x))}%`,
                lineHeight: "1.4",
                boxSizing: "border-box"
              }}
            >
              {val}
            </div>
          );
        })}
      </div>

    </div>
  );
}
