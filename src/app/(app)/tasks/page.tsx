import { PageHeader } from "@/components/page-header";
import { TasksWorkspace } from "@/components/tasks-workspace";
import { requireAppActor } from "@/lib/auth/app-auth";
import { searchLeads, listUsers } from "@/lib/services/leads";
import { listTasks } from "@/lib/services/tasks";
import { getI18n } from "@/lib/i18n/server";

export default async function TasksPage() {
  const actor = await requireAppActor();
  const tasks = await listTasks({ includeCompleted: true, limit: 100 });
  const leads = await searchLeads({ limit: 100 });
  const users = await listUsers();
  const { t } = await getI18n();
  return <><PageHeader title={t("tasks.title")} description={t("tasks.description")}/><TasksWorkspace tasks={tasks.items} leads={leads.items} users={users} currentUserId={actor.id}/></>;
}
