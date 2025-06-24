/**
 * @file Defines the !gma command for administrators to set a player's gamemode to Adventure.
 */
import * as mc from '@minecraft/server';
import { permissionLevels } from '../core/rankManager.js'; // Standardized import

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'gma',
    syntax: '!gma [playername]',
    description: 'Sets a player\'s gamemode to Adventure.',
    permissionLevel: permissionLevels.admin, // Use a defined level
    enabled: true,
};

/**
 * Executes the !gma (gamemode adventure) command.
 * Sets the gamemode of the target player (or the command issuer if no target is specified) to Adventure.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [playername].
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, findPlayer, config, getString } = dependencies; // Removed unused permissionLevels
    const targetPlayerName = args[0];
    const gamemodeName = 'Adventure'; // For messages
    const gamemodeMc = mc.GameMode.adventure; // For API

    try {
        if (targetPlayerName) {
            const targetPlayer = findPlayer(targetPlayerName); // findPlayer is from playerUtils
            if (targetPlayer) {
                targetPlayer.setGameMode(gamemodeMc);
                player.sendMessage(getString('gamemode.successOther', { playerName: targetPlayer.nameTag, gamemode: gamemodeName }));
                if (player.id !== targetPlayer.id) {
                    targetPlayer.sendMessage(getString('gamemode.changedTo', { gamemode: gamemodeName }));
                }
                logManager.addLog({
                    timestamp: Date.now(),
                    adminName: player.nameTag,
                    actionType: 'gamemodeChange', // Standardized
                    targetName: targetPlayer.nameTag,
                    details: `Set to ${gamemodeName}`,
                }, dependencies);
            } else {
                player.sendMessage(getString('common.error.playerNotFound', { playerName: targetPlayerName }));
            }
        } else {
            // No target player specified, apply to the command issuer
            player.setGameMode(gamemodeMc);
            player.sendMessage(getString('gamemode.successSelf', { gamemode: gamemodeName }));
            logManager.addLog({
                timestamp: Date.now(),
                adminName: player.nameTag,
                actionType: 'gamemodeChangeSelf', // Standardized
                targetName: player.nameTag,
                details: `Set to ${gamemodeName}`,
            }, dependencies);
        }
    } catch (error) {
        const targetNameForError = targetPlayerName || player.nameTag;
        player.sendMessage(getString('gamemode.error.set', { playerName: targetNameForError, gamemode: gamemodeName, error: error.message }));
        playerUtils.debugLog(`[GMACommand] Error setting gamemode for ${targetNameForError}: ${error.message}`, player.nameTag, dependencies);
        console.error(`[GMACommand] Error setting gamemode for ${targetNameForError} by ${player.nameTag}: ${error.stack || error}`);
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'error',
            context: 'gmaCommand',
            details: `Failed to set gamemode for ${targetNameForError} to ${gamemodeName}: ${error.message}`,
        }, dependencies);
    }
}
