/**
 * @file AntiCheatsBP/scripts/core/uiManager.js
 * @description Manages the creation and display of various UI forms (Action, Modal, Message) for administrative
 * actions and player information within the AntiCheat system.
 * @version 1.1.0
 */
import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import * as playerUtils from '../utils/playerUtils.js'; // Keep for direct use if any, though dependencies is preferred
import { permissionLevels } from './rankManager.js';
import * as logManagerFile from './logManager.js'; // Use specific import name to avoid conflict
import { editableConfigValues, updateConfigValue } from '../config.js';
import { getString } from './i18n.js';
import { formatSessionDuration } from '../utils/playerUtils.js'; // Added import

// Forward declarations
let showAdminPanelMain;
let showEditConfigForm;
let showOnlinePlayersList;
let showPlayerActionsForm;
let showServerManagementForm;
let showModLogTypeSelectionForm;
let showDetailedFlagsForm;
let showSystemInfo;
let showActionLogsForm;
let showResetFlagsForm;
let showWatchedPlayersList;

/**
 * A reusable helper function to show a confirmation modal.
 * @async
 * @function _showConfirmationModal
 * @param {mc.Player} adminPlayer - The player to show the modal to.
 * @param {string} titleKey - The localization key for the modal title.
 * @param {string} bodyKey - The localization key for the modal body.
 * @param {string} confirmToggleLabelKey - The localization key for the confirmation toggle label.
 * @param {function(): Promise<void>} onConfirmCallback - Async callback to execute if confirmed.
 * @param {import('../types.js').Dependencies} dependencies - The dependencies object.
 * @param {object} [bodyParams={}] - Optional parameters for the bodyKey localization.
 * @returns {Promise<void>}
 */
async function _showConfirmationModal(adminPlayer, titleKey, bodyKey, confirmToggleLabelKey, onConfirmCallback, dependencies, bodyParams = {}) {
    const { playerUtils: depPlayerUtils, logManager: depLogManager } = dependencies; // Destructure for easier access

    const modalForm = new ModalFormData();
    modalForm.title(getString(titleKey));
    modalForm.body(getString(bodyKey, bodyParams));
    modalForm.toggle(getString(confirmToggleLabelKey), false);

    try {
        const response = await modalForm.show(adminPlayer);

        if (response.canceled || !response.formValues[0]) {
            // Assuming "ui.common.actionCancelled" will be added to en_US.js
            adminPlayer.sendMessage(getString("ui.common.actionCancelled"));
            depPlayerUtils.debugLog(`Confirmation modal (title: ${titleKey}) cancelled by ${adminPlayer.nameTag}.`, adminPlayer.nameTag);
            return;
        }

        // Confirmed
        await onConfirmCallback();
        depPlayerUtils.debugLog(`Confirmation modal (title: ${titleKey}) confirmed by ${adminPlayer.nameTag}. Action executed.`, adminPlayer.nameTag);

    } catch (error) {
        depPlayerUtils.debugLog(`Error in _showConfirmationModal (title: ${titleKey}) for ${adminPlayer.nameTag}: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("common.error.genericForm"));
    }
}


async function showInspectPlayerForm(adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils } = dependencies;
    depPlayerUtils.debugLog(`UI: Inspect Player form requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const modalForm = new ModalFormData();
    modalForm.title(getString("ui.inspectPlayerForm.title"));
    modalForm.textField(getString("ui.inspectPlayerForm.textField.label"), getString("ui.inspectPlayerForm.textField.placeholder"));

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled) {
            depPlayerUtils.debugLog(`Inspect Player (Text) form cancelled by ${adminPlayer.nameTag}. Reason: ${response.cancelationReason}`, adminPlayer.nameTag);
            return;
        }
        const targetPlayerName = response.formValues[0];
        if (!targetPlayerName || targetPlayerName.trim() === "") {
            adminPlayer.sendMessage(getString("common.error.nameEmpty"));
            await showInspectPlayerForm(adminPlayer, playerDataManager, dependencies); // Re-show form
            return;
        }

        const commandExecute = dependencies.commandExecutionMap?.get('inspect');
        if (commandExecute) {
            await commandExecute(adminPlayer, [targetPlayerName.trim()], dependencies);
        } else {
            adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "inspect" }));
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showInspectPlayerForm: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("common.error.genericForm"));
    }
}

