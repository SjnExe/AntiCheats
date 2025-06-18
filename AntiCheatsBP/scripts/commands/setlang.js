/**
 * @file AntiCheatsBP/scripts/commands/setlang.js
 * Defines the !setlang command for changing the server's default language for AntiCheat messages.
 * @version 1.0.3
 */
// permissionLevels, getString, setCurrentLanguage, and translations are now accessed via dependencies or specific i18n import
import { setCurrentLanguage, translations as validLangCodesContainer } from '../core/i18n.js'; // Direct i18n imports for core functionality

export const definition = {
    name: "setlang",
    description: "Sets the server's default language for AntiCheat messages.", // Static fallback
    aliases: ["setlanguage"],
    permissionLevel: 1, // Static fallback (Admin)
    requiresCheats: false, // This property might not be standard or used by commandManager
    syntax: "!setlang <language_code>",
    parameters: [
        { name: "language_code", type: "string", description: "The language code to set (e.g., en_US)." }
    ],
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, config, configModule, getString, permissionLevels } = dependencies;
    const prefix = config.prefix;

    // definition.description = getString("command.setlang.description");
    // definition.permissionLevel = permissionLevels.admin;

    if (args.length < 1) {
        playerUtils.warnPlayer(player, getString("command.setlang.usage", { prefix: prefix }));
        return;
    }

    const langCode = args[0];

    // validLangCodesContainer is imported directly from i18n.js, which is fine as it's just an object of translation keys.
    if (!Object.prototype.hasOwnProperty.call(validLangCodesContainer, langCode)) {
        playerUtils.warnPlayer(player, getString("command.setlang.invalidCode", { langCode: langCode }));
        return;
    }

    const successConfigUpdate = configModule.updateConfigValue('defaultServerLanguage', langCode);

    if (successConfigUpdate) {
        setCurrentLanguage(langCode); // Update runtime language in i18n
        playerUtils.notifyPlayer(player, getString("command.setlang.success", { langCode: langCode }));

        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'config_change_setlang',
            targetName: langCode,
            details: `Server default language changed to ${langCode}.`
        }, dependencies);

    } else {
        if (config.defaultServerLanguage === langCode) {
            playerUtils.notifyPlayer(player, getString("command.setlang.success", { langCode: langCode }) + " (No change needed, already set).");
        } else {
            playerUtils.warnPlayer(player, getString("command.setlang.fail"));
            // Use playerUtils.debugLog for more detailed server-side logging
            playerUtils.debugLog(`[SetLangCommand] updateConfigValue for defaultServerLanguage to '${langCode}' returned false, and value is not currently ${langCode}.`, dependencies, player.nameTag);
            console.warn(`[SetLangCommand] updateConfigValue for defaultServerLanguage to '${langCode}' returned false, and value is not currently ${langCode}.`); // Kept for console visibility
        }
    }
}
