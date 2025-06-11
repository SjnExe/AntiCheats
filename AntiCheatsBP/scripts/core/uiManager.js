/**
 * @file AntiCheatsBP/scripts/core/uiManager.js
 * Manages the creation and display of various UI forms (Action, Modal, Message) for administrative
 * actions and player information within the AntiCheat system.
 * @version 1.0.2
 */
import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import * as playerUtils from '../utils/playerUtils.js';
import { permissionLevels } from './rankManager.js';
import * as logManager from './logManager.js';
import { editableConfigValues, updateConfigValue } from '../config.js';
import { getString } from './i18n.js'; // Added for localization

// Forward declarations
let showAdminPanelMain;
let showEditConfigForm;
let showOnlinePlayersList;
let showPlayerActionsForm;
let showServerManagementForm;
let showModLogTypeSelectionForm;
let showDetailedFlagsForm; // Added forward declaration
let showSystemInfo; // Added forward declaration
let showActionLogsForm; // Added forward declaration
let showResetFlagsForm; // Added forward declaration
let showWatchedPlayersList; // Added forward declaration


async function showInspectPlayerForm(adminPlayer, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: Inspect Player form requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const modalForm = new ModalFormData();
    modalForm.title(getString("ui.inspectPlayerForm.title"));
    modalForm.textField(getString("ui.inspectPlayerForm.textField.label"), getString("ui.inspectPlayerForm.textField.placeholder"));

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled) {
            playerUtils.debugLog(`Inspect Player (Text) form cancelled by ${adminPlayer.nameTag}. Reason: ${response.cancelationReason}`, adminPlayer.nameTag);
            return;
        }
        const targetPlayerName = response.formValues[0];
        if (!targetPlayerName || targetPlayerName.trim() === "") {
            adminPlayer.sendMessage(getString("common.error.nameEmpty"));
            await showInspectPlayerForm(adminPlayer, playerDataManager, dependencies);
            return;
        }

        const commandExecute = dependencies.commandExecutionMap?.get('inspect');
        if (commandExecute) {
            await commandExecute(adminPlayer, [targetPlayerName.trim()], dependencies);
        } else {
            adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "inspect" }));
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showInspectPlayerForm: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("common.error.genericForm"));
    }
}

async function showMyStats(player, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: showMyStats for ${player.nameTag}`, player.nameTag);
    player.sendMessage(getString("ui.normalPanel.info.useUinfo", { option: "My Anti-Cheat Stats" }));
}

async function showServerRules(player, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showServerRules for ${player.nameTag}`, player.nameTag);
     player.sendMessage(getString("ui.normalPanel.info.useUinfo", { option: "Server Rules" }));
}

