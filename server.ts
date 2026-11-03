/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import "dotenv/config";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
import { Repair, DbStatus, SystemSettings, User, Reminder } from "./src/types";
import { normalizeRepairCompany } from "./src/utils/repairCompany";
import net from "net";
import mssql from "mssql";
import pg from "pg";

const { Pool } = pg;
const execFileAsync = promisify(execFile);

// Database storage file path
const DB_FILE = path.join(process.cwd(), "db.json");
const POSTGRES_CONFIG = {
  host: process.env.PGHOST || "127.0.0.1",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "maxa_repairs",
};

// Define seed data matching user screenshots
const DEFAULT_REPAIRS: Repair[] = [
  {
    id: 9554,
    isConsignment: false,
    customerName: "ملی صنایع مس ایران / شهر بابک",
    deviceModel: "750",
    serialNumber: "afu061010uabjc",
    problem: "عدم روشن شدن دستگاه",
    accessories: "آداپتور، کابل شبکه",
    contactPerson: "مهندس احمدی",
    contactNumber: "09131112233",
    warranty: "درحال بررسی",
    contract: "دارد",
    receiveDate: "1405/03/05",
    hasReplacement: "ندارد",
    repairCompany: "مکسا",
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
    paymentStatus: "نشده است",
    shipDate: "",
    shipMethod: "ارسال نشده",
    trackingCode: "",
    receiverAddress: "",
    currentStep: 1
  },
  {
    id: 9553,
    isConsignment: false,
    customerName: "ملی صنایع مس ایران / شهر بابک",
    deviceModel: "750",
    serialNumber: "afu061011abcgg",
    problem: "بالا نمیاد",
    accessories: "جعبه، کابل",
    contactPerson: "محمودی",
    contactNumber: "09132904871",
    warranty: "درحال بررسی",
    contract: "دارد",
    receiveDate: "1405/03/05",
    hasReplacement: "ندارد",
    repairCompany: "پالیز",
    initialSendDate: "1404/07/23",
    initialReceiveDate: "1404/08/27",
    initialOtherInfo: "صفحه کلید و فلت نیاز به تعویض دارد",
    replacementName: "",
    replacementSerial: "",
    replacementAccessories: "",
    replacementSendDate: "",
    replacementReceiveDate: "",
    invoiceNumber: "",
    quotedCost: "",
    costApproved: "درحال بررسی",
    paymentStatus: "نشده است",
    shipDate: "",
    shipMethod: "ارسال نشده",
    trackingCode: "",
    receiverAddress: "",
    currentStep: 2
  },
  {
    id: 9538,
    isConsignment: false,
    customerName: "ملی صنایع مس ایران / سرچشمه",
    deviceModel: "740",
    serialNumber: "g04457",
    problem: "ال سی دی گاهی قطع و وصل میشود",
    accessories: "پایه دیواری",
    contactPerson: "کاظمی",
    contactNumber: "09134445566",
    warranty: "دارد",
    contract: "دارد",
    receiveDate: "1405/02/20",
    hasReplacement: "ندارد",
    repairCompany: "مکسا",
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
    paymentStatus: "نشده است",
    shipDate: "",
    shipMethod: "ارسال نشده",
    trackingCode: "",
    receiverAddress: "",
    currentStep: 1
  },
  {
    id: 9531,
    isConsignment: false,
    customerName: "شرکت ملی پخش فرآورده های نفتی",
    deviceModel: "biolite net",
    serialNumber: "b010203",
    problem: "مشکل سنسور اثر انگشت",
    accessories: "ندارد",
    contactPerson: "محمدی",
    contactNumber: "09127778899",
    warranty: "ندارد",
    contract: "دارد",
    receiveDate: "1405/02/09",
    hasReplacement: "ندارد",
    repairCompany: "مکسا",
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
    paymentStatus: "نشده است",
    shipDate: "",
    shipMethod: "ارسال نشده",
    trackingCode: "",
    receiverAddress: "",
    currentStep: 1
  },
  {
    id: 8423,
    isConsignment: false,
    customerName: "ملی صنایع مس ایران / شهر بابک",
    deviceModel: "750",
    serialNumber: "g01243/ac0342",
    problem: "صفحه نمایش سیاه است",
    accessories: "آداپتور",
    contactPerson: "جعفری",
    contactNumber: "09132904871",
    warranty: "ندارد",
    contract: "دارد",
    receiveDate: "1404/07/21",
    hasReplacement: "ندارد",
    repairCompany: "مکسا",
    initialSendDate: "1404/07/22",
    initialReceiveDate: "1404/08/10",
    initialOtherInfo: "آی سی تغذیه تعویض شد",
    replacementName: "",
    replacementSerial: "",
    replacementAccessories: "",
    replacementSendDate: "",
    replacementReceiveDate: "",
    invoiceNumber: "INV-8423",
    quotedCost: "15,500,000",
    costApproved: "شده است",
    paymentStatus: "شده است",
    shipDate: "1404/08/15",
    shipMethod: "پیک شرکت",
    trackingCode: "TRK-8423",
    receiverAddress: "کرمان، شهر بابک، مجتمع مس میدوک",
    currentStep: 5
  },
  {
    id: 8422,
    isConsignment: false,
    customerName: "شرکت ملی صنایع مس ایران / شهر بابک",
    deviceModel: "750",
    serialNumber: "g008141",
    problem: "حسگر چهره کار نمی کند",
    accessories: "سوکت دی سی",
    contactPerson: "محمودی",
    contactNumber: "09132904871",
    warranty: "درحال بررسی",
    contract: "درحال بررسی",
    receiveDate: "1404/07/21",
    hasReplacement: "ندارد",
    repairCompany: "مکسا",
    initialSendDate: "1404/07/22",
    initialReceiveDate: "1404/08/01",
    initialOtherInfo: "ماژول دوربین تست شد و سالم است، فلت تعویض شد",
    replacementName: "",
    replacementSerial: "",
    replacementAccessories: "",
    replacementSendDate: "",
    replacementReceiveDate: "",
    invoiceNumber: "INV-9901",
    quotedCost: "8,200,000",
    costApproved: "شده است",
    paymentStatus: "شده است",
    shipDate: "1404/10/06",
    shipMethod: "تحویل حضوری",
    trackingCode: "تحویل به محمودی",
    receiverAddress: "دفتر مرکزی شرکت مس",
    currentStep: 5
  },
  {
    id: 308,
    isConsignment: false,
    customerName: "شرکت ملی صنایع مس ایران / سرچشمه",
    deviceModel: "740",
    serialNumber: "authentication f",
    problem: "خطای Authentication Fail در راه اندازی",
    accessories: "جعبه و متعلقات کامل",
    contactPerson: "صادقی",
    contactNumber: "09132904871",
    warranty: "درحال بررسی",
    contract: "دارد",
    receiveDate: "1404/01/24",
    hasReplacement: "ندارد",
    repairCompany: "مکسا",
    initialSendDate: "1404/02/02",
    initialReceiveDate: "",
    initialOtherInfo: "در حال بررسی لایسنس و سخت افزار رمزنگاری",
    replacementName: "",
    replacementSerial: "",
    replacementAccessories: "",
    replacementSendDate: "",
    replacementReceiveDate: "",
    invoiceNumber: "",
    quotedCost: "",
    costApproved: "درحال بررسی",
    paymentStatus: "نشده است",
    shipDate: "",
    shipMethod: "ارسال نشده",
    trackingCode: "",
    receiverAddress: "",
    currentStep: 2
  },
  
  // Consignment items (امانی)
  {
    id: 101,
    isConsignment: true,
    customerName: "بانک کارآفرین جمهوری اسلامی",
    deviceModel: "270",
    serialNumber: "BRC7201660755",
    problem: "دستگاه امانی جهت تست شعبه مرکزی",
    accessories: "آداپتور، کابل برق",
    contactPerson: "حسینعلی بیگی",
    contactNumber: "09194051058",
    warranty: "دارد",
    contract: "دارد",
    receiveDate: "1404/11/12",
    hasReplacement: "ندارد",
    repairCompany: "مکسا",
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
    paymentStatus: "نشده است",
    shipDate: "",
    shipMethod: "ارسال نشده",
    trackingCode: "",
    receiverAddress: "",
    currentStep: 1
  },
  {
    id: 102,
    isConsignment: true,
    customerName: "ترام چاپ",
    deviceModel: "770",
    serialNumber: "g04534",
    problem: "دستگاه امانی بابت خرابی دستگاه اصلی شرکت",
    accessories: "کابل اورجینال",
    contactPerson: "آقای کریمی",
    contactNumber: "09125556677",
    warranty: "دارد",
    contract: "دارد",
    receiveDate: "1404/10/05",
    hasReplacement: "ندارد",
    repairCompany: "مکسا",
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
    paymentStatus: "نشده است",
    shipDate: "",
    shipMethod: "ارسال نشده",
    trackingCode: "",
    receiverAddress: "",
    currentStep: 1
  },
  {
    id: 103,
    isConsignment: true,
    customerName: "ترام چاپ",
    deviceModel: "790",
    serialNumber: "g02336",
    problem: "امانی کارگاهی",
    accessories: "ندارد",
    contactPerson: "آقای کریمی",
    contactNumber: "09125556677",
    warranty: "دارد",
    contract: "دارد",
    receiveDate: "1404/10/10",
    hasReplacement: "ندارد",
    repairCompany: "مکسا",
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
    paymentStatus: "نشده است",
    shipDate: "",
    shipMethod: "ارسال نشده",
    trackingCode: "",
    receiverAddress: "",
    currentStep: 1
  },
  {
    id: 104,
    isConsignment: true,
    customerName: "دمیس",
    deviceModel: "740",
    serialNumber: "00110",
    problem: "تست سرعت و احراز هویت خریدار جدید",
    accessories: "پایه فلزی",
    contactPerson: "دهقان",
    contactNumber: "09135709628",
    warranty: "دارد",
    contract: "دارد",
    receiveDate: "1404/09/18",
    hasReplacement: "ندارد",
    repairCompany: "مکسا",
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
    paymentStatus: "نشده است",
    shipDate: "",
    shipMethod: "ارسال نشده",
    trackingCode: "",
    receiverAddress: "",
    currentStep: 1
  },
  {
    id: 105,
    isConsignment: true,
    customerName: "معلولین ذهنی وحدت",
    deviceModel: "350",
    serialNumber: "AEH2202460220",
    problem: "جایگزین موقت بابت دستگاه تعمیری",
    accessories: "کابل و آداپتور",
    contactPerson: "جانی",
    contactNumber: "09128435163",
    warranty: "ندارد",
    contract: "ندارد",
    receiveDate: "1404/08/21",
    hasReplacement: "دارد",
    repairCompany: "مکسا",
    initialSendDate: "",
    initialReceiveDate: "",
    initialOtherInfo: "با کسری قرارداد دارد",
    replacementName: "AEH2202460220",
    replacementSerial: "AEH2202460220",
    replacementAccessories: "کامل",
    replacementSendDate: "1404/08/21",
    replacementReceiveDate: "",
    invoiceNumber: "",
    quotedCost: "",
    costApproved: "درحال بررسی",
    paymentStatus: "نشده است",
    shipDate: "",
    shipMethod: "ارسال نشده",
    trackingCode: "",
    receiverAddress: "",
    currentStep: 1
  },
  {
    id: 106,
    isConsignment: true,
    customerName: "بیمارستان سینا",
    deviceModel: "320",
    serialNumber: "brm9191160086",
    problem: "امانی تعویضی",
    accessories: "پایه دیواری",
    contactPerson: "آقای نظری",
    contactNumber: "09124318803",
    warranty: "دارد",
    contract: "دارد",
    receiveDate: "1404/08/12",
    hasReplacement: "دارد",
    repairCompany: "مکسا",
    initialSendDate: "",
    initialReceiveDate: "",
    initialOtherInfo: "",
    replacementName: "brm9191160086",
    replacementSerial: "brm9191160086",
    replacementAccessories: "پایه",
    replacementSendDate: "1404/08/12",
    replacementReceiveDate: "",
    invoiceNumber: "",
    quotedCost: "",
    costApproved: "درحال بررسی",
    paymentStatus: "نشده است",
    shipDate: "",
    shipMethod: "ارسال نشده",
    trackingCode: "",
    receiverAddress: "",
    currentStep: 1
  }
];