async function showMyStats(player, dependencies) { // Signature changed
    const { playerDataManager, config, playerUtils: depPlayerUtils } = dependencies; // Destructure from dependencies
    depPlayerUtils.debugLog(`UI: showMyStats for ${player.nameTag}`, player.nameTag);

    const pData = playerDataManager.getPlayerData(player.id);
    let sessionPlaytimeFormatted = getString("common.value.notAvailable");

    if (pData && typeof pData.joinTime === 'number' && pData.joinTime > 0) {
        const durationMs = Date.now() - pData.joinTime;
        sessionPlaytimeFormatted = formatSessionDuration(durationMs);
    }

    const statsForm = new MessageFormData();
    statsForm.title(getString("ui.myStats.title")); // New key: "My Stats"
    statsForm.body(getString("ui.myStats.body", { sessionPlaytime: sessionPlaytimeFormatted })); // New key: "Session Playtime: {sessionPlaytime}\n\nMore stats coming soon!"
    statsForm.button1(getString("common.button.back")); // New key: "Back"

    try {
        await statsForm.show(player);
        // After the form is closed (button pressed or escaped), show the normal user panel again.
        // Pass the original dependencies object which contains playerDataManager and config.
        await showNormalUserPanelMain(player, dependencies.playerDataManager, dependencies.config, dependencies);
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showMyStats for ${player.nameTag}: ${error.stack || error}`, player.nameTag);
        player.sendMessage(getString("common.error.genericForm"));
        // Attempt to return to normal user panel even on error
        await showNormalUserPanelMain(player, dependencies.playerDataManager, dependencies.config, dependencies);
    }
}

async function showServerRules(player, _config, _playerDataManager, _dependencies) {
    playerUtils.debugLog(`UI: showServerRules for ${player.nameTag}`, player.nameTag);
    player.sendMessage(getString("ui.normalPanel.info.useUinfo", { option: "Server Rules" }));
}

async function showHelpAndLinks(player, _config, _playerDataManager, _dependencies) {
    playerUtils.debugLog(`UI: showHelpAndLinks for ${player.nameTag}`, player.nameTag);
    player.sendMessage(getString("ui.normalPanel.info.useUinfo", { option: "Helpful Links or General Tips" }));
}

showPlayerActionsForm = async function (adminPlayer, targetPlayer, playerDataManager, dependencies) {
    const { config, playerUtils: depPlayerUtils, logManager: depLogManager } = dependencies;
    depPlayerUtils.debugLog(`UI: showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}`, adminPlayer.nameTag);

    const form = new ActionFormData();
    form.title(getString("ui.playerActions.title", { targetPlayerName: targetPlayer.nameTag }));

    const targetPData = playerDataManager.getPlayerData(targetPlayer.id);
    const flagCount = targetPData?.flags?.totalFlags ?? 0;
    const isWatched = targetPData?.isWatched ?? false;
    form.body(getString("ui.playerActions.body", { flagCount: flagCount, isWatched: isWatched }));

    const frozenTag = "frozen"; // Consider moving to config if varies
    const isTargetFrozen = targetPlayer.hasTag(frozenTag);
    const freezeButtonText = getString(isTargetFrozen ? "ui.playerActions.button.unfreeze" : "ui.playerActions.button.freeze");
    const freezeButtonIcon = isTargetFrozen ? "textures/ui/icon_unlocked" : "textures/ui/icon_locked";

    const muteInfo = playerDataManager.getMuteInfo?.(targetPlayer);
    const isTargetMuted = muteInfo !== null;
    let muteButtonText;
    if (isTargetMuted) {
        muteButtonText = muteInfo.unmuteTime === Infinity ?
            getString("ui.playerActions.button.unmutePermanent") :
            getString("ui.playerActions.button.unmuteTimed", { time: new Date(muteInfo.unmuteTime).toLocaleTimeString() });
    } else {
        muteButtonText = getString("ui.playerActions.button.mute");
    }
    const muteButtonIcon = isTargetMuted ? "textures/ui/speaker_off_light" : "textures/ui/speaker_on_light";

    form.button(getString("ui.playerActions.button.viewFlags"), "textures/ui/magnifying_glass");
    form.button(getString("ui.playerActions.button.viewInventory"), "textures/ui/chest_icon.png");
    form.button(getString("ui.playerActions.button.teleportTo"), "textures/ui/portal");
    form.button(getString("ui.playerActions.button.teleportHere"), "textures/ui/arrow_down_thin");
    form.button(getString("ui.playerActions.button.kick"), "textures/ui/icon_hammer");
    form.button(freezeButtonText, freezeButtonIcon);
    form.button(muteButtonText, muteButtonIcon);
    form.button(getString("ui.playerActions.button.ban"), "textures/ui/icon_resource_pack");
    form.button(getString("ui.playerActions.button.resetFlags"), "textures/ui/refresh");
    form.button(getString("ui.playerActions.button.clearInventory"), "textures/ui/icon_trash");
    form.button(getString("ui.playerActions.button.backToList"), "textures/ui/undo");

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
            return;
        }

        const showModalAndExecute = async (commandName, titleKey, fields, argsTransform = (vals) => vals, titleParams = {}) => {
            const cmdExec = dependencies.commandExecutionMap?.get(commandName);
            if (!cmdExec) {
                adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: commandName }));
                return false; // Indicate failure or inability to execute
            }
            const modal = new ModalFormData().title(getString(titleKey, titleParams));
            fields.forEach(field => {
                if (field.type === 'textField') modal.textField(getString(field.labelKey), getString(field.placeholderKey));
                if (field.type === 'toggle') modal.toggle(getString(field.labelKey), field.defaultValue);
            });
            const modalResponse = await modal.show(adminPlayer);
            if (modalResponse.canceled) {
                // Using static keys as per previous logic for specific command cancellations
                let cancelledKey = `ui.playerActions.${commandName}.cancelled`; // Default pattern
                if (commandName === 'kick') cancelledKey = "ui.playerActions.kick.cancelled";
                else if (commandName === 'ban') cancelledKey = "ui.playerActions.ban.cancelled";
                else if (commandName === 'mute') cancelledKey = "ui.playerActions.mute.cancelled";
                else console.warn(`[uiManager] Unhandled commandName '${commandName}' for specific cancellation message key in showModalAndExecute.`);

                adminPlayer.sendMessage(getString(cancelledKey)); // getString will return key if not found
                return true; // Indicate modal was handled (cancelled)
            }
            await cmdExec(adminPlayer, argsTransform([targetPlayer.nameTag, ...modalResponse.formValues]), dependencies);
            return true; // Indicate modal was handled (executed)
        };

        let shouldReturnToPlayerList = false;
        let shouldReturnToPlayerActions = true;

        switch (response.selection) {
            case 0: // View Detailed Flags
                await showDetailedFlagsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
                shouldReturnToPlayerActions = false;
                break;
            case 1: // View Inventory
                const invseeExec = dependencies.commandExecutionMap?.get('invsee');
                if (invseeExec) await invseeExec(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "invsee" }));
                break;
            case 2: // Teleport to Player
                try {
                    adminPlayer.teleport(targetPlayer.location, { dimension: targetPlayer.dimension });
                    adminPlayer.sendMessage(getString("ui.playerActions.teleport.toPlayerSuccess", { targetPlayerName: targetPlayer.nameTag }));
                    if (depLogManager?.addLog) {
                        depLogManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'teleport_self_to_player', targetName: targetPlayer.nameTag, details: `Admin ${adminPlayer.nameTag} teleported to ${targetPlayer.nameTag}` });
                    }
                } catch (e) {
                    adminPlayer.sendMessage(getString("ui.playerActions.teleport.error", { errorMessage: e.message }));
                }
                break;
            case 3: // Teleport Player Here
                try {
                    targetPlayer.teleport(adminPlayer.location, { dimension: adminPlayer.dimension });
                    adminPlayer.sendMessage(getString("ui.playerActions.teleport.playerToAdminSuccess", { targetPlayerName: targetPlayer.nameTag }));
                    targetPlayer.sendMessage(getString("ui.playerActions.teleport.playerToAdminNotifyTarget"));
                    if (depLogManager?.addLog) {
                        depLogManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'teleport_player_to_admin', targetName: targetPlayer.nameTag, details: `Admin ${adminPlayer.nameTag} teleported ${targetPlayer.nameTag} to them.` });
                    }
                } catch (e) {
                    adminPlayer.sendMessage(getString("ui.playerActions.teleport.error", { errorMessage: e.message }));
                }
                break;
            case 4: // Kick
                await showModalAndExecute('kick', "ui.playerActions.kick.title",
                    [{ type: 'textField', labelKey: "ui.playerActions.kick.reasonPrompt", placeholderKey: "ui.playerActions.kick.reasonPlaceholder" }],
                    (vals) => [vals[0], vals[1]],
                    { targetPlayerName: targetPlayer.nameTag }
                );
                shouldReturnToPlayerList = true;
                break;
            case 5: // Freeze/Unfreeze
                const freezeExec = dependencies.commandExecutionMap?.get('freeze');
                if (freezeExec) await freezeExec(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "freeze" }));
                break;
            case 6: // Mute/Unmute
                if (isTargetMuted) {
                    const unmuteExec = dependencies.commandExecutionMap?.get('unmute');
                    if (unmuteExec) await unmuteExec(adminPlayer, [targetPlayer.nameTag], dependencies);
                    else adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "unmute" }));
                } else {
                    await showModalAndExecute('mute', "ui.playerActions.mute.title",
                        [{ type: 'textField', labelKey: "ui.playerActions.mute.durationPrompt", placeholderKey: "ui.playerActions.mute.durationPlaceholder" }, { type: 'textField', labelKey: "ui.playerActions.mute.reasonPrompt", placeholderKey: "ui.playerActions.mute.reasonPlaceholder" }],
                        (vals) => [vals[0], vals[1], vals[2]],
                        { targetPlayerName: targetPlayer.nameTag }
                    );
                }
                break;
            case 7: // Ban
                await showModalAndExecute('ban', "ui.playerActions.ban.title",
                    [{ type: 'textField', labelKey: "ui.playerActions.ban.durationPrompt", placeholderKey: "ui.playerActions.ban.durationPlaceholder" }, { type: 'textField', labelKey: "ui.playerActions.ban.reasonPrompt", placeholderKey: "ui.playerActions.ban.reasonPlaceholder" }],
                    (vals) => [vals[0], vals[1], vals[2]],
                    { targetPlayerName: targetPlayer.nameTag }
                );
                shouldReturnToPlayerList = true;
                break;
            case 8: // Reset Flags
                const resetFlagsExec = dependencies.commandExecutionMap?.get('resetflags');
                if (resetFlagsExec) await resetFlagsExec(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "resetflags" }));
                break;
            case 9: // Clear Inventory
                await _showConfirmationModal(
                    adminPlayer,
                    "ui.playerActions.clearInventory.confirmTitle",
                    "ui.playerActions.clearInventory.confirmBody",
                    "ui.playerActions.clearInventory.confirmToggle",
                    async () => { // This is the onConfirmCallback
                        const inventoryComp = targetPlayer.getComponent("minecraft:inventory");
                        if (inventoryComp && inventoryComp.container) {
                            for (let i = 0; i < inventoryComp.container.size; i++) {
                                inventoryComp.container.setItem(i);
                            }
                            adminPlayer.sendMessage(getString("ui.playerActions.clearInventory.success", { targetPlayerName: targetPlayer.nameTag }));
                            if (depLogManager?.addLog) {
                                depLogManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'clear_inventory', targetName: targetPlayer.nameTag, details: `Admin ${adminPlayer.nameTag} cleared inventory for ${targetPlayer.nameTag}` });
                            }
                        } else {
                            adminPlayer.sendMessage(getString("ui.playerActions.clearInventory.fail", { targetPlayerName: targetPlayer.nameTag }));
                        }
                    },
                    dependencies,
                    { targetPlayerName: targetPlayer.nameTag }
                );
                break;
            case 10: // Back to Player List
                shouldReturnToPlayerList = true;
                shouldReturnToPlayerActions = false;
                break;
            default:
                adminPlayer.sendMessage(getString("ui.adminPanel.error.invalidSelection"));
                break;
        }

        if (shouldReturnToPlayerList) {
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
        } else if (shouldReturnToPlayerActions) {
            await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
        }

    } catch (error) {
        depPlayerUtils.debugLog(`Error in showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("ui.playerActions.error.generic"));
        await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); // Fallback navigation
    }
};

