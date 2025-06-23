import { MessageFormData } from '@minecraft/server-ui';

/**
 * Script for the !rules command, displays server rules to the player.
 */
export const definition = {
    name: 'rules',
import { permissionLevels } from '../core/rankManager.js'; // Import permissionLevels

export const definition = {
    name: 'rules',
    description: "Displays the server rules.",
    syntax: '!rules',
    aliases: ['rule'],
    permissionLevel: permissionLevels.normal, // Corrected: Should be available to normal players
    enabled: true,
};
/**
 * Executes the !rules command.
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

    form.button1("Close"); // Only one close button is typically needed for MessageFormData

    await form.show(player).catch(error => {
        playerUtils.debugLog(`[RulesCommand] Error showing rules form to ${player.nameTag || player.name}: ${error.message}`, player.nameTag, dependencies);
        console.error(`[RulesCommand] Error showing rules form to ${player.nameTag || player.name}: ${error.stack || error}`);
    });
}