const DEFAULT_SETTINGS: SystemSettings = {
  smsTemplateReceipt: "شرکت {0} آقا/خانم {1} دستگاه {2} به شماره سریال {3} با مشکل اعلام شده {4} و متعلقات تحویل داده شده {5} در تاریخ {6} جهت بررسی و تعمیر دریافت گردید. واحد تعمیرات شرکت مهندسی کسرا رایانه آپادانا www.maxasecurity.com 021-78756800 09965012695",
  smsTemplateInspection: "شرکت {0} آقا/خانم {1} دستگاه {2} به شماره سریال {3} مورد بررسی اولیه قرار گرفت و نتیجه بررسی در {4} اعلام خواهد شد. *در صورت نیاز به دستگاه جایگزین و انعقاد قرارداد بیمه با واحد خدمات پس از فروش 78756400-021 تماس حاصل فرمایید.* واحد تعمیرات شرکت مهندسی کسرا رایانه آپادانا www.maxasecurity.com 021-78756800 09965012695",
  smsTemplateCost: "شرکت {0} آقا/خانم {1} دستگاه {2} به شماره سریال {3} مورد بررسی قرار گرفت و هزینه انجام خدمات در قالب پیش فاکتور در واتس اپ ارسال گردید. لازم به ذکر انجام خدمات منوط به ارسال تایید پیش فاکتور خواهد بود . واحد تعمیرات شرکت مهندسی کسرا رایانه آپادانا www.maxasecurity.com 021-78756800 09965012695",
  smsTemplateCostApproved: "شرکت {0} آقا/خانم {1} دستگاه {2} به شماره سریال {3} تاییدیه هزینه اعلام شده جهت تعمیرات توسط جنابعالی در واتس آپ دریافت گردید و تعمیر دستگاه شما از این تاریخ در اولویت کاری قرار گرفت. واحد تعمیرات شرکت مهندسی کسرا رایانه آپادانا www.maxasecurity.com 021-78756800 09965012695",
  smsTemplateReplacement: "شرکت {0} آقا/خانم {1} دستگاه {2} به شماره سریال {3} باتوجه به زمانبر بودن تعمیرات ، تا زمان انجام تعمیرات دستگاه جایگزین در اختیار شما قرار خواهد گرفت. لطفا جهت دریافت دستگاه جایگزین ، طی دو روزکاری آینده از ساعت 13 الی 18 ، با ارائه معرفی نامه به شرکت مراجعه فرمایید. واحد تعمیرات شرکت مهندسی کسرا رایانه آپادانا(مکسا) www.maxasecurity.com 021-78756800 09965012695",
  smsTemplateShipping: "شرکت {0} آقا/خانم {1} دستگاه {2} به شماره سریال {3} تعمیر دستگاه شما پایان یافت ، لطفا طی دو روزکاری آینده از ساعت 13 الی 17 ، همراه با معرفی نامه و فیش واریزی جهت دریافت دستگاه به شرکت مراجعه فرمایید. واحد تعمیرات شرکت مهندسی کسرا رایانه آپادانا www.maxasecurity.com 021-78756800 09965012695",
  smsBodyIdReceipt: "384713",
  smsBodyIdInspection: "384735",
  smsBodyIdCost: "384746",
  smsBodyIdCostApproved: "384747",
  smsBodyIdReplacement: "400795",
  smsBodyIdShipping: "384757",
  smsProvider: "payamak_panel",
  smsUsername: process.env.SMS_USERNAME || "",
  smsPassword: process.env.SMS_PASSWORD || "",
  kavenegarApiKey: process.env.KAVENEGAR_API_KEY || "6B4B584B4238734C744651484E2B6C2B354E7973537343385A2B4A63425759493234436F4130513352486F3D",
  kavenegarSender: process.env.KAVENEGAR_SENDER || "100010001224",
  printerIp: "192.168.1.100",
  enableMockSms: false,
  logoUrl: "",
  iconStep1: "Inbox",
  iconStep2: "Search",
  iconStep3: "DollarSign",
  iconStep4: "CreditCard",
  iconStep5: "Truck",
  iconShipCompany: "Truck",
  iconShipCustomer: "User",
  iconShipHandover: "MapPin",
  iconShipNotSent: "Archive",
  iconInventory: "Package",
  sqlServerHost: "192.168.1.50",
  sqlServerPort: "1433",
  sqlServerDbName: "MaxaRepairsDB",
  sqlServerUser: "sa",
  sqlServerPassword: "",
  sqlServerConnected: false,
  backupEnabled: false,
  backupPath: path.join(process.cwd(), "backups"),
  backupIntervalMinutes: 60,
  postgresHost: process.env.PGHOST || "127.0.0.1",
  postgresPort: String(process.env.PGPORT || "5432"),
  postgresDbName: process.env.PGDATABASE || "maxa_repairs",
  postgresUser: process.env.PGUSER || "postgres",
  postgresPassword: process.env.PGPASSWORD || "",
  postgresConnected: false,
  dbType: "sql"
};

const DEFAULT_USERS: User[] = [
  { id: "1", username: "admin", name: "مدیر سیستم (ادمین)", role: "admin", password: "admin" },
  { id: "2", username: "user", name: "کاربر عادی (مشاهده‌گر)", role: "user", password: "1234" }
];

const DEFAULT_REMINDERS: Reminder[] = [
  {
    id: 1,
    title: "تماس با مس سرچشمه برای عیب یابی دستگاه ۷۴۰",
    description: "پیگیری تایید هزینه قطعات تعویض شده ال سی دی با مهندس کاظمی",
    dueDate: "1405/04/20",
    completed: false,
    repairId: 9538,
    createdAt: "1405/04/10"
  },
  {
    id: 2,
    title: "تحویل دستگاه جایگزین به بیمارستان سینا",
    description: "هماهنگی با پیک جهت ارسال مجدد و دریافت رسید تحویل دستگاه امانی",
    dueDate: "1405/04/28",
    completed: false,
    repairId: 106,
    createdAt: "1405/04/12"
  }
];

