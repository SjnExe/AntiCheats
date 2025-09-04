import { commandManager } from './commandManager.js';
import * as reportManager from '../../core/reportManager.js';
import { getPlayerIdByName, loadPlayerData } from '../../core/playerDataManager.js';
import { ModalFormData } from '@minecraft/server-ui';
import { uiWait } from '../../core/utils.js';
import { debugLog } from '../../core/logger.js';

commandManager.register({
    name: 'report',
    description: 'Reports a player using a UI. The player can be offline.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    parameters: [
        { name: 'target', type: 'string', description: 'The name of the player to report.' }
    ],
    execute: async (player, args) => {
        const { target: targetName } = args;

        if (!targetName) {
            player.sendMessage('§cYou must specify a player to report.');
            return;
        }

        const targetId = getPlayerIdByName(targetName);
        if (!targetId) {
            player.sendMessage(`§cPlayer "${targetName}" has never joined this server.`);
            return;
        }

        // Load the target's data to get their correctly-cased name for the UI
        const targetData = loadPlayerData(targetId);
        const correctTargetName = targetData ? targetData.name : targetName;

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

        debugLog(`[ReportCommand] Creating report with: targetId=${targetId}, correctTargetName=${correctTargetName}, reason=${reason}`);
        reportManager.createReport(player, targetId, correctTargetName, reason);
        player.sendMessage('§aReport submitted. Thank you for your help.');
    }
});
