import { staticValues } from "./static-values.js";

interface Turn {
  actor: Actor,
  players: any[],
  token: any,
  tokenId: string
}

interface TemplateData {
  reminders: TemplateReminderData[]
}

interface TemplateReminderData {
  label: string;
  actions: TemplateReminderActionData[];
}

interface TemplateReminderActionData {
  id: string;
  image: string;
  name: string;
  description?: string;
  onImageClick?: TemplateReminderActionCallback;
  onNameClick?: TemplateReminderActionCallback;
}

type TemplateReminderActionCallback = (param: {event: MouseEvent, actionHtml: HTMLElement}) => void;

let openDialogs: Dialog[] = [];
const reminderContentClass = `${staticValues.moduleName}-reminder-content`;
function setPopupContent(actorId: string): void {
  const actor = game.actors.get(actorId);
  const templateData: TemplateData = {
    reminders: []
  };

  if (actor.data.type === 'character') {
    templateData.reminders = [
      {label: 'Knowledge check', actions: []},
      {label: 'Movement', actions: []},
      {label: 'Communicate', actions: []},
      {label: 'Object interaction', actions: []},
    ]
  }

  const mainActions: TemplateReminderData = {
    label: 'Action',
    actions: []
  };
  const bonusActions: TemplateReminderData = {
    label: 'Bonus action',
    actions: []
  };
  templateData.reminders.push(mainActions);
  templateData.reminders.push(bonusActions);
  
  let actionId = 0;
  for (const item of actor.items.values()) {
    const data5e: any = item.data.data;
    if (item.data.type === 'spell') {
      if (data5e?.preparation?.mode === 'prepared' && data5e?.preparation?.prepared !== true) {
        continue;
      }
    }
    if (data5e.uses && data5e.uses.value < data5e.uses.max) {
      continue;
    }
    const action: TemplateReminderActionData = {
      id: `reminder-action-${actionId++}`,
      image: item.img,
      name: item.name,
      onImageClick: () => (item as any).roll(),
      onNameClick: ({actionHtml}) => {
        actionHtml.classList.toggle('open');
      }
    }

    if (data5e?.description?.value) {
      action.description = TextEditor.enrichHTML(data5e?.description?.value);
    }
    if (data5e?.activation?.type === 'action') {
      mainActions.actions.push(action);
    }
    if (data5e?.activation?.type === 'bonus') {
      bonusActions.actions.push(action);
    }
  }

  for (const reminder of templateData.reminders) {
    reminder.actions = reminder.actions.sort((a: TemplateReminderActionData, b: TemplateReminderActionData) => a.name.localeCompare(b.name));
  }

  renderTemplate(`modules/${staticValues.moduleName}/templates/reminder.hbs`, templateData).then((content: any/* string */) => {
    const popups = document.querySelectorAll(`.${reminderContentClass} .dialog-content`);
    if (popups.length === 0) {
      const dialog = new Dialog({
        title: 'Turn reminder',
        content: content,
        buttons: {},
        render: (html) => {
          const content = html[0];
          for (const reminder of templateData.reminders) {
            for (const action of reminder.actions) {
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
        },
        close: () => {
          const remainingDialogs: Dialog[] = [];
          for (const openDialog of openDialogs) {
            if (dialog !== openDialog) {
              remainingDialogs.push(dialog);
            }
          }
          openDialogs = remainingDialogs;
        }
      } as DialogData & {render: (html: JQuery) => void}, {
        classes: [reminderContentClass]
      });
      dialog.render(true);
      openDialogs.push(dialog);
    } else {
      for (const dialog of openDialogs) {
        if (dialog.element instanceof HTMLElement) {
          dialog.element.querySelector('.dialog-content').innerHTML = content;
        } else {
          dialog.element.find('.dialog-content').html(content);
        }
        dialog.maximize();
      }
    }
  });
}

function shouldShowReminder(combat: Combat): boolean {
  const turn: Turn = combat.turns[combat.turn];
  if (game.user.isGM) {
    if (turn.actor.data.type === 'npc') {
      return true;
    }
  }
  for (const player of turn.players) {
    if (player.id === game.userId) {
      return true;
    }
  }

  return false;
}

Hooks.on("ready", () => {
  if (game.combat) {
    if (shouldShowReminder(game.combat)) {
      setPopupContent((game.combat.turns[game.combat.turn] as any).token.actorId);
    }
  }

  return true;
});

Hooks.on("updateCombat", (combat: Combat, update: Combat, options: any) => {
  if (update.round !== undefined || update.turn !== undefined) {
    if (shouldShowReminder(combat)) {
      setPopupContent((combat.turns[combat.turn] as any).token.actorId);
    } else {
      for (const dialog of openDialogs) {
        dialog.minimize();
      }
    }
  }

  return true;
});

Hooks.on("deleteCombat", (combat: Combat, update: Combat, options: any) => {
  for (const dialog of openDialogs) {
    dialog.close();
  }

  return true;
});