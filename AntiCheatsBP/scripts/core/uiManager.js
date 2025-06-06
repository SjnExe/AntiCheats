import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import * as playerUtils from '../utils/playerUtils.js';
import { getPlayerPermissionLevel } from '../utils/playerUtils.js';
import { permissionLevels } from './rankManager.js';
// getMuteInfo, addMute, removeMute are part of playerDataManager, passed in dependencies for command modules.
import * as logManager from './logManager.js';
import { editableConfigValues, updateConfigValue } from '../config.js';

/** @todo Add JSDoc */
async function showInspectPlayerForm(player, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: Inspect Player form requested by ${player.nameTag}`, player.nameTag);
    const modalForm = new ModalFormData();
    modalForm.title("Inspect Player Data (Text)");
    modalForm.textField("Enter Player Name:", "TargetPlayerName");

    try {
        const response = await modalForm.show(player);
        if (response.canceled) {
            playerUtils.debugLog(`Inspect Player (Text) form cancelled by ${player.nameTag}. Reason: ${response.cancelationReason}`, player.nameTag);
            return;
        }
        const targetPlayerName = response.formValues[0];
        if (!targetPlayerName || targetPlayerName.trim() === "") {
            player.sendMessage("§cPlayer name cannot be empty.");
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
    // No automatic navigation back to main panel after this text-based inspect.
}

/** @todo Add JSDoc */
async function showMyStats(player, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: showMyStats for ${player.nameTag}`, player.nameTag);
    player.sendMessage("§7Please use the `!uinfo` command and select 'My Anti-Cheat Stats'.");
    // No automatic navigation as this is typically a final action from a user-facing part of a menu
}

/** @todo Add JSDoc */
async function showServerRules(player, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showServerRules for ${player.nameTag}`, player.nameTag);
    player.sendMessage("§7Please use `!uinfo` and select 'Server Rules'.");
}

/** @todo Add JSDoc */
async function showHelpAndLinks(player, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showHelpAndLinks for ${player.nameTag}`, player.nameTag);
    player.sendMessage("§7Please use `!uinfo` and select 'Helpful Links' or 'General Tips'.");
}

