import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;
const root = process.cwd();
const source = JSON.parse(fs.readFileSync(path.join(root, "migration", "sqlserver-export.json"), "utf8"));
const jsonDb = JSON.parse(fs.readFileSync(path.join(root, "db.json"), "utf8"));

const pgConfig = {
  host: process.env.PGHOST || "127.0.0.1",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "maxa_repairs",
};

function text(value) {
  return value === null || value === undefined ? "" : String(value);
}

function dateValue(value) {
  const date = text(value).trim();
  return /[0-9۰-۹٠-٩]/.test(date) ? date : "";
}

function bool(value) {
  return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
}

function optionValue(value, fallback = "درحال بررسی") {
  const normalized = text(value).trim().replace(/\s+/g, " ");
  return normalized === "در حال بررسی" ? "درحال بررسی" : (normalized || fallback);
}

function statusToStep(status) {
  const value = text(status).trim();
  if (/^\d+$/.test(value)) return Math.min(5, Math.max(1, Number(value)));
  if (value.includes("بررسی اولیه")) return 2;
  if (value.includes("اعلام هزینه")) return 3;
  if (value.includes("تایید نهایی") || value.includes("تأیید نهایی")) return 4;
  if (value.includes("تحویل") || value.includes("ارسال")) return 5;
  return 1;
}

function mapRepair(row, id = Number(row.ID)) {
  const convention = text(row.Convention).trim();
  const deviceModel = text(row.DeviceModel).trim();
  const replacementName = text(row.RDModel).trim();
  return {
    id,
    isConsignment: convention === "امانی" || (!deviceModel && !!replacementName),
    customerName: text(row.CustomerName),
    deviceModel,
    serialNumber: text(row.SerialNumber),
    problem: text(row.Problem),
    accessories: text(row.OtherParts),
    contactPerson: text(row.ContactPerson),
    contactNumber: text(row.ContactNumber),
    warranty: text(row.Guarantee) || "درحال بررسی",
    contract: convention || "درحال بررسی",
    receiveDate: dateValue(row.DateRecive),
    hasReplacement: text(row.RD) || "درحال بررسی",
    repairCompany: text(row.RepairCompany) || "مکسا",
    initialSendDate: dateValue(row.RepairDateSend),
    initialReceiveDate: dateValue(row.RepairDateRecive),
    initialOtherInfo: text(row.Other),
    replacementName,
    replacementSerial: text(row.RDSerial),
    replacementAccessories: text(row.RDParts),
    replacementSendDate: dateValue(row.RDSendDate),
    replacementReceiveDate: dateValue(row.RDReciveDate),
    invoiceNumber: text(row.FactorNo),
    quotedCost: text(row.RepairPrice),
    costApproved: optionValue(row.ConfirmationPrice || row.ConfirmationPric),
    paymentStatus: optionValue(row.Payment),
    shipDate: dateValue(row.SendDate),
    shipMethod: text(row.SendingMethod) === "پیک" ? "پیک مشتری" : text(row.SendingMethod) === "حضوری" ? "تحویل حضوری" : text(row.SendingMethod) === "شرکتی" ? "پیک شرکت" : text(row.SendingMethod) || "ارسال نشده",
    trackingCode: text(row.TrackingCode),
    receiverAddress: text(row.SendAddress),
    relatedRepairId: text(row.PersonRecive),
    smsSentReceipt: bool(row.SmsRecive),
    smsSentInspection: bool(row.SmsRP),
    smsSentCost: bool(row.SmsRC),
    smsSentCostApproved: bool(row.SmsCRP),
    smsSentReplacement: bool(row.SmsRD),
    smsSentShipping: bool(row.SmsSM),
    currentStep: statusToStep(row.Status),
  };
}

async function ensureDatabase() {
  const admin = new Pool({ ...pgConfig, database: "postgres" });
  const result = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [pgConfig.database]);
  if (result.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${pgConfig.database}"`);
  }
  await admin.end();
}

async function main() {
  await ensureDatabase();
  const pool = new Pool(pgConfig);
  const client = await pool.connect();
  try {
    const repairRows = [...(source.repairs || [])].sort((a, b) => Number(a.ID) - Number(b.ID));
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        key text PRIMARY KEY,
        value jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS repairs (
        id integer PRIMARY KEY,
        data jsonb NOT NULL,
        source_row jsonb NOT NULL,
        created_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        data jsonb NOT NULL,
        source_row jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id integer PRIMARY KEY,
        username text,
        action text,
        details text,
        created_at timestamptz,
        source_row jsonb NOT NULL
      );
      CREATE TABLE IF NOT EXISTS migration_meta (
        key text PRIMARY KEY,
        value jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // PostgreSQL is a mirror of the SQL Server export. Remove anything that
    // is not present in the current source export before inserting/upserting.
    await client.query("DELETE FROM repairs");
    await client.query("DELETE FROM users");
    await client.query("DELETE FROM audit_log");

    for (const [index, row] of repairRows.entries()) {
      const data = mapRepair(row, index + 1);
      await client.query(
        `INSERT INTO repairs (id, data, source_row, created_at, updated_at)
         VALUES ($1, $2::jsonb, $3::jsonb, $4, now())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, source_row = EXCLUDED.source_row,
           created_at = EXCLUDED.created_at, updated_at = now()`,
        [data.id, JSON.stringify(data), JSON.stringify(row), row.CreatedAt || null],
      );
    }

    for (const row of source.users || []) {
      const username = text(row.Username).trim();
      const data = {
        id: String(row.ID),
        username,
        name: username || "کاربر سیستم",
        role: text(row.Role).toLowerCase() === "admin" ? "admin" : "user",
        password: text(row.Password),
      };
      await client.query(
        `INSERT INTO users (id, data, source_row, updated_at)
         VALUES ($1, $2::jsonb, $3::jsonb, now())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, source_row = EXCLUDED.source_row, updated_at = now()`,
        [data.id, JSON.stringify(data), JSON.stringify(row)],
      );
    }

    for (const row of source.auditLog || []) {
      await client.query(
        `INSERT INTO audit_log (id, username, action, details, created_at, source_row)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, action = EXCLUDED.action,
           details = EXCLUDED.details, created_at = EXCLUDED.created_at, source_row = EXCLUDED.source_row`,
        [row.Id, row.Username || null, row.Action || null, row.Details || null, row.CreatedAt || null, JSON.stringify(row)],
      );
    }

    const settings = { ...(jsonDb.settings || {}), dbType: "postgres", postgresConnected: true };
    await client.query(
      `INSERT INTO app_state (key, value, updated_at) VALUES ('settings', $1::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [JSON.stringify(settings)],
    );
    await client.query(
      `INSERT INTO app_state (key, value, updated_at) VALUES ('reminders', $1::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [JSON.stringify(jsonDb.reminders || [])],
    );
    await client.query(
      `INSERT INTO migration_meta (key, value, updated_at) VALUES ('sqlserver', $1::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [JSON.stringify({ source: source.sourceDatabase, sourceServer: source.sourceServer, exportedAt: source.exportedAt, repairs: source.repairs?.length || 0, users: source.users?.length || 0, auditLog: source.auditLog?.length || 0 })],
    );
    await client.query("COMMIT");
    console.log(`Imported PostgreSQL: repairs=${source.repairs?.length || 0}, users=${source.users?.length || 0}, auditLog=${source.auditLog?.length || 0}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
