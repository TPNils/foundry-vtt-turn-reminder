import { staticValues } from "./static-values.js";

interface CombatData {
  current: {round: number, turn: number, tokenId: string},
  data: any,
  options: any,
  previous: {round: number, turn: number, tokenId: string},
  turns: {
    actor: any,
    players: any[],
    token: any,
    tokenId: string
  }
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

Hooks.on("ready", (combat: CombatData, update: Combat, options: any) => {
  if (game.combat) {
    setPopupContent();
  }

  return true;
});

Hooks.on("updateCombat", (combat: CombatData, update: Combat, options: any) => {
  if (update.round !== undefined || update.turn !== undefined) {
    const turn = combat.turns[combat.current.turn];
    if (turn.players.length > 0) {
      setPopupContent();
    }
  }

  return true;
});

Hooks.on("deleteCombat", (combat: CombatData, update: Combat, options: any) => {
  for (const dialog of openDialogs) {
    dialog.close();
  }

  return true;
});