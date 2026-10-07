import type { LeadStatus, LeadTaskPriority, LeadTaskStatus, LeadTaskType } from "@/lib/domain/types";
import type { MessageKey } from "./messages";

export function statusMessageKey(status: LeadStatus): MessageKey {
  return `status.${status}` as MessageKey;
}

export function taskTypeMessageKey(type: LeadTaskType): MessageKey {
  return `taskType.${type}` as MessageKey;
}

export function taskPriorityMessageKey(priority: LeadTaskPriority): MessageKey {
  return `taskPriority.${priority}` as MessageKey;
}

export function taskStatusMessageKey(status: LeadTaskStatus): MessageKey {
  return `taskStatus.${status}` as MessageKey;
}

export function pipelineGroupMessageKey(groupId: string): MessageKey {
  return `pipelineGroup.${groupId}` as MessageKey;
}