async function showHelpAndLinks(player, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showHelpAndLinks for ${player.nameTag}`, player.nameTag);
    player.sendMessage(getString("ui.normalPanel.info.useUinfo", { option: "Helpful Links or General Tips" }));
}

showPlayerActionsForm = async function (adminPlayer, targetPlayer, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const { config, playerUtils: depPlayerUtils, prefix } = dependencies; // playerUtils from dependencies if needed, else global

    const form = new ActionFormData();
    form.title(getString("ui.playerActions.title", { targetPlayerName: targetPlayer.nameTag }));

    const targetPData = playerDataManager.getPlayerData(targetPlayer.id);
    const flagCount = targetPData?.flags?.totalFlags ?? 0;
    const isWatched = targetPData?.isWatched ?? false;
    form.body(getString("ui.playerActions.body", { flagCount: flagCount, isWatched: isWatched }));

    const frozenTag = "frozen";
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
                return false;
            }
            const modal = new ModalFormData().title(getString(titleKey, titleParams));
            fields.forEach(field => {
                if (field.type === 'textField') modal.textField(getString(field.labelKey), getString(field.placeholderKey));
                if (field.type === 'toggle') modal.toggle(getString(field.labelKey), field.defaultValue);
            });
            const modalResponse = await modal.show(adminPlayer);
            if (modalResponse.canceled) {
                adminPlayer.sendMessage(getString(`ui.playerActions.${commandName}.cancelled`));
                return true;
            }
            await cmdExec(adminPlayer, argsTransform([targetPlayer.nameTag, ...modalResponse.formValues]), dependencies);
            return true;
        };

        let shouldReturnToPlayerList = false;
        let shouldReturnToPlayerActions = true;

        switch (response.selection) {
            case 0: // View Detailed Flags
                await showDetailedFlagsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
                shouldReturnToPlayerActions = false; // showDetailedFlagsForm handles its own back navigation
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
                    if (dependencies.logManager && typeof dependencies.logManager.addLog === 'function') { // Check if logManager and addLog are defined
                        dependencies.logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'teleport_self_to_player', targetName: targetPlayer.nameTag, details: `Admin ${adminPlayer.nameTag} teleported to ${targetPlayer.nameTag}` });
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
                     if (dependencies.logManager && typeof dependencies.logManager.addLog === 'function') {
                        dependencies.logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'teleport_player_to_admin', targetName: targetPlayer.nameTag, details: `Admin ${adminPlayer.nameTag} teleported ${targetPlayer.nameTag} to them.` });
                    }
                } catch (e) {
                    adminPlayer.sendMessage(getString("ui.playerActions.teleport.error", { errorMessage: e.message }));
                }
                break;
            case 4: // Kick
                await showModalAndExecute('kick', "ui.playerActions.kick.title",
                    [{ type: 'textField', labelKey: "ui.playerActions.kick.reasonPrompt", placeholderKey: "ui.playerActions.kick.reasonPlaceholder" }],
                    (vals) => [vals[0], vals[1]], // targetName, reason
                    { targetPlayerName: targetPlayer.nameTag }
                );
                shouldReturnToPlayerList = true;
                break;
            case 5: // Freeze/Unfreeze
                const freezeExec = dependencies.commandExecutionMap?.get('freeze');
                if (freezeExec) await freezeExec(adminPlayer, [targetPlayer.nameTag], dependencies); // Toggle behavior is in command
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
                        (vals) => [vals[0], vals[1], vals[2]], // targetName, duration, reason
                        { targetPlayerName: targetPlayer.nameTag }
                    );
                }
                break;
            case 7: // Ban
                await showModalAndExecute('ban', "ui.playerActions.ban.title",
                    [{ type: 'textField', labelKey: "ui.playerActions.ban.durationPrompt", placeholderKey: "ui.playerActions.ban.durationPlaceholder" }, { type: 'textField', labelKey: "ui.playerActions.ban.reasonPrompt", placeholderKey: "ui.playerActions.ban.reasonPlaceholder" }],
                    (vals) => [vals[0], vals[1], vals[2]], // targetName, duration, reason
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
                {
                    const confirmClearInvForm = new ModalFormData()
                        .title(getString("ui.playerActions.clearInventory.confirmTitle"))
                        .body(getString("ui.playerActions.clearInventory.confirmBody", { targetPlayerName: targetPlayer.nameTag }))
                        .toggle(getString("ui.playerActions.clearInventory.confirmToggle"), false);
                    const confirmClearInvResponse = await confirmClearInvForm.show(adminPlayer);

                    if (confirmClearInvResponse.canceled || !confirmClearInvResponse.formValues[0]) {
                        adminPlayer.sendMessage(getString("ui.playerActions.clearInventory.cancelled"));
                    } else {
                        const inventoryComp = targetPlayer.getComponent("minecraft:inventory");
                        if (inventoryComp && inventoryComp.container) {
                            for (let i = 0; i < inventoryComp.container.size; i++) {
                                inventoryComp.container.setItem(i);
                            }
                            adminPlayer.sendMessage(getString("ui.playerActions.clearInventory.success", { targetPlayerName: targetPlayer.nameTag }));
                            if (dependencies.logManager && typeof dependencies.logManager.addLog === 'function') {
                                dependencies.logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'clear_inventory', targetName: targetPlayer.nameTag, details: `Admin ${adminPlayer.nameTag} cleared inventory for ${targetPlayer.nameTag}` });
                            }
                        } else {
                            adminPlayer.sendMessage(getString("ui.playerActions.clearInventory.fail", { targetPlayerName: targetPlayer.nameTag }));
                        }
                    }
                }
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
        playerUtils.debugLog(`Error in showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("ui.playerActions.error.generic"));
        await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
    }
};

