import type { Lead, LeadActivity, LeadEvidence, UserSummary } from "@/lib/domain/types";

export const DEMO_USERS: UserSummary[] = [
  { id: "00000000-0000-4000-8000-000000000001", name: "Guilherme", email: "guilherme@agency.local", role: "ADMIN", active: true },
  { id: "00000000-0000-4000-8000-000000000002", name: "Comercial", email: "comercial@agency.local", role: "MEMBER", active: true },
  { id: "00000000-0000-4000-8000-000000000003", name: "ChatGPT", email: "agent@agency.local", role: "MEMBER", active: false },
];

const at = (days: number, hour = 10) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const uuid = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const base = [
  ["Clínica Horizonte", "Clínica médica", "Brasília", "DF", "READY_TO_CONTACT", 88, "WEBSITE", "Ligar para a recepção e identificar decisor", -1, true],
  ["Odonto Prime Asa Norte", "Odontologia", "Brasília", "DF", "CONTACTED", 82, "WEBSITE", "Retornar para Dra. Marina", 0, true],
  ["Bistrô Ipê", "Restaurante", "Brasília", "DF", "QUALIFIED", 76, "WEBSITE", "Enviar referências de sites para restaurantes", 1, true],
  ["Almeida & Torres Advocacia", "Advocacia", "Brasília", "DF", "PROPOSAL_SENT", 91, "WEBSITE", "Cobrar retorno da proposta", -2, true],
  ["MoveFit Academia", "Academia", "Águas Claras", "DF", "NEGOTIATION", 94, "CUSTOM_SYSTEM", "Revisar escopo do portal de alunos", 0, true],
  ["Studio Aurora", "Beleza", "Taguatinga", "DF", "DISCOVERED", 62, "LANDING_PAGE", null, null, false],
  ["Construtora Planalto", "Construção", "Brasília", "DF", "ENRICHED", 70, "WEBSITE", "Validar portfólio atual", 2, true],
  ["Casa Nobre Móveis", "Varejo", "Brasília", "DF", "SCORED", 73, "DIGITAL_CATALOG", "Pesquisar responsável comercial", 0, true],
  ["Vet Vida", "Veterinária", "Guará", "DF", "READY_TO_CONTACT", 85, "WEBSITE", "Ligar após 14h", 0, true],
  ["Solaris Energia", "Energia solar", "Goiânia", "GO", "DIAGNOSIS_SENT", 89, "WEBSITE", "Confirmar leitura do diagnóstico", 1, true],
  ["Papelaria Central", "Papelaria", "Taguatinga", "DF", "CONTACTED", 67, "DIGITAL_CATALOG", "Enviar exemplo de catálogo", 3, true],
  ["Lumi Eventos", "Eventos", "Brasília", "DF", "PERMISSIONED_FOLLOWUP", 78, "WEBSITE", "Retornar após evento de sábado", 4, true],
  ["Forma Arquitetura", "Arquitetura", "Brasília", "DF", "PROPOSAL_SENT", 86, "WEBSITE", "Follow-up proposta", 2, true],
  ["Nexo Contabilidade", "Contabilidade", "Brasília", "DF", "QUALIFIED", 80, "AUTOMATION", "Mapear processo de captação", 1, true],
  ["Auto Center Capital", "Automotivo", "Ceilândia", "DF", "READY_TO_CONTACT", 71, "WEBSITE", null, null, false],
  ["Bella Derm", "Estética", "Águas Claras", "DF", "NURTURE", 58, "LANDING_PAGE", "Revisitar no próximo trimestre", 30, true],
  ["Mercado Vila Nova", "Mercado", "Sobradinho", "DF", "LOST", 55, "WEBSITE", null, null, true],
  ["Alpha Segurança", "Segurança", "Brasília", "DF", "DO_NOT_CONTACT", 45, "WEBSITE", null, null, true],
  ["Cerrado Tech", "Tecnologia", "Brasília", "DF", "WON", 96, "CUSTOM_SYSTEM", "Preparar handoff para onboarding", 1, true],
  ["Escola Pequeno Mundo", "Educação", "Brasília", "DF", "ONBOARDING", 92, "WEBSITE", "Coletar materiais institucionais", 2, true],
  ["Sabor do Cerrado", "Restaurante", "Gama", "DF", "INVALID", 20, "OTHER", null, null, false],
  ["Fisio Center", "Fisioterapia", "Brasília", "DF", "CONTACTED", 81, "WEBSITE", "WhatsApp para responsável", -1, true],
  ["Motta Engenharia", "Engenharia", "Brasília", "DF", "DIAGNOSIS_SENT", 84, "WEBSITE", "Agendar apresentação", 0, true],
  ["Flor de Lótus Spa", "Spa", "Brasília", "DF", "SCORED", 69, "LANDING_PAGE", "Validar campanhas atuais", 2, true],
  ["Prime Clima", "Climatização", "Brasília", "DF", "DISCOVERED", 64, "WEBSITE", null, null, false],
] as const;

