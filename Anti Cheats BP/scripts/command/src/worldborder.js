import { sendMessageToAllAdmins } from '../../assets/util.js';
import { logDebug } from '../../assets/logger.js'; // Moved logDebug to logger.js
import config from '../../config.js';
import { newCommand } from '../handle.js';
import { i18n } from '../../assets/i18n.js'; // Added i18n
import * as Minecraft from "@minecraft/server";

const world = Minecraft.world;

newCommand({
    name:"worldborder",
	description: "<border | remove> Get or set the worldborder",
    /**
     * Executes the worldborder command.
     * Allows viewing the current world border, setting a new border radius, or removing the existing border.
     * The border radius must be a number greater than a configured minimum distance.
     * Changes are applied to both a dynamic property ("ac:worldBorder") and the actual world border.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command.
     * @param {string[]} data.args - The command arguments.
     *                               - If no `args[1]`, displays the current border.
     *                               - `args[1]` can be "remove" to clear the border.
     *                               - `args[1]` can be a number to set the border radius.
     * @returns {void} Sends messages to the command executor and notifies admins of changes.
     */
    run: (data) => {
        const {args,player} = data;
        try {
            const oldBorder = world.getDynamicProperty("ac:worldBorder");
            const border = args[1];

            //no args given, display current world border
            if (!border) {
                const borderStatus = oldBorder ?? i18n.getText("command.worldborder.notSet", {}, player);
                player.sendMessage(i18n.getText("command.worldborder.currentStatus", { borderStatus: borderStatus }, player));
                return;
            }
            
            //user wants to remove the border
            if(border === "remove"){
                if(!oldBorder) {
                    player.sendMessage(i18n.getText("command.worldborder.isNotSet", {}, player));
                    return;
                }
                world.setDynamicProperty("ac:worldBorder",0);
                world.worldBorder = null;

                sendMessageToAllAdmins("notify.worldborder.removed", { playerName: player.name }, true);
                player.sendMessage(i18n.getText("command.worldborder.removed", {}, player));
                return;
            }
            else if (isNaN(border) || border === "" || Number(border) < config.world.worldborder.minBorderDistance) {
                //arg is invalid
                player.sendMessage(i18n.getText("command.worldborder.error.invalidNumber", { minDistance: config.world.worldborder.minBorderDistance }, player));
                return;
            }
            //update world border if everything is valid
            world.setDynamicProperty("ac:worldBorder", Number(border));
            world.worldBorder = Number(border);
            player.sendMessage(i18n.getText("command.worldborder.setSuccess", { border: border }, player));
            sendMessageToAllAdmins("notify.worldborder.set", { playerName: player.name, border: border }, true);
            
        } catch (error) {
            logDebug("[Anti Cheats Command Error][worldborder]", error, error.stack);
            if (player) {
                player.sendMessage(i18n.getText("command.worldborder.error.general", {}, player));
            }
        }
    }
})
