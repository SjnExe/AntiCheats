import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { panelDefinitions } from './panelLayoutConfig.js';
import { getPlayer } from './playerDataManager.js';
import { world } from '@minecraft/server';
import { getConfig } from './configManager.js';
import { debugLog } from './logger.js';
import { getPlayerRank } from './rankManager.js';
import { uiWait } from './utils.js';
import * as economyManager from './economyManager.js';

const uiActionFunctions = {};

/**
 * Main entry point for showing a panel. It builds the form, shows it reliably, and handles the response.
 * @param {import('@minecraft/server').Player} player The player to show the panel to.
 * @param {string} panelId The ID of the panel from panelLayoutConfig.js.
 * @param {object} context Contextual data, e.g., { targetPlayer: Player }.
 */
export async function showPanel(player, panelId, context = {}) {
    try {
        debugLog(`[UIManager] Showing panel '${panelId}' to ${player.name}`);
        const form = await buildPanelForm(player, panelId, context);
        if (!form) return;

        const response = await uiWait(player, form);
        if (!response || response.canceled) {
            debugLog(`[UIManager] Panel '${panelId}' was cancelled or timed out.`);
            return;
        }

        await handleFormResponse(player, panelId, response, context);
    } catch (e) {
        console.error(`[UIManager] showPanel failed for panel '${panelId}': ${e.stack}`);
    }
}

/**
 * Builds and returns a form object based on a panel definition, but does not show it.
 * @returns {Promise<ActionFormData | ModalFormData | null>}
 */
async function buildPanelForm(player, panelId, context) {
    const panelDef = panelDefinitions[panelId];
    if (!panelDef) {
        console.error(`[UIManager] Panel with ID '${panelId}' not found.`);
        return null;
    }

    const pData = getPlayer(player.id);
    if (!pData) {
        console.error(`[UIManager] Could not get player data for ${player.name}.`);
        return null;
    }

    let title = panelDef.title.replace('{playerName}', context.targetPlayer?.name ?? '');

    // Handle dynamic panels
    if (panelId === 'playerListPanel' || panelId === 'publicPlayerListPanel') {
        return buildPlayerListForm(title, player, panelId);
    }

    // Standard ActionFormData builder
    const form = new ActionFormData().title(title);
    addPanelBody(form, panelId, context);

    const menuItems = getMenuItems(panelDef, pData.permissionLevel);
    for (const item of menuItems) {
        form.button(item.text, item.icon);
    }
    return form;
}

/**
 * Processes the response from a submitted form.
 */
async function handleFormResponse(player, panelId, response, context) {
    const pData = getPlayer(player.id);
    if (!pData) return;

    // Handle dynamic lists
    if (panelId === 'playerListPanel' || panelId === 'publicPlayerListPanel') {
        if (response.selection === 0) return showPanel(player, 'mainPanel', context);
        const playerList = world.getAllPlayers().sort((a, b) => a.name.localeCompare(b.name));
        const selectedPlayer = playerList[response.selection - 1];
        if (selectedPlayer) {
            const nextPanel = panelId === 'playerListPanel' ? 'playerManagementPanel' : 'publicPlayerActionsPanel';
            return showPanel(player, nextPanel, { ...context, targetPlayer: selectedPlayer });
        }
        return;
    }

    // Handle standard menus
    const panelDef = panelDefinitions[panelId];
    const menuItems = getMenuItems(panelDef, pData.permissionLevel);
    const selectedItem = menuItems[response.selection];

    if (!selectedItem) return;

    if (selectedItem.id === '__back__') {
        return showPanel(player, selectedItem.actionValue, context);
    }

    if (selectedItem.actionType === 'openPanel') {
        return showPanel(player, selectedItem.actionValue, context);
    } else if (selectedItem.actionType === 'functionCall') {
        const actionFunction = uiActionFunctions[selectedItem.actionValue];
        if (actionFunction) {
            return actionFunction(player, context);
        }
    }
}

// --- Helper & Builder Functions ---

function getMenuItems(panelDef, permissionLevel) {
    const items = (panelDef.items || [])
        .filter(item => permissionLevel <= item.permissionLevel)
        .sort((a, b) => (a.sortId || 0) - (b.sortId || 0));

    if (panelDef.parentPanelId) {
        items.unshift({
            id: '__back__',
            text: '§l§8< Back',
            icon: 'textures/gui/controls/left.png',
            permissionLevel: 1024,
            actionType: 'openPanel',
            actionValue: panelDef.parentPanelId
        });
    }
    return items;
}

