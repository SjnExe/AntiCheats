/**
 * @file Defines the !setlang command. This command is currently non-functional
 * as multi-language support has been removed.
 */

import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'setlang',
    description: 'This command is no longer functional.', // Hardcoded string
    aliases: ['setlanguage'],
    permissionLevel: permissionLevels.admin, // Retain admin level for potential future use or restricted info
    requiresCheats: false, // Standard field
    syntax: '!setlang', // Simplified syntax
    parameters: [], // No parameters as it's disabled
    enabled: false, // Command is explicitly disabled
};

/**
 * Executes the setlang command (currently informs user it's disabled).
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} args Command arguments (ignored).
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, logManager } = dependencies;

    // Inform user command is deprecated/removed
    playerUtils.warnPlayer(player, '§cThe !setlang command has been removed as multi-language support is no longer available.');

    // Log the attempt to use the disabled command
    if (logManager) {
        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag, // Assuming admin if they could try to run it
            actionType: 'commandAttemptDisabled', // Changed to camelCase
            targetName: 'setlang', // Command name
            details: `Attempted to use disabled command: !setlang ${args.join(' ')}`,
        }, dependencies);
    }
}
