import { newCommand } from '../handle.js';
import { i18n } from '../../assets/i18n.js'; // Adjusted path to i18n
import configData from '../../config.js'; // For accessing command prefix for usage example
import { logDebug } from '../../assets/logger.js'; // Changed path from util.js to logger.js

newCommand({
    name: "setserverlanguage",
    description: `Sets the server's display language globally. Usage: ${configData.chat.prefix}setserverlanguage <lang_code>`,
    adminOnly: true,
    ownerOnly: false,
    run: (data) => {
        const player = data.player;
        const args = data.args;

        if (args.length < 2) {
            player.sendMessage(`§cUsage: ${configData.chat.prefix}setserverlanguage <language_code>`);
            player.sendMessage(`§cAvailable languages: ${i18n.getAvailableLanguages().join(', ')}`);
            return;
        }

        const langCode = args[1];
        const availableLanguages = i18n.getAvailableLanguages();

        if (!availableLanguages.includes(langCode)) {
            player.sendMessage(`§cInvalid language code "${langCode}".`);
            player.sendMessage(`§cAvailable languages: ${availableLanguages.join(', ')}`);
            return;
        }

        try {
            i18n.setLanguage(langCode);
            player.sendMessage(`§aServer language successfully set to ${langCode}.`);
            logDebug(`[SetServerLanguage] ${player.name} set server language to ${langCode}.`);
            // Optionally, notify all admins if desired
            // sendMessageToAllAdmins("notify.serverLanguageChanged", { langCode: langCode, playerName: player.name }, false);
        } catch (e) {
            player.sendMessage(`§cAn error occurred while setting the language: ${e.message}`);
            logDebug(`[SetServerLanguage] Error setting language to ${langCode} by ${player.name}: ${e}`);
        }
    }
});