showOnlinePlayersList = async function (adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils } = dependencies;
    depPlayerUtils.debugLog(`UI: showOnlinePlayersList requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const onlinePlayers = mc.world.getAllPlayers();

    const form = new ActionFormData();
    form.title(getString("ui.onlinePlayers.title", { playerCount: onlinePlayers.length }));

    if (onlinePlayers.length === 0) {
        form.body(getString("ui.onlinePlayers.noPlayers"));
    } else {
        form.body(getString("ui.onlinePlayers.body"));
    }

    const playerMappings = onlinePlayers.map(p => {
        const targetPData = playerDataManager.getPlayerData(p.id);
        const flagCount = targetPData?.flags?.totalFlags ?? 0;
        form.button(getString("ui.onlinePlayers.button.playerEntry", { playerName: p.nameTag, flagCount: flagCount }), "textures/ui/icon_steve");
        return p.id;
    });

    form.button(getString("ui.button.backToAdminPanel"), "textures/ui/undo");

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled || response.selection === playerMappings.length) {
            await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
            return;
        }

        const selectedPlayerId = playerMappings[response.selection];
        const targetPlayer = mc.world.getPlayer(selectedPlayerId);
        if (targetPlayer) {
            await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
        } else {
            adminPlayer.sendMessage(getString("common.error.playerNotFoundOnline", { playerName: "Selected Player" })); // Consider getting actual name if possible
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); // Refresh list
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showOnlinePlayersList: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("ui.onlinePlayers.error.generic"));
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies); // Fallback
    }
};

showAdminPanelMain = async function (player, playerDataManager, config, dependencies) { // Renamed adminPlayer to player
    const { playerUtils: depPlayerUtils } = dependencies;
    depPlayerUtils.debugLog(`UI: Admin Panel Main requested by ${player.nameTag}`, player.nameTag); // Changed adminPlayer to player
    const form = new ActionFormData();
    const userPermLevel = depPlayerUtils.getPlayerPermissionLevel(player); // Changed adminPlayer to player

    try {
        // --- ADJUSTED PERMISSION ROUTING LOGIC START ---
        if (userPermLevel <= permissionLevels.admin) { // Owner or Admin
            // Existing admin panel logic
            form.title(getString("ui.adminPanel.title"));
            form.body(getString("ui.adminPanel.body", { playerName: player.nameTag })); // Changed adminPlayer to player
            form.button(getString("ui.adminPanel.button.viewPlayers"), "textures/ui/icon_multiplayer");
            form.button(getString("ui.adminPanel.button.inspectPlayerText"), "textures/ui/spyglass");
            form.button(getString("ui.adminPanel.button.resetFlagsText"), "textures/ui/refresh");
            form.button(getString("ui.adminPanel.button.listWatched"), "textures/ui/magnifying_glass");
            form.button(getString("ui.adminPanel.button.serverManagement"), "textures/ui/icon_graph");

            let closeButtonIndex = 5;
            if (userPermLevel === permissionLevels.owner) {
                form.button(getString("ui.adminPanel.button.editConfig"), "textures/ui/gear");
                closeButtonIndex = 6;
            }
            form.button(getString("common.button.close"), "textures/ui/cancel");

            const response = await form.show(player); // Changed adminPlayer to player
            if (response.canceled || response.selection === closeButtonIndex) {
                depPlayerUtils.debugLog(`Admin Panel Main cancelled or closed by ${player.nameTag}.`, player.nameTag); // Changed adminPlayer to player
                return;
            }
            switch (response.selection) {
                case 0: await showOnlinePlayersList(player, playerDataManager, dependencies); break; // Changed adminPlayer to player
                case 1: await showInspectPlayerForm(player, playerDataManager, dependencies); break; // Changed adminPlayer to player
                case 2: await showResetFlagsForm(player, playerDataManager, dependencies); break; // Changed adminPlayer to player
                case 3: await showWatchedPlayersList(player, playerDataManager, dependencies); break; // Changed adminPlayer to player
                case 4: await showServerManagementForm(player, playerDataManager, config, dependencies); break; // Changed adminPlayer to player
                case 5:
                    if (userPermLevel === permissionLevels.owner) {
                        await showEditConfigForm(player, playerDataManager, editableConfigValues, dependencies); // Changed adminPlayer to player
                    }
                    break;
            }
        } else { // Normal user
            await showNormalUserPanelMain(player, playerDataManager, config, dependencies); // Changed adminPlayer to player
            return; // Important to return after showing the normal user panel
        }
        // --- ADJUSTED PERMISSION ROUTING LOGIC END ---

    } catch (error) {
        depPlayerUtils.debugLog(`Error in showAdminPanelMain for ${player.nameTag}: ${error.stack || error}`, player.nameTag); // Changed adminPlayer to player
        player.sendMessage(getString("ui.adminPanel.error.generic")); // Changed adminPlayer to player
    }
};

async function showNormalUserPanelMain(player, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils } = dependencies;
    depPlayerUtils.debugLog(`UI: Normal User Panel Main requested by ${player.nameTag}`, player.nameTag);
    const form = new ActionFormData();
    form.title(getString("ui.normalPanel.title"));
    form.body(getString("ui.normalPanel.body", { playerName: player.nameTag }));
    form.button(getString("ui.normalPanel.button.myStats"), "textures/ui/icon_multiplayer");
    form.button(getString("ui.normalPanel.button.serverRules"), "textures/ui/book_glyph");
    form.button(getString("ui.normalPanel.button.helpLinks"), "textures/ui/lightbulb_idea");
    form.button(getString("common.button.close"), "textures/ui/cancel");

    try {
        const response = await form.show(player);
        if (response.canceled || response.selection === 3) { return; } // Close button
        switch (response.selection) {
            case 0: await showMyStats(player, dependencies); break; // Updated call site
            case 1: await showServerRules(player, config, playerDataManager, dependencies); break;
            case 2: await showHelpAndLinks(player, config, playerDataManager, dependencies); break;
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showNormalUserPanelMain for ${player.nameTag}: ${error.stack || error}`, player.nameTag);
        player.sendMessage(getString("common.error.genericForm"));
    }
}

