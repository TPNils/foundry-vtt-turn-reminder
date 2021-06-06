import { staticValues } from "./static-values.js";

interface Turn {
  actor: any,
  players: any[],
  token: any,
  tokenId: string
}

let openDialogs: Dialog[] = [];
const reminderContentClass = `${staticValues.moduleName}-reminder-content`;
function setPopupContent(): void {
  const templateData = {
    reminders: [
      'Knowledge check',
      'Movement',
      'Communicate',
      '1 Object interaction',
      '1 Action',
      '1 Bonus Action',
    ]
  };

  renderTemplate(`modules/${staticValues.moduleName}/templates/reminder.hbs`, templateData).then((content: any/* string */) => {
    const popups = document.querySelectorAll(`.${reminderContentClass} .dialog-content`);
    if (popups.length === 0) {
      const dialog = new Dialog({
        title: 'Turn reminder',
        content: content,
        buttons: {},
        close: () => {
          const remainingDialogs: Dialog[] = [];
          for (const openDialog of openDialogs) {
            if (dialog !== openDialog) {
              remainingDialogs.push(dialog);
            }
          }
          openDialogs = remainingDialogs;
        }
      }, {
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
    return false;
  } else {
    for (const player of turn.players) {
      if (player.id === game.userId) {
        return true;
      }
    }
  }

  return false;
}

Hooks.on("ready", () => {
  if (game.combat) {
    if (shouldShowReminder(game.combat)) {
      setPopupContent();
    }
  }

  return true;
});

Hooks.on("updateCombat", (combat: Combat, update: Combat, options: any) => {
  if (update.round !== undefined || update.turn !== undefined) {
    if (shouldShowReminder(combat)) {
      setPopupContent();
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