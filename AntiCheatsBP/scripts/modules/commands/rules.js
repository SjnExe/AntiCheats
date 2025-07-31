import { MessageFormData } from '@minecraft/server-ui';

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'rules',
    description: 'Displays the server rules.',
    syntax: '!rules',
    permissionLevel: 1024, // member
};

/**
 * Executes the rules command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config, logManager, getString } = dependencies;

    const form = new MessageFormData();
    form.title(getString('ui.serverRules.title'));

    const rules = config.serverInfo.rules;

    if (!Array.isArray(rules) || rules.length === 0) {
        form.body(getString('ui.serverRules.noRulesDefined'));
    } else {
        const ruleNumberArg = args[0];
        if (ruleNumberArg && /^\d+$/.test(ruleNumberArg)) {
            const ruleIndex = parseInt(ruleNumberArg, 10) - 1;
            if (ruleIndex >= 0 && ruleIndex < rules.length) {
                form.body(rules[ruleIndex]);
            } else {
                form.body(getString('ui.serverRules.invalidRuleNumber', { maxRules: rules.length }));
            }
        } else {
            form.body(rules.join('\n'));
        }
    }

    form.button1(getString('common.button.close'));

    try {
        await form.show(player);
    } catch (error) {
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