export { showAdminPanelMain };

showSystemInfo = async function (adminPlayer, config, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager: depLogManager, reportManager, configModule } = dependencies;
    depPlayerUtils.debugLog(`UI: System Info requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const { version } = configModule; // Get version from main config module
    const onlinePlayers = mc.world.getAllPlayers();
    const pDataEntries = playerDataManager.getAllPlayerDataEntries ? playerDataManager.getAllPlayerDataEntries().length : getString("common.value.notApplicable");
    const watchedPlayersCount = onlinePlayers.filter(p => playerDataManager.getPlayerData(p.id)?.isWatched).length;

    let mutedPersistentCount = 0;
    let bannedPersistentCount = 0;
    // This way of counting only counts online players. For a true count, playerDataManager would need to iterate all stored data.
    onlinePlayers.forEach(p => {
        const pData = playerDataManager.getPlayerData(p.id);
        if (pData?.muteInfo && (pData.muteInfo.unmuteTime === Infinity || pData.muteInfo.unmuteTime > Date.now())) {
            mutedPersistentCount++;
        }
        if (pData?.banInfo && (pData.banInfo.unbanTime === Infinity || pData.banInfo.unbanTime > Date.now())) {
            bannedPersistentCount++;
        }
    });

    // Assuming getBorderSettings is available via dependencies or globally
    // For now, this part is simplified.
    const activeBordersCount = ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'].filter(dim => dependencies.worldBorderManager?.getBorderSettings(dim)).length;
    const logCount = depLogManager?.getLogs ? depLogManager.getLogs().length : getString("common.value.notApplicable");
    const reportCount = reportManager?.getReports ? reportManager.getReports().length : getString("common.value.notApplicable");

    const form = new MessageFormData()
        .title(getString("ui.systemInfo.title"))
        .body(
            `${getString("ui.systemInfo.entry.acVersion", { version: version })}\n` +
            `${getString("ui.systemInfo.entry.mcVersion", { version: mc.game.version })}\n` +
            `${getString("ui.systemInfo.entry.serverTime", { time: new Date().toLocaleTimeString() })}\n` +
            `${getString("ui.systemInfo.label.currentTick")}§r §e${mc.system.currentTick}\n` +
            `${getString("ui.systemInfo.label.worldTime")}§r §e${mc.world.getTime()}\n` +
            `${getString("ui.systemInfo.entry.onlinePlayers", { onlineCount: onlinePlayers.length, maxCount: mc.world.maxPlayers })}\n` +
            `${getString("ui.systemInfo.entry.totalPlayerData", { count: pDataEntries })}\n` +
            `${getString("ui.systemInfo.entry.watchedPlayers", { count: watchedPlayersCount })}\n` +
            `${getString("ui.systemInfo.entry.mutedPersistent", { count: mutedPersistentCount })}\n` +
            `${getString("ui.systemInfo.entry.bannedPersistent", { count: bannedPersistentCount })}\n` +
            `${getString("ui.systemInfo.entry.activeWorldBorders", { count: activeBordersCount })}\n` +
            `${getString("ui.systemInfo.entry.logManagerEntries", { count: logCount })}\n` +
            `${getString("ui.systemInfo.entry.reportManagerEntries", { count: reportCount })}`
        )
        .button1(getString("ui.systemInfo.button.backToServerMgmt"));
    await form.show(adminPlayer);
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
};

showEditConfigForm = async function (adminPlayer, playerDataManager, currentEditableConfig, dependencies) {
    const { playerUtils: depPlayerUtils } = dependencies;
    depPlayerUtils.debugLog(`UI: Edit Config Form requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    if (depPlayerUtils.getPlayerPermissionLevel(adminPlayer) !== permissionLevels.owner) {
        adminPlayer.sendMessage(getString("ui.configEditor.error.ownerOnly"));
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
        return;
    }

    const form = new ActionFormData();
    form.title(getString("ui.configEditor.title"));
    form.body(getString("ui.configEditor.body"));

    const configKeys = Object.keys(currentEditableConfig);
    const keyDetailsMapping = [];

    for (const key of configKeys) {
        const currentValue = currentEditableConfig[key];
        const valueType = typeof currentValue;
        let displayValue = String(currentValue);
        if (valueType === 'object' && Array.isArray(currentValue)) {
            displayValue = JSON.stringify(currentValue);
        } else if (valueType === 'object') {
            displayValue = getString("ui.configEditor.button.objectPlaceholder");
        }
        const buttonLabel = displayValue.length > 30 ?
            getString("ui.configEditor.button.formatTruncated", { key: key, type: valueType, value: displayValue.substring(0, 27) }) :
            getString("ui.configEditor.button.format", { key: key, type: valueType, value: displayValue });
        form.button(buttonLabel);
        keyDetailsMapping.push({ name: key, type: valueType, value: currentValue });
    }
    form.button(getString("ui.configEditor.button.backToAdminPanel"), "textures/ui/undo"); // Corrected key if it's admin panel

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            await showServerManagementForm(adminPlayer, playerDataManager, dependencies.config, dependencies); // Navigate back to Server Mgmt
            return;
        }

        if (response.selection === configKeys.length) { // Back button
            await showServerManagementForm(adminPlayer, playerDataManager, dependencies.config, dependencies);
        } else if (response.selection < configKeys.length) {
            const selectedKeyDetail = keyDetailsMapping[response.selection];
            if (selectedKeyDetail.type === 'object' && !Array.isArray(selectedKeyDetail.value)) {
                adminPlayer.sendMessage(getString("ui.configEditor.error.nonArrayObject", { keyName: selectedKeyDetail.name }));
                await showEditConfigForm(adminPlayer, playerDataManager, currentEditableConfig, dependencies);
            } else {
                await showEditSingleConfigValueForm(adminPlayer, selectedKeyDetail.name, selectedKeyDetail.type, selectedKeyDetail.value, dependencies);
            }
        } else {
            adminPlayer.sendMessage(getString("ui.configEditor.error.invalidSelection"));
            await showEditConfigForm(adminPlayer, playerDataManager, currentEditableConfig, dependencies);
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showEditConfigForm: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("ui.configEditor.error.generic"));
        await showServerManagementForm(adminPlayer, playerDataManager, dependencies.config, dependencies); // Fallback
    }
};

