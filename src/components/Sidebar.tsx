/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { LayoutDashboard, Settings, LogOut, Database, Briefcase, Sun, Moon, Bell, Wrench, Link2, Save, RefreshCw } from "lucide-react";
import { DbStatus, SystemSettings } from "../types";
import MaxaLogo from "./MaxaLogo";
import RoleIcon from "./RoleIcon";

interface SidebarProps {
  activeTab: 'dashboard' | 'repairs' | 'consignment' | 'reminders';
  setActiveTab: (tab: 'dashboard' | 'repairs' | 'consignment' | 'reminders') => void;
  onOpenSettings: () => void;
  onRefreshData: () => Promise<void>;
  onLogout: () => void;
  dbStatus: DbStatus;
  userName: string;
  isAdmin: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  settings?: SystemSettings | null;
  hasActiveReminders?: boolean;
  caseAction?: SidebarCaseAction | null;
}

export interface SidebarCaseAction {
  label: string;
  icon: "repair" | "link" | "save";
  onClick: () => void;
  disabled?: boolean;
  checkbox?: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
  };
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onRefreshData,
  onLogout,
  dbStatus,
  userName,
  isAdmin,
  theme,
  onToggleTheme,
  settings,
  hasActiveReminders,
  caseAction,
}: SidebarProps) {
  const [isRefreshingData, setIsRefreshingData] = useState(false);

  const handleRefreshData = async () => {
    if (isRefreshingData) return;
    setIsRefreshingData(true);
    try {
      await onRefreshData();
    } finally {
      setIsRefreshingData(false);
    }
  };

  return (
    <aside
      className="sticky top-0 z-[60] w-[272px] bg-[#1a2a3a] text-slate-100 flex flex-col justify-between h-screen shrink-0 border-l border-slate-700/30 select-none shadow-2xl"
      id="app-sidebar"
    >
      {/* Top section: Logo, Theme Switcher & Nav */}
      <div className="flex flex-col flex-1" id="sidebar-top-section">
        {/* LOGO & Theme area */}
        <div className="relative px-3 pt-5 pb-4 flex items-center justify-center border-b border-slate-700/30 w-full" id="sidebar-logo-container">
          <div className="mx-auto flex h-[110px] w-[190px] shrink-0 items-center justify-center overflow-hidden bg-transparent">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <MaxaLogo size="lg" showSubtext={false} isDarkTheme={true} className="!items-center" />
            )}
          </div>

          {/* Theme toggle anchored independently from the centered logo */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="absolute left-3 top-3 flex h-8 w-8 shrink-0 items-center justify-center bg-slate-900/60 hover:bg-slate-800 border border-slate-600/70 rounded-lg text-slate-300 transition-all duration-300 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 active:scale-95"
            title={theme === "light" ? "حالت شب" : "حالت روز"}
            aria-label={theme === "light" ? "فعال‌سازی حالت شب" : "فعال‌سازی حالت روز"}
            id="theme-toggle-btn"
          >
            {theme === "light" ? (
              <Moon className="w-3.5 h-3.5 text-sky-300 fill-sky-300/10" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-300 fill-amber-300/10" />
            )}
          </button>
        </div>

        {/* Nav list */}
        <nav className="flex-1 px-4 py-8 space-y-5 flex flex-col items-center" id="sidebar-navigation">
          {/* Dashboard Item */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full px-4 py-3.5 rounded-xl flex items-center gap-3 transition-all duration-200 group relative cursor-pointer text-right ${
              activeTab === "dashboard"
                ? "bg-[#253b51] text-white font-bold border-r-4 border-r-[#e05a2b]"
                : "text-slate-300 hover:bg-[#253b51]/40 hover:text-white"
            }`}
            id="nav-dashboard"
          >
            <LayoutDashboard className={`w-5 h-5 shrink-0 transition-colors ${activeTab === 'dashboard' ? 'text-[#e05a2b]' : 'text-slate-400 group-hover:text-[#e05a2b]'}`} />
            <span className="text-[13px] font-bold">داشبورد</span>
          </button>

          {/* Repairs (تعمیرات) */}
          <button
            onClick={() => setActiveTab('repairs')}
            className={`w-full px-4 py-3.5 rounded-xl flex items-center gap-3 transition-all duration-200 group relative cursor-pointer text-right ${
              activeTab === "repairs"
                ? "bg-[#253b51] text-white font-bold border-r-4 border-r-[#e05a2b]"
                : "text-slate-300 hover:bg-[#253b51]/40 hover:text-white"
            }`}
            id="nav-repairs"
          >
            <Settings className={`w-5 h-5 shrink-0 transition-colors ${activeTab === 'repairs' ? 'text-[#e05a2b]' : 'text-slate-400 group-hover:text-[#e05a2b]'}`} />
            <span className="text-[13px] font-bold">تعمیرات</span>
          </button>

          {/* Consignment (امانی) */}
          <button
            onClick={() => setActiveTab('consignment')}
            className={`w-full px-4 py-3.5 rounded-xl flex items-center gap-3 transition-all duration-200 group relative cursor-pointer text-right ${
              activeTab === "consignment"
                ? "bg-[#253b51] text-white font-bold border-r-4 border-r-[#e05a2b]"
                : "text-slate-300 hover:bg-[#253b51]/40 hover:text-white"
            }`}
            id="nav-consignment"
          >
            <Briefcase className={`w-5 h-5 shrink-0 transition-colors ${activeTab === 'consignment' ? 'text-[#e05a2b]' : 'text-slate-400 group-hover:text-[#e05a2b]'}`} />
            <span className="text-[13px] font-bold">امانی</span>
          </button>

          {/* Reminders (یادآورها) */}
          <button
            onClick={() => setActiveTab('reminders')}
            className={`w-full px-4 py-3.5 rounded-xl flex items-center justify-between transition-all duration-200 group relative cursor-pointer text-right ${
              activeTab === "reminders"
                ? "bg-[#253b51] text-white font-bold border-r-4 border-r-[#e05a2b]"
                : "text-slate-300 hover:bg-[#253b51]/40 hover:text-white"
            }`}
            id="nav-reminders"
          >
            <div className="flex items-center gap-3">
              <Bell className={`w-5 h-5 shrink-0 transition-colors ${activeTab === 'reminders' ? 'text-[#e05a2b]' : 'text-slate-400 group-hover:text-[#e05a2b]'} ${hasActiveReminders ? 'animate-bounce' : ''}`} />
              <span className="text-[13px] font-bold">یادآورها</span>
            </div>
            {hasActiveReminders && (
              <span className="flex h-2 w-2 relative" id="active-reminder-badge-pulse">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Bottom section: Settings, Database Status, Logout */}
      <div className="p-3 border-t border-slate-700/30 flex flex-col items-center gap-4" id="sidebar-bottom-section">
        {caseAction && (
          <div className="w-full flex flex-col gap-2" id="sidebar-case-action-container">
            <button
              type="button"
              onClick={caseAction.onClick}
              disabled={caseAction.disabled}
              className="w-full py-2.5 px-3 rounded-xl bg-[#e05a2b] hover:bg-[#c9491e] disabled:opacity-60 text-white flex items-center justify-center gap-2 border border-orange-400/30 transition-all cursor-pointer disabled:cursor-wait text-xs font-black shadow-md active:scale-[0.98]"
              id={caseAction.icon === "save" ? "save-and-receive-next-btn" : "sidebar-repair-case-action"}
            >
              {caseAction.icon === "link" ? <Link2 className="w-4 h-4 shrink-0" /> : caseAction.icon === "save" ? <Save className="w-4 h-4 shrink-0" /> : <Wrench className="w-4 h-4 shrink-0" />}
              <span>{caseAction.label}</span>
            </button>
            {caseAction.checkbox && (
              <label className="flex items-start gap-2 px-1 text-[10px] leading-5 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={caseAction.checkbox.checked}
                  onChange={(event) => caseAction.checkbox?.onChange(event.target.checked)}
                  disabled={caseAction.checkbox.disabled}
                  className="mt-1 shrink-0 accent-[#e05a2b]"
                  id="send-receipt-after-next"
                />
                <span>{caseAction.checkbox.label}</span>
              </label>
            )}
          </div>
        )}

        {/* Settings button and Database status icon row */}
        <div className="flex items-center gap-2 w-full" id="sidebar-settings-db-row">
          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="flex-1 py-2 px-3 rounded-xl bg-[#1a2a3a]/60 flex items-center justify-center gap-2 hover:bg-[#253b51] border border-slate-700 transition-all cursor-pointer text-xs font-bold text-slate-300"
            title="تنظیمات نرم‌افزار"
            id="btn-settings"
          >
            <Settings className="w-4 h-4 text-[#e05a2b]" />
            <span>تنظیمات</span>
          </button>

          {/* Database Status Icon */}
          <button
            type="button"
            onClick={handleRefreshData}
            disabled={isRefreshingData}
            className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-[#1a2a3a]/60 transition-all hover:border-slate-500 hover:bg-[#253b51] disabled:cursor-wait"
            title={`${isRefreshingData ? "در حال به‌روزرسانی اطلاعات..." : "برای به‌روزرسانی اطلاعات کلیک کنید"} | وضعیت دیتابیس: ${dbStatus.connected ? "متصل" : "قطع"}`}
            aria-label="به‌روزرسانی اطلاعات و بررسی اتصال دیتابیس"
            id="btn-refresh-data"
          >
            <Database className={`w-4 h-4 transition-colors ${dbStatus.connected ? "text-emerald-400" : "text-rose-400"}`} />
            <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${dbStatus.connected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></span>
            <span className="absolute -bottom-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full border border-[#1a2a3a] bg-[#253b51] text-slate-200">
              <RefreshCw className={`h-2.5 w-2.5 ${isRefreshingData ? "animate-spin text-[#e05a2b]" : "group-hover:rotate-180 transition-transform duration-300"}`} />
            </span>
          </button>
        </div>

        {/* Signed-in user and logout */}
        <div className="flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-700/70 bg-slate-900/35 p-2" id="sidebar-user-logout-row">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 px-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/10 text-sky-200" title={isAdmin ? "admin" : "user"}>
              <RoleIcon role={isAdmin ? "admin" : "user"} className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0 flex-1 text-right">
              <span className="block text-[9px] font-semibold text-slate-500" dir="ltr">{isAdmin ? "admin" : "user"}</span>
              <span className="block truncate text-[11px] font-black text-slate-100" title={userName}>{userName}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-rose-700 cursor-pointer"
            title="خروج از حساب"
            aria-label="خروج از حساب"
            id="btn-logout"
          >
            <LogOut className="h-4 w-4" />
            <span>خروج</span>
          </button>
        </div>

      </div>

      <div className="p-4 border-t border-slate-700/30 text-center text-slate-400 text-[10px] font-bold whitespace-nowrap">
        سیستم مدیریت هوشمند خدمات فنی مکسا
      </div>
    </aside>
  );
}
