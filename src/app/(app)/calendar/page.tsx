import { CalendarBoard, type CalendarView } from "@/components/calendar-board";
import { PageHeader } from "@/components/page-header";
import { buttonPrimaryClass, controlClass } from "@/components/ui-kit";
import { searchLeads, listUsers } from "@/lib/services/leads";
import { listCalendar } from "@/lib/services/tasks";
import { zonedDateTimeToUtc } from "@/lib/domain/time";
import { requireCurrentUser } from "@/lib/auth/app-auth";
import { getI18n } from "@/lib/i18n/server";

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
  let selectedStart: Date;
  let selectedDays: number;

  if (view === "month") {
    const first = new Date(Date.UTC(year, month - 1, 1, 12));
    first.setUTCDate(first.getUTCDate() - first.getUTCDay());
    selectedStart = first;
    selectedDays = 42;
  } else if (view === "week") {
    marker.setUTCDate(marker.getUTCDate() - marker.getUTCDay());
    selectedStart = new Date(marker);
    selectedDays = 7;
  } else {
    selectedStart = new Date(marker);
    selectedDays = 14;
  }

  const selectedEnd = new Date(selectedStart);
  selectedEnd.setUTCDate(selectedEnd.getUTCDate() + selectedDays);
  const agendaStart = new Date(Date.UTC(year, month - 1, day, 12));
  const agendaEnd = new Date(agendaStart);
  agendaEnd.setUTCDate(agendaEnd.getUTCDate() + 14);

  const startMarker = selectedStart < agendaStart ? selectedStart : agendaStart;
  const endMarker = selectedEnd > agendaEnd ? selectedEnd : agendaEnd;

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
  const { t } = await getI18n();

  return <>
    <PageHeader title={t("calendar.title")} description={t("calendar.description")}/>
    <form method="get" className="mb-4 grid gap-2 sm:max-w-md sm:grid-cols-[minmax(0,1fr)_auto]">
      <input type="hidden" name="view" value={view}/><input type="hidden" name="date" value={anchor}/>
      <select name="owner" defaultValue={ownerRaw ?? ""} className={controlClass} aria-label={t("leads.owner")}><option value="">{t("common.allTeam")}</option><option value="me">{t("calendar.myTasks")}</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
      <button className={buttonPrimaryClass}>{t("common.apply")}</button>
    </form>
    <CalendarBoard tasks={calendar.items} leads={leads.items} users={users} view={view} anchor={anchor} ownerFilter={ownerRaw}/>
  </>;
}