showOnlinePlayersList = async function (adminPlayer, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showOnlinePlayersList requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
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

    form.button(getString("ui.button.backToAdminPanel"), "textures/ui/undo"); // Back button

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled || response.selection === playerMappings.length) { // Last button is Back
            await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
            return;
        }

        const selectedPlayerId = playerMappings[response.selection];
        const targetPlayer = mc.world.getPlayer(selectedPlayerId);
        if (targetPlayer) {
            await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
        } else {
            adminPlayer.sendMessage(getString("common.error.playerNotFoundOnline", { playerName: "Selected Player" }));
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showOnlinePlayersList: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("ui.onlinePlayers.error.generic"));
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
    }
};

showAdminPanelMain = async function (adminPlayer, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: Admin Panel Main requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData();
    const userPermLevel = playerUtils.getPlayerPermissionLevel(adminPlayer);

    try {
        if (userPermLevel > permissionLevels.member) { // Allow members to open their panel
             // For normal users, show a different panel or message.
            await showNormalUserPanelMain(adminPlayer, playerDataManager, config, dependencies);
            return;
        }
        // Admin+ panel
        form.title(getString("ui.adminPanel.title"));
        form.body(getString("ui.adminPanel.body", { playerName: adminPlayer.nameTag }));
        form.button(getString("ui.adminPanel.button.viewPlayers"), "textures/ui/icon_multiplayer");
        form.button(getString("ui.adminPanel.button.inspectPlayerText"), "textures/ui/spyglass");
        form.button(getString("ui.adminPanel.button.resetFlagsText"), "textures/ui/refresh");
        form.button(getString("ui.adminPanel.button.listWatched"), "textures/ui/magnifying_glass");
        form.button(getString("ui.adminPanel.button.serverManagement"), "textures/ui/icon_graph");

        if (userPermLevel === permissionLevels.owner) {
            form.button(getString("ui.adminPanel.button.editConfig"), "textures/ui/gear");
        }
        form.button(getString("common.button.close"), "textures/ui/cancel"); // Close button

        const response = await form.show(adminPlayer);
        if (response.canceled || response.selection === (userPermLevel === permissionLevels.owner ? 6 : 5) ) { // Close button
            playerUtils.debugLog(`Admin Panel Main cancelled or closed by ${adminPlayer.nameTag}.`, adminPlayer.nameTag);
            return;
        }
        switch (response.selection) {
            case 0: await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); break;
            case 1: await showInspectPlayerForm(adminPlayer, playerDataManager, dependencies); break;
            case 2: await showResetFlagsForm(adminPlayer, playerDataManager, dependencies); break;
            case 3: await showWatchedPlayersList(adminPlayer, playerDataManager, dependencies); break;
            case 4: await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); break;
            case 5:
                if (userPermLevel === permissionLevels.owner) {
                    await showEditConfigForm(adminPlayer, playerDataManager, editableConfigValues, dependencies);
                } else { // This index is "Close" for non-owners
                    playerUtils.debugLog(`Admin Panel Main closed by non-owner ${adminPlayer.nameTag}.`, adminPlayer.nameTag);
                }
                break;
            default:
                if (!response.canceled) {
                    adminPlayer.sendMessage(getString("ui.adminPanel.error.invalidSelection"));
                }
                break;
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showAdminPanelMain for ${adminPlayer.nameTag}: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("ui.adminPanel.error.generic"));
    }
};

