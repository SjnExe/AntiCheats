/**
 * Defines the !freeze command for administrators to immobilize or release players.
 */
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "freeze",
    syntax: "!freeze <playername> [on|off]",
    description: "Freezes or unfreezes a player, preventing movement.",
    permissionLevel: 1,
    enabled: true,
};
/**
 * Executes the freeze command.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, findPlayer, permissionLevels } = dependencies;
    const frozenTag = "frozen";
    const effectDuration = 2000000;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}freeze <playername> [on|off|toggle|status]`);
        return;
    }
    const targetPlayerName = args[0];
    const subCommand = args[1] ? args[1].toLowerCase() : null;

    const foundPlayer = findPlayer(targetPlayerName);

    if (!foundPlayer) {
        player.sendMessage(`Player "${targetPlayerName}" not found.`);
        return;
    }

    if (foundPlayer.id === player.id) {
        player.sendMessage("§cYou cannot freeze yourself.");
        return;
    }

    let currentFreezeState = foundPlayer.hasTag(frozenTag);
    let targetFreezeState;

    if (subCommand === "on") {
        targetFreezeState = true;
    } else if (subCommand === "off") {
        targetFreezeState = false;
    } else if (subCommand === "toggle") {
        targetFreezeState = !currentFreezeState;
    } else if (subCommand === "status") {
        const statusMessage = currentFreezeState ? `${foundPlayer.nameTag} is currently FROZEN.` : `${foundPlayer.nameTag} is currently NOT FROZEN.`;
        player.sendMessage(statusMessage);
        return;
    } else if (subCommand === null) {
        targetFreezeState = !currentFreezeState;
    }
    else {
        player.sendMessage("§cInvalid argument. Use 'on', 'off', 'toggle', or 'status'.");
        return;
    }

    if (targetFreezeState === true && !currentFreezeState) {
        try {
            foundPlayer.addTag(frozenTag);
            foundPlayer.addEffect("slowness", effectDuration, { amplifier: 255, showParticles: false });
            foundPlayer.sendMessage("§cYou have been frozen.");
            player.sendMessage(`§a${foundPlayer.nameTag} has been frozen.`);
            playerUtils.notifyAdmins(`§7[Admin] §e${foundPlayer.nameTag} §7was frozen by §e${player.nameTag}.`, dependencies, player, null);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'freeze', targetName: foundPlayer.nameTag, details: 'Player frozen' }, dependencies);
        } catch (e) {
            player.sendMessage(`§cAn error occurred while trying to freeze ${foundPlayer.nameTag}: ${e.message}`);
            playerUtils.debugLog(`[FreezeCommand] Error freezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
            console.error(`[FreezeCommand] Error freezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.stack || e}`);
        }
    } else if (targetFreezeState === false && currentFreezeState) {
        try {
            foundPlayer.removeTag(frozenTag);
            foundPlayer.removeEffect("slowness");
            foundPlayer.sendMessage("§aYou have been unfrozen.");
            player.sendMessage(`§a${foundPlayer.nameTag} has been unfrozen.`);
            playerUtils.notifyAdmins(`§7[Admin] §e${foundPlayer.nameTag} §7was unfrozen by §e${player.nameTag}.`, dependencies, player, null);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'unfreeze', targetName: foundPlayer.nameTag, details: 'Player unfrozen' }, dependencies);
        } catch (e) {
            player.sendMessage(`§cAn error occurred while trying to unfreeze ${foundPlayer.nameTag}: ${e.message}`);
            playerUtils.debugLog(`[FreezeCommand] Error unfreezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
            console.error(`[FreezeCommand] Error unfreezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.stack || e}`);
        }
    } else {
        player.sendMessage(targetFreezeState ? `§e${foundPlayer.nameTag} is already frozen.` : `§e${foundPlayer.nameTag} is already unfrozen.`);
    }
}
