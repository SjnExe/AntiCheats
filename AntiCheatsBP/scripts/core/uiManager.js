/**
 * @file AntiCheatsBP/scripts/core/uiManager.js
 * Manages the creation and display of various UI forms (Action, Modal, Message) for administrative
 * actions and player information within the AntiCheat system.
 * @version 1.0.1
 */
import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import * as playerUtils from '../utils/playerUtils.js'; // Direct import for general utils
import { getPlayerPermissionLevel } from '../utils/playerUtils.js'; // Specific import
import { permissionLevels } from './rankManager.js';
import * as logManager from './logManager.js'; // Direct import for logManager
// editableConfigValues and updateConfigValue are not directly used here, but might be by functions called via dependencies.
// import { editableConfigValues, updateConfigValue } from '../config.js';

// Forward declarations for functions that might call each other, ensuring they are defined before use.
let showAdminPanelMain;
let showOnlinePlayersList;
let showPlayerActionsForm;
let showServerManagementForm;
let showModLogTypeSelectionForm; // For the new log viewer flow

/**
 * Displays a modal form to prompt for a player's name, then executes the 'inspect' command.
 * @param {mc.Player} adminPlayer - The admin player initiating the inspection.
 * @param {import('./playerDataManager.js')} playerDataManager - The player data manager instance.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies, including command execution map.
 * @returns {Promise<void>} A promise that resolves when the form is processed.
 */
async function showInspectPlayerForm(adminPlayer, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: Inspect Player form requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const modalForm = new ModalFormData();
    modalForm.title("Inspect Player Data (Text)");
    modalForm.textField("Enter Player Name:", "TargetPlayerName");

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled) {
            playerUtils.debugLog(`Inspect Player (Text) form cancelled by ${adminPlayer.nameTag}. Reason: ${response.cancelationReason}`, adminPlayer.nameTag);
            // Optionally, navigate back or provide feedback
            // await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
            return;
        }
        const targetPlayerName = response.formValues[0];
        if (!targetPlayerName || targetPlayerName.trim() === "") {
            adminPlayer.sendMessage("§cPlayer name cannot be empty.");
            await showInspectPlayerForm(adminPlayer, playerDataManager, dependencies); // Re-show form
            return;
        }

        const commandExecute = dependencies.commandExecutionMap?.get('inspect');
        if (commandExecute) {
            await commandExecute(adminPlayer, [targetPlayerName.trim()], dependencies);
        } else {
            adminPlayer.sendMessage("§cInspect command module not found or not executable.");
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showInspectPlayerForm: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage("§cError opening or processing Inspect Player form.");
    }
    // Decide if navigation back to main panel is desired after text inspect.
    // For now, no automatic navigation back. User can re-open panel.
}

/**
 * Informs the player to use the `!uinfo` command to view their stats.
 * This UI function acts as a redirector or informational placeholder.
 * @param {mc.Player} player - The player requesting their stats.
 * @param {import('./playerDataManager.js')} playerDataManager - The player data manager instance.
 * @param {import('../config.js').editableConfigValues} config - The system configuration.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 * @returns {Promise<void>} Resolves after sending the message.
 */
async function showMyStats(player, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: showMyStats for ${player.nameTag}`, player.nameTag);
    player.sendMessage("§7Please use the `!uinfo` command and select 'My Anti-Cheat Stats'.");
}

/**
 * Informs the player to use the `!uinfo` command to view server rules.
 * @param {mc.Player} player - The player requesting the server rules.
 * @param {import('../config.js').editableConfigValues} config - The system configuration.
 * @param {import('./playerDataManager.js')} playerDataManager - The player data manager instance.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 * @returns {Promise<void>} Resolves after sending the message.
 */
async function showServerRules(player, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showServerRules for ${player.nameTag}`, player.nameTag);
    player.sendMessage("§7Please use `!uinfo` and select 'Server Rules'.");
}

/**
 * Informs the player to use the `!uinfo` command to view help and links.
 * @param {mc.Player} player - The player requesting help and links.
 * @param {import('../config.js').editableConfigValues} config - The system configuration.
 * @param {import('./playerDataManager.js')} playerDataManager - The player data manager instance.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 * @returns {Promise<void>} Resolves after sending the message.
 */
