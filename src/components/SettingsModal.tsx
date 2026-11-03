/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { X, Save, AlertTriangle, ShieldCheck, Database, RefreshCw, Sliders, MessageSquare, Users, Trash2, UserPlus, Smile, Upload, Printer, Eye, EyeOff, Move, CheckCircle, Maximize2, Minimize2, FolderOpen, HardDriveDownload, Clock3 } from "lucide-react";
import { SystemSettings, DbStatus, User, PrintLayoutConfig, PrintFieldConfig } from "../types";
import RoleIcon from "./RoleIcon";

interface SettingsModalProps {
  onClose: () => void;
  dbStatus: DbStatus;
  refreshDbStatus: () => Promise<void>;
  onSettingsSaved?: () => void;
  currentUser?: User | null;
}

interface BackupStatus {
  enabled: boolean;
  path: string;
  intervalMinutes: number;
  nextRunAt: string | null;
  isRunning: boolean;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFile: string | null;
  lastError: string | null;
}

const AVAILABLE_ICONS = [
  { name: "Inbox", label: "صندوق دریافت (Inbox)" },
  { name: "FileText", label: "رسید چاپی (FileText)" },
  { name: "Search", label: "بررسی اولیه (Search)" },
  { name: "Cpu", label: "سخت‌افزار / پردازنده (Cpu)" },
  { name: "CheckCircle2", label: "تایید نهایی (CheckCircle2)" },
  { name: "DollarSign", label: "برآورد هزینه (DollarSign)" },
  { name: "CreditCard", label: "کارت اعتباری / پرداخت (CreditCard)" },
  { name: "Truck", label: "پیک شرکتی (Truck)" },
  { name: "Bike", label: "پیک سریع (Bike)" },
  { name: "MapPin", label: "تحویل حضوری (MapPin)" },
  { name: "Archive", label: "آرشیو / ارسال نشده (Archive)" },
  { name: "Package", label: "جعبه / انبار (Package)" },
  { name: "Database", label: "پایگاه داده (Database)" },
  { name: "User", label: "مشتری (User)" },
  { name: "Activity", label: "نمودار فعالیت (Activity)" },
  { name: "Clock", label: "ساعت (Clock)" },
];

