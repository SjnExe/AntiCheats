import { newCommand } from '../handle.js';
import { i18n } from '../../assets/i18n.js';
import configData from '../../config.js'; // For command prefix
import { logDebug } from '../../assets/logger.js'; // Corrected path for logDebug

newCommand({
    name: "mylanguage",
    description: `Sets your preferred language for Anti Cheats messages. Usage: ${configData.chat.prefix}mylanguage <lang_code>`,
    adminOnly: false, // Available to all players
    ownerOnly: false,
    run: (data) => {
        const player = data.player;
        const args = data.args;

        if (args.length < 2) {
            player.sendMessage(`§cUsage: ${configData.chat.prefix}mylanguage <language_code>`);
            player.sendMessage(`§cAvailable languages: ${i18n.getAvailableLanguages().join(', ')}`);
            return;
        }

        const langCode = args[1].toLowerCase(); // Normalize to lowercase, e.g., en_us
        // const availableLanguages = i18n.getAvailableLanguages().map(l => l.toLowerCase()); // Unused variable removed

        // Attempt to find a matching language code, handling potential case differences like en_US vs en_us
        let matchedLangCode = null;
        const clientLangNormalized = langCode.replace("_", "-"); // e.g., en-us

        for (const availableLang of i18n.getAvailableLanguages()) {
            if (availableLang.toLowerCase() === langCode || availableLang.toLowerCase() === clientLangNormalized) {
                matchedLangCode = availableLang; // Use the canonical casing from availableLanguages
                break;
            }
        }

        if (!matchedLangCode) {
            player.sendMessage(`§cInvalid or unavailable language code "${args[1]}".`);
            player.sendMessage(`§cAvailable languages: ${i18n.getAvailableLanguages().join(', ')} (try one of these).`);
            return;
        }

        try {
            player.setDynamicProperty("ac:user_language", matchedLangCode);
            player.sendMessage(`§aYour language preference has been set to ${matchedLangCode}.`);
            logDebug(`[MyLanguage] ${player.name} set their language to ${matchedLangCode}.`);
        } catch (e) {
            player.sendMessage(`§cAn error occurred while setting your language preference: ${e.message}`);
            logDebug(`[MyLanguage] Error setting language for ${player.name} to ${matchedLangCode}: ${e}`);
        }
    }
});
