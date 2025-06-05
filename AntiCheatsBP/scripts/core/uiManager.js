import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
// Assuming playerUtils contains debugLog, notifyAdmins
import * as playerUtils from '../utils/playerUtils.js';
import { getPlayerPermissionLevel } from '../utils/playerUtils.js'; // Added
import { permissionLevels } from './rankManager.js'; // Added
// playerDataManager will be passed as a parameter to functions that need it.
// Import mute functions from playerDataManager for Mute/Unmute UI
import { getMuteInfo, addMute, removeMute } from '../core/playerDataManager.js';


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
        // player.sendMessage("§cAn error occurred while displaying your stats."); // MessageFormData has no direct error feedback to player on show() fail
    }
    // Always return to the main panel.
    // As 'config' is not passed to this function, and showAdminPanelMain requires it,
    // this call might lead to issues if not handled carefully in showAdminPanelMain or if user is not admin.
    // For normal users, config isn't strictly necessary for their view of showAdminPanelMain.
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
        // No need to send message to player as MessageFormData show() errors are usually client-side
    }
    // Always return to the main panel for the player
    await showAdminPanelMain(player, playerDataManager, config);
}

async function showHelpAndLinks(player, config, playerDataManager) {
    playerUtils.debugLog(`UI: showHelpAndLinks for ${player.nameTag}`, player.nameTag);
    const form = new MessageFormData();
    form.title("Help & Useful Links");

    let bodyContent = "";

    // General Help Messages
    if (config && config.generalHelpMessages && config.generalHelpMessages.length > 0) {
        bodyContent += "§lGeneral Help:§r\n"; // Bold title
        config.generalHelpMessages.forEach(msg => {
            bodyContent += `- ${msg}\n`;
        });
        bodyContent += "\n"; // Add a space before links if help messages exist
    }

    // Help Links
    if (config && config.helpLinks && config.helpLinks.length > 0) {
        bodyContent += "§lUseful Links:§r\n"; // Bold title
        config.helpLinks.forEach(link => {
            bodyContent += `- ${link.title}: ${link.url}\n`; // URLs are not clickable in MessageFormData
        });
    }

    if (bodyContent === "") {
        bodyContent = "§cNo help information or links have been configured by the server admin yet.";
    }

    form.body(bodyContent.trim()); // Trim to remove trailing newline if only one section exists
    form.button1("Close");

    try {
        await form.show(player);
    } catch (error) {
        playerUtils.debugLog(`Error in showHelpAndLinks for ${player.nameTag}: ${error}`, player.nameTag);
        console.error(`[uiManager.showHelpAndLinks] Error: ${error}`, error.stack);
        // No direct message to player as MessageFormData show() error is usually client-side
    }

    // Always return to the main panel for the player
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


    form.button("View Detailed Info/Flags", "textures/ui/magnifying_glass"); // 0
    form.button("Kick Player", "textures/ui/icon_hammer");                   // 1
    form.button(freezeButtonText, freezeButtonIcon);                         // 2
    form.button(muteButtonText, muteButtonIcon);                             // 3
    form.button("Reset Player Flags", "textures/ui/refresh");                // 4
    form.button("Back to Player List", "textures/ui/undo");                  // 5

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

                if (kickConfirmResponse.canceled) {
                    adminPlayer.sendMessage("§7Kick cancelled.");
                    await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
                    return;
                }
                const reasonKick = kickConfirmResponse.formValues[0] || "Kicked by an administrator via panel.";
                const confirmedKick = kickConfirmResponse.formValues[1];

                if (confirmedKick) {
                    try {
                        targetPlayer.kick(reasonKick);
                        adminPlayer.sendMessage(`§aPlayer ${targetPlayer.nameTag} has been kicked. Reason: ${reasonKick}`);
                        playerUtils.notifyAdmins(`Player ${targetPlayer.nameTag} was kicked by ${adminPlayer.nameTag} via panel. Reason: ${reasonKick}`, adminPlayer, null);
                        playerUtils.debugLog(`Player ${targetPlayer.nameTag} kicked by ${adminPlayer.nameTag} via panel. Reason: ${reasonKick}`, adminPlayer.nameTag);
                        await showOnlinePlayersList(adminPlayer, playerDataManager);
                    } catch (e) {
                        adminPlayer.sendMessage(`§cError kicking ${targetPlayer.nameTag}: ${e}`);
                        playerUtils.debugLog(`Error kicking ${targetPlayer.nameTag}: ${e}`, adminPlayer.nameTag);
                        await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
                    }
                } else {
                    adminPlayer.sendMessage("§7Kick cancelled for " + targetPlayer.nameTag);
                    await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
                }
                break;

            case 2: // Freeze/Unfreeze Player
                const currentFreezeState = targetPlayer.hasTag(frozenTag); // isTargetFrozen already has this
                const targetFreezeState = !currentFreezeState;
                const effectDuration = 2000000;

                if (targetFreezeState === true) {
                    try {
                        targetPlayer.addTag(frozenTag);
                        targetPlayer.addEffect("slowness", effectDuration, { amplifier: 255, showParticles: false });
                        targetPlayer.sendMessage("§cYou have been frozen by an administrator!");
                        adminPlayer.sendMessage(`§aPlayer ${targetPlayer.nameTag} is now frozen.`);
                        playerUtils.notifyAdmins(`Player ${targetPlayer.nameTag} was frozen by ${adminPlayer.nameTag} via panel.`, adminPlayer, null);
                        playerUtils.debugLog(`Player ${targetPlayer.nameTag} frozen by ${adminPlayer.nameTag} via panel.`, adminPlayer.nameTag);
                    } catch (e) {
                        adminPlayer.sendMessage(`§cError freezing ${targetPlayer.nameTag}: ${e}`);
                        playerUtils.debugLog(`Error freezing ${targetPlayer.nameTag} via panel: ${e}`, adminPlayer.nameTag);
                    }
                } else {
                    try {
                        targetPlayer.removeTag(frozenTag);
                        targetPlayer.removeEffect("slowness");
                        targetPlayer.sendMessage("§aYou have been unfrozen.");
                        adminPlayer.sendMessage(`§aPlayer ${targetPlayer.nameTag} is no longer frozen.`);
                        playerUtils.notifyAdmins(`Player ${targetPlayer.nameTag} was unfrozen by ${adminPlayer.nameTag} via panel.`, adminPlayer, null);
                        playerUtils.debugLog(`Player ${targetPlayer.nameTag} unfrozen by ${adminPlayer.nameTag} via panel.`, adminPlayer.nameTag);
                    } catch (e) {
                        adminPlayer.sendMessage(`§cError unfreezing ${targetPlayer.nameTag}: ${e}`);
                        playerUtils.debugLog(`Error unfreezing ${targetPlayer.nameTag} via panel: ${e}`, adminPlayer.nameTag);
                    }
                }
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
                break;

            case 3: // Mute/Unmute Player
                const currentMuteInfo = playerDataManager.getMuteInfo(targetPlayer); // Re-fetch for current state
                const currentIsTargetMuted = currentMuteInfo !== null;

                if (currentIsTargetMuted) { // Action is to Unmute
                    const confirmUnmuteForm = new ModalFormData();
                    confirmUnmuteForm.title(`Unmute ${targetPlayer.nameTag}`);
                    confirmUnmuteForm.toggle("Confirm Unmute", false);
                    const unmuteResponse = await confirmUnmuteForm.show(adminPlayer);

                    if (unmuteResponse.canceled) {
                        adminPlayer.sendMessage("§7Unmute cancelled.");
                    } else if (unmuteResponse.formValues[0]) {
                        playerDataManager.removeMute(targetPlayer);
                        adminPlayer.sendMessage(`§aPlayer ${targetPlayer.nameTag} unmuted.`);
                        try { targetPlayer.onScreenDisplay.setActionBar("§aYou have been unmuted."); } catch(e){}
                        playerUtils.notifyAdmins(`Player ${targetPlayer.nameTag} was unmuted by ${adminPlayer.nameTag} via panel.`, adminPlayer, null);
                    } else {
                        adminPlayer.sendMessage("§7Unmute cancelled.");
                    }
                } else { // Action is to Mute
                    const muteForm = new ModalFormData();
                    muteForm.title(`Mute ${targetPlayer.nameTag}`);
                    muteForm.textField("Duration (minutes, or 'perm'):", "e.g., 60 or perm", "60");
                    muteForm.textField("Reason (optional):", "Enter reason");
                    const muteFormResponse = await muteForm.show(adminPlayer);

                    if (muteFormResponse.canceled) {
                        adminPlayer.sendMessage("§7Mute action cancelled.");
                    } else {
                        const durationInput = muteFormResponse.formValues[0];
                        const reason = muteFormResponse.formValues[1] || "Muted by admin via panel.";
                        let durationMs;
                        if (durationInput.toLowerCase() === "perm") {
                            durationMs = Infinity;
                        } else {
                            const minutes = parseInt(durationInput);
                            if (isNaN(minutes) || minutes <= 0) {
                                adminPlayer.sendMessage("§cInvalid duration. Must be a positive number of minutes or 'perm'.");
                                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
                                return; // Exit case to prevent re-showing form twice
                            }
                            durationMs = minutes * 60 * 1000;
                        }
                        playerDataManager.addMute(targetPlayer, durationMs, reason);
                        const durationText = durationMs === Infinity ? "permanently" : `for ${durationInput}${durationInput.toLowerCase()==="perm"?"":" minutes"}`;
                        adminPlayer.sendMessage(`§aPlayer ${targetPlayer.nameTag} muted ${durationText}.`);
                        try { targetPlayer.onScreenDisplay.setActionBar(`§cYou are muted ${durationText}. Reason: ${reason}`); } catch(e){}
                        playerUtils.notifyAdmins(`Player ${targetPlayer.nameTag} was muted ${durationText} by ${adminPlayer.nameTag} via panel. Reason: ${reason}`, adminPlayer, null);
                    }
                }
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
                break;

            case 4: // Reset Player Flags
                const confirmResetForm = new ModalFormData();
                confirmResetForm.title("Confirm Reset Flags");
                confirmResetForm.toggle(`Reset all flags for ${targetPlayer.nameTag}? This action cannot be undone.`, false);

                const confirmResetResponse = await confirmResetForm.show(adminPlayer);

                if (confirmResetResponse.canceled) {
                    adminPlayer.sendMessage("§7Flag reset cancelled for " + targetPlayer.nameTag);
                    await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
                    return;
                }

                const confirmedReset = confirmResetResponse.formValues[0];
                if (confirmedReset) {
                    const pData = playerDataManager.getPlayerData(targetPlayer.id);
                    if (pData) {
                        pData.flags.totalFlags = 0;
                        pData.lastFlagType = "";
                        for (const flagKey in pData.flags) {
                            if (typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null) {
                                pData.flags[flagKey].count = 0;
                                pData.flags[flagKey].lastDetectionTime = 0;
                            }
                        }
                        pData.consecutiveOffGroundTicks = 0;
                        pData.fallDistance = 0;
                        pData.consecutiveOnGroundSpeedingTicks = 0;
                        pData.attackEvents = [];
                        pData.blockBreakEvents = [];
                        await playerDataManager.prepareAndSavePlayerData(targetPlayer);
                        adminPlayer.sendMessage(`§aFlags reset for ${targetPlayer.nameTag}.`);
                        playerUtils.notifyAdmins(`Flags for ${targetPlayer.nameTag} were reset by ${adminPlayer.nameTag} via panel.`, adminPlayer, pData);
                        playerUtils.debugLog(`Flags reset for ${targetPlayer.nameTag} by ${adminPlayer.nameTag} via panel.`, adminPlayer.nameTag);
                    } else {
                        adminPlayer.sendMessage("§cCould not retrieve data to reset flags for " + targetPlayer.nameTag);
                    }
                } else {
                    adminPlayer.sendMessage("§7Flag reset cancelled for " + targetPlayer.nameTag);
                }
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
                break;

            case 5: // Back to Player List
                await showOnlinePlayersList(adminPlayer, playerDataManager);
                break;

            default:
                adminPlayer.sendMessage("§cInvalid action selected.");
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
                break;
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
        const msgForm = new MessageFormData()
            .title("Online Players")
            .body("No players currently online.")
            .button1("Close");
        try {
            await msgForm.show(adminPlayer);
        } catch (e) {
            playerUtils.debugLog(`Error showing 'No players online' form: ${e}`, adminPlayer.nameTag);
        }
        return;
    }

    const form = new ActionFormData();
    form.title("Online Players");
    form.body("Select a player to view actions:");

    const playerMappings = [];

    for (const p of onlinePlayers) {
        const targetPData = playerDataManager.getPlayerData(p.id);
        const buttonText = targetPData
            ? `${p.nameTag} (Flags: ${targetPData.flags.totalFlags})`
            : p.nameTag;
        form.button(buttonText);
        playerMappings.push(p.id);
    }

    try {
        const response = await form.show(adminPlayer);

        if (response.canceled) {
            if (response.cancelationReason) {
                 playerUtils.debugLog(`Online Players list canceled by ${adminPlayer.nameTag}. Reason: ${response.cancelationReason}`, adminPlayer.nameTag);
            } else {
                 playerUtils.debugLog(`Online Players list canceled by ${adminPlayer.nameTag}.`, adminPlayer.nameTag);
            }
            return;
        }

        const selectedPlayerId = playerMappings[response.selection];
        const targetPlayer = mc.world.getPlayer(selectedPlayerId);

        if (targetPlayer) {
            await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
        } else {
            adminPlayer.sendMessage("§cSelected player not found. They may have logged off.");
            playerUtils.debugLog(`Selected player with ID ${selectedPlayerId} not found in showOnlinePlayersList.`, adminPlayer.nameTag);
        }

    } catch (error) {
        playerUtils.debugLog(`Error in showOnlinePlayersList for ${adminPlayer.nameTag}: ${error}`, adminPlayer.nameTag);
        console.error(`[uiManager.showOnlinePlayersList] Error for ${adminPlayer.nameTag}:`, error, error.stack);
        adminPlayer.sendMessage("§cAn error occurred while displaying the online players list.");
    }
}

