import { TemplateReminderData } from "../reminder-dialog";

export interface SystemReminder {
  registerHooks(): void;
  getTemplateData(sceneId: string, tokenId: string): TemplateReminderData[];
}