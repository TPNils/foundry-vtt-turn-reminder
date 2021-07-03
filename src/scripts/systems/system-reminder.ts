import { TemplateReminderData } from "../reminder-dialog";

export interface SystemReminder {
  registerHooks(): void;
  getTemplateData(actorId: string): TemplateReminderData[];
}