async function showNormalUserPanelMain(player, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: Normal User Panel Main requested by ${player.nameTag}`, player.nameTag);
    const form = new ActionFormData();
    form.title(getString("ui.normalPanel.title"));
    form.body(getString("ui.normalPanel.body", { playerName: player.nameTag }));
    form.button(getString("ui.normalPanel.button.myStats"), "textures/ui/icon_multiplayer");
    form.button(getString("ui.normalPanel.button.serverRules"), "textures/ui/book_glyph");
    form.button(getString("ui.normalPanel.button.helpLinks"), "textures/ui/lightbulb_idea");
    form.button(getString("common.button.close"), "textures/ui/cancel");

    try {
        const response = await form.show(player);
        if (response.canceled || response.selection === 3) { // Close button
            return;
        }
        switch (response.selection) {
            case 0: await showMyStats(player, playerDataManager, config, dependencies); break;
            case 1: await showServerRules(player, config, playerDataManager, dependencies); break;
            case 2: await showHelpAndLinks(player, config, playerDataManager, dependencies); break;
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showNormalUserPanelMain for ${player.nameTag}: ${error.stack || error}`, player.nameTag);
        player.sendMessage(getString("common.error.genericForm"));
    }
}


export { showAdminPanelMain };


showSystemInfo = async function (adminPlayer, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: System Info requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const { version, prefix } = dependencies.configModule; // Get main config
    const onlinePlayers = mc.world.getAllPlayers();
    const pDataEntries = playerDataManager.getAllPlayerDataEntries ? playerDataManager.getAllPlayerDataEntries().length : 'N/A'; // Assuming a function to get all entries
    const watchedPlayers = onlinePlayers.filter(p => playerDataManager.getPlayerData(p.id)?.isWatched).length;

    let mutedSessionCount = 0;
    let mutedPersistentCount = 0;
    let bannedPersistentCount = 0;
    onlinePlayers.forEach(p => {
        const pData = playerDataManager.getPlayerData(p.id);
        if (pData?.muteInfo) {
            if (pData.muteInfo.unmuteTime === Infinity || pData.muteInfo.unmuteTime > Date.now()) { // Check if still active
                 // This simple check doesn't distinguish session from persistent in the current structure after mute refactor
                 // Assuming all mutes managed by playerDataManager are persistent if they have an unmuteTime
                 mutedPersistentCount++;
            }
        }
        if (pData?.banInfo) {
             if (pData.banInfo.unbanTime === Infinity || pData.banInfo.unbanTime > Date.now()) {
                bannedPersistentCount++;
            }
        }
    });
    // Note: Offline player mutes/bans are not counted here. This would require iterating all stored dynamic properties.

    const activeBorders = ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'].filter(dim => getBorderSettings(dim)).length;
    const logCount = logManager.getLogs ? logManager.getLogs().length : 'N/A';
    const reportCount = dependencies.reportManager?.getReports ? dependencies.reportManager.getReports().length : 'N/A';


    const form = new MessageFormData()
        .title(getString("ui.systemInfo.title"))
        .body(
            `${getString("ui.systemInfo.entry.acVersion", { version: version })}\n` +
            `${getString("ui.systemInfo.entry.mcVersion", { version: mc.game.version })}\n` +
            `${getString("ui.systemInfo.entry.serverTime", { time: new Date().toLocaleTimeString() })}\n` +
            `${getString("ui.systemInfo.label.currentTick")}§r §e${mc.system.currentTick}\n` + // Added currentTick
            `${getString("ui.systemInfo.label.worldTime")}§r §e${mc.world.getTime()}\n` + // Added worldTime
            `${getString("ui.systemInfo.entry.onlinePlayers", { onlineCount: onlinePlayers.length, maxCount: mc.world.maxPlayers })}\n` +
            `${getString("ui.systemInfo.entry.totalPlayerData", { count: pDataEntries })}\n` +
            `${getString("ui.systemInfo.entry.watchedPlayers", { count: watchedPlayers })}\n` +
            // `${getString("ui.systemInfo.entry.mutedSession", { count: mutedSessionCount })}\n` + // Session mutes are now part of persistent
            `${getString("ui.systemInfo.entry.mutedPersistent", { count: mutedPersistentCount })}\n` +
            `${getString("ui.systemInfo.entry.bannedPersistent", { count: bannedPersistentCount })}\n` +
            `${getString("ui.systemInfo.entry.activeWorldBorders", { count: activeBorders })}\n` +
            `${getString("ui.systemInfo.entry.logManagerEntries", { count: logCount })}\n` +
            `${getString("ui.systemInfo.entry.reportManagerEntries", { count: reportCount })}`
        )
        .button1(getString("ui.systemInfo.button.backToServerMgmt"));
    await form.show(adminPlayer);
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

showEditConfigForm = async function (adminPlayer, playerDataManager, currentEditableConfig, dependencies) {
    playerUtils.debugLog(`UI: Edit Config Form requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    if (playerUtils.getPlayerPermissionLevel(adminPlayer) !== permissionLevels.owner) {
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
    form.button(getString("ui.configEditor.button.backToAdminPanel"), "textures/ui/undo");

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) return;

        if (response.selection === configKeys.length) {
            await showServerManagementForm(adminPlayer, playerDataManager, dependencies.config, dependencies); // Or AdminPanelMain
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
        playerUtils.debugLog(`Error in showEditConfigForm: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("ui.configEditor.error.generic"));
        await showServerManagementForm(adminPlayer, playerDataManager, dependencies.config, dependencies);
    }
}

