import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
// Assuming playerUtils contains debugLog, notifyAdmins
import * as playerUtils from '../utils/playerUtils.js';
import { getPlayerPermissionLevel } from '../utils/playerUtils.js'; // Added
import { permissionLevels } from './rankManager.js'; // Added
// playerDataManager will be passed as a parameter to functions that need it.
// Import mute functions from playerDataManager for Mute/Unmute UI
import { getMuteInfo, addMute, removeMute } from '../core/playerDataManager.js';
import * as logManager from './logManager.js';
import { editableConfigValues, updateConfigValue } from '../config.js'; // Added for editable config


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

async function showMyStats(player, playerDataManager) {
    playerUtils.debugLog(`UI: showMyStats for ${player.nameTag}`, player.nameTag);
    const form = new MessageFormData();
    form.title("My AntiCheat Stats");

    const pData = playerDataManager.getPlayerData(player.id);
    let bodyContent = "";

    if (pData && pData.flags) {
        bodyContent += `§eYour Total Flags:§r ${pData.flags.totalFlags}\n`;
        bodyContent += `§eLast Flag Type:§r ${pData.lastFlagType || 'None'}\n\n`;
        bodyContent += "§eBreakdown:§r\n";
        let specificFlagsShown = 0;
        for (const flagKey in pData.flags) {
            if (flagKey !== "totalFlags" && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                const flagData = pData.flags[flagKey];
                bodyContent += `  §f- ${flagKey}: Count=${flagData.count}, Last Seen=${flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : 'N/A'}\n`;
                specificFlagsShown++;
            }
        }
        if (specificFlagsShown === 0) {
            bodyContent += "  No specific flags recorded.\n";
        }
    } else {
        bodyContent = "§cCould not retrieve your AntiCheat stats at this time.";
    }

    form.body(bodyContent);
    form.button1("Close");

    try {
        await form.show(player);
    } catch (error) {
        playerUtils.debugLog(`Error in showMyStats for ${player.nameTag}: ${error}`, player.nameTag);
        console.error(`[uiManager.showMyStats] Error:`, error, error.stack);
    }
    await showAdminPanelMain(player, playerDataManager, null);
}

async function showServerRules(player, config, playerDataManager) {
    playerUtils.debugLog(`UI: showServerRules for ${player.nameTag}`, player.nameTag);
    const form = new MessageFormData();
    form.title("Server Rules");

    let bodyContent = "";
    if (config && config.SERVER_RULES && config.SERVER_RULES.length > 0) {
        bodyContent = config.SERVER_RULES.join("\n");
    } else {
        bodyContent = "§cServer rules have not been configured by the server admin yet.";
    }

    form.body(bodyContent);
    form.button1("Close");

    try {
        await form.show(player);
    } catch (error) {
        playerUtils.debugLog(`Error in showServerRules for ${player.nameTag}: ${error}`, player.nameTag);
        console.error(`[uiManager.showServerRules] Error: ${error}`, error.stack);
    }
    await showAdminPanelMain(player, playerDataManager, config);
}

async function showHelpAndLinks(player, config, playerDataManager) {
    playerUtils.debugLog(`UI: showHelpAndLinks for ${player.nameTag}`, player.nameTag);
    const form = new MessageFormData();
    form.title("Help & Useful Links");

    let bodyContent = "";
    if (config && config.generalHelpMessages && config.generalHelpMessages.length > 0) {
        bodyContent += "§lGeneral Help:§r\n";
        config.generalHelpMessages.forEach(msg => { bodyContent += `- ${msg}\n`; });
        bodyContent += "\n";
    }
    if (config && config.helpLinks && config.helpLinks.length > 0) {
        bodyContent += "§lUseful Links:§r\n";
        config.helpLinks.forEach(link => { bodyContent += `- ${link.title}: ${link.url}\n`; });
    }
    if (bodyContent === "") {
        bodyContent = "§cNo help information or links have been configured by the server admin yet.";
    }
    form.body(bodyContent.trim());
    form.button1("Close");
    try {
        await form.show(player);
    } catch (error) {
        playerUtils.debugLog(`Error in showHelpAndLinks for ${player.nameTag}: ${error}`, player.nameTag);
        console.error(`[uiManager.showHelpAndLinks] Error: ${error}`, error.stack);
    }
    await showAdminPanelMain(player, playerDataManager, config);
}