export async function showAdminPanelMain(adminPlayer, playerDataManager, config) { // Added config
    playerUtils.debugLog(`UI: Admin Panel Main requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData();
    const userPermLevel = getPlayerPermissionLevel(adminPlayer);

    let response;

    try {
        if (userPermLevel <= permissionLevels.ADMIN) {
            form.title("AC Admin Panel");
            form.body("Select an admin action:");
            form.button("View Online Players", "textures/ui/icon_multiplayer");    // 0
            form.button("Inspect Player (Text)", "textures/ui/spyglass");         // 1
            form.button("Reset Flags (Text)", "textures/ui/refresh");           // 2
            form.button("List Watched Players", "textures/ui/magnifying_glass");  // 3
            form.button("Server Stats (TODO)", "textures/ui/icon_graph");         // 4
            form.button("Settings (TODO)", "textures/ui/gear");                 // 5

            response = await form.show(adminPlayer);

            if (response.canceled) {
                if (response.cancelationReason) {
                    playerUtils.debugLog(`Admin Panel (Admin View) canceled by ${adminPlayer.nameTag}. Reason: ${response.cancelationReason}`, adminPlayer.nameTag);
                } else {
                    playerUtils.debugLog(`Admin Panel (Admin View) canceled by ${adminPlayer.nameTag}.`, adminPlayer.nameTag);
                }
                return;
            }

            switch (response.selection) {
                case 0: await showOnlinePlayersList(adminPlayer, playerDataManager); break;
                case 1: await showInspectPlayerForm(adminPlayer, playerDataManager); break;
                case 2: await showResetFlagsForm(adminPlayer, playerDataManager); break;
                case 3: await showWatchedPlayersList(adminPlayer, playerDataManager); break;
                case 4: adminPlayer.sendMessage("§7Server Stats functionality is not yet implemented."); break;
                case 5: adminPlayer.sendMessage("§7Settings functionality is not yet implemented."); break;
                default: adminPlayer.sendMessage("§cInvalid selection from Admin Panel."); break;
            }
        } else {
            form.title("AntiCheat Info");
            form.body("Select an option:");
            form.button("My Stats (TODO)", "textures/ui/icon_profile_generic");
            form.button("Server Rules (TODO)", "textures/ui/book_writable");
            form.button("Help & Links (TODO)", "textures/ui/icon_Web");

            response = await form.show(adminPlayer);

            if (response.canceled) {
                if (response.cancelationReason) {
                    playerUtils.debugLog(`AC Info Panel (User View) canceled by ${adminPlayer.nameTag}. Reason: ${response.cancelationReason}`, adminPlayer.nameTag);
                } else {
                    playerUtils.debugLog(`AC Info Panel (User View) canceled by ${adminPlayer.nameTag}.`, adminPlayer.nameTag);
                }
                return;
            }

            switch (response.selection) {
                case 0: await showMyStats(adminPlayer, playerDataManager); break;
                case 1: await showServerRules(adminPlayer, config, playerDataManager); break;
                case 2: await showHelpAndLinks(adminPlayer, config, playerDataManager); break; // Updated
                default: adminPlayer.sendMessage("§cInvalid selection from Info Panel."); break;
            }
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showAdminPanelMain for ${adminPlayer.nameTag} (Perm: ${userPermLevel}): ${error}`, adminPlayer.nameTag);
        console.error(`[uiManager.showAdminPanelMain] Error for ${adminPlayer.nameTag}:`, error, error.stack);
        adminPlayer.sendMessage("§cAn error occurred while trying to display the panel.");
    }
}