async function showEditSingleConfigValueForm(adminPlayer, keyName, keyType, currentValue, dependencies) {
    playerUtils.debugLog(`UI: showEditSingleConfigValueForm for key ${keyName} (type: ${keyType}) requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const { playerDataManager } = dependencies;
    const modalForm = new ModalFormData();
    modalForm.title(getString("ui.configEditor.valueInput.title", { keyName: keyName }));
    let originalValueForComparison = currentValue;

    switch (keyType) {
        case 'boolean': modalForm.toggle(getString("ui.configEditor.valueInput.boolean.label", { keyName: keyName }), currentValue); break;
        case 'string': modalForm.textField(getString("ui.configEditor.valueInput.string.label", { keyName: keyName }), getString("ui.configEditor.valueInput.string.placeholder"), String(currentValue)); break;
        case 'number': modalForm.textField(getString("ui.configEditor.valueInput.number.label", { keyName: keyName }), getString("ui.configEditor.valueInput.number.placeholder"), String(currentValue)); break;
        case 'object':
            if (Array.isArray(currentValue)) {
                originalValueForComparison = JSON.stringify(currentValue);
                modalForm.textField(getString("ui.configEditor.valueInput.array.label", { keyName: keyName }), getString("ui.configEditor.valueInput.array.placeholder"), JSON.stringify(currentValue));
            } else { /* Handled in caller */ return; }
            break;
        default: adminPlayer.sendMessage(getString("ui.configEditor.valueInput.error.typeUnknown", { type: keyType, keyName: keyName })); await showEditConfigForm(adminPlayer, playerDataManager, editableConfigValues, dependencies); return;
    }

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled) { await showEditConfigForm(adminPlayer, playerDataManager, editableConfigValues, dependencies); return; }
        let newValue = response.formValues[0];
        let failureReason = "";

        switch (keyType) {
            case 'number': const numVal = Number(newValue); if (isNaN(numVal)) failureReason = getString("ui.configEditor.valueInput.error.notANumber"); else newValue = numVal; break;
            case 'object':
                if (Array.isArray(currentValue)) {
                    try { const parsedArray = JSON.parse(newValue); if (!Array.isArray(parsedArray)) failureReason = getString("ui.configEditor.valueInput.error.notAnArray"); else newValue = parsedArray; }
                    catch (e) { failureReason = getString("ui.configEditor.valueInput.error.jsonFormat", { errorMessage: e.message }); }
                } else { failureReason = "Original type was not an array."; }
                break;
        }

        if (failureReason) { adminPlayer.sendMessage(getString("ui.configEditor.valueInput.error.updateFailed", { keyName: keyName, failureReason: failureReason })); }
        else {
            const valueToCompare = (keyType === 'object' && Array.isArray(newValue)) ? JSON.stringify(newValue) : newValue;
            if (valueToCompare === originalValueForComparison && !(keyType === 'object' && JSON.stringify(newValue) !== originalValueForComparison) ) {
                 adminPlayer.sendMessage(getString("ui.configEditor.valueInput.noChange", { keyName: keyName }));
            } else {
                const success = updateConfigValue(keyName, newValue); // updateConfigValue is directly imported
                if (success) {
                    adminPlayer.sendMessage(getString("ui.configEditor.valueInput.success", { keyName: keyName, newValue: (typeof newValue === 'object' ? JSON.stringify(newValue) : newValue) }));
                    if (dependencies.logManager && typeof dependencies.logManager.addLog === 'function') {
                        dependencies.logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'config_update', targetName: keyName, details: `Value changed from '${originalValueForComparison}' to '${typeof newValue === 'object' ? JSON.stringify(newValue) : newValue}'` });
                    }
                } else { adminPlayer.sendMessage(getString("ui.configEditor.valueInput.error.updateFailedInternal", { keyName: keyName })); }
            }
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showEditSingleConfigValueForm for ${keyName}: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("ui.configEditor.valueInput.error.generic", { keyName: keyName }));
    }
    await showEditConfigForm(adminPlayer, playerDataManager, editableConfigValues, dependencies);
}


async function handleClearChatAction(adminPlayer, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: Clear Chat Action requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const confirmForm = new ModalFormData()
        .title(getString("ui.serverManagement.clearChat.confirmTitle"))
        .body(getString("ui.serverManagement.clearChat.confirmBody"))
        .toggle(getString("ui.serverManagement.clearChat.confirmToggle"), false);
    const confirmResponse = await confirmForm.show(adminPlayer);
    if (confirmResponse.canceled || !confirmResponse.formValues[0]) {
        adminPlayer.sendMessage(getString("ui.serverManagement.clearChat.cancelled"));
    } else {
        const clearChatExec = dependencies.commandExecutionMap?.get('clearchat');
        if (clearChatExec) { await clearChatExec(adminPlayer, [], dependencies); } // Success message handled by command
        else { adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "clearchat" })); }
    }
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

async function handleLagClearAction(adminPlayer, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: Lag Clear Action requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
     const confirmForm = new ModalFormData()
        .title(getString("ui.serverManagement.lagClear.confirmTitle"))
        .body(getString("ui.serverManagement.lagClear.confirmBody"))
        .toggle(getString("ui.serverManagement.lagClear.confirmToggle"), false);
    const confirmResponse = await confirmForm.show(adminPlayer);
    if (confirmResponse.canceled || !confirmResponse.formValues[0]) {
        adminPlayer.sendMessage(getString("ui.serverManagement.lagClear.cancelled"));
    } else {
        const lagClearExec = dependencies.commandExecutionMap?.get('lagclear'); // Assuming command is named 'lagclear'
        if (lagClearExec) { await lagClearExec(adminPlayer, [], dependencies); } // Success message handled by command
        else { adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "lagclear" })); }
    }
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

showModLogTypeSelectionForm = async function (adminPlayer, dependencies, currentFilterName = null) {
    const { playerDataManager, config } = dependencies;
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
        playerUtils.debugLog(`Error in showModLogTypeSelectionForm: ${e.stack || e}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("ui.modLogSelect.error.generic"));
        await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
    }
};

