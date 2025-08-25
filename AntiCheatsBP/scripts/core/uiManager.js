import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { panelDefinitions } from './panelLayoutConfig.js';
import { getPlayer } from './playerDataManager.js';
import { world } from '@minecraft/server';
import { getConfig } from './configManager.js';
import { debugLog } from './logger.js';
import { getPlayerRank } from './rankManager.js';
import { forceShow } from './utils.js';
// Unused imports removed: playSound, createReport, getAllReports, assignReport, resolveReport, clearReport, economyManager

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
        if (!form) return; // Error logged in builder

        const response = await forceShow(player, form);
        if (response.canceled) return;

        await handleFormResponse(player, panelId, response, context);
    } catch (e) {
        console.error(`[UIManager] showPanel failed for panel '${panelId}': ${e.stack}`);
    }
}

/**
 * Builds and returns a form object based on a panel definition, but does not show it.
 * @returns {Promise<ActionFormData | ModalFormData | MessageFormData | null>}
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

    // Handle dynamic panels that need special logic to build
    if (panelId === 'playerListPanel' || panelId === 'publicPlayerListPanel') {
        return buildPlayerListForm(title, player, panelId);
    }
    // Add other dynamic panel builders here if needed

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

    // Handle dynamic lists where selection maps to an entity
    if (panelId === 'playerListPanel' || panelId === 'publicPlayerListPanel') {
        if (response.selection === 0) return showPanel(player, 'mainPanel', context); // Back button
        const playerList = world.getAllPlayers().sort((a, b) => a.name.localeCompare(b.name));
        const selectedPlayer = playerList[response.selection - 1];
        if (selectedPlayer) {
            const nextPanel = panelId === 'playerListPanel' ? 'playerManagementPanel' : 'publicPlayerActionsPanel';
            return showPanel(player, nextPanel, { ...context, targetPlayer: selectedPlayer });
        }
        return;
    }

    // Handle standard menu panels
    const panelDef = panelDefinitions[panelId];
    const menuItems = getMenuItems(panelDef, pData.permissionLevel);
    const selectedItem = menuItems[response.selection];

    if (!selectedItem) {
        console.error('[UIManager] Selected item not found.');
        return;
    }

    if (selectedItem.id === '__back__') {
        return showPanel(player, selectedItem.actionValue, context);
    }

    if (selectedItem.actionType === 'openPanel') {
        return showPanel(player, selectedItem.actionValue, context);
    } else if (selectedItem.actionType === 'functionCall') {
        const actionFunction = uiActionFunctions[selectedItem.actionValue];
        if (actionFunction) {
            return actionFunction(player, context);
        } else {
            player.sendMessage(`§cFunctionality for '${selectedItem.text}' is not implemented yet.`);
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
    const response = await forceShow(player, form);

    if (response.canceled) return;
    const [reason] = response.formValues;

    const freshTarget = world.getPlayer(targetPlayer.id);
    if (freshTarget) {
        freshTarget.kick(reason);
        player.sendMessage(`§aKicked ${freshTarget.name}.`);
    } else {
        player.sendMessage('§cTarget player is no longer online.');
    }
};

uiActionFunctions['clearInventory'] = (player, context) => {
    const targetPlayerId = context.targetPlayer?.id;
    if (!targetPlayerId) return player.sendMessage('§cTarget not found.');

    const freshTarget = world.getPlayer(targetPlayerId);
    if (!freshTarget) return player.sendMessage('§cTarget player is no longer online.');

    const inventory = freshTarget.getComponent('inventory')?.container;
    if (inventory) {
        for (let i = 0; i < inventory.size; i++) {
            inventory.setItem(i);
        }
        player.sendMessage(`§aCleared ${freshTarget.name}'s inventory.`);
        freshTarget.sendMessage('§eYour inventory was cleared by an admin.');
    }
};

uiActionFunctions['showRules'] = async (player) => {
    const config = getConfig();
    const rules = config.serverInfo.rules.join('\n\n');
    const form = new MessageFormData().title('§lServer Rules§r').body(rules).button1('Close');
    await forceShow(player, form);
};

uiActionFunctions['teleportTo'] = (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) return player.sendMessage('§cTarget player not found.');
    if (player.id === targetPlayer.id) return player.sendMessage('§cYou cannot teleport to yourself.');

    const freshTarget = world.getPlayer(targetPlayer.id);
    if (freshTarget) {
        player.teleport(freshTarget.location, { dimension: freshTarget.dimension });
        player.sendMessage(`§aTeleported to ${freshTarget.name}.`);
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

    const response = await forceShow(player, form);
    if (response.canceled) return;

    const [duration, reason] = response.formValues;
    player.runCommandAsync(`ban "${targetPlayer.name}" ${duration} ${reason}`);
};