async function showEditSingleConfigValueForm(adminPlayer, keyName, keyType, currentValue, dependencies) {
    const { playerDataManager, playerUtils: depPlayerUtils, logManager: depLogManager } = dependencies;
    depPlayerUtils.debugLog(`UI: showEditSingleConfigValueForm for key ${keyName} (type: ${keyType}) requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const modalForm = new ModalFormData();
    modalForm.title(getString("ui.configEditor.valueInput.title", { keyName: keyName }));
    let originalValueForComparison = currentValue;

    switch (keyType) {
        case 'boolean': modalForm.toggle(getString("ui.configEditor.valueInput.boolean.label", { keyName: keyName }), currentValue); break;
        case 'string': modalForm.textField(getString("ui.configEditor.valueInput.string.label", { keyName: keyName }), getString("ui.configEditor.valueInput.string.placeholder"), String(currentValue)); break;
        case 'number': modalForm.textField(getString("ui.configEditor.valueInput.number.label", { keyName: keyName }), getString("ui.configEditor.valueInput.number.placeholder"), String(currentValue)); break;
        case 'object': // Specifically for arrays as per previous logic
            if (Array.isArray(currentValue)) {
                originalValueForComparison = JSON.stringify(currentValue);
                modalForm.textField(getString("ui.configEditor.valueInput.array.label", { keyName: keyName }), getString("ui.configEditor.valueInput.array.placeholder"), JSON.stringify(currentValue));
            } else { /* Should have been handled by caller */ return; }
            break;
        default:
            adminPlayer.sendMessage(getString("ui.configEditor.valueInput.error.typeUnknown", { type: keyType, keyName: keyName }));
            await showEditConfigForm(adminPlayer, playerDataManager, editableConfigValues, dependencies);
            return;
    }

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled) {
            await showEditConfigForm(adminPlayer, playerDataManager, editableConfigValues, dependencies);
            return;
        }
        let newValue = response.formValues[0];
        let failureReason = "";

        switch (keyType) {
            case 'number': const numVal = Number(newValue); if (isNaN(numVal)) failureReason = getString("ui.configEditor.valueInput.error.notANumber"); else newValue = numVal; break;
            case 'object': // Array
                if (Array.isArray(currentValue)) { // Ensure original was array
                    try { const parsedArray = JSON.parse(newValue); if (!Array.isArray(parsedArray)) failureReason = getString("ui.configEditor.valueInput.error.notAnArray"); else newValue = parsedArray; }
                    catch (e) { failureReason = getString("ui.configEditor.valueInput.error.jsonFormat", { errorMessage: e.message }); }
                }
                break;
        }

        if (failureReason) {
            adminPlayer.sendMessage(getString("ui.configEditor.valueInput.error.updateFailed", { keyName: keyName, failureReason: failureReason }));
        } else {
            const valueToCompare = (keyType === 'object' && Array.isArray(newValue)) ? JSON.stringify(newValue) : newValue;
            if (valueToCompare === originalValueForComparison) { // Simplified comparison
                 adminPlayer.sendMessage(getString("ui.configEditor.valueInput.noChange", { keyName: keyName }));
            } else {
                const success = updateConfigValue(keyName, newValue);
                if (success) {
                    adminPlayer.sendMessage(getString("ui.configEditor.valueInput.success", { keyName: keyName, newValue: (typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)) }));
                    if (depLogManager?.addLog) {
                        depLogManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'config_update', targetName: keyName, details: `Value changed from '${originalValueForComparison}' to '${typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)}'` });
                    }
                } else {
                    adminPlayer.sendMessage(getString("ui.configEditor.valueInput.error.updateFailedInternal", { keyName: keyName }));
                }
            }
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showEditSingleConfigValueForm for ${keyName}: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("ui.configEditor.valueInput.error.generic", { keyName: keyName }));
    }
    await showEditConfigForm(adminPlayer, playerDataManager, editableConfigValues, dependencies); // Return to main edit form
}


async function handleClearChatAction(adminPlayer, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils } = dependencies;
    depPlayerUtils.debugLog(`UI: Clear Chat Action requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);

    await _showConfirmationModal(
        adminPlayer,
        "ui.serverManagement.clearChat.confirmTitle",
        "ui.serverManagement.clearChat.confirmBody",
        "ui.serverManagement.clearChat.confirmToggle",
        async () => { // onConfirmCallback
            const clearChatExec = dependencies.commandExecutionMap?.get('clearchat');
            if (clearChatExec) {
                await clearChatExec(adminPlayer, [], dependencies); // Success message handled by command
            } else {
                adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "clearchat" }));
            }
        },
        dependencies
    );
    // Ensure navigation back to the server management form regardless of confirmation outcome (handled by _showConfirmationModal for cancellation message)
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