/** @todo Add JSDoc */
async function showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const { config, playerUtils: localPlayerUtils } = dependencies; // Removed addLog as it's in dependencies

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

    form.button("View Detailed Info/Flags", "textures/ui/magnifying_glass");       // Index 0
    form.button("View Inventory (InvSee)", "textures/ui/chest_icon.png");          // Index 1
    form.button("Kick Player", "textures/ui/icon_hammer");                         // Index 2
    form.button(freezeButtonText, freezeButtonIcon);                               // Index 3
    form.button(muteButtonText, muteButtonIcon);                                   // Index 4
    form.button("Ban Player", "textures/ui/icon_resource_pack");                   // Index 5
    form.button("Reset Player Flags", "textures/ui/refresh");                      // Index 6
    form.button("Back to Player List", "textures/ui/undo");                        // Index 7

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            localPlayerUtils.debugLog(`Player Actions form for ${targetPlayer.nameTag} canceled by ${adminPlayer.nameTag}. Reason: ${response.cancelationReason}`, adminPlayer.nameTag);
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
            return;
        }

        let commandModule; // To store the found command module

        switch (response.selection) {
            case 0: // View Detailed Info/Flags
                commandModule = dependencies.commandModules.find(m => m.definition.name === 'inspect');
                if (commandModule) await commandModule.execute(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage("§cInspect command module not found.");
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
                break;
            case 1: // View Inventory (InvSee)
                commandModule = dependencies.commandModules.find(m => m.definition.name === 'invsee');
                if (commandModule) await commandModule.execute(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage("§cInvSee command module not found.");
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
                break;
            case 2: // Kick Player
                // ... (kick logic using modal form and kickModule.execute)
                await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); // Go back to player list after action
                break;
            case 3: // Freeze/Unfreeze Player
                commandModule = dependencies.commandModules.find(m => m.definition.name === 'freeze');
                if (commandModule) await commandModule.execute(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage("§cFreeze command module not found.");
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
                break;
            case 4: // Mute/Unmute Player
                // ... (mute/unmute logic using modal form and respective modules)
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
                break;
            case 5: // Ban Player
                // ... (ban logic using modal form and banModule.execute)
                await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
                break;
            case 6: // Reset Player Flags
                commandModule = dependencies.commandModules.find(m => m.definition.name === 'resetflags');
                if (commandModule) await commandModule.execute(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage("§cResetflags command module not found.");
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
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
        await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
    }
}

async function showOnlinePlayersList(adminPlayer, playerDataManager, dependencies) {
    // ... (existing function, ensure all calls to showAdminPanelMain/showPlayerActionsForm pass dependencies)
    // Example modification for calls:
    // if (response.canceled) { await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies); return; }
    // if (targetPlayer) { await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); }
    // else { ... await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); }
    // catch { ... await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies); }
/** @todo Add JSDoc */
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
        const targetPlayer = mc.world.getPlayer(selectedPlayerId);
        if (targetPlayer) { await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); }
        else { adminPlayer.sendMessage("§cSelected player not found (may have logged off)."); await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); }
    } catch (error) {
        playerUtils.debugLog(`Error in showOnlinePlayersList: ${error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage("§cAn error occurred displaying players.");
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
    }
}

export async function showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies) {
    // ... (existing function, ensure all calls to other UI forms pass dependencies)
    // Example modification for calls:
    // case 0: await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); break;
    // case 1: await showInspectPlayerForm(adminPlayer, playerDataManager, dependencies); break;
    // case 4: await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); break;
    playerUtils.debugLog(`UI: Admin Panel Main requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData();
    const userPermLevel = getPlayerPermissionLevel(adminPlayer);
    try {
        if (userPermLevel <= permissionLevels.admin) {
            form.title("AC Admin Panel"); form.body("Select an admin action:");
            form.button("View Online Players", "textures/ui/icon_multiplayer");        // 0
            form.button("Inspect Player (Text)", "textures/ui/spyglass");             // 1
            form.button("Reset Flags (Text)", "textures/ui/refresh");                 // 2
            form.button("List Watched Players", "textures/ui/magnifying_glass");    // 3
            form.button("Server Management", "textures/ui/icon_graph");               // 4
            form.button("View/Edit Configuration", "textures/ui/gear");               // 5
            const response = await form.show(adminPlayer);
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
            adminPlayer.sendMessage("§7Please use the `!uinfo` command to access player-specific information.");
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showAdminPanelMain for ${adminPlayer.nameTag}: ${error}${error.stack ? '\n'+error.stack : ''}`, adminPlayer.nameTag);
        adminPlayer.sendMessage("§cAn error occurred displaying the panel.");
    }
}

async function showSystemInfo(adminPlayer, config, playerDataManager, dependencies) {
    // ... (ensure call to showServerManagementForm passes dependencies)
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

async function showEditConfigForm(adminPlayer, playerDataManager, config, dependencies) {
    // ... (ensure call to showServerManagementForm passes dependencies)
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

async function handleClearChatAction(adminPlayer, playerDataManager, config, dependencies) {
    // ... (ensure call to showServerManagementForm passes dependencies)
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

async function handleLagClearAction(adminPlayer, config, playerDataManager, dependencies) {
    // ... (ensure call to showServerManagementForm passes dependencies)
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

// --- NEW FUNCTIONS START ---
async function showModLogTypeSelectionForm(adminPlayer, dependencies, currentFilterName = null) {
    const { playerDataManager, config, playerUtils: localPlayerUtils } = dependencies;
    const form = new ActionFormData();
    form.title("Select Moderation Log Type");

    let bodyText = "View Ban/Unban or Mute/Unmute logs.";
    if (currentFilterName) {
        bodyText += `\n§eCurrent Filter: ${currentFilterName}§r`;
    } else {
        bodyText += `\n§7No player name filter active.§r`;
    }
    form.body(bodyText);

    form.button("View Ban/Unban Logs", "textures/ui/icon_alert");
    form.button("View Mute/Unmute Logs", "textures/ui/speaker_glyph_color");

    if (currentFilterName) {
        form.button(`Clear Player Filter (${currentFilterName})`, "textures/ui/cancel");
    } else {
        form.button("Filter by Player Name", "textures/ui/magnifying_glass");
    }
    form.button("Back to Server Management", "textures/ui/undo");

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
            return;
        }

        switch (response.selection) {
            case 0: // View Ban/Unban Logs
                await showLogViewerForm(adminPlayer, dependencies, ['ban', 'unban'], currentFilterName, "Ban/Unban Logs");
                break;
            case 1: // View Mute/Unmute Logs
                await showLogViewerForm(adminPlayer, dependencies, ['mute', 'unmute'], currentFilterName, "Mute/Unmute Logs");
                break;
            case 2: // Filter by Player Name or Clear Filter
                if (currentFilterName) {
                    adminPlayer.sendMessage("§aPlayer name filter cleared.");
                    await showModLogTypeSelectionForm(adminPlayer, dependencies, null);
                } else {
                    const modalFilter = new ModalFormData();
                    modalFilter.title("Filter Logs by Player Name");
                    modalFilter.textField("Enter Player Name (leave blank for no filter):", "PlayerName");
                    const modalResponse = await modalFilter.show(adminPlayer);
                    if (modalResponse.canceled) {
                        await showModLogTypeSelectionForm(adminPlayer, dependencies, currentFilterName);
                        return;
                    }
                    const newFilter = modalResponse.formValues[0];
                    if (newFilter && newFilter.trim() !== "") {
                        adminPlayer.sendMessage(`§aLog filter set to: ${newFilter.trim()}`);
                        await showModLogTypeSelectionForm(adminPlayer, dependencies, newFilter.trim());
                    } else {
                        adminPlayer.sendMessage("§7Filter input was blank. No filter set.");
                        await showModLogTypeSelectionForm(adminPlayer, dependencies, null);
                    }
                }
                break;
            case 3: // Back
                await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
                break;
        }
    } catch (e) {
        if (localPlayerUtils && localPlayerUtils.debugLog) localPlayerUtils.debugLog(`Error in showModLogTypeSelectionForm: ${e}`, adminPlayer.nameTag);
        adminPlayer.sendMessage("§cError displaying log type selection form.");
        await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
    }
}

async function showLogViewerForm(adminPlayer, dependencies, logActionTypesArray, filterPlayerName = null, logTypeName = "Logs") {
    const { logManager: depLogManager, playerUtils: localPlayerUtils, playerDataManager, config } = dependencies;
    const form = new MessageFormData();

    let title = logTypeName;
    if (filterPlayerName) {
        title += ` for "${filterPlayerName}"`;
    }
    form.title(title);

    const displayLimit = 50;
    let bodyContent = "";

    try {
        const allLogs = depLogManager.getLogs(200); // Get more logs for effective filtering
        let filteredLogs = allLogs.filter(logEntry => {
            let typeMatch = logActionTypesArray.includes(logEntry.actionType);
            let nameMatch = true;
            if (filterPlayerName) {
                nameMatch = (logEntry.targetName && logEntry.targetName.toLowerCase().includes(filterPlayerName.toLowerCase())) ||
                            (logEntry.adminName && logEntry.adminName.toLowerCase().includes(filterPlayerName.toLowerCase()));
            }
            return typeMatch && nameMatch;
        });

        const logsToDisplay = filteredLogs.slice(0, displayLimit);

        if (logsToDisplay.length === 0) {
            bodyContent = "No matching logs found with current filters.";
        } else {
            logsToDisplay.forEach(log => {
                const timestampStr = new Date(log.timestamp).toLocaleString();
                let line = `§7[${timestampStr}] §c${log.adminName}§r ${log.actionType} §b${log.targetName || 'N/A'}§r`;
                if (log.duration) line += ` §7(Dur: ${log.duration}§r)`;
                if (log.reason) line += ` §7(Reason: ${log.reason}§r)`;
                if (log.details) line += ` §7(Details: ${log.details}§r)`;
                line += "\n";
                bodyContent += line;
            });
            if (filteredLogs.length > displayLimit) {
                bodyContent += `\n§o(Showing latest ${displayLimit} of ${filteredLogs.length} matching logs)§r`;
            }
        }
    } catch (e) {
        bodyContent = "§cError retrieving or processing logs.";
        if (localPlayerUtils && localPlayerUtils.debugLog) localPlayerUtils.debugLog(`Error in showLogViewerForm log processing: ${e}`, adminPlayer.nameTag);
    }

    form.body(bodyContent.trim());
    form.button1("Back");

    try {
        await form.show(adminPlayer);
    } catch (e) {
        if (localPlayerUtils && localPlayerUtils.debugLog) localPlayerUtils.debugLog(`Error displaying LogViewerForm: ${e}`, adminPlayer.nameTag);
    }
    await showModLogTypeSelectionForm(adminPlayer, dependencies, filterPlayerName);
}
// --- NEW FUNCTIONS END ---


async function showServerManagementForm(adminPlayer, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: showServerManagementForm requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData(); form.title("Server Management"); form.body("Select action:");
    form.button("View System Info", "textures/ui/icon_graph");                 // 0
    form.button("Clear Chat for All Players", "textures/ui/speech_bubble_glyph_color"); // 1
    form.button("Lag Clear (Items)", "textures/ui/icon_trash");               // 2
    form.button("View Action Logs (All)", "textures/ui/book_writable");       // 3 (General Action Logs)
    form.button("View Moderation Logs", "textures/ui/book_edit_default");     // 4 (New: Ban/Mute Logs)
    form.button("Back to Admin Panel", "textures/ui/undo");                   // 5

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) { await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies); return; }
        switch (response.selection) {
            case 0: await showSystemInfo(adminPlayer, config, playerDataManager, dependencies); break;
            case 1: await handleClearChatAction(adminPlayer, playerDataManager, config, dependencies); break;
            case 2: await handleLagClearAction(adminPlayer, config, playerDataManager, dependencies); break;
            case 3: await showActionLogsForm(adminPlayer, config, playerDataManager, dependencies); break;
            case 4: await showModLogTypeSelectionForm(adminPlayer, dependencies, null); break; // New Call
            case 5: await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies); break;
            default: await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); break;
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showServerManagementForm for ${adminPlayer.nameTag}: ${error}${error.stack ? '\n'+error.stack : ''}`, adminPlayer.nameTag);
        await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies);
    }
}

