/**
 * @file Defines the !gma command for administrators to set a player's gamemode to Adventure.
 */
import * as mc from '@minecraft/server';
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'gma',
    syntax: '!gma [playername]',
    description: 'Sets a player\'s gamemode to Adventure.',
    permissionLevel: permissionLevels.admin,
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
    const { playerUtils, logManager, getString } = dependencies;
    const targetPlayerName = args[0];
    const gamemodeName = 'Adventure'; // This could also be localized if needed, but often "Adventure" is fine as-is
    const gamemodeMc = mc.GameMode.adventure;

    try {
        if (targetPlayerName) {
            const targetPlayer = playerUtils.findPlayer(targetPlayerName);
            if (targetPlayer) {
                targetPlayer.setGameMode(gamemodeMc);
                player.sendMessage(getString('command.gamemode.success.other', { playerName: targetPlayer.nameTag, gamemodeName: gamemodeName }));
                if (player.id !== targetPlayer.id) {
                    targetPlayer.sendMessage(getString('command.gamemode.targetNotification', { gamemodeName: gamemodeName }));
                }
                logManager.addLog({
                    timestamp: Date.now(),
                    adminName: player.nameTag,
                    actionType: 'gamemodeChange',
                    targetName: targetPlayer.nameTag,
                    details: `Set to ${gamemodeName}`,
                }, dependencies);
            } else {
                player.sendMessage(getString('common.error.playerNotFound', { playerName: targetPlayerName }));
            }
        } else {
            player.setGameMode(gamemodeMc);
            player.sendMessage(getString('command.gamemode.success.self', { gamemodeName: gamemodeName }));
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
        player.sendMessage(getString('command.gamemode.error.generic', { targetNameForError: targetNameForError, gamemodeName: gamemodeName, errorMessage: error.message }));
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