async function showLogViewerForm(adminPlayer, dependencies, logActionTypesArray, filterPlayerName = null, logTypeName = "Logs") {
    const { playerDataManager, config } = dependencies;
    const form = new MessageFormData();
    form.title(filterPlayerName ? getString("ui.logViewer.title.filtered", { logTypeName: logTypeName, filterName: filterPlayerName }) : logTypeName);

    const displayLimit = 50;
    let bodyContent = "";
    try {
        const allLogs = logManager.getLogs(200);
        const filteredLogs = allLogs.filter(logEntry => {
            const typeMatch = logActionTypesArray.includes(logEntry.actionType);
            if (!typeMatch) return false;
            if (filterPlayerName) {
                return (logEntry.targetName && logEntry.targetName.toLowerCase().includes(filterPlayerName.toLowerCase())) ||
                       (logEntry.adminName && logEntry.adminName.toLowerCase().includes(filterPlayerName.toLowerCase()));
            }
            return true;
        }).slice(0, displayLimit);

        if (filteredLogs.length === 0) { bodyContent = getString("ui.logViewer.noLogs"); }
        else {
            bodyContent = filteredLogs.map(log => {
                const timestampStr = new Date(log.timestamp).toLocaleString();
                let line = getString("ui.actionLogs.logEntry", {
                    timestamp: timestampStr,
                    adminNameOrPlayer: log.adminName || log.playerName || 'SYSTEM',
                    actionType: log.actionType,
                    targetNameOrEmpty: log.targetName || '',
                    duration: log.duration ? `${getString("ui.actionLogs.logEntry.durationPrefix")}${log.duration}${getString("ui.actionLogs.logEntry.suffix")}` : "",
                    reason: log.reason ? `${getString("ui.actionLogs.logEntry.reasonPrefix")}${log.reason}${getString("ui.actionLogs.logEntry.suffix")}` : "",
                    details: log.details ? `${getString("ui.actionLogs.logEntry.detailsPrefix")}${log.details}${getString("ui.actionLogs.logEntry.suffix")}` : ""
                });
                return line.replace(/\s+\(\s*\)/g, ''); // Clean up empty parenthetical groups
            }).join("\n");

            if (allLogs.filter(logEntry => logActionTypesArray.includes(logEntry.actionType) && (!filterPlayerName || (logEntry.targetName && logEntry.targetName.toLowerCase().includes(filterPlayerName.toLowerCase())) || (logEntry.adminName && logEntry.adminName.toLowerCase().includes(filterPlayerName.toLowerCase())))).length > displayLimit) {
                 bodyContent += getString("ui.actionLogs.footer.showingLatest", { count: displayLimit });
            }
        }
    } catch (e) { bodyContent = getString("common.error.genericForm"); playerUtils.debugLog(`Error in showLogViewerForm log processing: ${e.stack || e}`, adminPlayer.nameTag); }

    form.body(bodyContent.trim() || getString("ui.actionLogs.body.empty"));
    form.button1(getString("ui.logViewer.button.backToLogSelect"));
    await form.show(adminPlayer).catch(e => playerUtils.debugLog(`Error displaying LogViewerForm: ${e.stack || e}`, adminPlayer.nameTag));
    await showModLogTypeSelectionForm(adminPlayer, dependencies, filterPlayerName);
}