async function showActionLogsForm(adminPlayer, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: Action Logs requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new MessageFormData(); form.title("Action Logs (All - Latest)");
    const logsToDisplayCount = 50;
    const logs = logManager.getLogs(logsToDisplayCount); // logManager is directly available via import
    let bodyContent = "";
    if (logs.length === 0) { bodyContent = "No action logs found."; }
    else {
        for (const logEntry of logs) {
            const timestampStr = new Date(logEntry.timestamp).toLocaleString();
            let line = `§7[${timestampStr}] §e${logEntry.adminName || logEntry.playerName}§r ${logEntry.actionType} §b${logEntry.targetName || ''}§r`;
            if (logEntry.duration) line += ` (§7Dur: ${logEntry.duration}§r)`;
            if (logEntry.reason) line += ` (§7Reason: ${logEntry.reason}§r)`;
            if (logEntry.details) line += ` (§7Details: ${logEntry.details}§r)`;
            line += "\n";
            bodyContent += line;
        }
        if (logs.length === logsToDisplayCount && logs.length > 0) {
            bodyContent += `\n§o(Displaying latest ${logsToDisplayCount} logs. Older logs may exist.)`;
        }
    }
    form.body(bodyContent.trim()); form.button1("Back");
    await form.show(adminPlayer).catch(e => playerUtils.debugLog(`Error in showActionLogsForm: ${e}`, adminPlayer.nameTag));
    await showServerManagementForm(adminPlayer, config, playerDataManager, dependencies);
}

