import { getDb } from "@/lib/db/client";
import { leadActivities, leadEvidence, leadTasks, leads, users } from "@/lib/db/schema";
import { createDemoActivities, createDemoEvidence, createDemoLeads, DEMO_USERS } from "@/lib/mock/seed-data";
import { createDemoTasks } from "@/lib/mock/task-seed-data";

if (process.env.DATA_DRIVER !== "postgres") process.env.DATA_DRIVER = "postgres";

const db = getDb();
const demoLeads = createDemoLeads();
const activities = createDemoActivities(demoLeads);
const evidence = createDemoEvidence(demoLeads);
const tasks = createDemoTasks(demoLeads);

await db.insert(users).values(DEMO_USERS.map((user, index) => ({ id: user.id, name: user.name, email: user.email ?? `${index}@example.com`, role: index === 0 ? "ADMIN" as const : "MEMBER" as const }))).onConflictDoNothing();
await db.insert(leads).values(demoLeads.map((lead) => ({
  id: lead.id, name: lead.name, legalName: lead.legalName, segment: lead.segment, city: lead.city, state: lead.state,
  website: lead.website, googleMapsUrl: lead.googleMapsUrl, instagramUrl: lead.instagramUrl, phone: lead.phone, whatsapp: lead.whatsapp,
  email: lead.email, contactName: lead.contactName, contactRole: lead.contactRole, status: lead.status, score: lead.score,
  scoreReasons: lead.scoreReasons, primaryOpportunity: lead.primaryOpportunity, opportunityNotes: lead.opportunityNotes,
  ownerId: lead.owner?.id ?? null, tags: lead.tags, sourceType: lead.sourceType, sourceUrl: lead.sourceUrl,
  nextAction: lead.nextAction, nextActionAt: lead.nextActionAt ? new Date(lead.nextActionAt) : null,
  nextActionOwnerId: lead.nextActionOwner?.id ?? null, doNotContact: lead.doNotContact, version: lead.version,
  createdAt: new Date(lead.createdAt), updatedAt: new Date(lead.updatedAt),
}))).onConflictDoNothing();
await db.insert(leadActivities).values(activities.map((item) => ({ ...item, createdAt: new Date(item.createdAt) }))).onConflictDoNothing();
await db.insert(leadEvidence).values(evidence.map((item) => ({ ...item, observedAt: item.observedAt ? new Date(item.observedAt) : null, createdAt: new Date(item.createdAt) }))).onConflictDoNothing();
await db.insert(leadTasks).values(tasks.map((task) => ({
  id: task.id, leadId: task.leadId, title: task.title, description: task.description, type: task.type, status: task.status,
  priority: task.priority, dueAt: task.dueAt ? new Date(task.dueAt) : null, startAt: task.startAt ? new Date(task.startAt) : null,
  endAt: task.endAt ? new Date(task.endAt) : null, allDay: task.allDay, ownerId: task.owner?.id ?? null, sortOrder: task.order,
  createdByType: task.createdByType, createdById: task.createdById, completedAt: task.completedAt ? new Date(task.completedAt) : null,
  canceledAt: task.canceledAt ? new Date(task.canceledAt) : null, version: task.version, createdAt: new Date(task.createdAt), updatedAt: new Date(task.updatedAt),
}))).onConflictDoNothing();
console.log(`Seeded ${demoLeads.length} leads, ${tasks.length} tasks, ${activities.length} activities and ${evidence.length} evidence records.`);
process.exit(0);