export default function SettingsModal({ onClose, dbStatus, refreshDbStatus, onSettingsSaved, currentUser }: SettingsModalProps) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [togglingDb, setTogglingDb] = useState(false);

  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [newPassword, setNewPassword] = useState("1234");
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editUserRole, setEditUserRole] = useState("user");
  const [editPassword, setEditPassword] = useState("");
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Connection testing states
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<'success' | 'error' | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [selectingBackupFolder, setSelectingBackupFolder] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && settings) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const getActiveLayout = (): PrintLayoutConfig => {
    if (!settings) return { backgroundImageUrl: "", fields: [] };
    if (printSubTab === 'receipt') return settings.printLayoutReceipt || { backgroundImageUrl: "", fields: DEFAULT_FIELDS_RECEIPT };
    if (printSubTab === 'inspection') return settings.printLayoutInspection || { backgroundImageUrl: "", fields: DEFAULT_FIELDS_INSPECTION };
    return settings.printLayoutShipping || { backgroundImageUrl: "", fields: DEFAULT_FIELDS_SHIPPING };
  };

  const getFieldPrintWidth = (field: PrintFieldConfig) =>
    Math.min(field.width ?? 35, Math.max(5, 100 - field.x));

  const updateActiveLayout = (updated: PrintLayoutConfig) => {
    if (!settings) return;
    if (printSubTab === 'receipt') {
      setSettings({ ...settings, printLayoutReceipt: updated });
    } else if (printSubTab === 'inspection') {
      setSettings({ ...settings, printLayoutInspection: updated });
    } else {
      setSettings({ ...settings, printLayoutShipping: updated });
    }
  };

  const handlePrintBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && settings) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const activeLayout = getActiveLayout();
        updateActiveLayout({
          ...activeLayout,
          backgroundImageUrl: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLayout = () => {
    if (window.confirm("آیا از بازنشانی مختصات به حالت پیش‌فرض اطمینان دارید؟")) {
      const defaults = printSubTab === 'receipt' 
        ? DEFAULT_FIELDS_RECEIPT 
        : printSubTab === 'inspection' 
        ? DEFAULT_FIELDS_INSPECTION 
        : DEFAULT_FIELDS_SHIPPING;
      updateActiveLayout({
        backgroundImageUrl: getActiveLayout().backgroundImageUrl,
        fields: defaults
      });
      setSelectedFieldIndex(null);
    }
  };

  const getMockFieldValue = (key: string) => {
    switch (key) {
      case "customerName": return "شرکت مهندسی مکسا (نمونه)";
      case "receiveDate": return "۱۴۰۶/۰۴/۲۳";
      case "deviceModel": return "FacePass 7 Pro (مدل تستی)";
      case "serialNumber": return "MX-8890214-SN";
      case "accessories": return "کابل شبکه، آداپتور، پایه دیواری";
      case "problem": return "روشن نمی‌شود - دوربین چشمک زن";
      case "contactPerson": return "مهندس مهدوی";
      case "contactNumber": return "۰۹۱۲۳۴۵۶۷۸۹";
      case "repairCompany": return "دفتر مرکزی مکسا";
      case "initialSendDate": return "۱۴۰۶/۰۴/۲۵";
      case "shipDate": return "۱۴۰۶/۰۴/۳۰";
      case "shipMethod": return "پیک اختصاصی شرکت";
      case "trackingCode": return "کد رهگیری: TR-77821";
      case "receiverAddress": return "تهران، میدان ونک، خ ملاصدرا، پلاک ۵";
      default: return "نمونه داده";
    }
  };

  const handleFieldDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, fieldIndex: number, isFs: boolean = false) => {
    e.preventDefault();
    const activeContainer = isFs ? printPreviewFullscreenContainerRef.current : printPreviewContainerRef.current;
    if (!activeContainer || !settings) return;
    
    setSelectedFieldIndex(fieldIndex);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const rect = activeContainer.getBoundingClientRect();
    const activeLayout = getActiveLayout();
    const field = activeLayout.fields[fieldIndex];
    if (!field) return;
    
    const initialXPercent = field.x;
    const initialYPercent = field.y;
    
    const startX = clientX;
    const startY = clientY;

    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      
      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;
      
      let newX = initialXPercent - deltaXPercent;
      let newY = initialYPercent + deltaYPercent;
      
      newX = Math.max(0, Math.min(100, Math.round(newX * 10) / 10));
      newY = Math.max(0, Math.min(100, Math.round(newY * 10) / 10));
      
      const updatedFields = [...activeLayout.fields];
      updatedFields[fieldIndex] = { ...field, x: newX, y: newY };
      
      if (printSubTab === 'receipt') {
        setSettings(prev => prev ? { ...prev, printLayoutReceipt: { ...activeLayout, fields: updatedFields } } : null);
      } else if (printSubTab === 'inspection') {
        setSettings(prev => prev ? { ...prev, printLayoutInspection: { ...activeLayout, fields: updatedFields } } : null);
      } else {
        setSettings(prev => prev ? { ...prev, printLayoutShipping: { ...activeLayout, fields: updatedFields } } : null);
      }
    };

    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('touchend', handleDragEnd);
  };

  // Tabs: 'database' | 'sms' | 'icons' | 'users' | 'print'
  const [activeTab, setActiveTab] = useState<'database' | 'sms' | 'icons' | 'users' | 'print'>('database');

  // Print Layout Customization states
  const [printSubTab, setPrintSubTab] = useState<'receipt' | 'inspection' | 'shipping'>('receipt');
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const [isFullscreenPrint, setIsFullscreenPrint] = useState(false);
  const printPreviewContainerRef = useRef<HTMLDivElement>(null);
  const printPreviewFullscreenContainerRef = useRef<HTMLDivElement>(null);

  // Default print fields configurations
  const DEFAULT_FIELDS_RECEIPT = [
    { key: "customerName", label: "نام شرکت / مشتری", x: 30, y: 15, fontSize: 13, visible: true },
    { key: "receiveDate", label: "تاریخ دریافت", x: 78, y: 15, fontSize: 13, visible: true },
    { key: "deviceModel", label: "مدل دستگاه", x: 18, y: 35, fontSize: 13, visible: true },
    { key: "serialNumber", label: "شماره سریال", x: 38, y: 35, fontSize: 13, visible: true },
    { key: "accessories", label: "متعلقات", x: 58, y: 35, fontSize: 13, visible: true },
    { key: "problem", label: "مشکل دستگاه", x: 78, y: 35, fontSize: 13, visible: true },
    { key: "contactPerson", label: "نام رابط", x: 30, y: 55, fontSize: 13, visible: true },
    { key: "contactNumber", label: "شماره تماس", x: 70, y: 55, fontSize: 13, visible: true },
  ];

  const DEFAULT_FIELDS_INSPECTION = [
    { key: "customerName", label: "نام شرکت / مشتری", x: 30, y: 15, fontSize: 13, visible: true },
    { key: "receiveDate", label: "تاریخ دریافت", x: 78, y: 15, fontSize: 13, visible: true },
    { key: "deviceModel", label: "مدل دستگاه", x: 18, y: 35, fontSize: 13, visible: true },
    { key: "serialNumber", label: "شماره سریال", x: 38, y: 35, fontSize: 13, visible: true },
    { key: "problem", label: "مشکل دستگاه", x: 78, y: 35, fontSize: 13, visible: true },
    { key: "repairCompany", label: "شرکت تعمیرکننده", x: 30, y: 55, fontSize: 13, visible: true },
    { key: "initialSendDate", label: "تاریخ ارسال بررسی", x: 70, y: 55, fontSize: 13, visible: true },
  ];

  const DEFAULT_FIELDS_SHIPPING = [
    { key: "customerName", label: "نام شرکت / مشتری", x: 30, y: 15, fontSize: 13, visible: true },
    { key: "shipDate", label: "تاریخ ارسال نهایی", x: 78, y: 15, fontSize: 13, visible: true },
    { key: "deviceModel", label: "مدل دستگاه", x: 18, y: 35, fontSize: 13, visible: true },
    { key: "serialNumber", label: "شماره سریال", x: 42, y: 35, fontSize: 13, visible: true },
    { key: "shipMethod", label: "نحوه ارسال", x: 75, y: 35, fontSize: 13, visible: true },
    { key: "trackingCode", label: "کد رهگیری / تلفن", x: 30, y: 55, fontSize: 13, visible: true },
    { key: "receiverAddress", label: "آدرس گیرنده", x: 70, y: 55, fontSize: 13, visible: true },
  ];

  useEffect(() => {
    fetchSettings();
    fetchUsers();
    fetchBackupStatus();
  }, []);

  const fetchBackupStatus = async () => {
    try {
      const res = await fetch("/api/backup/status");
      if (res.ok) setBackupStatus(await res.json());
    } catch (err) {
      console.error("Error fetching backup status:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          
          // Initialize print layouts if they don't exist
          if (!data.printLayoutReceipt) {
            data.printLayoutReceipt = { backgroundImageUrl: "", fields: DEFAULT_FIELDS_RECEIPT };
          }
          if (!data.printLayoutInspection) {
            data.printLayoutInspection = { backgroundImageUrl: "", fields: DEFAULT_FIELDS_INSPECTION };
          }
          if (!data.printLayoutShipping) {
            data.printLayoutShipping = { backgroundImageUrl: "", fields: DEFAULT_FIELDS_SHIPPING };
          }

          setSettings(data);
        }
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setUsers(data);
        }
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setSuccess(false);

    try {
      const updatedSettings = {
        ...settings,
        dbType: "sql" as const
      };
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });

      if (res.ok) {
        setSettings(updatedSettings);
        setSuccess(true);
        onSettingsSaved?.();
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleDbStatus = async () => {
    setTogglingDb(true);
    try {
      const res = await fetch("/api/db-status/toggle", { method: "POST" });
      if (res.ok) {
        await refreshDbStatus();
      }
    } catch (err) {
      console.error("Error toggling db status:", err);
    } finally {
      setTogglingDb(false);
    }
  };

  const handleSelectBackupFolder = async () => {
    setSelectingBackupFolder(true);
    setBackupMessage(null);
    try {
      const res = await fetch("/api/backup/select-folder", { method: "POST" });
      const data = await res.json();
      if (data.success && settings) {
        setSettings({ ...settings, backupPath: data.path });
      } else if (!data.cancelled) {
        setBackupMessage({ type: "error", text: data.error || "انتخاب پوشه انجام نشد." });
      }
    } catch (err) {
      setBackupMessage({ type: "error", text: "ارتباط با سرور برای انتخاب پوشه برقرار نشد." });
    } finally {
      setSelectingBackupFolder(false);
    }
  };

  const handleManualBackup = async () => {
    if (!settings?.backupPath?.trim()) {
      setBackupMessage({ type: "error", text: "ابتدا مسیر ذخیره بکاپ را وارد یا انتخاب کنید." });
      return;
    }

    setBackupBusy(true);
    setBackupMessage(null);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupPath: settings.backupPath }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBackupMessage({ type: "success", text: `بکاپ با موفقیت در مسیر انتخاب‌شده ذخیره شد.` });
        await fetchBackupStatus();
      } else {
        setBackupMessage({ type: "error", text: data.error || "گرفتن بکاپ انجام نشد." });
        await fetchBackupStatus();
      }
    } catch (err) {
      setBackupMessage({ type: "error", text: "خطا در ارتباط با سرور بکاپ." });
    } finally {
      setBackupBusy(false);
    }
  };

  const formatBackupDate = (value: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(date);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim()) return;

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          name: newFullName.trim(),
          role: newUserRole,
          password: newPassword || "1234"
        }),
      });

      if (res.ok) {
        setNewUsername("");
        setNewFullName("");
        setNewUserRole("user");
        setNewPassword("1234");
        await fetchUsers();
      } else {
        const errData = await res.json();
        alert(errData.error || "خطا در ثبت کاربر");
      }
    } catch (err) {
      console.error("Error adding user:", err);
    }
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditFullName(user.name);
    setEditUserRole(user.role || "user");
    setEditPassword(user.password || "");
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editUsername.trim(),
          name: editFullName.trim(),
          role: editUserRole,
          password: editPassword
        }),
      });

      if (res.ok) {
        setEditingUser(null);
        await fetchUsers();
      } else {
        const errData = await res.json();
        alert(errData.error || "خطا در ویرایش کاربر");
      }
    } catch (err) {
      console.error("Error updating user:", err);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUserToDelete(null);
        await fetchUsers();
      } else {
        const errData = await res.json();
        alert(errData.error || "خطا در حذف کاربر");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fade-in font-sans text-right">
      <div 
        className={`bg-white rounded-2xl w-full ${activeTab === 'print' ? 'max-w-5xl' : 'max-w-3xl'} overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] transition-all duration-300`}
        id="settings-modal"
      >
        {/* Header */}
        <div className="relative bg-[#1a2a3a] text-white py-5 pr-5 pl-16 flex justify-between items-center" id="settings-header">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5.5 h-5.5 text-[#e05a2b]" />
            <h2 className="text-lg font-bold">تنظیمات پیشرفته سامانه</h2>
          </div>
          <button 
            onClick={onClose} 
            className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-rose-600/90 text-white transition-colors hover:bg-rose-700 cursor-pointer"
            id="settings-close-btn"
            aria-label="بستن تنظیمات"
            title="بستن تنظیمات"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500" id="settings-loading">
            <RefreshCw className="w-10 h-10 animate-spin text-[#1a2a3a]" />
            <span>در حال بارگذاری تنظیمات سیستم...</span>
          </div>
        ) : (
          <div className={`flex flex-1 overflow-hidden ${activeTab === 'print' ? 'h-[630px]' : 'h-[550px]'} transition-all duration-300`} id="settings-body-split">
            {/* Tabs List Right Sidebar */}
            <div className="w-48 bg-slate-50 border-l border-slate-200 flex flex-col p-4 gap-2" id="settings-sidebar">
              <button
                type="button"
                onClick={() => setActiveTab('database')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                  activeTab === 'database'
                    ? 'bg-[#1a2a3a] text-white shadow-md shadow-slate-300'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Database className="w-4 h-4 shrink-0" />
                <span>تنظیمات دیتابیس</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sms')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                  activeTab === 'sms'
                    ? 'bg-[#1a2a3a] text-white shadow-md shadow-slate-300'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>تنظیمات پیامک‌ها</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('icons')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                  activeTab === 'icons'
                    ? 'bg-[#1a2a3a] text-white shadow-md shadow-slate-300'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Smile className="w-4 h-4 shrink-0" />
                <span>تنظیمات لوگوی اختصاصی</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('print')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                  activeTab === 'print'
                    ? 'bg-[#1a2a3a] text-white shadow-md shadow-slate-300'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>تنظیمات چاپ فیش‌ها</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-[#1a2a3a] text-white shadow-md shadow-slate-300'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>تنظیمات کاربران</span>
              </button>

              {/* Powered by az & pm */}
              <div className="mt-auto pt-3 border-t border-slate-200/60 flex flex-col items-center justify-center select-none" id="settings-attribution">
                <span className="text-[10px] text-slate-400 font-mono tracking-wider font-semibold uppercase">powered by az & pm</span>
              </div>
            </div>

            {/* Active Content Area Left Pane */}
            <div className="flex-1 overflow-y-auto p-6" id="settings-content-panel">
              {activeTab === 'sms' && settings && (
                <form onSubmit={handleSave} className="space-y-6">
                  {/* Provider & Credentials */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <h3 className="text-sm font-black text-[#1a2a3a] border-b border-slate-200/80 pb-2 flex items-center justify-between">
                      <span>سرویس‌دهنده و دسترسی پیامک</span>
                      <span className="text-[10px] text-slate-500 font-normal">مطابق با تنظیمات C# ویندوزی</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">انتخاب سامانه پیامک:</label>
                        <select
                          value={settings.smsProvider || "payamak_panel"}
                          onChange={(e) => setSettings({ ...settings, smsProvider: e.target.value as any })}
                          className="w-full bg-white text-slate-800 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#f0642f] font-bold"
                        >
                          <option value="payamak_panel">سامانه پیامک‌بانک (Payamak-Panel / SendByBaseNumber)</option>
                          <option value="kavenegar">کاوه‌نگار (Kavenegar)</option>
                        </select>
                      </div>

                      {/* SMS Mock Toggle */}
                      <div className="flex items-center gap-3 pt-5">
                        <input
                          type="checkbox"
                          checked={settings.enableMockSms}
                          onChange={(e) => setSettings({ ...settings, enableMockSms: e.target.checked })}
                          className="w-4.5 h-4.5 accent-[#f0642f] rounded cursor-pointer"
                          id="sms-mock-checkbox"
                        />
                        <label htmlFor="sms-mock-checkbox" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                          فعال‌سازی حالت شبیه‌ساز تستی (عدم کسر شارژ و شبیه‌سازی ارسال)
                        </label>
                      </div>
                    </div>

                    {/* Payamak-Panel credentials */}
                    {(!settings.smsProvider || settings.smsProvider === "payamak_panel") && (
                      <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">نام کاربری سامانه پیامک (Username):</label>
                          <input
                            type="text"
                            placeholder="مثال: maxa_sms"
                            value={settings.smsUsername || ""}
                            onChange={(e) => setSettings({ ...settings, smsUsername: e.target.value })}
                            dir="ltr"
                            className="w-full bg-white text-slate-800 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#f0642f] font-mono text-left"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">کلمه عبور سامانه پیامک (Password):</label>
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={settings.smsPassword || ""}
                            onChange={(e) => setSettings({ ...settings, smsPassword: e.target.value })}
                            dir="ltr"
                            className="w-full bg-white text-slate-800 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#f0642f] font-mono text-left"
                          />
                        </div>
                      </div>
                    )}

                    {/* Kavenegar credentials */}
                    {settings.smsProvider === "kavenegar" && (
                      <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">کلید وب‌سرویس کاوه‌نگار (API Key):</label>
                          <input
                            type="text"
                            placeholder="کلید API کاوه‌نگار"
                            value={settings.kavenegarApiKey || ""}
                            onChange={(e) => setSettings({ ...settings, kavenegarApiKey: e.target.value })}
                            dir="ltr"
                            className="w-full bg-white text-slate-800 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#f0642f] font-mono text-left"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">شماره اختصاصی فرستنده (Sender):</label>
                          <input
                            type="text"
                            placeholder="100010001224"
                            value={settings.kavenegarSender || ""}
                            onChange={(e) => setSettings({ ...settings, kavenegarSender: e.target.value })}
                            dir="ltr"
                            className="w-full bg-white text-slate-800 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#f0642f] font-mono text-left"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Body IDs for Payamak-Panel SendByBaseNumber */}
                  {(!settings.smsProvider || settings.smsProvider === "payamak_panel") && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <h3 className="text-sm font-black text-[#1a2a3a] border-b border-slate-200/80 pb-2">
                        شناسه‌های الگوی متن در سامانه (BodyId پترن‌های تاییدشده)
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-relaxed -mt-1">
                        این شناسه‌ها دقیقا منطبق با پترن‌های کد نویسی شده در نسخه ویندوزی است:
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-600">۱. دریافت دستگاه:</label>
                          <input
                            type="text"
                            value={settings.smsBodyIdReceipt || "384713"}
                            onChange={(e) => setSettings({ ...settings, smsBodyIdReceipt: e.target.value })}
                            dir="ltr"
                            className="w-full bg-white text-slate-800 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono text-center font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-600">۲. بررسی اولیه:</label>
                          <input
                            type="text"
                            value={settings.smsBodyIdInspection || "384735"}
                            onChange={(e) => setSettings({ ...settings, smsBodyIdInspection: e.target.value })}
                            dir="ltr"
                            className="w-full bg-white text-slate-800 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono text-center font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-600">۳. اعلام هزینه:</label>
                          <input
                            type="text"
                            value={settings.smsBodyIdCost || "384746"}
                            onChange={(e) => setSettings({ ...settings, smsBodyIdCost: e.target.value })}
                            dir="ltr"
                            className="w-full bg-white text-slate-800 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono text-center font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-600">۴. تایید اعلام هزینه:</label>
                          <input
                            type="text"
                            value={settings.smsBodyIdCostApproved || "384747"}
                            onChange={(e) => setSettings({ ...settings, smsBodyIdCostApproved: e.target.value })}
                            dir="ltr"
                            className="w-full bg-white text-slate-800 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono text-center font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-600">۵. دستگاه جایگزین:</label>
                          <input
                            type="text"
                            value={settings.smsBodyIdReplacement || "400795"}
                            onChange={(e) => setSettings({ ...settings, smsBodyIdReplacement: e.target.value })}
                            dir="ltr"
                            className="w-full bg-white text-slate-800 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono text-center font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-600">۶. تحویل و ارسال:</label>
                          <input
                            type="text"
                            value={settings.smsBodyIdShipping || "384757"}
                            onChange={(e) => setSettings({ ...settings, smsBodyIdShipping: e.target.value })}
                            dir="ltr"
                            className="w-full bg-white text-slate-800 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono text-center font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SMS Templates Section */}
                  <div className="space-y-4" id="sms-config-section">
                    <h3 className="text-sm font-black text-[#1a2a3a] border-b border-slate-100 pb-2">متن الگوهای ۶ گانه پیامک</h3>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-600">قالب ۱: رسید دریافت دستگاه (BodyId: {settings.smsBodyIdReceipt || "384713"})</label>
                        <textarea
                          rows={2}
                          value={settings.smsTemplateReceipt}
                          onChange={(e) => setSettings({ ...settings, smsTemplateReceipt: e.target.value })}
                          className="w-full bg-[#f8fafc] text-slate-800 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#f0642f] font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-600">قالب ۲: بررسی اولیه (BodyId: {settings.smsBodyIdInspection || "384735"})</label>
                        <textarea
                          rows={2}
                          value={settings.smsTemplateInspection}
                          onChange={(e) => setSettings({ ...settings, smsTemplateInspection: e.target.value })}
                          className="w-full bg-[#f8fafc] text-slate-800 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#f0642f] font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-600">قالب ۳: اعلام هزینه (BodyId: {settings.smsBodyIdCost || "384746"})</label>
                        <textarea
                          rows={2}
                          value={settings.smsTemplateCost}
                          onChange={(e) => setSettings({ ...settings, smsTemplateCost: e.target.value })}
                          className="w-full bg-[#f8fafc] text-slate-800 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#f0642f] font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-600">قالب ۴: تایید اعلام هزینه (BodyId: {settings.smsBodyIdCostApproved || "384747"})</label>
                        <textarea
                          rows={2}
                          value={settings.smsTemplateCostApproved || "شرکت {0} آقا/خانم {1} دستگاه {2} به شماره سریال {3} تاییدیه هزینه اعلام شده جهت تعمیرات توسط جنابعالی در واتس آپ دریافت گردید و تعمیر دستگاه شما از این تاریخ در اولویت کاری قرار گرفت. واحد تعمیرات شرکت مهندسی کسرا رایانه آپادانا www.maxasecurity.com 021-78756800 09965012695"}
                          onChange={(e) => setSettings({ ...settings, smsTemplateCostApproved: e.target.value })}
                          className="w-full bg-[#f8fafc] text-slate-800 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#f0642f] font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-600">قالب ۵: دستگاه جایگزین (BodyId: {settings.smsBodyIdReplacement || "400795"})</label>
                        <textarea
                          rows={2}
                          value={settings.smsTemplateReplacement || "شرکت {0} آقا/خانم {1} دستگاه {2} به شماره سریال {3} باتوجه به زمانبر بودن تعمیرات ، تا زمان انجام تعمیرات دستگاه جایگزین در اختیار شما قرار خواهد گرفت. لطفا جهت دریافت دستگاه جایگزین ، طی دو روزکاری آینده از ساعت 13 الی 18 ، با ارائه معرفی نامه به شرکت مراجعه فرمایید. واحد تعمیرات شرکت مهندسی کسرا رایانه آپادانا(مکسا) www.maxasecurity.com 021-78756800 09965012695"}
                          onChange={(e) => setSettings({ ...settings, smsTemplateReplacement: e.target.value })}
                          className="w-full bg-[#f8fafc] text-slate-800 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#f0642f] font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-600">قالب ۶: تحویل و ارسال (BodyId: {settings.smsBodyIdShipping || "384757"})</label>
                        <textarea
                          rows={2}
                          value={settings.smsTemplateShipping}
                          onChange={(e) => setSettings({ ...settings, smsTemplateShipping: e.target.value })}
                          className="w-full bg-[#f8fafc] text-slate-800 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#f0642f] font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    {success && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold ml-auto">
                        <ShieldCheck className="w-4 h-4 animate-bounce" />
                        <span>تنظیمات سیستم با موفقیت بروزرسانی شد.</span>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 bg-[#f0642f] hover:bg-[#d9531e] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-100"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "در حال ثبت..." : "ذخیره تغییرات"}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'icons' && settings && (
                <form onSubmit={handleSave} className="space-y-6 animate-fade-in">
                  {/* Logo Customization section */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4" id="logo-custom-section">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Upload className="w-4 h-4 text-[#e05a2b]" />
                      سفارشی‌سازی لوگوی نرم‌افزار (لوگوی مکسا)
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      تصویر لوگوی اختصاصی خود را آپلود کرده یا آدرس اینترنتی آن را وارد نمایید تا در تمامی بخش‌های سیستم (سایدبار، صفحه ورود و سربرگ‌ها) به جای لوگوی پیش‌فرض نمایش داده شود.
                    </p>

                    <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-slate-100">
                      <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {settings.logoUrl ? (
                          <img src={settings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="text-[10px] text-slate-400 font-bold text-center p-1">لوگوی پیش‌فرض مکسا</div>
                        )}
                      </div>

                      <div className="flex-1 w-full space-y-3">
                        <div className="flex gap-2">
                          <label className="bg-[#1a2a3a] hover:bg-[#253b51] text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 shadow-md">
                            <Upload className="w-3.5 h-3.5" />
                            <span>انتخاب فایل تصویر...</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                          </label>
                          {settings.logoUrl && (
                            <button
                              type="button"
                              onClick={() => setSettings({ ...settings, logoUrl: "" })}
                              className="border border-rose-200 hover:bg-rose-50 text-rose-600 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                            >
                              بازنشانی به پیش‌فرض
                            </button>
                          )}
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 block">یا آدرس اینترنتی (URL) لوگو:</span>
                          <input
                            type="text"
                            value={settings.logoUrl || ""}
                            onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                            placeholder="https://example.com/logo.png"
                            className="w-full bg-[#f8fafc] text-slate-800 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1a2a3a] text-left font-mono"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    {success && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold ml-auto">
                        <ShieldCheck className="w-4 h-4 animate-bounce" />
                        <span>لوگوی سیستم با موفقیت بروزرسانی شد.</span>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 bg-[#e05a2b] hover:bg-[#c9491e] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-100"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "در حال ثبت..." : "ذخیره تغییرات"}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'database' && settings && (
                <form onSubmit={handleSave} className="space-y-6 animate-fade-in">
                  {/* Microsoft SQL Server Connection Settings */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4" id="sql-server-config">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Database className="w-4 h-4 text-sky-600" />
                      اتصال مستقیم به Microsoft SQL Server
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      مشخصات اتصال به بانک اطلاعاتی اس‌کیو‌ال سرور (MS SQL Server) را وارد نمایید. پس از موفقیت‌آمیز بودن تست اتصال، وضعیت اتصال بروزرسانی می‌شود.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-600">آدرس سرور / IP Host:</label>
                        <input
                          type="text"
                          value={settings.sqlServerHost || ""}
                          onChange={(e) => setSettings({ ...settings, sqlServerHost: e.target.value })}
                          placeholder="مثال: 192.168.1.50"
                          className="w-full bg-white text-slate-800 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1a2a3a] text-left font-mono"
                          dir="ltr"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-600">پورت سرور (Port):</label>
                        <input
                          type="text"
                          value={settings.sqlServerPort || ""}
                          onChange={(e) => setSettings({ ...settings, sqlServerPort: e.target.value })}
                          placeholder="پیش‌فرض: 1433"
                          className="w-full bg-white text-slate-800 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1a2a3a] text-left font-mono"
                          dir="ltr"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-600">نام دیتابیس (Database Name):</label>
                        <input
                          type="text"
                          value={settings.sqlServerDbName || ""}
                          onChange={(e) => setSettings({ ...settings, sqlServerDbName: e.target.value })}
                          placeholder="مثال: MaxaRepairsDB"
                          className="w-full bg-white text-slate-800 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1a2a3a] text-left font-mono"
                          dir="ltr"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-600">نام کاربری (Username):</label>
                        <input
                          type="text"
                          value={settings.sqlServerUser || ""}
                          onChange={(e) => setSettings({ ...settings, sqlServerUser: e.target.value })}
                          placeholder="مثال: sa"
                          className="w-full bg-white text-slate-800 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1a2a3a] text-left font-mono"
                          dir="ltr"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600">رمز عبور (Password):</label>
                        <input
                          type="password"
                          value={settings.sqlServerPassword || ""}
                          onChange={(e) => setSettings({ ...settings, sqlServerPassword: e.target.value })}
                          placeholder="••••••••"
                          className="w-full bg-white text-slate-800 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1a2a3a] text-left font-mono"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-100 justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600">وضعیت اتصال SQL:</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3 h-3 rounded-full ${
                            settings.sqlServerConnected 
                              ? "bg-emerald-500 shadow-md shadow-emerald-400" 
                              : "bg-rose-500 shadow-md shadow-rose-400"
                          } ${settings.sqlServerConnected ? "animate-pulse" : ""}`} />
                          <span className={`text-[11px] font-black ${
                            settings.sqlServerConnected ? "text-emerald-600" : "text-rose-500"
                          }`}>
                            {settings.sqlServerConnected ? "متصل" : "برقرار نیست"}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {settings.sqlServerConnected && (
                          <button
                            type="button"
                            onClick={async () => {
                              const updated = { ...settings, sqlServerConnected: false };
                              setSettings(updated);
                              setConnectionResult(null);
                              await fetch("/api/settings", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(updated),
                              });
                              onSettingsSaved?.();
                            }}
                            className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 text-[11px] font-bold rounded-lg cursor-pointer transition-all active:scale-95"
                          >
                            قطع اتصال SQL
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={async () => {
                            if (!settings) return;
                            if (!settings.sqlServerHost || !settings.sqlServerPort) {
                              setConnectionResult("error");
                              setConnectionError("لطفاً آدرس سرور (Host) و پورت (Port) را وارد نمایید.");
                              return;
                            }
                            setTestingConnection(true);
                            setConnectionResult(null);
                            setConnectionError(null);
                            try {
                              const res = await fetch("/api/settings/test-connection", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  host: settings.sqlServerHost,
                                  port: settings.sqlServerPort,
                                  dbName: settings.sqlServerDbName,
                                  username: settings.sqlServerUser,
                                  password: settings.sqlServerPassword,
                                }),
                              });
                              setTestingConnection(false);
                              if (res.ok) {
                                const data = await res.json();
                                if (data.success) {
                                  const updated = { ...settings, sqlServerConnected: true };
                                  setSettings(updated);
                                  setConnectionResult("success");
                                  // Auto save connection status to DB
                                  await fetch("/api/settings", {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(updated),
                                  });
                                  onSettingsSaved?.();
                                } else {
                                  setConnectionResult("error");
                                  setConnectionError(data.error);
                                  // Auto save disconnected status to DB
                                  const updated = { ...settings, sqlServerConnected: false };
                                  setSettings(updated);
                                  await fetch("/api/settings", {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(updated),
                                  });
                                  onSettingsSaved?.();
                                }
                              } else {
                                setConnectionResult("error");
                                setConnectionError("خطا در برقراری ارتباط با سرور تست اتصال.");
                              }
                            } catch (err: any) {
                              setTestingConnection(false);
                              setConnectionResult("error");
                              setConnectionError("خطای ناشناخته در برقراری ارتباط.");
                            }
                          }}
                          disabled={testingConnection}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          {testingConnection ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>در حال بررسی اتصال...</span>
                            </>
                          ) : (
                            <span>تست اتصال به SQL Server</span>
                          )}
                        </button>
                      </div>
                    </div>

                    {connectionResult === "success" && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold text-center">
                        اتصال به پایگاه داده Microsoft SQL Server با موفقیت برقرار گردید!
                      </div>
                    )}

                    {connectionResult === "error" && connectionError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[11px] font-bold text-center">
                        {connectionError}
                      </div>
                    )}
                  </div>

                  {/* SQL Server backup configuration */}
                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-4" id="sql-backup-config">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                          <HardDriveDownload className="w-4 h-4 text-emerald-600" />
                          پشتیبان‌گیری از SQL Server
                        </h3>
                        <p className="text-[10px] text-emerald-800/75 leading-relaxed mt-1">
                          بکاپ با فرمت BAK از دیتابیس فعال گرفته می‌شود. برای اجرای خودکار، مسیر و بازه را تعیین کرده و تنظیمات را ذخیره کنید.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 shrink-0 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!settings.backupEnabled}
                          onChange={(e) => setSettings({ ...settings, backupEnabled: e.target.checked })}
                          className="w-4 h-4 accent-emerald-600 cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-emerald-800">بکاپ خودکار فعال باشد</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1 md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700">مسیر ذخیره فایل‌های بکاپ:</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={settings.backupPath || ""}
                            onChange={(e) => setSettings({ ...settings, backupPath: e.target.value })}
                            placeholder="مثال: D:\\RepairBackups"
                            className="flex-1 min-w-0 bg-white text-slate-800 px-3 py-2 text-xs rounded-lg border border-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-left font-mono"
                            dir="ltr"
                          />
                          <button
                            type="button"
                            onClick={handleSelectBackupFolder}
                            disabled={selectingBackupFolder}
                            className="px-3 py-2 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            {selectingBackupFolder ? "در حال انتخاب..." : "انتخاب پوشه"}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          مسیر باید روی کامپیوتری باشد که سرویس SQL Server به آن دسترسی نوشتن دارد.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700">بازه بکاپ خودکار (دقیقه):</label>
                        <div className="relative">
                          <Clock3 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-emerald-600" />
                          <input
                            type="number"
                            min={1}
                            max={10080}
                            step={1}
                            value={settings.backupIntervalMinutes || 60}
                            onChange={(e) => setSettings({ ...settings, backupIntervalMinutes: Math.max(1, Number(e.target.value) || 1) })}
                            className="w-full bg-white text-slate-800 pr-8 pl-3 py-2 text-xs rounded-lg border border-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-left font-mono"
                            dir="ltr"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500">حداقل ۱ دقیقه و حداکثر ۷ روز</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 p-3 rounded-lg border border-emerald-100">
                      <div className="text-[10px] text-slate-600 space-y-1">
                        <div>آخرین بکاپ موفق: <span className="font-bold">{formatBackupDate(backupStatus?.lastSuccessAt || null)}</span></div>
                        {backupStatus?.enabled && backupStatus.nextRunAt && (
                          <div>بکاپ خودکار بعدی: <span className="font-bold">{formatBackupDate(backupStatus.nextRunAt)}</span></div>
                        )}
                        {backupStatus?.lastFile && (
                          <div className="max-w-[520px] truncate font-mono text-slate-500" dir="ltr" title={backupStatus.lastFile}>{backupStatus.lastFile}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleManualBackup}
                        disabled={backupBusy || !settings.sqlServerConnected}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <HardDriveDownload className={`w-3.5 h-3.5 ${backupBusy ? "animate-bounce" : ""}`} />
                        {backupBusy ? "در حال گرفتن بکاپ..." : "گرفتن بکاپ دستی"}
                      </button>
                    </div>

                    {backupMessage && (
                      <div className={`p-2.5 rounded-lg text-[11px] font-bold text-center ${backupMessage.type === "success" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                        {backupMessage.text}
                      </div>
                    )}
                    {backupStatus?.lastError && !backupMessage && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[11px] font-bold text-center">
                        آخرین خطای بکاپ: {backupStatus.lastError}
                      </div>
                    )}
                  </div>

                  {/* Printer configuration */}
                  <div className="space-y-3" id="print-config-section">
                    <h3 className="text-sm font-bold text-[#1a2a3a] border-b border-slate-100 pb-2">تنظیمات پرینتر فیش‌زن</h3>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600">IP یا پورت محلی چاپگر رسید مشتری:</label>
                      <input
                        type="text"
                        value={settings.printerIp}
                        onChange={(e) => setSettings({ ...settings, printerIp: e.target.value })}
                        className="w-full bg-[#f8fafc] text-slate-800 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1a2a3a] text-left font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    {success && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold ml-auto">
                        <ShieldCheck className="w-4 h-4 animate-bounce" />
                        <span>تنظیمات سیستم با موفقیت بروزرسانی شد.</span>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 bg-[#e05a2b] hover:bg-[#c9491e] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-100"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "در حال ثبت..." : "ذخیره تغییرات"}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'users' && (
                <div className="space-y-6">
                  {/* Add New User Section */}
                  <form onSubmit={handleAddUser} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-[#e05a2b]" />
                      ثبت و تعریف کاربر جدید در سامانه
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700">نام کاربری *:</label>
                        <input
                          type="text"
                          required
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="مثلاً user1"
                          className="w-full bg-white text-slate-900 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#1a2a3a] font-mono text-left"
                          dir="ltr"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700">نام و نام خانوادگی *:</label>
                        <input
                          type="text"
                          required
                          value={newFullName}
                          onChange={(e) => setNewFullName(e.target.value)}
                          placeholder="مثلاً علی رضایی"
                          className="w-full bg-white text-slate-900 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#1a2a3a]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700">سطح دسترسی *:</label>
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value)}
                          className="w-full bg-white text-slate-900 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#1a2a3a] font-bold"
                        >
                          <option value="user">user — فقط مشاهده</option>
                          <option value="admin">admin — دسترسی کامل</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700">رمز عبور *:</label>
                        <input
                          type="text"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="مثلاً 1234"
                          className="w-full bg-white text-slate-900 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#1a2a3a] font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[10px] text-slate-500">
                        * کاربرانی که با سطح <span className="font-bold text-slate-700">«کاربر عادی»</span> ایجاد می‌شوند فقط دسترسی مشاهده داشته و امکان افزودن، ویرایش یا حذف اطلاعات را ندارند.
                      </p>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#1a2a3a] hover:bg-[#253b51] text-white text-[11px] font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>ثبت کاربر جدید</span>
                      </button>
                    </div>
                  </form>

                  {/* Users list */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-[#1a2a3a] border-b border-slate-100 pb-2 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#e05a2b]" />
                      لیست کاربران فعال سیستم ({users.length} کاربر)
                    </h3>

                    {usersLoading ? (
                      <div className="py-8 flex justify-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin" />
                      </div>
                    ) : (
                      <div className="overflow-hidden border border-slate-200 rounded-2xl">
                        <table className="w-full text-right border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                              <th className="p-3">نام کاربری</th>
                              <th className="p-3">نام و نام خانوادگی</th>
                              <th className="p-3">سطح دسترسی</th>
                              <th className="p-3 text-center">عملیات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {users.map((u) => (
                              <tr key={u.id} className="hover:bg-slate-50/80 text-slate-800 font-medium transition-colors">
                                <td className="p-3 font-mono text-slate-700 font-bold">{u.username}</td>
                                <td className="p-3 font-bold">{u.name}</td>
                                <td className="p-3">
                                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 bg-sky-50 text-sky-800 border border-sky-200">
                                    <RoleIcon
                                      role={u.role === 'admin' ? 'admin' : 'user'}
                                      className="w-3.5 h-3.5 text-sky-700"
                                    />
                                    <span dir="ltr">{u.role === 'admin' ? 'admin' : 'user'}</span>
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleOpenEditUser(u)}
                                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                      title="ویرایش کاربر"
                                    >
                                      <Sliders className="w-3.5 h-3.5" />
                                    </button>
                                    {u.username !== "admin" ? (
                                      <button
                                        onClick={() => setUserToDelete(u)}
                                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="حذف کاربر"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-semibold px-1">اصلی</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* EDIT USER MODAL */}
                  {editingUser && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 text-right animate-fade-in">
                        <div className="relative bg-[#1a2a3a] text-white py-4 pr-6 pl-16 flex items-center justify-between">
                          <button
                            onClick={() => setEditingUser(null)}
                            className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-rose-600/90 text-white transition-colors hover:bg-rose-700 cursor-pointer"
                            aria-label="بستن"
                            title="بستن"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <h3 className="text-sm font-black">ویرایش مشخصات کاربر ({editingUser.username})</h3>
                        </div>

                        <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700">نام کاربری:</label>
                            <input
                              type="text"
                              required
                              disabled={editingUser.username === "admin"}
                              value={editUsername}
                              onChange={(e) => setEditUsername(e.target.value)}
                              className="w-full bg-slate-50 text-slate-900 px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono text-left disabled:opacity-60"
                              dir="ltr"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700">نام و نام خانوادگی:</label>
                            <input
                              type="text"
                              required
                              value={editFullName}
                              onChange={(e) => setEditFullName(e.target.value)}
                              className="w-full bg-slate-50 text-slate-900 px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700">سطح دسترسی:</label>
                            <select
                              value={editUserRole}
                              disabled={editingUser.username === "admin"}
                              onChange={(e) => setEditUserRole(e.target.value)}
                              className="w-full bg-slate-50 text-slate-900 px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold disabled:opacity-60"
                            >
                              <option value="user">user — فقط مشاهده</option>
                              <option value="admin">admin — دسترسی کامل</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700">رمز عبور جدید:</label>
                            <input
                              type="text"
                              placeholder="تغییر رمز عبور (در صورت نیاز)"
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              className="w-full bg-slate-50 text-slate-900 px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono text-left"
                              dir="ltr"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setEditingUser(null)}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                              انصراف
                            </button>
                            <button
                              type="submit"
                              className="px-5 py-2 bg-[#e05a2b] hover:bg-[#c9491e] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                              ذخیره تغییرات کاربر
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* DELETE USER CONFIRMATION MODAL */}
                  {userToDelete && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 text-right animate-fade-in p-6 space-y-4">
                        <div className="flex items-center gap-3 text-rose-600">
                          <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-800">تاییدیه حذف کاربر</h3>
                            <p className="text-[11px] text-slate-500">این عملیات غیرقابل بازگشت می‌باشد.</p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-medium bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                          آیا از حذف کاربر <span className="font-black text-slate-900">«{userToDelete.name}»</span> با نام کاربری <span className="font-mono font-bold text-slate-900" dir="ltr">({userToDelete.username})</span> اطمینان کامل دارید؟
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setUserToDelete(null)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                          >
                            انصراف
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmDeleteUser}
                            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md shadow-rose-200 flex items-center gap-1.5"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>تایید و حذف کاربر</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'print' && settings && (
                <div className="space-y-6 animate-fade-in text-right">
                  {/* Top Print Sub-Tabs selection */}
                  <div className="flex bg-slate-100 p-1.5 rounded-xl gap-2 select-none">
                    <button
                      type="button"
                      onClick={() => {
                        setPrintSubTab('receipt');
                        setSelectedFieldIndex(null);
                      }}
                      className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-all cursor-pointer ${
                        printSubTab === 'receipt'
                          ? 'bg-[#1a2a3a] text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      رسید دریافت دستگاه
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPrintSubTab('inspection');
                        setSelectedFieldIndex(null);
                      }}
                      className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-all cursor-pointer ${
                        printSubTab === 'inspection'
                          ? 'bg-[#1a2a3a] text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      رسید بررسی اولیه
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPrintSubTab('shipping');
                        setSelectedFieldIndex(null);
                      }}
                      className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-all cursor-pointer ${
                        printSubTab === 'shipping'
                          ? 'bg-[#1a2a3a] text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      رسید ارسال / خروج دستگاه
                    </button>
                  </div>

                  {/* Header Title & Subtext */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#1a2a3a] flex items-center gap-1.5">
                      <Printer className="w-4 h-4 text-[#e05a2b]" />
                      <span>جانمایی فیلدهای چاپی روی پس‌زمینه دلخواه</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      تصویر قالب چاپی خود را آپلود کنید و فیلدها را روی آن جابجا کنید. با انتخاب هر فیلد، عرض محدودهٔ چاپ را هم تعیین کنید؛ متن داخل محدوده راست‌چین و در صورت نیاز چندخطی می‌شود.
                    </p>
                  </div>

                  {/* Main Interactive Grid */}
                  <div className="grid grid-cols-12 gap-5">
                    {/* Left: Live Interactive Mock A4 Sheet */}
                    <div className="col-span-6 flex flex-col items-center">
                      <div className="flex justify-between items-center w-full mb-2 select-none">
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5">
                          <Move className="w-3 h-3 text-[#e05a2b]" />
                          <span>پیش‌نمایش تعاملی (برای جابجایی فیلدها را بکشید)</span>
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => setIsFullscreenPrint(true)}
                          className="flex items-center gap-1 text-[10px] text-[#e05a2b] hover:text-[#c9491e] font-black border border-orange-100 bg-orange-50 hover:bg-orange-100/70 px-2.5 py-1 rounded-lg transition-all cursor-pointer active:scale-95"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>ویرایش در حالت تمام‌صفحه (بزرگ)</span>
                        </button>
                      </div>

                      <div 
                        ref={printPreviewContainerRef}
                        className={`w-full ${getActiveLayout().orientation === 'portrait' ? 'aspect-[1/1.414] max-h-[360px]' : 'aspect-[1.414/1]'} bg-white border-2 border-slate-300 rounded-xl shadow-xl relative overflow-hidden select-none select-all transition-all duration-300`}
                        style={{
                          backgroundImage: getActiveLayout().backgroundImageUrl ? `url(${getActiveLayout().backgroundImageUrl})` : "none",
                          backgroundSize: "100% 100%",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat"
                        }}
                      >
                        {/* Grid Blueprint helper if no image */}
                        {!getActiveLayout().backgroundImageUrl && (
                          <div className="absolute inset-0 bg-slate-50/80 border border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center select-none">
                            <Printer className="w-10 h-10 text-slate-300 mb-2" />
                            <span className="text-xs font-bold text-slate-400">تصویر قالب پس‌زمینه را بارگذاری کنید</span>
                            <span className="text-[10px] text-slate-400/80 mt-1 leading-relaxed">فیلدهای زیر همچنان قابل جابجایی و تنظیم هستند.</span>
                          </div>
                        )}

                        {/* Visible absolute fields */}
                        {getActiveLayout().fields.map((field, idx) => {
                          if (!field.visible) return null;
                          const isSelected = selectedFieldIndex === idx;
                          return (
                            <div
                              key={field.key}
                              onMouseDown={(e) => handleFieldDragStart(e, idx)}
                              onTouchStart={(e) => handleFieldDragStart(e, idx)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFieldIndex(idx);
                              }}
                              className={`absolute cursor-move select-none px-2 py-1 rounded transition-shadow font-black text-[#1a2a3a] bg-slate-100/90 border ${
                                isSelected 
                                  ? 'border-blue-500 ring-2 ring-blue-400/20 bg-blue-50/95 shadow-md scale-105 z-10' 
                                  : 'border-slate-300/60 hover:border-slate-400 hover:shadow-xs'
                              }`}
                              style={{
                                right: `${field.x}%`,
                                top: `${field.y}%`,
                                width: `${getFieldPrintWidth(field)}%`,
                                fontSize: `${field.fontSize}px`,
                                direction: "rtl",
                                textAlign: "right",
                                overflowWrap: "anywhere",
                                lineHeight: 1.35,
                                transform: "translateY(-50%)",
                                boxSizing: "border-box"
                              }}
                              title="برای جابجایی بکشید"
                            >
                              <span className="block font-sans text-right">{getMockFieldValue(field.key)}</span>
                              <span className="absolute left-0 top-0 -translate-y-full text-[8px] bg-slate-200/90 text-slate-500 font-bold px-1 rounded font-mono whitespace-nowrap">{Math.round(field.x)}%,{Math.round(field.y)}% · {Math.round(getFieldPrintWidth(field))}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Print settings controls */}
                    <div className="col-span-6 space-y-4">
                      {/* Upload and general template operations */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                        <span className="text-[11px] font-bold text-slate-700 block">انتخاب تصویر قالب فیزیکی فیش (پس‌زمینه):</span>
                        
                        <div className="flex gap-2">
                          <label className="bg-[#1a2a3a] hover:bg-[#253b51] text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 shadow-md">
                            <Upload className="w-3.5 h-3.5" />
                            <span>بارگذاری تصویر قالب...</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePrintBgUpload}
                              className="hidden"
                            />
                          </label>
                          
                          {getActiveLayout().backgroundImageUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                const activeLayout = getActiveLayout();
                                updateActiveLayout({ ...activeLayout, backgroundImageUrl: "" });
                              }}
                              className="border border-rose-200 hover:bg-rose-50 text-rose-600 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                            >
                              حذف تصویر پس‌زمینه
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Orientation Select Toggle */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 select-none">
                        <span className="text-xs font-bold text-slate-700 block">جهت قرارگیری کاغذ سند چاپی:</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const activeLayout = getActiveLayout();
                              updateActiveLayout({ ...activeLayout, orientation: 'portrait' });
                            }}
                            className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                              getActiveLayout().orientation === 'portrait'
                                ? 'bg-[#1a2a3a] text-white border-[#1a2a3a] shadow-xs'
                                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span>عمودی (Portrait)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const activeLayout = getActiveLayout();
                              updateActiveLayout({ ...activeLayout, orientation: 'landscape' });
                            }}
                            className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                              getActiveLayout().orientation === 'landscape'
                                ? 'bg-[#1a2a3a] text-white border-[#1a2a3a] shadow-xs'
                                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span>افقی (Landscape)</span>
                          </button>
                        </div>
                      </div>

                      {/* Fields Visibility & Position List */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3 max-h-[200px] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
                          <span className="text-xs font-bold text-slate-700">لیست فیلدهای چاپی سند:</span>
                          <button
                            type="button"
                            onClick={handleResetLayout}
                            className="text-[10px] text-sky-600 hover:text-sky-700 hover:underline font-black"
                          >
                            بازنشانی به پیش‌فرض
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {getActiveLayout().fields.map((field, idx) => {
                            const isSelected = selectedFieldIndex === idx;
                            return (
                              <div 
                                key={field.key}
                                onClick={() => setSelectedFieldIndex(idx)}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'bg-blue-50 border border-blue-200' 
                                    : 'bg-white hover:bg-slate-100 border border-slate-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const activeLayout = getActiveLayout();
                                      const updatedFields = [...activeLayout.fields];
                                      updatedFields[idx] = { ...field, visible: !field.visible };
                                      updateActiveLayout({ ...activeLayout, fields: updatedFields });
                                      if (selectedFieldIndex === idx && !updatedFields[idx].visible) {
                                        setSelectedFieldIndex(null);
                                      }
                                    }}
                                    className={`p-1 rounded-md transition-colors ${
                                      field.visible 
                                        ? 'text-slate-600 hover:bg-slate-200' 
                                        : 'text-slate-400 hover:bg-slate-200 line-through'
                                    }`}
                                    title={field.visible ? "مخفی کردن" : "نمایش دادن"}
                                  >
                                    {field.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-rose-500" />}
                                  </button>
                                  <span className={`text-[11px] font-black ${field.visible ? 'text-slate-700' : 'text-slate-400'}`}>
                                    {field.label}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                                  {field.visible ? (
                                    <span>X:{Math.round(field.x)}% Y:{Math.round(field.y)}% W:{Math.round(getFieldPrintWidth(field))}%</span>
                                  ) : (
                                    <span className="text-rose-500 font-bold">غیرفعال</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selected Field Detail Positioning Controls */}
                      {selectedFieldIndex !== null && getActiveLayout().fields[selectedFieldIndex] && (
                        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200 space-y-3 animate-fade-in">
                          <div className="flex items-center gap-1.5 border-b border-blue-100 pb-1.5">
                            <span className="text-xs font-black text-blue-800">
                              تنظیم فیلد: {getActiveLayout().fields[selectedFieldIndex].label}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {/* Horizontal Coordinate X */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500">فاصله از راست (X):</span>
                                <span className="text-[10px] font-bold text-blue-700 font-mono">{getActiveLayout().fields[selectedFieldIndex].x}%</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={0.5}
                                value={getActiveLayout().fields[selectedFieldIndex].x}
                                onChange={(e) => {
                                  const activeLayout = getActiveLayout();
                                  const updatedFields = [...activeLayout.fields];
                                  updatedFields[selectedFieldIndex] = { 
                                    ...updatedFields[selectedFieldIndex], 
                                    x: parseFloat(e.target.value) 
                                  };
                                  updateActiveLayout({ ...activeLayout, fields: updatedFields });
                                }}
                                className="w-full accent-blue-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                              />
                            </div>

                            {/* Vertical Coordinate Y */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500">فاصله از بالا (Y):</span>
                                <span className="text-[10px] font-bold text-blue-700 font-mono">{getActiveLayout().fields[selectedFieldIndex].y}%</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={0.5}
                                value={getActiveLayout().fields[selectedFieldIndex].y}
                                onChange={(e) => {
                                  const activeLayout = getActiveLayout();
                                  const updatedFields = [...activeLayout.fields];
                                  updatedFields[selectedFieldIndex] = { 
                                    ...updatedFields[selectedFieldIndex], 
                                    y: parseFloat(e.target.value) 
                                  };
                                  updateActiveLayout({ ...activeLayout, fields: updatedFields });
                                }}
                                className="w-full accent-blue-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                              />
                            </div>

                            {/* Printable field area width */}
                            <div className="space-y-1 col-span-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500">عرض محدودهٔ چاپ:</span>
                                <span className="text-[10px] font-bold text-blue-700 font-mono">{Math.round(getFieldPrintWidth(getActiveLayout().fields[selectedFieldIndex]))}%</span>
                              </div>
                              <input
                                type="range"
                                min={5}
                                max={Math.max(5, Math.floor(100 - getActiveLayout().fields[selectedFieldIndex].x))}
                                step={1}
                                value={getFieldPrintWidth(getActiveLayout().fields[selectedFieldIndex])}
                                onChange={(e) => {
                                  const activeLayout = getActiveLayout();
                                  const updatedFields = [...activeLayout.fields];
                                  updatedFields[selectedFieldIndex] = {
                                    ...updatedFields[selectedFieldIndex],
                                    width: parseFloat(e.target.value)
                                  };
                                  updateActiveLayout({ ...activeLayout, fields: updatedFields });
                                }}
                                className="w-full accent-blue-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                              />
                            </div>

                            {/* Font Size */}
                            <div className="space-y-1 col-span-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500">اندازه فونت متن (Font Size):</span>
                                <span className="text-[10px] font-bold text-blue-700 font-mono">{getActiveLayout().fields[selectedFieldIndex].fontSize}px</span>
                              </div>
                              <input
                                type="range"
                                min={8}
                                max={32}
                                step={1}
                                value={getActiveLayout().fields[selectedFieldIndex].fontSize}
                                onChange={(e) => {
                                  const activeLayout = getActiveLayout();
                                  const updatedFields = [...activeLayout.fields];
                                  updatedFields[selectedFieldIndex] = { 
                                    ...updatedFields[selectedFieldIndex], 
                                    fontSize: parseInt(e.target.value) 
                                  };
                                  updateActiveLayout({ ...activeLayout, fields: updatedFields });
                                }}
                                className="w-full accent-blue-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    {success && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold ml-auto">
                        <CheckCircle className="w-4 h-4 animate-bounce" />
                        <span>تنظیمات چاپ و مختصات فیلدها با موفقیت ذخیره گردید.</span>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 bg-[#e05a2b] hover:bg-[#c9491e] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-100"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "در حال ثبت..." : "ذخیره تغییرات"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isFullscreenPrint && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xs flex flex-col p-4 md:p-6 text-right font-sans animate-fade-in text-slate-100 select-none">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-slate-700 pb-4 mb-4 select-none">
            <div className="flex items-center gap-2.5">
              <Printer className="w-6 h-6 text-[#e05a2b]" />
              <div>
                <h2 className="text-base font-black text-white">میز کار عریضِ طراحی و جانمایی فیلدهای چاپی (حالت بزرگ‌نمایی تمام‌صفحه)</h2>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">در این بخش فیلدها بسیار بزرگ‌تر و با دقت بالا قابل کشیدن و رها کردن هستند.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Sub-tabs selector */}
              <div className="flex bg-slate-800 p-1.5 rounded-xl gap-2 border border-slate-700 text-xs select-none">
                <button
                  type="button"
                  onClick={() => {
                    setPrintSubTab('receipt');
                    setSelectedFieldIndex(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                    printSubTab === 'receipt' ? 'bg-[#1a2a3a] text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  رسید دریافت دستگاه
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrintSubTab('inspection');
                    setSelectedFieldIndex(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                    printSubTab === 'inspection' ? 'bg-[#1a2a3a] text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  بررسی اولیه
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrintSubTab('shipping');
                    setSelectedFieldIndex(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                    printSubTab === 'shipping' ? 'bg-[#1a2a3a] text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ارسال / خروج
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsFullscreenPrint(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-black rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Minimize2 className="w-4 h-4" />
                <span>خروج از حالت تمام‌صفحه</span>
              </button>
            </div>
          </div>

          {/* Core Content: Split view */}
          <div className="flex flex-1 gap-6 overflow-hidden">
            {/* Center: Large Interactive A4 Sheet Canvas */}
            <div className="flex-1 bg-slate-950/40 rounded-2xl border border-slate-800 p-4 flex items-center justify-center overflow-auto">
              <div 
                ref={printPreviewFullscreenContainerRef}
                className={`${getActiveLayout().orientation === 'portrait' ? 'w-[400px] aspect-[1/1.414]' : 'w-[600px] md:w-[700px] lg:w-[800px] aspect-[1.414/1]'} bg-white border border-slate-200 rounded-lg shadow-2xl relative overflow-hidden select-none transition-all duration-300`}
                style={{
                  backgroundImage: getActiveLayout().backgroundImageUrl ? `url(${getActiveLayout().backgroundImageUrl})` : "none",
                  backgroundSize: "100% 100%",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat"
                }}
              >
                {/* Blueprint helper if no image */}
                {!getActiveLayout().backgroundImageUrl && (
                  <div className="absolute inset-0 bg-slate-50/90 border border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center select-none">
                    <Printer className="w-12 h-12 text-slate-300 mb-2" />
                    <span className="text-xs font-bold text-slate-400">تصویر قالب پس‌زمینه را بارگذاری کنید</span>
                    <span className="text-[10px] text-slate-400/80 mt-1 leading-relaxed font-bold">می‌توانید تصویر فیزیکی فیش خود را از منوی سمت راست بارگذاری نمایید.</span>
                  </div>
                )}

                {/* Draggable fields on the large sheet */}
                {getActiveLayout().fields.map((field, idx) => {
                  if (!field.visible) return null;
                  const isSelected = selectedFieldIndex === idx;
                  return (
                    <div
                      key={field.key}
                      onMouseDown={(e) => handleFieldDragStart(e, idx, true)}
                      onTouchStart={(e) => handleFieldDragStart(e, idx, true)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFieldIndex(idx);
                      }}
                      className={`absolute cursor-move select-none px-2.5 py-1 rounded transition-shadow font-black text-[#1a2a3a] bg-slate-100/95 border ${
                        isSelected 
                          ? 'border-blue-500 ring-2 ring-blue-400 bg-blue-50/95 shadow-lg scale-[1.03] z-20' 
                          : 'border-slate-300 hover:border-slate-400 hover:shadow-xs'
                      }`}
                      style={{
                        right: `${field.x}%`,
                        top: `${field.y}%`,
                        width: `${getFieldPrintWidth(field)}%`,
                        fontSize: `${field.fontSize + 2}px`, // slightly scaled for better readability in fullscreen
                        direction: "rtl",
                        textAlign: "right",
                        overflowWrap: "anywhere",
                        lineHeight: 1.35,
                        transform: "translateY(-50%)",
                        boxSizing: "border-box"
                      }}
                    >
                      <span className="block font-sans text-right">{getMockFieldValue(field.key)}</span>
                      <span className="absolute left-0 top-0 -translate-y-full text-[8px] bg-slate-200 text-slate-500 font-bold px-1 rounded font-mono whitespace-nowrap">{Math.round(field.x)}%,{Math.round(field.y)}% · {Math.round(getFieldPrintWidth(field))}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar Controls */}
            <div className="w-80 space-y-4 overflow-y-auto pr-1">
              {/* Image Upload/Operations */}
              <div className="bg-[#1a2a3a] p-4 rounded-xl border border-slate-700 space-y-3">
                <span className="text-xs font-black text-slate-200 block">انتخاب تصویر قالب فیزیکی فیش (پس‌زمینه):</span>
                
                <div className="flex gap-2">
                  <label className="flex-1 text-center bg-[#e05a2b] hover:bg-[#c9491e] text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md">
                    <Upload className="w-4 h-4" />
                    <span>بارگذاری تصویر قالب</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePrintBgUpload}
                      className="hidden"
                    />
                  </label>
                  
                  {getActiveLayout().backgroundImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const activeLayout = getActiveLayout();
                        updateActiveLayout({ ...activeLayout, backgroundImageUrl: "" });
                      }}
                      className="border border-rose-500/30 hover:bg-rose-950/20 text-rose-400 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 animate-fade-in"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </div>

              {/* Orientation Select Toggle in Fullscreen */}
              <div className="bg-[#1a2a3a] p-4 rounded-xl border border-slate-700 space-y-3 select-none">
                <span className="text-xs font-black text-slate-200 block">جهت قرارگیری کاغذ (Orientation):</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const activeLayout = getActiveLayout();
                      updateActiveLayout({ ...activeLayout, orientation: 'portrait' });
                    }}
                    className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                      getActiveLayout().orientation === 'portrait'
                        ? 'bg-[#e05a2b] text-white border-[#e05a2b] shadow-md'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                    }`}
                  >
                    <span>عمودی (Portrait)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const activeLayout = getActiveLayout();
                      updateActiveLayout({ ...activeLayout, orientation: 'landscape' });
                    }}
                    className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                      getActiveLayout().orientation === 'landscape'
                        ? 'bg-[#e05a2b] text-white border-[#e05a2b] shadow-md'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                    }`}
                  >
                    <span>افقی (Landscape)</span>
                  </button>
                </div>
              </div>

              {/* Reset layout option */}
              <div className="flex justify-between items-center bg-slate-800/40 px-4 py-2.5 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-slate-300">طرح‌بندی پیش‌فرض:</span>
                <button
                  type="button"
                  onClick={handleResetLayout}
                  className="text-xs text-sky-400 hover:text-sky-300 font-black hover:underline cursor-pointer"
                >
                  بازنشانی کل مختصات
                </button>
              </div>

              {/* Print fields visibility / list */}
              <div className="bg-[#1a2a3a]/80 p-4 rounded-xl border border-slate-700 space-y-3 max-h-[250px] overflow-y-auto">
                <span className="text-xs font-black text-slate-200 block border-b border-slate-700 pb-1.5">لیست فیلدهای چاپی سند:</span>
                
                <div className="space-y-2">
                  {getActiveLayout().fields.map((field, idx) => {
                    const isSelected = selectedFieldIndex === idx;
                    return (
                      <div 
                        key={field.key}
                        onClick={() => setSelectedFieldIndex(idx)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-blue-950/45 border border-blue-500' 
                            : 'bg-slate-900/60 hover:bg-slate-900 border border-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const activeLayout = getActiveLayout();
                              const updatedFields = [...activeLayout.fields];
                              updatedFields[idx] = { ...field, visible: !field.visible };
                              updateActiveLayout({ ...activeLayout, fields: updatedFields });
                              if (selectedFieldIndex === idx && !updatedFields[idx].visible) {
                                setSelectedFieldIndex(null);
                              }
                            }}
                            className={`p-1 rounded-md transition-colors ${
                              field.visible 
                                ? 'text-slate-300 hover:bg-slate-800' 
                                : 'text-slate-500 hover:bg-slate-800 line-through'
                            }`}
                          >
                            {field.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-rose-500" />}
                          </button>
                          <span className={`text-[11px] font-black ${field.visible ? 'text-slate-200' : 'text-slate-500'}`}>
                            {field.label}
                          </span>
                        </div>

                        <div className="text-[10px] font-mono text-slate-400">
                          {field.visible ? (
                            <span>X:{Math.round(field.x)}% Y:{Math.round(field.y)}% W:{Math.round(getFieldPrintWidth(field))}%</span>
                          ) : (
                            <span className="text-rose-400 font-bold">غیرفعال</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fine-Tuning Controls */}
              {selectedFieldIndex !== null && getActiveLayout().fields[selectedFieldIndex] && (
                <div className="bg-blue-950/40 p-4 rounded-xl border border-blue-900/40 space-y-4 animate-fade-in">
                  <span className="text-xs font-black text-blue-300 block border-b border-blue-900/30 pb-1.5">
                    تنظیم فیلد: {getActiveLayout().fields[selectedFieldIndex].label}
                  </span>

                  <div className="space-y-3">
                    {/* Range X */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[10px] font-bold text-slate-300">فاصله از راست (X):</span>
                        <span className="text-[11px] font-bold text-blue-400 font-mono">{getActiveLayout().fields[selectedFieldIndex].x}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={0.5}
                        value={getActiveLayout().fields[selectedFieldIndex].x}
                        onChange={(e) => {
                          const activeLayout = getActiveLayout();
                          const updatedFields = [...activeLayout.fields];
                          updatedFields[selectedFieldIndex] = { 
                            ...updatedFields[selectedFieldIndex], 
                            x: parseFloat(e.target.value) 
                          };
                          updateActiveLayout({ ...activeLayout, fields: updatedFields });
                        }}
                        className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Printable field area width */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[10px] font-bold text-slate-300">عرض محدودهٔ چاپ:</span>
                        <span className="text-[11px] font-bold text-blue-400 font-mono">{Math.round(getFieldPrintWidth(getActiveLayout().fields[selectedFieldIndex]))}%</span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={Math.max(5, Math.floor(100 - getActiveLayout().fields[selectedFieldIndex].x))}
                        step={1}
                        value={getFieldPrintWidth(getActiveLayout().fields[selectedFieldIndex])}
                        onChange={(e) => {
                          const activeLayout = getActiveLayout();
                          const updatedFields = [...activeLayout.fields];
                          updatedFields[selectedFieldIndex] = {
                            ...updatedFields[selectedFieldIndex],
                            width: parseFloat(e.target.value)
                          };
                          updateActiveLayout({ ...activeLayout, fields: updatedFields });
                        }}
                        className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Range Y */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[10px] font-bold text-slate-300">فاصله از بالا (Y):</span>
                        <span className="text-[11px] font-bold text-blue-400 font-mono">{getActiveLayout().fields[selectedFieldIndex].y}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={0.5}
                        value={getActiveLayout().fields[selectedFieldIndex].y}
                        onChange={(e) => {
                          const activeLayout = getActiveLayout();
                          const updatedFields = [...activeLayout.fields];
                          updatedFields[selectedFieldIndex] = { 
                            ...updatedFields[selectedFieldIndex], 
                            y: parseFloat(e.target.value) 
                          };
                          updateActiveLayout({ ...activeLayout, fields: updatedFields });
                        }}
                        className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Font Size */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[10px] font-bold text-slate-300">اندازه فونت (Font Size):</span>
                        <span className="text-[11px] font-bold text-blue-400 font-mono">{getActiveLayout().fields[selectedFieldIndex].fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min={8}
                        max={32}
                        step={1}
                        value={getActiveLayout().fields[selectedFieldIndex].fontSize}
                        onChange={(e) => {
                          const activeLayout = getActiveLayout();
                          const updatedFields = [...activeLayout.fields];
                          updatedFields[selectedFieldIndex] = { 
                            ...updatedFields[selectedFieldIndex], 
                            fontSize: parseInt(e.target.value) 
                          };
                          updateActiveLayout({ ...activeLayout, fields: updatedFields });
                        }}
                        className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Fast Auto-save notification style info */}
              <div className="text-[10px] text-slate-400 text-center select-none font-bold">
                مختصات به صورت زنده همگام‌سازی می‌شود.
                <br />
                پس از اتمام، برای ذخیره نهایی دکمه پایین را بزنید.
              </div>

              {/* Widescreen save button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 bg-[#e05a2b] hover:bg-[#c9491e] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              >
                <Save className="w-4 h-4" />
                {saving ? "در حال ثبت تغییرات..." : "ذخیره نهایی تنظیمات"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
