/**
 * @file AntiCheatsBP/scripts/commands/setlang.js
 * Defines the !setlang command for changing the server's default language for AntiCheat messages.
 * @version 1.0.0
 */
import { permissionLevels } from '../core/rankManager.js';
import { getString, setCurrentLanguage, translations as validLangCodesContainer } from '../core/localizationManager.js';

export const definition = {
    name: "setlang",
    description: getString("command.setlang.description"),
    aliases: ["setlanguage"],
    permissionLevel: permissionLevels.admin,
    requiresCheats: false,
    syntax: "!setlang <language_code>",
    parameters: [
        { name: "language_code", type: "string", description: "The language code to set (e.g., en_US)." }
    ]
};

export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, config: configModule, prefix } = dependencies;

    if (args.length < 1) {
        playerUtils.warnPlayer(player, getString("command.setlang.usage", { prefix: prefix }));
        return;
    }

    const langCode = args[0];

    if (!Object.prototype.hasOwnProperty.call(validLangCodesContainer, langCode)) {
        playerUtils.warnPlayer(player, getString("command.setlang.invalidCode", { langCode: langCode }));
        return;
    }

    // Attempt to update the configuration value in memory
    const successConfigUpdate = configModule.updateConfigValue('defaultServerLanguage', langCode);

    if (successConfigUpdate) {
        setCurrentLanguage(langCode); // Update runtime language in localizationManager
        playerUtils.notifyPlayer(player, getString("command.setlang.success", { langCode: langCode }));

        // Ensure logManager and addLog are correctly accessed based on actual dependencies structure
        if (dependencies.logManager && typeof dependencies.logManager.addLog === 'function') {
             dependencies.logManager.addLog({
                adminName: player.nameTag,
                actionType: 'config_change_setlang',
                targetName: langCode, // Storing the language code as the "target"
                details: `Server default language changed to ${langCode}.`
            });
        } else if (typeof dependencies.addLog === 'function') { // Fallback if addLog is directly in dependencies
            dependencies.addLog({
                adminName: player.nameTag,
                actionType: 'config_change_setlang',
                targetName: langCode,
                details: `Server default language changed to ${langCode}.`
            });
        } else {
            console.warn("[SetlangCommand] LogManager or addLog function not found in dependencies. Skipping log.");
        }

    } else {
        // This condition means updateConfigValue returned false.
        // This could be because the value was already set to langCode, or an internal issue in updateConfigValue not throwing an error.
        // If it's just "already set", it's not a failure. We can check the current config value.
        if (configModule.editableConfigValues.defaultServerLanguage === langCode) {
            // If the language was already set to this, it's not an error, but no change was made.
            // Consider a different message or just notify success if this is acceptable.
            // For now, let's assume it's important to know if a change actually happened.
            playerUtils.notifyPlayer(player, getString("command.setlang.success", { langCode: langCode }) + " (No change needed, already set).");
        } else {
            playerUtils.warnPlayer(player, getString("command.setlang.fail"));
            console.warn(`[SetlangCommand] updateConfigValue for defaultServerLanguage to '${langCode}' returned false, and value is not currently ${langCode}.`);
        }
    }
}
