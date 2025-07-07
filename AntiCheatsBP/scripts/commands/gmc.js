/**
 * /**
 *
 * @file Defines the !gmc command for administrators to set a player's gamemode to Creative.
 */
import * as mc from '@minecraft/server';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'gmc',
    syntax: '[playername]',
    description: 'Sets your gamemode or a target player\'s gamemode to Creative.',
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the !gmc (gamemode creative) command.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [playername].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {void}
 */
export function execute(player, args, dependencies) {
    const { playerUtils, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const targetPlayerNameArg = args[0];
    const gamemodeName = mc.GameMode[mc.GameMode.creative];
    const gamemodeMcEnum = mc.GameMode.creative;

    try {
        let targetPlayer = player;

        if (targetPlayerNameArg) {
            const foundTarget = playerUtils?.findPlayer(targetPlayerNameArg);
            if (!foundTarget || !foundTarget.isValid()) {
                player?.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerNameArg }));
                return;
            }
            targetPlayer = foundTarget;
        }

        targetPlayer.setGameMode(gamemodeMcEnum);
        const successSound = 'commandSuccess';

        if (targetPlayer.id === player.id) {
            player?.sendMessage(getString('command.gamemode.success.self', { gamemodeName: gamemodeName }));
            logManager?.addLog({
                adminName: adminName,
                actionType: 'gamemodeSetSelf',
                targetName: adminName,
                targetId: player.id,
                details: `Set own gamemode to ${gamemodeName}`,
            }, dependencies);
        }
        else {
            player?.sendMessage(getString('command.gamemode.success.other', { playerName: targetPlayer.nameTag, gamemodeName: gamemodeName }));
            targetPlayer.sendMessage(getString('command.gamemode.targetNotification', { gamemodeName: gamemodeName }));
            logManager?.addLog({
                adminName: adminName,
                actionType: 'gamemodeSetOther',
                targetName: targetPlayer.nameTag,
                targetId: targetPlayer.id,
                details: `Set ${targetPlayer.nameTag}'s gamemode to ${gamemodeName} by ${adminName}`,
            }, dependencies);
        }
        playerUtils?.playSoundForEvent(player, successSound, dependencies);

    }
    catch (error) {
        const targetNameForError = targetPlayerNameArg || adminName;
        player?.sendMessage(getString('command.gamemode.error.generic', { targetNameForError, gamemodeName, errorMessage: error.message }));
        playerUtils?.debugLog(`[GMCCommand CRITICAL] Error setting gamemode for ${targetNameForError} by ${adminName}: ${error.message}`, adminName, dependencies);
        console.error(`[GMCCommand CRITICAL] Error for ${adminName} target ${targetNameForError}: ${error.stack || error}`);
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
        logManager?.addLog({
            adminName: adminName,
            actionType: 'errorGamemodeSet',
            context: 'GMCCommand.execute',
            targetName: targetNameForError,
            details: `Failed to set gamemode to ${gamemodeName}: ${error.message}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
