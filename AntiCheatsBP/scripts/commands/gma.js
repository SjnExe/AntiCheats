/**
 * @file Defines the !gma command for administrators to set a player's gamemode to Adventure.
 */
import * as mc from '@minecraft/server';
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'gma', // Already camelCase
    syntax: '!gma [playername]',
    description: 'Sets a player\'s gamemode to Adventure.',
    permissionLevel: permissionLevels.admin, // Assuming permissionLevels is correctly populated
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
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const targetPlayerNameArg = args[0];
    const gamemodeName = 'Adventure'; // Standard term
    const gamemodeMc = mc.GameMode.adventure;

    try {
        let targetPlayer = player; // Default to self if no targetPlayerNameArg

        if (targetPlayerNameArg) {
            const foundTarget = playerUtils?.findPlayer(targetPlayerNameArg);
            if (!foundTarget) {
                player?.sendMessage(getString('common.error.playerNotFound', { playerName: targetPlayerNameArg }));
                return;
            }
            targetPlayer = foundTarget;
        }

        // At this point, targetPlayer is either the issuer or the found player.
        // No need to check for targetPlayer.id === player.id explicitly for gamemode changes usually.

        targetPlayer.setGameMode(gamemodeMc);

        if (targetPlayer.id === player.id) { // Self change
            player?.sendMessage(getString('command.gamemode.success.self', { gamemodeName }));
            logManager?.addLog({
                adminName: adminName,
                actionType: 'gamemodeChangeSelf', // camelCase
                targetName: adminName, // Target is self
                details: `Set to ${gamemodeName}`,
            }, dependencies);
        } else { // Changed another player's gamemode
            player?.sendMessage(getString('command.gamemode.success.other', { playerName: targetPlayer.nameTag, gamemodeName }));
            targetPlayer.sendMessage(getString('command.gamemode.targetNotification', { gamemodeName }));
            logManager?.addLog({
                adminName: adminName,
                actionType: 'gamemodeChangeOther', // camelCase
                targetName: targetPlayer.nameTag,
                details: `Set to ${gamemodeName} by ${adminName}`,
            }, dependencies);
        }
    } catch (error) {
        const targetNameForError = targetPlayerNameArg || adminName;
        player?.sendMessage(getString('command.gamemode.error.generic', { targetNameForError, gamemodeName, errorMessage: error.message }));
        playerUtils?.debugLog(`[GMACommand.execute] Error setting gamemode for ${targetNameForError} by ${adminName}: ${error.message}`, adminName, dependencies);
        console.error(`[GMACommand.execute] Error for ${adminName} target ${targetNameForError}: ${error.stack || error}`);
        logManager?.addLog({
            adminName: adminName,
            actionType: 'errorGamemodeChange', // camelCase
            context: 'GMACommand.execute',
            details: `Failed to set gamemode for ${targetNameForError} to ${gamemodeName}: ${error.message}`,
            error: error.stack || error.message,
        }, dependencies);
    }
}
