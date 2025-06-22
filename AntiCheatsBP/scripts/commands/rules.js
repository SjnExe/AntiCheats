import { MessageFormData } from '@minecraft/server-ui';
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
    description: "Displays the server rules.",
    syntax: '!rules',
    aliases: ['rule'],
    permissionLevel: 0,
    enabled: true,
};
/**
 * Executes the !rules command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} _args The command arguments (not used in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) {
    const { playerUtils, config, permissionLevels } = dependencies;

    const form = new MessageFormData();
    form.title("Server Rules");

    if (config.serverRules && config.serverRules.trim() !== "") {
        form.body(config.serverRules);
    } else {
        form.body("No server rules are currently configured. Please check back later!");
    }

    form.button1("Close");
    form.button2("Close");

    try {
        await form.show(player);
    } catch (error) {
        playerUtils.debugLog(`[RulesCommand] Error showing rules form to ${player.nameTag || player.name}: ${error.message}`, player.nameTag, dependencies);
        console.error(`[RulesCommand] Error showing rules form to ${player.nameTag || player.name}: ${error.stack || error}`);
    }
}
