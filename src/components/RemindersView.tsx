/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Calendar, CheckSquare, Square, Trash2, 
  Link, Check, AlertCircle, Eye, RefreshCw, X, Bell 
} from "lucide-react";
import { Repair, Reminder } from "../types";
import { formatJalaliDateInput, finalizeJalaliDate, getTodayJalali, getTomorrowJalali, normalizeJalaliDate } from "../utils/dateUtils";

interface RemindersViewProps {
  repairs: Repair[];
  onEditRepair: (repair: Repair) => void;
  onShowNotification: (message: string, type?: 'success' | 'error') => void;
  reminders: Reminder[];
  onRefreshReminders: () => void;
  isAdmin?: boolean;
}

export default function RemindersView({
  repairs,
  onEditRepair,
  onShowNotification,
  reminders,
  onRefreshReminders,
  isAdmin = true,
}: RemindersViewProps) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Partial<Reminder> | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  
  // New/Edit form fields
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formDueTime, setFormDueTime] = useState("");
  const [formRepairId, setFormRepairId] = useState<number | undefined>(undefined);
  const [repairSearchQuery, setRepairSearchQuery] = useState("");
  const [isRepairPickerOpen, setIsRepairPickerOpen] = useState(false);

  // Fetch reminders on mount
  useEffect(() => {
    onRefreshReminders();
  }, []);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      await onRefreshReminders();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (reminder: Reminder) => {
    try {
      const updated = { ...reminder, completed: !reminder.completed };
      const res = await fetch(`/api/reminders/${reminder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        onRefreshReminders();
        onShowNotification(
          reminder.completed 
            ? "یادآور به وضعیت در انتظار تغییر یافت." 
            : "یادآور با موفقیت به عنوان انجام‌شده علامت‌گذاری شد.",
          "success"
        );
      } else {
        onShowNotification("خطا در به‌روزرسانی یادآور", "error");
      }
    } catch (err) {
      onShowNotification("بروز خطا در ارتباط با سرور", "error");
    }
  };

  const handleDeleteReminder = (id: number) => {
    setDeleteTargetId(id);
  };

  const confirmDeleteReminder = async () => {
    if (deleteTargetId === null) return;
    
    try {
      const res = await fetch(`/api/reminders/${deleteTargetId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onRefreshReminders();
        onShowNotification("یادآور با موفقیت حذف شد.", "success");
      } else {
        onShowNotification("خطا در حذف یادآور", "error");
      }
    } catch (err) {
      onShowNotification("بروز خطا در ارتباط با سرور", "error");
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleOpenAddModal = () => {
    setEditingReminder(null);
    setFormTitle("");
    setFormDescription("");
    // Default due date to today in Persian format
    setFormDueDate(getTodayJalali());
    setFormDueTime("");
    setFormRepairId(undefined);
    setRepairSearchQuery("");
    setIsRepairPickerOpen(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setFormTitle(reminder.title);
    setFormDescription(reminder.description);
    setFormDueDate(finalizeJalaliDate(reminder.dueDate || ""));
    setFormDueTime(reminder.dueTime || "");
    setFormRepairId(reminder.repairId);
    setRepairSearchQuery("");
    setIsRepairPickerOpen(false);
    setIsModalOpen(true);
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      onShowNotification("لطفاً عنوان یادآور را وارد کنید.", "error");
      return;
    }

    const payload = {
      title: formTitle,
      description: formDescription,
      dueDate: finalizeJalaliDate(formDueDate),
      dueTime: formDueTime,
      repairId: formRepairId || undefined,
      completed: editingReminder ? editingReminder.completed : false,
    };

    try {
      const url = editingReminder ? `/api/reminders/${editingReminder.id}` : "/api/reminders";
      const method = editingReminder ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onShowNotification(
          editingReminder 
            ? "یادآور با موفقیت به‌روزرسانی شد." 
            : "یادآور جدید با موفقیت ثبت شد.",
          "success"
        );
        setIsModalOpen(false);
        fetchReminders();
      } else {
        onShowNotification("خطا در ذخیره‌سازی یادآور", "error");
      }
    } catch (err) {
      onShowNotification("بروز خطا در ارتباط با سرور", "error");
    }
  };

  const handleViewRepair = (repairId: number) => {
    const repair = repairs.find((r) => r.id === repairId);
    if (repair) {
      onEditRepair(repair);
    } else {
      onShowNotification("پرونده تعمیراتی مرتبط یافت نشد.", "error");
    }
  };

  // Filter & Search Reminders
  const filteredReminders = reminders.filter((r) => {
    // 1. Status Filter
    if (statusFilter === "pending" && r.completed) return false;
    if (statusFilter === "completed" && !r.completed) return false;

    // 2. Search Query
    if (searchQuery.trim() !== "") {
      const term = searchQuery.toLowerCase().trim();
      const matchTitle = r.title.toLowerCase().includes(term);
      const matchDesc = r.description.toLowerCase().includes(term);
      const matchDate = r.dueDate.toLowerCase().includes(term);
      
      let matchRepair = false;
      if (r.repairId) {
        const repair = repairs.find((rep) => rep.id === r.repairId);
        if (repair) {
          matchRepair = 
            repair.customerName.toLowerCase().includes(term) ||
            repair.deviceModel.toLowerCase().includes(term) ||
            repair.serialNumber.toLowerCase().includes(term);
        }
      }

      return matchTitle || matchDesc || matchDate || matchRepair;
    }

    return true;
  });

  // Sort: completed reminders at the bottom, others sorted by due date
  const sortedReminders = [...filteredReminders].sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    // Otherwise sort by id descending (newest first)
    return b.id - a.id;
  });

  const selectedRepair = repairs.find((repair) => repair.id === formRepairId);
  const filteredRepairs = repairs.filter((repair) => {
    const term = repairSearchQuery.trim().toLocaleLowerCase();
    if (!term) return true;
    return [
      String(repair.id),
      repair.customerName,
      repair.deviceModel,
      repair.serialNumber,
      repair.contactPerson,
      repair.contactNumber,
    ].some((value) => (value || "").toLocaleLowerCase().includes(term));
  });
  const selectedRepairLabel = selectedRepair
    ? `#${selectedRepair.id} - ${selectedRepair.customerName} (${selectedRepair.deviceModel})`
    : "";

  return (
    <div className="flex-1 overflow-hidden p-6 flex flex-col space-y-4 bg-[#ebf2fc]" id="reminders-view" dir="rtl">
      
      {/* Header and Add Action */}
      <div className="flex items-center justify-between shrink-0 gap-4" id="reminders-header-row">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1a2a3a] text-[#e05a2b] rounded-xl flex items-center justify-center shadow-lg">
            <Bell className="w-5 h-5 animate-swing" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800">مدیریت یادآورها و پیگیری‌ها</h1>
            <p className="text-[11px] text-slate-500">لیست کارها، هماهنگی‌ها و پیگیری‌های زمان‌دار سیستم</p>
          </div>
        </div>

        <button
          onClick={() => {
            if (!isAdmin) {
              onShowNotification("شما مجوز انجام این عملیات را ندارید.", "error");
              return;
            }
            handleOpenAddModal();
          }}
          className="h-10 px-4 bg-[#e05a2b] hover:bg-[#c94b20] text-white rounded-lg text-xs font-bold transition-all hover:shadow-lg hover:shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
          id="btn-add-reminder"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن یادآور جدید</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0" id="reminders-filter-row">
        
        {/* Search input */}
        <div className="relative w-full sm:w-80" id="reminders-search-container">
          <input
            type="text"
            placeholder="جستجو در عنوان، توضیحات یا نام مشتری..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pr-10 pl-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#1a2a3a] focus:bg-white transition-all text-right"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
        </div>

        {/* Tab Filters */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto" id="reminders-status-filters">
          <button
            onClick={() => setStatusFilter("all")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            همه ({reminders.length})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "pending"
                ? "bg-white text-rose-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            در انتظار ({reminders.filter(r => !r.completed).length})
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "completed"
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            انجام شده ({reminders.filter(r => r.completed).length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0" id="reminders-content-container">
        {loading ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#1a2a3a]" />
            <span className="text-xs">در حال بارگذاری یادآورها...</span>
          </div>
        ) : sortedReminders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
              <Bell className="w-8 h-8" />
            </div>
            <p className="text-slate-600 text-xs font-medium">هیچ یادآوری با فیلترهای مشخص‌شده یافت نشد.</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[11px] text-[#e05a2b] font-bold underline"
              >
                پاک کردن جستجو
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="reminders-grid">
            {sortedReminders.map((reminder) => {
              // Find related repair/consignment
              const relatedRepair = reminder.repairId 
                ? repairs.find((r) => r.id === reminder.repairId)
                : null;

              const todayStr = getTodayJalali();
              const dueNorm = normalizeJalaliDate(reminder.dueDate);

              const isActive = !reminder.completed && (() => {
                if (!reminder.dueDate) return false;
                if (dueNorm < todayStr) return true;
                if (dueNorm === todayStr) {
                  if (!reminder.dueTime) return true;
                  const now = new Date();
                  const currentHours = now.getHours();
                  const currentMinutes = now.getMinutes();
                  const [dueH, dueM] = reminder.dueTime.split(":").map(Number);
                  if (!isNaN(dueH) && !isNaN(dueM)) {
                    return currentHours > dueH || (currentHours === dueH && currentMinutes >= dueM);
                  }
                  return true;
                }
                return false;
              })();

              return (
                <div
                  key={reminder.id}
                  className={`bg-white rounded-2xl border transition-all duration-300 p-5 flex flex-col justify-between gap-4 group ${
                    reminder.completed
                      ? "opacity-60 border-slate-100 bg-slate-50/50"
                      : "border-slate-200/60 hover:border-slate-300 shadow-xs hover:shadow-md"
                  }`}
                  id={`reminder-card-${reminder.id}`}
                >
                  {/* Top: Checkbox, Title, Actions */}
                  <div className="flex items-start gap-3 justify-between">
                    <button
                      onClick={() => {
                        if (!isAdmin) {
                          onShowNotification("شما مجوز انجام این عملیات را ندارید.", "error");
                          return;
                        }
                        handleToggleComplete(reminder);
                      }}
                      className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5 transition-colors cursor-pointer"
                      title={reminder.completed ? "تغییر به انجام‌نشده" : "علامت‌گذاری به عنوان انجام‌شده"}
                    >
                      {reminder.completed ? (
                        <CheckSquare className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 group-hover:border-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0 pr-1 text-right">
                      <h3 className={`text-xs font-black text-slate-800 leading-snug break-words ${
                        reminder.completed ? "line-through text-slate-400" : ""
                      }`}>
                        {reminder.title}
                      </h3>
                      {reminder.description && (
                        <p className={`text-[11px] text-slate-500 mt-1.5 leading-relaxed break-words ${
                          reminder.completed ? "line-through text-slate-400" : ""
                        }`}>
                          {reminder.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {isActive && (
                    <div className="flex items-center gap-1.5 self-start px-2.5 py-1 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-[10px] font-black select-none animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      <span>زمان پیگیری فرا رسیده (فعال)</span>
                    </div>
                  )}

                  {/* Middle: Linked Repair File Badge */}
                  {relatedRepair && (
                    <div className="bg-[#f0f4fa] border border-slate-100 rounded-xl p-3 flex flex-col gap-1.5 text-right select-none">
                      <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[10px]">
                        <Link className="w-3.5 h-3.5 text-[#e05a2b]" />
                        <span>پرونده تعمیری مرتبط:</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[11px] text-slate-800 font-bold truncate flex-1">
                          {relatedRepair.customerName} ({relatedRepair.deviceModel})
                        </span>
                        <button
                          onClick={() => handleViewRepair(relatedRepair.id)}
                          className="h-6 px-2 bg-[#1a2a3a] hover:bg-[#253b51] text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                          title="مشاهده پرونده کامل"
                        >
                          <Eye className="w-3 h-3" />
                          <span>مشاهده</span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 mt-0.5 border-t border-slate-200/50 pt-1.5">
                        <span>شناسه سیستم: #{relatedRepair.id}</span>
                        <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-sm font-bold">
                          {relatedRepair.isConsignment ? "امانی" : `مرحله ${relatedRepair.currentStep}`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bottom: Dates & Controls */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className={`font-bold ${
                        reminder.completed 
                          ? "text-slate-400" 
                          : "text-rose-600"
                      }`}>
                        سررسید: {reminder.dueDate || "بدون تاریخ"} {reminder.dueTime ? `ساعت ${reminder.dueTime}` : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          if (!isAdmin) {
                            onShowNotification("شما مجوز انجام این عملیات را ندارید.", "error");
                            return;
                          }
                          handleOpenEditModal(reminder);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-[10px] font-bold"
                        title="ویرایش یادآور"
                      >
                        ویرایش
                      </button>
                      <span className="text-slate-200">|</span>
                      <button
                        onClick={() => {
                          if (!isAdmin) {
                            onShowNotification("شما مجوز انجام این عملیات را ندارید.", "error");
                            return;
                          }
                          handleDeleteReminder(reminder.id);
                        }}
                        className="p-1 text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="حذف یادآور"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FORM MODAL (Add / Edit Reminder) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col text-right animate-fade-in">
            {/* Modal Header */}
            <div className="relative bg-[#1a2a3a] text-slate-100 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-rose-600/90 text-white transition-colors hover:bg-rose-700 cursor-pointer"
                aria-label="بستن"
                title="بستن"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <h2 className="text-sm font-black text-white">
                {editingReminder ? "ویرایش یادآور" : "افزودن یادآور جدید"}
              </h2>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveReminder} className="p-6 space-y-4 flex flex-col text-slate-800">
              
              {/* Reminder Title */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">عنوان یادآور *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: پیگیری فاکتور شرکت الوند"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1a2a3a] focus:bg-white text-right"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">توضیحات تکمیلی</label>
                <textarea
                  placeholder="شرح جزئیات پیگیری، تلفن تماس یا موارد موردنیاز دیگر..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1a2a3a] focus:bg-white text-right resize-none"
                />
              </div>

              {/* Grid: Due Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700">تاریخ سررسید (جلالی)</label>
                  <input
                    type="text"
                    placeholder="140X/XX/XX"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(formatJalaliDateInput(e.target.value))}
                    onBlur={() => setFormDueDate(finalizeJalaliDate(formDueDate))}
                    maxLength={10}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1a2a3a] focus:bg-white text-center font-mono"
                    dir="ltr"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700">ساعت سررسید (ساعت:دقیقه)</label>
                  <input
                    type="text"
                    placeholder="مثال: 14:30"
                    value={formDueTime}
                    onChange={(e) => setFormDueTime(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1a2a3a] focus:bg-white text-center font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormDueDate(getTodayJalali())}
                  className="flex-1 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                >
                  تاریخ امروز
                </button>
                <button
                  type="button"
                  onClick={() => setFormDueDate(getTomorrowJalali())}
                  className="flex-1 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                >
                  تاریخ فردا
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const hours = String(now.getHours()).padStart(2, "0");
                    const minutes = String(now.getMinutes()).padStart(2, "0");
                    setFormDueTime(`${hours}:${minutes}`);
                  }}
                  className="flex-1 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                >
                  ساعت کنونی
                </button>
              </div>

              {/* Associated Repair File selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">ارتباط با پرونده تعمیری (اختیاری)</label>
                <div
                  className="relative"
                  onBlur={(event) => {
                    const nextTarget = event.relatedTarget as Node | null;
                    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
                      setIsRepairPickerOpen(false);
                      if (!formRepairId) setRepairSearchQuery("");
                    }
                  }}
                >
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    role="combobox"
                    aria-expanded={isRepairPickerOpen}
                    aria-controls="reminder-repair-options"
                    aria-autocomplete="list"
                    value={isRepairPickerOpen ? repairSearchQuery : selectedRepairLabel}
                    onFocus={() => {
                      setRepairSearchQuery("");
                      setIsRepairPickerOpen(true);
                    }}
                    onChange={(event) => {
                      setFormRepairId(undefined);
                      setRepairSearchQuery(event.target.value);
                      setIsRepairPickerOpen(true);
                    }}
                    placeholder="جستجو با شماره پرونده، مشتری یا دستگاه..."
                    className="w-full h-10 pr-9 pl-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1a2a3a] focus:bg-white text-right"
                  />

                  {isRepairPickerOpen && (
                    <div
                      id="reminder-repair-options"
                      role="listbox"
                      className="absolute right-0 left-0 top-full mt-1 z-30 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={!formRepairId}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setFormRepairId(undefined);
                          setRepairSearchQuery("");
                          setIsRepairPickerOpen(false);
                        }}
                        className="w-full px-3 py-2 text-right text-xs font-semibold text-slate-500 hover:bg-slate-50"
                      >
                        عدم ارتباط با پرونده خاص
                      </button>
                      {filteredRepairs.length > 0 ? filteredRepairs.map((repair) => (
                        <button
                          key={repair.id}
                          type="button"
                          role="option"
                          aria-selected={repair.id === formRepairId}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setFormRepairId(repair.id);
                            setRepairSearchQuery("");
                            setIsRepairPickerOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-right text-xs font-bold transition-colors hover:bg-orange-50 ${repair.id === formRepairId ? "bg-orange-50 text-orange-800" : "text-slate-800"}`}
                        >
                          #{repair.id} - {repair.customerName} ({repair.deviceModel})
                          {(repair.serialNumber || repair.contactNumber) && (
                            <span className="mt-1 block text-[10px] font-medium text-slate-400">
                              {[repair.serialNumber, repair.contactNumber].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </button>
                      )) : (
                        <div className="px-3 py-3 text-center text-xs font-semibold text-slate-400">
                          پرونده‌ای با این مشخصات پیدا نشد
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-2">
                <button
                  type="submit"
                  className="flex-1 h-10 bg-[#e05a2b] hover:bg-[#c94b20] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  {editingReminder ? "به‌روزرسانی یادآور" : "ثبت یادآور"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 flex flex-col text-right animate-fade-in p-6">
            <div className="flex items-center gap-3 text-rose-500 mb-3 justify-end">
              <span className="text-sm font-black">حذف یادآور</span>
              <AlertCircle className="w-5 h-5 text-rose-500" />
            </div>
            
            <p className="text-slate-600 text-xs font-bold leading-relaxed mb-6">
              آیا از حذف این یادآور اطمینان دارید؟ این عملیات غیرقابل بازگشت است.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={confirmDeleteReminder}
                className="flex-1 h-10 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                بله، حذف شود
              </button>
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