async function handleLagClearAction(adminPlayer, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils } = dependencies;
    depPlayerUtils.debugLog(`UI: Lag Clear Action requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);

    await _showConfirmationModal(
        adminPlayer,
        "ui.serverManagement.lagClear.confirmTitle",
        "ui.serverManagement.lagClear.confirmBody",
        "ui.serverManagement.lagClear.confirmToggle",
        async () => { // onConfirmCallback
            const lagClearExec = dependencies.commandExecutionMap?.get('lagclear');
            if (lagClearExec) {
                await lagClearExec(adminPlayer, [], dependencies); // Success message handled by command
            } else {
                adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "lagclear" }));
            }
        },
        dependencies
    );
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

showModLogTypeSelectionForm = async function (adminPlayer, dependencies, currentFilterName = null) {
    const { playerDataManager, config, playerUtils: depPlayerUtils, logManager: depLogManager } = dependencies;
    const form = new ActionFormData();
    form.title(getString("ui.modLogSelect.title"));
    form.body(currentFilterName ? getString("ui.modLogSelect.body.filtered", { filterName: currentFilterName }) : getString("ui.modLogSelect.body.all"));
    form.button(getString("ui.modLogSelect.button.banUnban"), "textures/ui/icon_alert");
    form.button(getString("ui.modLogSelect.button.muteUnmute"), "textures/ui/speaker_glyph_color");
    form.button(currentFilterName ? getString("ui.modLogSelect.button.clearFilter", { filterName: currentFilterName }) : getString("ui.modLogSelect.button.filterByName"), currentFilterName ? "textures/ui/cancel" : "textures/ui/magnifying_glass");
    form.button(getString("ui.modLogSelect.button.backToServerMgmt"), "textures/ui/undo");

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) { await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); return; }
        switch (response.selection) {
            case 0: await showLogViewerForm(adminPlayer, dependencies, ['ban', 'unban'], currentFilterName, getString("ui.logViewer.title.banUnban")); break;
            case 1: await showLogViewerForm(adminPlayer, dependencies, ['mute', 'unmute'], currentFilterName, getString("ui.logViewer.title.muteUnmute")); break;
            case 2:
                if (currentFilterName) {
                    adminPlayer.sendMessage(getString("ui.modLogSelect.filterModal.filterCleared"));
                    await showModLogTypeSelectionForm(adminPlayer, dependencies, null);
                } else {
                    const modalFilter = new ModalFormData().title(getString("ui.modLogSelect.filterModal.title"));
                    modalFilter.textField(getString("ui.modLogSelect.filterModal.textField.label"), getString("ui.modLogSelect.filterModal.textField.placeholder"));
                    const modalResponse = await modalFilter.show(adminPlayer);
                    if (modalResponse.canceled) { await showModLogTypeSelectionForm(adminPlayer, dependencies, currentFilterName); return; }
                    const newFilter = modalResponse.formValues[0]?.trim();
                    adminPlayer.sendMessage(newFilter ? getString("ui.modLogSelect.filterModal.filterSet", { filterName: newFilter }) : getString("ui.modLogSelect.filterModal.filterBlank"));
                    await showModLogTypeSelectionForm(adminPlayer, dependencies, newFilter || null);
                }
                break;
            case 3: await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); break;
        }
    } catch (e) {
        depPlayerUtils.debugLog(`Error in showModLogTypeSelectionForm: ${e.stack || e}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("ui.modLogSelect.error.generic"));
        await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); // Fallback
    }
};

