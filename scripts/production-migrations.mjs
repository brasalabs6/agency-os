/**
 * Controlled, additive-only SQL migration runner for production.
 * Historical Drizzle files 0000-0007 are already represented by Supabase's
 * original migrations; never replay them against the production database.
 *
 * Usage: node scripts/production-migrations.mjs plan|apply
 * Optional one-time bootstrap after an externally applied 0008:
 *   ADOPT_EXISTING_MIGRATION_0008=true (requires exact structural checks)
 */
import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import postgres from "postgres";

const MIN_MIGRATION = 8;
const TABLES_0008 = [
  "business_profiles", "diagnostics", "score_assessments", "ai_runs",
  "prospecting_runs", "channel_connections", "conversations", "channel_messages",
  "approval_requests", "qualifications", "proposals", "contracts",
  "client_projects", "project_obligations",
];
const REQUIRED_INDEXES = [
  "qualifications_lead_uidx", "project_obligations_project_source_uidx",
];
const DANGEROUS_STATEMENTS = [
  /\bDROP\s+(?:TABLE|SCHEMA|COLUMN|DATABASE)\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bUPDATE\s+public\.(?:leads|users|mcp_credentials|lead_tasks)\b/i,
  /\bALTER\s+TABLE\b[\s\S]{0,100}?\bDROP\b/i,
];

