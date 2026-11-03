/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { 
  X, Save, Printer, Send, Info, AlertTriangle, CheckCircle,
  FileClock, Wrench, Coins, BadgeCheck, Truck, ClipboardList, PackageCheck,
  MapPin, Phone, Mail
} from "lucide-react";
import { Repair, SystemSettings } from "../types";
import { normalizeRepairCompany, REPAIR_COMPANIES } from "../utils/repairCompany";
import type { SidebarCaseAction } from "./Sidebar";
import { formatJalaliDateInput, finalizeJalaliDate, getTodayJalali } from "../utils/dateUtils";
import { prepareSmsPayload, SmsPayload } from "../utils/smsUtils";

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

interface DetailModalProps {
  repair: Partial<Repair> | null; // null means adding a new item
  isConsignment: boolean; // default classification
  repairs?: Repair[];
  onClose: () => void;
  onSave: (updated: Repair, options?: { sendReceiptSms?: boolean }) => Promise<boolean | void>;
  onSaveAndCreateNext?: (current: Repair) => Promise<Repair | null>;
  onShowNotification: (msg: string, type: 'success' | 'error') => void;
  onOpenRepair?: (repair: Partial<Repair>) => void;
  onRefreshRepairs?: () => Promise<void>;
  onSidebarActionChange?: (action: SidebarCaseAction | null) => void;
  isAdmin?: boolean;
}

export interface DetailModalHandle {
  saveCurrentRecord: () => Promise<boolean>;
}

