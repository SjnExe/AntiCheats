// Script for the !rules command
import { MessageFormData } from '@minecraft/server-ui';
import * as config from '../config.js';
import { permissionLevels } from '../core/rankManager.js'; // Corrected import path

/**
 * @file Script for the !rules command, displays server rules to the player.
 * @version 1.0.0
 */

/**
 * @typedef {import('../types.js').CommandDefinition} CommandDefinition
 */

/**
 * @type {CommandDefinition}
 */
const rulesCommand = {
    name: 'rules',
    description: 'Displays the server rules.',
    syntax: '!rules', // Added syntax for completeness
    aliases: ['rule'], // Optional: add an alias if desired
    permissionLevel: permissionLevels.normal, // Corrected to normal as per typical usage for rules
    execute: async (player, args, dependencies) => { // Added dependencies parameter
        const { playerUtils } = dependencies; // For debugLog, if needed, and consistency

        const form = new MessageFormData();
        form.title("Server Rules");

        if (config.serverRules && config.serverRules.trim() !== "") {
            form.body(config.serverRules);
        } else {
            form.body("No server rules are currently configured. Please check back later!");
        }

        form.button1("Close");
        form.button2("OK"); // Changed second button label for clarity, though behavior is same.

        try {
            await form.show(player);
            // No specific action needed on response for a simple info display.
        } catch (error) {
            // Use playerUtils.debugLog if available from dependencies, otherwise console.error
            const logFunc = playerUtils?.debugLog ?? console.error;
            logFunc(`Error showing rules form to ${player.nameTag || player.name}: ${error}`);
        }
    }
};

export const definition = rulesCommand; // Exporting the command object as 'definition'
export const execute = rulesCommand.execute; // Exporting execute function directly

// Alternatively, to match other command files more closely:
// export const definition = rulesCommand;
// export async function execute(player, args, dependencies) {
//     await rulesCommand.execute(player, args, dependencies);
// }
// For simplicity and directness, the above direct exports are fine if 'rulesCommand' object structure is fixed.
// However, to strictly match the pattern of other command files (definition object + separate execute function):

// export const definition = {
//     name: 'rules',
//     description: 'Displays the server rules.',
//     syntax: '!rules',
//     aliases: ['rule'],
//     permissionLevel: permissionLevels.normal
// };

// export async function execute(player, args, dependencies) {
//     const { playerUtils } = dependencies;
//     const form = new MessageFormData();
//     form.title("Server Rules");

//     if (config.serverRules && config.serverRules.trim() !== "") {
//         form.body(config.serverRules);
//     } else {
//         form.body("No server rules are currently configured. Please check back later!");
//     }
//     form.button1("Close");
//     form.button2("OK");

//     try {
//         await form.show(player);
//     } catch (error) {
//         const logFunc = playerUtils?.debugLog ?? console.error;
//         logFunc(`Error showing rules form to ${player.nameTag || player.name}: ${error}`);
//     }
// }
// Choosing the direct export for now for brevity, but noting the alternative for strict pattern matching.
// Final decision: Adopting the common pattern of separate definition and execute exports.

// Re-adopting the standard structure:
// export const definition = {
//     name: 'rules',
//     description: 'Displays the server rules.',
//     syntax: '!rules',
//     aliases: ['rule'],
//     permissionLevel: permissionLevels.normal // Accessible to everyone
// };
//
// export async function execute(player, args, dependencies) {
//     const { playerUtils } = dependencies; // For debugLog, if needed
//
//     const form = new MessageFormData();
//     form.title("Server Rules");
//
//     if (config.serverRules && config.serverRules.trim() !== "") {
//         form.body(config.serverRules);
//     } else {
//         form.body("No server rules are currently configured. Please check back later!");
//     }
//
//     form.button1("Close");
//     form.button2("OK");
//
//     try {
//         await form.show(player);
//     } catch (error) {
//         const logFunc = playerUtils?.debugLog ?? console.error;
//         logFunc(`Error showing rules form to ${player.nameTag || player.name}: ${error}`);
//     }
// }

// Corrected final structure based on reflections during generation
// and aligning with typical command module structure in this project.
// The initial provided snippet had `export default rulesCommand;` which is not the pattern used.
// It also directly assigned execute. The common pattern is separate `definition` and `execute` exports.

/**
 * @type {CommandDefinition}
 */
export const definition = {
    name: 'rules',
    description: 'Displays the server rules.',
    syntax: '!rules',
    aliases: ['rule'],
    permissionLevel: permissionLevels.normal, // Accessible to everyone
};

/**
 * Executes the !rules command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments (not used in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils } = dependencies; // For debugLog, if needed

    const form = new MessageFormData();
    form.title("Server Rules");

    if (config.serverRules && config.serverRules.trim() !== "") {
        form.body(config.serverRules);
    } else {
        form.body("No server rules are currently configured. Please check back later!");
    }

    form.button1("Close");
    form.button2("OK"); // MessageFormData requires two buttons.

    try {
        // We don't need to do anything with the response for a simple info display.
        await form.show(player);
    } catch (error) {
        // Use playerUtils.debugLog if available from dependencies, otherwise console.error
        const logFunc = playerUtils?.debugLog ?? console.error;
        logFunc(`Error showing rules form to ${player.nameTag || player.name}: ${error}`);
    }
}
