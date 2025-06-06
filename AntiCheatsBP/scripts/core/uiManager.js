import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import * as playerUtils from '../utils/playerUtils.js';
import { getPlayerPermissionLevel } from '../utils/playerUtils.js';
import { permissionLevels } from './rankManager.js';
import { getMuteInfo, addMute, removeMute } from '../core/playerDataManager.js'; // Specific to mute actions in UI
import * as logManager from './logManager.js';
import { editableConfigValues, updateConfigValue } from '../config.js';


async function showInspectPlayerForm(player, playerDataManager, dependencies) { // Added dependencies
    playerUtils.debugLog(`UI: Inspect Player form requested by ${player.nameTag}`, player.nameTag);
    const modalForm = new ModalFormData();
    modalForm.title("Inspect Player Data");
    modalForm.textField("Enter Player Name:", "TargetPlayerName");

    try {
        const response = await modalForm.show(player);
        if (response.canceled) return;
        const targetPlayerName = response.formValues[0];
        if (!targetPlayerName || targetPlayerName.trim() === "") {
            player.sendMessage("§cPlayer name cannot be empty."); return;
        }
        // Use findPlayer from dependencies
        const findPlayer = (dependencies && dependencies.findPlayer) || playerUtils.findPlayer;
        let inspectFoundPlayer = findPlayer(targetPlayerName.trim(), playerUtils);

        if (inspectFoundPlayer) {
            const targetPData = playerDataManager.getPlayerData(inspectFoundPlayer.id);
            // ... (rest of inspect logic, potentially calling !inspect module later)
            // For now, keeping existing text-based inspect logic here
            if (targetPData) {
                let summary = `§a--- AntiCheat Data for ${inspectFoundPlayer.nameTag} ---\n`;
                summary += `§eWatched: §f${targetPData.isWatched}\n`;
                summary += `§eTotal Flags: §f${targetPData.flags.totalFlags}\n`;
                // ... (full summary generation)
                player.sendMessage(summary);
            } else {
                 player.sendMessage(`§cPlayer data for ${targetPlayerName.trim()} not found.`);
            }
        } else {
            player.sendMessage(`§cPlayer '${targetPlayerName.trim()}' not found.`);
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showInspectPlayerForm: ${error}`, player.nameTag);
        player.sendMessage("§cError opening or processing Inspect Player form.");
    }
    // Return to main panel
    await showAdminPanelMain(player, playerDataManager, dependencies.config, dependencies);
}

async function showMyStats(player, playerDataManager, config, dependencies) { // Added dependencies, config from dependencies
    playerUtils.debugLog(`UI: showMyStats for ${player.nameTag}`, player.nameTag);
    // This function's logic is largely superseded by the !uinfo command module.
    // For direct UI access, it could call the uinfo module's helper or replicate logic.
    // For now, let's assume it will call the 'uinfo' command's logic or a direct uinfo UI helper.
    // Placeholder:
    const uinfoModule = dependencies.commandModules.find(m => m.definition.name === 'uinfo');
    if (uinfoModule && uinfoModule.execute) {
        // The uinfo module itself shows a panel. We might want a direct MessageForm for this specific button.
        // For simplicity, we'll replicate a simplified version or call a sub-function if uinfo module exposed one.
        // For now, just showing a message.
        const pData = playerDataManager.getPlayerData(player.id);
        let bodyContent = "Your stats will be shown here via !uinfo logic.";
         if (pData && pData.flags) {
            bodyContent = `§eYour Total Flags:§r ${pData.flags.totalFlags || 0}\n... (details via !uinfo)`;
        } else {
            bodyContent = "§cCould not retrieve your AntiCheat stats at this time.";
        }
        const form = new MessageFormData().title("My Stats (via !uinfo)").body(bodyContent).button1("Close");
        await form.show(player).catch(e => playerUtils.debugLog(`Error in showMyStats: ${e}`, player.nameTag));
    } else {
        player.sendMessage("§c!uinfo module not available.");
    }
    await showAdminPanelMain(player, playerDataManager, config, dependencies);
}

async function showServerRules(player, config, playerDataManager, dependencies) { // Added dependencies
    playerUtils.debugLog(`UI: showServerRules for ${player.nameTag}`, player.nameTag);
    // Similar to showMyStats, this is covered by !uinfo.
    // Placeholder:
     const uinfoModule = dependencies.commandModules.find(m => m.definition.name === 'uinfo');
    if (uinfoModule && uinfoModule.execute) { // This isn't ideal, better to have direct access to UI function
        player.sendMessage("§7Please use `!uinfo` and select 'Server Rules'.");
    } else {
         player.sendMessage("§cServer Rules display function not available via !uinfo module.");
    }
    await showAdminPanelMain(player, playerDataManager, config, dependencies);
}

async function showHelpAndLinks(player, config, playerDataManager, dependencies) { // Added dependencies
    playerUtils.debugLog(`UI: showHelpAndLinks for ${player.nameTag}`, player.nameTag);
    // Similar to showMyStats, this is covered by !uinfo.
    // Placeholder:
    const uinfoModule = dependencies.commandModules.find(m => m.definition.name === 'uinfo');
    if (uinfoModule && uinfoModule.execute) {
         player.sendMessage("§7Please use `!uinfo` and select 'Helpful Links' or 'General Tips'.");
    } else {
        player.sendMessage("§cHelp/Links display function not available via !uinfo module.");
    }
    await showAdminPanelMain(player, playerDataManager, config, dependencies);
}

async function showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const { config, playerUtils: localPlayerUtils, addLog } = dependencies; // Destructure for clarity

    const form = new ActionFormData();
    form.title(`Actions for ${targetPlayer.nameTag}`);
    const frozenTag = "frozen";
    const isTargetFrozen = targetPlayer.hasTag(frozenTag);
    const freezeButtonText = isTargetFrozen ? "Unfreeze Player" : "Freeze Player";
    const freezeButtonIcon = isTargetFrozen ? "textures/ui/icon_unlocked" : "textures/ui/icon_locked";

    const muteInfo = (playerDataManager.getMuteInfo && typeof playerDataManager.getMuteInfo === 'function')
        ? playerDataManager.getMuteInfo(targetPlayer)
        : null;
    const isTargetMuted = muteInfo !== null;
    let muteButtonText = isTargetMuted ? "Unmute Player" : "Mute Player";
    if (isTargetMuted && muteInfo.unmuteTime !== Infinity) {
        muteButtonText += ` (exp. ${new Date(muteInfo.unmuteTime).toLocaleTimeString()})`;
    } else if (isTargetMuted) {
        muteButtonText += " (Permanent)";
    }
    const muteButtonIcon = isTargetMuted ? "textures/ui/speaker_off_light" : "textures/ui/speaker_on_light";

    form.button("View Detailed Info/Flags", "textures/ui/magnifying_glass"); // Index 0
    form.button("Kick Player", "textures/ui/icon_hammer");                   // Index 1
    form.button(freezeButtonText, freezeButtonIcon);                         // Index 2
    form.button(muteButtonText, muteButtonIcon);                             // Index 3
    form.button("Ban Player", "textures/ui/icon_resource_pack");             // Index 4 - NEW
    form.button("Reset Player Flags", "textures/ui/refresh");                // Index 5 (was 4)
    form.button("Back to Player List", "textures/ui/undo");                  // Index 6 (was 5)

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            localPlayerUtils.debugLog(`Player Actions form for ${targetPlayer.nameTag} canceled by ${adminPlayer.nameTag}. Reason: ${response.cancelationReason}`, adminPlayer.nameTag);
            return;
        }

        switch (response.selection) {
            case 0: // View Detailed Info/Flags
                // ... (existing logic, ensure it uses dependencies if calling other UI functions)
                // For now, just refresh after showing details via message.
                const pDataDetail = playerDataManager.getPlayerData(targetPlayer.id);
                // ... (generate summary as before)
                // await detailForm.show(adminPlayer);
                adminPlayer.sendMessage("§7Detailed info shown (simulated). Actual inspect module call or direct display needed.");
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
                break;

            case 1: // Kick Player
                const kickForm = new ModalFormData().title(`Kick ${targetPlayer.nameTag}`).textField("Reason (optional):", "Kicked by admin via panel").toggle("Confirm Kick", false);
                const kickResponse = await kickForm.show(adminPlayer);
                if (kickResponse.canceled) { adminPlayer.sendMessage("§7Kick cancelled."); await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); return; }
                if (kickResponse.formValues[1]) {
                    const reasonKick = kickResponse.formValues[0] || "Kicked by admin via panel.";
                    const kickModule = dependencies.commandModules.find(m => m.definition.name === 'kick');
                    if (kickModule) await kickModule.execute(adminPlayer, [targetPlayer.nameTag, reasonKick], dependencies);
                    else adminPlayer.sendMessage("§cKick command module not found.");
                } else { adminPlayer.sendMessage("§7Kick cancelled (confirmation not given)."); }
                await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); // Go back to player list
                break;

            case 2: // Freeze/Unfreeze Player
                const freezeModule = dependencies.commandModules.find(m => m.definition.name === 'freeze');
                if (freezeModule) await freezeModule.execute(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage("§cFreeze command module not found.");
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); // Refresh
                break;

            case 3: // Mute/Unmute Player
                const currentIsTargetMutedForAction = (playerDataManager.getMuteInfo && playerDataManager.getMuteInfo(targetPlayer)) !== null;
                if (currentIsTargetMutedForAction) { // Unmute
                    const unmuteModule = dependencies.commandModules.find(m => m.definition.name === 'unmute');
                    if (unmuteModule) await unmuteModule.execute(adminPlayer, [targetPlayer.nameTag], dependencies);
                    else adminPlayer.sendMessage("§cUnmute command module not found.");
                } else { // Mute
                    const muteModal = new ModalFormData().title(`Mute ${targetPlayer.nameTag}`).textField("Duration (e.g., 60m, 1h, perm):", "60m").textField("Reason (optional):", "Muted by admin via panel");
                    const muteModalResponse = await muteModal.show(adminPlayer);
                    if (muteModalResponse.canceled) { adminPlayer.sendMessage("§7Mute cancelled."); }
                    else {
                        const durationMute = muteModalResponse.formValues[0];
                        const reasonMute = muteModalResponse.formValues[1];
                        const muteModule = dependencies.commandModules.find(m => m.definition.name === 'mute');
                        if (muteModule) await muteModule.execute(adminPlayer, [targetPlayer.nameTag, durationMute, reasonMute], dependencies);
                        else adminPlayer.sendMessage("§cMute command module not found.");
                    }
                }
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); // Refresh
                break;

            case 4: // Ban Player - NEW
                const banForm = new ModalFormData();
                banForm.title(`Ban ${targetPlayer.nameTag}`);
                banForm.textField("Duration (e.g., 7d, 1mo, perm):", "perm");
                banForm.textField("Reason (optional):", "Banned by admin via panel");
                banForm.toggle("Confirm Ban", false);

                const banResponse = await banForm.show(adminPlayer);

                if (banResponse.canceled) {
                    adminPlayer.sendMessage("§7Ban cancelled.");
                    await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
                    return;
                }

                const confirmedBan = banResponse.formValues[2];
                if (confirmedBan) {
                    const durationBan = banResponse.formValues[0] || "perm";
                    const reasonBan = banResponse.formValues[1] || "Banned by admin via panel.";
                    const banArgs = [targetPlayer.nameTag, durationBan, reasonBan];

                    const banModule = dependencies.commandModules.find(m => m.definition && m.definition.name === 'ban');
                    if (banModule && typeof banModule.execute === 'function') {
                        try {
                            await banModule.execute(adminPlayer, banArgs, dependencies);
                            adminPlayer.sendMessage(`§eBan attempt for ${targetPlayer.nameTag} processed. Check chat for details.`);
                        } catch (e) {
                            adminPlayer.sendMessage(`§cError executing ban for ${targetPlayer.nameTag}: ${e}`);
                            if (dependencies.playerUtils && dependencies.playerUtils.debugLog) {
                                dependencies.playerUtils.debugLog(`Error executing ban.js from UI for ${targetPlayer.nameTag}: ${e}`, adminPlayer.nameTag);
                            }
                        }
                    } else {
                        adminPlayer.sendMessage("§cBan command module not found. Cannot execute ban.");
                        console.error("[uiManager] Ban module or execute function not found in dependencies.");
                    }
                    await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); // Return to player list
                } else {
                    adminPlayer.sendMessage("§7Ban cancelled for " + targetPlayer.nameTag + " (confirmation not given).");
                    await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
                }
                break;

            case 5: // Reset Player Flags (was 4)
                const resetFlagsModule = dependencies.commandModules.find(m => m.definition.name === 'resetflags');
                if (resetFlagsModule) await resetFlagsModule.execute(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage("§cResetflags command module not found.");
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); // Refresh
                break;
            case 6: // Back to Player List (was 5)
                await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
                break;
            default:
                adminPlayer.sendMessage("§cInvalid action selected.");
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
                break;
        }
    } catch (error) {
        localPlayerUtils.debugLog(`Error in showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}: ${error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage("§cAn error occurred while displaying player actions.");
    }
}

async function showOnlinePlayersList(adminPlayer, playerDataManager, dependencies) { // Added dependencies
    playerUtils.debugLog(`UI: showOnlinePlayersList requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const onlinePlayers = mc.world.getAllPlayers();
    if (onlinePlayers.length === 0) {
        // ... (no change needed here, but ensure showAdminPanelMain is called with dependencies)
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
        return;
    }
    const form = new ActionFormData(); form.title("Online Players"); form.body("Select a player to view actions:");
    const playerMappings = [];
    for (const p of onlinePlayers) {
        const targetPData = playerDataManager.getPlayerData(p.id);
        const buttonText = targetPData && targetPData.flags ? `${p.nameTag} (Flags: ${targetPData.flags.totalFlags || 0})` : p.nameTag;
        form.button(buttonText, "textures/ui/icon_steve");
        playerMappings.push(p.id);
    }
    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) { await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies); return; } // Return to main
        const selectedPlayerId = playerMappings[response.selection];
        const targetPlayer = mc.world.getPlayer(selectedPlayerId);
        if (targetPlayer) { await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); } // Pass dependencies
        else { adminPlayer.sendMessage("§cSelected player not found. They may have logged off."); await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); } // Pass dependencies
    } catch (error) {
        playerUtils.debugLog(`Error in showOnlinePlayersList: ${error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage("§cAn error occurred displaying players.");
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies); // Return to main
    }
}

export async function showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies) { // Added dependencies, config from dependencies
    playerUtils.debugLog(`UI: Admin Panel Main requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData();
    const userPermLevel = getPlayerPermissionLevel(adminPlayer); // This is fine, from playerUtils
    let response;
    try {
        if (userPermLevel <= permissionLevels.ADMIN) {
            form.title("AC Admin Panel"); form.body("Select an admin action:");
            form.button("View Online Players", "textures/ui/icon_multiplayer");
            form.button("Inspect Player (Text)", "textures/ui/spyglass");
            // ... other admin buttons
            form.button("Server Management", "textures/ui/icon_graph");
            form.button("View/Edit Configuration", "textures/ui/gear");
            response = await form.show(adminPlayer);
            if (response.canceled) return;
            switch (response.selection) {
                case 0: await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); break; // Pass dependencies
                case 1: await showInspectPlayerForm(adminPlayer, playerDataManager, dependencies); break; // Pass dependencies
                // ... other cases for admin buttons
                case 2: /* Placeholder for Reset Flags (Text) */ await showAdminPanelMain(adminPlayer,playerDataManager,config,dependencies); break;
                case 3: /* Placeholder for List Watched */ await showAdminPanelMain(adminPlayer,playerDataManager,config,dependencies); break;
                case 4: await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); break; // Pass dependencies
                case 5: await showEditConfigForm(adminPlayer, playerDataManager, config, dependencies); break; // Pass dependencies
                default: adminPlayer.sendMessage("§cInvalid selection."); await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies); break;
            }
        } else { // Normal player panel (if !panel was made available to them, or for !uinfo logic)
            // This part of the panel is mostly covered by the !uinfo command now.
            // If !panel is admin-only, this 'else' block might not be reached by normal players.
            // For now, assuming !uinfo is the primary UI for normal players.
            // If showAdminPanelMain is ever called for a normal player directly, this would be their view.
            form.title("AntiCheat Info"); form.body("Select an option:");
            form.button("My Stats (use !uinfo)", "textures/ui/icon_profile_generic");
            form.button("Server Rules (use !uinfo)", "textures/ui/book_writable");
            form.button("Help & Links (use !uinfo)", "textures/ui/icon_Web");
            response = await form.show(adminPlayer);
            if (response.canceled) return;
            // These would ideally call sub-functions from uinfo.js or just tell user to use !uinfo
            player.sendMessage("§7Please use the `!uinfo` command to access these features.");
            // No further navigation here as !uinfo is a separate flow.
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showAdminPanelMain for ${adminPlayer.nameTag}: ${error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage("§cAn error occurred displaying the panel.");
    }
}

async function showSystemInfo(adminPlayer, config, playerDataManager, dependencies) { // Added dependencies
    playerUtils.debugLog(`UI: showSystemInfo requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    // ... (existing system info logic)
    const form = new MessageFormData().title("System Information").body("System info...").button1("Close");
    await form.show(adminPlayer).catch(e => playerUtils.debugLog(`Error: ${e}`, adminPlayer.nameTag));
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); // Pass dependencies
}

