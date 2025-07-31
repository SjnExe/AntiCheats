/**
 * @typedef {import('../../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../../types.js').Dependencies} Dependencies
 */

/**
 * Checks if a player is attacking while using an item.
 * @param {import('@minecraft/server').Player} player The player to check.
 * @param {PlayerAntiCheatData} pData The player's data.
 * @param {Dependencies} dependencies The command dependencies.
 */
export async function checkKillauraAttackWhileUsingItem(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;

    if (!config.checks.killauraAttackWhileUsingItem.enabled) {
        return;
    }

    if (pData.isUsingItem && pData.lastAttackTime > pData.lastItemUseTime) {
        const violationDetails = {
            itemType: pData.lastUsedItem,
        };
        await actionManager.executeCheckAction(player, "killauraAttackWhileUsingItem", violationDetails, dependencies);
    }
}