export function createDemoLeads(): Lead[] {
  const owner = DEMO_USERS[0];
  return base.map((row, index) => {
    const [name, segment, city, state, status, score, opportunity, nextAction, dueDays] = row;
    const id = uuid(index + 1);
    const noWebsite = [0, 2, 5, 8, 10, 14, 23, 24].includes(index);
    return {
      id,
      name,
      segment,
      city,
      state,
      status,
      score,
      scoreReasons: [
        noWebsite ? "Sem site próprio identificado" : "Presença digital com espaço claro para melhoria",
        score >= 80 ? "Boa evidência de operação ativa" : "Oportunidade comercial moderada",
        index % 3 === 0 ? "Telefone público disponível" : "Perfil comercial localizado",
      ],
      primaryOpportunity: opportunity,
      opportunityNotes: noWebsite
        ? "A empresa possui presença em canais de terceiros, mas não foi identificado um site próprio robusto."
        : "Há oportunidade de melhorar conversão, apresentação ou fluxo digital atual.",
      owner: index % 5 === 0 ? DEMO_USERS[1] : owner,
      tags: [segment.toLowerCase().split(" ")[0], score >= 80 ? "prioridade-alta" : "prospecção"],
      sourceType: "research",
      sourceUrl: `https://example.com/source/${index + 1}`,
      website: noWebsite ? null : `https://www.${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 22)}.com.br`,
      googleMapsUrl: `https://maps.example.com/business/${index + 1}`,
      instagramUrl: index % 2 === 0 ? `https://instagram.com/demo_business_${index + 1}` : null,
      phone: index % 4 === 0 ? `(61) 9${String(1000 + index).padStart(4, "0")}-${String(2000 + index).padStart(4, "0")}` : `(61) 3${String(100 + index).padStart(3, "0")}-${String(4000 + index).padStart(4, "0")}`,
      whatsapp: index % 3 === 0 ? `(61) 9${String(5000 + index).padStart(4, "0")}-${String(6000 + index).padStart(4, "0")}` : null,
      email: index % 3 === 1 ? `contato${index + 1}@example.com` : null,
      contactName: [1, 4, 11, 13].includes(index) ? ["Marina", "Rafael", "Camila", "Bruno"][ [1,4,11,13].indexOf(index) ] : null,
      contactRole: [1, 4, 11, 13].includes(index) ? "Responsável comercial" : null,
      nextAction,
      nextActionAt: typeof dueDays === "number" ? at(dueDays, index % 2 ? 14 : 10) : null,
      nextActionOwner: nextAction ? owner : null,
      doNotContact: status === "DO_NOT_CONTACT",
      legalName: null,
      createdAt: at(-20 + (index % 10), 9),
      updatedAt: at(-(index % 4), 16),
      version: 1,
    } satisfies Lead;
  });
}

export function createDemoActivities(leads: Lead[]): LeadActivity[] {
  const activities: LeadActivity[] = [];
  for (const [index, lead] of leads.entries()) {
    activities.push({
      id: `20000000-0000-4000-8000-${String(index * 3 + 1).padStart(12, "0")}`,
      leadId: lead.id,
      type: "CREATED",
      actorType: "AGENT",
      actorId: DEMO_USERS[2].id,
      actorName: "ChatGPT",
      summary: "Lead adicionado após pesquisa comercial.",
      metadata: { source: lead.sourceUrl },
      createdAt: lead.createdAt,
    });
    if (lead.score) {
      activities.push({
        id: `20000000-0000-4000-8000-${String(index * 3 + 2).padStart(12, "0")}`,
        leadId: lead.id,
        type: "SCORE_UPDATED",
        actorType: "AGENT",
        actorId: DEMO_USERS[2].id,
        actorName: "ChatGPT",
        summary: `Score definido em ${lead.score}/100 com base nas evidências disponíveis.`,
        metadata: { score: lead.score, reasons: lead.scoreReasons },
        createdAt: at(-2, 11),
      });
    }
    if (lead.nextAction) {
      activities.push({
        id: `20000000-0000-4000-8000-${String(index * 3 + 3).padStart(12, "0")}`,
        leadId: lead.id,
        type: "NEXT_ACTION_SET",
        actorType: "USER",
        actorId: DEMO_USERS[0].id,
        actorName: DEMO_USERS[0].name,
        summary: `Próxima ação: ${lead.nextAction}`,
        metadata: { dueAt: lead.nextActionAt },
        createdAt: at(-1, 15),
      });
    }
  }
  return activities;
}

export function createDemoEvidence(leads: Lead[]): LeadEvidence[] {
  return leads.slice(0, 15).map((lead, index) => ({
    id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    leadId: lead.id,
    sourceUrl: lead.sourceUrl ?? `https://example.com/source/${index + 1}`,
    sourceType: "public_web",
    observedAt: at(-3),
    claim: lead.website ? "website_quality" : "website",
    value: lead.website ? "improvement_opportunity" : "not_found",
    confidence: 90,
    createdBy: DEMO_USERS[2].id,
    createdAt: at(-3),
  }));
}
