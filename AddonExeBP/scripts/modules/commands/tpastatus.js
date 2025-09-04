import { commandManager } from './commandManager.js';
import { getOutgoingRequest, getIncomingRequest } from '../../core/tpaManager.js';
import { playSound } from '../../core/utils.js';

commandManager.register({
    name: 'tpastatus',
    description: 'Checks the status of your outgoing and incoming TPA requests.',
    category: 'TPA System',
    permissionLevel: 1024, // Everyone
    parameters: [],
    execute: (player, args) => {
        const outgoing = getOutgoingRequest(player);
        const incoming = getIncomingRequest(player);

        let statusMessage = '§a--- TPA Status ---\n';
        let foundRequest = false;

        if (outgoing) {
            foundRequest = true;
            const typeText = outgoing.type === 'tpa' ? 'teleport to them' : 'teleport them to you';
            statusMessage += `§eOutgoing Request:§r You have sent a request to §b${outgoing.targetPlayerName}§r to ${typeText}.\n`;
            statusMessage += '§7(Use /tpacancel to cancel this request)\n';
        }

        if (incoming) {
            foundRequest = true;
            const typeText = incoming.type === 'tpa' ? 'teleport to you' : 'teleport you to them';
            statusMessage += `§eIncoming Request:§r You have a request from §b${incoming.sourcePlayerName}§r to ${typeText}.\n`;
            statusMessage += '§7(Use /tpaccept or /tpadeny to respond)\n';
        }

        if (!foundRequest) {
            statusMessage += '§fYou have no pending TPA requests.';
        }

        player.sendMessage(statusMessage.trim());
        playSound(player, 'random.orb');
    }
});
