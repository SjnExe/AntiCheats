/**
 * @file Defines the !gma command for administrators to set a player's gamemode to Adventure.
 */
import * as mc from '@minecraft/server';
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'gma',
    syntax: '[playername]', // Prefix handled by commandManager
    description: 'Sets your gamemode or a target player\'s gamemode to Adventure.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !gma (gamemode adventure) command.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [playername].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, getString, config } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const targetPlayerNameArg = args[0];
    const gamemodeName = mc.GameMode[mc.GameMode.adventure]; // Get string "adventure"
    const gamemodeMcEnum = mc.GameMode.adventure;

    try {
        let targetPlayer = player; // Default to self if no targetPlayerNameArg

        if (targetPlayerNameArg) {
            const foundTarget = playerUtils?.findPlayer(targetPlayerNameArg);
            if (!foundTarget || !foundTarget.isValid()) { // Added isValid
                player?.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerNameArg }));
                return;
            }
            targetPlayer = foundTarget;
        }

        targetPlayer.setGameMode(gamemodeMcEnum);
        const successSound = "commandSuccess"; // Centralize sound event keys if needed

        if (targetPlayer.id === player.id) { // Self change
            player?.sendMessage(getString('command.gamemode.success.self', { gamemodeName: gamemodeName }));
            logManager?.addLog({
                adminName: adminName,
                actionType: 'gamemodeSetSelf', // More specific
                targetName: adminName, // Target is self
                targetId: player.id,
                details: `Set own gamemode to ${gamemodeName}`,
            }, dependencies);
        } else { // Changed another player's gamemode
            player?.sendMessage(getString('command.gamemode.success.other', { playerName: targetPlayer.nameTag, gamemodeName: gamemodeName }));
            targetPlayer.sendMessage(getString('command.gamemode.targetNotification', { gamemodeName: gamemodeName }));
            logManager?.addLog({
                adminName: adminName,
                actionType: 'gamemodeSetOther', // More specific
                targetName: targetPlayer.nameTag,
                targetId: targetPlayer.id,
                details: `Set ${targetPlayer.nameTag}'s gamemode to ${gamemodeName} by ${adminName}`,
            }, dependencies);
        }
        playerUtils?.playSoundForEvent(player, successSound, dependencies);

    } catch (error) {
        const targetNameForError = targetPlayerNameArg || adminName;
        player?.sendMessage(getString('command.gamemode.error.generic', { targetNameForError, gamemodeName, errorMessage: error.message }));
        playerUtils?.debugLog(`[GMACommand CRITICAL] Error setting gamemode for ${targetNameForError} by ${adminName}: ${error.message}`, adminName, dependencies);
        console.error(`[GMACommand CRITICAL] Error for ${adminName} target ${targetNameForError}: ${error.stack || error}`);
        playerUtils?.playSoundForEvent(player, "commandError", dependencies);
        logManager?.addLog({
            adminName: adminName,
            actionType: 'errorGamemodeSet', // Standardized error
            context: 'GMACommand.execute',
            targetName: targetNameForError,
            details: `Failed to set gamemode to ${gamemodeName}: ${error.message}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
