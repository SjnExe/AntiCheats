// Script for the !rules command
import { MessageFormData } from '@minecraft/server-ui';
// permissionLevels and getString are now accessed via dependencies

/**
 * @file Script for the !rules command, displays server rules to the player.
 * @version 1.0.3
 */

/**
 * @typedef {import('../types.js').CommandDefinition} CommandDefinition
 */

/**
 * @type {CommandDefinition}
 */
export const definition = {
    name: 'rules',
    description: "Displays the server rules.", // Static fallback
    syntax: '!rules',
    aliases: ['rule'],
    permissionLevel: 0, // Static fallback (Normal)
    enabled: true,
};

/**
 * Executes the !rules command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} _args The command arguments (not used in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) {
    const { playerUtils, config, permissionLevels } = dependencies; // getString removed

    // Static definitions are used

    const form = new MessageFormData();
    // "command.rules.ui.title" -> "Server Rules"
    form.title("Server Rules");

    if (config.serverRules && config.serverRules.trim() !== "") {
        form.body(config.serverRules); // serverRules is already a string array joined by newline or a single string
    } else {
        // "command.rules.noRulesConfigured" -> "No server rules are currently configured. Please check back later!"
        form.body("No server rules are currently configured. Please check back later!");
    }

    // "common.button.close" -> "Close"
    form.button1("Close");
    form.button2("Close"); // MessageFormData requires two buttons

    try {
        await form.show(player);
    } catch (error) {
        playerUtils.debugLog(`[RulesCommand] Error showing rules form to ${player.nameTag || player.name}: ${error.message}`, player.nameTag, dependencies);
        console.error(`[RulesCommand] Error showing rules form to ${player.nameTag || player.name}: ${error.stack || error}`);
    }
}
