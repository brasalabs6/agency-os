import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required when DATA_DRIVER=postgres");
  client = postgres(url, { max: 10, prepare: false });
  dbInstance = drizzle(client, { schema });
  return dbInstance;
}
