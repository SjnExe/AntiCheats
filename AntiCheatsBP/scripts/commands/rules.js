// Script for the !rules command
import { MessageFormData } from '@minecraft/server-ui';
// Removed direct import of config
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../core/i18n.js';

/**
 * @file Script for the !rules command, displays server rules to the player.
 * @version 1.0.2
 */

/**
 * @typedef {import('../types.js').CommandDefinition} CommandDefinition
 */

// Corrected final structure based on reflections during generation
// and aligning with typical command module structure in this project.
/**
 * @type {CommandDefinition}
 */
export const definition = {
    name: 'rules',
    description: getString("command.rules.description"),
    syntax: '!rules',
    aliases: ['rule'],
    permissionLevel: permissionLevels.normal, // Accessible to everyone
};

/**
 * Executes the !rules command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} _args The command arguments (not used in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) { // args renamed to _args
    const { playerUtils, config: runtimeConfig } = dependencies; // Use runtimeConfig from dependencies

    const form = new MessageFormData();
    form.title(getString("command.rules.ui.title"));

    // Access serverRules from runtimeConfig (which is dependencies.config)
    if (runtimeConfig.serverRules && runtimeConfig.serverRules.trim() !== "") {
        // Assuming runtimeConfig.serverRules is already a string, potentially with formatting codes.
        // If serverRules itself needs to be a localization key, this would need to change to:
        // form.body(getString(runtimeConfig.serverRules));
        // For now, assuming it's a direct string from config.
        form.body(runtimeConfig.serverRules);
    } else {
        form.body(getString("command.rules.noRulesConfigured"));
    }

    form.button1(getString("common.button.close"));
    // MessageFormData requires two buttons. Using close for both as they have same behavior.
    form.button2(getString("common.button.close"));

    try {
        // We don't need to do anything with the response for a simple info display.
        await form.show(player);
    } catch (error) {
        // Use playerUtils.debugLog if available from dependencies, otherwise console.error
        if (runtimeConfig.enableDebugLogging && playerUtils?.debugLog) {
            playerUtils.debugLog(`Error showing rules form to ${player.nameTag || player.name}: ${error}`);
        } else {
            console.error(`Error showing rules form to ${player.nameTag || player.name}: ${error}`);
        }
    }
}
