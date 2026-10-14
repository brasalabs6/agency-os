import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let client: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Vercel is a serverless runtime: shared Supavisor transaction pooling
 * permits many clients to share a small number of backend connections.
 *
 * Unlike postgres.js, node-postgres does not pipeline concurrent queries.
 * Converting pooler :5432 to :6543 is safe for this driver and prevents
 * EMAXCONNSESSION exhaustion from many warm Vercel instances.
 *
 * Preserve local / direct PostgreSQL URLs: they do not support the
 * Supavisor transaction-mode port.
 */
export function runtimeDatabaseUrl(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use PostgreSQL protocol");
  }
  if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "5432") {
    url.port = "6543";
  }
  return url.toString();
}

export function getDb() {
  if (dbInstance) return dbInstance;

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error("DATABASE_URL is required when DATA_DRIVER=postgres");

  client = new Pool({
    connectionString: runtimeDatabaseUrl(rawUrl),
    max: 1,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 5000,
    maxLifetimeSeconds: 30,
    query_timeout: 15000,
    application_name: "agency-os-vercel",
  });
  dbInstance = drizzle({ client, schema });
  return dbInstance;
}
