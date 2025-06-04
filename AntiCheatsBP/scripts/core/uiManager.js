import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
// Assuming playerUtils contains debugLog, notifyAdmins
import * as playerUtils from '../utils/playerUtils.js';
// playerDataManager will be passed as a parameter to functions that need it.

async function showInspectPlayerForm(player, playerDataManager) {
    playerUtils.debugLog(`UI: Inspect Player form requested by ${player.nameTag}`, player.nameTag);
    const modalForm = new ModalFormData();
    modalForm.title("Inspect Player Data");
    modalForm.textField("Enter Player Name:", "TargetPlayerName");

    try {
        const response = await modalForm.show(player);

        if (response.canceled) {
            playerUtils.debugLog(`Inspect Player form canceled by ${player.nameTag}. Reason: ${response.cancelationReason}`, player.nameTag);
            return;
        }

        const targetPlayerName = response.formValues[0];

        if (!targetPlayerName || targetPlayerName.trim() === "") {
            // Using player.sendMessage for immediate feedback on simple input errors.
            player.sendMessage("§cPlayer name cannot be empty.");
            playerUtils.debugLog(`Inspect Player form submitted with empty name by ${player.nameTag}`, player.nameTag);
            return;
        }

        let inspectFoundPlayer = null;
        for (const p of mc.world.getAllPlayers()) {
            if (p.nameTag.toLowerCase() === targetPlayerName.trim().toLowerCase()) {
                inspectFoundPlayer = p;
                break;
            }
        }

        if (inspectFoundPlayer) {
            const targetPData = playerDataManager.getPlayerData(inspectFoundPlayer.id);
            if (targetPData) {
                let summary = `§a--- AntiCheat Data for ${inspectFoundPlayer.nameTag} ---\n`;
                summary += `§eWatched: §f${targetPData.isWatched}\n`;
                summary += `§eTotal Flags: §f${targetPData.flags.totalFlags}\n`;
                summary += `§eLast Flag Type: §f${targetPData.lastFlagType || "None"}\n`;
                summary += `§eIndividual Flags:\n`;
                let hasFlags = false;
                for (const flagKey in targetPData.flags) {
                    if (flagKey !== "totalFlags" && typeof targetPData.flags[flagKey] === 'object' && targetPData.flags[flagKey] !== null) {
                        const flagData = targetPData.flags[flagKey];
                        summary += `  §f- ${flagKey}: Count=${flagData.count}, LastSeen=${flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : 'N/A'}\n`;
                        hasFlags = true;
                    }
                }
                if (!hasFlags) summary += `  §fNo specific flags recorded.\n`;
                player.sendMessage(summary);
            } else {
                player.sendMessage(`§cPlayer data for ${targetPlayerName.trim()} not found (player may need to move/interact).`);
            }
        } else {
            player.sendMessage(`§cPlayer '${targetPlayerName.trim()}' not found.`);
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showInspectPlayerForm: ${error}`, player.nameTag);
        console.error(error, error.stack);
        player.sendMessage("§cError opening or processing Inspect Player form.");
    }
}

async function showResetFlagsForm(player, playerDataManager) {
    playerUtils.debugLog(`UI: Reset Player Flags form requested by ${player.nameTag}`, player.nameTag);
    const modalForm = new ModalFormData();
    modalForm.title("Reset Player Flags");
    modalForm.textField("Enter Player Name:", "TargetPlayerName");
    modalForm.toggle("CONFIRM: Reset all flags and violation data?", false);

    try {
        const response = await modalForm.show(player);
        if (response.canceled) {
            playerUtils.debugLog(`Reset Player Flags form canceled by ${player.nameTag}.`, player.nameTag);
            return;
        }

        const targetPlayerName = response.formValues[0];
        const confirmed = response.formValues[1];

        if (!targetPlayerName || targetPlayerName.trim() === "") {
            new MessageFormData().title("Input Error").body("Player name cannot be empty.").button1("OK").show(player);
            return;
        }
        if (!confirmed) {
            player.sendMessage("§7Flag reset operation cancelled by user.");
            return;
        }

        let resetFoundPlayer = null;
        for (const p of mc.world.getAllPlayers()) {
            if (p.nameTag.toLowerCase() === targetPlayerName.trim().toLowerCase()) {
                resetFoundPlayer = p;
                break;
            }
        }

        if (resetFoundPlayer) {
            const targetPData = playerDataManager.getPlayerData(resetFoundPlayer.id);
            if (targetPData) {
                targetPData.flags.totalFlags = 0;
                targetPData.lastFlagType = "";
                for (const flagKey in targetPData.flags) {
                    if (typeof targetPData.flags[flagKey] === 'object' && targetPData.flags[flagKey] !== null) {
                        targetPData.flags[flagKey].count = 0;
                        targetPData.flags[flagKey].lastDetectionTime = 0;
                    }
                }
                targetPData.consecutiveOffGroundTicks = 0;
                targetPData.fallDistance = 0;
                targetPData.consecutiveOnGroundSpeedingTicks = 0;
                targetPData.attackEvents = [];
                targetPData.blockBreakEvents = [];

                await playerDataManager.prepareAndSavePlayerData(resetFoundPlayer);

                new MessageFormData().title("Success").body(`Flags and violation data reset for ${resetFoundPlayer.nameTag}.`).button1("OK").show(player);
                playerUtils.notifyAdmins(`Flags reset for ${resetFoundPlayer.nameTag} by ${player.nameTag} via UI.`, resetFoundPlayer, targetPData);
                playerUtils.debugLog(`Flags reset for ${resetFoundPlayer.nameTag} by ${player.nameTag} via UI.`, targetPData.isWatched ? resetFoundPlayer.nameTag : null);
            } else {
                new MessageFormData().title("Error").body(`Player data for '${targetPlayerName.trim()}' not found.`).button1("OK").show(player);
            }
        } else {
            new MessageFormData().title("Error").body(`Player '${targetPlayerName.trim()}' not found.`).button1("OK").show(player);
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showResetFlagsForm: ${error}`, player.nameTag);
        console.error(error, error.stack);
        player.sendMessage("§cError in Reset Player Flags form.");
    }
}

