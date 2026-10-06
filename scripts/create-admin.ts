import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { bootstrapAdmin } from "@/lib/services/auth";

process.env.DATA_DRIVER = "postgres";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const rl = createInterface({ input, output });
try {
  const name = (await rl.question("Name: ")).trim();
  const email = (await rl.question("Email: ")).trim();
  const password = await rl.question("Password (10+ chars): ");
  const user = await bootstrapAdmin(name, email, password);
  console.log(`Admin ready: ${user.name} <${user.email}>`);
} finally {
  rl.close();
}
