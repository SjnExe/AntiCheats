import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { panelDefinitions } from './panelLayoutConfig.js';
import { getPlayer, savePlayerData } from './playerDataManager.js';
import { world } from '@minecraft/server';
import { getConfig } from './configManager.js';
import { debugLog } from './logger.js';
import { getPlayerRank } from './rankManager.js';
import { uiWait } from './utils.js';
import * as economyManager from './economyManager.js';

const uiActionFunctions = {};

// Main entry point for showing a panel.
export async function showPanel(player, panelId, context = {}) {
    try {
        debugLog(`[UIManager] Showing panel '${panelId}' to ${player.name}`);
        const form = await buildPanelForm(player, panelId, context);
        if (!form) return;

        const response = await uiWait(player, form);
        if (!response || response.canceled) return;

        await handleFormResponse(player, panelId, response, context);
    } catch (e) {
        console.error(`[UIManager] showPanel failed for panel '${panelId}': ${e.stack}`);
    }
}

// Builds and returns a form object based on a panel definition.
async function buildPanelForm(player, panelId, context) {
    const panelDef = panelDefinitions[panelId];
    if (!panelDef) return null;
    const pData = getPlayer(player.id);
    if (!pData) return null;
    let title = panelDef.title.replace('{playerName}', context.targetPlayer?.name ?? '');

    if (panelId === 'mainPanel') {
        const config = getConfig();
        title = config.serverName || panelDef.title;
    }

    if (panelId === 'playerListPanel' || panelId === 'publicPlayerListPanel') {
        return buildPlayerListForm(title, player, panelId);
    }
    if (panelId === 'bountyListPanel') {
        return buildBountyListForm(title);
    }

    const form = new ActionFormData().title(title);
    addPanelBody(form, panelId, context);
    const menuItems = getMenuItems(panelDef, pData.permissionLevel);
    for (const item of menuItems) {
        form.button(item.text, item.icon);
    }
    return form;
}

// Processes the response from a submitted form.
async function handleFormResponse(player, panelId, response, context) {
    const pData = getPlayer(player.id);
    if (!pData) return;

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

    if (panelId === 'bountyListPanel') {
        if (response.selection === 0) return showPanel(player, 'mainPanel');
        const playersWithBounty = world.getAllPlayers().map(p => ({ player: p, data: getPlayer(p.id) })).filter(pInfo => pInfo.data && pInfo.data.bounty > 0).sort((a, b) => b.data.bounty - a.data.bounty);
        const selectedBountyPlayer = playersWithBounty[response.selection - 1]?.player;
        if (selectedBountyPlayer) {
            return showPanel(player, 'bountyActionsPanel', { ...context, targetPlayer: selectedBountyPlayer });
        }
        return;
    }

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
        if (actionFunction) return actionFunction(player, context);
    }
}

// --- Helper & Builder Functions ---
function getMenuItems(panelDef, permissionLevel) {
    const items = (panelDef.items || []).filter(item => permissionLevel <= item.permissionLevel).sort((a, b) => (a.sortId || 0) - (b.sortId || 0));
    if (panelDef.parentPanelId) {
        items.unshift({ id: '__back__', text: '§l§8< Back', icon: 'textures/gui/controls/left.png', permissionLevel: 1024, actionType: 'openPanel', actionValue: panelDef.parentPanelId });
    }
    return items;
}

function addPanelBody(form, panelId, context) {
    if (panelId === 'playerManagementPanel' && context.targetPlayer) {
        const { targetPlayer } = context;
        const targetPData = getPlayer(targetPlayer.id);
        const rank = getPlayerRank(targetPlayer, getConfig());
        form.body([`§fName: §e${targetPlayer.name}`, `§fRank: §r${rank.chatFormatting?.nameColor ?? '§7'}${rank.name}`, `§fBalance: §a$${targetPData?.balance?.toFixed(2) ?? '0.00'}`, `§fBounty: §e$${targetPData?.bounty?.toFixed(2) ?? '0.00'}`].join('[AddonExe][AddonExe]'));
    } else if (panelId === 'publicPlayerActionsPanel' && context.targetPlayer) {
        const targetPData = getPlayer(context.targetPlayer.id);
        const bounty = targetPData?.bounty?.toFixed(2) ?? '0.00';
        form.body(`§eBounty on this player: $${bounty}`);
    }
}

