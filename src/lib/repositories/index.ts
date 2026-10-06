import type { LeadRepository } from "./lead-repository";
import { mockLeadRepository } from "./mock-lead-repository";
import { postgresLeadRepository } from "./postgres-lead-repository";

export function getLeadRepository(): LeadRepository {
  return process.env.DATA_DRIVER === "postgres" ? postgresLeadRepository : mockLeadRepository;
}
