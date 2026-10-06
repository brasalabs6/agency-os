import type { ActorType, CreateLeadTaskInput, LeadTaskStatus, LeadTaskView, TaskSearchFilters, TaskSearchResult, UpdateLeadTaskInput } from "@/lib/domain/types";

export interface CreateTaskRepositoryInput extends CreateLeadTaskInput {
  createdByType: ActorType;
  createdById?: string | null;
}

export interface UpdateTaskRepositoryInput extends Omit<UpdateLeadTaskInput, "status"> {
  status?: LeadTaskStatus;
  completedAt?: string | null;
  canceledAt?: string | null;
}

export interface TaskRepository {
  search(filters: TaskSearchFilters): Promise<TaskSearchResult>;
  getById(id: string): Promise<LeadTaskView | null>;
  create(input: CreateTaskRepositoryInput): Promise<LeadTaskView>;
  update(id: string, input: UpdateTaskRepositoryInput): Promise<LeadTaskView | null>;
}
