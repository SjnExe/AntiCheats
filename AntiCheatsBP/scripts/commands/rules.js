/**
 * @file Script for the !rules command, displays server rules to the player.
 */

import { MessageFormData } from '@minecraft/server-ui';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'rules',
    description: 'Displays the server rules.',
    syntax: '!rules',
    aliases: ['rule', 'r'],
    permissionLevel: 1024, // member
    enabled: true,
};

/**
 * Executes the !rules command.
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} _args Command arguments (not used).
 * @param {import('../types.js').CommandDependencies} dependencies The dependencies object.
 */
export async function execute(player, _args, dependencies) {
    const { playerUtils, config, logManager, getString } = dependencies;

    const form = new MessageFormData();
    form.title(getString('ui.serverRules.title'));

    if (config.serverRules && config.serverRules.trim() !== '') {
        const rulesText = Array.isArray(config.serverRules) ? config.serverRules.join('\n') : config.serverRules;
        form.body(rulesText);
    }
    else {
        form.body(getString('ui.serverRules.noRulesDefined'));
    }

    form.button1(getString('common.button.close'));

    try {
        await form.show(player);
    }
    catch (error) {
        console.error(`[RulesCommand] Error showing rules form to ${player.nameTag || player.name}: ${error.stack || error}`);
        playerUtils.debugLog(`[RulesCommand] Error showing rules form to ${player.nameTag || player.name}: ${error.message}`, player.nameTag, dependencies);
        logManager.addLog({
            timestamp: Date.now(),
            actionType: 'errorRulesCommandForm',
            context: 'RulesCommand.showForm',
            adminName: player.nameTag,
            details: `Error showing rules form: ${error.stack || error}`,
        }, dependencies);
    }
}
