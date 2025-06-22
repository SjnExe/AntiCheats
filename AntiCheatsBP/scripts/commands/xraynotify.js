/**
 * @file AntiCheatsBP/scripts/commands/xraynotify.js
 * Defines the !xraynotify command for administrators to manage their X-Ray mining notifications.
 * @version 1.0.3
 */
// permissionLevels and getString are now accessed via dependencies

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "xraynotify",
    syntax: "!xraynotify <on|off|status>",
    description: "Manages your X-Ray mining notification preferences.", // Static fallback
    permissionLevel: 1, // Static fallback (Admin)
    enabled: true,
};

/**
 * Executes the xraynotify command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, permissionLevels } = dependencies;
    const subCommand = args[0] ? args[0].toLowerCase() : "status";
    const notifyOnTag = "xray_notify_on";
    const notifyOffTag = "xray_notify_off";
    const prefix = config.prefix;

    // Static definitions are used

    switch (subCommand) {
        case "on":
            try { player.removeTag(notifyOffTag); } catch (e) {}
            player.addTag(notifyOnTag);
            // Placeholder "command.xraynotify.status.enabled" -> "§aX-Ray mining notifications are now ENABLED for you."
            player.sendMessage("§aX-Ray mining notifications are now ENABLED for you.");
            playerUtils.debugLog(`[XrayNotifyCommand] Admin ${player.nameTag} enabled X-Ray notifications.`, player.nameTag, dependencies);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'xraynotify_on', details: 'X-Ray notifications ON' }, dependencies);
            break;
        case "off":
            try { player.removeTag(notifyOnTag); } catch (e) {}
            player.addTag(notifyOffTag);
            // Placeholder "command.xraynotify.status.disabled" -> "§cX-Ray mining notifications are now DISABLED for you."
            player.sendMessage("§cX-Ray mining notifications are now DISABLED for you.");
            playerUtils.debugLog(`[XrayNotifyCommand] Admin ${player.nameTag} disabled X-Ray notifications.`, player.nameTag, dependencies);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'xraynotify_off', details: 'X-Ray notifications OFF' }, dependencies);
            break;
        case "status":
            const isOn = player.hasTag(notifyOnTag);
            const isOff = player.hasTag(notifyOffTag);
            let statusMessage;

            if (isOn) {
                // Placeholder "command.xraynotify.currentStatus.onExplicit"
                statusMessage = "§eYour X-Ray notifications are currently: ON (explicitly set)";
            } else if (isOff) {
                // Placeholder "command.xraynotify.currentStatus.offExplicit"
                statusMessage = "§eYour X-Ray notifications are currently: OFF (explicitly set)";
            } else {
                // Placeholders "command.xraynotify.currentStatus.onDefault" and "command.xraynotify.currentStatus.offDefault"
                statusMessage = config.xrayDetectionAdminNotifyByDefault ?
                                   "§eYour X-Ray notifications are currently: ON (server default)" :
                                   "§eYour X-Ray notifications are currently: OFF (server default)";
            }
            player.sendMessage(statusMessage);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'xraynotify_status', details: `Checked X-Ray notifications status` }, dependencies);
            break;
        default:
            // Placeholder "command.xraynotify.usage" -> "§cUsage: {prefix}xraynotify <on|off|status>"
            player.sendMessage(`§cUsage: ${prefix}xraynotify <on|off|status>`);
    }
}
