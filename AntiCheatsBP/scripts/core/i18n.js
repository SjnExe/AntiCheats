/**
 * @file AntiCheatsBP/scripts/core/i18n.js
 * @description Manages localized strings for the AntiCheat system.
 * This module handles the loading and retrieval of translation strings,
 * supporting different languages and placeholder substitution in strings.
 * It allows for nested key access using dot notation (e.g., "common.greeting").
 * @version 1.1.0
 */

import { editableConfigValues as runTimeConfig } from '../config.js';
import { translations as enUSTranslations } from './languages/en_US.js'; // Default language pack

const DEFAULT_LANGUAGE = "en_US";
let currentLanguage = runTimeConfig.defaultServerLanguage || DEFAULT_LANGUAGE;

/**
 * Stores all loaded translations. The keys are language codes (e.g., "en_US"),
 * and the values are the corresponding translation objects.
 * @type {Object.<string, object>}
 */
const translations = {};
translations[DEFAULT_LANGUAGE] = enUSTranslations; // Populate with imported en_US translations

/**
 * Attempts to load a language pack.
 * @description Currently, this function is a stub and primarily serves to check if
 * the requested language is the default 'en_US' language, which is pre-loaded.
 * Future implementations could dynamically import language files.
 * @param {string} langCode - The language code to load (e.g., "es_ES", "de_DE").
 * @returns {boolean} True if the language is already loaded/available (i.e., 'en_US'), false otherwise.
 */
function loadLanguage(langCode) {
    if (translations[langCode]) {
        // console.log(`[i18n] Language ${langCode} is already loaded.`);
        return true;
    }
    // Placeholder for future dynamic language loading:
    // try {
    //     const module = await import(`./languages/${langCode}.js`);
    //     if (module && module.translations) {
    //         translations[langCode] = module.translations;
    //         console.log(`[i18n] Successfully loaded language: ${langCode}`);
    //         return true;
    //     }
    // } catch (error) {
    //     console.warn(`[i18n] Failed to load language pack for ${langCode}:`, error);
    // }
    console.warn(`[i18n] Language pack for "${langCode}" is not pre-loaded, and dynamic loading is not yet implemented. Only "${DEFAULT_LANGUAGE}" is available.`);
    return false;
}

/**
 * Sets the current language for string retrieval.
 * @description Attempts to set the active language. If the specified language
 * is not loaded and `loadLanguage` fails to make it available, the current
 * language remains unchanged.
 * @param {string} langCode - The language code to set as current (e.g., "en_US", "es_ES").
 */
export function setCurrentLanguage(langCode) {
    if (typeof langCode !== 'string' || !langCode) {
        console.warn(`[i18n] Invalid language code provided to setCurrentLanguage. Must be a non-empty string.`);
        return;
    }

    if (translations[langCode]) {
        currentLanguage = langCode;
        // console.log(`[i18n] Runtime language set to: ${langCode}`);
    } else {
        if (loadLanguage(langCode)) {
            currentLanguage = langCode;
            // console.log(`[i18n] Runtime language set to: ${langCode} after attempted load.`);
        } else {
            console.warn(`[i18n] Failed to set runtime language to "${langCode}". It's not available. Current language remains "${currentLanguage}".`);
        }
    }
}

// Initialize with the default or configured language at startup.
// This ensures 'en_US' (pre-loaded) is set if it's the default or configured language.
setCurrentLanguage(currentLanguage);

/**
 * Retrieves a localized string based on a key and optionally formats it with arguments.
 * @description Fetches a string from the translation store using a dot-separated key.
 * If the key is not found in the `currentLanguage`, it attempts to find it in the
 * `DEFAULT_LANGUAGE`. If still not found, it returns the key itself and logs a warning.
 * Placeholders in the string (e.g., `{name}` or `{0}`) are replaced by values from `args`.
 * @param {string} key - The dot-separated key for the desired string (e.g., "common.button_close", "commands.tpa.requestSent").
 * @param {(object | Array<string | number>)} [args] - Optional arguments for placeholder replacement.
 *                                                   If an object, replaces `{placeholderKey}`.
 *                                                   If an array, replaces `{0}`, `{1}`, etc.
 * @returns {string} The localized and formatted string, or the key itself if not found.
 */
export function getString(key, args) {
    if (typeof key !== 'string' || !key) {
        console.warn(`[i18n] Invalid key provided to getString. Must be a non-empty string.`);
        return String(key); // Return the key (or its string representation) if invalid
    }

    const keyParts = key.split('.');
    let targetTranslationStore;
    let retrievedString = null;

    // Attempt to get string from current language
    targetTranslationStore = translations[currentLanguage];
    if (targetTranslationStore) {
        let tempValue = targetTranslationStore;
        for (const part of keyParts) {
            if (tempValue && typeof tempValue === 'object' && Object.prototype.hasOwnProperty.call(tempValue, part)) {
                tempValue = tempValue[part];
            } else {
                tempValue = null; // Path broken
                break;
            }
        }
        if (typeof tempValue === 'string') {
            retrievedString = tempValue;
        }
    }

    // If not found in current language, try fallback to DEFAULT_LANGUAGE
    if (retrievedString === null && currentLanguage !== DEFAULT_LANGUAGE) {
        // console.warn(`[i18n] Key "${key}" not found in "${currentLanguage}". Trying "${DEFAULT_LANGUAGE}".`);
        targetTranslationStore = translations[DEFAULT_LANGUAGE];
        if (targetTranslationStore) {
            let tempValue = targetTranslationStore;
            for (const part of keyParts) {
                if (tempValue && typeof tempValue === 'object' && Object.prototype.hasOwnProperty.call(tempValue, part)) {
                    tempValue = tempValue[part];
                } else {
                    tempValue = null; // Path broken
                    break;
                }
            }
            if (typeof tempValue === 'string') {
                retrievedString = tempValue;
            }
        }
    }

    // If still not found, warn and return the key
    if (retrievedString === null) {
        console.warn(`[i18n] Localization key "${key}" not found in "${currentLanguage}" or fallback "${DEFAULT_LANGUAGE}". Returning key.`);
        return key;
    }

    // Substitute arguments if provided
    if (args) {
        if (Array.isArray(args)) {
            for (let i = 0; i < args.length; i++) {
                const regex = new RegExp(`\\{\\s*${i}\\s*\\}`, "g");
                retrievedString = retrievedString.replace(regex, String(args[i]));
            }
        } else if (typeof args === 'object' && args !== null) {
            for (const placeholderKey in args) {
                if (Object.prototype.hasOwnProperty.call(args, placeholderKey)) {
                    const regex = new RegExp(`\\{\\s*${placeholderKey}\\s*\\}`, "g");
                    retrievedString = retrievedString.replace(regex, String(args[placeholderKey]));
                }
            }
        }
    }
    return retrievedString;
}

// Exporting loadLanguage for potential future use, testing, or if other modules need to trigger language loading.
export { loadLanguage };