function addPanelBody(form, panelId, context) {
    if (panelId === 'playerManagementPanel' && context.targetPlayer) {
        const { targetPlayer } = context;
        const targetPData = getPlayer(targetPlayer.id);
        const rank = getPlayerRank(targetPlayer, getConfig());
        const profile = [
            `§fName: §e${targetPlayer.name}`,
            `§fRank: §r${rank.chatFormatting?.nameColor ?? '§7'}${rank.name}`,
            `§fBalance: §a$${targetPData?.balance?.toFixed(2) ?? '0.00'}`
        ].join('\n\n');
        form.body(profile);
    }
}

function buildPlayerListForm(title, player, panelId) {
    const form = new ActionFormData().title(title);
    const onlinePlayers = world.getAllPlayers().sort((a, b) => a.name.localeCompare(b.name));
    form.button('§l§8< Back', 'textures/gui/controls/left.png');
    for (const p of onlinePlayers) {
        const rank = getPlayerRank(p, getConfig());
        const prefix = rank.chatFormatting?.prefixText ?? '';
        let displayName = `${prefix}${p.name}§r`;
        let icon;
        if (panelId === 'playerListPanel' && rank.name === 'Owner') {
            icon = 'textures/ui/crown_glyph_color';
        }
        if (p.id === player.id) displayName += ' §7(You)§r';
        form.button(displayName, icon);
    }
    return form;
}


// --- UI Action Functions ---

uiActionFunctions['showKickForm'] = async (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) return;

    const form = new ModalFormData().title(`Kick ${targetPlayer.name}`).textField('Reason', 'Kick reason', 'No reason provided');
    const response = await uiWait(player, form);

    if (!response || response.canceled) return;
    const [reason] = response.formValues;

    const freshTarget = world.getPlayer(targetPlayer.id);
    if (freshTarget) {
        freshTarget.kick(reason);
        player.sendMessage(`§aKicked ${freshTarget.name}.`);
    } else {
        player.sendMessage('§cTarget player is no longer online.');
    }
};

uiActionFunctions['showBanForm'] = async (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) return;

    const form = new ModalFormData()
        .title(`Ban ${targetPlayer.name}`)
        .textField('Duration (e.g., 1d, 2h, 30m)', 'perm')
        .textField('Reason', 'No reason provided');

    const response = await uiWait(player, form);
    if (!response || response.canceled) return;

    const [duration, reason] = response.formValues;
    player.runCommandAsync(`ban "${targetPlayer.name}" ${duration} ${reason}`);
};

uiActionFunctions['showPayForm'] = async (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) return player.sendMessage('§cTarget player not found.');
    if (targetPlayer.id === player.id) return player.sendMessage('§cYou cannot pay yourself.');

    const form = new ModalFormData()
        .title(`Pay ${targetPlayer.name}`)
        .textField('Amount', 'Enter amount to pay');

    const response = await uiWait(player, form);
    if (!response || response.canceled) return;

    const [amountStr] = response.formValues;
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
        return player.sendMessage('§cInvalid amount. Please enter a positive number.');
    }

    // This re-uses the logic from the !pay command
    const config = getConfig();
    const sourceData = getPlayer(player.id);
    if (!sourceData || sourceData.balance < amount) {
        return player.sendMessage('§cYou do not have enough money for this payment.');
    }

    if (amount > config.economy.paymentConfirmationThreshold) {
        economyManager.createPendingPayment(player.id, targetPlayer.id, amount);
        player.sendMessage(`§ePayment of $${amount.toFixed(2)} to ${targetPlayer.name} is pending.`);
        player.sendMessage(`§eType §a!payconfirm§e within ${config.economy.paymentConfirmationTimeout} seconds to complete the transaction.`);
    } else {
        const result = economyManager.transfer(player.id, targetPlayer.id, amount);
        if (result.success) {
            player.sendMessage(`§aYou have paid §e$${amount.toFixed(2)}§a to ${targetPlayer.name}.`);
            targetPlayer.sendMessage(`§aYou have received §e$${amount.toFixed(2)}§a from ${player.name}.`);
        } else {
            player.sendMessage(`§cPayment failed: ${result.message}`);
        }
    }
};
