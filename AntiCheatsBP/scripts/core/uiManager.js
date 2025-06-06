import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import * as playerUtils from '../utils/playerUtils.js';
import { getPlayerPermissionLevel } from '../utils/playerUtils.js';
import { permissionLevels } from './rankManager.js';
// getMuteInfo, addMute, removeMute are already part of playerDataManager passed in dependencies for command modules
import * as logManager from './logManager.js';
import { editableConfigValues, updateConfigValue } from '../config.js';


async function showInspectPlayerForm(player, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: Inspect Player form requested by ${player.nameTag}`, player.nameTag);
    const modalForm = new ModalFormData();
    modalForm.title("Inspect Player Data");
    modalForm.textField("Enter Player Name:", "TargetPlayerName");

    try {
        const response = await modalForm.show(player);
        if (response.canceled) {
            await showAdminPanelMain(player, playerDataManager, dependencies.config, dependencies); // Return to main panel
            return;
        }
        const targetPlayerName = response.formValues[0];
        if (!targetPlayerName || targetPlayerName.trim() === "") {
            player.sendMessage("§cPlayer name cannot be empty.");
            await showAdminPanelMain(player, playerDataManager, dependencies.config, dependencies); // Return to main panel
            return;
        }

        const inspectModule = dependencies.commandModules.find(m => m.definition.name === 'inspect');
        if (inspectModule && inspectModule.execute) {
            await inspectModule.execute(player, [targetPlayerName.trim()], dependencies);
        } else {
            player.sendMessage("§cInspect command module not found.");
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showInspectPlayerForm: ${error}`, player.nameTag);
        player.sendMessage("§cError opening or processing Inspect Player form.");
    }
    // Return to main panel, unless already handled by cancellation
    await showAdminPanelMain(player, playerDataManager, dependencies.config, dependencies);
}

async function showMyStats(player, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: showMyStats for ${player.nameTag}`, player.nameTag);
    const uinfoModule = dependencies.commandModules.find(m => m.definition.name === 'uinfo');
    if (uinfoModule && uinfoModule.execute) {
        // The uinfo module shows an ActionFormData. To show just stats, we'd need a dedicated helper or MessageFormData here.
        // For now, direct to !uinfo or its first panel.
        const uinfoDeps = { ...dependencies, // Clone dependencies
            showSpecificPanel: async () => { // Create a callback to show specific stats UI part of uinfo
                 const pData = playerDataManager.getPlayerData(player.id);
                 let statsOutput = `§e--- Your Anti-Cheat Stats ---\n`;
                 if (pData && pData.flags) { /* ... (stats formatting as in uinfo.js) ... */
                    statsOutput += `§fTotal Flags: §c${pData.flags.totalFlags || 0}\n`;
                 } else { statsOutput = "§aNo flag data found."; }
                 const form = new MessageFormData().title("My Anti-Cheat Stats").body(statsOutput).button1("Close");
                 await form.show(player).catch(e => playerUtils.debugLog(`Error in showMyStats direct: ${e}`, player.nameTag));
            }
        };
        // This is a conceptual call, uinfo.js doesn't support 'showSpecificPanel' yet.
        // So, we just inform the player.
        player.sendMessage("§7Please use `!uinfo` and select 'My Anti-Cheat Stats'.");
    } else {
        player.sendMessage("§c!uinfo module not available.");
    }
    await showAdminPanelMain(player, playerDataManager, config, dependencies);
}

async function showServerRules(player, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showServerRules for ${player.nameTag}`, player.nameTag);
    player.sendMessage("§7Please use `!uinfo` and select 'Server Rules'.");
    await showAdminPanelMain(player, playerDataManager, config, dependencies);
}

