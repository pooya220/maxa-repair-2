import type { RepairCompany } from "../types";

export const REPAIR_COMPANIES: readonly RepairCompany[] = [
  "مکسا",
  "تایگر",
  "پالیز",
  "سپید",
  "بامداد",
  "بعد پنجم",
  "سایر",
];

export function normalizeRepairCompany(value: unknown): RepairCompany {
  const company = typeof value === "string" ? value.trim() : "";
  if (!company || company === "انتخاب نشده") return "مکسا";
  if (company === "بامداد صنعت") return "بامداد";
  return (REPAIR_COMPANIES as readonly string[]).includes(company)
    ? (company as RepairCompany)
    : "سایر";
}
