/**
 * @file Defines the !tpastatus command for players to manage their TPA request availability.
 */
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpastatus',
    syntax: '[on|off|status]', // Prefix handled by commandManager
    description: 'Manages your TPA (Teleport Ask) request availability or checks current status.',
    permissionLevel: permissionLevels.member, // Accessible by members
    enabled: true, // Master toggle for this command, TPA system itself has a global toggle in config.js
};

/**
 * Executes the !tpastatus command.
 * Allows players to enable/disable receiving TPA requests, or check their current TPA status.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [on|off|status].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, tpaManager, getString, logManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer'; // For messages
    const playerSystemName = player.name; // For tpaManager map keys
    const prefix = config?.prefix ?? '!';

    if (!config?.enableTpaSystem) {
        player.sendMessage(getString('command.tpa.systemDisabled'));
        return;
    }
    if (!dependencies.commandSettings?.tpastatus?.enabled) { // Check specific command toggle
        player.sendMessage(getString('command.error.unknownCommand', { prefix: prefix, commandName: definition.name }));
        return;
    }

    const subCommand = args[0]?.toLowerCase() || 'status'; // Default to 'status'

    const currentStatus = tpaManager?.getPlayerTpaStatus(playerSystemName, dependencies);
    let newAcceptsTpa;

    switch (subCommand) {
        case 'on':
        case 'enable':
            newAcceptsTpa = true;
            break;
        case 'off':
        case 'disable':
            newAcceptsTpa = false;
            break;
        case 'status':
            const statusMsgKey = currentStatus?.acceptsTpaRequests ? 'command.tpastatus.status.accepting' : 'command.tpastatus.status.notAccepting';
            player.sendMessage(getString(statusMsgKey));
            return; // Status check done
        default:
            player.sendMessage(getString('command.tpastatus.invalidOption', { prefix: prefix }));
            return;
    }

    // If state is already what they want to set it to
    if (newAcceptsTpa === currentStatus?.acceptsTpaRequests) {
        const alreadyMsgKey = newAcceptsTpa ? 'command.tpastatus.status.accepting' : 'command.tpastatus.status.notAccepting';
        player.sendMessage(getString(alreadyMsgKey) + " (No change made)");
        return;
    }

    tpaManager?.setPlayerTpaStatus(playerSystemName, newAcceptsTpa, dependencies);
    playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

    if (newAcceptsTpa) {
        player.sendMessage(getString('command.tpastatus.on'));
    } else {
        player.sendMessage(getString('command.tpastatus.off'));
        // If turning off, automatically decline any pending incoming requests for this player
        const incomingRequests = (tpaManager?.findRequestsForPlayer(playerSystemName) ?? [])
            .filter(r => r.targetName === playerSystemName && r.status === 'pendingAcceptance');
        if (incomingRequests.length > 0) {
            incomingRequests.forEach(req => tpaManager?.declineRequest(req.requestId, dependencies));
            player.sendMessage(getString('command.tpastatus.off.declinedNotification', { count: incomingRequests.length.toString() }));
        }
    }

    logManager?.addLog({
        actionType: 'tpaStatusChanged', // Standardized camelCase
        targetName: playerName, // Target is self
        targetId: player.id,
        details: `Player set TPA acceptance to: ${newAcceptsTpa}.`,
        context: 'TpaStatusCommand.execute',
    }, dependencies);
}