async function showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager) {
    playerUtils.debugLog(`UI: showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData();
    form.title(`Actions for ${targetPlayer.nameTag}`);
    const frozenTag = "frozen";
    const isTargetFrozen = targetPlayer.hasTag(frozenTag);
    const freezeButtonText = isTargetFrozen ? "Unfreeze Player" : "Freeze Player";
    const freezeButtonIcon = isTargetFrozen ? "textures/ui/icon_unlocked" : "textures/ui/icon_locked";
    const muteInfo = playerDataManager.getMuteInfo(targetPlayer);
    const isTargetMuted = muteInfo !== null;
    let muteButtonText = isTargetMuted ? "Unmute Player" : "Mute Player";
    if (isTargetMuted && muteInfo.unmuteTime !== Infinity) {
        muteButtonText += ` (exp. ${new Date(muteInfo.unmuteTime).toLocaleTimeString()})`;
    } else if (isTargetMuted) {
        muteButtonText += " (Permanent)";
    }
    const muteButtonIcon = isTargetMuted ? "textures/ui/speaker_off_light" : "textures/ui/speaker_on_light";

    form.button("View Detailed Info/Flags", "textures/ui/magnifying_glass");
    form.button("Kick Player", "textures/ui/icon_hammer");
    form.button(freezeButtonText, freezeButtonIcon);
    form.button(muteButtonText, muteButtonIcon);
    form.button("Reset Player Flags", "textures/ui/refresh");
    form.button("Back to Player List", "textures/ui/undo");

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            if (response.cancelationReason) {
                playerUtils.debugLog(`Player Actions form for ${targetPlayer.nameTag} canceled by ${adminPlayer.nameTag}. Reason: ${response.cancelationReason}`, adminPlayer.nameTag);
            } else {
                playerUtils.debugLog(`Player Actions form for ${targetPlayer.nameTag} canceled by ${adminPlayer.nameTag}.`, adminPlayer.nameTag);
            }
            return;
        }

        switch (response.selection) {
            case 0: // View Detailed Info/Flags
                const targetPData = playerDataManager.getPlayerData(targetPlayer.id);
                if (targetPData) {
                    let summary = `§a--- AntiCheat Data for ${targetPlayer.nameTag} ---\n`;
                    summary += `§eID: §f${targetPlayer.id}\n`;
                    summary += `§eDimension: §f${targetPlayer.dimension.id}\n`;
                    summary += `§eLocation: §fX:${targetPlayer.location.x.toFixed(1)}, Y:${targetPlayer.location.y.toFixed(1)}, Z:${targetPlayer.location.z.toFixed(1)}\n`;
                    summary += `§eWatched: §f${targetPData.isWatched}\n`;
                    summary += `§eTotal Flags: §f${targetPData.flags.totalFlags}\n`;
                    summary += `§eLast Flag Type: §f${targetPData.lastFlagType || "None"}\n`;
                    summary += `§eIndividual Flags:\n`;
                    let hasFlags = false;
                    for (const flagKey in targetPData.flags) {
                        if (flagKey !== "totalFlags" && typeof targetPData.flags[flagKey] === 'object' && targetPData.flags[flagKey] !== null) {
                            const flagData = targetPData.flags[flagKey];
                            if (flagData.count > 0) {
                                summary += `  §f- ${flagKey}: Count=${flagData.count}, LastSeen=${flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : 'N/A'}\n`;
                                hasFlags = true;
                            }
                        }
                    }
                    if (!hasFlags) {
                        summary += `  §fNo specific flags recorded or triggered.\n`;
                    }
                    const detailForm = new MessageFormData()
                        .title(`Details for ${targetPlayer.nameTag}`)
                        .body(summary)
                        .button1("OK");
                    await detailForm.show(adminPlayer);
                } else {
                    adminPlayer.sendMessage("§cCould not retrieve data for " + targetPlayer.nameTag);
                    playerUtils.debugLog(`Could not retrieve pData for ${targetPlayer.nameTag} (ID: ${targetPlayer.id}) in showPlayerActionsForm.`, adminPlayer.nameTag);
                }
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
                break;

            case 1: // Kick Player
                const kickConfirmForm = new ModalFormData();
                kickConfirmForm.title(`Kick ${targetPlayer.nameTag}`);
                kickConfirmForm.textField("Reason (optional):", "Enter kick reason");
                kickConfirmForm.toggle("Confirm Kick", false);
                const kickConfirmResponse = await kickConfirmForm.show(adminPlayer);
                if (kickConfirmResponse.canceled) { adminPlayer.sendMessage("§7Kick cancelled."); await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager); return; }
                const reasonKick = kickConfirmResponse.formValues[0] || "Kicked by an administrator via panel.";
                const confirmedKick = kickConfirmResponse.formValues[1];
                if (confirmedKick) {
                    try {
                        targetPlayer.kick(reasonKick);
                        adminPlayer.sendMessage(`§aPlayer ${targetPlayer.nameTag} has been kicked. Reason: ${reasonKick}`);
                        playerUtils.notifyAdmins(`Player ${targetPlayer.nameTag} was kicked by ${adminPlayer.nameTag} via panel. Reason: ${reasonKick}`, adminPlayer, null);
                        logManager.addLog({ timestamp: Date.now(), adminName: adminPlayer.nameTag, actionType: 'kick', targetName: targetPlayer.nameTag, reason: reasonKick });
                        playerUtils.debugLog(`Player ${targetPlayer.nameTag} kicked by ${adminPlayer.nameTag} via panel. Reason: ${reasonKick}`, adminPlayer.nameTag);
                        await showOnlinePlayersList(adminPlayer, playerDataManager);
                    } catch (e) { adminPlayer.sendMessage(`§cError kicking ${targetPlayer.nameTag}: ${e}`); playerUtils.debugLog(`Error kicking ${targetPlayer.nameTag}: ${e}`, adminPlayer.nameTag); await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager); }
                } else { adminPlayer.sendMessage("§7Kick cancelled for " + targetPlayer.nameTag); await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager); }
                break;

            case 2: // Freeze/Unfreeze Player
                const currentFreezeState = targetPlayer.hasTag(frozenTag);
                const targetFreezeState = !currentFreezeState;
                const effectDurationFreeze = 2000000;
                if (targetFreezeState === true) {
                    try { targetPlayer.addTag(frozenTag); targetPlayer.addEffect("slowness", effectDurationFreeze, { amplifier: 255, showParticles: false }); targetPlayer.sendMessage("§cYou have been frozen by an administrator!"); adminPlayer.sendMessage(`§aPlayer ${targetPlayer.nameTag} is now frozen.`); playerUtils.notifyAdmins(`Player ${targetPlayer.nameTag} was frozen by ${adminPlayer.nameTag} via panel.`, adminPlayer, null); playerUtils.debugLog(`Player ${targetPlayer.nameTag} frozen by ${adminPlayer.nameTag} via panel.`, adminPlayer.nameTag); } catch (e) { adminPlayer.sendMessage(`§cError freezing ${targetPlayer.nameTag}: ${e}`); playerUtils.debugLog(`Error freezing ${targetPlayer.nameTag} via panel: ${e}`, adminPlayer.nameTag); }
                } else {
                    try { targetPlayer.removeTag(frozenTag); targetPlayer.removeEffect("slowness"); targetPlayer.sendMessage("§aYou have been unfrozen."); adminPlayer.sendMessage(`§aPlayer ${targetPlayer.nameTag} is no longer frozen.`); playerUtils.notifyAdmins(`Player ${targetPlayer.nameTag} was unfrozen by ${adminPlayer.nameTag} via panel.`, adminPlayer, null); playerUtils.debugLog(`Player ${targetPlayer.nameTag} unfrozen by ${adminPlayer.nameTag} via panel.`, adminPlayer.nameTag); } catch (e) { adminPlayer.sendMessage(`§cError unfreezing ${targetPlayer.nameTag}: ${e}`); playerUtils.debugLog(`Error unfreezing ${targetPlayer.nameTag} via panel: ${e}`, adminPlayer.nameTag); }
                }
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
                break;

            case 3: // Mute/Unmute Player
                const currentMuteInfo = playerDataManager.getMuteInfo(targetPlayer);
                const currentIsTargetMuted = currentMuteInfo !== null;
                if (currentIsTargetMuted) {
                    const confirmUnmuteForm = new ModalFormData(); confirmUnmuteForm.title(`Unmute ${targetPlayer.nameTag}`); confirmUnmuteForm.toggle("Confirm Unmute", false);
                    const unmuteResponse = await confirmUnmuteForm.show(adminPlayer);
                    if (unmuteResponse.canceled) { adminPlayer.sendMessage("§7Unmute cancelled."); }
                    else if (unmuteResponse.formValues[0]) {
                        playerDataManager.removeMute(targetPlayer);
                        adminPlayer.sendMessage(`§aPlayer ${targetPlayer.nameTag} unmuted.`);
                        try { targetPlayer.onScreenDisplay.setActionBar("§aYou have been unmuted."); } catch(e){}
                        playerUtils.notifyAdmins(`Player ${targetPlayer.nameTag} was unmuted by ${adminPlayer.nameTag} via panel.`, adminPlayer, null);
                        logManager.addLog({ timestamp: Date.now(), adminName: adminPlayer.nameTag, actionType: 'unmute', targetName: targetPlayer.nameTag });
                    } else { adminPlayer.sendMessage("§7Unmute cancelled."); }
                } else {
                    const muteForm = new ModalFormData(); muteForm.title(`Mute ${targetPlayer.nameTag}`); muteForm.textField("Duration (minutes, or 'perm'):", "e.g., 60 or perm", "60"); muteForm.textField("Reason (optional):", "Enter reason");
                    const muteFormResponse = await muteForm.show(adminPlayer);
                    if (muteFormResponse.canceled) { adminPlayer.sendMessage("§7Mute action cancelled."); }
                    else {
                        const durationInput = muteFormResponse.formValues[0];
                        const reason = muteFormResponse.formValues[1] || "Muted by admin via panel.";
                        let durationMs;
                        if (durationInput.toLowerCase() === "perm") { durationMs = Infinity; }
                        else {
                            const minutes = parseInt(durationInput);
                            if (isNaN(minutes) || minutes <= 0) { adminPlayer.sendMessage("§cInvalid duration. Must be a positive number of minutes or 'perm'."); await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager); return; }
                            durationMs = minutes * 60 * 1000;
                        }
                        playerDataManager.addMute(targetPlayer, durationMs, reason);
                        const durationText = durationMs === Infinity ? "permanently" : `for ${durationInput}${durationInput.toLowerCase()==="perm"?"":" minutes"}`;
                        adminPlayer.sendMessage(`§aPlayer ${targetPlayer.nameTag} muted ${durationText}.`);
                        try { targetPlayer.onScreenDisplay.setActionBar(`§cYou are muted ${durationText}. Reason: ${reason}`); } catch(e){}
                        playerUtils.notifyAdmins(`Player ${targetPlayer.nameTag} was muted ${durationText} by ${adminPlayer.nameTag} via panel. Reason: ${reason}`, adminPlayer, null);
                        logManager.addLog({ timestamp: Date.now(), adminName: adminPlayer.nameTag, actionType: 'mute', targetName: targetPlayer.nameTag, duration: (durationMs === Infinity ? "perm" : `${durationInput}min`), reason: reason });
                    }
                }
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
                break;

            case 4: // Reset Player Flags
                const confirmResetForm = new ModalFormData();
                confirmResetForm.title("Confirm Reset Flags");
                confirmResetForm.toggle(`Reset all flags for ${targetPlayer.nameTag}? This action cannot be undone.`, false);
                const confirmResetResponse = await confirmResetForm.show(adminPlayer);
                if (confirmResetResponse.canceled) { adminPlayer.sendMessage("§7Flag reset cancelled for " + targetPlayer.nameTag); await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager); return; }
                const confirmedReset = confirmResetResponse.formValues[0];
                if (confirmedReset) {
                    const pData = playerDataManager.getPlayerData(targetPlayer.id);
                    if (pData) {
                        pData.flags.totalFlags = 0; pData.lastFlagType = "";
                        for (const flagKey in pData.flags) { if (typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null) { pData.flags[flagKey].count = 0; pData.flags[flagKey].lastDetectionTime = 0; }}
                        pData.consecutiveOffGroundTicks = 0; pData.fallDistance = 0; pData.consecutiveOnGroundSpeedingTicks = 0; pData.attackEvents = []; pData.blockBreakEvents = [];
                        await playerDataManager.prepareAndSavePlayerData(targetPlayer);
                        adminPlayer.sendMessage(`§aFlags reset for ${targetPlayer.nameTag}.`);
                        playerUtils.notifyAdmins(`Flags for ${targetPlayer.nameTag} were reset by ${adminPlayer.nameTag} via panel.`, adminPlayer, pData);
                        playerUtils.debugLog(`Flags reset for ${targetPlayer.nameTag} by ${adminPlayer.nameTag} via panel.`, adminPlayer.nameTag);
                    } else { adminPlayer.sendMessage("§cCould not retrieve data to reset flags for " + targetPlayer.nameTag); }
                } else { adminPlayer.sendMessage("§7Flag reset cancelled for " + targetPlayer.nameTag); }
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
                break;
            case 5: await showOnlinePlayersList(adminPlayer, playerDataManager); break;
            default: adminPlayer.sendMessage("§cInvalid action selected."); await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager); break;
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}: ${error}`, adminPlayer.nameTag);
        console.error(`[uiManager.showPlayerActionsForm] Error for ${targetPlayer.nameTag}:`, error, error.stack);
        adminPlayer.sendMessage("§cAn error occurred while displaying player actions.");
    }
}