function buildPlayerListForm(title, player, panelId) {
    const form = new ActionFormData().title(title);
    const onlinePlayers = world.getAllPlayers().sort((a, b) => a.name.localeCompare(b.name));
    form.button('§l§8< Back', 'textures/gui/controls/left.png');
    for (const p of onlinePlayers) {
        const rank = getPlayerRank(p, getConfig());
        let displayName = `${rank.chatFormatting?.prefixText ?? ''}${p.name}§r`;
        let icon;
        if (panelId === 'playerListPanel' && rank.name === 'Owner') icon = 'textures/ui/crown_glyph_color';
        if (p.id === player.id) displayName += ' §7(You)§r';
        form.button(displayName, icon);
    }
    return form;
}

function buildBountyListForm(title) {
    const form = new ActionFormData().title(title);
    const playersWithBounty = world.getAllPlayers().map(p => ({ player: p, data: getPlayer(p.id) })).filter(pInfo => pInfo.data && pInfo.data.bounty > 0);
    form.button('§l§8< Back', 'textures/gui/controls/left.png');
    if (playersWithBounty.length === 0) {
        form.body('§cThere are no active bounties.');
    } else {
        playersWithBounty.sort((a, b) => b.data.bounty - a.data.bounty);
        for (const { player, data } of playersWithBounty) {
            form.button(`${player.name}[AddonExe]§c$${data.bounty.toFixed(2)}`);
        }
    }
    return form;
}

// --- UI Action Functions ---
uiActionFunctions['showBountyForm'] = async (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) return player.sendMessage('§cTarget player not found.');
    const form = new ModalFormData().title(`Set Bounty on ${targetPlayer.name}`).textField('Amount', 'Enter bounty amount');
    const response = await uiWait(player, form);
    if (!response || response.canceled) return;
    const [amountStr] = response.formValues;
    const amount = parseInt(amountStr);
    const config = getConfig();
    if (isNaN(amount) || amount < config.economy.minimumBounty) return player.sendMessage(`§cMinimum bounty is $${config.economy.minimumBounty}.`);
    if (economyManager.getBalance(player.id) < amount) return player.sendMessage('§cYou do not have enough money.');
    const result = economyManager.removeBalance(player.id, amount);
    if (result) {
        const targetData = getPlayer(targetPlayer.id);
        targetData.bounty = (targetData.bounty || 0) + amount;
        const sourceData = getPlayer(player.id);
        if (!sourceData.bounties) sourceData.bounties = {};
        sourceData.bounties[targetPlayer.id] = (sourceData.bounties[targetPlayer.id] || 0) + amount;
        savePlayerData(player.id);
        savePlayerData(targetPlayer.id);
        player.sendMessage(`§aYou placed a bounty of §e$${amount.toFixed(2)}§a on ${targetPlayer.name}.`);
        world.sendMessage(`§cSomeone has placed a bounty of §e$${amount.toFixed(2)}§c on ${targetPlayer.name}!`);
    } else {
        player.sendMessage('§cFailed to place bounty.');
    }
};

uiActionFunctions['showReduceBountyForm'] = async (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) return player.sendMessage('§cTarget player not found.');
    const targetData = getPlayer(targetPlayer.id);
    if (!targetData || targetData.bounty === 0) return player.sendMessage('§cThis player has no bounty.');
    const form = new ModalFormData().title(`Reduce Bounty on ${targetPlayer.name}`).textField('Amount', `Max: $${targetData.bounty.toFixed(2)}`);
    const response = await uiWait(player, form);
    if (!response || response.canceled) return;
    const [amountStr] = response.formValues;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) return player.sendMessage('§cInvalid amount.');
    if (amount > targetData.bounty) return player.sendMessage('§cCannot reduce more than the total bounty.');
    if (economyManager.getBalance(player.id) < amount) return player.sendMessage('§cYou do not have enough money.');
    const result = economyManager.removeBalance(player.id, amount);
    if (result) {
        targetData.bounty -= amount;
        savePlayerData(player.id);
        savePlayerData(targetPlayer.id);
        player.sendMessage(`§aYou reduced the bounty on ${targetPlayer.name} by §e$${amount.toFixed(2)}.`);
    } else {
        player.sendMessage('§cFailed to reduce bounty.');
    }
};
