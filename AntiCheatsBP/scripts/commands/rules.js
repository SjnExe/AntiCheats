/**
 * @file Script for the !rules command, displays server rules to the player.
 */

import { MessageFormData } from '@minecraft/server-ui';
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'rules',
    description: 'Displays the server rules.', // Hardcoded string
    syntax: '!rules',
    aliases: ['rule'],
    permissionLevel: permissionLevels.normal,
    enabled: true,
};

/**
 * Executes the !rules command.
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} _args Command arguments (not used).
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export async function execute(player, _args, dependencies) {
    const { playerUtils, config, logManager } = dependencies; // Added logManager

    const form = new MessageFormData();
    form.title('Server Rules'); // Hardcoded title

    if (config.serverRules && config.serverRules.trim() !== '') {
        form.body(config.serverRules);
    } else {
        form.body('No server rules are currently configured. Please check back later!'); // Hardcoded message
    }

    form.button1('Close'); // Standard button text

    try {
        await form.show(player);
        // Optional: Log rule display if needed, though generally not necessary
        // logManager.addLog({
        //     timestamp: Date.now(),
        //     playerName: player.nameTag, // Assuming playerName for general logs
        //     actionType: 'command_rules_shown',
        //     details: `Player ${player.nameTag} viewed the rules.`,
        // }, dependencies);
    } catch (error) {
        // Log errors specifically if form display fails
        console.error(`[RulesCommand] Error showing rules form to ${player.nameTag || player.name}: ${error.stack || error}`);
        playerUtils.debugLog(`[RulesCommand] Error showing rules form to ${player.nameTag || player.name}: ${error.message}`, player.nameTag, dependencies);
        // No need to message player here as form.show() failing is usually a client-side issue
        // or an unrecoverable server-side issue with UI.
        logManager.addLog({
            timestamp: Date.now(),
            actionType: 'error',
            context: 'RulesCommandShowForm',
            playerName: player.nameTag, // Identify player if possible
            details: `Error showing rules form: ${error.stack || error}`,
        }, dependencies);
    }
}