showServerManagementForm = async function (adminPlayer, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: showServerManagementForm requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData();
    form.title(getString("ui.serverManagement.title"));
    form.body(getString("ui.serverManagement.body"));
    form.button(getString("ui.serverManagement.button.systemInfo"), "textures/ui/icon_graph");
    form.button(getString("ui.serverManagement.button.clearChat"), "textures/ui/speech_bubble_glyph_color");
    form.button(getString("ui.serverManagement.button.lagClear"), "textures/ui/icon_trash");
    form.button(getString("ui.serverManagement.button.actionLogs"), "textures/ui/book_writable");
    form.button(getString("ui.serverManagement.button.modLogs"), "textures/ui/book_edit_default");
    let backButtonIndex = 5;
    if (playerUtils.getPlayerPermissionLevel(adminPlayer) === permissionLevels.owner) {
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
            case 2: await handleLagClearAction(adminPlayer, config, playerDataManager, dependencies); break;
            case 3: await showActionLogsForm(adminPlayer, config, playerDataManager, dependencies); break;
            case 4: await showModLogTypeSelectionForm(adminPlayer, dependencies, null); break;
            case 5:
                if (playerUtils.getPlayerPermissionLevel(adminPlayer) === permissionLevels.owner) {
                    await showEditConfigForm(adminPlayer, playerDataManager, editableConfigValues, dependencies);
                } else { // This is "Back" for non-owners
                    await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies);
                }
                break;
            default:
                adminPlayer.sendMessage(getString("ui.serverManagement.error.invalidSelection"));
                await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
                break;
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showServerManagementForm for ${adminPlayer.nameTag}: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("ui.serverManagement.error.generic"));
        await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies);
    }
};

