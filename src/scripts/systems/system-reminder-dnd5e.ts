import { TemplateData, TemplateReminderActionData, TemplateReminderData, TemplateReminderSubData } from "../reminder-dialog";
import { settings } from "../settings";
import { SystemReminder } from "./system-reminder";

export class SystemReminderDnd5e implements SystemReminder {

  public registerHooks(): void {
    // do nothing
  }

  public getTemplateData(sceneId: string, tokenId: string): TemplateReminderData[] {
    let actor: Actor;
    if (canvas.scene.id === sceneId) {
      actor = canvas.tokens.get(tokenId).actor;
    } else {
      const tokenData: {actorId: string, actorLink: boolean} = game.scenes.get(sceneId).getEmbeddedEntity('Token', tokenId);
      if (tokenData.actorLink) {
        actor = game.actors.get(tokenData.actorId);
      } else {
        throw new Error(`Can't fetch token action from another scene. Go to the following scene to fix the issue: ${game.scenes.get(sceneId).name}`);
      }
    }
    const actorData5e: any = actor.data.data;
    const reminders: TemplateReminderData[] = [];
  
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
      const itemUses = this.getRemainingUses(actor, item);
      const action: TemplateReminderActionData = {
        id: `reminder-action-${actionId++}`,
        image: item.img,
        name: item.name,
        disabled: !itemUses.hasRemaining,
        onImageClick: () => {
          if (typeof (item as any).hasMacro === 'function' && (item as any).hasMacro()) {
            (item as any).executeMacro();
          } else {
            (item as any).roll()
          }
        },
        onNameClick: ({actionHtml}) => {
          actionHtml.classList.toggle('open');
        }
      }
      
      if (itemData5e.quantity !== 1 && itemData5e.quantity != null) {
        action.name += ` (x${itemData5e.quantity})`
      }
      if (itemUses.hasIndividualUsage && itemUses.remaining != null) {
        action.limit = `${itemUses.remaining}/${itemUses.max}`
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
    reminders.push(mainActions);
    reminders.push(bonusActions);
    if (specialActions.rootActions.length > 0) {
      reminders.push(specialActions);
    }
    if (reactionActions.rootActions.length > 0) {
      reminders.push(reactionActions);
    }
    if (legendaryActions.rootActions.length > 0 && actorData5e?.resources?.legact?.max > 0) {
      reminders.push(legendaryActions);
    }
    if (lairActions.rootActions.length > 0 && actorData5e?.resources?.lair?.value === true) {
      reminders.push(lairActions);
    }
  
    for (const reminder of reminders) {
      reminder.rootActions = reminder.rootActions.sort((a: TemplateReminderActionData, b: TemplateReminderActionData) => a.name.localeCompare(b.name));
      if (reminder.groupedActions) {
        reminder.groupedActions = reminder.groupedActions.sort((a: TemplateReminderSubData, b: TemplateReminderSubData) => a.label.localeCompare(b.label));
        for (const group of reminder.groupedActions) {
          group.rootActions = group.rootActions.sort((a: TemplateReminderActionData, b: TemplateReminderActionData) => a.name.localeCompare(b.name));
        }
      }
    }
    return reminders;
  }
  
  
  private getRemainingUses(actor: Actor, item: Item<any>): {remaining?: number, max?: number, hasRemaining: boolean, hasIndividualUsage: boolean} {
    const actorData5e = actor.data.data as any;
    const itemData5e = item.data.data as any;
    const response = {
      hasIndividualUsage: false,
      hasRemaining: [] as boolean[],
      max: [] as number[],
      remaining: [] as number[],
    };
    if (item.data.type === 'spell') {
      if (['pact', 'prepared', 'always'].includes(itemData5e.preparation.mode)) {
        let hasRemainingSpellUses = false;
        // You can cast pact/(always)prepared spells with the other slots
        const pact = actorData5e.spells.pact;
        if (pact.value > 0 && pact.level >= itemData5e.level) {
          hasRemainingSpellUses = true;
        }
  
        if (!hasRemainingSpellUses) {
          let level = itemData5e.level;
          while (actorData5e.spells.hasOwnProperty(`spell${level}`)) {
            const spellUsage = actorData5e.spells[`spell${level}`];
            if (spellUsage.value > 0) {
              hasRemainingSpellUses = true;
              break;
            }
            level++;
          }
        }
  
        response.hasRemaining.push(hasRemainingSpellUses);
      }
    }
  
    if (itemData5e.uses) {
      // Foundry, for some reason, like to set uses to 0/0 by default
      if (typeof itemData5e.uses.value === 'number' && itemData5e.uses.value !== 0 && typeof itemData5e.uses.max === 'number' && itemData5e.uses.max !== 0) {
        response.hasIndividualUsage = true;
        response.remaining.push(itemData5e.uses.value);
        response.max.push(itemData5e.uses.max);
        response.hasRemaining.push(itemData5e.uses.value > 0);
      }
    }
    
    if (itemData5e.consume?.amount > 0) {
      switch (itemData5e.consume.type) {
        case 'attribute': {
          if (itemData5e.consume.target) {
            response.hasIndividualUsage = true;
            let parentTarget = actorData5e;
            let targetData = actorData5e;
            for (const path of itemData5e.consume.target.split('.')) {
              if (!targetData.hasOwnProperty(path)) {
                targetData = null;
                break;
              }
              parentTarget = targetData;
              targetData = targetData[path];
            }
  
            if (targetData) {
              response.remaining.push(targetData);
              response.hasRemaining.push(targetData >= itemData5e.consume.amount);
              if (parentTarget.max != null) {
                response.max.push(parentTarget.max);
              }
            }
          }
          break;
        }
        case 'ammo':
        case 'material': {
          if (actor.items.has(itemData5e.consume.target)) {
            response.hasIndividualUsage = true;
            const target = actor.items.get(itemData5e.consume.target);
            const targetItemData5e = target.data.data as any;
            
            response.remaining.push(targetItemData5e.quantity);
            response.hasRemaining.push(targetItemData5e.quantity >= itemData5e.consume.amount);
            response.max.push(targetItemData5e.quantity);
          }
          break;
        }
        case 'charges': {
          if (actor.items.has(itemData5e.consume.target)) {
            response.hasIndividualUsage = true;
            const target = actor.items.get(itemData5e.consume.target);
            const targetItemData5e = target.data.data as any;
            
            // Foundry, for some reason, like to set uses to 0/0 by default
            if (typeof targetItemData5e.uses.value === 'number' && targetItemData5e.uses.value !== 0 && typeof targetItemData5e.uses.max === 'number' && targetItemData5e.uses.max !== 0) {
              response.hasIndividualUsage = true;
              response.remaining.push(targetItemData5e.uses.value);
              response.max.push(targetItemData5e.uses.max);
              response.hasRemaining.push(targetItemData5e.uses.value > 0);
            }
          }
          break;
        }
          
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
      hasRemaining: !response.hasRemaining.includes(false),
      max: max,
      remaining: remaining
    };
  }

}