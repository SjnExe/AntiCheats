import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
// Assuming playerUtils contains debugLog, notifyAdmins
import * as playerUtils from '../utils/playerUtils.js';
import { getPlayerPermissionLevel } from '../utils/playerUtils.js'; // Added
import { PermissionLevels } from './rankManager.js'; // Added
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

async function showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager) {
    playerUtils.debugLog(`UI: showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}`, adminPlayer.nameTag);

    const form = new ActionFormData();
    form.title(`Actions for ${targetPlayer.nameTag}`);

    const frozenTag = "frozen";
    const isTargetFrozen = targetPlayer.hasTag(frozenTag);
    const freezeButtonText = isTargetFrozen ? "Unfreeze Player" : "Freeze Player";
    const freezeButtonIcon = isTargetFrozen ? "textures/ui/icon_unlocked" : "textures/ui/icon_locked";

    form.button("View Detailed Info/Flags", "textures/ui/magnifying_glass"); // 0
    form.button("Kick Player", "textures/ui/icon_hammer");                   // 1
    form.button(freezeButtonText, freezeButtonIcon);                         // 2
    form.button("Reset Player Flags", "textures/ui/refresh");                // 3
    form.button("Back to Player List", "textures/ui/undo");                  // 4

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
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager); // Re-show actions form
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
                const reason = kickConfirmResponse.formValues[0] || "Kicked by an administrator via panel.";
                const confirmedKick = kickConfirmResponse.formValues[1];

                if (confirmedKick) {
                    try {
                        targetPlayer.kick(reason);
                        adminPlayer.sendMessage(`§aPlayer ${targetPlayer.nameTag} has been kicked. Reason: ${reason}`);
                        playerUtils.notifyAdmins(`Player ${targetPlayer.nameTag} was kicked by ${adminPlayer.nameTag} via panel. Reason: ${reason}`, adminPlayer, null);
                        playerUtils.debugLog(`Player ${targetPlayer.nameTag} kicked by ${adminPlayer.nameTag} via panel. Reason: ${reason}`, adminPlayer.nameTag);
                        await showOnlinePlayersList(adminPlayer, playerDataManager); // Go back to player list after kick
                    } catch (e) {
                        adminPlayer.sendMessage(`§cError kicking ${targetPlayer.nameTag}: ${e}`);
                        playerUtils.debugLog(`Error kicking ${targetPlayer.nameTag}: ${e}`, adminPlayer.nameTag);
                        await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager); // Re-show actions form on error
                    }
                } else {
                    adminPlayer.sendMessage("§7Kick cancelled for " + targetPlayer.nameTag);
                    await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
                }
                break;

            case 2: // Freeze/Unfreeze Player
                // const frozenTag = "frozen"; // Already defined above before button creation
                // const isTargetFrozen = targetPlayer.hasTag(frozenTag); // Already defined above
                const targetFreezeState = !isTargetFrozen; // We are toggling
                const effectDuration = 2000000;

                if (targetFreezeState === true) { // Action is to freeze
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
                } else { // Action is to unfreeze
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
                // After action, re-show the actions form to reflect the new state
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
                break;

            case 3: // Reset Player Flags
                const confirmResetForm = new ModalFormData(); // Renamed to avoid conflict
                confirmResetForm.title("Confirm Reset Flags");
                confirmResetForm.toggle(`Reset all flags for ${targetPlayer.nameTag}? This action cannot be undone.`, false);

                const confirmResetResponse = await confirmResetForm.show(adminPlayer); // Renamed to avoid conflict

                if (confirmResetResponse.canceled) {
                    adminPlayer.sendMessage("§7Flag reset cancelled for " + targetPlayer.nameTag);
                    await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager);
                    return;
                }

                const confirmedReset = confirmResetResponse.formValues[0]; // Renamed to avoid conflict
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

            case 4: // Back to Player List
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

export async function showAdminPanelMain(adminPlayer, playerDataManager) {
    playerUtils.debugLog(`UI: Admin Panel Main requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData();
    const userPermLevel = getPlayerPermissionLevel(adminPlayer);

    let response;

    try {
        if (userPermLevel <= PermissionLevels.ADMIN) {
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
                case 0: adminPlayer.sendMessage("§7'My Stats' is not yet implemented."); break;
                case 1: adminPlayer.sendMessage("§7'Server Rules' display is not yet implemented."); break;
                case 2: adminPlayer.sendMessage("§7'Help & Links' is not yet implemented."); break;
                default: adminPlayer.sendMessage("§cInvalid selection from Info Panel."); break;
            }
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showAdminPanelMain for ${adminPlayer.nameTag} (Perm: ${userPermLevel}): ${error}`, adminPlayer.nameTag);
        console.error(`[uiManager.showAdminPanelMain] Error for ${adminPlayer.nameTag}:`, error, error.stack);
        adminPlayer.sendMessage("§cAn error occurred while trying to display the panel.");
    }
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
