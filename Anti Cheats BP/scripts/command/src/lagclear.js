import { system, world } from '@minecraft/server';
import { newCommand } from '../handle.js';
import { i18n } from '../../assets/i18n.js';
import { logDebug } from '../../assets/logger.js'; // Changed path from util.js to logger.js

newCommand({
    name:"lagclear",
    description:"Clears lag by killing entities",
    /**
     * Executes the lagclear command.
     * Clears ground items and other specified entities to reduce lag after a countdown.
     * Notifies all players during the countdown and upon completion.
     * This is an asynchronous function due to the use of `system.waitTicks`.
     *
     * @async
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command. Contains properties like `dimension` and `name`.
     * @returns {Promise<void>} A promise that resolves when the command execution is complete.
     *                          Sends messages to all players and logs the action.
     */
    run: async (data) => {
        try {
            const { dimension, name: playerName } = data.player;

            world.sendMessage(i18n.getText("command.lagclear.countdownInitial"));

            await system.waitTicks(20 * 5); // Generally safe

            for (let seconds = 5; seconds >= 1; seconds--) {
                world.sendMessage(i18n.getText("command.lagclear.countdownSeconds", { seconds: seconds }));
                await system.waitTicks(20); // Generally safe
            }

            const entityTypesToClear = [
                { type: "xp_orb" },
                { families: ["monster"] },
                { type: "arrow" },
                { type: "area_effect_cloud" },
                { type: "item" }
            ];

            let totalKilled = 0;

            for (const queryOptions of entityTypesToClear) {
                const entities = dimension.getEntities(queryOptions);
                for (const entity of entities) {
                    try {
                        entity.remove();
                        totalKilled++;
                    } catch (entityRemoveError) {
                        logDebug(`[Anti Cheats ERROR] Failed to remove entity ${entity.typeId || 'unknown type'} during lagclear:`, entityRemoveError, entityRemoveError.stack);
                    }
                }
            }
            
            logDebug(`[Anti Cheats] Lagclear command executed by ${playerName}, removed ${totalKilled} entities.`);
            world.sendMessage(i18n.getText("command.lagclear.success", { totalKilled: totalKilled }));
        } catch (e) {
            logDebug("[Anti Cheats ERROR] Error in lagclear command:", e, e.stack);
            if (data && data.player) {
                try {
                    data.player.sendMessage(i18n.getText("command.lagclear.error", {}, data.player));
                } catch (sendError) {
                    logDebug("[Anti Cheats ERROR] Failed to send error message to command executor in lagclear:", sendError, sendError.stack);
                }
            }
        }
    }
})