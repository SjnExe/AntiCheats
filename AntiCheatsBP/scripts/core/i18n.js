/**
 * @file AntiCheatsBP/scripts/core/i18n.js
 * @description Manages localized strings for the AntiCheat system.
 * This module handles the loading and retrieval of translation strings,
 * supporting different languages and placeholder substitution in strings.
 * It allows for nested key access using dot notation (e.g., "common.greeting").
 * @version 1.1.1
 */

// configModule import removed, will be initialized via a function call from main.js
import { translations as enUSTranslations } from './languages/en_US.js'; // Default language pack

const defaultLanguage = "en_US";
let currentLanguage = defaultLanguage; // Initialize with default, will be set by initializeI18n

/**
 * Stores all loaded translations. The keys are language codes (e.g., "en_US"),
 * and the values are the corresponding translation objects.
 * @type {Object.<string, object>}
 */
const _internalTranslations = {};
_internalTranslations[defaultLanguage] = enUSTranslations; // Populate with imported en_US translations

/**
 * Attempts to load a language pack.
 * @description Currently, this function is a stub and primarily serves to check if
 * the requested language is the default 'en_US' language, which is pre-loaded.
 * Future implementations could dynamically import language files.
 * @param {string} langCode - The language code to load (e.g., "es_ES", "de_DE").
 * @returns {boolean} True if the language is already loaded/available (i.e., 'en_US'), false otherwise.
 */
function loadLanguage(langCode) {
    if (_internalTranslations[langCode]) {
        return true;
    }
    // Placeholder for future dynamic language loading:
    // try {
    //     const module = await import(`./languages/${langCode}.js`);
    //     if (module && module.translations) {
    //         _internalTranslations[langCode] = module.translations;
    //         console.log(`[i18n] Successfully loaded language: ${langCode}`);
    //         return true;
    //     }
    // } catch (error) {
    //     console.warn(`[i18n] Failed to load language pack for ${langCode}:`, error);
    // }
    console.warn(`[i18n] Language pack for "${langCode}" is not pre-loaded, and dynamic loading is not yet implemented. Only "${defaultLanguage}" is available.`);
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

    if (_internalTranslations[langCode]) {
        currentLanguage = langCode;
    } else {
        if (loadLanguage(langCode)) {
            currentLanguage = langCode;
        } else {
            console.warn(`[i18n] Failed to set runtime language to "${langCode}". It's not available. Current language remains "${currentLanguage}".`);
        }
    }
}

// Removed direct call to setCurrentLanguage(currentLanguage) here.
// Initialization will be triggered by initializeI18n from main.js.

/**
 * Initializes the i18n system with configuration from dependencies.
 * Sets the current language based on server configuration.
 * @param {object} dependencies - The standard dependencies object, expected to contain `config`.
 */
export function initializeI18n(dependencies) {
    if (dependencies && dependencies.config && dependencies.config.defaultServerLanguage) {
        setCurrentLanguage(dependencies.config.defaultServerLanguage);
    } else {
        // Fallback to defaultLanguage if config or specific setting is missing
        setCurrentLanguage(defaultLanguage);
        console.warn(`[i18n] defaultServerLanguage not found in config dependencies. Using default: ${defaultLanguage}`);
    }
}

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
    targetTranslationStore = _internalTranslations[currentLanguage];
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

    // If not found in current language, try fallback to defaultLanguage
    if (retrievedString === null && currentLanguage !== defaultLanguage) {
        targetTranslationStore = _internalTranslations[defaultLanguage];
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
        console.warn(`[i18n] Localization key "${key}" not found in "${currentLanguage}" or fallback "${defaultLanguage}". Returning key.`);
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
export const translations = _internalTranslations; // Diagnostic: Exporting internal translations