async function showSystemInfo(adminPlayer, config, playerDataManager) { // Added config
    playerUtils.debugLog(`UI: showSystemInfo requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    try {
        const onlinePlayersCount = mc.world.getAllPlayers().length;

        let watchedPlayersCount = 0;
        const allPDataValues = typeof playerDataManager.getAllPlayerDataValues === 'function'
            ? playerDataManager.getAllPlayerDataValues()
            : [];
        for (const pDataEntry of allPDataValues) {
            if (pDataEntry.isWatched === true) {
                watchedPlayersCount++;
            }
        }

        let mutedPlayersCount = 0;
        for (const p of mc.world.getAllPlayers()) {
            const pData = playerDataManager.getPlayerData(p.id);
            if (pData && pData.muteInfo) {
                // Optionally, re-check expiration here if getMuteInfo isn't called regularly for all players
                if (pData.muteInfo.unmuteTime === Infinity || Date.now() < pData.muteInfo.unmuteTime) {
                    mutedPlayersCount++;
                }
            }
        }


        let bodyContent = `§lAntiCheat System Information§r\n\n`;
        bodyContent += `§eAC Version:§r ${config.acVersion || 'Unknown'}\n`;
        bodyContent += `§eOnline Players:§r ${onlinePlayersCount}\n`;
        bodyContent += `§eWatched Players:§r ${watchedPlayersCount}\n`;
        bodyContent += `§eMuted Players (Persistent):§r ${mutedPlayersCount}\n`;

        const form = new MessageFormData();
        form.title("System Information");
        form.body(bodyContent);
        form.button1("Close");

        await form.show(adminPlayer);
    } catch (error) {
        playerUtils.debugLog(`Error in showSystemInfo for ${adminPlayer.nameTag}: ${error}`, adminPlayer.nameTag);
        console.error(`[uiManager.showSystemInfo] Error:`, error, error.stack);
        adminPlayer.sendMessage("§cAn error occurred while displaying system information.");
    }
    await showAdminPanelMain(adminPlayer, playerDataManager, config); // Pass config back
}

export async function showPlayerInventory(adminPlayer, targetPlayer) {
    if (!(adminPlayer instanceof mc.Player) || !(targetPlayer instanceof mc.Player)) {
        console.error("[uiManager.showPlayerInventory] Invalid adminPlayer or targetPlayer provided.");
        if (adminPlayer instanceof mc.Player) {
            adminPlayer.sendMessage("§cAn error occurred: Invalid player object provided for inventory view.");
        }
        return;
    }

    playerUtils.debugLog(`UI: showPlayerInventory for ${targetPlayer.nameTag} requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);

    try {
        const inventoryComponent = targetPlayer.getComponent("minecraft:inventory");
        if (!inventoryComponent || !inventoryComponent.container) {
            adminPlayer.sendMessage(`§cCould not access inventory for ${targetPlayer.nameTag}.`);
            playerUtils.debugLog(`Failed to get inventory component or container for ${targetPlayer.nameTag}`, adminPlayer.nameTag);
            return;
        }
        const container = inventoryComponent.container;

        let inventoryContent = `§lInventory of ${targetPlayer.nameTag}§r\n\n`;

        const mainHandItem = container.getItem(targetPlayer.selectedSlot);
        inventoryContent += `§eMain Hand (Slot ${targetPlayer.selectedSlot}):§r\n`;
        if (mainHandItem) {
            inventoryContent += `  §f- ${mainHandItem.typeId} (x${mainHandItem.amount}) ${mainHandItem.nameTag ? '§7[' + mainHandItem.nameTag + ']§r' : ''}\n`;
        } else {
            inventoryContent += `  §7- Empty\n`;
        }

        inventoryContent += "\n§eArmor:§r\n";
        const equippableComponent = targetPlayer.getComponent("minecraft:equippable");
        if (equippableComponent) {
            const armorSlots = [
                { name: "Head", slot: mc.EquipmentSlot.Head },
                { name: "Chest", slot: mc.EquipmentSlot.Chest },
                { name: "Legs", slot: mc.EquipmentSlot.Legs },
                { name: "Feet", slot: mc.EquipmentSlot.Feet },
                { name: "Offhand", slot: mc.EquipmentSlot.Offhand }
            ];

            for (const armorSlot of armorSlots) {
                try {
                    const armorItem = equippableComponent.getEquipment(armorSlot.slot);
                    inventoryContent += `  §7${armorSlot.name}:§r `;
                    if (armorItem) {
                        inventoryContent += `${armorItem.typeId} (x${armorItem.amount}) ${armorItem.nameTag ? '§7[' + armorItem.nameTag + ']§r' : ''}\n`;
                    } else {
                        inventoryContent += `Empty\n`;
                    }
                } catch (e) {
                     inventoryContent += `Error accessing ${armorSlot.name} slot.\n`;
                     playerUtils.debugLog(`Error accessing ${armorSlot.name} for ${targetPlayer.nameTag}: ${e}`, adminPlayer.nameTag);
                }
            }
        } else {
            inventoryContent += "  Could not access armor slots component.\n";
        }

        inventoryContent += `\n§eMain Inventory (Size: ${container.size}):§r\n`;
        let mainInvIsEmpty = true;
        for (let i = 0; i < container.size; i++) {
            const itemStack = container.getItem(i);
            if (itemStack) {
                mainInvIsEmpty = false;
                inventoryContent += `  Slot ${i}: ${itemStack.typeId} (x${itemStack.amount}) ${itemStack.nameTag ? '§7[' + itemStack.nameTag + ']§r' : ''}\n`;
            }
        }
        if (mainInvIsEmpty) {
            inventoryContent += "  Main inventory is empty.\n";
        }

        if (inventoryContent.trim() === `§lInventory of ${targetPlayer.nameTag}§r`) {
            inventoryContent = "Inventory appears to be empty or inaccessible after checks.";
        }

        const form = new MessageFormData();
        form.title(`Inventory of ${targetPlayer.nameTag}`);
        form.body(inventoryContent);
        form.button1("Close");

        await form.show(adminPlayer);

    } catch (error) {
        playerUtils.debugLog(`Error in showPlayerInventory for ${targetPlayer.nameTag}: ${error}`, adminPlayer.nameTag);
        console.error(`[uiManager.showPlayerInventory] Error for ${targetPlayer.nameTag}:`, error, error.stack);
        adminPlayer.sendMessage("§cAn error occurred while trying to display the player's inventory.");
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
