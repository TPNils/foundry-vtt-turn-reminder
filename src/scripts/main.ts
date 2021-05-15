import { staticValues } from "./static-values";

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

const onUpdateCombat = (combat: CombatData, update: Combat, options: any) => {
  if (update.round !== undefined || update.turn !== undefined) {
    const turn = combat.turns[combat.current.turn];
    if (turn.players.length > 0) {
      const templateData = {
        reminders: ['Knowledge check']
      };
      
      renderTemplate(`modules/${staticValues.moduleName}/templates/reminder.hbs`, templateData).then(content => {
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({alias: staticValues.moduleLabel}),
          content: content,
          type: CONST.CHAT_MESSAGE_TYPES.OTHER,
          user: game.userId
        });
      });

    }
  }

  return true;
}

Hooks.on("updateCombat", onUpdateCombat);