import { commandManager } from './commandManager.js';
import * as reportManager from '../../core/reportManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { ModalFormData } from '@minecraft/server-ui';
import { uiWait } from '../../core/utils.js';

commandManager.register({
    name: 'report',
    description: 'Reports a player using a UI.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    parameters: [
        { name: 'target', type: 'player', description: 'The player to report.' }
    ],
    execute: async (player, args) => {
        const { target } = args;

        if (!target) {
            player.sendMessage('§cPlayer not found.');
            return;
        }

        // For slash commands, target is a player object array. For chat, it's a name string.
        const targetPlayer = Array.isArray(target) ? target[0] : findPlayerByName(target);

        if (!targetPlayer) {
            player.sendMessage('§cPlayer not found or is not online.');
            return;
        }

        if (targetPlayer.id === player.id) {
            player.sendMessage('§cYou cannot report yourself.');
            return;
        }

        const form = new ModalFormData()
            .title(`Report ${targetPlayer.name}`)
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

        reportManager.createReport(player, targetPlayer, reason);
        player.sendMessage('§aReport submitted. Thank you for your help.');
    }
});