async function showHelpAndLinks(player, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showHelpAndLinks for ${player.nameTag}`, player.nameTag);
    player.sendMessage("§7Please use `!uinfo` and select 'Helpful Links' or 'General Tips'.");
}

/**
 * Displays a form with various administrative actions for a target player.
 * Actions include viewing info, inventory, kicking, freezing, muting, banning, and resetting flags.
 * @param {mc.Player} adminPlayer - The admin player initiating the actions.
 * @param {mc.Player} targetPlayer - The player on whom actions can be performed.
 * @param {import('./playerDataManager.js')} playerDataManager - The player data manager instance.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 * @returns {Promise<void>} A promise that resolves when the form is processed.
 */
showPlayerActionsForm = async function (adminPlayer, targetPlayer, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const { config } = dependencies; // playerUtils is directly imported now

    const form = new ActionFormData();
    form.title(`Actions for ${targetPlayer.nameTag}`);

    const frozenTag = "frozen"; // Define this tag, perhaps make it a config option later
    const isTargetFrozen = targetPlayer.hasTag(frozenTag);
    const freezeButtonText = isTargetFrozen ? "Unfreeze Player" : "Freeze Player";
    const freezeButtonIcon = isTargetFrozen ? "textures/ui/icon_unlocked" : "textures/ui/icon_locked";

    const muteInfo = playerDataManager.getMuteInfo?.(targetPlayer); // Use optional chaining for safety
    const isTargetMuted = muteInfo !== null;
    let muteButtonText = isTargetMuted ? "Unmute Player" : "Mute Player";
    if (isTargetMuted) {
        muteButtonText += muteInfo.unmuteTime === Infinity ? " (Permanent)" : ` (exp. ${new Date(muteInfo.unmuteTime).toLocaleTimeString()})`;
    }
    const muteButtonIcon = isTargetMuted ? "textures/ui/speaker_off_light" : "textures/ui/speaker_on_light";

    form.button("View Detailed Info/Flags", "textures/ui/magnifying_glass");   // Index 0
    form.button("View Inventory (InvSee)", "textures/ui/chest_icon.png");      // Index 1
    form.button("Teleport to Player", "textures/ui/portal");                   // Index 2
    form.button("Teleport Player Here", "textures/ui/arrow_down_thin");        // Index 3 (New)
    form.button("Kick Player", "textures/ui/icon_hammer");                     // Index 4 (Shifted)
    form.button(freezeButtonText, freezeButtonIcon);                           // Index 5 (Shifted)
    form.button(muteButtonText, muteButtonIcon);                               // Index 6 (Shifted)
    form.button("Ban Player", "textures/ui/icon_resource_pack");               // Index 7 (Shifted)
    form.button("Reset Player Flags", "textures/ui/refresh");                  // Index 8 (Shifted)
    form.button("Clear Inventory", "textures/ui/icon_trash");                  // Index 9 (Shifted)
    form.button("Clear Ender Chest", "textures/ui/ender_chest");             // Index 10 (Shifted)
    form.button("Back to Player List", "textures/ui/undo");                    // Index 11 (Shifted)

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            playerUtils.debugLog(`Player Actions form for ${targetPlayer.nameTag} canceled. Reason: ${response.cancelationReason}`, adminPlayer.nameTag);
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); // Navigate back
            return;
        }

        const commandExecute = dependencies.commandExecutionMap?.get(response.selection === 0 ? 'inspect' :
            response.selection === 1 ? 'invsee' :
                response.selection === 5 ? 'freeze' : // Shifted from 4
                    response.selection === 8 ? 'resetflags' : ''); // Shifted from 7

        // Helper for commands that require a modal (like kick, mute, ban)
        const showModalAndExecute = async (commandName, title, fields, argsTransform = (vals) => vals) => {
            const cmdExec = dependencies.commandExecutionMap?.get(commandName);
            if (!cmdExec) {
                adminPlayer.sendMessage(`§c${commandName} command module not found.`);
                return false; // Indicate failure or inability to execute
            }
            const modal = new ModalFormData().title(title);
            fields.forEach(field => {
                if (field.type === 'textField') modal.textField(field.label, field.placeholder);
                if (field.type === 'toggle') modal.toggle(field.label, field.defaultValue);
            });
            const modalResponse = await modal.show(adminPlayer);
            if (modalResponse.canceled) {
                adminPlayer.sendMessage(`§7${commandName} action cancelled.`);
                return true; // Indicate cancellation, but not an error
            }
            await cmdExec(adminPlayer, argsTransform([targetPlayer.nameTag, ...modalResponse.formValues]), dependencies);
            return true; // Indicate success or attempt
        };

        let shouldReturnToPlayerList = false;
        let shouldReturnToPlayerActions = true;

        switch (response.selection) {
            case 0: // View Detailed Info/Flags
            case 1: // View Inventory (InvSee)
                // Teleport buttons handled below
            case 5: // Freeze/Unfreeze Player (Shifted from 4)
            case 8: // Reset Player Flags (Shifted from 7)
                if (commandExecute) await commandExecute(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage("§cSelected command module not found.");
                break;
            case 2: // Teleport to Player
                try {
                    adminPlayer.teleport(targetPlayer.location, { dimension: targetPlayer.dimension });
                    adminPlayer.sendMessage(`§aSuccessfully teleported to ${targetPlayer.nameTag}.`);
                    if (dependencies.addLog) {
                        dependencies.addLog({
                            adminName: adminPlayer.nameTag,
                            actionType: 'teleport_self_to_player',
                            targetName: targetPlayer.nameTag,
                            details: `Admin ${adminPlayer.nameTag} teleported to ${targetPlayer.nameTag} at ${targetPlayer.location.x.toFixed(1)},${targetPlayer.location.y.toFixed(1)},${targetPlayer.location.z.toFixed(1)} in ${targetPlayer.dimension.id.split(':')[1]}`
                        });
                    }
                } catch (e) {
                    adminPlayer.sendMessage(`§cError teleporting: ${e.message}`);
                    playerUtils.debugLog(`Error teleporting admin ${adminPlayer.nameTag} to ${targetPlayer.nameTag}: ${e.stack || e}`, adminPlayer.nameTag);
                }
                // Stay on player actions form
                break;
            case 3: // Teleport Player Here (New)
                try {
                    targetPlayer.teleport(adminPlayer.location, { dimension: adminPlayer.dimension });
                    adminPlayer.sendMessage(`§aSuccessfully teleported ${targetPlayer.nameTag} to your location.`);
                    targetPlayer.sendMessage("§7You have been teleported by an admin.");
                    if (dependencies.addLog) {
                        dependencies.addLog({
                            adminName: adminPlayer.nameTag,
                            actionType: 'teleport_player_to_admin',
                            targetName: targetPlayer.nameTag,
                            details: `Admin ${adminPlayer.nameTag} teleported ${targetPlayer.nameTag} to their location (${adminPlayer.location.x.toFixed(1)},${adminPlayer.location.y.toFixed(1)},${adminPlayer.location.z.toFixed(1)} in ${adminPlayer.dimension.id.split(':')[1]})`
                        });
                    }
                } catch (e) {
                    adminPlayer.sendMessage(`§cError teleporting ${targetPlayer.nameTag}: ${e.message}`);
                    playerUtils.debugLog(`Error teleporting ${targetPlayer.nameTag} to admin ${adminPlayer.nameTag}: ${e.stack || e}`, adminPlayer.nameTag);
                }
                // Stay on player actions form
                break;
            case 4: // Kick Player (Shifted from 3)
                await showModalAndExecute('kick', `Kick ${targetPlayer.nameTag}`, [{ type: 'textField', label: "Kick Reason:", placeholder: "Enter reason" }]);
                shouldReturnToPlayerList = true;
                break;
            case 6: // Mute/Unmute Player (Shifted from 5)
                if (isTargetMuted) {
                    const unmuteExec = dependencies.commandExecutionMap?.get('unmute');
                    if (unmuteExec) await unmuteExec(adminPlayer, [targetPlayer.nameTag], dependencies);
                    else adminPlayer.sendMessage("§cUnmute command module not found.");
                } else {
                    await showModalAndExecute('mute', `Mute ${targetPlayer.nameTag}`,
                        [{ type: 'textField', label: "Duration (e.g., 5m, 1h, perm):", placeholder: "5m" }, { type: 'textField', label: "Reason:", placeholder: "Enter reason" }],
                        (vals) => [vals[0], vals[1], vals[2]] // targetName, duration, reason
                    );
                }
                break;
            case 7: // Ban Player (Shifted from 6)
                await showModalAndExecute('ban', `Ban ${targetPlayer.nameTag}`,
                    [{ type: 'textField', label: "Duration (e.g., 1d, 2w, perm):", placeholder: "1d" }, { type: 'textField', label: "Reason:", placeholder: "Enter reason" }],
                    (vals) => [vals[0], vals[1], vals[2]] // targetName, duration, reason
                );
                shouldReturnToPlayerList = true;
                break;
            // case 8 is Reset Player Flags, handled above
            case 9: // Clear Inventory (Shifted from 8)
                {
                    const confirmClearInvForm = new ModalFormData()
                        .title("Confirm Clear Inventory")
                        .body(`Are you sure you want to clear ${targetPlayer.nameTag}'s main inventory? This action cannot be undone.`)
                        .toggle("Yes, clear main inventory.", false);
                    const confirmClearInvResponse = await confirmClearInvForm.show(adminPlayer);

                    if (confirmClearInvResponse.canceled || !confirmClearInvResponse.formValues[0]) {
                        adminPlayer.sendMessage("§7Clear Inventory action cancelled.");
                    } else {
                        const inventoryComp = targetPlayer.getComponent("minecraft:inventory");
                        if (inventoryComp && inventoryComp.container) {
                            for (let i = 0; i < inventoryComp.container.size; i++) {
                                inventoryComp.container.setItem(i); // Clears the slot
                            }
                            adminPlayer.sendMessage(`§aSuccessfully cleared ${targetPlayer.nameTag}'s inventory.`);
                            if (dependencies.addLog) {
                                dependencies.addLog({
                                    adminName: adminPlayer.nameTag,
                                    actionType: 'clear_inventory',
                                    targetName: targetPlayer.nameTag,
                                    details: `Admin ${adminPlayer.nameTag} cleared inventory for ${targetPlayer.nameTag}`
                                });
                            }
                        } else {
                            adminPlayer.sendMessage(`§cCould not access ${targetPlayer.nameTag}'s inventory component.`);
                        }
                    }
                }
                // Stay on player actions form
                break;
            case 10: // Clear Ender Chest (Shifted Index from 9)
                {
                    const confirmForm = new ModalFormData()
                        .title("Confirm Clear Ender Chest")
                        .body(`Are you sure you want to clear ${targetPlayer.nameTag}'s Ender Chest? This action cannot be undone.`)
                        .toggle("Yes, clear Ender Chest.", false);
                    const confirmResponse = await confirmForm.show(adminPlayer);

                    if (confirmResponse.canceled || !confirmResponse.formValues[0]) {
                        adminPlayer.sendMessage("§7Clear Ender Chest action cancelled.");
                    } else {
                        // Inform about API limitation
                        adminPlayer.sendMessage("§cError: Clearing another player's Ender Chest is not currently supported by the Script API.");
                        if (dependencies.addLog) {
                            dependencies.addLog({
                                adminName: adminPlayer.nameTag,
                                actionType: 'attempt_clear_ender_chest',
                                targetName: targetPlayer.nameTag,
                                details: `Admin attempted to clear Ender Chest for ${targetPlayer.nameTag}, but feature is not supported by API.`
                            });
                        }
                    }
                }
                // Stay on player actions form after this
                break;
            case 11: // Back to Player List (Shifted Index from 10)
                shouldReturnToPlayerList = true;
                shouldReturnToPlayerActions = false;
                break;
            default:
                adminPlayer.sendMessage("§cInvalid action selected.");
                break;
        }

        if (shouldReturnToPlayerList) {
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
        } else if (shouldReturnToPlayerActions) {
            await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); // Refresh this form
        }

    } catch (error) {
        playerUtils.debugLog(`Error in showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage("§cAn error occurred while displaying player actions.");
        await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); // Fallback navigation
    }
};

/**
 * Displays a list of online players to an admin. Selecting a player navigates to the player actions form.
 * @param {mc.Player} adminPlayer - The admin player viewing the list.
 * @param {import('./playerDataManager.js')} playerDataManager - The player data manager instance.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 * @returns {Promise<void>} A promise that resolves when the form is processed.
 */
showOnlinePlayersList = async function (adminPlayer, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: showOnlinePlayersList requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const onlinePlayers = mc.world.getAllPlayers();

    if (onlinePlayers.length === 0) {
        const msgForm = new MessageFormData()
            .title("Online Players")
            .body("No players currently online.")
            .button1("Back to Admin Panel"); // Text for button1
        // Button2 is not set, so it won't appear or will be default.
        const response = await msgForm.show(adminPlayer).catch(e => playerUtils.debugLog(`Error showing 'No players online' form: ${e.stack || e}`, adminPlayer.nameTag));
        // Response for MessageFormData indicates which button was pressed (selection: 0 for button1, 1 for button2)
        // or if it was cancelled (canceled: true)
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
        return;
    }

    const form = new ActionFormData();
    form.title("Online Players");
    form.body("Select a player to view actions:");

    const playerMappings = onlinePlayers.map(p => {
        const targetPData = playerDataManager.getPlayerData(p.id);
        const flagCount = targetPData?.flags?.totalFlags ?? 0;
        form.button(`${p.nameTag} (Flags: ${flagCount})`, "textures/ui/icon_steve");
        return p.id; // Store player ID for mapping selection back to player object
    });

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
            return;
        }
        const selectedPlayerId = playerMappings[response.selection];
        const targetPlayer = mc.world.getPlayer(selectedPlayerId); // Re-fetch player object
        if (targetPlayer) {
            await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
        } else {
            adminPlayer.sendMessage("§cSelected player not found (may have logged off).");
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); // Refresh list
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showOnlinePlayersList: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage("§cAn error occurred displaying the player list.");
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies); // Fallback
    }
};

/**
 * Displays the main admin panel UI, providing navigation to various admin functionalities.
 * Access is restricted based on player permission level.
 * @export
 * @param {mc.Player} adminPlayer - The player attempting to open the admin panel.
 * @param {import('./playerDataManager.js')} playerDataManager - The player data manager instance.
 * @param {import('../config.js').editableConfigValues} config - The system configuration.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 * @returns {Promise<void>} A promise that resolves when the form is processed.
 */
showAdminPanelMain = async function (adminPlayer, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: Admin Panel Main requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData();
    const userPermLevel = getPlayerPermissionLevel(adminPlayer);

    try {
        if (userPermLevel > permissionLevels.admin) { // Use configured permission levels
            adminPlayer.sendMessage("§7Please use the `!uinfo` command to access player-specific information and other features.");
            return; // No further UI for non-admins from this panel.
        }

        form.title("AC Admin Panel");
        form.body("Select an admin action:");
        form.button("View Online Players", "textures/ui/icon_multiplayer");    // 0
        form.button("Inspect Player (Text)", "textures/ui/spyglass");         // 1
        form.button("Reset Flags (Text)", "textures/ui/refresh");             // 2
        form.button("List Watched Players", "textures/ui/magnifying_glass");  // 3
        form.button("Server Management", "textures/ui/icon_graph");           // 4
        // form.button("View/Edit Configuration", "textures/ui/gear");        // 5 - Placeholder, not fully implemented

        const response = await form.show(adminPlayer);
        if (response.canceled) {
            playerUtils.debugLog(`Admin Panel Main cancelled by ${adminPlayer.nameTag}.`, adminPlayer.nameTag);
            return;
        }
        switch (response.selection) {
            case 0: await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); break;
            case 1: await showInspectPlayerForm(adminPlayer, playerDataManager, dependencies); break;
            case 2: await showResetFlagsForm(adminPlayer, playerDataManager, dependencies); break;
            case 3: await showWatchedPlayersList(adminPlayer, playerDataManager, dependencies); break;
            case 4: await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); break;
            // case 5: await showEditConfigForm(adminPlayer, playerDataManager, config, dependencies); break; // Placeholder
            default:
                adminPlayer.sendMessage("§cInvalid selection from main panel.");
                await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies); // Re-show
                break;
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showAdminPanelMain for ${adminPlayer.nameTag}: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage("§cAn error occurred displaying the admin panel.");
    }
};

// Make showAdminPanelMain globally available if it's the main entry point for UI from commands
export { showAdminPanelMain };


/**
 * Placeholder: Displays system information (intended functionality). Currently navigates back.
 * @param {mc.Player} adminPlayer - The admin player.
 * @param {import('../config.js').editableConfigValues} config - The system configuration.
 * @param {import('./playerDataManager.js')} playerDataManager - The player data manager instance.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 */
async function showSystemInfo(adminPlayer, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: System Info requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    // Actual system info display would go here.
    const msgForm = new MessageFormData()
        .title("System Information")
        .body("System information display is not yet fully implemented.\nMore details will be available in a future update.")
        .button1("Back to Server Management");
    await msgForm.show(adminPlayer);
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

/**
 * Placeholder: Allows editing configuration (intended functionality). Currently navigates back.
 * @param {mc.Player} adminPlayer - The admin player.
 * @param {import('./playerDataManager.js')} playerDataManager - The player data manager instance.
 * @param {import('../config.js').editableConfigValues} config - The system configuration.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 */
async function showEditConfigForm(adminPlayer, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: Edit Config requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    // Actual config editing UI would go here.
    const msgForm = new MessageFormData()
        .title("Edit Configuration")
        .body("Configuration editing via UI is not yet implemented.\nPlease use the configuration files directly or future commands.")
        .button1("Back to Admin Panel"); // Or Server Management if that's more appropriate
    await msgForm.show(adminPlayer);
    await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies);
}

/**
 * Placeholder: Handles chat clear action (intended functionality). Currently navigates back.
 * @param {mc.Player} adminPlayer - The admin player.
 * @param {import('./playerDataManager.js')} playerDataManager - The player data manager instance.
 * @param {import('../config.js').editableConfigValues} config - The system configuration.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 */
async function handleClearChatAction(adminPlayer, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: Clear Chat Action requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    // Actual chat clear logic would go here (e.g., calling a command module)
    const clearChatExec = dependencies.commandExecutionMap?.get('clearchat');
    if (clearChatExec) {
        await clearChatExec(adminPlayer, [], dependencies); // Assuming 'clearchat' takes no args
    } else {
        adminPlayer.sendMessage("§cClear Chat command module not found.");
    }
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

/**
 * Placeholder: Handles lag clear action (intended functionality). Currently navigates back.
 * @param {mc.Player} adminPlayer - The admin player.
 * @param {import('../config.js').editableConfigValues} config - The system configuration.
 * @param {import('./playerDataManager.js')} playerDataManager - The player data manager instance.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 */
async function handleLagClearAction(adminPlayer, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: Lag Clear Action requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const lagClearExec = dependencies.commandExecutionMap?.get('lagclear');
    if (lagClearExec) {
        await lagClearExec(adminPlayer, [], dependencies); // Assuming 'lagclear' takes no args
    } else {
        adminPlayer.sendMessage("§cLag Clear command module not found.");
    }
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

/**
 * Displays a form for selecting the type of moderation logs to view (Ban/Unban or Mute/Unmute)
 * and allows filtering by player name. Navigates to {@link showLogViewerForm} on selection.
 * @param {mc.Player} adminPlayer - The admin player.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 * @param {string | null} [currentFilterName=null] - The currently active player name filter.
 */
showModLogTypeSelectionForm = async function (adminPlayer, dependencies, currentFilterName = null) {
    const { playerDataManager, config } = dependencies; // playerUtils is directly imported
    const form = new ActionFormData();
    form.title("Select Moderation Log Type");

    form.body(currentFilterName ? `View logs filtered by: §e${currentFilterName}§r` : "View all moderation logs or filter by player.");
    form.button("View Ban/Unban Logs", "textures/ui/icon_alert");        // Index 0
    form.button("View Mute/Unmute Logs", "textures/ui/speaker_glyph_color"); // Index 1
    form.button(currentFilterName ? `Clear Filter (${currentFilterName})` : "Filter by Player Name", currentFilterName ? "textures/ui/cancel" : "textures/ui/magnifying_glass"); // Index 2
    form.button("Back to Server Management", "textures/ui/undo");        // Index 3

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
            return;
        }
        switch (response.selection) {
            case 0: await showLogViewerForm(adminPlayer, dependencies, ['ban', 'unban'], currentFilterName, "Ban/Unban Logs"); break;
            case 1: await showLogViewerForm(adminPlayer, dependencies, ['mute', 'unmute'], currentFilterName, "Mute/Unmute Logs"); break;
            case 2:
                if (currentFilterName) {
                    adminPlayer.sendMessage("§aPlayer name filter cleared.");
                    await showModLogTypeSelectionForm(adminPlayer, dependencies, null);
                } else {
                    const modalFilter = new ModalFormData().title("Filter Logs by Player Name");
                    modalFilter.textField("Enter Player Name (leave blank for no filter):", "PlayerName");
                    const modalResponse = await modalFilter.show(adminPlayer);
                    if (modalResponse.canceled) {
                        await showModLogTypeSelectionForm(adminPlayer, dependencies, currentFilterName);
                        return;
                    }
                    const newFilter = modalResponse.formValues[0]?.trim();
                    adminPlayer.sendMessage(newFilter ? `§aLog filter set to: ${newFilter}` : "§7Filter input was blank. No filter applied.");
                    await showModLogTypeSelectionForm(adminPlayer, dependencies, newFilter || null);
                }
                break;
            case 3: await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); break;
        }
    } catch (e) {
        playerUtils.debugLog(`Error in showModLogTypeSelectionForm: ${e.stack || e}`, adminPlayer.nameTag);
        adminPlayer.sendMessage("§cError displaying log type selection.");
        await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
    }
};

/**
 * Displays logs of specified types, optionally filtered by player name.
 * @param {mc.Player} adminPlayer - The admin player.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 * @param {string[]} logActionTypesArray - Array of log action types to display (e.g., ['ban', 'unban']).
 * @param {string | null} [filterPlayerName=null] - Optional player name to filter logs by.
 * @param {string} [logTypeName="Logs"] - Name for the log type being viewed (for form title).
 */
async function showLogViewerForm(adminPlayer, dependencies, logActionTypesArray, filterPlayerName = null, logTypeName = "Logs") {
    const { playerDataManager, config } = dependencies; // playerUtils & logManager are directly imported
    const form = new MessageFormData();
    form.title(filterPlayerName ? `${logTypeName} for "${filterPlayerName}"` : logTypeName);

    const displayLimit = 50; // Max logs to show in one form
    let bodyContent = "";

    try {
        const allLogs = logManager.getLogs(200); // Fetch more logs to ensure good filtering results
        const filteredLogs = allLogs.filter(logEntry => {
            const typeMatch = logActionTypesArray.includes(logEntry.actionType);
            if (!typeMatch) return false;
            if (filterPlayerName) {
                return (logEntry.targetName && logEntry.targetName.toLowerCase().includes(filterPlayerName.toLowerCase())) ||
                       (logEntry.adminName && logEntry.adminName.toLowerCase().includes(filterPlayerName.toLowerCase()));
            }
            return true;
        }).slice(0, displayLimit);


        if (filteredLogs.length === 0) {
            bodyContent = "No matching logs found with current filters.";
        } else {
            bodyContent = filteredLogs.map(log => {
                const timestampStr = new Date(log.timestamp).toLocaleString();
                let line = `§7[${timestampStr}] §c${log.adminName ?? 'SYSTEM'}§r ${log.actionType} §b${log.targetName || 'N/A'}§r`;
                if (log.duration) line += ` §7(Dur: ${log.duration}§r)`;
                if (log.reason) line += ` §7(Reason: ${log.reason}§r)`;
                if (log.details) line += ` §7(Details: ${log.details}§r)`;
                return line;
            }).join("\n");

            if (allLogs.filter(logEntry => logActionTypesArray.includes(logEntry.actionType) && (!filterPlayerName || (logEntry.targetName && logEntry.targetName.toLowerCase().includes(filterPlayerName.toLowerCase())) || (logEntry.adminName && logEntry.adminName.toLowerCase().includes(filterPlayerName.toLowerCase())))).length > displayLimit) {
                 bodyContent += `\n§o(Showing latest ${displayLimit} matching logs)§r`;
            }
        }
    } catch (e) {
        bodyContent = "§cError retrieving or processing logs.";
        playerUtils.debugLog(`Error in showLogViewerForm log processing: ${e.stack || e}`, adminPlayer.nameTag);
    }

    form.body(bodyContent.trim() || "No logs to display."); // Ensure body is not empty
    form.button1("Back to Log Type Selection");
    // form.button2("Refresh"); // Example for a refresh button

    try {
        // const response = await form.show(adminPlayer); // Get response to handle button2 if needed
        await form.show(adminPlayer); // Not waiting for response if only one button matters for navigation
    } catch (e) {
        playerUtils.debugLog(`Error displaying LogViewerForm: ${e.stack || e}`, adminPlayer.nameTag);
    }
    // Always go back to type selection, allowing filter changes or different log views.
    await showModLogTypeSelectionForm(adminPlayer, dependencies, filterPlayerName);
}

/**
 * Displays the server management panel to an admin player.
 * @param {mc.Player} adminPlayer - The admin player.
 * @param {import('./playerDataManager.js')} playerDataManager - The player data manager instance.
 * @param {import('../config.js').editableConfigValues} config - The system configuration.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 */
showServerManagementForm = async function (adminPlayer, playerDataManager, config, dependencies) {
    playerUtils.debugLog(`UI: showServerManagementForm requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData();
    form.title("Server Management");
    form.body("Select an administrative action:");
    form.button("View System Info", "textures/ui/icon_graph");                 // 0
    form.button("Clear Chat for All Players", "textures/ui/speech_bubble_glyph_color"); // 1
    form.button("Lag Clear (Ground Items)", "textures/ui/icon_trash");        // 2
    form.button("View General Action Logs", "textures/ui/book_writable");     // 3
    form.button("View Moderation Logs", "textures/ui/book_edit_default");     // 4
    form.button("Back to Main Admin Panel", "textures/ui/undo");              // 5

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies);
            return;
        }
        switch (response.selection) {
            case 0: await showSystemInfo(adminPlayer, config, playerDataManager, dependencies); break;
            case 1: await handleClearChatAction(adminPlayer, playerDataManager, config, dependencies); break;
            case 2: await handleLagClearAction(adminPlayer, config, playerDataManager, dependencies); break;
            case 3: await showActionLogsForm(adminPlayer, config, playerDataManager, dependencies); break;
            case 4: await showModLogTypeSelectionForm(adminPlayer, dependencies, null); break;
            case 5: await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies); break;
            default:
                adminPlayer.sendMessage("§cInvalid selection from server management.");
                await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
                break;
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showServerManagementForm for ${adminPlayer.nameTag}: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage("§cAn error occurred displaying server management options.");
        await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies); // Fallback
    }
};

