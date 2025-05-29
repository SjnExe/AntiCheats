import CONFIG from "../config.js";

/**
 * Logs messages to the console if CONFIG.other.consoleDebugMode is true.
 * Prepends "[Anti Cheats]" to the message if it doesn't already start with a bracket `[`,
 * implying a custom prefix.
 *
 * @param {...any} msg - The message(s) or values to log. These will be passed directly to `console.warn`.
 * @returns {void}
 */
export function logDebug(...msg){
    if(CONFIG.other.consoleDebugMode) {
        if (msg.length > 0 && typeof msg[0] === 'string' && !msg[0].startsWith("[")) {
            console.warn("[Anti Cheats]", ...msg);
        } else {
            console.warn(...msg); // Handles empty msg or msg[0] not being a string / already prefixed
        }
    }
}