async function showLogViewerForm(adminPlayer, dependencies, logActionTypesArray, filterPlayerName = null, logTypeName = "Logs") {
    const { playerDataManager, config, playerUtils: depPlayerUtils, logManager: depLogManager } = dependencies;
    const form = new MessageFormData();
    form.title(filterPlayerName ? getString("ui.logViewer.title.filtered", { logTypeName: logTypeName, filterName: filterPlayerName }) : logTypeName);

    const displayLimit = 50; // Configurable?
    let bodyContent = "";
    try {
        const allLogs = depLogManager.getLogs(200); // Get more logs initially for better filtering
        const filteredLogs = allLogs.filter(logEntry => {
            const typeMatch = logActionTypesArray.includes(logEntry.actionType);
            if (!typeMatch) return false;
            if (filterPlayerName) {
                // Ensure properties exist before calling toLowerCase
                const targetNameMatch = logEntry.targetName && logEntry.targetName.toLowerCase().includes(filterPlayerName.toLowerCase());
                const adminNameMatch = logEntry.adminName && logEntry.adminName.toLowerCase().includes(filterPlayerName.toLowerCase());
                return targetNameMatch || adminNameMatch;
            }
            return true;
        }).slice(0, displayLimit);

        if (filteredLogs.length === 0) {
            bodyContent = getString("ui.logViewer.noLogs");
        } else {
            bodyContent = filteredLogs.map(log => {
                const timestampStr = new Date(log.timestamp).toLocaleString();
                return getString("ui.actionLogs.logEntry", { // Using existing detailed key
                    timestamp: timestampStr,
                    adminNameOrPlayer: log.adminName || log.playerName || 'SYSTEM',
                    actionType: log.actionType,
                    targetNameOrEmpty: log.targetName || '',
                    duration: log.duration ? `${getString("ui.actionLogs.logEntry.durationPrefix")}${log.duration}${getString("ui.actionLogs.logEntry.suffix")}` : "",
                    reason: log.reason ? `${getString("ui.actionLogs.logEntry.reasonPrefix")}${log.reason}${getString("ui.actionLogs.logEntry.suffix")}` : "",
                    details: log.details ? `${getString("ui.actionLogs.logEntry.detailsPrefix")}${log.details}${getString("ui.actionLogs.logEntry.suffix")}` : ""
                }).replace(/\s+\(\s*\)/g, '');
            }).join("\n");

            // Check if more logs were available than shown
            const totalMatchingLogs = allLogs.filter(logEntry => logActionTypesArray.includes(logEntry.actionType) && (!filterPlayerName || ((logEntry.targetName && logEntry.targetName.toLowerCase().includes(filterPlayerName.toLowerCase())) || (logEntry.adminName && logEntry.adminName.toLowerCase().includes(filterPlayerName.toLowerCase()))))).length;
            if (totalMatchingLogs > displayLimit) {
                 bodyContent += "\n" + getString("ui.actionLogs.footer.showingLatest", { count: displayLimit });
            }
        }
    } catch (e) {
        bodyContent = getString("common.error.genericForm");
        depPlayerUtils.debugLog(`Error in showLogViewerForm log processing: ${e.stack || e}`, adminPlayer.nameTag);
    }

    form.body(bodyContent.trim() || getString("ui.actionLogs.body.empty")); // Fallback for empty after trim
    form.button1(getString("ui.logViewer.button.backToLogSelect")); // Key for back button
    await form.show(adminPlayer).catch(e => depPlayerUtils.debugLog(`Error displaying LogViewerForm: ${e.stack || e}`, adminPlayer.nameTag));
    await showModLogTypeSelectionForm(adminPlayer, dependencies, filterPlayerName); // Return to selection form
}

