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
  rootActions: TemplateReminderActionData[];
  groupedActions?: TemplateReminderSubData[];
}

interface TemplateReminderSubData {
  label: string;
  rootActions: TemplateReminderActionData[];
}

interface TemplateReminderActionData {
  id: string;
  image: string;
  name: string;
  disabled: boolean;
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
async function setPopupContent(actorId: string): Promise<void> {
  const templateData = getTemplateData(actorId);
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

function getTemplateData(actorId: string): TemplateData {
  const actor = game.actors.get(actorId);
  const actorData5e: any = actor.data.data;
  const templateData: TemplateData = {
    reminders: []
  };

  if (actor.data.type === 'character') {
    templateData.reminders = [
      {label: 'Knowledge check', rootActions: []},
      {label: 'Movement', rootActions: []},
      {label: 'Communicate', rootActions: []},
      {label: 'Object interaction', rootActions: []},
    ]
  }

  const mainActions: TemplateReminderData = {
    label: 'Action',
    rootActions: []
  };
  const bonusActions: TemplateReminderData = {
    label: 'Bonus action',
    rootActions: []
  };
  const reactionActions: TemplateReminderData = {
    label: 'Reaction',
    rootActions: []
  };
  const specialActions: TemplateReminderData = {
    label: 'Special',
    rootActions: []
  };
  const legendaryActions: TemplateReminderData = {
    label: `Legendary ${actorData5e?.resources?.legact?.value} / ${actorData5e?.resources?.legact?.max}`,
    rootActions: []
  };
  const lairActions: TemplateReminderData = {
    label: 'Lair',
    rootActions: []
  };
  
  let actionId = 0;
  for (const item of actor.items.values()) {
    const itemData5e = item.data.data as any;
    if (item.data.type === 'spell') {
      if (itemData5e?.preparation?.mode === 'prepared' && itemData5e?.preparation?.prepared !== true) {
        continue;
      }
    }
    const itemUses = getRemainingUses(actor, item);
    const action: TemplateReminderActionData = {
      id: `reminder-action-${actionId++}`,
      image: item.img,
      name: item.name,
      disabled: !itemUses.hasRemaining,
      onImageClick: () => (item as any).roll(),
      onNameClick: ({actionHtml}) => {
        actionHtml.classList.toggle('open');
      }
    }
    
    if (itemUses.hasIndividualUsage && itemUses.remaining != null) {
      action.name += ` ${itemUses.remaining}/${itemUses.max}`
    }
    if (itemData5e.quantity !== 1 && itemData5e.quantity != null) {
      action.name += ` (x${itemData5e.quantity})`
    }

    if (itemData5e?.description?.value) {
      action.description = TextEditor.enrichHTML(itemData5e?.description?.value, {secrets: true, rollData: false});
    }

    let actions: TemplateReminderData;
    switch (itemData5e?.activation?.type) {
      case 'action':
        actions = mainActions;
        break;
      case 'bonus':
        actions = bonusActions;
        break;
      case 'reaction':
        actions = reactionActions;
        break;
      case 'none':
      case 'special':
        actions = specialActions;
        break;
      case 'lair':
        actions = lairActions;
        break;
      case 'legendary':
        actions = legendaryActions;
        break;
    }

    if (actions) {
      let addedToSubGroup = false;
      if (item.data.type === 'spell') {
        let name;
        if (itemData5e.preparation.mode === 'pact') {
          const pact = actorData5e.spells.pact;
          name = game.i18n.localize('DND5E.SpellLevelPact')
            .replace('{level}', game.i18n.localize(`DND5E.SpellLevel${pact.level}`))
            .replace('{n}', `${pact.value}/${pact.max}`);
        } else if (itemData5e.preparation.mode === 'prepared') {
          const spellUsage = actorData5e.spells[`spell${itemData5e.level}`];
          name = game.i18n.localize('DND5E.SpellLevelSlot')
            .replace('{level}', game.i18n.localize(`DND5E.SpellLevel${itemData5e.level}`))
            .replace('{n}', `${spellUsage.value}/${spellUsage.max}`);
        }

        if (name) {
          let targetGroup: TemplateReminderSubData;
          if (!actions.groupedActions) {
            actions.groupedActions = [];
          }
          for (const group of actions.groupedActions) {
            if (group.label === name) {
              targetGroup = group;
              break;
            } 
          }
          if (!targetGroup) {
            targetGroup = {
              label: name,
              rootActions: []
            };
            actions.groupedActions.push(targetGroup);
          }
          targetGroup.rootActions.push(action);
          addedToSubGroup = true;
        }
      } 
      
      if (!addedToSubGroup){
        actions.rootActions.push(action);
      }
    }
  }
  templateData.reminders.push(mainActions);
  templateData.reminders.push(bonusActions);
  if (specialActions.rootActions.length > 0) {
    templateData.reminders.push(specialActions);
  }
  if (reactionActions.rootActions.length > 0) {
    templateData.reminders.push(reactionActions);
  }
  if (legendaryActions.rootActions.length > 0 && actorData5e?.resources?.legact?.max > 0) {
    templateData.reminders.push(legendaryActions);
  }
  if (lairActions.rootActions.length > 0 && actorData5e?.resources?.lair?.value === true) {
    templateData.reminders.push(lairActions);
  }

  for (const reminder of templateData.reminders) {
    reminder.rootActions = reminder.rootActions.sort((a: TemplateReminderActionData, b: TemplateReminderActionData) => a.name.localeCompare(b.name));
    if (reminder.groupedActions) {
      reminder.groupedActions = reminder.groupedActions.sort((a: TemplateReminderSubData, b: TemplateReminderSubData) => a.label.localeCompare(b.label));
      for (const group of reminder.groupedActions) {
        group.rootActions = group.rootActions.sort((a: TemplateReminderActionData, b: TemplateReminderActionData) => a.name.localeCompare(b.name));
      }
    }
  }
  return templateData;
}

function shouldShowReminder(combat: Combat): boolean {
  const turn: Turn = combat.turns[combat.turn];
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

function getRemainingUses(actor: Actor, item: Item<any>): {remaining?: number, max?: number, hasRemaining: boolean, hasIndividualUsage: boolean} {
  const actorData5e = actor.data.data as any;
  const itemData5e = item.data.data as any;
  const response = {
    hasIndividualUsage: false,
    hasRemaining: true,
    max: [],
    remaining: [],
  };
  if (item.data.type === 'spell') {
    if (itemData5e.preparation.mode === 'pact') {
      const pact = actorData5e.spells.pact;
      response.remaining.push(pact.value);
      response.max.push(pact.max);
    } else if (itemData5e.preparation.mode === 'prepared') {
      const spellUsage = actorData5e.spells[`spell${itemData5e.level}`];
      response.remaining.push(spellUsage.value);
      response.max.push(spellUsage.max);
    }
  }

  if (itemData5e.uses) {
    // Foundry, for some reason, like to set uses to 0/0 by default
    if (itemData5e.uses.value !== 0 && itemData5e.uses.max !== 0) {
      response.hasIndividualUsage = true;
      response.remaining.push(itemData5e.uses.value);
      response.max.push(itemData5e.uses.max);
    }
  }

  let remaining = Math.min(...response.remaining.filter(a => typeof a === 'number'));
  let max = Math.min(...response.max.filter(a => typeof a === 'number'));
  if (remaining === Infinity) {
    remaining = null;
  }
  if (max === Infinity) {
    max = null;
  }
  return {
    // TODO fix: spells have remaining usages if they can upcast
    hasIndividualUsage: response.hasIndividualUsage,
    hasRemaining: remaining == null || remaining > 0,
    max: max,
    remaining: remaining
  };
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