async function showOnlinePlayersList(adminPlayer, playerDataManager) {
    playerUtils.debugLog(`UI: showOnlinePlayersList requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const onlinePlayers = mc.world.getAllPlayers();
    if (onlinePlayers.length === 0) {
        const msgForm = new MessageFormData().title("Online Players").body("No players currently online.").button1("Close");
        try { await msgForm.show(adminPlayer); } catch (e) { playerUtils.debugLog(`Error showing 'No players online' form: ${e}`, adminPlayer.nameTag); }
        return;
    }
    const form = new ActionFormData(); form.title("Online Players"); form.body("Select a player to view actions:");
    const playerMappings = [];
    for (const p of onlinePlayers) {
        const targetPData = playerDataManager.getPlayerData(p.id);
        const buttonText = targetPData ? `${p.nameTag} (Flags: ${targetPData.flags.totalFlags})` : p.nameTag;
        form.button(buttonText); playerMappings.push(p.id);
    }
    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) { /* ... */ return; }
        const selectedPlayerId = playerMappings[response.selection];
        const targetPlayer = mc.world.getPlayer(selectedPlayerId);
        if (targetPlayer) { await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager); }
        else { adminPlayer.sendMessage("§cSelected player not found. They may have logged off."); playerUtils.debugLog(`Selected player with ID ${selectedPlayerId} not found in showOnlinePlayersList.`, adminPlayer.nameTag); }
    } catch (error) {
        playerUtils.debugLog(`Error in showOnlinePlayersList for ${adminPlayer.nameTag}: ${error}`, adminPlayer.nameTag);
        console.error(`[uiManager.showOnlinePlayersList] Error for ${adminPlayer.nameTag}:`, error, error.stack);
        adminPlayer.sendMessage("§cAn error occurred while displaying the online players list.");
    }
}

export async function showAdminPanelMain(adminPlayer, playerDataManager, config) {
    playerUtils.debugLog(`UI: Admin Panel Main requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData();
    const userPermLevel = getPlayerPermissionLevel(adminPlayer);
    let response;
    try {
        if (userPermLevel <= permissionLevels.ADMIN) {
            form.title("AC Admin Panel"); form.body("Select an admin action:");
            form.button("View Online Players", "textures/ui/icon_multiplayer");
            form.button("Inspect Player (Text)", "textures/ui/spyglass");
            form.button("Reset Flags (Text)", "textures/ui/refresh");
            form.button("List Watched Players", "textures/ui/magnifying_glass");
            form.button("Server Management", "textures/ui/icon_graph");
            form.button("View Configuration", "textures/ui/gear"); // This will become "Edit Configuration"
            response = await form.show(adminPlayer);
            if (response.canceled) { /* ... */ return; }
            switch (response.selection) {
                case 0: await showOnlinePlayersList(adminPlayer, playerDataManager); break;
                case 1: await showInspectPlayerForm(adminPlayer, playerDataManager); break;
                case 2: await showResetFlagsForm(adminPlayer, playerDataManager); break;
                case 3: await showWatchedPlayersList(adminPlayer, playerDataManager); break;
                case 4: await showServerManagementForm(adminPlayer, playerDataManager, config); break;
                case 5: await showEditConfigForm(adminPlayer, playerDataManager, config); break; // Updated Call
                default: adminPlayer.sendMessage("§cInvalid selection from Admin Panel."); break;
            }
        } else {
            form.title("AntiCheat Info"); form.body("Select an option:");
            form.button("My Stats", "textures/ui/icon_profile_generic");
            form.button("Server Rules", "textures/ui/book_writable");
            form.button("Help & Links", "textures/ui/icon_Web");
            response = await form.show(adminPlayer);
            if (response.canceled) { /* ... */ return; }
            switch (response.selection) {
                case 0: await showMyStats(adminPlayer, playerDataManager); break;
                case 1: await showServerRules(adminPlayer, config, playerDataManager); break;
                case 2: await showHelpAndLinks(adminPlayer, config, playerDataManager); break;
                default: adminPlayer.sendMessage("§cInvalid selection from Info Panel."); break;
            }
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showAdminPanelMain for ${adminPlayer.nameTag} (Perm: ${userPermLevel}): ${error}`, adminPlayer.nameTag);
        console.error(`[uiManager.showAdminPanelMain] Error for ${adminPlayer.nameTag}:`, error, error.stack);
        adminPlayer.sendMessage("§cAn error occurred while trying to display the panel.");
    }
}

async function showSystemInfo(adminPlayer, config, playerDataManager) {
    playerUtils.debugLog(`UI: showSystemInfo requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    try {
        const onlinePlayersCount = mc.world.getAllPlayers().length;
        let watchedPlayersCount = 0;
        const allPDataValues = typeof playerDataManager.getAllPlayerDataValues === 'function' ? playerDataManager.getAllPlayerDataValues() : [];
        for (const pDataEntry of allPDataValues) { if (pDataEntry.isWatched === true) { watchedPlayersCount++; } }
        let mutedPlayersCount = 0;
        for (const p of mc.world.getAllPlayers()) {
            const pData = playerDataManager.getPlayerData(p.id);
            if (pData && pData.muteInfo) { if (pData.muteInfo.unmuteTime === Infinity || Date.now() < pData.muteInfo.unmuteTime) { mutedPlayersCount++; } }
        }
        let bodyContent = `§lAntiCheat System Information§r\n\n`;
        bodyContent += `§eAC Version:§r ${config.acVersion || 'Unknown'}\n`;
        bodyContent += `§eOnline Players:§r ${onlinePlayersCount}\n`;
        bodyContent += `§eWatched Players:§r ${watchedPlayersCount}\n`;
        bodyContent += `§eMuted Players (Persistent):§r ${mutedPlayersCount}\n`;
        const form = new MessageFormData(); form.title("System Information"); form.body(bodyContent); form.button1("Close");
        await form.show(adminPlayer);
    } catch (error) {
        playerUtils.debugLog(`Error in showSystemInfo for ${adminPlayer.nameTag}: ${error}`, adminPlayer.nameTag);
        console.error(`[uiManager.showSystemInfo] Error:`, error, error.stack);
        adminPlayer.sendMessage("§cAn error occurred while displaying system information.");
    }
    await showAdminPanelMain(adminPlayer, playerDataManager, config); // config is passed here, it's the original const config
}

// Renamed from showViewConfigForm and updated to use ModalFormData for editing
async function showEditConfigForm(adminPlayer, playerDataManager, originalConfig) {
    playerUtils.debugLog(`UI: showEditConfigForm requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ModalFormData();
    form.title("Edit Configuration (Session Only)");

    const orderedConfigKeys = []; // To keep track of the order of form elements

    for (const key in editableConfigValues) {
        if (Object.hasOwnProperty.call(editableConfigValues, key)) {
            const value = editableConfigValues[key];
            const type = typeof value;
            orderedConfigKeys.push({ key: key, type: type });

            if (type === 'boolean') {
                form.toggle(`${key} (boolean):`, value);
            } else if (type === 'string') {
                form.textField(`${key} (string):`, String(value), String(value));
            } else if (type === 'number') {
                form.textField(`${key} (number):`, String(value), String(value));
            }
            // Complex types are not included in editableConfigValues
        }
    }
    // Add acVersion display from originalConfig as it's not in editableConfigValues
    if (originalConfig && originalConfig.acVersion) {
         form.dropdown("AC Version (Read-Only):", [originalConfig.acVersion], 0); // Using dropdown as a read-only text display
    }


    try {
        const response = await form.show(adminPlayer);

        if (response.canceled) {
            playerUtils.debugLog(`Edit Config form canceled by ${adminPlayer.nameTag}. Reason: ${response.cancelationReason}`, adminPlayer.nameTag);
            await showAdminPanelMain(adminPlayer, playerDataManager, originalConfig);
            return;
        }

        const { formValues } = response;
        let updateSummary = "§lConfiguration Update Results:§r\n";
        let changesMade = 0;
        let errorsEncountered = 0;

        for (let i = 0; i < orderedConfigKeys.length; i++) {
            const configEntry = orderedConfigKeys[i];
            const key = configEntry.key;
            const originalType = configEntry.type;
            let newValue = formValues[i]; // This is the value from the form

            if (originalType === 'number') {
                const parsedNum = parseFloat(newValue);
                if (isNaN(parsedNum)) {
                    updateSummary += `§c- ${key}: Failed (Invalid number: "${newValue}")\n`;
                    errorsEncountered++;
                    continue;
                }
                newValue = parsedNum;
            }
            // Booleans from toggles are fine. Strings from textFields are fine.

            if (editableConfigValues[key] === newValue) { // No change
                // updateSummary += `§7- ${key}: No change (${newValue})\n`;
                continue;
            }

            const success = updateConfigValue(key, newValue);
            if (success) {
                updateSummary += `§a- ${key}: Updated to ${newValue}\n`;
                changesMade++;
            } else {
                // updateConfigValue logs details to console, provide a simpler message to player
                updateSummary += `§c- ${key}: Failed to update (Type mismatch or invalid value. Check console for details.)\n`;
                errorsEncountered++;
            }
        }

        let finalMessage = "";
        if (changesMade > 0 && errorsEncountered === 0) {
            finalMessage = `§aSuccessfully updated ${changesMade} configuration value(s).\n${updateSummary}`;
        } else if (changesMade > 0 && errorsEncountered > 0) {
            finalMessage = `§ePartially updated configuration. ${changesMade} success(es), ${errorsEncountered} error(s).\n${updateSummary}`;
        } else if (changesMade === 0 && errorsEncountered > 0) {
            finalMessage = `§cConfiguration update failed. ${errorsEncountered} error(s).\n${updateSummary}`;
        } else { // No changes, no errors
            finalMessage = "§7No configuration values were changed.";
        }

        if (changesMade > 0) {
             finalMessage += "\n§oSome changes may require a server reload or specific command to apply to all systems.";
        }

        const resultForm = new MessageFormData()
            .title("Configuration Update Status")
            .body(finalMessage)
            .button1("OK");
        await resultForm.show(adminPlayer);

    } catch (error) {
        playerUtils.debugLog(`Error in showEditConfigForm for ${adminPlayer.nameTag}: ${error}`, adminPlayer.nameTag);
        console.error(`[uiManager.showEditConfigForm] Error:`, error, error.stack);
        adminPlayer.sendMessage("§cAn error occurred while processing the configuration form.");
    }
    // Pass originalConfig back as it's expected by showAdminPanelMain and other forms it might call
    await showAdminPanelMain(adminPlayer, playerDataManager, originalConfig);
}

async function clearAllChat(adminPerformingAction) {
    playerUtils.debugLog(`UI: clearAllChat initiated by ${adminPerformingAction.nameTag}`, adminPerformingAction.nameTag);
    const chatClearLines = 150;
    try {
        for (let i = 0; i < chatClearLines; i++) {
            for (const p of mc.world.getAllPlayers()) { p.sendMessage(" "); }
        }
        playerUtils.debugLog(`UI: Chat cleared successfully by ${adminPerformingAction.nameTag}`, adminPerformingAction.nameTag);
    } catch (error) { /* ... */ adminPerformingAction.sendMessage("§cAn error occurred while trying to clear chat."); }
}

async function handleClearChatAction(adminPlayer, playerDataManager, config) {
    playerUtils.debugLog(`UI: handleClearChatAction requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const confirmForm = new ModalFormData(); /* ... */ confirmForm.title("Confirm Clear Chat"); confirmForm.content("Are you sure you want to clear chat for all players? This action will send many blank messages and cannot be undone."); confirmForm.toggle("Confirm Clear Chat", false);
    try {
        const response = await confirmForm.show(adminPlayer);
        if (response.canceled) { /* ... */ await showServerManagementForm(adminPlayer, playerDataManager, config); return; }
        const confirmed = response.formValues[0];
        if (!confirmed) { /* ... */ await showServerManagementForm(adminPlayer, playerDataManager, config); return; }
        await clearAllChat(adminPlayer);
        playerUtils.notifyAdmins(`Chat was cleared by ${adminPlayer.nameTag} via Admin Panel.`, adminPlayer, null);
        playerUtils.debugLog(`Chat cleared by ${adminPlayer.nameTag} via Admin Panel.`, adminPlayer.nameTag);
        const successForm = new MessageFormData(); /* ... */ successForm.title("Success"); successForm.body("Chat cleared for all players."); successForm.button1("OK");
        await successForm.show(adminPlayer);
    } catch (error) { /* ... */ }
    await showServerManagementForm(adminPlayer, playerDataManager, config);
}

async function showServerManagementForm(adminPlayer, playerDataManager, config) {
    playerUtils.debugLog(`UI: showServerManagementForm requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData(); form.title("Server Management"); form.body("Select a server management action:");
    form.button("View System Info", "textures/ui/icon_graph");
    form.button("Clear Chat for All Players", "textures/ui/speech_bubble_glyph_color");
    form.button("Lag Clear (TODO)", "textures/ui/icon_trash");  // This was changed in a previous subtask to call handleLagClearAction
    form.button("View Action Logs", "textures/ui/book_writable"); // New button added here
    form.button("Back to Admin Panel", "textures/ui/undo");
    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) { /* ... */ return; }
        switch (response.selection) {
            case 0: await showSystemInfo(adminPlayer, config, playerDataManager); break;
            case 1: await handleClearChatAction(adminPlayer, playerDataManager, config); break;
            case 2: await handleLagClearAction(adminPlayer, config, playerDataManager); break;
            case 3: await showActionLogsForm(adminPlayer, config, playerDataManager); break; // New action
            case 4: await showAdminPanelMain(adminPlayer, playerDataManager, config); break; // Adjusted index
            default: /* ... */ await showServerManagementForm(adminPlayer, playerDataManager, config); break;
        }
    } catch (error) { /* ... */ await showAdminPanelMain(adminPlayer, playerDataManager, config); }
}

// Insert showActionLogsForm function definition here
async function showActionLogsForm(adminPlayer, config, playerDataManager) {
    playerUtils.debugLog(`UI: Action Logs requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new MessageFormData();
    form.title("Action Logs (Latest)");

    const logsToDisplayCount = 50; // Display latest 50 logs
    const logs = logManager.getLogs(logsToDisplayCount);

    let bodyContent = "";
    if (logs.length === 0) {
        bodyContent = "No action logs found.";
    } else {
        for (const logEntry of logs) {
            const timestampStr = new Date(logEntry.timestamp).toLocaleString();
            let line = `§7[${timestampStr}] §e${logEntry.adminName}§r ${logEntry.actionType} §b${logEntry.targetName}§r`;
            if (logEntry.duration) line += ` (§7Dur: ${logEntry.duration}§r)`;
            if (logEntry.reason) line += ` (§7Reason: ${logEntry.reason}§r)`;
            line += "\n";
            bodyContent += line;
        }
        if (logs.length === logsToDisplayCount && logs.length > 0) {
            bodyContent += `\n§o(Displaying latest ${logsToDisplayCount} logs. Older logs may exist.)`;
        }
    }

    form.body(bodyContent.trim());
    form.button1("Back");

    try {
        await form.show(adminPlayer);
    } catch (error) {
        playerUtils.debugLog(`Error in showActionLogsForm for ${adminPlayer.nameTag}: ${error}`, adminPlayer.nameTag);
        console.error(`[uiManager.showActionLogsForm] Error:`, error, error.stack);
    }
    // Always return to the server management form
    await showServerManagementForm(adminPlayer, config, playerDataManager);
}


export async function showPlayerInventory(adminPlayer, targetPlayer) { /* ... */ }
async function showResetFlagsForm(player, playerDataManager) { /* ... */ }
async function showWatchedPlayersList(player, playerDataManager) { /* ... */ }