showServerManagementForm = async function (adminPlayer, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils } = dependencies;
    depPlayerUtils.debugLog(`UI: showServerManagementForm requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData();
    form.title(getString("ui.serverManagement.title"));
    form.body(getString("ui.serverManagement.body"));
    form.button(getString("ui.serverManagement.button.systemInfo"), "textures/ui/icon_graph");
    form.button(getString("ui.serverManagement.button.clearChat"), "textures/ui/speech_bubble_glyph_color");
    form.button(getString("ui.serverManagement.button.lagClear"), "textures/ui/icon_trash");
    form.button(getString("ui.serverManagement.button.actionLogs"), "textures/ui/book_writable");
    form.button(getString("ui.serverManagement.button.modLogs"), "textures/ui/book_edit_default");

    let backButtonIndex = 5;
    if (depPlayerUtils.getPlayerPermissionLevel(adminPlayer) === permissionLevels.owner) {
        form.button(getString("ui.serverManagement.button.editConfig"), "textures/ui/gear");
        backButtonIndex = 6;
    }
    form.button(getString("ui.serverManagement.button.backToAdminPanel"), "textures/ui/undo");

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled || response.selection === backButtonIndex) {
            await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies);
            return;
        }
        switch (response.selection) {
            case 0: await showSystemInfo(adminPlayer, config, playerDataManager, dependencies); break;
            case 1: await handleClearChatAction(adminPlayer, playerDataManager, config, dependencies); break;
            case 2: await handleLagClearAction(adminPlayer, playerDataManager, config, dependencies); break;
            case 3: await showActionLogsForm(adminPlayer, config, playerDataManager, dependencies); break;
            case 4: await showModLogTypeSelectionForm(adminPlayer, dependencies, null); break;
            case 5:
                if (depPlayerUtils.getPlayerPermissionLevel(adminPlayer) === permissionLevels.owner) {
                    await showEditConfigForm(adminPlayer, playerDataManager, editableConfigValues, dependencies);
                } // Else, it's the back button (handled above)
                break;
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showServerManagementForm for ${adminPlayer.nameTag}: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("ui.serverManagement.error.generic"));
        await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies); // Fallback
    }
};

showActionLogsForm = async function (adminPlayer, config, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager: depLogManager } = dependencies;
    depPlayerUtils.debugLog(`UI: Action Logs (All) requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new MessageFormData();
    form.title(getString("ui.actionLogs.title"));

    const logsToDisplayCount = 50; // Configurable?
    const logs = depLogManager.getLogs(logsToDisplayCount);
    let bodyContent = getString("ui.actionLogs.bodyHeader") + "\n";

    if (logs.length === 0) {
        bodyContent += getString("ui.actionLogs.noLogs");
    } else {
        bodyContent += logs.map(logEntry => {
            const timestampStr = new Date(logEntry.timestamp).toLocaleString();
            return getString("ui.actionLogs.logEntry", {
                timestamp: timestampStr,
                adminNameOrPlayer: logEntry.adminName || logEntry.playerName || 'SYSTEM',
                actionType: logEntry.actionType,
                targetNameOrEmpty: logEntry.targetName || '',
                duration: logEntry.duration ? `${getString("ui.actionLogs.logEntry.durationPrefix")}${logEntry.duration}${getString("ui.actionLogs.logEntry.suffix")}` : "",
                reason: logEntry.reason ? `${getString("ui.actionLogs.logEntry.reasonPrefix")}${logEntry.reason}${getString("ui.actionLogs.logEntry.suffix")}` : "",
                details: logEntry.details ? `${getString("ui.actionLogs.logEntry.detailsPrefix")}${logEntry.details}${getString("ui.actionLogs.logEntry.suffix")}` : ""
            }).replace(/\s+\(\s*\)/g, '');
        }).join("\n");

        if (logs.length === logsToDisplayCount && depLogManager.getLogs().length > logsToDisplayCount) { // Check if there were more logs than displayed
            bodyContent += "\n" + getString("ui.actionLogs.footer.showingLatest", { count: logsToDisplayCount });
        }
    }
    form.body(bodyContent.trim() || getString("ui.actionLogs.body.empty")); // Fallback for empty
    form.button1(getString("ui.actionLogs.button.backToServerMgmt"));

    await form.show(adminPlayer).catch(e => depPlayerUtils.debugLog(`Error in showActionLogsForm: ${e.stack || e}`, adminPlayer.nameTag));
    await showServerManagementForm(adminPlayer, config, playerDataManager, dependencies); // Navigate back
};

showResetFlagsForm = async function (adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils } = dependencies;
    depPlayerUtils.debugLog(`UI: Reset Flags form requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const resetFlagsExecute = dependencies.commandExecutionMap?.get('resetflags');
    if (!resetFlagsExecute) {
        adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "resetflags" }));
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
        return;
    }

    const modalForm = new ModalFormData().title(getString("ui.resetFlagsForm.title"));
    modalForm.textField(getString("ui.resetFlagsForm.textField.label"), getString("ui.resetFlagsForm.textField.placeholder"));
    modalForm.toggle(getString("ui.resetFlagsForm.toggle.label"), false); // Confirmation toggle

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled || !response.formValues[1]) { // Check toggle value
            adminPlayer.sendMessage(getString("ui.resetFlagsForm.cancelled"));
        } else {
            const targetPlayerName = response.formValues[0];
            if (!targetPlayerName || targetPlayerName.trim() === "") {
                adminPlayer.sendMessage(getString("ui.resetFlagsForm.error.nameEmpty"));
                // Optionally re-show form or navigate back
            } else {
                await resetFlagsExecute(adminPlayer, [targetPlayerName.trim()], dependencies);
            }
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showResetFlagsForm: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("ui.resetFlagsForm.error.generic"));
    }
    // Always navigate back to admin panel after attempt or cancellation
    await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
};

showWatchedPlayersList = async function (adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils } = dependencies;
    depPlayerUtils.debugLog(`UI: Watched Players list requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    let body = getString("ui.watchedPlayers.header") + "\n";
    let watchedCount = 0;
    mc.world.getAllPlayers().forEach(p => { // Only shows online watched players
        const pData = playerDataManager.getPlayerData(p.id);
        if (pData?.isWatched) {
            body += getString("ui.watchedPlayers.playerEntry", { playerName: p.nameTag }) + "\n";
            watchedCount++;
        }
    });

    if (watchedCount === 0) {
        body = getString("ui.watchedPlayers.noPlayers");
    }

    const form = new MessageFormData()
        .title(getString("ui.watchedPlayers.title"))
        .body(body.trim())
        .button1(getString("ui.watchedPlayers.button.ok")); // Or "Back"
    await form.show(adminPlayer).catch(e => depPlayerUtils.debugLog(`Error showing watched players list: ${e.stack || e}`, adminPlayer.nameTag));
    // Navigate back to admin panel after showing the list
    await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
};

showDetailedFlagsForm = async function(adminPlayer, targetPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils } = dependencies;
    depPlayerUtils.debugLog(`UI: Detailed flags for ${targetPlayer.nameTag} requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const pData = playerDataManager.getPlayerData(targetPlayer.id);
    const form = new MessageFormData();
    form.title(getString("ui.detailedFlags.title", { targetPlayerName: targetPlayer.nameTag }));

    let body = "";
    if (pData && pData.flags && Object.keys(pData.flags).length > 1) { // More than just totalFlags
        for (const flagKey in pData.flags) {
            if (flagKey !== 'totalFlags' && pData.flags[flagKey].count > 0) {
                const flagDetail = pData.flags[flagKey];
                const lastDetectionStr = flagDetail.lastDetectionTime ? new Date(flagDetail.lastDetectionTime).toLocaleString() : getString("common.value.notApplicable");
                body += getString("ui.detailedFlags.flagEntry", { flagType: flagKey, count: flagDetail.count, timestamp: lastDetectionStr }) + "\n";
            }
        }
    }
    if (!body) { // If body is still empty after loop
        body = getString("ui.detailedFlags.noFlags");
    }
    form.body(body.trim());
    form.button1(getString("common.button.back"));

    await form.show(adminPlayer).catch(e => depPlayerUtils.debugLog(`Error showing detailed flags: ${e.stack || e}`, adminPlayer.nameTag));
    await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); // Navigate back
};