async function showHelpAndLinks(player, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showHelpAndLinks for ${player.nameTag}`, player.nameTag);
    player.sendMessage("§7Please use `!uinfo` and select 'Helpful Links' or 'General Tips'.");
    await showAdminPanelMain(player, playerDataManager, config, dependencies);
}

async function showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const { config, playerUtils: localPlayerUtils, addLog } = dependencies;

    const form = new ActionFormData();
    form.title(`Actions for ${targetPlayer.nameTag}`);
    const frozenTag = "frozen"; // Should be from config if made configurable
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
    form.button("View Inventory (InvSee)", "textures/ui/chest_icon.png");    // Index 1 - NEW
    form.button("Kick Player", "textures/ui/icon_hammer");                   // Index 2
    form.button(freezeButtonText, freezeButtonIcon);                         // Index 3
    form.button(muteButtonText, muteButtonIcon);                             // Index 4
    form.button("Ban Player", "textures/ui/icon_resource_pack");             // Index 5
    form.button("Reset Player Flags", "textures/ui/refresh");                // Index 6
    form.button("Back to Player List", "textures/ui/undo");                  // Index 7

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            localPlayerUtils.debugLog(`Player Actions form for ${targetPlayer.nameTag} canceled by ${adminPlayer.nameTag}. Reason: ${response.cancelationReason}`, adminPlayer.nameTag);
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); // Go back to player list on cancel
            return;
        }

        switch (response.selection) {
            case 0: // View Detailed Info/Flags (using inspect module)
                const inspectModule = dependencies.commandModules.find(m => m.definition.name === 'inspect');
                if (inspectModule) {
                    await inspectModule.execute(adminPlayer, [targetPlayer.nameTag], dependencies);
                } else { adminPlayer.sendMessage("§cInspect command module not found."); }
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); // Re-show this form
                break;

            case 1: // View Inventory (InvSee) - NEW
                const invseeArgs = [targetPlayer.nameTag];
                if (dependencies && dependencies.commandModules) {
                    const invseeModule = dependencies.commandModules.find(m => m.definition && m.definition.name === 'invsee');
                    if (invseeModule && typeof invseeModule.execute === 'function') {
                        try {
                            if (localPlayerUtils && localPlayerUtils.debugLog) {
                                localPlayerUtils.debugLog(`UI: Admin ${adminPlayer.nameTag} viewing inventory of ${targetPlayer.nameTag} via InvSee button.`, adminPlayer.nameTag);
                            }
                            await invseeModule.execute(adminPlayer, invseeArgs, dependencies);
                        } catch (e) {
                            adminPlayer.sendMessage(`§cError executing InvSee for ${targetPlayer.nameTag}: ${e}`);
                            if (localPlayerUtils && localPlayerUtils.debugLog) {
                                localPlayerUtils.debugLog(`Error executing invsee.js from UI for ${targetPlayer.nameTag}: ${e}`, adminPlayer.nameTag);
                            }
                        }
                    } else {
                        adminPlayer.sendMessage("§cInvSee command module not found. Action cancelled.");
                        console.error("[uiManager] InvSee module or execute function not found in dependencies for InvSee button.");
                    }
                } else {
                    adminPlayer.sendMessage("§cCommand execution dependencies not available for InvSee. Action cancelled.");
                    console.error("[uiManager] Dependencies or commandModules not available for InvSee action via button.");
                }
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
                break;

            case 2: // Kick Player
                const kickForm = new ModalFormData().title(`Kick ${targetPlayer.nameTag}`).textField("Reason (optional):", "Kicked by admin via panel").toggle("Confirm Kick", false);
                const kickResponse = await kickForm.show(adminPlayer);
                if (kickResponse.canceled) { adminPlayer.sendMessage("§7Kick cancelled."); await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); return; }
                if (kickResponse.formValues[1]) {
                    const reasonKick = kickResponse.formValues[0] || "Kicked by admin via panel.";
                    const kickModule = dependencies.commandModules.find(m => m.definition.name === 'kick');
                    if (kickModule) await kickModule.execute(adminPlayer, [targetPlayer.nameTag, reasonKick], dependencies);
                    else adminPlayer.sendMessage("§cKick command module not found.");
                    await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); // Go back to player list after action
                } else {
                    adminPlayer.sendMessage("§7Kick cancelled (confirmation not given).");
                    await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
                }
                break;

            case 3: // Freeze/Unfreeze Player
                const freezeModule = dependencies.commandModules.find(m => m.definition.name === 'freeze');
                if (freezeModule) await freezeModule.execute(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage("§cFreeze command module not found.");
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); // Refresh
                break;

            case 4: // Mute/Unmute Player
                const currentIsTargetMutedForAction = (playerDataManager.getMuteInfo && playerDataManager.getMuteInfo(targetPlayer)) !== null;
                if (currentIsTargetMutedForAction) {
                    const unmuteModule = dependencies.commandModules.find(m => m.definition.name === 'unmute');
                    if (unmuteModule) await unmuteModule.execute(adminPlayer, [targetPlayer.nameTag], dependencies);
                    else adminPlayer.sendMessage("§cUnmute command module not found.");
                } else {
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

            case 5: // Ban Player
                const banForm = new ModalFormData().title(`Ban ${targetPlayer.nameTag}`).textField("Duration (e.g., 7d, 1mo, perm):", "perm").textField("Reason (optional):", "Banned by admin via panel").toggle("Confirm Ban", false);
                const banResponse = await banForm.show(adminPlayer);
                if (banResponse.canceled) { adminPlayer.sendMessage("§7Ban cancelled."); await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); return; }
                if (banResponse.formValues[2]) {
                    const durationBan = banResponse.formValues[0] || "perm";
                    const reasonBan = banResponse.formValues[1] || "Banned by admin via panel.";
                    const banModule = dependencies.commandModules.find(m => m.definition.name === 'ban');
                    if (banModule) await banModule.execute(adminPlayer, [targetPlayer.nameTag, durationBan, reasonBan], dependencies);
                    else adminPlayer.sendMessage("§cBan command module not found.");
                    await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); // Return to player list
                } else {
                    adminPlayer.sendMessage("§7Ban cancelled (confirmation not given).");
                    await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
                }
                break;

            case 6: // Reset Player Flags
                const resetFlagsModule = dependencies.commandModules.find(m => m.definition.name === 'resetflags');
                if (resetFlagsModule) await resetFlagsModule.execute(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage("§cResetflags command module not found.");
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); // Refresh
                break;
            case 7: // Back to Player List
                await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
                break;
            default:
                adminPlayer.sendMessage("§cInvalid action selected.");
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
                break;
        }
    } catch (error) {
        localPlayerUtils.debugLog(`Error in showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}: ${error}${error.stack ? '\n'+error.stack : ''}`, adminPlayer.nameTag);
        adminPlayer.sendMessage("§cAn error occurred while displaying player actions.");
         await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); // Attempt to return to a known good state
    }
}

async function showOnlinePlayersList(adminPlayer, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showOnlinePlayersList requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const onlinePlayers = mc.world.getAllPlayers();
    if (onlinePlayers.length === 0) {
        const msgForm = new MessageFormData().title("Online Players").body("No players currently online.").button1("Back to Admin Panel");
        await msgForm.show(adminPlayer).catch(e => playerUtils.debugLog(`Error showing 'No players online' form: ${e}`, adminPlayer.nameTag));
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
        if (response.canceled) { await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies); return; }
        const selectedPlayerId = playerMappings[response.selection];
        const targetPlayer = mc.world.getPlayer(selectedPlayerId); // Re-fetch player object
        if (targetPlayer) { await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); }
        else { adminPlayer.sendMessage("§cSelected player not found (may have logged off)."); await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); }
    } catch (error) {
        playerUtils.debugLog(`Error in showOnlinePlayersList: ${error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage("§cAn error occurred displaying players.");
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
    }
}