/**
 * Displays a form showing all general action logs to the admin player.
 * @param {mc.Player} adminPlayer - The admin player viewing the logs.
 * @param {import('../config.js').editableConfigValues} config - The system configuration.
 * @param {import('./playerDataManager.js')} playerDataManager - The player data manager instance.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 */
async function showActionLogsForm(adminPlayer, config, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: Action Logs (All) requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new MessageFormData();
    form.title("Action Logs (All - Latest)");

    const logsToDisplayCount = 50; // How many latest logs to show
    const logs = logManager.getLogs(logsToDisplayCount); // Use direct import of logManager
    let bodyContent = "";

    if (logs.length === 0) {
        bodyContent = "No action logs found.";
    } else {
        bodyContent = logs.map(logEntry => {
            const timestampStr = new Date(logEntry.timestamp).toLocaleString();
            let line = `§7[${timestampStr}] §e${logEntry.adminName || logEntry.playerName || 'SYSTEM'}§r ${logEntry.actionType} §b${logEntry.targetName || ''}§r`;
            if (logEntry.duration) line += ` (§7Dur: ${logEntry.duration}§r)`;
            if (logEntry.reason) line += ` (§7Reason: ${logEntry.reason}§r)`;
            if (logEntry.details) line += ` (§7Details: ${logEntry.details}§r)`;
            return line;
        }).join("\n");

        if (logs.length === logsToDisplayCount) { // Implying there might be more logs than displayed
            bodyContent += `\n§o(Displaying latest ${logsToDisplayCount} logs. Older logs may exist.)§r`;
        }
    }
    form.body(bodyContent.trim() || "No logs to display.");
    form.button1("Back to Server Management");

    await form.show(adminPlayer).catch(e => playerUtils.debugLog(`Error in showActionLogsForm: ${e.stack || e}`, adminPlayer.nameTag));
    await showServerManagementForm(adminPlayer, config, playerDataManager, dependencies);
}

