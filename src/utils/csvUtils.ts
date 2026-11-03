import type { Repair } from "../types";

export interface ExportColumn<T> {
  key: string;
  label: string;
  getValue: (row: T) => string | number | boolean | null | undefined;
}

const field = <K extends keyof Repair>(key: K, label: string): ExportColumn<Repair> => ({
  key: String(key),
  label,
  getValue: (row) => row[key],
});

const statusLabels = ["نامعلوم", "دریافت دستگاه", "بررسی اولیه", "اعلام هزینه", "تایید نهایی و پرداخت", "تحویل و ارسال"];

export const repairExportColumns: ExportColumn<Repair>[] = [
  field("id", "ID"),
  { key: "recordType", label: "نوع رکورد", getValue: (row) => row.isConsignment ? "امانی" : "تعمیرات" },
  field("customerName", "نام مشتری"),
  field("deviceModel", "مدل دستگاه"),
  field("serialNumber", "شماره سریال"),
  field("problem", "مشکل دستگاه"),
  field("accessories", "متعلقات"),
  field("contactPerson", "شخص رابط"),
  field("contactNumber", "شماره رابط"),
  field("warranty", "گارانتی"),
  field("contract", "قرارداد"),
  field("receiveDate", "تاریخ دریافت"),
  field("hasReplacement", "جایگزین"),
  field("repairCompany", "شرکت تعمیرکننده"),
  field("initialSendDate", "تاریخ ارسال بررسی"),
  field("initialReceiveDate", "تاریخ دریافت بررسی"),
  field("initialOtherInfo", "سایر اطلاعات بررسی"),
  field("replacementName", "مدل امانی / جایگزین"),
  field("replacementSerial", "سریال امانی / جایگزین"),
  field("replacementAccessories", "متعلقات امانی / جایگزین"),
  field("replacementSendDate", "تاریخ ارسال امانی / جایگزین"),
  field("replacementReceiveDate", "تاریخ دریافت امانی / جایگزین"),
  field("invoiceNumber", "شماره فاکتور"),
  field("quotedCost", "هزینه اعلام‌شده"),
  field("costApproved", "تأیید هزینه"),
  field("paymentStatus", "وضعیت پرداخت"),
  field("shipDate", "تاریخ ارسال نهایی"),
  field("shipMethod", "نحوه ارسال"),
  field("trackingCode", "کد رهگیری"),
  field("receiverAddress", "آدرس گیرنده"),
  field("relatedRepairId", "شناسه ارتباط"),
  { key: "status", label: "وضعیت", getValue: (row) => statusLabels[row.currentStep || 1] || "نامعلوم" },
  field("currentStep", "مرحله عددی"),
  field("createdAt", "تاریخ ثبت"),
  { key: "smsSentReceipt", label: "پیامک دریافت", getValue: (row) => row.smsSentReceipt ? "بله" : "خیر" },
  { key: "smsSentInspection", label: "پیامک بررسی", getValue: (row) => row.smsSentInspection ? "بله" : "خیر" },
  { key: "smsSentCost", label: "پیامک هزینه", getValue: (row) => row.smsSentCost ? "بله" : "خیر" },
  { key: "smsSentCostApproved", label: "پیامک تأیید هزینه", getValue: (row) => row.smsSentCostApproved ? "بله" : "خیر" },
  { key: "smsSentReplacement", label: "پیامک جایگزین", getValue: (row) => row.smsSentReplacement ? "بله" : "خیر" },
  { key: "smsSentShipping", label: "پیامک ارسال", getValue: (row) => row.smsSentShipping ? "بله" : "خیر" },
];

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
) {
  const escapeCell = (value: string | number | boolean | null | undefined) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
