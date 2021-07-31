import { staticValues } from "./static-values"

class AdditionalRemindersForm extends FormApplication {
  
  constructor() {
    super({});
  }

  public static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'additional-reminders',
      title: 'Additional reminders',
      template: `modules/${staticValues.moduleName}/templates/additional-reminders-options.hbs`,
    });
  }

  public getData(): any {
    // Send data to the template
    return {
      reminders: settings.getAdditionalReminder(),
    };
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);

    html.on('click', event => {
      if (event.target.classList.contains('delete-icon')) {
        event.target.parentElement.parentElement.remove();
      }
    });

    html.find('#add-reminder').on('click', async event => {
      const optionHtml: string = await renderTemplate(`modules/${staticValues.moduleName}/templates/additional-reminders-option.hbs`, {value: ''}) as any;
      $(optionHtml).insertBefore(html.find('#add-reminder').parent().parent());
    });
  }

  protected async _updateObject(event, formData) {
    let reminders = formData['reminder-row'];
    if (reminders == null) {
      reminders = [];
    } else if (typeof reminders === 'string') {
      reminders = [reminders];
    }
    reminders = reminders.filter(reminder => reminder !== '' && reminder != null);
    settings.setAdditionalReminder(reminders);
  }

}

class Settings {

  public registerHooks(): void {
    Hooks.on('init', () => {
      game.settings.register(staticValues.moduleName, 'additionalPlayerReminders', {
        name: 'Additional player reminders',
        hint: 'Show these additional reminders in the combat reminder popup for player characters',
        scope: 'world',     // "world" = sync to db, "client" = local storage
        config: false,       // false if you dont want it to show in module config
        type: Object,
        default: [],
        onChange: value => {
          // TODO
        }
      })
    
      game.settings.registerMenu(staticValues.moduleName, 'additionalPlayerReminders', {
        name: 'Additional player reminders',
        label: 'Additional player reminders',
        hint: 'Show these additional reminders in the combat reminder popup for player characters',
        restricted: true,       // false if you dont want it to show in module config
        type: AdditionalRemindersForm
      })
    })
  }

  public getAdditionalReminder(): string[] {
    const value = game.settings.get(staticValues.moduleName, 'additionalPlayerReminders');
    if (!value) {
      return []
    }
    return value as string[];
  }

  public setAdditionalReminder(value: string[]): Promise<void> {
    return game.settings.set(staticValues.moduleName, 'additionalPlayerReminders', value).then();
  }

}

export const settings = new Settings();