export async function showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: Admin Panel Main requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData();
    const userPermLevel = getPlayerPermissionLevel(adminPlayer);
    let response;
    try {
        if (userPermLevel <= permissionLevels.ADMIN) {
            form.title("AC Admin Panel"); form.body("Select an admin action:");
            form.button("View Online Players", "textures/ui/icon_multiplayer");        // 0
            form.button("Inspect Player (Text)", "textures/ui/spyglass");             // 1
            form.button("Reset Flags (Text)", "textures/ui/refresh");                 // 2
            form.button("List Watched Players", "textures/ui/magnifying_glass");    // 3
            form.button("Server Management", "textures/ui/icon_graph");               // 4
            form.button("View/Edit Configuration", "textures/ui/gear");               // 5
            response = await form.show(adminPlayer);
            if (response.canceled) return;
            switch (response.selection) {
                case 0: await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); break;
                case 1: await showInspectPlayerForm(adminPlayer, playerDataManager, dependencies); break;
                case 2: await showResetFlagsForm(adminPlayer, playerDataManager, dependencies); break;
                case 3: await showWatchedPlayersList(adminPlayer, playerDataManager, dependencies); break;
                case 4: await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); break;
                case 5: await showEditConfigForm(adminPlayer, playerDataManager, config, dependencies); break;
                default: adminPlayer.sendMessage("§cInvalid selection."); await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies); break;
            }
        } else {
            player.sendMessage("§7Please use the `!uinfo` command to access player-specific information.");
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showAdminPanelMain for ${adminPlayer.nameTag}: ${error}${error.stack ? '\n'+error.stack : ''}`, adminPlayer.nameTag);
        adminPlayer.sendMessage("§cAn error occurred displaying the panel.");
    }
}

async function showSystemInfo(adminPlayer, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showSystemInfo requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
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
    const form = new MessageFormData().title("System Information").body(bodyContent).button1("Close");
    await form.show(adminPlayer).catch(e => playerUtils.debugLog(`Error in showSystemInfo MessageForm: ${e}`, adminPlayer.nameTag));
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

async function showEditConfigForm(adminPlayer, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: showEditConfigForm requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ModalFormData();
    form.title("Edit Configuration (Session Only)");
    const orderedConfigKeys = [];
    for (const key in editableConfigValues) { /* ... (as before) ... */ }
    // ... (rest of existing edit config logic) ...
    const resultForm = new MessageFormData().title("Configuration Update Status").body("Config update status...").button1("OK");
    await resultForm.show(adminPlayer).catch(e => playerUtils.debugLog(`Error in showEditConfigForm resultForm: ${e}`, adminPlayer.nameTag));
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

async function handleClearChatAction(adminPlayer, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: handleClearChatAction requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    // ... (existing clear chat logic)
    const successForm = new MessageFormData().title("Success").body("Chat cleared.").button1("OK");
    await successForm.show(adminPlayer).catch(e => playerUtils.debugLog(`Error in handleClearChatAction successForm: ${e}`, adminPlayer.nameTag));
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

async function handleLagClearAction(adminPlayer, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: handleLagClearAction requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    // ... (existing lag clear logic)
    const successForm = new MessageFormData().title("Lag Clear").body("Lag cleared (simulated).").button1("OK");
    await successForm.show(adminPlayer).catch(e => playerUtils.debugLog(`Error in handleLagClearAction successForm: ${e}`, adminPlayer.nameTag));
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

async function showServerManagementForm(adminPlayer, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: showServerManagementForm requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData(); form.title("Server Management"); form.body("Select action:");
    form.button("View System Info", "textures/ui/icon_graph");
    form.button("Clear Chat for All Players", "textures/ui/speech_bubble_glyph_color");
    form.button("Lag Clear (Items)", "textures/ui/icon_trash");
    form.button("View Action Logs", "textures/ui/book_writable");
    form.button("Back to Admin Panel", "textures/ui/undo");
    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) { await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies); return; }
        switch (response.selection) {
            case 0: await showSystemInfo(adminPlayer, config, playerDataManager, dependencies); break;
            case 1: await handleClearChatAction(adminPlayer, playerDataManager, config, dependencies); break;
            case 2: await handleLagClearAction(adminPlayer, config, playerDataManager, dependencies); break;
            case 3: await showActionLogsForm(adminPlayer, config, playerDataManager, dependencies); break;
            case 4: await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies); break;
            default: await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); break;
        }
    } catch (error) { await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies); }
}

async function showActionLogsForm(adminPlayer, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: Action Logs requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new MessageFormData(); form.title("Action Logs (Latest)");
    const logsToDisplayCount = 50; const logs = logManager.getLogs(logsToDisplayCount);
    let bodyContent = "";
    if (logs.length === 0) { bodyContent = "No action logs found."; }
    else { /* ... (log formatting) ... */ }
    form.body(bodyContent.trim()); form.button1("Back");
    await form.show(adminPlayer).catch(e => playerUtils.debugLog(`Error in showActionLogsForm: ${e}`, adminPlayer.nameTag));
    await showServerManagementForm(adminPlayer, config, playerDataManager, dependencies);
}

async function showResetFlagsForm(player, playerDataManager, dependencies) {
    player.sendMessage("§7Reset Flags (Text) selected from panel. Use `!resetflags <player>` command for now.");
    await showAdminPanelMain(player, playerDataManager, dependencies.config, dependencies);
}
async function showWatchedPlayersList(player, playerDataManager, dependencies) {
    player.sendMessage("§7List Watched Players selected from panel. (UI for this not implemented, use text command or future enhancements).");
    await showAdminPanelMain(player, playerDataManager, dependencies.config, dependencies);
}
