import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

function runtimeDatabaseUrl(raw: string) {
  const url = new URL(raw);

  // Supabase currently documents a known incompatibility between postgres.js
  // query pipelining and Supavisor transaction mode (shared pooler :6543):
  // concurrent queries can hang waiting for responses. Vercel is serverless,
  // but AgencyOS is a small internal app, so we deliberately use Supavisor
  // session mode (:5432) with a single short-lived connection per function
  // instance until we migrate to a non-pipelining driver.
  if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "6543") {
    url.port = "5432";
  }

  return url.toString();
}

export function getDb() {
  if (dbInstance) return dbInstance;

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error("DATABASE_URL is required when DATA_DRIVER=postgres");

  client = postgres(runtimeDatabaseUrl(rawUrl), {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 5,
    max_lifetime: 30,
    connection: {
      application_name: "agency-os-vercel",
      statement_timeout: 15000,
      idle_in_transaction_session_timeout: 15000,
    },
  });

  dbInstance = drizzle(client, { schema });
  return dbInstance;
}
