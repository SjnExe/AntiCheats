import * as mc from '@minecraft/server';

/**
 * Checks if player is sprinting under invalid conditions.
 * @param {mc.Player} player The player instance.
 * @param {import('../../core/playerDataManager.js').PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {object} config The configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick.
 */
export async function checkInvalidSprint(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick) {
    if (!config.enableInvalidSprintCheck) return;

    // Update pData.lastBlindnessTicks
    const effects = player.getEffects();
    const blindnessEffect = effects.find(e => e.typeId === "blindness");
    pData.lastBlindnessTicks = blindnessEffect ? blindnessEffect.duration : 0;

    if (player.isSprinting) {
        let invalidCondition = null;

        if (pData.lastBlindnessTicks > 0) {
            invalidCondition = "Blindness";
        } else if (player.isSneaking) {
            // Vanilla Minecraft typically prevents sprinting while sneaking.
            // This check catches if client state somehow allows sending isSprinting=true with isSneaking=true.
            invalidCondition = "Sneaking";
        } else if (player.isRiding) {
            // Player shouldn't be able to sprint while riding most entities.
            invalidCondition = "Riding Entity";
        }
        // Future: Add check for hunger level if player.getComponent('minecraft:hunger') is accessible and sprint requires > X hunger.
        // const hungerComponent = player.getComponent(mc.EntityComponentTypes.Hunger);
        // if (hungerComponent && hungerComponent.currentVal <= 6) { // Example: 6 is the threshold for not being able to sprint
        //     invalidCondition = "Low Hunger";
        // }


        if (invalidCondition) {
            const dependencies = { config, playerDataManager, playerUtils, logManager };
            const violationDetails = {
                condition: invalidCondition,
                isSprinting: player.isSprinting,
                isSneaking: player.isSneaking,
                isRiding: player.isRiding,
                blindnessTicks: pData.lastBlindnessTicks
            };
            await executeCheckAction(player, "movement_invalid_sprint", violationDetails, dependencies);

            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            if (pData.isWatched && playerUtils.debugLog) {
                playerUtils.debugLog(\`InvalidSprint: Flagged \${player.nameTag}. Condition: \${invalidCondition}\`, watchedPrefix);
            }
        }
    }
}
