import { CalendarBoard, type CalendarView } from "@/components/calendar-board";
import { PageHeader } from "@/components/page-header";
import { searchLeads, listUsers } from "@/lib/services/leads";
import { listCalendar } from "@/lib/services/tasks";
import { zonedDateTimeToUtc } from "@/lib/domain/time";
import { requireCurrentUser } from "@/lib/auth/app-auth";

function validView(value?: string): CalendarView { return value === "week" || value === "agenda" ? value : "month"; }
function todayKey() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function validDate(value?: string) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayKey(); }
function range(anchor: string, view: CalendarView) {
  const [year, month, day] = anchor.split("-").map(Number);
  const marker = new Date(Date.UTC(year, month - 1, day, 12));
  let startMarker: Date;
  let days: number;
  if (view === "month") {
    const first = new Date(Date.UTC(year, month - 1, 1, 12));
    first.setUTCDate(first.getUTCDate() - first.getUTCDay());
    startMarker = first;
    days = 42;
  } else if (view === "week") {
    marker.setUTCDate(marker.getUTCDate() - marker.getUTCDay());
    startMarker = marker;
    days = 7;
  } else {
    startMarker = marker;
    days = 14;
  }
  const endMarker = new Date(startMarker);
  endMarker.setUTCDate(endMarker.getUTCDate() + days);
  const from = zonedDateTimeToUtc(startMarker.getUTCFullYear(), startMarker.getUTCMonth() + 1, startMarker.getUTCDate(), 0, 0, 0);
  const endExclusive = zonedDateTimeToUtc(endMarker.getUTCFullYear(), endMarker.getUTCMonth() + 1, endMarker.getUTCDate(), 0, 0, 0);
  return { from: from.toISOString(), to: new Date(endExclusive.getTime() - 1).toISOString() };
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const currentUser = await requireCurrentUser();
  const ownerRaw = typeof params.owner === "string" ? params.owner : undefined;
  const ownerId = ownerRaw === "me" ? currentUser.id : ownerRaw || undefined;
  const view = validView(typeof params.view === "string" ? params.view : undefined);
  const anchor = validDate(typeof params.date === "string" ? params.date : undefined);
  const dates = range(anchor, view);
  const calendar = await listCalendar({ ...dates, ownerId });
  const leads = await searchLeads({ limit: 100 });
  const users = await listUsers();
  return <><PageHeader title="Calendar" description="Agenda comercial derivada das tarefas dos leads. Horários exibidos em America/Sao_Paulo."/>
    <form method="get" className="mb-4 flex max-w-sm gap-2"><input type="hidden" name="view" value={view}/><input type="hidden" name="date" value={anchor}/><select name="owner" defaultValue={ownerRaw ?? ""} className="h-9 flex-1 rounded-md border border-default bg-[var(--panel)] px-3 text-sm"><option value="">All team</option><option value="me">Mine</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select><button className="rounded-md bg-[var(--text)] px-3 text-xs font-medium text-[var(--panel)]">Filter</button></form>
    <CalendarBoard tasks={calendar.items} leads={leads.items} users={users} view={view} anchor={anchor} ownerFilter={ownerRaw}/></>;
}
