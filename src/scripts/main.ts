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

interface RenderedDialog {
  dialog: Dialog,
  templateData: TemplateData
};

type TemplateReminderActionCallback = (param: {event: MouseEvent, actionHtml: HTMLElement}) => void;

let openDialogs: RenderedDialog[] = [];
const reminderContentClass = `${staticValues.moduleName}-reminder-content`;
async function setPopupContent(sceneId: string, tokenId: string): Promise<void> {
  const templateData = getTemplateData(sceneId, tokenId);
  const content: string = await renderTemplate(`modules/${staticValues.moduleName}/templates/reminder.hbs`, templateData) as any;

  const popups = document.querySelectorAll(`.${reminderContentClass} .dialog-content`);
  if (popups.length === 0) {
    const dialog = new Dialog({
      title: 'Turn reminder',
      content: content,
      buttons: {},
      render: (html) => {
        addEventListeners(html[0], templateData);
      },
      close: () => {
        const remainingDialogs: RenderedDialog[] = [];
        for (const openDialog of openDialogs) {
          if (dialog !== openDialog.dialog) {
            remainingDialogs.push(openDialog);
          }
        }
        openDialogs = remainingDialogs;
      }
    } as DialogData & {render: (html: JQuery) => void}, {
      classes: [reminderContentClass]
    });
    dialog.render(true);
    openDialogs.push({dialog: dialog, templateData: templateData});
  } else {
    for (const dialog of openDialogs) {
      if (dialog.dialog.element instanceof HTMLElement) {
        const dialogContent: HTMLElement = dialog.dialog.element.querySelector('.dialog-content');
        dialogContent.querySelector('.dialog-content').innerHTML = content;
        addEventListeners(dialogContent, templateData);
      } else {
        dialog.dialog.element.find('.dialog-content').html(content);
        addEventListeners(dialog.dialog.element.find('.dialog-content')[0], templateData);
      }
      dialog.dialog.maximize();
    }
  }
}

function addEventListeners(content: HTMLElement, templateData: TemplateData): void {
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
}

function getTemplateData(sceneId: string, tokenId: string): TemplateData {
  const token = game.scenes.get(sceneId).getEmbeddedEntity('Token', tokenId);
  let actorData: Omit<Actor.Data, 'items'> & {items: Item.Data<any>[]};
  if (game.actors.has(token.actorId)) {
    actorData = mergeObject(
      game.actors.get(token.actorId).data,
      token.actorData
    );
  } else {
    actorData = token.actorData;
  }
  const actorData5e: any = actorData.data;
  const templateData: TemplateData = {
    reminders: []
  };

  if (actorData.type === 'character') {
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
  const reactionActions: TemplateReminderData = {
    label: 'Reaction',
    actions: []
  };
  const specialActions: TemplateReminderData = {
    label: 'Special',
    actions: []
  };
  const legendaryActions: TemplateReminderData = {
    label: `Legendary ${actorData5e?.resources?.legact?.value} / ${actorData5e?.resources?.legact?.max}`,
    actions: []
  };
  const lairActions: TemplateReminderData = {
    label: 'Lair',
    actions: []
  };
  
  let actionId = 0;
  for (const item of actorData.items.values()) {
    const data5e: any = item.data;
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
      action.description = TextEditor.enrichHTML(data5e?.description?.value, {secrets: true, rollData: false});
    }
    switch (data5e?.activation?.type) {
      case 'action':
        mainActions.actions.push(action);
        break;
      case 'bonus':
        bonusActions.actions.push(action);
        break;
      case 'reaction':
        reactionActions.actions.push(action);
        break;
      case 'none':
      case 'special':
        specialActions.actions.push(action);
        break;
      case 'lair':
        lairActions.actions.push(action);
        break;
      case 'legendary':
        legendaryActions.actions.push(action);
        break;
    }
  }
  templateData.reminders.push(mainActions);
  templateData.reminders.push(bonusActions);
  if (specialActions.actions.length > 0) {
    templateData.reminders.push(specialActions);
  }
  if (reactionActions.actions.length > 0) {
    templateData.reminders.push(reactionActions);
  }
  if (legendaryActions.actions.length > 0 && actorData5e?.resources?.legact?.max > 0) {
    templateData.reminders.push(legendaryActions);
  }
  if (lairActions.actions.length > 0 && actorData5e?.resources?.lair?.value === true) {
    templateData.reminders.push(lairActions);
  }

  for (const reminder of templateData.reminders) {
    reminder.actions = reminder.actions.sort((a: TemplateReminderActionData, b: TemplateReminderActionData) => a.name.localeCompare(b.name));
  }
  return templateData;
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
      const token = (game.combat.turns[game.combat.turn] as any).token;
      setPopupContent(game.combat.scene.id, token._id);
    }
  }

  return true;
});

Hooks.on("updateCombat", (combat: Combat, update: Combat, options: any) => {
  if (update.round !== undefined || update.turn !== undefined) {
    if (shouldShowReminder(combat)) {
      const token = (combat.turns[combat.turn] as any).token;
      setPopupContent(combat.scene.id, token._id);
    } else {
      for (const dialog of openDialogs) {
        dialog.dialog.minimize();
      }
    }
  }

  return true;
});

Hooks.on("deleteCombat", (combat: Combat, update: Combat, options: any) => {
  for (const dialog of openDialogs) {
    dialog.dialog.close();
  }

  return true;
});