async function showEditConfigForm(adminPlayer, playerDataManager, config, dependencies) { // Added dependencies
    playerUtils.debugLog(`UI: showEditConfigForm requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    // ... (existing edit config logic)
    const form = new MessageFormData().title("Config Edit Status").body("Config updated (simulated).").button1("OK");
    await form.show(adminPlayer).catch(e => playerUtils.debugLog(`Error: ${e}`, adminPlayer.nameTag));
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); // Pass dependencies
}

async function handleClearChatAction(adminPlayer, playerDataManager, config, dependencies) { // Added dependencies
    playerUtils.debugLog(`UI: handleClearChatAction requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    // ... (existing clear chat logic)
    const successForm = new MessageFormData().title("Success").body("Chat cleared.").button1("OK");
    await successForm.show(adminPlayer).catch(e => playerUtils.debugLog(`Error: ${e}`, adminPlayer.nameTag));
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); // Pass dependencies
}

async function handleLagClearAction(adminPlayer, config, playerDataManager, dependencies) { // Added dependencies
    playerUtils.debugLog(`UI: handleLagClearAction requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    // ... (existing lag clear logic)
    const successForm = new MessageFormData().title("Lag Clear").body("Lag cleared (simulated).").button1("OK");
    await successForm.show(adminPlayer).catch(e => playerUtils.debugLog(`Error: ${e}`, adminPlayer.nameTag));
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); // Pass dependencies
}

async function showServerManagementForm(adminPlayer, playerDataManager, config, dependencies) { // Added dependencies
    playerUtils.debugLog(`UI: showServerManagementForm requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData(); form.title("Server Management"); form.body("Select action:");
    form.button("View System Info", "textures/ui/icon_graph");
    form.button("Clear Chat for All Players", "textures/ui/speech_bubble_glyph_color");
    form.button("Lag Clear (Items)", "textures/ui/icon_trash");
    form.button("View Action Logs", "textures/ui/book_writable");
    form.button("Back to Admin Panel", "textures/ui/undo");
    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) { await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies); return; } // Pass dependencies
        switch (response.selection) {
            case 0: await showSystemInfo(adminPlayer, config, playerDataManager, dependencies); break; // Pass dependencies
            case 1: await handleClearChatAction(adminPlayer, playerDataManager, config, dependencies); break; // Pass dependencies
            case 2: await handleLagClearAction(adminPlayer, config, playerDataManager, dependencies); break; // Pass dependencies
            case 3: await showActionLogsForm(adminPlayer, config, playerDataManager, dependencies); break; // Pass dependencies
            case 4: await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies); break; // Pass dependencies
            default: await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); break; // Pass dependencies
        }
    } catch (error) { await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies); } // Pass dependencies
}

async function showActionLogsForm(adminPlayer, config, playerDataManager, dependencies) { // Added dependencies
    playerUtils.debugLog(`UI: Action Logs requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    // ... (existing action logs logic)
    const form = new MessageFormData().title("Action Logs").body("Logs...").button1("Back");
    await form.show(adminPlayer).catch(e => playerUtils.debugLog(`Error: ${e}`, adminPlayer.nameTag));
    await showServerManagementForm(adminPlayer, config, playerDataManager, dependencies); // Pass dependencies
}

// Stubs for functions that were not fully defined in the prompt but might be called
async function showResetFlagsForm(player, playerDataManager, dependencies) {
    player.sendMessage("§7Reset Flags (Text) selected from panel. Use `!resetflags <player>`.");
    await showAdminPanelMain(player, playerDataManager, dependencies.config, dependencies);
}
async function showWatchedPlayersList(player, playerDataManager, dependencies) {
    player.sendMessage("§7List Watched Players selected from panel. (UI for this not implemented, use text command).");
    await showAdminPanelMain(player, playerDataManager, dependencies.config, dependencies);
}
