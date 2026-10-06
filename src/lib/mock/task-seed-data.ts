import type { Lead, LeadTaskView } from "@/lib/domain/types";
import { DEMO_USERS } from "./seed-data";

const taskUuid = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const at = (days: number, hour = 10, minute = 0) => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export function createDemoTasks(leads: Lead[]): LeadTaskView[] {
  const items: Array<{ lead: number; title: string; type?: LeadTaskView["type"]; priority?: LeadTaskView["priority"]; due?: number | null; hour?: number; start?: number; endHour?: number; status?: LeadTaskView["status"]; owner?: number; order?: number }> = [
    { lead: 0, title: "Ligar para a recepção e identificar decisor", type: "CALL", priority: "URGENT", due: -1, hour: 10 },
    { lead: 1, title: "Retornar para Dra. Marina", type: "FOLLOW_UP", priority: "HIGH", due: 0, hour: 14 },
    { lead: 2, title: "Enviar referências de sites para restaurantes", type: "TASK", due: 1 },
    { lead: 3, title: "Cobrar retorno da proposta", type: "FOLLOW_UP", priority: "URGENT", due: -2, hour: 11 },
    { lead: 4, title: "Reunião para revisar escopo", type: "MEETING", priority: "HIGH", start: 0, hour: 16, endHour: 17 },
    { lead: 6, title: "Validar portfólio atual", type: "RESEARCH", due: 2 },
    { lead: 7, title: "Pesquisar responsável comercial", type: "RESEARCH", due: 0, hour: 9 },
    { lead: 8, title: "Ligar após 14h", type: "CALL", priority: "HIGH", due: 0, hour: 15 },
    { lead: 9, title: "Confirmar leitura do diagnóstico", type: "FOLLOW_UP", due: 1 },
    { lead: 10, title: "Enviar exemplo de catálogo", type: "TASK", due: 3 },
    { lead: 11, title: "Retornar após evento de sábado", type: "FOLLOW_UP", due: 4 },
    { lead: 12, title: "Follow-up proposta", type: "FOLLOW_UP", priority: "HIGH", due: 2 },
    { lead: 13, title: "Mapear processo de captação", type: "RESEARCH", due: 1 },
    { lead: 15, title: "Revisitar no próximo trimestre", type: "FOLLOW_UP", due: 30 },
    { lead: 18, title: "Preparar handoff para onboarding", type: "TASK", due: 1 },
    { lead: 19, title: "Coletar materiais institucionais", type: "TASK", due: 2 },
    { lead: 21, title: "WhatsApp para responsável", type: "FOLLOW_UP", priority: "HIGH", due: -1 },
    { lead: 22, title: "Agendar apresentação", type: "MEETING", start: 0, hour: 11, endHour: 12 },
    { lead: 23, title: "Validar campanhas atuais", type: "RESEARCH", due: 2 },
    { lead: 2, title: "Pesquisar concorrentes locais", type: "RESEARCH", due: null, order: 200 },
    { lead: 4, title: "Revisar integrações necessárias", type: "TASK", due: null, order: 200 },
    { lead: 3, title: "Preparar proposta inicial", type: "PROPOSAL", status: "DONE", due: -5, order: 300 },
  ];

  return items.flatMap((item, index) => {
    const lead = leads[item.lead];
    if (!lead) return [];
    const startAt = item.start != null ? at(item.start, item.hour ?? 10) : null;
    const endAt = item.start != null ? at(item.start, item.endHour ?? ((item.hour ?? 10) + 1)) : null;
    const dueAt = item.due == null ? null : at(item.due, item.hour ?? 10);
    const status = item.status ?? "TODO";
    const now = new Date().toISOString();
    return [{
      id: taskUuid(index + 1), leadId: lead.id, title: item.title, description: null,
      type: item.type ?? "TASK", status, priority: item.priority ?? "MEDIUM", dueAt, startAt, endAt, allDay: false,
      owner: DEMO_USERS[item.owner ?? 0] ?? null, order: item.order ?? (index + 1) * 10,
      createdByType: index % 4 === 0 ? "AGENT" : "USER", createdById: index % 4 === 0 ? DEMO_USERS[2].id : DEMO_USERS[0].id,
      completedAt: status === "DONE" ? at(-3, 16) : null, canceledAt: null,
      createdAt: at(-7 + (index % 4), 9), updatedAt: now, version: 1,
      lead: { id: lead.id, name: lead.name, status: lead.status, score: lead.score },
    } satisfies LeadTaskView];
  });
}
