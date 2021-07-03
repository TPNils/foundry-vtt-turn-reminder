import { reminderDialog } from "./reminder-dialog.js";
import { settings } from "./settings.js";
import { staticValues } from "./static-values.js";

reminderDialog.registerHooks();
settings.registerHooks();

Hooks.on("init", () => {
  // register templates parts
  const templatePaths = [
    `modules/${staticValues.moduleName}/templates/reminder-action.hbs`,
    `modules/${staticValues.moduleName}/templates/additional-reminders-option.hbs`
  ];
  loadTemplates(templatePaths);
});