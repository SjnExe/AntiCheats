import { commandManager } from './commandManager.js';
import * as reportManager from '../../core/reportManager.js';
import { getPlayerIdByName } from '../../core/playerDataManager.js';
import { ModalFormData } from '@minecraft/server-ui';
import { uiWait } from '../../core/utils.js';
import { world } from '@minecraft/server';

commandManager.register({
    name: 'report',
    description: 'Reports a player using a UI. The player can be offline.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    parameters: [
        { name: 'target', type: 'string', description: 'The name of the player to report.' }
    ],
    execute: async (player, args) => {
        const { target: reportedPlayerName } = args;

        if (!reportedPlayerName) {
            player.sendMessage('§cYou must specify a player to report.');
            return;
        }

        const targetId = getPlayerIdByName(reportedPlayerName);
        if (!targetId) {
            player.sendMessage(`§cPlayer "${reportedPlayerName}" has never joined this server.`);
            return;
        }

        // Try to get the correctly-cased name if the player is online.
        const onlinePlayer = Array.from(world.getPlayers()).find(p => p.id === targetId);
        const correctTargetName = onlinePlayer ? onlinePlayer.name : reportedPlayerName;

        const form = new ModalFormData()
            .title(`Report ${correctTargetName}`)
            .textField('Reason for report:', 'Enter the reason here');

        const response = await uiWait(player, form);

        if (response.canceled) {
            player.sendMessage('§cReport canceled.');
            return;
        }

        const [reason] = response.formValues;

        if (!reason || reason.trim().length === 0) {
            player.sendMessage('§cYou must provide a reason.');
            return;
        }

        reportManager.createReport(player, targetId, correctTargetName, reason);
        player.sendMessage('§aReport submitted. Thank you for your help.');
    }
});
