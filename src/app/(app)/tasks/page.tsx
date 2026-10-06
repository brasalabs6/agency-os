import { PageHeader } from "@/components/page-header";
import { TasksWorkspace } from "@/components/tasks-workspace";
import { requireAppActor } from "@/lib/auth/app-auth";
import { searchLeads, listUsers } from "@/lib/services/leads";
import { listTasks } from "@/lib/services/tasks";

export default async function TasksPage() {
  const actor = await requireAppActor();
  const [tasks, leads, users] = await Promise.all([
    listTasks({ includeCompleted: true, limit: 100 }),
    searchLeads({ limit: 100 }),
    listUsers(),
  ]);
  return <><PageHeader title="Tasks" description="Trabalho comercial vinculado aos leads: o que fazer, quem faz e quando."/><TasksWorkspace tasks={tasks.items} leads={leads.items} users={users} currentUserId={actor.id}/></>;
}