async function showResetFlagsForm(player, playerDataManager, dependencies) {
    // This form could call the 'resetflags' command module
    const resetFlagsModule = dependencies.commandModules.find(m => m.definition.name === 'resetflags');
    if (resetFlagsModule) {
        const modalForm = new ModalFormData().title("Reset Player Flags (Text Entry)");
        modalForm.textField("Enter Player Name to Reset Flags:", "TargetPlayerName");
        modalForm.toggle("Confirm Reset", false);
        const response = await modalForm.show(player);
        if (!response.canceled && response.formValues[1]) {
            await resetFlagsModule.execute(player, [response.formValues[0]], dependencies);
        } else {
            player.sendMessage("§7Flag reset cancelled.");
        }
    } else {
        player.sendMessage("§cResetflags command module not found.");
    }
    await showAdminPanelMain(player, playerDataManager, dependencies.config, dependencies);
}
async function showWatchedPlayersList(player, playerDataManager, dependencies) {
    // This form could call a (yet to be created) '!watchlist' command module or use playerDataManager directly
    let body = "§e--- Watched Players ---\n";
    let watchedCount = 0;
    mc.world.getAllPlayers().forEach(p => {
        const pData = playerDataManager.getPlayerData(p.id);
        if (pData && pData.isWatched) {
            body += `§f- ${p.nameTag}\n`;
            watchedCount++;
        }
    });
    if (watchedCount === 0) {
        body = "§7No players are currently being watched.";
    }
    const form = new MessageFormData().title("Watched Players").body(body).button1("OK");
    await form.show(player).catch(e => playerUtils.debugLog(`Error showing watched players list: ${e}`, player.nameTag));
    await showAdminPanelMain(player, playerDataManager, dependencies.config, dependencies);
}