const DetailModal = React.forwardRef<DetailModalHandle, DetailModalProps>(function DetailModal({
  repair,
  isConsignment,
  repairs = [],
  onClose,
  onSave,
  onSaveAndCreateNext,
  onShowNotification,
  onOpenRepair,
  onRefreshRepairs,
  onSidebarActionChange,
  isAdmin = true,
}: DetailModalProps, ref) {
  const isEdit = !!repair?.id;
  
  // Local state representing the complete Form Model
  const todayFaDate = getTodayJalali();
  const [formState, setFormState] = useState<Partial<Repair>>({
    isConsignment: isConsignment,
    customerName: "",
    deviceModel: "",
    serialNumber: "",
    problem: "",
    accessories: "",
    contactPerson: "",
    contactNumber: "",
    warranty: "درحال بررسی",
    contract: "درحال بررسی",
    receiveDate: isConsignment ? "" : todayFaDate,
    hasReplacement: "ندارد",
    repairCompany: "مکسا",
    initialSendDate: "",
    initialReceiveDate: "",
    initialOtherInfo: "",
    replacementName: "",
    replacementSerial: "",
    replacementAccessories: "",
    replacementSendDate: isConsignment ? todayFaDate : "",
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

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [showRepairPicker, setShowRepairPicker] = useState(false);
  const [repairPickerSearch, setRepairPickerSearch] = useState("");
  const [sendReceiptSmsForNext, setSendReceiptSmsForNext] = useState(false);
  const [pendingNextRecord, setPendingNextRecord] = useState<Partial<Repair> | null>(null);
  const [smsRepairId, setSmsRepairId] = useState<number | undefined>(undefined);
  const [isCreatingNext, setIsCreatingNext] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printType, setPrintType] = useState<'receipt' | 'inspection' | 'shipping'>('receipt');
  const [printWithBackground, setPrintWithBackground] = useState(true);
  const [smsConfirmPayload, setSmsConfirmPayload] = useState<SmsPayload | null>(null);
  const [isSendingSms, setIsSendingSms] = useState(false);

  const getActivePrintLayout = () => {
    if (!settings) return { backgroundImageUrl: "", fields: [], orientation: 'landscape' };
    let layout;
    if (printType === 'receipt') {
      layout = settings.printLayoutReceipt || { backgroundImageUrl: "", fields: DEFAULT_FIELDS_RECEIPT };
    } else if (printType === 'inspection') {
      layout = settings.printLayoutInspection || { backgroundImageUrl: "", fields: DEFAULT_FIELDS_INSPECTION };
    } else {
      layout = settings.printLayoutShipping || { backgroundImageUrl: "", fields: DEFAULT_FIELDS_SHIPPING };
    }
    return {
      ...layout,
      orientation: layout.orientation || 'landscape'
    };
  };

  const getRepairFieldValue = (key: string) => {
    switch (key) {
      case "customerName": return formState.customerName || "—";
      case "receiveDate": return formState.receiveDate || "—";
      case "deviceModel": return formState.deviceModel || "—";
      case "serialNumber": return formState.serialNumber || "—";
      case "accessories": return formState.accessories || "—";
      case "problem": return formState.problem || "—";
      case "contactPerson": return formState.contactPerson || "—";
      case "contactNumber": return formState.contactNumber || "—";
      case "repairCompany": return formState.repairCompany || "—";
      case "initialSendDate": return formState.initialSendDate || "—";
      case "shipDate": return formState.shipDate || "—";
      case "shipMethod": return formState.shipMethod || "—";
      case "trackingCode": return formState.trackingCode || "—";
      case "receiverAddress": return formState.receiverAddress || "—";
      default: return "—";
    }
  };

  // Load active record details or initialize default fields for a new record
  useEffect(() => {
    const todayFa = getTodayJalali();
    if (repair) {
      const isCons = typeof isConsignment !== "undefined" ? isConsignment : !!repair.isConsignment;
      setFormState({
        ...formState,
        ...repair,
        isConsignment: isCons,
        receiveDate: repair.receiveDate || (isCons ? "" : todayFa),
        replacementSendDate: repair.replacementSendDate || (isCons ? todayFa : ""),
        replacementReceiveDate: repair.replacementReceiveDate || "",
        replacementName: repair.replacementName || (isCons && !repair.deviceModel ? repair.deviceModel : "") || "",
        replacementSerial: repair.replacementSerial || (isCons && !repair.serialNumber ? repair.serialNumber : "") || "",
        replacementAccessories: repair.replacementAccessories || (isCons && !repair.accessories ? repair.accessories : "") || "",
      });
    } else {
      setFormState((prev) => ({
        ...prev,
        isConsignment: isConsignment,
        receiveDate: isConsignment ? "" : (prev.receiveDate || todayFa),
        replacementSendDate: isConsignment ? (prev.replacementSendDate || todayFa) : prev.replacementSendDate,
        replacementReceiveDate: prev.replacementReceiveDate || "",
      }));
    }
    // Load settings for SMS templates
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch((err) => console.error(err));
  }, [repair, isConsignment]);

  useEffect(() => {
    if (!formState.isConsignment) {
      if (isAdmin && onSaveAndCreateNext) {
        onSidebarActionChange?.({
          label: isCreatingNext ? "در حال ثبت..." : "ذخیره و دریافت دستگاه جدید",
          icon: "save",
          disabled: isCreatingNext,
          onClick: () => { void handleSaveAndCreateNext(); },
          checkbox: {
            label: "پس از ذخیره این پرونده، پیامک دریافت ارسال شود",
            checked: sendReceiptSmsForNext,
            onChange: setSendReceiptSmsForNext,
            disabled: isCreatingNext,
          },
        });
      } else {
        onSidebarActionChange?.(null);
      }
      return;
    }

    const isReplacementCase = !!formState.deviceModel?.trim() && !!formState.replacementName?.trim();
    const relatedRepair = formState.relatedRepairId
      ? repairs.find((item) => String(item.id) === String(formState.relatedRepairId) && !!item.deviceModel?.trim())
      : undefined;
    const hasUnsavedRepairLink = !!formState.relatedRepairId &&
      String(repair?.relatedRepairId || "") !== String(formState.relatedRepairId);

    if (isReplacementCase) {
      onSidebarActionChange?.({
        label: "رفتن به پرونده تعمیری",
        icon: "repair",
        onClick: () => setFormState((prev) => ({ ...prev, isConsignment: false })),
      });
    } else if (relatedRepair && onOpenRepair && !hasUnsavedRepairLink) {
      onSidebarActionChange?.({
        label: "رفتن به پرونده تعمیری",
        icon: "repair",
        onClick: () => onOpenRepair(relatedRepair),
      });
    } else {
      onSidebarActionChange?.({
        label: "اتصال به پرونده تعمیری",
        icon: "link",
        onClick: () => setShowRepairPicker(true),
      });
    }

  }, [
    formState,
    formState.isConsignment,
    isAdmin,
    isCreatingNext,
    repair?.relatedRepairId,
    repairs,
    sendReceiptSmsForNext,
    onSidebarActionChange,
  ]);

  useEffect(() => () => onSidebarActionChange?.(null), [onSidebarActionChange]);

  const handleInputChange = (field: keyof Repair, value: any) => {
    let formattedVal = value;
    if (
      typeof value === "string" &&
      ["receiveDate", "initialSendDate", "initialReceiveDate", "replacementSendDate", "replacementReceiveDate", "shipDate"].includes(field)
    ) {
      formattedVal = formatJalaliDateInput(value);
    }
    setFormState((prev) => ({ ...prev, [field]: formattedVal }));
  };

  const handleDateBlur = (field: keyof Repair) => {
    const val = formState[field];
    if (typeof val === "string" && val) {
      setFormState((prev) => ({ ...prev, [field]: finalizeJalaliDate(val) }));
    }
  };

  const isConsignmentMode = !formState.deviceModel?.trim() && !formState.serialNumber?.trim();

  const handleStepClick = (stepNum: number) => {
    handleInputChange("currentStep", stepNum);
  };

  const getFinalizedRecord = (): Repair => {
    const savedState = { ...formState };
    const dateKeys: (keyof Repair)[] = [
      "receiveDate",
      "initialSendDate",
      "initialReceiveDate",
      "replacementSendDate",
      "replacementReceiveDate",
      "shipDate",
    ];
    dateKeys.forEach((key) => {
      if (typeof savedState[key] === "string" && savedState[key]) {
        (savedState as any)[key] = finalizeJalaliDate(savedState[key] as string);
      }
    });

    if (formState.isConsignment) {
      savedState.isConsignment = true;
      savedState.hasReplacement = "دارد";
    }
    return savedState as Repair;
  };

  // Submit whole record to parent
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) {
      onShowNotification("شما مجوز انجام این عملیات را ندارید.", "error");
      return;
    }
    if (!isEdit) {
      const isFormEmpty = !Object.entries(formState).some(([key, val]) => {
        if (["isConsignment", "currentStep", "id", "receiveDate", "warranty", "contract", "hasReplacement", "repairCompany", "costApproved", "paymentStatus", "shipMethod"].includes(key)) {
          return false;
        }
        return typeof val === "string" && val.trim() !== "";
      });
      if (isFormEmpty) {
        setShowEmptyConfirm(true);
        return;
      }
    }
    onSave(getFinalizedRecord());
  };

  useImperativeHandle(ref, () => ({
    saveCurrentRecord: async () => {
      if (!isAdmin) return false;

      if (!isEdit) {
        const isFormEmpty = !Object.entries(formState).some(([key, value]) => {
          if (["isConsignment", "currentStep", "id", "receiveDate", "warranty", "contract", "hasReplacement", "repairCompany", "costApproved", "paymentStatus", "shipMethod"].includes(key)) {
            return false;
          }
          return typeof value === "string" && value.trim() !== "";
        });
        if (isFormEmpty) {
          onShowNotification("پرونده خالی است و چیزی برای ذخیره ندارد.", "error");
          return false;
        }
      }

      const saved = await onSave(getFinalizedRecord());
      return saved !== false;
    },
  }), [formState, isAdmin, isEdit, onSave, onShowNotification]);

  const handleSaveAndCreateNext = async () => {
    if (!isAdmin || !onSaveAndCreateNext) return;
    const currentRecord = getFinalizedRecord();
    if (!currentRecord.customerName?.trim() || !currentRecord.deviceModel?.trim()) {
      onShowNotification("برای دریافت دستگاه جدید، نام شرکت و مدل دستگاه را وارد کنید.", "error");
      return;
    }
    if (sendReceiptSmsForNext && !currentRecord.contactNumber?.trim()) {
      onShowNotification("برای ارسال پیامک دریافت، شماره تماس رابط را وارد کنید.", "error");
      return;
    }

    const nextRecord: Repair = {
      id: 0,
      isConsignment: false,
      customerName: currentRecord.customerName,
      deviceModel: currentRecord.deviceModel,
      serialNumber: "",
      problem: "",
      accessories: "",
      contactPerson: currentRecord.contactPerson,
      contactNumber: currentRecord.contactNumber,
      warranty: "درحال بررسی",
      contract: "درحال بررسی",
      receiveDate: currentRecord.receiveDate || getTodayJalali(),
      hasReplacement: "ندارد",
      repairCompany: normalizeRepairCompany(currentRecord.repairCompany),
      initialSendDate: "",
      initialReceiveDate: "",
      initialOtherInfo: "",
      replacementName: "",
      replacementSerial: "",
      replacementAccessories: "",
      replacementSendDate: "",
      replacementReceiveDate: "",
      invoiceNumber: "",
      quotedCost: "",
      costApproved: "درحال بررسی",
      paymentStatus: "درحال بررسی",
      shipDate: "",
      shipMethod: "ارسال نشده",
      trackingCode: "",
      receiverAddress: "",
      relatedRepairId: "",
      smsSentReceipt: false,
      smsSentInspection: false,
      smsSentCost: false,
      smsSentCostApproved: false,
      smsSentReplacement: false,
      smsSentShipping: false,
      currentStep: 1,
    };

    setIsCreatingNext(true);
    try {
      const savedCurrent = await onSaveAndCreateNext(currentRecord);
      if (!savedCurrent) return;

      if (sendReceiptSmsForNext) {
        setFormState(savedCurrent);
        setPendingNextRecord({ ...nextRecord, id: undefined });
        setSmsRepairId(savedCurrent.id);
        setSmsConfirmPayload(prepareSmsPayload("receipt", savedCurrent, settings || undefined));
      } else {
        onOpenRepair?.({ ...nextRecord, id: undefined });
      }
    } finally {
      setIsCreatingNext(false);
    }
  };

  // Print function
  const handlePrint = async () => {
    try {
      const res = await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formState.id || 9999,
          documentType: formState.isConsignment ? "فیش امانی" : "قبض پذیرش تعمیرات"
        }),
      });
      const data = await res.json();
      if (data.success) {
        onShowNotification(data.message, "success");
      }
    } catch (err) {
      onShowNotification("برقراری ارتباط با پرینتر ناموفق بود.", "error");
    }
  };

  const handleCardPrint = async (cardName: string) => {
    let type: 'receipt' | 'inspection' | 'shipping' = 'receipt';
    if (cardName === "دریافت دستگاه") {
      type = 'receipt';
    } else if (cardName === "بررسی اولیه") {
      type = 'inspection';
    } else if (cardName === "ارسال") {
      type = 'shipping';
    }

    try {
      localStorage.setItem("print_repair_data", JSON.stringify(formState));
      localStorage.setItem("print_type", type);
      const dataParam = encodeURIComponent(JSON.stringify(formState));
      const idParam = formState.id ? `&id=${formState.id}` : "";
      window.open(window.location.origin + window.location.pathname + `?print_page=true&type=${type}${idParam}&data=${dataParam}`, "_blank");
    } catch (err) {
      console.error("Failed to open print tab:", err);
      setPrintType(type);
      setShowPrintPreview(true);
    }
  };

  // Helper to initiate SMS confirmation dialog
  const triggerSms = (smsType: 'receipt' | 'inspection' | 'cost' | 'cost_approved' | 'replacement' | 'shipping') => {
    if (!isAdmin) {
      onShowNotification("شما مجوز انجام این عملیات را ندارید.", "error");
      return;
    }
    if (!formState.contactNumber) {
      onShowNotification("شماره تماسی برای شخص رابط وارد نشده است.", "error");
      return;
    }

    // Build payload according to C# app logic and Payamak-Panel SendByBaseNumber parameters
    const payload = prepareSmsPayload(smsType, formState, settings || undefined);
    setSmsRepairId(formState.id);
    setSmsConfirmPayload(payload);
  };

  const cancelSmsConfirmation = () => {
    const nextRecord = pendingNextRecord;
    setSmsConfirmPayload(null);
    setSmsRepairId(undefined);
    setPendingNextRecord(null);
    if (nextRecord) onOpenRepair?.(nextRecord);
  };

  // Confirm and execute the SMS transmission
  const confirmAndSendSms = async () => {
    if (!smsConfirmPayload) return;
    setIsSendingSms(true);

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: smsConfirmPayload.phone,
          smsType: smsConfirmPayload.smsType,
          bodyId: smsConfirmPayload.bodyId,
          variables: smsConfirmPayload.variables,
          message: smsConfirmPayload.previewMessage,
          repairId: smsRepairId
        }),
      });
      const data = await res.json();
      if (data.success) {
        onShowNotification(data.message || "✅ پیامک با موفقیت ارسال شد.", "success");

        const smsStep: Record<SmsPayload["smsType"], number> = {
          receipt: 1,
          inspection: 2,
          cost: 3,
          cost_approved: 3,
          replacement: 4,
          shipping: 5,
        };
        const updatedState = {
          ...formState,
          [smsConfirmPayload.dbField]: true,
          currentStep: smsStep[smsConfirmPayload.smsType],
        };
        setFormState(updatedState);
        const nextRecord = pendingNextRecord;
        setSmsConfirmPayload(null);
        setSmsRepairId(undefined);
        setPendingNextRecord(null);
        if (nextRecord) {
          await onRefreshRepairs?.();
          onOpenRepair?.(nextRecord);
        } else if (isEdit) {
          onSave(updatedState as Repair);
        }
      } else {
        onShowNotification(data.error || "خطا در ارسال پیامک.", "error");
      }
    } catch (err: any) {
      onShowNotification("ارسال پیامک با خطا مواجه شد: " + (err.message || "خطای ناشناخته"), "error");
    } finally {
      setIsSendingSms(false);
    }
  };

  // Stepper titles
  const stepItems = [
    { num: 1, title: "دریافت دستگاه", icon: ClipboardList },
    { num: 2, title: "بررسی اولیه", icon: Wrench },
    { num: 3, title: "اعلام هزینه", icon: Coins },
    { num: 4, title: "تایید نهایی و پرداخت", icon: BadgeCheck },
    { num: 5, title: "تحویل و ارسال", icon: Truck },
  ];

  return (
    <div className="fixed inset-y-0 left-0 right-[272px] z-50 flex bg-[#ebf2fc] overflow-hidden select-none font-sans text-right" dir="rtl" id="detail-modal-overlay">
      <div className="relative flex-1 flex flex-col overflow-hidden p-6 w-full max-w-[1600px] mx-auto" id="detail-modal-workspace">
        
        {formState.isConsignment ? (
          // ==================== CUSTOM 3-CARD AMANI FORM VIEW ====================
          <div className="flex-1 flex flex-col overflow-hidden h-full" id="amani-form-view">
            
            {/* Header row */}
            <div className="flex items-center justify-between shrink-0 mb-6" id="amani-header" dir="ltr">
              <div className="inline-flex shrink-0 flex-col items-center gap-1 rounded-xl border border-slate-300/80 bg-white/80 p-1 shadow-sm">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e05a2b] text-white transition-colors hover:bg-[#c9491e] cursor-pointer"
                  id="amani-close-btn"
                  title="بستن پرونده"
                  aria-label="بستن پرونده"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1a2a3a] text-white transition-colors hover:bg-[#253b51] cursor-pointer"
                  id="amani-submit-btn"
                  title="ذخیره پرونده"
                  aria-label="ذخیره پرونده"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
              <div></div>
            </div>

            {/* 3-Card Grid container (RTL order: Card 1 on right, Card 2 in middle, Card 3 on left) */}
            <div className="flex-1 overflow-y-auto px-1 pt-10 pb-6" id="amani-cards-container">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                
                {/* Column 1 (Rightmost): اطلاعات شرکت */}
                <div className="flex flex-col h-full">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 pt-10 relative flex flex-col justify-between shadow-sm h-full flex-1 min-h-[380px]">
                    <div className="absolute -top-7 right-6 bg-[#f0642f] text-white text-[11px] font-black px-5 py-1.5 rounded-t-xl shadow-xs select-none">
                      اطلاعات شرکت
                    </div>
                    
                    <div className="space-y-4 flex-1">
                      {/* نام شرکت */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[105px]">
                          نام شرکت:
                        </label>
                        <input
                          type="text"
                          value={formState.customerName || ""}
                          onChange={(e) => handleInputChange("customerName", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold"
                        />
                      </div>

                      {/* نام رابط */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[105px]">
                          نام رابط:
                        </label>
                        <input
                          type="text"
                          value={formState.contactPerson || ""}
                          onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold"
                        />
                      </div>

                      {/* شماره تماس */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[105px]">
                          شماره تماس:
                        </label>
                        <input
                          type="text"
                          value={formState.contactNumber || ""}
                          onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold font-mono text-left"
                          dir="ltr"
                        />
                      </div>

                      {/* قرارداد */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[105px]">
                          قرارداد:
                        </label>
                        <select
                          value={formState.contract || "درحال بررسی"}
                          onChange={(e) => handleInputChange("contract", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer font-bold appearance-none text-right"
                        >
                          <option value="درحال بررسی">درحال بررسی</option>
                          <option value="دارد">دارد</option>
                          <option value="ندارد">ندارد</option>
                        </select>
                      </div>

                      {/* سایر اطلاعات */}
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[105px] pt-1.5">
                          سایر اطلاعات:
                        </label>
                        <textarea
                          rows={3}
                          value={formState.initialOtherInfo || ""}
                          onChange={(e) => handleInputChange("initialOtherInfo", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold resize-none h-[80px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2 (Middle): اطلاعات دستگاه */}
                <div className="flex flex-col h-full">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 pt-10 relative flex flex-col justify-between shadow-sm h-full flex-1 min-h-[380px]">
                    <div className="absolute -top-7 right-6 bg-[#f0642f] text-white text-[11px] font-black px-5 py-1.5 rounded-t-xl shadow-xs select-none">
                      مشخصات دستگاه جایگزین
                    </div>
                    
                    <div className="space-y-4 flex-1">
                      {/* مدل */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[125px]">
                          مدل دستگاه جایگزین:
                        </label>
                        <input
                          type="text"
                          value={formState.replacementName || ""}
                          onChange={(e) => handleInputChange("replacementName", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold text-center"
                        />
                      </div>

                      {/* شماره سریال */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[125px]">
                          سریال دستگاه جایگزین:
                        </label>
                        <input
                          type="text"
                          value={formState.replacementSerial || ""}
                          onChange={(e) => handleInputChange("replacementSerial", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold font-mono text-center"
                          dir="ltr"
                        />
                      </div>

                      {/* متعلقات */}
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[125px] pt-1.5">
                          متعلقات دستگاه جایگزین:
                        </label>
                        <textarea
                          rows={6}
                          value={formState.replacementAccessories || ""}
                          onChange={(e) => handleInputChange("replacementAccessories", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold resize-none h-[155px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3 (Leftmost): ارسال */}
                <div className="flex flex-col h-full">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 pt-10 relative flex flex-col justify-between shadow-sm h-full flex-1 min-h-[380px]">
                    <div className="absolute -top-7 right-6 bg-[#f0642f] text-white text-[11px] font-black px-5 py-1.5 rounded-t-xl shadow-xs select-none">
                      ارسال و دریافت جایگزین
                    </div>
                    
                    <div className="space-y-4 flex-1">
                      {/* تاریخ ارسال */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[125px]">
                          تاریخ ارسال جایگزین:
                        </label>
                        <input
                          type="text"
                          placeholder="140X/XX/XX"
                          value={formState.replacementSendDate || ""}
                          onChange={(e) => handleInputChange("replacementSendDate", e.target.value)}
                          onBlur={() => handleDateBlur("replacementSendDate")}
                          maxLength={10}
                          disabled={!isAdmin}
                          dir="ltr"
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold text-center"
                        />
                      </div>

                      {/* تاریخ دریافت */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[125px]">
                          تاریخ دریافت جایگزین:
                        </label>
                        <input
                          type="text"
                          placeholder="140X/XX/XX"
                          value={formState.replacementReceiveDate || ""}
                          onChange={(e) => handleInputChange("replacementReceiveDate", e.target.value)}
                          onBlur={() => handleDateBlur("replacementReceiveDate")}
                          maxLength={10}
                          disabled={!isAdmin}
                          dir="ltr"
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold text-center text-slate-700"
                        />
                      </div>

                      {/* نحوه ارسال */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[105px]">
                          نحوه ارسال:
                        </label>
                        <select
                          value={formState.shipMethod || "ارسال نشده"}
                          onChange={(e) => handleInputChange("shipMethod", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer font-bold appearance-none text-center"
                        >
                          <option value="ارسال نشده">ارسال نشده</option>
                          <option value="پیک شرکت">پیک</option>
                          <option value="پیک مشتری">پیک مشتری</option>
                          <option value="تحویل حضوری">تحویل حضوری</option>
                        </select>
                      </div>

                      {/* تلفن/کد رهگیری */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[105px]">
                          تلفن/کد رهگیری:
                        </label>
                        <input
                          type="text"
                          value={formState.trackingCode || ""}
                          onChange={(e) => handleInputChange("trackingCode", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold"
                        />
                      </div>

                      {/* آدرس ارسال */}
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[105px] pt-1.5">
                          آدرس ارسال:
                        </label>
                        <textarea
                          rows={3}
                          value={formState.receiverAddress || ""}
                          onChange={(e) => handleInputChange("receiverAddress", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold resize-none h-[80px]"
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => triggerSms('shipping')}
                        className={`sms-shipping-button w-full py-2.5 text-xs font-black rounded-lg transition-colors cursor-pointer text-center shadow-md active:scale-98 border border-[#1a2a3a] ${
                          formState.smsSentShipping
                            ? "sms-shipping-button-sent bg-white text-[#1a2a3a] hover:bg-slate-100"
                            : "bg-[#1a2a3a] hover:bg-[#253b51] text-white"
                        }`}
                      >
                        پیامک اطلاعات ارسال
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        ) : (
          // ==================== ORIGINAL 5-STEP REPAIR FORM VIEW ====================
          <>
            {/* Header bar: Large Chevron Stepper + Action Buttons on the left */}
            <div className="flex items-center justify-between gap-6 mb-8 shrink-0" id="detail-workspace-header">
              
              {/* Large horizontal arrow stepper */}
              <div className="flex-1 flex items-stretch gap-1 bg-[#d7e5f5] rounded-xl overflow-hidden p-1.5 shadow-sm h-16 md:h-18" id="stepper-arrow-container">
                {stepItems.map((step) => {
                  const isActive = formState.currentStep === step.num;
                  const StepIcon = step.icon;

                  let bgClass = "bg-[#a2c4e3] text-slate-800";
                  if (step.num === 2) bgClass = "bg-[#7ca2c5] text-slate-100";
                  else if (step.num === 3) bgClass = "bg-[#5a83a9] text-white";
                  else if (step.num === 4) bgClass = "bg-[#3a6187] text-white";
                  else if (step.num === 5) bgClass = "bg-[#244866] text-white";

                  let clipPath = "polygon(16px 0%, 100% 0%, calc(100% - 16px) 50%, 100% 100%, 16px 100%, 0% 50%)";
                  if (step.num === 1) {
                    clipPath = "polygon(16px 0%, 100% 0%, 100% 100%, 16px 100%, 0% 50%)";
                  } else if (step.num === 5) {
                    clipPath = "polygon(0% 0%, 100% 0%, calc(100% - 16px) 50%, 100% 100%, 0% 100%)";
                  }

                  if (isActive) {
                    return (
                      <button
                        key={step.num}
                        type="button"
                        onClick={() => handleStepClick(step.num)}
                        style={{ clipPath }}
                        className="flex-1 py-2.5 pl-2 pr-6 bg-[#0e2238] text-[#f0642f] flex flex-row items-center justify-center gap-2 z-10 scale-102 shadow-lg border-y-2 border-l border-orange-500/50 transition-all duration-300 cursor-pointer font-black"
                      >
                        <StepIcon className="w-5 h-5 shrink-0 stroke-[2.5]" />
                        <span className="text-xs sm:text-sm tracking-tight font-black whitespace-nowrap">{step.title}</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={step.num}
                      type="button"
                      onClick={() => handleStepClick(step.num)}
                      style={{ clipPath }}
                      className={`flex-1 py-2.5 pl-2 pr-6 ${bgClass} hover:opacity-90 flex flex-row items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer`}
                    >
                      <StepIcon className="w-4 h-4 opacity-90 shrink-0" />
                      <span className="text-xs font-black tracking-tight whitespace-nowrap">{step.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Action buttons on the left side of the header bar */}
              <div className="inline-flex shrink-0 flex-col items-center gap-1 rounded-xl border border-slate-300/80 bg-white/80 p-1 shadow-sm" dir="ltr">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e05a2b] text-white transition-colors hover:bg-[#c9491e] cursor-pointer"
                  id="detail-close-btn"
                  title="بستن پرونده"
                  aria-label="بستن پرونده"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1a2a3a] text-white transition-colors hover:bg-[#253b51] cursor-pointer"
                  id="detail-save-btn"
                  title="ذخیره اطلاعات"
                  aria-label="ذخیره پرونده"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Card Grid container (3 columns in RTL order) */}
            <div className="flex-1 overflow-y-auto px-1 pt-10 pb-6" id="cards-grid-container">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                
                {/* Column 1 (Rightmost): دریافت دستگاه */}
                <div className="flex flex-col h-full">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 pt-10 relative flex flex-col justify-between shadow-sm h-full flex-1">
                    
                    {/* Absolute top-right Tab Header */}
                    <div className="absolute -top-7 right-6 bg-[#1a344d] text-white text-[11px] font-black px-5 py-1.5 rounded-t-xl shadow-xs">
                      دریافت دستگاه
                    </div>

                    <div className="space-y-4 flex-1">
                      {/* نام شرکت */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          نام شرکت:
                        </label>
                        <input
                          type="text"
                          placeholder=""
                          value={formState.customerName || ""}
                          onChange={(e) => handleInputChange("customerName", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold"
                        />
                      </div>

                      {/* مدل دستگاه */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          مدل دستگاه:
                        </label>
                        <input
                          type="text"
                          placeholder=""
                          value={formState.deviceModel || ""}
                          onChange={(e) => handleInputChange("deviceModel", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold"
                        />
                      </div>

                      {/* شماره سریال */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          شماره سریال:
                        </label>
                        <input
                          type="text"
                          placeholder=""
                          value={formState.serialNumber || ""}
                          onChange={(e) => handleInputChange("serialNumber", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold font-mono text-left"
                          dir="ltr"
                        />
                      </div>

                      {/* مشکل دستگاه */}
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px] pt-2">
                          مشکل دستگاه:
                        </label>
                        <textarea
                          rows={3}
                          placeholder=""
                          value={formState.problem || ""}
                          onChange={(e) => handleInputChange("problem", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold resize-none min-h-[72px] h-[72px]"
                        />
                      </div>

                      {/* متعلقات */}
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px] pt-2">
                          متعلقات:
                        </label>
                        <textarea
                          rows={3}
                          placeholder=""
                          value={formState.accessories || ""}
                          onChange={(e) => handleInputChange("accessories", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold resize-none min-h-[72px] h-[72px]"
                        />
                      </div>

                      {/* نام رابط */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          نام رابط:
                        </label>
                        <input
                          type="text"
                          placeholder=""
                          value={formState.contactPerson || ""}
                          onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold"
                        />
                      </div>

                      {/* شماره تماس */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          شماره تماس:
                        </label>
                        <input
                          type="text"
                          placeholder=""
                          value={formState.contactNumber || ""}
                          onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold font-mono text-left"
                          dir="ltr"
                        />
                      </div>

                      {/* گارانتی */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          گارانتی:
                        </label>
                        <select
                          value={formState.warranty || "درحال بررسی"}
                          onChange={(e) => handleInputChange("warranty", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer font-bold appearance-none"
                        >
                          <option value="درحال بررسی">درحال بررسی</option>
                          <option value="دارد">دارد</option>
                          <option value="ندارد">ندارد</option>
                        </select>
                      </div>

                      {/* قرارداد */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          قرارداد:
                        </label>
                        <select
                          value={formState.contract || "درحال بررسی"}
                          onChange={(e) => handleInputChange("contract", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer font-bold appearance-none"
                        >
                          <option value="درحال بررسی">درحال بررسی</option>
                          <option value="دارد">دارد</option>
                          <option value="ندارد">ندارد</option>
                        </select>
                      </div>

                      {/* تاریخ دریافت */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          تاریخ دریافت:
                        </label>
                        <input
                          type="text"
                          placeholder="140X/XX/XX"
                          value={formState.receiveDate || ""}
                          onChange={(e) => handleInputChange("receiveDate", e.target.value)}
                          onBlur={() => handleDateBlur("receiveDate")}
                          maxLength={10}
                          disabled={!isAdmin}
                          dir="ltr"
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold text-center"
                        />
                      </div>
                    </div>

                    <div className="mt-6 pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => triggerSms('receipt')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center shadow-xs ${
                          formState.smsSentReceipt
                            ? "bg-white text-[#f0642f] border border-[#f0642f] hover:bg-orange-50/50"
                            : "bg-[#f0642f] hover:bg-[#d9531e] text-white"
                        }`}
                      >
                        پیامک دریافت دستگاه
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCardPrint("دریافت دستگاه")}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs border border-slate-300 shrink-0"
                        title="چاپ رسید دریافت دستگاه"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>پرینت</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Column 2 (Middle): بررسی اولیه & اعلام هزینه */}
                <div className="flex flex-col gap-8 h-full">
                  
                  {/* Card 2: بررسی اولیه */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 pt-10 relative flex flex-col justify-between shadow-sm flex-1">
                    
                    <div className="absolute -top-7 right-6 bg-[#1a344d] text-white text-[11px] font-black px-5 py-1.5 rounded-t-xl shadow-xs">
                      بررسی اولیه
                    </div>

                    <div className="space-y-4 flex-1">
                      {/* شرکت تعمیر کننده */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          شرکت تعمیر کننده:
                        </label>
                        <select
                          value={normalizeRepairCompany(formState.repairCompany)}
                          onChange={(e) => handleInputChange("repairCompany", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer font-bold appearance-none"
                        >
                          {REPAIR_COMPANIES.map((company) => (
                            <option key={company} value={company}>{company}</option>
                          ))}
                        </select>
                      </div>

                      {/* تاریخ ارسال */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          تاریخ ارسال:
                        </label>
                        <input
                          type="text"
                          placeholder="140X/XX/XX"
                          value={formState.initialSendDate || ""}
                          onChange={(e) => handleInputChange("initialSendDate", e.target.value)}
                          onBlur={() => handleDateBlur("initialSendDate")}
                          maxLength={10}
                          disabled={!isAdmin}
                          dir="ltr"
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold text-center"
                        />
                      </div>

                      {/* تاریخ دریافت */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          تاریخ دریافت:
                        </label>
                        <input
                          type="text"
                          placeholder="140X/XX/XX"
                          value={formState.initialReceiveDate || ""}
                          onChange={(e) => handleInputChange("initialReceiveDate", e.target.value)}
                          onBlur={() => handleDateBlur("initialReceiveDate")}
                          maxLength={10}
                          disabled={!isAdmin}
                          dir="ltr"
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold text-center"
                        />
                      </div>

                      {/* سایر اطلاعات */}
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px] mt-1.5">
                          سایر اطلاعات:
                        </label>
                        <textarea
                          rows={3}
                          placeholder=""
                          value={formState.initialOtherInfo || ""}
                          onChange={(e) => handleInputChange("initialOtherInfo", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none font-bold"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => triggerSms('inspection')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center shadow-xs ${
                          formState.smsSentInspection
                            ? "bg-white text-[#f0642f] border border-[#f0642f] hover:bg-orange-50/50"
                            : "bg-[#f0642f] hover:bg-[#d9531e] text-white"
                        }`}
                      >
                        پیامک بررسی اولیه
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCardPrint("بررسی اولیه")}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs border border-slate-300 shrink-0"
                        title="چاپ برگه بررسی اولیه"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>پرینت</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 3: اعلام هزینه */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 pt-10 relative flex flex-col justify-between shadow-sm flex-1">
                    
                    {/* Absolute top-right Tab Header */}
                    <div className="absolute -top-7 right-6 bg-[#1a344d] text-white text-[11px] font-black px-5 py-1.5 rounded-t-xl shadow-xs">
                      اعلام هزینه
                    </div>

                    <div className="space-y-4 flex-1">
                      {/* شماره فاکتور */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          شماره فاکتور:
                        </label>
                        <input
                          type="text"
                          placeholder=""
                          value={formState.invoiceNumber || ""}
                          onChange={(e) => handleInputChange("invoiceNumber", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold font-mono text-left"
                          dir="ltr"
                        />
                      </div>

                      {/* هزینه اعلام شده */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          هزینه اعلام شده:
                        </label>
                        <input
                          type="text"
                          placeholder=""
                          value={formState.quotedCost || ""}
                          onChange={(e) => handleInputChange("quotedCost", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold"
                        />
                      </div>

                      {/* تائید اعلام هزینه */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          تائید اعلام هزینه:
                        </label>
                        <select
                          value={formState.costApproved || "درحال بررسی"}
                          onChange={(e) => handleInputChange("costApproved", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer font-bold appearance-none"
                        >
                          <option value="درحال بررسی">درحال بررسی</option>
                          <option value="شده است">شده است</option>
                          <option value="نشده است">نشده است</option>
                        </select>
                      </div>

                      {/* وضعیت پرداخت */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          وضعیت پرداخت:
                        </label>
                        <select
                          value={formState.paymentStatus || "درحال بررسی"}
                          onChange={(e) => handleInputChange("paymentStatus", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer font-bold appearance-none"
                        >
                          <option value="درحال بررسی">درحال بررسی</option>
                          <option value="شده است">شده است</option>
                          <option value="نشده است">نشده است</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => triggerSms('cost')}
                        className={`flex-1 py-2 text-[11px] font-extrabold rounded-lg transition-colors cursor-pointer text-center shadow-xs ${
                          formState.smsSentCost
                            ? "bg-white text-[#f0642f] border border-[#f0642f] hover:bg-orange-50/50"
                            : "bg-[#f0642f] hover:bg-[#d9531e] text-white"
                        }`}
                      >
                        پیامک اعلام هزینه
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerSms('cost_approved')}
                        className={`flex-1 py-2 text-[11px] font-extrabold rounded-lg transition-colors cursor-pointer text-center shadow-xs ${
                          formState.smsSentCostApproved
                            ? "bg-white text-[#f0642f] border border-[#f0642f] hover:bg-orange-50/50"
                            : "bg-[#f0642f] hover:bg-[#d9531e] text-white"
                        }`}
                      >
                        پیامک تایید اعلام هزینه
                      </button>
                    </div>
                  </div>

                </div>

                {/* Column 3 (Left): دستگاه جایگزین & ارسال */}
                <div className="flex flex-col gap-8 h-full">
                  
                  {/* Card 4: دستگاه جایگزین */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 pt-10 relative flex flex-col justify-between shadow-sm flex-1">
                    <div className="absolute -top-7 right-6 bg-[#1a344d] text-white text-[11px] font-black px-5 py-1.5 rounded-t-xl shadow-xs flex items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        id="has-replacement-toggle"
                        checked={formState.hasReplacement === "دارد"}
                        disabled={!isAdmin}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          handleInputChange("hasReplacement", isChecked ? "دارد" : "ندارد");
                        }}
                        className="w-3.5 h-3.5 accent-[#f0642f] bg-white border-slate-300 rounded cursor-pointer disabled:cursor-not-allowed"
                      />
                      <label htmlFor="has-replacement-toggle" className="cursor-pointer">
                        دستگاه جایگزین
                      </label>
                    </div>

                    <div className="space-y-4 flex-1">
                      {/* بدنه فیلدها با امکان فعال‌سازی پویا */}
                      <div className={`space-y-4 transition-all duration-300 ${formState.hasReplacement === "دارد" ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                        {/* نام دستگاه */}
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                            نام دستگاه:
                          </label>
                          <input
                            type="text"
                            placeholder=""
                            value={formState.replacementName || ""}
                            onChange={(e) => handleInputChange("replacementName", e.target.value)}
                            disabled={!isAdmin || formState.hasReplacement !== "دارد"}
                            className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold"
                          />
                        </div>

                        {/* شماره سریال */}
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                            شماره سریال:
                          </label>
                          <input
                            type="text"
                            placeholder=""
                            value={formState.replacementSerial || ""}
                            onChange={(e) => handleInputChange("replacementSerial", e.target.value)}
                            disabled={!isAdmin || formState.hasReplacement !== "دارد"}
                            className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold font-mono text-left"
                            dir="ltr"
                          />
                        </div>

                        {/* متعلقات */}
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                            متعلقات:
                          </label>
                          <input
                            type="text"
                            placeholder=""
                            value={formState.replacementAccessories || ""}
                            onChange={(e) => handleInputChange("replacementAccessories", e.target.value)}
                            disabled={!isAdmin || formState.hasReplacement !== "دارد"}
                            className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold"
                          />
                        </div>

                        {/* تاریخ ارسال */}
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                            تاریخ ارسال:
                          </label>
                          <input
                            type="text"
                            placeholder="140X/XX/XX"
                            value={formState.replacementSendDate || ""}
                            onChange={(e) => handleInputChange("replacementSendDate", e.target.value)}
                            onBlur={() => handleDateBlur("replacementSendDate")}
                            maxLength={10}
                            disabled={!isAdmin || formState.hasReplacement !== "دارد"}
                            dir="ltr"
                            className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold text-center"
                          />
                        </div>

                        {/* تاریخ دریافت */}
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                            تاریخ دریافت:
                          </label>
                          <input
                            type="text"
                            placeholder="140X/XX/XX"
                            value={formState.replacementReceiveDate || ""}
                            onChange={(e) => handleInputChange("replacementReceiveDate", e.target.value)}
                            onBlur={() => handleDateBlur("replacementReceiveDate")}
                            maxLength={10}
                            disabled={!isAdmin || formState.hasReplacement !== "دارد"}
                            dir="ltr"
                            className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold text-center"
                          />
                        </div>

                      </div>
                    </div>

                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => triggerSms('replacement')}
                        disabled={formState.hasReplacement !== "دارد"}
                        className={`w-full py-2 text-xs font-bold rounded-lg transition-all text-center shadow-xs ${
                          formState.hasReplacement === "دارد"
                            ? formState.smsSentReplacement
                              ? "bg-white text-[#f0642f] border border-[#f0642f] hover:bg-orange-50/50 cursor-pointer"
                              : "bg-[#f0642f] hover:bg-[#d9531e] cursor-pointer text-white"
                            : "bg-slate-300 opacity-50 cursor-not-allowed text-white"
                        }`}
                      >
                        پیامک دستگاه جایگزین
                      </button>
                    </div>
                  </div>

                  {/* Card 5: ارسال */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 pt-10 relative flex flex-col justify-between shadow-sm flex-1">
                    
                    <div className="absolute -top-7 right-6 bg-[#1a344d] text-white text-[11px] font-black px-5 py-1.5 rounded-t-xl shadow-xs">
                      ارسال
                    </div>

                    <div className="space-y-4 flex-1">
                      {/* تاریخ ارسال */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          تاریخ ارسال:
                        </label>
                        <input
                          type="text"
                          placeholder="140X/XX/XX"
                          value={formState.shipDate || ""}
                          onChange={(e) => handleInputChange("shipDate", e.target.value)}
                          onBlur={() => handleDateBlur("shipDate")}
                          maxLength={10}
                          disabled={!isAdmin}
                          dir="ltr"
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold text-center"
                        />
                      </div>

                      {/* نحوه ارسال */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          نحوه ارسال:
                        </label>
                        <select
                          value={formState.shipMethod || "ارسال نشده"}
                          onChange={(e) => handleInputChange("shipMethod", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer font-bold appearance-none"
                        >
                          <option value="ارسال نشده">ارسال نشده</option>
                          <option value="پیک شرکت">پیک شرکتی</option>
                          <option value="پیک مشتری">پیک مشتری</option>
                          <option value="تحویل حضوری">تحویل حضوری</option>
                        </select>
                      </div>

                      {/* تلفن/کد رهگیری */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px]">
                          تلفن/کد رهگیری:
                        </label>
                        <input
                          type="text"
                          placeholder=""
                          value={formState.trackingCode || ""}
                          onChange={(e) => handleInputChange("trackingCode", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold"
                        />
                      </div>

                      {/* آدرس گیرنده */}
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <label className="text-[11px] font-black text-slate-600 text-right shrink-0 min-w-[115px] mt-1.5">
                          آدرس گیرنده:
                        </label>
                        <textarea
                          rows={2}
                          placeholder=""
                          value={formState.receiverAddress || ""}
                          onChange={(e) => handleInputChange("receiverAddress", e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 bg-[#ebf2fc] disabled:bg-slate-200/70 disabled:text-slate-800 disabled:cursor-not-allowed text-slate-900 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-bold resize-none"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => triggerSms('shipping')}
                        className={`sms-shipping-button repair-sms-shipping-button flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center shadow-xs border border-[#f0642f] ${
                          formState.smsSentShipping
                            ? "sms-shipping-button-sent bg-white text-[#1a2a3a] hover:bg-slate-100"
                            : "bg-[#1a2a3a] hover:bg-[#253b51] text-white"
                        }`}
                      >
                        پیامک اطلاعات ارسال
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCardPrint("ارسال")}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs border border-slate-300 shrink-0"
                        title="چاپ حواله ارسال دستگاه"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>پرینت</span>
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </>
        )}

      </div>

      {showRepairPicker && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4" dir="rtl" id="repair-picker-overlay">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-xl overflow-hidden">
            <div className="relative flex items-center justify-between gap-4 py-4 pr-5 pl-16 bg-[#1a344d] text-white">
              <div>
                <h3 className="text-sm font-black">اتصال به پرونده تعمیری</h3>
                <p className="text-[10px] text-slate-300 mt-1">پرونده‌ی دستگاه موردنظر را انتخاب کنید.</p>
              </div>
              <button type="button" onClick={() => setShowRepairPicker(false)} className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-rose-600/90 text-white transition-colors hover:bg-rose-700" aria-label="بستن" title="بستن">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-5">
              <input
                type="search"
                value={repairPickerSearch}
                onChange={(event) => setRepairPickerSearch(event.target.value)}
                placeholder="جستجو بر اساس شماره، شرکت، مدل یا سریال"
                className="w-full mb-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-[#e05a2b] focus:ring-2 focus:ring-orange-100"
              />
              <div className="max-h-[55vh] overflow-y-auto space-y-2">
                {repairs
                  .filter((item) => !item.isConsignment && !!item.deviceModel?.trim())
                  .filter((item) => {
                    const query = repairPickerSearch.trim().toLowerCase();
                    return !query || [item.id, item.customerName, item.deviceModel, item.serialNumber]
                      .some((value) => String(value || "").toLowerCase().includes(query));
                  })
                  .sort((a, b) => b.id - a.id)
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFormState((prev) => ({ ...prev, relatedRepairId: String(item.id) }));
                        setShowRepairPicker(false);
                        setRepairPickerSearch("");
                        onShowNotification(`اتصال به پرونده ${item.id} انتخاب شد؛ برای ثبت نهایی، پرونده امانی را ذخیره کنید.`, "success");
                      }}
                      className="w-full rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/60 p-3 text-right transition-colors"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-xs font-black text-slate-800">پرونده #{item.id} — {item.customerName || "بدون نام شرکت"}</span>
                        <span className="text-[10px] font-mono text-slate-500" dir="ltr">{item.serialNumber || "بدون سریال"}</span>
                      </span>
                      <span className="block mt-1 text-[11px] text-slate-600">مدل دستگاه: {item.deviceModel}</span>
                    </button>
                  ))}
                {repairs.filter((item) => !item.isConsignment && !!item.deviceModel?.trim()).length === 0 && (
                  <div className="py-10 text-center text-xs text-slate-500">پرونده تعمیری برای اتصال پیدا نشد.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty Form Confirmation Modal overlay */}
      {showEmptyConfirm && (
        <div className="fixed inset-y-0 left-0 right-[272px] z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs font-sans text-right" dir="rtl" id="empty-form-confirm-overlay">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 max-w-md w-full mx-4 transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-black text-slate-900">فرم جدید خالی است!</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  شما هیچ اطلاعاتی در فرم جدید وارد نکرده‌اید. با تأیید، این فرم جدید بدون ذخیره‌سازی بسته خواهد شد و به صفحه اصلی باز می‌گردید. در صورت تمایل به ثبت اطلاعات، دکمه لغو را انتخاب نمایید.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black rounded-lg transition-colors cursor-pointer"
              >
                تأیید و بستن پرونده
              </button>
              <button
                type="button"
                onClick={() => setShowEmptyConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-black rounded-lg transition-colors cursor-pointer"
              >
                لغو و تکمیل اطلاعات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Print Preview Overlay */}
      {showPrintPreview && (
        <div className="fixed inset-y-0 left-0 right-[272px] z-[120] flex flex-col items-center justify-start bg-slate-900/80 backdrop-blur-md p-4 md:p-6 overflow-y-auto font-sans text-right" dir="rtl" id="print-preview-overlay">
          {/* Action Header Panel */}
          <div className="relative w-full max-w-4xl bg-slate-800 text-white rounded-2xl p-4 mb-4 flex items-center justify-between shadow-xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                <Printer className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black">
                  {printType === 'receipt' && "پیش‌نمایش فیش رسید دریافت دستگاه"}
                  {printType === 'inspection' && "پیش‌نمایش برگه بررسی اولیه دستگاه"}
                  {printType === 'shipping' && "پیش‌نمایش حواله ارسال نهایی دستگاه"}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">موقعیت و جانمایی فیلدها منطبق بر پیکربندی انجام شده در تنظیمات است.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 pl-12">
              <button
                type="button"
                onClick={() => {
                  try {
                    window.print();
                  } catch (err) {
                    console.error("Direct print failed:", err);
                  }
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-900/30 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>ارسال به چاپگر</span>
              </button>
              
            </div>
            <button
              type="button"
              onClick={() => setShowPrintPreview(false)}
              className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-rose-600/90 text-white transition-colors hover:bg-rose-700"
              aria-label="بستن پیش‌نمایش"
              title="بستن پیش‌نمایش"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Styled Paper Sheet container (Scales perfectly on screen) */}
          <div 
            className="bg-white text-slate-900 shadow-2xl border border-slate-300 relative select-all overflow-hidden p-0 mb-8 transition-all duration-300" 
            id="printable-preview-sheet" 
            style={{ 
              width: getActivePrintLayout().orientation === 'portrait' ? '210mm' : '297mm',
              minHeight: getActivePrintLayout().orientation === 'portrait' ? '297mm' : '210mm',
              aspectRatio: getActivePrintLayout().orientation === 'portrait' ? '210/297' : '297/210'
            }}
          >
            {/* Background template overlay */}
            {printWithBackground && getActivePrintLayout().backgroundImageUrl ? (
              <img
                src={getActivePrintLayout().backgroundImageUrl}
                alt="Template Background"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center border-4 border-dashed border-slate-200 bg-slate-50/50 p-6 select-none pointer-events-none">
                <Printer className="w-16 h-16 text-slate-300 stroke-[1.5] mb-2" />
                <p className="text-slate-400 text-xs font-black">تصویر قالب پیش‌زمینه آپلود نشده است یا حالت چاپ بدون پس‌زمینه فعال است.</p>
                <p className="text-slate-400 text-[10px] mt-1 font-bold">برای تنظیم پس‌زمینه، به زبانه «تنظیمات چاپ» مراجعه فرمایید.</p>
              </div>
            )}

            {/* Configured fields layout rendering */}
            {getActivePrintLayout().fields.map((field) => {
              if (!field.visible) return null;
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
                    transform: "translateX(0)", // natural RTL flow from right coordinate
                    direction: "rtl",
                    maxWidth: "35%", // protect from breaking layout
                    lineHeight: "1.4"
                  }}
                  title={field.label}
                >
                  {val}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Print custom layout portal container */}
      {createPortal(
        <div 
          id="print-custom-layout" 
          className="relative bg-white" 
          dir="rtl"
          style={{
            width: getActivePrintLayout().orientation === 'portrait' ? '210mm' : '297mm',
            height: getActivePrintLayout().orientation === 'portrait' ? '297mm' : '210mm'
          }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 ${getActivePrintLayout().orientation === 'portrait' ? 'portrait' : 'landscape'};
                margin: 0 !important;
              }
              html, body {
                width: ${getActivePrintLayout().orientation === 'portrait' ? '210mm' : '297mm'} !important;
                height: ${getActivePrintLayout().orientation === 'portrait' ? '297mm' : '210mm'} !important;
              }
            }
          ` }} />

          {/* Background template image if enabled */}
          {printWithBackground && getActivePrintLayout().backgroundImageUrl && (
            <img
              src={getActivePrintLayout().backgroundImageUrl}
              alt="Template Background"
              className="absolute inset-0 w-full h-full object-fill"
              referrerPolicy="no-referrer"
            />
          )}

          {/* Overlaid printable fields in absolute percentages */}
          {getActivePrintLayout().fields.map((field) => {
            if (!field.visible) return null;
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
                  maxWidth: "35%",
                  lineHeight: "1.4"
                }}
              >
                {val}
              </div>
            );
          })}
        </div>,
        document.body
      )}

      {/* SMS Confirmation Modal Dialog (Portaled to document.body, matches C# MessageBox) */}
      {smsConfirmPayload && createPortal(
        <div className="fixed inset-y-0 left-0 right-[272px] z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            dir="rtl"
          >
            {/* Header */}
            <div className="relative bg-[#1a344d] text-white py-4 pr-6 pl-16 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#f0642f] flex items-center justify-center text-white shadow-xs">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">{smsConfirmPayload.title}</h3>
                  <p className="text-[11px] text-slate-300 font-medium">{smsConfirmPayload.stepName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSendingSms && cancelSmsConfirmation()}
                disabled={isSendingSms}
                className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-rose-600/90 text-white transition-colors hover:bg-rose-700 cursor-pointer"
                aria-label="بستن"
                title="بستن"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Recipient meta card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-3 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block mb-0.5">گیرنده پیام:</span>
                  <span className="font-extrabold text-slate-800">{smsConfirmPayload.recipientName}</span>
                </div>
                <div className="text-left" dir="ltr">
                  <span className="text-[10px] text-slate-500 font-bold block mb-0.5 text-right" dir="rtl">شماره تماس:</span>
                  <span className="font-mono font-bold text-[#f0642f]">{smsConfirmPayload.phone}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-bold">شناسه الگوی سامانه (BodyId):</span>
                  <span className="font-mono bg-blue-50 text-blue-700 font-extrabold px-2 py-0.5 rounded border border-blue-200">
                    {smsConfirmPayload.bodyId}
                  </span>
                </div>
              </div>

              {/* Confirmation question prompt */}
              <div className="flex items-center gap-2 text-slate-800 font-black text-xs">
                <Info className="w-4 h-4 text-[#f0642f] shrink-0" />
                <span>پیام زیر برای مشتری ارسال شود؟</span>
              </div>

              {/* Message text box */}
              <div className="bg-[#ebf2fc]/70 border border-blue-200/80 rounded-xl p-4 text-slate-800 text-xs leading-relaxed font-medium select-text whitespace-pre-wrap max-h-48 overflow-y-auto">
                {smsConfirmPayload.previewMessage}
              </div>

              {/* Variable values breakdown */}
              {smsConfirmPayload.variables && smsConfirmPayload.variables.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1.5">پارامترهای ارسالی به متغیرهای پترن ({smsConfirmPayload.variables.length} متغیر):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {smsConfirmPayload.variables.map((val, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded font-mono">
                        <span className="text-orange-600 font-bold">{"{" + idx + "}"}:</span>
                        <span className="font-sans font-semibold truncate max-w-[120px]">{val || "—"}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={cancelSmsConfirmation}
                disabled={isSendingSms}
                className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                انصراف (خیر)
              </button>
              <button
                type="button"
                onClick={confirmAndSendSms}
                disabled={isSendingSms}
                className="px-6 py-2.5 bg-[#f0642f] hover:bg-[#d9531e] text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {isSendingSms ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>در حال ارسال پیامک...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>تأیید و ارسال پیامک (بله)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
});

export default DetailModal;
