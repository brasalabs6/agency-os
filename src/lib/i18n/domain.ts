import type { LeadStatus, LeadTaskPriority, LeadTaskStatus, LeadTaskType, ServiceOpportunity } from "@/lib/domain/types";
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

export function serviceMessageKey(service: ServiceOpportunity): MessageKey {
  return `service.${service}` as MessageKey;
}

export function automationStatusMessageKey(status: string): MessageKey {
  return `automation.status.${status}` as MessageKey;
}
export function automationActionMessageKey(action: string): MessageKey {
  return `automation.action.${action}` as MessageKey;
}
export function automationSeverityMessageKey(severity: string): MessageKey {
  return `automation.severity.${severity}` as MessageKey;
}
export function automationFactMessageKey(classification: string): MessageKey {
  return `automation.fact.${classification}` as MessageKey;
}
export function prospectingSkillMessageKey(skill: string): MessageKey {
  return `prospecting.skill.${skill}` as MessageKey;
}
