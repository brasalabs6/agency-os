import { describe, expect, it } from "vitest";
import { mockLeadRepository } from "@/lib/repositories/mock-lead-repository";
import { upsertLeads } from "@/lib/services/leads";
import type { ActorContext, CreateLeadInput } from "@/lib/domain/types";

const actor: ActorContext = { type: "AGENT", id: "test-agent", name: "Test Agent" };

describe("leads_upsert idempotency", () => {
  it("does not update version or timeline when enrichment is semantically unchanged", async () => {
    const initial: CreateLeadInput = {
      name: "Idempotent Dental 42",
      city: "Brasília",
      state: "DF",
      website: "https://www.idempotent-dental-42.example.test/",
      phone: "(61) 99999-0042",
      email: "Contact@IDEMPOTENT-DENTAL-42.EXAMPLE.TEST",
      segment: "Odontologia",
      sourceType: "web",
      sourceUrl: "https://example.test/source/42/",
      tags: ["prospect"],
    };

    const first = await upsertLeads([initial], actor);
    expect(first.created).toHaveLength(1);
    expect(first.updated).toHaveLength(0);
    expect(first.unchanged).toHaveLength(0);

    const lead = first.created[0];
    const beforeActivities = await mockLeadRepository.listActivities(lead.id);
    const beforeVersion = lead.version;

    const repeated = await upsertLeads([{
      ...initial,
      city: "  Brasília ",
      website: "idempotent-dental-42.example.test",
      phone: "+55 61 99999-0042",
      email: "contact@idempotent-dental-42.example.test",
      sourceUrl: "https://example.test/source/42",
    }], actor);

    expect(repeated.created).toHaveLength(0);
    expect(repeated.updated).toHaveLength(0);
    expect(repeated.unchanged).toHaveLength(1);
    expect(repeated.unchanged[0].id).toBe(lead.id);
    expect(repeated.unchanged[0].version).toBe(beforeVersion);

    const persisted = await mockLeadRepository.getById(lead.id);
    expect(persisted?.version).toBe(beforeVersion);
    expect(await mockLeadRepository.listActivities(lead.id)).toHaveLength(beforeActivities.length);

    const enriched = await upsertLeads([{ ...initial, segment: "Clínica odontológica premium" }], actor);
    expect(enriched.unchanged).toHaveLength(0);
    expect(enriched.updated).toHaveLength(1);
    expect(enriched.updated[0].version).toBe(beforeVersion + 1);
    expect(enriched.updated[0].segment).toBe("Clínica odontológica premium");
  });
});
