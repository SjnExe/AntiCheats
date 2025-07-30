import * as mc from '@minecraft/server';
import { kits } from './kits.js';

/**
 * Gives a kit to a player.
 * @param {import('../types.js').Player} player
 * @param {string} kitName
 * @param {import('../types.js').Dependencies} dependencies
 * @returns {{success: boolean, message: string}}
 */
export function giveKit(player, kitName, dependencies) {
    const { playerDataManager, getString } = dependencies;
    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) return { success: false, message: getString('common.error.playerDataNotFound') };

    const kit = kits[kitName.toLowerCase()];
    if (!kit) {
        return { success: false, message: getString('command.kit.notFound', { kitName }) };
    }

    pData.kitCooldowns = pData.kitCooldowns || {};
    const lastUsed = pData.kitCooldowns[kit.name.toLowerCase()] || 0;
    const cooldown = kit.cooldown * 1000;
    const now = Date.now();

    if (now - lastUsed < cooldown) {
        const remaining = cooldown - (now - lastUsed);
        return { success: false, message: getString('command.kit.cooldown', { kitName: kit.name, time: formatCooldown(remaining) }) };
    }

    const inventory = player.getComponent('inventory');
    if (!inventory) {
        return { success: false, message: getString('command.kit.inventoryError') };
    }

    for (const item of kit.items) {
        const itemStack = new mc.ItemStack(item.itemId, item.amount);
        if (item.nameTag) itemStack.nameTag = item.nameTag;
        if (item.lore) itemStack.setLore(item.lore);
        inventory.container.addItem(itemStack);
    }

    pData.kitCooldowns[kit.name.toLowerCase()] = now;
    pData.isDirtyForSave = true;

    return { success: true, message: getString('command.kit.success', { kitName: kit.name }) };
}

/**
 * @param {number} ms
 * @returns {string}
 */
function formatCooldown(ms) {
    let seconds = Math.ceil(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);

    seconds %= 60;
    minutes %= 60;

    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    if (seconds > 0) result += `${seconds}s`;

    return result.trim();
}
