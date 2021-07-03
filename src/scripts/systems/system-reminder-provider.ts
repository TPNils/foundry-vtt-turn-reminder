import { SystemReminder } from "./system-reminder";
import { SystemReminderDnd5e } from "./system-reminder-dnd5e";

class SystemReminderProvider {
  private initialized = false;
  private value: SystemReminder;

  public getSystemReminder(): SystemReminder {
    if (!this.initialized) {
      switch (game.system.id) {
        case 'dnd5e': {
          this.value = new SystemReminderDnd5e();
          break;
        }
      }

      this.initialized = true;
    }

    return this.value;
  }
}

export const systemReminderProvider = new SystemReminderProvider();