async function showWatchedPlayersList(player, playerDataManager) {
    playerUtils.debugLog(`UI: List Watched Players requested by ${player.nameTag}`, player.nameTag);
    const watchedPlayerNames = [];

    // Assuming playerDataManager exposes a way to iterate all pData or provides the map directly.
    // This part might need adjustment based on actual playerDataManager implementation.
    // If playerDataManager.playerData is the map:
    const allPDataValues = typeof playerDataManager.getAllPlayerDataValues === 'function'
        ? playerDataManager.getAllPlayerDataValues()
        : (playerDataManager.playerData ? playerDataManager.playerData.values() : []);


    for (const pDataEntry of allPDataValues) {
        if (pDataEntry.isWatched === true && pDataEntry.playerNameTag) {
            watchedPlayerNames.push(pDataEntry.playerNameTag);
        }
    }

    let messageBody = watchedPlayerNames.length > 0
        ? "Currently watched players:\n- " + watchedPlayerNames.join("\n- ")
        : "No players are currently being watched.";

    const resultForm = new MessageFormData().title("Watched Players List").body(messageBody).button1("OK");
    try {
        await resultForm.show(player);
    } catch (error) {
        playerUtils.debugLog(`Error in showWatchedPlayersList: ${error}`, player.nameTag);
        console.error(error, error.stack);
        player.sendMessage("§cError showing Watched Players List.");
    }
}

export async function showAdminMainMenu(player, playerDataManager) {
    const menuForm = new ActionFormData()
        .title("AntiCheat Admin Menu")
        .body("Select an action:")
        .button("Inspect Player Data", "textures/ui/spyglass")
        .button("Reset Player Flags", "textures/ui/refresh")
        .button("List Watched Players", "textures/ui/magnifying_glass");

    try {
        const response = await menuForm.show(player);
        if (response.canceled) {
            playerUtils.debugLog(`Admin menu cancelled by ${player.nameTag}. Reason: ${response.cancelationReason}`, player.nameTag);
            return;
        }

        switch (response.selection) {
            case 0: showInspectPlayerForm(player, playerDataManager); break;
            case 1: showResetFlagsForm(player, playerDataManager); break;
            case 2: showWatchedPlayersList(player, playerDataManager); break;
            default: player.sendMessage("§cInvalid selection."); break;
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showAdminMainMenu: ${error}`, player.nameTag);
        console.error(error, error.stack);
        player.sendMessage("§cError opening Admin Menu.");
    }
}
