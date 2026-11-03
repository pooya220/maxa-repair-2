/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'user' | string; // 'admin' | 'user'
  password?: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export type RepairCompany = "مکسا" | "تایگر" | "پالیز" | "سپید" | "بامداد" | "بعد پنجم" | "سایر";

export interface Repair {
  id: number;
  isConsignment: boolean; // false for repair, true for consignment (امانی)
  
  // 1. دریافت دستگاه (Device Receipt)
  customerName: string; // نام شرکت / مشتری
  deviceModel: string; // مدل دستگاه
  serialNumber: string; // شماره سریال
  problem: string; // مشکل دستگاه
  accessories: string; // متعلقات
  contactPerson: string; // نام رابط / شخص رابط
  contactNumber: string; // شماره تماس / شماره رابط
  warranty: 'درحال بررسی' | 'دارد' | 'ندارد'; // گارانتی
  contract: 'درحال بررسی' | 'دارد' | 'ندارد'; // قرارداد
  receiveDate: string; // تاریخ دریافت
  hasReplacement: 'دارد' | 'ندارد' | 'درحال بررسی'; // جایگزین (has replacement device)
  
  // 2. بررسی اولیه (Initial Inspection)
  repairCompany: RepairCompany; // شرکت تعمیر کننده
  initialSendDate: string; // تاریخ ارسال بررسی اولیه
  initialReceiveDate: string; // تاریخ دریافت بررسی اولیه
  initialOtherInfo: string; // سایر اطلاعات بررسی اولیه
  
  // 3. دستگاه جایگزین (Replacement Device Detail)
  replacementName: string; // نام دستگاه جایگزین
  replacementSerial: string; // شماره سریال دستگاه جایگزین
  replacementAccessories: string; // متعلقات دستگاه جایگزین
  replacementSendDate: string; // تاریخ ارسال دستگاه جایگزین
  replacementReceiveDate: string; // تاریخ دریافت دستگاه جایگزین
  
  // 4. اعلام هزینه (Cost Quote)
  invoiceNumber: string; // شماره فاکتور
  quotedCost: string; // هزینه اعلام شده
  costApproved: 'شده است' | 'نشده است' | 'درحال بررسی'; // تایید اعلام هزینه
  paymentStatus: 'شده است' | 'نشده است' | 'درحال بررسی'; // وضعیت پرداخت
  
  // 5. ارسال (Shipping)
  shipDate: string; // تاریخ ارسال نهایی
  shipMethod: 'ارسال نشده' | 'پیک شرکت' | 'پیک مشتری' | 'تحویل حضوری'; // نحوه ارسال
  trackingCode: string; // تلفن/کد رهگیری
  receiverAddress: string; // آدرس گیرنده

  // Connection/Link to another repair record (for Consignments)
  relatedRepairId?: string;

  // Track if SMS has been sent for different phases
  smsSentReceipt?: boolean;
  smsSentInspection?: boolean;
  smsSentCost?: boolean;
  smsSentCostApproved?: boolean;
  smsSentReplacement?: boolean;
  smsSentShipping?: boolean;

  // Track the step: 1 (Receipt) -> 5 (Delivery)
  currentStep: number;
  createdAt?: string;
}

export interface DbStatus {
  connected: boolean;
  type: 'SQLite/JSON' | 'Cloud SQL' | 'Offline';
  latencyMs: number;
}

export interface SystemSettings {
  smsTemplateReceipt: string;
  smsTemplateInspection: string;
  smsTemplateCost: string;
  smsTemplateShipping: string;
  smsTemplateCostApproved?: string;
  smsTemplateReplacement?: string;
  // SMS provider & credentials
  smsProvider?: 'payamak_panel' | 'kavenegar';
  smsUsername?: string;
  smsPassword?: string;
  // Template Pattern IDs (bodyId in Payamak-Panel)
  smsBodyIdReceipt?: string;
  smsBodyIdInspection?: string;
  smsBodyIdCost?: string;
  smsBodyIdCostApproved?: string;
  smsBodyIdReplacement?: string;
  smsBodyIdShipping?: string;
  // Kavenegar alternative
  kavenegarApiKey?: string;
  kavenegarSender?: string;
  printerIp: string;
  enableMockSms: boolean;
  // logo customization
  logoUrl?: string;
  // custom icons
  iconStep1?: string;
  iconStep2?: string;
  iconStep3?: string;
  iconStep4?: string;
  iconStep5?: string;
  iconShipCompany?: string;
  iconShipCustomer?: string;
  iconShipHandover?: string;
  iconShipNotSent?: string;
  iconInventory?: string;
  // Legacy SQL Server settings
  sqlServerHost?: string;
  sqlServerPort?: string;
  sqlServerDbName?: string;
  sqlServerUser?: string;
  sqlServerPassword?: string;
  sqlServerConnected?: boolean;
  // SQL Server backup settings
  backupEnabled?: boolean;
  backupPath?: string;
  backupIntervalMinutes?: number;
  // PostgreSQL settings
  postgresHost?: string;
  postgresPort?: string;
  postgresDbName?: string;
  postgresUser?: string;
  postgresPassword?: string;
  postgresConnected?: boolean;
  dbType?: 'sql' | 'postgres' | 'cache';
  // print customization settings
  printLayoutReceipt?: PrintLayoutConfig;
  printLayoutInspection?: PrintLayoutConfig;
  printLayoutShipping?: PrintLayoutConfig;
}

export interface PrintFieldConfig {
  key: string;       // e.g., 'customerName', 'receiveDate', 'deviceModel', etc.
  label: string;     // e.g., 'نام شرکت / مشتری', 'تاریخ', etc.
  x: number;         // percentage from right (0-100) on the background sheet (RTL)
  y: number;         // percentage from top (0-100) on the background sheet
  width?: number;    // percentage of the sheet reserved for this field's printable area
  fontSize: number;  // font size in pixels (e.g. 14)
  visible: boolean;
}

export interface PrintLayoutConfig {
  backgroundImageUrl: string; // Base64 or URL of the custom template background
  fields: PrintFieldConfig[];
  orientation?: 'portrait' | 'landscape';
}

export interface Reminder {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  dueTime?: string;
  completed: boolean;
  repairId?: number;
  createdAt: string;
}
