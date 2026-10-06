import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required when DATA_DRIVER=postgres");

  // Vercel is serverless and DATABASE_URL uses Supabase Supavisor transaction pooling.
  // Keep each function instance deliberately small to avoid exhausting pooler capacity
  // when the dashboard issues several queries concurrently.
  client = postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 10,
    max_lifetime: 60,
  });

  dbInstance = drizzle(client, { schema });
  return dbInstance;
}