/**
 * Displays a form to reset a player's flags using a text input for the target player's name.
 * This form then calls the 'resetflags' command module.
 * @param {mc.Player} adminPlayer - The admin player initiating the reset.
 * @param {import('./playerDataManager.js')} playerDataManager - The player data manager instance.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 */
async function showResetFlagsForm(adminPlayer, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: Reset Flags form requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const resetFlagsExecute = dependencies.commandExecutionMap?.get('resetflags');
    if (!resetFlagsExecute) {
        adminPlayer.sendMessage("§cResetflags command module not found.");
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
        return;
    }

    const modalForm = new ModalFormData().title("Reset Player Flags (Text Entry)");
    modalForm.textField("Enter Player Name to Reset Flags:", "TargetPlayerName");
    modalForm.toggle("Confirm Reset (Cannot be undone!)", false);

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled || !response.formValues[1]) { // If cancelled or toggle not confirmed
            adminPlayer.sendMessage("§7Flag reset cancelled.");
        } else {
            const targetPlayerName = response.formValues[0];
            if (!targetPlayerName || targetPlayerName.trim() === "") {
                adminPlayer.sendMessage("§cPlayer name cannot be empty.");
            } else {
                await resetFlagsExecute(adminPlayer, [targetPlayerName.trim()], dependencies);
            }
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showResetFlagsForm: ${error.stack || error}`, adminPlayer.nameTag);
        adminPlayer.sendMessage("§cAn error occurred during the reset flags process.");
    }
    await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies); // Always navigate back
}

/**
 * Displays a list of currently watched players to the admin.
 * @param {mc.Player} adminPlayer - The admin player viewing the list.
 * @param {import('./playerDataManager.js')} playerDataManager - The player data manager instance.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 */
async function showWatchedPlayersList(adminPlayer, playerDataManager, dependencies) {
    playerUtils.debugLog(`UI: Watched Players list requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    let body = "§e--- Watched Players ---\n";
    let watchedCount = 0;
    mc.world.getAllPlayers().forEach(p => { // Iterate through all online players
        const pData = playerDataManager.getPlayerData(p.id);
        if (pData?.isWatched) {
            body += `§f- ${p.nameTag}\n`;
            watchedCount++;
        }
    });

    if (watchedCount === 0) {
        body = "§7No players are currently being watched.";
    }

    const form = new MessageFormData()
        .title("Watched Players")
        .body(body.trim())
        .button1("OK");
    await form.show(adminPlayer).catch(e => playerUtils.debugLog(`Error showing watched players list: ${e.stack || e}`, adminPlayer.nameTag));
    // This form is informational, so it naturally leads back to the main admin panel.
    await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
}

[end of AntiCheatsBP/scripts/core/uiManager.js]
