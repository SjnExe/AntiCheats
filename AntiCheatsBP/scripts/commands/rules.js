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
    const { playerUtils, config, getString, permissionLevels } = dependencies; // Destructure all needed services

    // definition.description = getString("command.rules.description");
    // definition.permissionLevel = permissionLevels.normal;

    const form = new MessageFormData();
    form.title(getString("command.rules.ui.title"));

    if (config.serverRules && config.serverRules.trim() !== "") {
        // Assuming config.serverRules is already a string.
        // If it were a loc key: form.body(getString(config.serverRules));
        form.body(config.serverRules);
    } else {
        form.body(getString("command.rules.noRulesConfigured"));
    }

    form.button1(getString("common.button.close"));
    form.button2(getString("common.button.close")); // MessageFormData requires two buttons

    try {
        await form.show(player);
    } catch (error) {
        playerUtils.debugLog(`[RulesCommand] Error showing rules form to ${player.nameTag || player.name}: ${error.message}`, dependencies, player.nameTag);
        console.error(`[RulesCommand] Error showing rules form to ${player.nameTag || player.name}: ${error.stack || error}`);
    }
}