type AppDatabase = {
  repairs: Repair[];
  settings: SystemSettings;
  users: User[];
  reminders: Reminder[];
};

let runtimeDb: AppDatabase | null = null;
let postgresPool: pg.Pool | null = null;
let postgresPersistQueue: Promise<void> = Promise.resolve();

// Load or initialize the JSON fallback. It remains as a local backup, while
// PostgreSQL is the runtime source of truth after initialization.
function loadJsonDb(): AppDatabase {
  if (!fs.existsSync(DB_FILE)) {
    const initialDb = {
      repairs: DEFAULT_REPAIRS,
      settings: DEFAULT_SETTINGS,
      users: DEFAULT_USERS,
      reminders: DEFAULT_REMINDERS
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf8");
    return initialDb as AppDatabase;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    parsed.settings = { ...DEFAULT_SETTINGS, ...parsed.settings, dbType: "sql" };
    if (!parsed.reminders) {
      parsed.reminders = DEFAULT_REMINDERS;
    }
    if (!parsed.users) parsed.users = DEFAULT_USERS;
    return parsed as AppDatabase;
  } catch (err) {
    console.error("Error reading database, resetting...", err);
    const initialDb = {
      repairs: DEFAULT_REPAIRS,
      settings: DEFAULT_SETTINGS,
      users: DEFAULT_USERS,
      reminders: DEFAULT_REMINDERS
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf8");
    return initialDb as AppDatabase;
  }
}

function getDb(): AppDatabase {
  return runtimeDb || loadJsonDb();
}

const POSTGRES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS app_state (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS repairs (
    id integer PRIMARY KEY,
    data jsonb NOT NULL,
    source_row jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    data jsonb NOT NULL,
    source_row jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id integer PRIMARY KEY,
    username text,
    action text,
    details text,
    created_at timestamptz,
    source_row jsonb NOT NULL DEFAULT '{}'::jsonb
  );
  CREATE TABLE IF NOT EXISTS migration_meta (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
`;

async function initializePostgres() {
  postgresPool = new Pool({ ...POSTGRES_CONFIG, max: 10, idleTimeoutMillis: 30000 });
  await postgresPool.query("SELECT 1");
  await postgresPool.query(POSTGRES_SCHEMA);

  const jsonDb = loadJsonDb();
  const [settingsResult, remindersResult, repairsResult, usersResult] = await Promise.all([
    postgresPool.query("SELECT value FROM app_state WHERE key = 'settings'"),
    postgresPool.query("SELECT value FROM app_state WHERE key = 'reminders'"),
    postgresPool.query("SELECT data FROM repairs ORDER BY id DESC"),
    postgresPool.query("SELECT data FROM users ORDER BY id"),
  ]);

  const persistedSettings = {
    ...DEFAULT_SETTINGS,
    ...jsonDb.settings,
    ...(settingsResult.rows[0]?.value || {}),
  };
  const settings = {
    ...persistedSettings,
    dbType: "sql" as const,
    postgresConnected: true,
  };
  const repairs = repairsResult.rows.map((row) => row.data as Repair);
  const users = usersResult.rows.map((row) => row.data as User);
  runtimeDb = {
    repairs: repairs.length ? repairs : jsonDb.repairs,
    settings,
    users: users.length ? users : jsonDb.users,
    reminders: remindersResult.rows[0]?.value || jsonDb.reminders || DEFAULT_REMINDERS,
  };
}

async function persistDbSnapshot(data: AppDatabase) {
  if (!postgresPool) return;
  const client = await postgresPool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO app_state (key, value, updated_at) VALUES ('settings', $1::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [JSON.stringify(data.settings)],
    );
    await client.query(
      `INSERT INTO app_state (key, value, updated_at) VALUES ('reminders', $1::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [JSON.stringify(data.reminders || [])],
    );

    const repairIds = data.repairs.map((item) => item.id);
    if (repairIds.length) {
      await client.query("DELETE FROM repairs WHERE NOT (id = ANY($1::int[]))", [repairIds]);
    } else {
      await client.query("DELETE FROM repairs");
    }
    for (const item of data.repairs) {
      await client.query(
        `INSERT INTO repairs (id, data, source_row, updated_at) VALUES ($1, $2::jsonb, $2::jsonb, now())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [item.id, JSON.stringify(item)],
      );
    }

    const userIds = data.users.map((item) => item.id);
    if (userIds.length) {
      await client.query("DELETE FROM users WHERE NOT (id = ANY($1::text[]))", [userIds]);
    } else {
      await client.query("DELETE FROM users");
    }
    for (const item of data.users) {
      await client.query(
        `INSERT INTO users (id, data, source_row, updated_at) VALUES ($1, $2::jsonb, $2::jsonb, now())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [item.id, JSON.stringify(item)],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

let sqlPool: mssql.ConnectionPool | null = null;

type BackupTrigger = "manual" | "automatic";

type BackupRuntimeStatus = {
  isRunning: boolean;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFile: string | null;
  lastError: string | null;
};

let backupTimer: ReturnType<typeof setInterval> | null = null;
let backupNextRunAt: string | null = null;
const backupRuntimeStatus: BackupRuntimeStatus = {
  isRunning: false,
  lastRunAt: null,
  lastSuccessAt: null,
  lastFile: null,
  lastError: null,
};

function quoteSqlIdentifier(identifier: string) {
  return `[${identifier.replace(/]/g, "]]" )}]`;
}

function getBackupIntervalMinutes(value: unknown) {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes >= 1 ? Math.min(Math.floor(minutes), 7 * 24 * 60) : 60;
}

function getBackupStatus() {
  const settings = getDb().settings;
  return {
    enabled: settings.backupEnabled === true,
    path: settings.backupPath || "",
    intervalMinutes: getBackupIntervalMinutes(settings.backupIntervalMinutes),
    nextRunAt: backupNextRunAt,
    ...backupRuntimeStatus,
  };
}

async function performDatabaseBackup(overridePath?: string, trigger: BackupTrigger = "manual") {
  if (backupRuntimeStatus.isRunning) {
    throw new Error("یک عملیات بکاپ دیگر در حال اجراست. لطفاً چند لحظه صبر کنید.");
  }

  const db = getDb();
  if (db.settings.dbType !== "sql" || !db.settings.sqlServerConnected) {
    throw new Error("اتصال به SQL Server برقرار نیست.");
  }

  const rawBackupPath = String(overridePath ?? db.settings.backupPath ?? "").trim();
  if (!rawBackupPath) {
    throw new Error("مسیر ذخیره بکاپ را انتخاب یا وارد کنید.");
  }
  if (!path.isAbsolute(rawBackupPath)) {
    throw new Error("مسیر بکاپ باید کامل باشد؛ مانند C:\\Backups یا D:\\RepairBackups.");
  }

  const databaseName = String(db.settings.sqlServerDbName || "").trim();
  if (!databaseName) {
    throw new Error("نام دیتابیس SQL Server وارد نشده است.");
  }

  backupRuntimeStatus.isRunning = true;
  backupRuntimeStatus.lastRunAt = new Date().toISOString();
  backupRuntimeStatus.lastError = null;

  try {
    const backupDirectory = path.normalize(rawBackupPath);
    if (fs.existsSync(backupDirectory) && !fs.statSync(backupDirectory).isDirectory()) {
      throw new Error("مسیر انتخاب‌شده یک پوشه نیست.");
    }
    fs.mkdirSync(backupDirectory, { recursive: true });

    const safeDatabaseName = databaseName.replace(/[^a-zA-Z0-9_-]/g, "_") || "database";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(backupDirectory, `${safeDatabaseName}_${timestamp}.bak`);
    const pool = await getSqlPool();
    await pool.request()
      .input("backupFile", mssql.NVarChar(4000), backupFile)
      .query(`BACKUP DATABASE ${quoteSqlIdentifier(databaseName)} TO DISK = @backupFile WITH INIT, STATS = 10`);

    backupRuntimeStatus.lastSuccessAt = new Date().toISOString();
    backupRuntimeStatus.lastFile = backupFile;
    return {
      success: true,
      trigger,
      file: backupFile,
      completedAt: backupRuntimeStatus.lastSuccessAt,
    };
  } catch (error: any) {
    const message = error?.message || "خطای نامشخص در گرفتن بکاپ.";
    backupRuntimeStatus.lastError = message;
    throw new Error(`گرفتن بکاپ انجام نشد: ${message}`);
  } finally {
    backupRuntimeStatus.isRunning = false;
  }
}

function configureBackupScheduler() {
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = null;
  }
  backupNextRunAt = null;

  const settings = getDb().settings;
  if (
    settings.backupEnabled !== true ||
    settings.dbType !== "sql" ||
    settings.sqlServerConnected !== true ||
    !String(settings.backupPath || "").trim()
  ) {
    return;
  }

  const intervalMinutes = getBackupIntervalMinutes(settings.backupIntervalMinutes);
  const intervalMs = intervalMinutes * 60 * 1000;
  backupNextRunAt = new Date(Date.now() + intervalMs).toISOString();
  backupTimer = setInterval(() => {
    backupNextRunAt = new Date(Date.now() + intervalMs).toISOString();
    void performDatabaseBackup(undefined, "automatic").catch((error) => {
      console.error("Automatic SQL Server backup failed:", error.message);
    });
  }, intervalMs);
}

async function getSqlPool() {
  const db = getDb();
  const settings = db.settings;
  if (!settings.sqlServerHost || !settings.sqlServerPort) {
    throw new Error("تنظیمات اتصال به اس‌کیو‌ال سرور وارد نشده است.");
  }
  
  const config: mssql.config = {
    user: settings.sqlServerUser || "",
    password: settings.sqlServerPassword || "",
    server: settings.sqlServerHost,
    port: Number(settings.sqlServerPort),
    database: settings.sqlServerDbName || "",
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    connectionTimeout: 5000,
    requestTimeout: 15000,
  };

  if (sqlPool) {
    try {
      await sqlPool.request().query("SELECT 1");
      return sqlPool;
    } catch (e) {
      console.log("SQL Pool is unhealthy, reconnecting...", e);
      try {
        await sqlPool.close();
      } catch (_) {}
      sqlPool = null;
    }
  }

  sqlPool = await mssql.connect(config);
  return sqlPool;
}

async function ensureRepairsTable(pool: mssql.ConnectionPool) {
  const createTableQuery = `
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Repairs' AND xtype='U')
    CREATE TABLE Repairs (
      ID INT IDENTITY(1,1) PRIMARY KEY,
      CustomerName NVARCHAR(255) NULL,
      DeviceModel NVARCHAR(255) NULL,
      SerialNumber NVARCHAR(255) NULL,
      Problem NVARCHAR(MAX) NULL,
      Status NVARCHAR(50) NULL,
      ContactPerson NVARCHAR(255) NULL,
      ContactNumber NVARCHAR(100) NULL,
      DateRecive NVARCHAR(100) NULL,
      Guarantee NVARCHAR(50) NULL,
      RepairDateSend NVARCHAR(100) NULL,
      RepairDateRecive NVARCHAR(100) NULL,
      Payment NVARCHAR(100) NULL,
      SendDate NVARCHAR(100) NULL,
      SendAddress NVARCHAR(MAX) NULL,
      Other NVARCHAR(MAX) NULL,
      OtherParts NVARCHAR(MAX) NULL,
      RepairCompany NVARCHAR(100) NULL,
      Convention NVARCHAR(100) NULL,
      RepairPrice NVARCHAR(100) NULL,
      ConfirmationPrice NVARCHAR(100) NULL,
      SendingMethod NVARCHAR(100) NULL,
      PersonRecive NVARCHAR(255) NULL,
      TrackingCode NVARCHAR(255) NULL,
      RD NVARCHAR(100) NULL,
      RDModel NVARCHAR(255) NULL,
      RDSerial NVARCHAR(255) NULL,
      RDParts NVARCHAR(MAX) NULL,
      RDSendDate NVARCHAR(100) NULL,
      RDReciveDate NVARCHAR(100) NULL,
      SmsRecive NVARCHAR(50) NULL,
      SmsRC NVARCHAR(50) NULL,
      SmsRP NVARCHAR(50) NULL,
      SmsCRP NVARCHAR(50) NULL,
      SmsRD NVARCHAR(50) NULL,
      SmsSM NVARCHAR(50) NULL,
      FactorNo NVARCHAR(255) NULL,
      CreatedAt DATETIME DEFAULT GETDATE()
    );
  `;
  await pool.request().query(createTableQuery);
}

function textValue(value: any): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function realDateValue(value: any): string {
  const date = textValue(value);
  return /[0-9۰-۹٠-٩]/.test(date) ? date : "";
}

function statusToStep(status: any): number {
  const value = textValue(status);
  if (/^\d+$/.test(value)) return Math.min(5, Math.max(1, Number(value)));
  if (value.includes("بررسی اولیه")) return 2;
  if (value.includes("اعلام هزینه")) return 3;
  if (value.includes("تایید نهایی") || value.includes("تأیید نهایی")) return 4;
  if (value.includes("تحویل و ارسال")) return 5;
  return 1;
}

function stepToStatus(step: any): string {
  const normalizedStep = Math.min(5, Math.max(1, Number(step) || 1));
  return [
    "",
    "دریافت دستگاه",
    "بررسی اولیه",
    "اعلام هزینه",
    "تایید نهایی و پرداخت",
    "تحویل و ارسال",
  ][normalizedStep];
}

function normalizeShipMethod(value: any): string {
  const method = textValue(value);
  if (method === "پیک") return "پیک مشتری";
  if (method === "حضوری") return "تحویل حضوری";
  if (method === "شرکتی") return "پیک شرکت";
  return method || "ارسال نشده";
}

function mapRowToRepair(row: any): Repair {
  const deviceModel = textValue(row.DeviceModel);
  const replacementName = textValue(row.RDModel);
  const convention = textValue(row.Convention);
  const pending = "درحال بررسی";
  const costApproval = textValue(row.ConfirmationPrice ?? row.ConfirmationPric);
  return {
    id: Number(row.ID),
    isConsignment: convention === "امانی" || (!deviceModel && !!replacementName),
    customerName: textValue(row.CustomerName),
    deviceModel,
    serialNumber: textValue(row.SerialNumber),
    problem: textValue(row.Problem),
    accessories: textValue(row.OtherParts),
    contactPerson: textValue(row.ContactPerson),
    contactNumber: textValue(row.ContactNumber),
    warranty: ["دارد", "ندارد"].includes(textValue(row.Guarantee)) ? textValue(row.Guarantee) as Repair["warranty"] : pending,
    contract: ["دارد", "ندارد"].includes(convention) ? convention as Repair["contract"] : pending,
    receiveDate: realDateValue(row.DateRecive),
    hasReplacement: ["دارد", "ندارد"].includes(textValue(row.RD)) ? textValue(row.RD) as Repair["hasReplacement"] : pending,
    repairCompany: normalizeRepairCompany(row.RepairCompany),
    initialSendDate: realDateValue(row.RepairDateSend),
    initialReceiveDate: realDateValue(row.RepairDateRecive),
    initialOtherInfo: textValue(row.Other),
    replacementName,
    replacementSerial: textValue(row.RDSerial),
    replacementAccessories: textValue(row.RDParts),
    replacementSendDate: realDateValue(row.RDSendDate),
    replacementReceiveDate: realDateValue(row.RDReciveDate),
    invoiceNumber: textValue(row.FactorNo),
    quotedCost: textValue(row.RepairPrice),
    costApproved: ["شده است", "نشده است"].includes(costApproval) ? costApproval as Repair["costApproved"] : pending,
    paymentStatus: ["شده است", "نشده است"].includes(textValue(row.Payment)) ? textValue(row.Payment) as Repair["paymentStatus"] : pending,
    shipDate: realDateValue(row.SendDate),
    shipMethod: normalizeShipMethod(row.SendingMethod) as Repair["shipMethod"],
    trackingCode: textValue(row.TrackingCode),
    receiverAddress: textValue(row.SendAddress),
    relatedRepairId: textValue(row.PersonRecive),
    smsSentReceipt: row.SmsRecive === "1" || row.SmsRecive === "true",
    smsSentInspection: row.SmsRP === "1" || row.SmsRP === "true",
    smsSentCost: row.SmsRC === "1" || row.SmsRC === "true",
    smsSentCostApproved: row.SmsCRP === "1" || row.SmsCRP === "true",
    smsSentReplacement: row.SmsRD === "1" || row.SmsRD === "true",
    smsSentShipping: row.SmsSM === "1" || row.SmsSM === "true",
    currentStep: statusToStep(row.Status),
    createdAt: row.CreatedAt instanceof Date ? row.CreatedAt.toISOString() : textValue(row.CreatedAt),
  };
}

function saveDb(data: any) {
  // PostgreSQL is authoritative. Keep the JSON file only as a fallback
  // snapshot when PostgreSQL is unavailable, avoiding file-based writes in
  // normal operation.
  if (!postgresPool) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  }
  runtimeDb = data as AppDatabase;
  if (postgresPool) {
    postgresPersistQueue = postgresPersistQueue
      .then(() => persistDbSnapshot(runtimeDb as AppDatabase))
      .catch((error) => console.error("PostgreSQL persistence error:", error));
  }
}

async function startServer() {
  try {
    await initializePostgres();
    console.log(`PostgreSQL connected: ${POSTGRES_CONFIG.host}:${POSTGRES_CONFIG.port}/${POSTGRES_CONFIG.database}`);
  } catch (error) {
    console.error("PostgreSQL initialization failed; using local JSON backup:", error);
    runtimeDb = loadJsonDb();
  }

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // PostgreSQL is the primary runtime database. SQL Server support remains
  // available only for the legacy connection test and backwards compatibility.
  const isDbConnected = () => {
    const db = getDb();
    if (db.settings.dbType === "cache") {
      return true;
    }
    if (db.settings.dbType === "postgres") {
      return !!postgresPool;
    }
    return db.settings.sqlServerConnected ?? false;
  };

  // API Routes
  app.get("/api/db-status", async (req, res) => {
    const db = getDb();
    const isCache = db.settings.dbType === "cache";
    if (isCache) {
      return res.json({
        connected: true,
        type: "Offline (Browser Cache)",
        latencyMs: 1
      });
    }

    if (db.settings.dbType === "postgres") {
      try {
        const start = Date.now();
        await postgresPool?.query("SELECT 1");
        return res.json({
          connected: !!postgresPool,
          type: "PostgreSQL",
          latencyMs: Date.now() - start,
        });
      } catch (error: any) {
        return res.json({
          connected: false,
          type: "PostgreSQL",
          latencyMs: 0,
          error: error.message,
        });
      }
    }

    if (db.settings.sqlServerConnected) {
      try {
        const start = Date.now();
        const pool = await getSqlPool();
        await pool.request().query("SELECT 1");
        const latencyMs = Date.now() - start;
        return res.json({
          connected: true,
          type: "Microsoft SQL Server",
          latencyMs
        });
      } catch (err) {
        console.error("SQL Server status ping failed:", err);
        db.settings.sqlServerConnected = false;
        saveDb(db);
        return res.json({
          connected: false,
          type: "Microsoft SQL Server",
          latencyMs: 0,
          error: "ارتباط با دیتابیس قطع شده است"
        });
      }
    }

    res.json({
      connected: false,
      type: "Microsoft SQL Server",
      latencyMs: 0
    });
  });

  app.post("/api/db-status/toggle", (req, res) => {
    res.json({ success: true, connected: isDbConnected() });
  });

  // Get repairs & consignments
  app.get("/api/repairs", async (req, res) => {
    if (!isDbConnected()) {
      return res.status(503).json({ error: "Database not connected" });
    }
    const db = getDb();
    const isSql = db.settings.dbType === "sql" && db.settings.sqlServerConnected;
    
    if (isSql) {
      try {
        const pool = await getSqlPool();
        await ensureRepairsTable(pool);
        const result = await pool.request().query("SELECT * FROM Repairs ORDER BY ID DESC");
        const mapped = result.recordset.map(mapRowToRepair);
        return res.json(mapped);
      } catch (err: any) {
        console.error("SQL Server error in GET /api/repairs:", err);
        return res.status(500).json({ error: "خطا در دریافت اطلاعات از اس‌کیو‌ال سرور: " + err.message });
      }
    }
    res.json(db.repairs);
  });

  // Get single repair
  app.get("/api/repairs/:id", async (req, res) => {
    if (!isDbConnected()) {
      return res.status(503).json({ error: "Database not connected" });
    }
    const { id } = req.params;
    const db = getDb();
    const isSql = db.settings.dbType === "sql" && db.settings.sqlServerConnected;

    if (isSql) {
      try {
        const pool = await getSqlPool();
        await ensureRepairsTable(pool);
        const result = await pool.request()
          .input("id", mssql.Int, parseInt(id))
          .query("SELECT * FROM Repairs WHERE ID = @id");
        
        if (result.recordset.length === 0) {
          return res.status(404).json({ error: "دستگاه مورد نظر یافت نشد" });
        }
        return res.json(mapRowToRepair(result.recordset[0]));
      } catch (err: any) {
        console.error("SQL Server error in GET /api/repairs/:id:", err);
        return res.status(500).json({ error: "خطا در دریافت اطلاعات از اس‌کیو‌ال سرور: " + err.message });
      }
    }

    const item = db.repairs.find((r: Repair) => r.id === parseInt(id));
    if (!item) {
      return res.status(404).json({ error: "دستگاه مورد نظر یافت نشد" });
    }
    res.json(item);
  });

  // Create new repair/consignment
  app.post("/api/repairs", async (req, res) => {
    if (!isDbConnected()) {
      return res.status(503).json({ error: "Database not connected" });
    }
    const db = getDb();
    const newItem = req.body as Repair;
    const isSql = db.settings.dbType === "sql" && db.settings.sqlServerConnected;

    if (isSql) {
      try {
        const pool = await getSqlPool();
        await ensureRepairsTable(pool);
        
        const result = await pool.request()
          .input("CustomerName", mssql.NVarChar, newItem.customerName)
          .input("DeviceModel", mssql.NVarChar, newItem.deviceModel)
          .input("SerialNumber", mssql.NVarChar, newItem.serialNumber)
          .input("Problem", mssql.NVarChar, newItem.problem)
          .input("Status", mssql.NVarChar, stepToStatus(newItem.currentStep))
          .input("ContactPerson", mssql.NVarChar, newItem.contactPerson)
          .input("ContactNumber", mssql.NVarChar, newItem.contactNumber)
          .input("DateRecive", mssql.NVarChar, newItem.receiveDate)
          .input("Guarantee", mssql.NVarChar, newItem.warranty)
          .input("RepairDateSend", mssql.NVarChar, newItem.initialSendDate)
          .input("RepairDateRecive", mssql.NVarChar, newItem.initialReceiveDate)
          .input("Payment", mssql.NVarChar, newItem.paymentStatus)
          .input("SendDate", mssql.NVarChar, newItem.shipDate)
          .input("SendAddress", mssql.NVarChar, newItem.receiverAddress)
          .input("Other", mssql.NVarChar, newItem.initialOtherInfo)
          .input("OtherParts", mssql.NVarChar, newItem.accessories)
          .input("RepairCompany", mssql.NVarChar, normalizeRepairCompany(newItem.repairCompany))
          .input("Convention", mssql.NVarChar, newItem.isConsignment ? "امانی" : (newItem.contract || "درحال بررسی"))
          .input("RepairPrice", mssql.NVarChar, newItem.quotedCost)
          .input("ConfirmationPrice", mssql.NVarChar, newItem.costApproved)
          .input("SendingMethod", mssql.NVarChar, newItem.shipMethod)
          .input("PersonRecive", mssql.NVarChar, newItem.relatedRepairId || "")
          .input("TrackingCode", mssql.NVarChar, newItem.trackingCode)
          .input("RD", mssql.NVarChar, newItem.hasReplacement)
          .input("RDModel", mssql.NVarChar, newItem.replacementName)
          .input("RDSerial", mssql.NVarChar, newItem.replacementSerial)
          .input("RDParts", mssql.NVarChar, newItem.replacementAccessories)
          .input("RDSendDate", mssql.NVarChar, newItem.replacementSendDate)
          .input("RDReciveDate", mssql.NVarChar, newItem.replacementReceiveDate)
          .input("FactorNo", mssql.NVarChar, newItem.invoiceNumber)
          .input("SmsRecive", mssql.NVarChar, newItem.smsSentReceipt ? "1" : "0")
          .input("SmsRP", mssql.NVarChar, newItem.smsSentInspection ? "1" : "0")
          .input("SmsRC", mssql.NVarChar, newItem.smsSentCost ? "1" : "0")
          .input("SmsCRP", mssql.NVarChar, newItem.smsSentCostApproved ? "1" : "0")
          .input("SmsRD", mssql.NVarChar, newItem.smsSentReplacement ? "1" : "0")
          .input("SmsSM", mssql.NVarChar, newItem.smsSentShipping ? "1" : "0")
          .query(`
            INSERT INTO Repairs (
              CustomerName, DeviceModel, SerialNumber, Problem, Status, ContactPerson, ContactNumber, 
              DateRecive, Guarantee, RepairDateSend, RepairDateRecive, Payment, SendDate, SendAddress, 
              Other, OtherParts, RepairCompany, Convention, RepairPrice, ConfirmationPrice, SendingMethod, 
              PersonRecive, TrackingCode, RD, RDModel, RDSerial, RDParts, RDSendDate, RDReciveDate, FactorNo,
              SmsRecive, SmsRP, SmsRC, SmsCRP, SmsRD, SmsSM, CreatedAt
            )
            VALUES (
              @CustomerName, @DeviceModel, @SerialNumber, @Problem, @Status, @ContactPerson, @ContactNumber, 
              @DateRecive, @Guarantee, @RepairDateSend, @RepairDateRecive, @Payment, @SendDate, @SendAddress, 
              @Other, @OtherParts, @RepairCompany, @Convention, @RepairPrice, @ConfirmationPrice, @SendingMethod, 
              @PersonRecive, @TrackingCode, @RD, @RDModel, @RDSerial, @RDParts, @RDSendDate, @RDReciveDate, @FactorNo,
              @SmsRecive, @SmsRP, @SmsRC, @SmsCRP, @SmsRD, @SmsSM, GETDATE()
            );
            SELECT SCOPE_IDENTITY() AS insertId;
          `);
        
        const insertId = result.recordset[0].insertId;
        newItem.id = insertId;
        return res.status(201).json(newItem);
      } catch (err: any) {
        console.error("SQL Server error in POST /api/repairs:", err);
        return res.status(500).json({ error: "خطا در ثبت اطلاعات در اس‌کیو‌ال سرور: " + err.message });
      }
    }

    // Generate unique ID
    const nextId = db.repairs.length > 0 
      ? Math.max(...db.repairs.map((r: Repair) => r.id)) + 1 
      : 1001;
      
    newItem.id = nextId;
    if (newItem.currentStep === undefined) newItem.currentStep = 1;
    
    db.repairs.push(newItem);
    saveDb(db);
    res.status(201).json(newItem);
  });

  // Update repair/consignment
  app.put("/api/repairs/:id", async (req, res) => {
    if (!isDbConnected()) {
      return res.status(503).json({ error: "Database not connected" });
    }
    const { id } = req.params;
    const db = getDb();
    const updatedFields = req.body as Repair;
    const isSql = db.settings.dbType === "sql" && db.settings.sqlServerConnected;

    if (isSql) {
      try {
        const pool = await getSqlPool();
        await ensureRepairsTable(pool);
        
        const existingResult = await pool.request()
          .input("id", mssql.Int, parseInt(id))
          .query("SELECT * FROM Repairs WHERE ID = @id");
          
        if (existingResult.recordset.length === 0) {
          return res.status(404).json({ error: "دستگاه مورد نظر یافت نشد" });
        }
        
        const currentData = mapRowToRepair(existingResult.recordset[0]);
        const merged = { ...currentData, ...updatedFields };

        await pool.request()
          .input("id", mssql.Int, parseInt(id))
          .input("CustomerName", mssql.NVarChar, merged.customerName)
          .input("DeviceModel", mssql.NVarChar, merged.deviceModel)
          .input("SerialNumber", mssql.NVarChar, merged.serialNumber)
          .input("Problem", mssql.NVarChar, merged.problem)
           .input("Status", mssql.NVarChar, stepToStatus(merged.currentStep))
          .input("ContactPerson", mssql.NVarChar, merged.contactPerson)
          .input("ContactNumber", mssql.NVarChar, merged.contactNumber)
          .input("DateRecive", mssql.NVarChar, merged.receiveDate)
          .input("Guarantee", mssql.NVarChar, merged.warranty)
          .input("RepairDateSend", mssql.NVarChar, merged.initialSendDate)
          .input("RepairDateRecive", mssql.NVarChar, merged.initialReceiveDate)
          .input("Payment", mssql.NVarChar, merged.paymentStatus)
          .input("SendDate", mssql.NVarChar, merged.shipDate)
          .input("SendAddress", mssql.NVarChar, merged.receiverAddress)
          .input("Other", mssql.NVarChar, merged.initialOtherInfo)
          .input("OtherParts", mssql.NVarChar, merged.accessories)
          .input("RepairCompany", mssql.NVarChar, normalizeRepairCompany(merged.repairCompany))
          .input("Convention", mssql.NVarChar, merged.isConsignment ? "امانی" : (merged.contract || "درحال بررسی"))
          .input("RepairPrice", mssql.NVarChar, merged.quotedCost)
          .input("ConfirmationPrice", mssql.NVarChar, merged.costApproved)
          .input("SendingMethod", mssql.NVarChar, merged.shipMethod)
          .input("PersonRecive", mssql.NVarChar, merged.relatedRepairId || "")
          .input("TrackingCode", mssql.NVarChar, merged.trackingCode)
          .input("RD", mssql.NVarChar, merged.hasReplacement)
          .input("RDModel", mssql.NVarChar, merged.replacementName)
          .input("RDSerial", mssql.NVarChar, merged.replacementSerial)
          .input("RDParts", mssql.NVarChar, merged.replacementAccessories)
          .input("RDSendDate", mssql.NVarChar, merged.replacementSendDate)
          .input("RDReciveDate", mssql.NVarChar, merged.replacementReceiveDate)
          .input("FactorNo", mssql.NVarChar, merged.invoiceNumber)
          .input("SmsRecive", mssql.NVarChar, merged.smsSentReceipt ? "1" : "0")
          .input("SmsRP", mssql.NVarChar, merged.smsSentInspection ? "1" : "0")
          .input("SmsRC", mssql.NVarChar, merged.smsSentCost ? "1" : "0")
          .input("SmsCRP", mssql.NVarChar, merged.smsSentCostApproved ? "1" : "0")
          .input("SmsRD", mssql.NVarChar, merged.smsSentReplacement ? "1" : "0")
          .input("SmsSM", mssql.NVarChar, merged.smsSentShipping ? "1" : "0")
          .query(`
            UPDATE Repairs SET
              CustomerName = @CustomerName,
              DeviceModel = @DeviceModel,
              SerialNumber = @SerialNumber,
              Problem = @Problem,
              Status = @Status,
              ContactPerson = @ContactPerson,
              ContactNumber = @ContactNumber,
              DateRecive = @DateRecive,
              Guarantee = @Guarantee,
              RepairDateSend = @RepairDateSend,
              RepairDateRecive = @RepairDateRecive,
              Payment = @Payment,
              SendDate = @SendDate,
              SendAddress = @SendAddress,
              Other = @Other,
              OtherParts = @OtherParts,
              RepairCompany = @RepairCompany,
              Convention = @Convention,
              RepairPrice = @RepairPrice,
              ConfirmationPrice = @ConfirmationPrice,
              SendingMethod = @SendingMethod,
              TrackingCode = @TrackingCode,
              RD = @RD,
              RDModel = @RDModel,
              RDSerial = @RDSerial,
              RDParts = @RDParts,
              RDSendDate = @RDSendDate,
              RDReciveDate = @RDReciveDate,
              PersonRecive = @PersonRecive,
              SmsRecive = @SmsRecive,
              SmsRP = @SmsRP,
              SmsRC = @SmsRC,
              SmsCRP = @SmsCRP,
              SmsRD = @SmsRD,
              SmsSM = @SmsSM,
              FactorNo = @FactorNo
            WHERE ID = @id
          `);
          
        return res.json({ ...merged, id: parseInt(id) });
      } catch (err: any) {
        console.error("SQL Server error in PUT /api/repairs/:id:", err);
        return res.status(500).json({ error: "خطا در بروزرسانی اطلاعات در اس‌کیو‌ال سرور: " + err.message });
      }
    }

    const index = db.repairs.findIndex((r: Repair) => r.id === parseInt(id));
    if (index === -1) {
      return res.status(404).json({ error: "دستگاه مورد نظر یافت نشد" });
    }
    
    const updated = { ...db.repairs[index], ...req.body, id: parseInt(id) };
    db.repairs[index] = updated;
    saveDb(db);
    res.json(updated);
  });

  // Delete repair/consignment
  app.delete("/api/repairs/:id", async (req, res) => {
    if (!isDbConnected()) {
      return res.status(503).json({ error: "Database not connected" });
    }
    const { id } = req.params;
    const db = getDb();
    const isSql = db.settings.dbType === "sql" && db.settings.sqlServerConnected;

    if (isSql) {
      try {
        const pool = await getSqlPool();
        await ensureRepairsTable(pool);
        await pool.request()
          .input("id", mssql.Int, parseInt(id))
          .query("DELETE FROM Repairs WHERE ID = @id");
        return res.json({ success: true, message: "دستگاه با موفقیت حذف شد" });
      } catch (err: any) {
        console.error("SQL Server error in DELETE /api/repairs/:id:", err);
        return res.status(500).json({ error: "خطا در حذف اطلاعات در اس‌کیو‌ال سرور: " + err.message });
      }
    }

    const initialLength = db.repairs.length;
    db.repairs = db.repairs.filter((r: Repair) => r.id !== parseInt(id));
    
    if (db.repairs.length === initialLength) {
      return res.status(404).json({ error: "دستگاه مورد نظر یافت نشد" });
    }
    
    saveDb(db);
    res.json({ success: true, message: "دستگاه با موفقیت حذف شد" });
  });

  // Settings routes
  app.get("/api/settings", (req, res) => {
    const db = getDb();
    res.json(db.settings);
  });

  app.put("/api/settings", (req, res) => {
    const db = getDb();
    db.settings = { ...db.settings, ...req.body, dbType: "sql" };
    saveDb(db);
    configureBackupScheduler();
    res.json(db.settings);
  });

  app.get("/api/backup/status", (req, res) => {
    res.json(getBackupStatus());
  });

  app.post("/api/backup/select-folder", async (req, res) => {
    if (process.platform !== "win32") {
      return res.status(400).json({ success: false, error: "انتخاب پوشه از این مسیر فقط روی ویندوز در دسترس است." });
    }

    try {
      const pickerScript = [
        "Add-Type -AssemblyName System.Windows.Forms",
        "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
        "$dialog.Description = 'انتخاب پوشه ذخیره بکاپ SQL Server'",
        "$dialog.ShowNewFolderButton = $true",
        "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Write($dialog.SelectedPath) }",
      ].join("; ");
      const { stdout } = await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", pickerScript],
        { timeout: 120000, windowsHide: false, maxBuffer: 10000 },
      );
      const selectedPath = stdout.trim();
      if (!selectedPath) {
        return res.json({ success: false, cancelled: true });
      }
      return res.json({ success: true, path: selectedPath });
    } catch (error: any) {
      console.error("Backup folder picker failed:", error);
      return res.status(500).json({ success: false, error: "باز کردن پنجره انتخاب پوشه انجام نشد." });
    }
  });

  app.post("/api/backup", async (req, res) => {
    try {
      const result = await performDatabaseBackup(req.body?.backupPath, "manual");
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message || "گرفتن بکاپ انجام نشد." });
    }
  });

  app.post("/api/settings/test-connection", async (req, res) => {
    const { host, port, dbName, username, password } = req.body;

    if (req.body.dbType === "postgres" || req.body.type === "postgres") {
      if (!host || !port || !dbName || !username) {
        return res.status(400).json({ success: false, error: "PostgreSQL host، port، نام دیتابیس و کاربر الزامی است." });
      }
      const testPool = new Pool({
        host,
        port: Number(port),
        database: dbName,
        user: username,
        password: password || "",
        connectionTimeoutMillis: 4000,
      });
      try {
        await testPool.query("SELECT 1");
        return res.json({ success: true, message: "اتصال به PostgreSQL با موفقیت برقرار شد." });
      } catch (error: any) {
        return res.json({ success: false, error: `خطای اتصال PostgreSQL: ${error.message}`, rawError: error.message });
      } finally {
        await testPool.end().catch(() => undefined);
      }
    }

    if (!host || !port) {
      return res.status(400).json({
        success: false,
        error: "لطفاً آدرس سرور (Host) و پورت (Port) را به طور کامل وارد نمایید."
      });
    }

    try {
      const config: mssql.config = {
        user: username || "",
        password: password || "",
        server: host,
        port: Number(port),
        database: dbName || "",
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
        connectionTimeout: 4000,
        requestTimeout: 4000,
      };

      const pool = await mssql.connect(config);
      await pool.request().query("SELECT 1");
      await pool.close();

      return res.json({
        success: true,
        message: `اتصال به پایگاه داده Microsoft SQL Server با موفقیت برقرار شد!`
      });
    } catch (sqlErr: any) {
      console.error("SQL Server full connection failed, checking error type:", sqlErr);
      
      let errorMsg = sqlErr.message || "";
      let farsiError = "";
      
      if (errorMsg.includes("Login failed") || errorMsg.includes("ELOGIN")) {
        farsiError = `خطای احراز هویت: نام کاربری (${username}) یا رمز عبور اشتباه است، یا کاربر sa دسترسی‌های لازم را ندارد.`;
      } else if (errorMsg.includes("database") && (errorMsg.includes("does not exist") || errorMsg.includes("find"))) {
        farsiError = `دیتابیس با نام "${dbName}" در سرور یافت نشد. لطفاً نام پایگاه داده را بررسی کنید.`;
      } else if (errorMsg.includes("Connection lost") || errorMsg.includes("timeout") || errorMsg.includes("ETIMEOUT") || errorMsg.includes("ESOCKET")) {
        farsiError = `خطای مهلت زمانی (Timeout): امکان اتصال به ${host}:${port} فراهم نشد. مطمئن شوید فایروال سیستم خاموش است و TCP/IP اس‌کیو‌ال سرور فعال است.`;
      } else if (errorMsg.includes("ECONNREFUSED")) {
        farsiError = `اتصال برقرار نشد: هیچ سروری روی پورت ${port} در آدرس ${host} فعال نیست. مطمئن شوید سرویس SQL Server در حال اجراست.`;
      } else {
        farsiError = `خطای اتصال اس‌کیو‌ال سرور: ${errorMsg}`;
      }

      return res.json({
        success: false,
        error: farsiError,
        rawError: errorMsg
      });
    }
  });

  // User management routes
  app.get("/api/users", (req, res) => {
    const db = getDb();
    res.json(db.users || DEFAULT_USERS);
  });

  app.post("/api/users", (req, res) => {
    const db = getDb();
    if (!db.users) db.users = [...DEFAULT_USERS];
    const newUser = req.body as User;
    
    // Validate role
    if (newUser.role !== "admin" && newUser.role !== "user") {
      newUser.role = "user";
    }

    newUser.id = String(Date.now());
    if (!newUser.password) newUser.password = "1234";

    // Check duplicate username
    if (db.users.some((u: User) => u.username.toLowerCase() === newUser.username.trim().toLowerCase())) {
      return res.status(400).json({ error: "این نام کاربری قبلاً ثبت شده است." });
    }

    db.users.push(newUser);
    saveDb(db);
    res.status(201).json(newUser);
  });

  app.put("/api/users/:id", (req, res) => {
    const db = getDb();
    if (!db.users) db.users = [...DEFAULT_USERS];
    const { id } = req.params;
    const userIndex = db.users.findIndex((u: User) => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "کاربر یافت نشد." });
    }

    const { name, username, role, password } = req.body;
    if (name) db.users[userIndex].name = name;
    if (username) db.users[userIndex].username = username;
    if (role && (role === "admin" || role === "user")) db.users[userIndex].role = role;
    if (password) db.users[userIndex].password = password;

    saveDb(db);
    res.json(db.users[userIndex]);
  });

  app.delete("/api/users/:id", (req, res) => {
    const db = getDb();
    if (!db.users) db.users = [...DEFAULT_USERS];
    const { id } = req.params;
    
    const targetUser = db.users.find((u: User) => u.id === id);
    if (targetUser && targetUser.username === "admin") {
      return res.status(400).json({ error: "حذف کاربر اصلی مدیر سیستم (admin) امکان‌پذیر نمی‌باشد." });
    }

    db.users = db.users.filter((u: User) => u.id !== id);
    saveDb(db);
    res.json({ success: true, message: "کاربر با موفقیت حذف شد" });
  });

  // Reminders routes
  app.get("/api/reminders", (req, res) => {
    if (!isDbConnected()) {
      return res.status(503).json({ error: "Database not connected" });
    }
    const db = getDb();
    res.json(db.reminders || []);
  });

  app.post("/api/reminders", (req, res) => {
    if (!isDbConnected()) {
      return res.status(503).json({ error: "Database not connected" });
    }
    const db = getDb();
    const newReminder = req.body as Reminder;
    
    if (!db.reminders) db.reminders = [];
    const nextId = db.reminders.length > 0
      ? Math.max(...db.reminders.map((r: any) => r.id)) + 1
      : 1;
      
    newReminder.id = nextId;
    if (newReminder.completed === undefined) newReminder.completed = false;
    if (!newReminder.createdAt) {
      newReminder.createdAt = new Date().toLocaleDateString("fa-IR");
    }
    
    db.reminders.push(newReminder);
    saveDb(db);
    res.status(201).json(newReminder);
  });

  app.put("/api/reminders/:id", (req, res) => {
    if (!isDbConnected()) {
      return res.status(503).json({ error: "Database not connected" });
    }
    const { id } = req.params;
    const db = getDb();
    if (!db.reminders) db.reminders = [];
    const index = db.reminders.findIndex((r: any) => r.id === parseInt(id));
    
    if (index === -1) {
      return res.status(404).json({ error: "یادآور مورد نظر یافت نشد" });
    }
    
    const updated = { ...db.reminders[index], ...req.body, id: parseInt(id) };
    db.reminders[index] = updated;
    saveDb(db);
    res.json(updated);
  });

  app.delete("/api/reminders/:id", (req, res) => {
    if (!isDbConnected()) {
      return res.status(503).json({ error: "Database not connected" });
    }
    const { id } = req.params;
    const db = getDb();
    if (!db.reminders) db.reminders = [];
    const initialLength = db.reminders.length;
    db.reminders = db.reminders.filter((r: any) => r.id !== parseInt(id));
    
    if (db.reminders.length === initialLength) {
      return res.status(404).json({ error: "یادآور مورد نظر یافت نشد" });
    }
    
    saveDb(db);
    res.json({ success: true, message: "یادآور با موفقیت حذف شد" });
  });

  // SMS sender API (Payamak-Panel SendByBaseNumber & Kavenegar support)
  app.post("/api/sms/send", async (req, res) => {
    try {
      const { phone, smsType, bodyId, variables, message, repairId } = req.body;
      const db = getDb();
      const settings: SystemSettings = db.settings || DEFAULT_SETTINGS;

      if (!phone) {
        return res.status(400).json({ success: false, error: "شماره گیرنده الزامی است." });
      }

      // Clean receptor phone number (remove whitespaces, convert Persian/Arabic numerals to standard digits)
      let cleanPhone = String(phone).replace(/\s+/g, "").trim();
      cleanPhone = cleanPhone
        .replace(/[۰-۹]/g, (d: string) => String.fromCharCode(d.charCodeAt(0) - 1776))
        .replace(/[٠-٩]/g, (d: string) => String.fromCharCode(d.charCodeAt(0) - 1632));

      if (cleanPhone.startsWith("+98")) cleanPhone = "0" + cleanPhone.slice(3);
      else if (cleanPhone.startsWith("98")) cleanPhone = "0" + cleanPhone.slice(2);
      else if (!cleanPhone.startsWith("0") && cleanPhone.length === 10) cleanPhone = "0" + cleanPhone;

      const provider = settings.smsProvider || "payamak_panel";
      const isMock = !!settings.enableMockSms;

      let success = false;
      let responseMessage = "";
      let trackingCode = "";

      if (isMock) {
        console.log(`[MOCK SMS] Sending to ${cleanPhone} [Type: ${smsType}, BodyId: ${bodyId}]:`, variables || message);
        success = true;
        trackingCode = "MOCK-" + Date.now();
        responseMessage = `✅ پیامک (حالت تستی) با موفقیت به شماره ${cleanPhone} ارسال شد.`;
      } else if (provider === "payamak_panel") {
        const username = (settings.smsUsername || process.env.SMS_USERNAME || "").trim();
        const password = (settings.smsPassword || process.env.SMS_PASSWORD || "").trim();

        if (!username || !password) {
          return res.status(400).json({
            success: false,
            error: "نام کاربری یا کلمه عبور پنل پیامک در تنظیمات وارد نشده است. لطفاً در «تنظیمات سیستم > تنظیمات پیامک» نام کاربری و رمز پنل خود را ثبت کنید یا گزینه «پیامک تستی» را فعال نمایید."
          });
        }

        const activeBodyId = bodyId || "384713";
        const activeVars = Array.isArray(variables) ? variables : [];

        // Build x-www-form-urlencoded params with multiple 'text' entries (matches C# FormUrlEncodedContent)
        const params = new URLSearchParams();
        params.append("username", username);
        params.append("password", password);
        params.append("to", cleanPhone);
        params.append("bodyId", activeBodyId);
        for (const val of activeVars) {
          params.append("text", (val !== undefined && val !== null ? String(val) : " "));
        }

        console.log(`[PAYAMAK-PANEL] POST https://api.payamak-panel.com/post/Send.asmx/SendByBaseNumber, BodyId: ${activeBodyId}, To: ${cleanPhone}`);

        const apiRes = await fetch("https://api.payamak-panel.com/post/Send.asmx/SendByBaseNumber", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: params.toString()
        });

        const xmlResult = await apiRes.text();
        console.log(`[PAYAMAK-PANEL RESPONSE]:`, xmlResult);

        // Extract value between <string xmlns="http://tempuri.org/">...</string>
        const match = xmlResult.match(/<string[^>]*>([^<]*)<\/string>/i);
        const extractedValue = match ? match[1].trim() : xmlResult.trim();

        if (extractedValue === "2") {
          return res.status(400).json({ success: false, error: "اعتبار حساب پیامک شما کافی نیست." });
        } else if (extractedValue === "7") {
          return res.status(400).json({ success: false, error: "متن حاوی کلمه فیلتر شده می‌باشد، با واحد اداری تماس بگیرید." });
        } else if (extractedValue === "11") {
          return res.status(400).json({ success: false, error: "پیامک ارسال نشد (خطای شماره ۱۱ سامانه)." });
        } else if (extractedValue === "18") {
          return res.status(400).json({ success: false, error: "شماره موبایل گیرنده معتبر نمی‌باشد." });
        } else if (extractedValue === "1") {
          return res.status(400).json({ success: false, error: "نام کاربری یا رمز عبور پنل پیامک نامعتبر است." });
        } else if (extractedValue === "3") {
          return res.status(400).json({ success: false, error: "محدودیت تعداد ارسال روزانه در پنل پیامک." });
        } else if (extractedValue === "5") {
          return res.status(400).json({ success: false, error: "شماره فرستنده در سامانه معتبر نیست." });
        } else if (extractedValue.length >= 15 || (!isNaN(Number(extractedValue)) && Number(extractedValue) > 100)) {
          success = true;
          trackingCode = extractedValue;
          responseMessage = "✅ پیامک با موفقیت ارسال شد.";
        } else {
          return res.status(400).json({
            success: false,
            error: `خطا در ارسال پیامک از طریق سامانه: کد بازگشتی [${extractedValue}]`
          });
        }
      } else if (provider === "kavenegar") {
        const apiKey = (settings.kavenegarApiKey || process.env.KAVENEGAR_API_KEY || "6B4B584B4238734C744651484E2B6C2B354E7973537343385A2B4A63425759493234436F4130513352486F3D").trim();
        const sender = (settings.kavenegarSender || process.env.KAVENEGAR_SENDER || "100010001224").trim();

        const url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
        const postParams = new URLSearchParams();
        postParams.append("receptor", cleanPhone);
        postParams.append("sender", sender);
        postParams.append("message", message || "تست");

        const kaveRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: postParams.toString()
        });

        const kaveData: any = await kaveRes.json();
        if (kaveData?.return?.status === 200) {
          success = true;
          trackingCode = String(kaveData?.entries?.[0]?.messageid || "OK");
          responseMessage = "✅ پیامک با موفقیت ارسال شد.";
        } else if (kaveData?.return?.status === 411) {
          return res.status(400).json({ success: false, error: "شماره گیرنده پیام معتبر نمی‌باشد." });
        } else if (kaveData?.return?.status === 418) {
          return res.status(400).json({ success: false, error: "اعتبار حساب کاوه‌نگار شما کافی نیست." });
        } else {
          return res.status(400).json({
            success: false,
            error: `خطا در کاوه‌نگار: ${kaveData?.return?.message || "خطای ناشناخته"}`
          });
        }
      }

      // When SMS succeeds and repairId is provided, persist state into SQL Server and local cache
      if (success && repairId) {
        let colName = "";
        let fieldKey: keyof Repair = "smsSentReceipt";
        if (smsType === "receipt") { colName = "SmsRecive"; fieldKey = "smsSentReceipt"; }
        else if (smsType === "inspection") { colName = "SmsRP"; fieldKey = "smsSentInspection"; }
        else if (smsType === "cost") { colName = "SmsRC"; fieldKey = "smsSentCost"; }
        else if (smsType === "cost_approved") { colName = "SmsCRP"; fieldKey = "smsSentCostApproved"; }
        else if (smsType === "replacement") { colName = "SmsRD"; fieldKey = "smsSentReplacement"; }
        else if (smsType === "shipping") { colName = "SmsSM"; fieldKey = "smsSentShipping"; }

        // Update in SQL Server if configured
        if (colName && db.settings.dbType === "sql") {
          try {
            const pool = await getSqlPool().catch(() => null);
            if (pool) {
              await pool.request()
                .input("ID", mssql.Int, repairId)
                .input("Val", mssql.NVarChar, "1")
                .query(`UPDATE Repairs SET ${colName} = @Val WHERE ID = @ID`);
              console.log(`[SQL UPDATE] Updated Repairs.${colName} = '1' for ID: ${repairId}`);
            }
          } catch (sqlErr: any) {
            console.error(`[SQL UPDATE ERROR]:`, sqlErr.message);
          }
        }

        // Update in local cache
        if (db.repairs) {
          const item = db.repairs.find((r: any) => r.id === parseInt(String(repairId)));
          if (item) {
            (item as any)[fieldKey] = true;
            saveDb(db);
          }
        }
      }

      return res.json({
        success: true,
        message: responseMessage,
        trackingCode,
        timestamp: new Date().toLocaleTimeString("fa-IR")
      });
    } catch (err: any) {
      console.error("SMS Handler Error:", err);
      return res.status(500).json({
        success: false,
        error: "خطا در برقراری ارتباط با سرویس پیامک: " + err.message
      });
    }
  });

  // Print mock trigger
  app.post("/api/print", (req, res) => {
    const { id, documentType } = req.body;
    console.log(`[MOCK PRINTER] Printing receipt for ID: ${id}, Doc Type: ${documentType}`);
    res.json({
      success: true,
      message: `دستور چاپ برای فیش دستگاه شماره ${id} صادر شد.`
    });
  });

  // Authentication check
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const db = getDb();
    const usersList: User[] = db.users || DEFAULT_USERS;

    const foundUser = usersList.find(
      (u) => u.username.toLowerCase() === (username || "").trim().toLowerCase()
    );

    if (foundUser) {
      // Check password if set or accept default admin/1234
      const expectedPassword = foundUser.password || (foundUser.role === 'admin' ? "admin" : "1234");
      if (password === expectedPassword || (foundUser.role === 'admin' && password === "admin") || password === "1234") {
        return res.json({
          success: true,
          user: {
            id: foundUser.id,
            username: foundUser.username,
            name: foundUser.name,
            role: foundUser.role || "user"
          }
        });
      }
    }

    res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است." });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    configureBackupScheduler();
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
