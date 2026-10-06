import { PageHeader } from "@/components/page-header";
import { TasksWorkspace } from "@/components/tasks-workspace";
import { requireAppActor } from "@/lib/auth/app-auth";
import { searchLeads, listUsers } from "@/lib/services/leads";
import { listTasks } from "@/lib/services/tasks";

export default async function TasksPage() {
  const actor = await requireAppActor();
  const tasks = await listTasks({ includeCompleted: true, limit: 100 });
  const leads = await searchLeads({ limit: 100 });
  const users = await listUsers();
  return <><PageHeader title="Tasks" description="Trabalho comercial vinculado aos leads: o que fazer, quem faz e quando."/><TasksWorkspace tasks={tasks.items} leads={leads.items} users={users} currentUserId={actor.id}/></>;
}
