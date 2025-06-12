/**
 * @file AntiCheatsBP/scripts/core/i18n.js
 * Manages localized strings for the AntiCheat system.
 * @version 1.0.13
 */

import { editableConfigValues as runTimeConfig } from '../config.js';
import { translations as enUSTranslations } from './languages/en_US.js';

const DEFAULT_LANGUAGE = "en_US";
let currentLanguage = runTimeConfig.defaultServerLanguage || DEFAULT_LANGUAGE;

// The translations object will be populated by statically imported locale files.
const translations = {};
translations['en_US'] = enUSTranslations; // Populate with imported en_US translations

/**
 * Placeholder function for loading other languages dynamically in the future.
 * For now, it only acknowledges pre-loaded languages.
 * @param {string} langCode The language code to load (e.g., "es_ES").
 * @returns {boolean} True if the language is already loaded, false otherwise.
 */
function loadLanguage(langCode) {
    if (translations[langCode]) {
        // console.log(`[i18n] Language ${langCode} is already loaded.`);
        return true;
    }
    // In the future, dynamic import logic for other languages could go here:
    // e.g., try { const module = await import(`./languages/${langCode}.js`); translations[langCode] = module.translations; return true; } catch (e) { ... }
    console.warn(`[i18n] Attempted to load language ${langCode}, but no specific loader implemented beyond pre-loaded en_US.`);
    return false;
}

export function setCurrentLanguage(langCode) {
    if (translations[langCode]) { // Check if already loaded (e.g., en_US is pre-loaded)
        currentLanguage = langCode;
        console.log(`[i18n] Runtime language set to: ${langCode}`);
    } else {
        // Attempt to load or warn if not available
        if (loadLanguage(langCode)) { // This will be true if future dynamic loading succeeds
            currentLanguage = langCode;
            console.log(`[i18n] Runtime language set to: ${langCode} after attempting to load.`);
        } else {
             console.warn(`[i18n] Attempted to set runtime language to '${langCode}', which is not loaded and couldn't be loaded. Current language remains '${currentLanguage}'.`);
        }
    }
}

// Initialize current language.
// Since en_US is statically imported and populated, it will be available.
setCurrentLanguage(currentLanguage);

export function getString(key, args) {
    let langToUse = currentLanguage;

    // Check if current language and key exist
    if (!translations[langToUse] || typeof translations[langToUse][key] !== 'string') {
        // Fallback to DEFAULT_LANGUAGE if key not in current language
        if (langToUse !== DEFAULT_LANGUAGE && translations[DEFAULT_LANGUAGE] && typeof translations[DEFAULT_LANGUAGE][key] === 'string') {
            langToUse = DEFAULT_LANGUAGE;
             // console.warn(`[i18n] String key "${key}" not found for language "${currentLanguage}". Using fallback "${DEFAULT_LANGUAGE}".`);
        } else {
            // If key not in default language either, return the key itself and warn
            console.warn(`[i18n] String key "${key}" not found for language "${currentLanguage}" or fallback "${DEFAULT_LANGUAGE}". Returning key.`);
            return key;
        }
    }

    let str = translations[langToUse][key];

    if (args) {
        if (Array.isArray(args)) {
            // For array arguments: replace {0}, {1}, etc.
            for (let i = 0; i < args.length; i++) {
                const regex = new RegExp(`\\{\\s*${i}\\s*\\}`, "g"); // Allow optional spaces around index
                str = str.replace(regex, String(args[i]));
            }
        } else if (typeof args === 'object' && args !== null) {
            // For object arguments: replace {keyName}, etc.
            for (const placeholderKey in args) {
                if (Object.prototype.hasOwnProperty.call(args, placeholderKey)) {
                    const regex = new RegExp(`\\{\\s*${placeholderKey}\\s*\\}`, "g"); // Allow optional spaces
                    str = str.replace(regex, String(args[placeholderKey]));
                }
            }
        }
    }
    return str;
}

// Exporting loadLanguage in case it's needed externally, though currently it's a simple stub.
export { loadLanguage };
