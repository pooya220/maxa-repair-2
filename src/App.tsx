/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw, Layers, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Repair, DbStatus, User, SystemSettings, Reminder } from "./types";
import { finalizeJalaliDate, getTodayJalali, normalizeJalaliDate } from "./utils/dateUtils";
import LoginView from "./components/LoginView";
import Sidebar, { type SidebarCaseAction } from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import RepairsView from "./components/RepairsView";
import ConsignmentView from "./components/ConsignmentView";
import RemindersView from "./components/RemindersView";
import SettingsModal from "./components/SettingsModal";
import DetailModal, { type DetailModalHandle } from "./components/DetailModal";
import PrintPage from "./components/PrintPage";
import { prepareSmsPayload } from "./utils/smsUtils";

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function App() {
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return localStorage.getItem("theme") === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  // Authentication State
  const [user, setUser] = useState<User | null>(null);

  // Layout Tab Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'repairs' | 'consignment' | 'reminders'>('repairs');

  // Shared Global Dashboard Filter
  const [globalFilter, setGlobalFilter] = useState<{
    tab: 'repairs' | 'consignment';
    type: string;
    value: any;
    label: string;
  } | null>(null);

  const handleSetGlobalFilter = (tab: 'repairs' | 'consignment', type: string, value: any, label: string) => {
    setGlobalFilter({ tab, type, value, label });
    setActiveTab(tab);
  };

  const handleClearGlobalFilter = () => {
    setGlobalFilter(null);
  };

  // Backend Synchronized States
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [dbStatus, setDbStatus] = useState<DbStatus>({
    connected: true,
    type: "SQLite/JSON",
    latencyMs: 5
  });
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Modal Triggers
  const [showSettings, setShowSettings] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<Partial<Repair> | null>(null);
  const [targetIsConsignment, setTargetIsConsignment] = useState(false);
  const [pendingSidebarTab, setPendingSidebarTab] = useState<typeof activeTab | null>(null);
  const [isHandlingSidebarNavigation, setIsHandlingSidebarNavigation] = useState(false);
  const [sidebarNavigationSaveFailed, setSidebarNavigationSaveFailed] = useState(false);
  const detailModalRef = useRef<DetailModalHandle | null>(null);
  const [sidebarCaseAction, setSidebarCaseAction] = useState<SidebarCaseAction | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSidebarTabSelection = (tab: typeof activeTab) => {
    if (selectedRepair) {
      setPendingSidebarTab(tab);
      setSidebarNavigationSaveFailed(false);
      return;
    }
    setActiveTab(tab);
  };

  const handleDismissSidebarNavigationPrompt = () => {
    if (isHandlingSidebarNavigation) return;
    // Dismiss only the prompt: keep the current repair/consignment open and stay on its tab.
    setPendingSidebarTab(null);
    setSidebarNavigationSaveFailed(false);
  };

  // Toast Notification Manager
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Show Toast
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Sync state on boot
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  // Sync Database Connection Status regularly (every 10 seconds)
  useEffect(() => {
    fetchDbStatus();
    const interval = setInterval(fetchDbStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchRepairs(), fetchDbStatus(), fetchSettings(), fetchReminders()]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReminders = async () => {
    try {
      const res = await fetch("/api/reminders");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setReminders(data);
        }
      }
    } catch (err) {
      console.error("Error fetching reminders:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setSettings(data);
        }
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  const fetchRepairs = async () => {
    try {
      const res = await fetch("/api/repairs");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setRepairs(data);
        }
      } else if (res.status === 503) {
        setDbStatus((prev) => ({ ...prev, connected: false }));
      }
    } catch (err) {
      console.error("Error fetching repairs:", err);
      setDbStatus((prev) => ({ ...prev, connected: false }));
    }
  };

  const fetchDbStatus = async () => {
    try {
      const res = await fetch("/api/db-status");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setDbStatus(data);
        }
      }
    } catch (err) {
      setDbStatus({ connected: false, type: "Offline", latencyMs: 0 });
    }
  };

  // Trigger Edit Mode
  const handleEditRepair = (record: Repair) => {
    setSelectedRepair(record);
    setTargetIsConsignment(false);
  };

  const handleEditConsignment = (record: Repair) => {
    setSelectedRepair(record);
    setTargetIsConsignment(true);
  };

  // Trigger Add Mode
  const handleAddRecord = (isCons: boolean) => {
    const todayFa = getTodayJalali();
    setSelectedRepair({
      isConsignment: isCons,
      customerName: "",
      deviceModel: "",
      serialNumber: "",
      problem: "",
      accessories: "",
      contactPerson: "",
      contactNumber: "",
      warranty: "درحال بررسی",
      contract: "درحال بررسی",
      receiveDate: isCons ? "" : todayFa,
      hasReplacement: "ندارد",
      repairCompany: "مکسا",
      initialSendDate: "",
      initialReceiveDate: "",
      initialOtherInfo: "",
      replacementName: "",
      replacementSerial: "",
      replacementAccessories: "",
      replacementSendDate: isCons ? todayFa : "",
      replacementReceiveDate: "",
      invoiceNumber: "",
      quotedCost: "",
      costApproved: "درحال بررسی",
      paymentStatus: "درحال بررسی",
      shipDate: "",
      shipMethod: "ارسال نشده",
      trackingCode: "",
      receiverAddress: "",
      currentStep: 1,
    });
    setTargetIsConsignment(isCons);
  };

  // Persist a record and return the server-normalized version.
  const persistRepairRecord = async (record: Repair): Promise<Repair | null> => {
    try {
      const url = record.id ? `/api/repairs/${record.id}` : "/api/repairs";
      const method = record.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });

      if (res.ok) {
        return await res.json() as Repair;
      } else {
        const errData = await res.json();
        showNotification(errData.error || "خطایی در ذخیره‌سازی داده رخ داده است.", "error");
      }
    } catch (err) {
      showNotification("ارتباط با سرور جهت ذخیره اطلاعات برقرار نشد.", "error");
    }
    return null;
  };

  const sendReceiptSmsForRecord = async (record: Repair) => {
    const payload = prepareSmsPayload("receipt", record, settings || undefined);
    if (!payload.phone) {
      showNotification("پرونده ذخیره شد اما شماره تماس رابط برای پیامک دریافت ثبت نشده است.", "error");
      return false;
    }

    try {
      const smsResponse = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: payload.phone,
          smsType: payload.smsType,
          bodyId: payload.bodyId,
          variables: payload.variables,
          message: payload.previewMessage,
          repairId: record.id,
        }),
      });
      const smsResult = await smsResponse.json();
      if (smsResponse.ok && smsResult.success) {
        showNotification(smsResult.message || "پیامک دریافت دستگاه ارسال شد.", "success");
        return true;
      }
      showNotification(smsResult.error || "پرونده ذخیره شد اما ارسال پیامک دریافت ناموفق بود.", "error");
    } catch {
      showNotification("پرونده ذخیره شد اما ارتباط برای ارسال پیامک برقرار نشد.", "error");
    }
    return false;
  };

  // Create or Update Record
  const handleSaveRecord = async (record: Repair, options?: { sendReceiptSms?: boolean }) => {
    const savedRecord = await persistRepairRecord(record);
    if (!savedRecord) return false;

    showNotification(
      record.id
        ? "اطلاعات دستگاه با موفقیت بروزرسانی شد."
        : "پذیرش دستگاه جدید با موفقیت ثبت گردید.",
      "success"
    );
    if (options?.sendReceiptSms) {
      await sendReceiptSmsForRecord(savedRecord);
    }
    setSelectedRepair(null);
    await fetchRepairs();
    return true;
  };

  const handleSaveAndNavigateFromCase = async () => {
    if (!pendingSidebarTab || isHandlingSidebarNavigation) return;
    setIsHandlingSidebarNavigation(true);
    setSidebarNavigationSaveFailed(false);
    try {
      const saved = await detailModalRef.current?.saveCurrentRecord();
      if (!saved) {
        setSidebarNavigationSaveFailed(true);
        return;
      }
      setActiveTab(pendingSidebarTab);
      setPendingSidebarTab(null);
      setSidebarCaseAction(null);
    } finally {
      setIsHandlingSidebarNavigation(false);
    }
  };

  const handleCloseAndNavigateFromCase = () => {
    if (!pendingSidebarTab || isHandlingSidebarNavigation) return;
    setSelectedRepair(null);
    setSidebarCaseAction(null);
    setActiveTab(pendingSidebarTab);
    setPendingSidebarTab(null);
    setSidebarNavigationSaveFailed(false);
  };

  const handleSaveAndReceiveNext = async (
    currentRecord: Repair
  ): Promise<Repair | null> => {
    const savedCurrent = await persistRepairRecord(currentRecord);
    if (!savedCurrent) return null;

    await fetchRepairs();
    showNotification("پرونده فعلی ذخیره شد؛ فرم دستگاه بعدی با مشخصات مشترک آماده است.", "success");
    return savedCurrent;
  };

  // Check if we are on the print page
  const urlParams = new URLSearchParams(window.location.search);
  const isPrintPage = urlParams.get("print_page") === "true";

  if (isPrintPage) {
    return <PrintPage />;
  }

  // Render Login view if unauthenticated
  if (!user) {
    return <LoginView onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  // Check for active (due/overdue and pending) reminders
  const hasActiveReminders = reminders.some((r) => {
    if (r.completed) return false;
    if (!r.dueDate) return false;

    const todayStr = getTodayJalali();
    const dueNorm = normalizeJalaliDate(r.dueDate);

    if (dueNorm < todayStr) return true;
    if (dueNorm === todayStr) {
      if (!r.dueTime) return true;
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const [dueH, dueM] = r.dueTime.split(":").map(Number);
      if (!isNaN(dueH) && !isNaN(dueM)) {
        return currentHours > dueH || (currentHours === dueH && currentMinutes >= dueM);
      }
      return true;
    }
    return false;
  });

  return (
    <div className="flex h-screen w-screen bg-[#f0f4fa] overflow-hidden font-sans relative" id="app-workspace">
      
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSidebarTabSelection}
        onOpenSettings={() => setShowSettings(true)}
        onRefreshData={async () => {
          await Promise.all([fetchRepairs(), fetchDbStatus(), fetchSettings(), fetchReminders()]);
        }}
        onLogout={() => setUser(null)}
        dbStatus={dbStatus}
        userName={user.role === 'admin' ? user.username : user.name}
        isAdmin={user.role === 'admin'}
        theme={theme}
        onToggleTheme={toggleTheme}
        settings={settings}
        hasActiveReminders={hasActiveReminders}
        caseAction={sidebarCaseAction}
      />

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative" id="app-viewport">
        
        {/* Connection disruption overlay if database toggled off */}
        {!dbStatus.connected && (
          <div className="absolute inset-0 bg-[#f0f4fa]/95 backdrop-blur-md z-40 flex flex-col items-center justify-center gap-4 text-center p-6 animate-fade-in" id="db-offline-overlay">
            <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-500 rounded-2xl flex items-center justify-center animate-bounce shadow-xl">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-slate-800">برقراری ارتباط با پایگاه‌داده مرکزی قطع شده است</h2>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              سیستم هم اکنون قادر به خواندن یا نوشتن اطلاعات تعمیراتی نیست. جهت رفع این مشکل به منوی تنظیمات مراجعه کرده و مجدداً دیتابیس را متصل نمایید.
            </p>
            <button
              onClick={async () => {
                await fetch("/api/db-status/toggle", { method: "POST" });
                await fetchDbStatus();
                await fetchRepairs();
              }}
              className="mt-2 px-5 py-2.5 bg-[#1a2a3a] hover:bg-[#253b51] text-white text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all active:scale-95"
            >
              اتصال سریع پایگاه‌داده
            </button>
          </div>
        )}

        {/* Dynamic Inner Tab Rendering with slide effect */}
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f4fa] text-slate-500 gap-3" id="viewport-loading">
              <RefreshCw className="w-8 h-8 animate-spin text-[#1a2a3a]" />
              <span className="text-xs">در حال بارگذاری اطلاعات تعمیری...</span>
            </div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col overflow-hidden"
              id="dynamic-tab-wrapper"
            >
              {activeTab === "dashboard" && (
                <DashboardView 
                  repairs={repairs} 
                  onSetGlobalFilter={handleSetGlobalFilter} 
                  settings={settings}
                />
              )}
              {activeTab === "repairs" && (
                <RepairsView
                  repairs={repairs}
                  onAddRepair={() => handleAddRecord(false)}
                  onEditRepair={handleEditRepair}
                  globalFilter={globalFilter}
                  onClearGlobalFilter={handleClearGlobalFilter}
                  onShowNotification={showNotification}
                  isAdmin={user.role === 'admin'}
                />
              )}
              {activeTab === "consignment" && (
                <ConsignmentView
                  repairs={repairs}
                  onAddConsignment={() => handleAddRecord(true)}
                  onEditConsignment={handleEditConsignment}
                  globalFilter={globalFilter}
                  onClearGlobalFilter={handleClearGlobalFilter}
                  onShowNotification={showNotification}
                  isAdmin={user.role === 'admin'}
                />
              )}
              {activeTab === "reminders" && (
                <RemindersView
                  repairs={repairs}
                  onEditRepair={handleEditRepair}
                  onShowNotification={showNotification}
                  reminders={reminders}
                  onRefreshReminders={fetchReminders}
                  isAdmin={user.role === 'admin'}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MODAL 1: Detail / Add / Edit Form */}
      {selectedRepair && (
        <DetailModal
          ref={detailModalRef}
          repair={selectedRepair}
          isConsignment={targetIsConsignment}
          repairs={repairs}
          onClose={() => setSelectedRepair(null)}
          onSave={handleSaveRecord}
          onSaveAndCreateNext={handleSaveAndReceiveNext}
          onShowNotification={showNotification}
          onRefreshRepairs={fetchRepairs}
          isAdmin={user.role === 'admin'}
          onSidebarActionChange={setSidebarCaseAction}
          onOpenRepair={(relatedRepair) => {
            setSelectedRepair(null);
            setTimeout(() => {
              setSelectedRepair(relatedRepair);
              setTargetIsConsignment(!!relatedRepair.isConsignment);
            }, 100);
          }}
        />
      )}

      {pendingSidebarTab && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="leave-case-title" id="leave-case-confirmation">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={handleDismissSidebarNavigationPrompt}
              disabled={isHandlingSidebarNavigation}
              className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600/90 text-white transition-colors hover:bg-rose-700 disabled:opacity-40"
              aria-label="بستن پیام و ادامه پرونده"
              title="بستن پیام و ادامه پرونده"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <h2 className="pr-8 text-base font-black text-slate-800" id="leave-case-title">خروج از پرونده</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              برای رفتن به بخش «{pendingSidebarTab === "dashboard" ? "داشبورد" : pendingSidebarTab === "repairs" ? "تعمیرات" : pendingSidebarTab === "consignment" ? "امانی" : "یادآورها"}»، پرونده را ذخیره و ببندیم یا بدون ذخیره ببندیم؟
            </p>
            {sidebarNavigationSaveFailed && (
              <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" role="alert">
                ذخیره انجام نشد. اطلاعات پرونده را بررسی کنید یا بدون ذخیره ببندید.
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseAndNavigateFromCase}
                disabled={isHandlingSidebarNavigation}
                className="rounded-xl bg-[#f0642f] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#dd5224] disabled:opacity-50"
              >
                بستن بدون ذخیره
              </button>
              <button
                type="button"
                onClick={handleSaveAndNavigateFromCase}
                disabled={isHandlingSidebarNavigation || user.role !== "admin"}
                className="rounded-xl bg-[#1a2a3a] px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-[#253b51] disabled:cursor-wait disabled:opacity-50"
              >
                {isHandlingSidebarNavigation ? "در حال ذخیره..." : "ذخیره و رفتن"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Settings Panel */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          dbStatus={dbStatus}
          onSettingsSaved={fetchSettings}
          currentUser={user}
          refreshDbStatus={async () => {
            await fetchDbStatus();
            await fetchRepairs();
          }}
        />
      )}

      {/* Floating Animated Toasts Container */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3 max-w-sm w-full" id="toasts-portal">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              className={`p-4 rounded-xl shadow-2xl flex items-start gap-3 border ${
                toast.type === "success"
                  ? "bg-emerald-950 border-emerald-500/30 text-emerald-100"
                  : "bg-rose-950 border-rose-500/30 text-rose-100"
              }`}
              id={`toast-${toast.id}`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="w-5.5 h-5.5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5.5 h-5.5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex flex-col gap-1 text-right flex-1">
                <span className="text-xs font-black tracking-tight">
                  {toast.type === "success" ? "عملیات موفقیت‌آمیز" : "بروز خطا یا اختلال"}
                </span>
                <p className="text-[11px] leading-relaxed opacity-90">{toast.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
