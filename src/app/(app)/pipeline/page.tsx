import { KanbanBoard } from "@/components/kanban-board";
import { PageHeader } from "@/components/page-header";
import { searchLeads } from "@/lib/services/leads";
export default async function PipelinePage() { const result = await searchLeads({ limit: 100 }); return <><PageHeader title="Pipeline" description="Arraste os cards entre grupos. O backend preserva os estados canônicos e registra cada mudança."/><KanbanBoard initialLeads={result.items}/></>; }