showActionLogsForm = async function (adminPlayer, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: Action Logs (All) requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new MessageFormData();
    form.title(getString("ui.actionLogs.title"));

    const logsToDisplayCount = 50;
    const logs = logManager.getLogs(logsToDisplayCount);
    let bodyContent = getString("ui.actionLogs.bodyHeader");

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
            }).replace(/\s+\(\s*\)/g, ''); // Clean up empty parenthetical groups
        }).join("\n");

        if (logs.length === logsToDisplayCount) {
            bodyContent += getString("ui.actionLogs.footer.showingLatest", { count: logsToDisplayCount });
        }
    }
    form.body(bodyContent.trim() || getString("ui.actionLogs.body.empty"));
    form.button1(getString("ui.actionLogs.button.backToServerMgmt"));

    await form.show(adminPlayer).catch(e => playerUtils.debugLog(`Error in showActionLogsForm: ${e.stack || e}`, adminPlayer.nameTag));
    await showServerManagementForm(adminPlayer, config, playerDataManager, dependencies);
}

showResetFlagsForm = async function (adminPlayer, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: Reset Flags form requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const resetFlagsExecute = dependencies.commandExecutionMap?.get('resetflags');
    if (!resetFlagsExecute) {
        adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "resetflags" }));
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
        return;
    }

    const modalForm = new ModalFormData().title(getString("ui.resetFlagsForm.title"));
    modalForm.textField(getString("ui.resetFlagsForm.textField.label"), getString("ui.resetFlagsForm.textField.placeholder"));
    modalForm.toggle(getString("ui.resetFlagsForm.toggle.label"), false);

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled || !response.formValues[1]) {
            adminPlayer.sendMessage(getString("ui.resetFlagsForm.cancelled"));
        } else {
            const targetPlayerName = response.formValues[0];
            if (!targetPlayerName || targetPlayerName.trim() === "") {
                adminPlayer.sendMessage(getString("ui.resetFlagsForm.error.nameEmpty"));
            } else {
                await resetFlagsExecute(adminPlayer, [targetPlayerName.trim()], dependencies);
            }
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showResetFlagsForm: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage(getString("ui.resetFlagsForm.error.generic"));
    }
    await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
}

showWatchedPlayersList = async function (adminPlayer, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: Watched Players list requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    let body = getString("ui.watchedPlayers.header") + "\n";
    let watchedCount = 0;
    mc.world.getAllPlayers().forEach(p => {
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
        .button1(getString("ui.watchedPlayers.button.ok"));
    await form.show(adminPlayer).catch(e => playerUtils.debugLog(`Error showing watched players list: ${e.stack || e}`, adminPlayer.nameTag));
    await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
}

showDetailedFlagsForm = async function(adminPlayer, targetPlayer, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: Detailed flags for ${targetPlayer.nameTag} requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const pData = playerDataManager.getPlayerData(targetPlayer.id);
    const form = new MessageFormData();
    form.title(getString("ui.detailedFlags.title", { targetPlayerName: targetPlayer.nameTag }));

    let body = "";
    if (pData && pData.flags && Object.keys(pData.flags).length > 1) { // More than just totalFlags
        for (const flagKey in pData.flags) {
            if (flagKey !== 'totalFlags' && pData.flags[flagKey].count > 0) {
                const flagDetail = pData.flags[flagKey];
                const lastDetectionStr = flagDetail.lastDetectionTime ? new Date(flagDetail.lastDetectionTime).toLocaleString() : 'N/A';
                body += getString("ui.detailedFlags.flagEntry", { flagType: flagKey, count: flagDetail.count, timestamp: lastDetectionStr }) + "\n";
            }
        }
    }
    if (!body) {
        body = getString("ui.detailedFlags.noFlags");
    }
    form.body(body.trim());
    form.button1(getString("common.button.back")); // Back to Player Actions

    await form.show(adminPlayer).catch(e => playerUtils.debugLog(`Error showing detailed flags: ${e.stack || e}`, adminPlayer.nameTag));
    await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); // Navigate back
};

[end of AntiCheatsBP/scripts/core/uiManager.js]
