import { settings } from "./settings.js";
import { staticValues } from "./static-values.js";
import { systemReminderProvider } from "./systems/system-reminder-provider.js";
import { Version } from "./systems/version.js";

interface RenderedDialog {
  dialog: Dialog,
  templateData: TemplateData
};

export interface TemplateData {
  reminders: TemplateReminderData[]
}

export interface TemplateReminderData {
  label: string;
  rootActions: TemplateReminderActionData[];
  groupedActions?: TemplateReminderSubData[];
}

export interface TemplateReminderSubData {
  label: string;
  rootActions: TemplateReminderActionData[];
}

export interface TemplateReminderActionData {
  id: string;
  image: string;
  name: string;
  limit?: string;
  disabled: boolean;
  description?: string;
  onImageClick?: TemplateReminderActionCallback;
  onNameClick?: TemplateReminderActionCallback;
}

type TemplateReminderActionCallback = (param: {event: MouseEvent, actionHtml: HTMLElement}) => void;

const reminderContentClass = `${staticValues.moduleName}-reminder-content`;

export class ReminderDialog {
  private openDialogs: RenderedDialog[] = [];

  public registerHooks(): void {
    Hooks.on("ready", () => {
      if (game.combat) {
        if (this.shouldShowReminder(game.combat)) {
          if (Version.isMinGameVersion('0.8.0')) {
            // 0.8.x
            const turn = game.combat.turns[game.combat.turn];
            this.setPopupContent(game.combat.data.scene, turn.data.tokenId);
          } else {
            // 0.7.x
            const turn = (game.combat.turns[game.combat.turn] as any);
            this.setPopupContent(game.combat.data.scene, turn.tokenId);
          }
        }
      }
      return true;
    });
    
    Hooks.on("updateCombat", (combat: Combat, update: Combat, options: any) => {
      if (update.round !== undefined || update.turn !== undefined) {
        if (this.shouldShowReminder(combat)) {
          if (Version.isMinGameVersion('0.8.0')) {
            // 0.8.x
            const turn = combat.turns[game.combat.turn];
            this.setPopupContent(combat.data.scene, turn.data.tokenId);
          } else {
            // 0.7.x
            const turn = (combat.turns[game.combat.turn] as any);
            this.setPopupContent(combat.data.scene, turn.tokenId);
          }
        } else {
          for (const dialog of this.openDialogs) {
            dialog.dialog.minimize();
          }
        }
      }
    
      return true;
    });
    
    Hooks.on("deleteCombat", (combat: Combat, update: Combat, options: any) => {
      for (const dialog of this.openDialogs) {
        dialog.dialog.close();
      }
    
      return true;
    });
  }

  private async setPopupContent(sceneId: string, tokenId: string): Promise<void> {
    let prependReminders: TemplateReminderData[] = [];
    let actor: any;
    if (Version.isMinGameVersion('0.8.0')) {
      // 0.8.x
      actor = (game.scenes.get(sceneId).getEmbeddedDocument('Token', tokenId) as TokenDocument).getActor();
    } else {
      // 0.7.x
      actor = game.actors.get((game.scenes.get(sceneId) as any).getEmbeddedEntity('Token', tokenId).actorId);
    }
    if (actor.data.type === 'character') {
      prependReminders = settings.getAdditionalReminder().map(reminder => {
        return {
          label: reminder,
          rootActions: []
        }
      })
    }
    const templateData: TemplateData = {
      reminders: [
        ...prependReminders,
        ...systemReminderProvider.getSystemReminder().getTemplateData(sceneId, tokenId)
      ]
    }
    const content: string = await renderTemplate(`modules/${staticValues.moduleName}/templates/reminder.hbs`, templateData) as any;
  
    const popups = document.querySelectorAll(`.${reminderContentClass} .dialog-content`);
    if (popups.length === 0) {
      const dialog = new Dialog({
        title: 'Turn reminder',
        content: content,
        buttons: {},
        default: '',
        render: (html: JQuery) => {
          this.addEventListeners(html[0], templateData);
        },
        close: () => {
          const remainingDialogs: RenderedDialog[] = [];
          for (const openDialog of this.openDialogs) {
            if (dialog !== openDialog.dialog) {
              remainingDialogs.push(openDialog);
            }
          }
          this.openDialogs = remainingDialogs;
        }
      } as Dialog.Data, {
        classes: [reminderContentClass]
      });
      dialog.render(true);
      this.openDialogs.push({dialog: dialog, templateData: templateData});
    } else {
      for (const dialog of this.openDialogs) {
        if (dialog.dialog.element instanceof HTMLElement) {
          const dialogContent: HTMLElement = dialog.dialog.element.querySelector('.dialog-content');
          dialogContent.querySelector('.dialog-content').innerHTML = content;
          this.addEventListeners(dialogContent, templateData);
        } else {
          dialog.dialog.element.find('.dialog-content').html(content);
          this.addEventListeners(dialog.dialog.element.find('.dialog-content')[0], templateData);
        }
        dialog.dialog.maximize();
      }
    }
  }

  private addEventListeners(content: HTMLElement, templateData: TemplateData): void {
    const actions: TemplateReminderActionData[] = [];
    for (const reminder of templateData.reminders) {
      for (const action of reminder.rootActions) {
        actions.push(action);
      }
      if (reminder.groupedActions) {
        for (const group of reminder.groupedActions) {
          for (const action of group.rootActions) {
            actions.push(action);
          }
        }
      }
    }
  
    for (const action of actions) {
      if (action.onImageClick != null) {
        content.querySelector(`:scope #${action.id} .reminder-action-image`).addEventListener('click', (event: MouseEvent) => {
          action.onImageClick({
            event: event,
            actionHtml: content.querySelector(`:scope #${action.id}`)
          })
        });
      }
      if (action.onNameClick != null) {
        content.querySelector(`:scope #${action.id} .reminder-action-name`).addEventListener('click', (event: MouseEvent) => {
          action.onNameClick({
            event: event,
            actionHtml: content.querySelector(`:scope #${action.id}`)
          })
        });
      }
    }
  }

  private shouldShowReminder(combat: Combat): boolean {
    const turn = combat.turns[combat.turn];
    if (turn.players.length === 0 && game.user.isGM) {
      return true;
    }
    for (const player of turn.players) {
      if (player.id === game.userId) {
        return true;
      }
    }
  
    return false;
  }
}

export const reminderDialog = new ReminderDialog();