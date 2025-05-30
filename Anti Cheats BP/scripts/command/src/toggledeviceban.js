import { PlatformType, world } from '@minecraft/server';
import { newCommand } from '../handle.js';
import { i18n } from '../../assets/i18n.js';
import { logDebug } from '../../assets/logger.js'; // Changed path from util.js to logger.js

newCommand({
    name:"toggledeviceban",
    description:"<device name | Desktop | Console | Mobile | View> Toggles a device ban",
    /**
     * Executes the toggledeviceban command.
     * Allows an admin to ban or unban specific device types (Desktop, Console, Mobile) from joining the server,
     * or to view the list of currently banned device types.
     * Device bans are stored in `world.safeguardDeviceBan` and persisted via the "safeguard:deviceBan" dynamic property.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command.
     * @param {string[]} data.args - The command arguments. Expects `args[1...]` to be the device type to toggle (e.g., "desktop", "console", "mobile") or "view" to list banned devices.
     * @returns {void} Sends confirmation or informational messages to the command executor.
     */
    run: (data) => {
        try {
            const {player,args} = data;
            
            const setDeviceBan = args.slice(1).join(" ").trim().toLowerCase();
            
            const devices = {
                "pc": PlatformType.Desktop,
                "desktop": PlatformType.Desktop,
                "computer": PlatformType.Desktop,
                "console": PlatformType.Console,
                "phone": PlatformType.Mobile,
                "mobile": PlatformType.Mobile,
                "view": "view"
            }
            if (!Object.keys(devices).includes(setDeviceBan)) {
                player.sendMessage(i18n.getText("command.toggledeviceban.supportedDevices", {}, player));
                return;
            }

            const deviceTarget = devices[setDeviceBan];
            let bannedDevices = world.safeguardDeviceBan; // This is already an array due to initialization changes

            if(deviceTarget === "view"){
                // PlatformType values are numbers, map them to human-readable names for display
                const platformTypeNames = {
                    [PlatformType.Desktop]: "Desktop",
                    [PlatformType.Console]: "Console",
                    [PlatformType.Mobile]: "Mobile",
                    [PlatformType.Unknown]: "Unknown" 
                };
                const displayNames = bannedDevices.map(id => platformTypeNames[id] || id.toString());
                player.sendMessage(i18n.getText("command.toggledeviceban.currentlyBanned", { deviceList: displayNames.join(', ') }, player));
                return;
            }

            const deviceIndex = bannedDevices.indexOf(deviceTarget);

            if(deviceIndex > -1){ // Device is currently banned, so unban it
                bannedDevices.splice(deviceIndex, 1);
                player.sendMessage(i18n.getText("command.toggledeviceban.removedSuccess", { deviceType: setDeviceBan }, player));
            }
            else{ // Device is not banned, so ban it
                bannedDevices.push(deviceTarget);
                player.sendMessage(i18n.getText("command.toggledeviceban.addedSuccess", { deviceType: setDeviceBan }, player));
                player.sendMessage(i18n.getText("command.toggledeviceban.warningNoWhitelist", {}, player));
            }
            
            world.safeguardDeviceBan = bannedDevices; // Update the global variable
            world.setDynamicProperty("safeguard:deviceBan", JSON.stringify(world.safeguardDeviceBan)); // API Call
        } catch (e) {
            logDebug("[Anti Cheats ERROR][toggledeviceban]", e, e.stack); // SafeGuard -> Anti Cheats
            if (data && data.player) {
                try {
                    data.player.sendMessage(i18n.getText("command.toggledeviceban.error", {}, data.player));
                } catch (sendError) {
                    logDebug("[Anti Cheats ERROR][toggledeviceban] Failed to send error message to command executor:", sendError, sendError.stack); // SafeGuard -> Anti Cheats
                }
            }
        }
    }
})