export function loadMigrations(directory = join(process.cwd(), "drizzle")) {
  const names = readdirSync(directory).filter((name) => /^\d{4}_[\w-]+\.sql$/.test(name)).sort();
  const targets = names.filter((name) => Number(name.slice(0, 4)) >= MIN_MIGRATION);
  const indexes = targets.map((name) => Number(name.slice(0, 4)));
  for (let index = 0; index < indexes.length; index += 1) {
    if (indexes[index] !== MIN_MIGRATION + index) {
      throw new Error("Non-contiguous migration prefixes from 0008 onwards");
    }
  }
  return targets.map((name) => {
    const sql = readFileSync(join(directory, name), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    for (const pattern of DANGEROUS_STATEMENTS) {
      // Remove SQL comments so documentation cannot accidentally trip the guard.
      const body = sql.replace(/--[^\n]*/g, "");
      if (pattern.test(body)) throw new Error("Disallowed destructive migration: " + name);
    }
    return { name, checksum, sql };
  });
}

export function computePlan(migrations, applied, hasVersion8Schema, allowAdoption) {
  const known = new Map(applied.map((item) => [item.name, item.checksum]));
  const actions = [];
  let pendingStarted = false;
  for (const migration of migrations) {
    const existing = known.get(migration.name);
    if (existing) {
      if (existing !== migration.checksum) {
        throw new Error("Migration checksum mismatch: " + migration.name + " (never edit applied migrations)");
      }
      if (pendingStarted) throw new Error("Applied migration appears after a pending migration");
      actions.push({ ...migration, action: "skip" });
    } else if (migration.name.startsWith("0008_") && hasVersion8Schema) {
      if (!allowAdoption) {
        throw new Error("0008 exists outside ledger. Require ADOPT_EXISTING_MIGRATION_0008=true after schema verification");
      }
      if (pendingStarted) throw new Error("Cannot adopt historical migration after a pending one");
      actions.push({ ...migration, action: "adopt" });
    } else {
      pendingStarted = true;
      actions.push({ ...migration, action: "apply" });
    }
  }
  for (const name of known.keys()) {
    if (!migrations.some((item) => item.name === name)) {
      throw new Error("Applied migration is missing from source: " + name);
    }
  }
  return actions;
}

async function probe(sql) {
  const registry = await sql.unsafe("SELECT to_regclass('public.agencyos_schema_migrations') IS NOT NULL AS exists");
  const registryExists = registry[0].exists;
  const applied = registryExists
    ? await sql.unsafe("SELECT name, checksum FROM public.agencyos_schema_migrations ORDER BY name")
    : [];
  const expected = await sql.unsafe(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename = ANY($1::text[])",
    [TABLES_0008],
  );
  const present = new Set(expected.map((x) => x.tablename));
  if (present.size > 0 && present.size < TABLES_0008.length) {
    throw new Error("Production contains a partial 0008 schema; reconcile manually before migration");
  }
  const hasVersion8Schema = present.size === TABLES_0008.length;
  if (hasVersion8Schema) await verifyVersion8(sql);
  return { applied, hasVersion8Schema };
}

async function verifyVersion8(sql) {
  const info = await sql.unsafe(
    "SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' AND c.relkind='r' AND c.relname = ANY($1::text[])",
    [TABLES_0008],
  );
  if (info.length !== TABLES_0008.length || info.some((row) => !row.relrowsecurity)) {
    throw new Error("Migration 0008 RLS/table checks failed");
  }
  const indexes = await sql.unsafe(
    "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname = ANY($1::text[])",
    [REQUIRED_INDEXES],
  );
  if (indexes.length !== REQUIRED_INDEXES.length) throw new Error("Migration 0008 uniqueness indexes missing");
  const audit = await sql.unsafe(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name IN ('entity_type','entity_id')",
  );
  if (audit.length !== 2) throw new Error("Migration 0008 audit log columns missing");
  const access = await sql.unsafe(
    "SELECT has_table_privilege('anon','public.contracts','SELECT') AS anon, has_table_privilege('authenticated','public.contracts','SELECT') AS member",
  );
  if (access[0].anon || access[0].member) throw new Error("Migration 0008 contract permissions are too broad");
}

function assertFreshBackup() {
  const reference = process.env.PRODUCTION_BACKUP_REFERENCE ?? "";
  const recordedAt = Date.parse(process.env.PRODUCTION_BACKUP_VERIFIED_AT ?? "");
  if (reference.length < 12 || !Number.isFinite(recordedAt)) {
    throw new Error("A verifiable external backup reference and ISO verification time are required");
  }
  const ageMs = Date.now() - recordedAt;
  if (ageMs < 0 || ageMs > 24 * 60 * 60 * 1000) {
    throw new Error("Backup verification must be from the last 24 hours");
  }
  if (process.env.PRODUCTION_MIGRATION_APPROVED !== "true") {
    throw new Error("Production migration requires explicit approval");
  }
}

export async function run() {
  const mode = process.argv[2] ?? "plan";
  if (!["plan", "apply"].includes(mode)) throw new Error("Usage: production-migrations.mjs plan|apply");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (mode === "apply") assertFreshBackup();
  const migrations = loadMigrations();
  if (!migrations.length) throw new Error("No 0008+ SQL migrations found");
  const sql = postgres(process.env.DATABASE_URL, {
    max: 1, ssl: "require", prepare: false, connect_timeout: 15,
  });
  try {
    const state = await probe(sql);
    const plan = computePlan(
      migrations, state.applied, state.hasVersion8Schema,
      process.env.ADOPT_EXISTING_MIGRATION_0008 === "true",
    );
    for (const item of plan) console.log(item.action.toUpperCase() + " " + item.name + " sha256=" + item.checksum);
    if (mode === "plan") return;
    await sql.begin(async (transaction) => {
      await transaction.unsafe("SELECT pg_advisory_xact_lock(90055, 8008)");
      const second = await probe(transaction);
      const current = computePlan(
        migrations, second.applied, second.hasVersion8Schema,
        process.env.ADOPT_EXISTING_MIGRATION_0008 === "true",
      );
      await transaction.unsafe(
        "CREATE TABLE IF NOT EXISTS public.agencyos_schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
      );
      await transaction.unsafe("ALTER TABLE public.agencyos_schema_migrations ENABLE ROW LEVEL SECURITY");
      await transaction.unsafe("REVOKE ALL ON public.agencyos_schema_migrations FROM PUBLIC, anon, authenticated");
      for (const item of current) {
        if (item.action === "skip") continue;
        if (item.action === "apply") {
          await transaction.unsafe(item.sql);
          if (item.name.startsWith("0008_")) await verifyVersion8(transaction);
        }
        await transaction.unsafe(
          "INSERT INTO public.agencyos_schema_migrations(name,checksum) VALUES($1,$2)",
          [item.name,item.checksum],
        );
        console.log(item.action.toUpperCase() + " completed: " + item.name);
      }
    });
    console.log("Production migration transaction committed");
  } finally {
    await sql.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error("Migration stopped:", error.message);
    process.exitCode = 1;
  });
}
