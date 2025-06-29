/**
 * @file Defines the !gmc command for administrators to set a player's gamemode to Creative.
 */
import * as mc from '@minecraft/server';
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'gmc',
    syntax: '!gmc [playername]',
    description: 'Sets a player\'s gamemode to Creative.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !gmc (gamemode creative) command.
 * Sets the gamemode of the target player (or the command issuer if no target is specified) to Creative.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [playername].
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, logManager } = dependencies;
    const targetPlayerName = args[0];
    const gamemodeName = 'Creative';
    const gamemodeMc = mc.GameMode.creative;

    try {
        if (targetPlayerName) {
            const targetPlayer = playerUtils.findPlayer(targetPlayerName);
            if (targetPlayer) {
                targetPlayer.setGameMode(gamemodeMc);
                player.sendMessage(`§aSet ${targetPlayer.nameTag}'s gamemode to ${gamemodeName}.`);
                if (player.id !== targetPlayer.id) {
                    targetPlayer.sendMessage(`§eYour gamemode has been set to ${gamemodeName}.`);
                }
                logManager.addLog({
                    timestamp: Date.now(),
                    adminName: player.nameTag,
                    actionType: 'gamemodeChange',
                    targetName: targetPlayer.nameTag,
                    details: `Set to ${gamemodeName}`,
                }, dependencies);
            } else {
                player.sendMessage(`§cPlayer '${targetPlayerName}' not found.`);
            }
        } else {
            player.setGameMode(gamemodeMc);
            player.sendMessage(`§aYour gamemode has been set to ${gamemodeName}.`);
            logManager.addLog({
                timestamp: Date.now(),
                adminName: player.nameTag,
                actionType: 'gamemodeChangeSelf',
                targetName: player.nameTag,
                details: `Set to ${gamemodeName}`,
            }, dependencies);
        }
    } catch (error) {
        const targetNameForError = targetPlayerName || player.nameTag;
        player.sendMessage(`§cFailed to set gamemode for ${targetNameForError} to ${gamemodeName}: ${error.message}`);
        playerUtils.debugLog(`[GMCCommand] Error setting gamemode for ${targetNameForError}: ${error.message}`, player.nameTag, dependencies);
        console.error(`[GMCCommand] Error setting gamemode for ${targetNameForError} by ${player.nameTag}: ${error.stack || error}`);
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'error',
            context: 'gmcCommand',
            details: `Failed to set gamemode for ${targetNameForError} to ${gamemodeName}: ${error.message}`,
        }, dependencies);
    }
}
