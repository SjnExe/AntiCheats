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
    form.body("Select a player to view details:");

    const playerMappings = []; // To map selection to player ID

    for (const p of onlinePlayers) {
        const targetPData = playerDataManager.getPlayerData(p.id);
        const buttonText = targetPData
            ? `${p.nameTag} (Flags: ${targetPData.flags.totalFlags})`
            : p.nameTag; // Fallback if pData somehow not available
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
            const targetPData = playerDataManager.getPlayerData(targetPlayer.id);
            if (targetPData) {
                let summary = `§a--- AntiCheat Data for ${targetPlayer.nameTag} ---\n`;
                summary += `§eID: §f${targetPlayer.id}\n`; // Added player ID
                summary += `§eDimension: §f${targetPlayer.dimension.id}\n`; // Added dimension
                summary += `§eLocation: §fX:${targetPlayer.location.x.toFixed(1)}, Y:${targetPlayer.location.y.toFixed(1)}, Z:${targetPlayer.location.z.toFixed(1)}\n`; // Added location
                summary += `§eWatched: §f${targetPData.isWatched}\n`;
                summary += `§eTotal Flags: §f${targetPData.flags.totalFlags}\n`;
                summary += `§eLast Flag Type: §f${targetPData.lastFlagType || "None"}\n`;
                summary += `§eIndividual Flags:\n`;
                let hasFlags = false;
                for (const flagKey in targetPData.flags) {
                    if (flagKey !== "totalFlags" && typeof targetPData.flags[flagKey] === 'object' && targetPData.flags[flagKey] !== null) {
                        const flagData = targetPData.flags[flagKey];
                        if (flagData.count > 0) { // Only show flags that have been triggered
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
                adminPlayer.sendMessage("§cCould not retrieve data for the selected player.");
                playerUtils.debugLog(`Could not retrieve pData for ${targetPlayer.nameTag} (ID: ${targetPlayer.id}) in showOnlinePlayersList.`, adminPlayer.nameTag);
            }
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
    form.title("AC Admin Panel");
    form.body("Select an action:");
    form.button("View Online Players", "textures/ui/icon_multiplayer"); // Example icon
    form.button("Server Stats (TODO)", "textures/ui/icon_graph");   // Placeholder
    form.button("Settings (TODO)", "textures/ui/gear");       // Placeholder

    try {
        const response = await form.show(adminPlayer);

        if (response.canceled) {
            if (response.cancelationReason) {
                playerUtils.debugLog(`Admin Panel Main canceled by ${adminPlayer.nameTag}. Reason: ${response.cancelationReason}`, adminPlayer.nameTag);
            } else {
                playerUtils.debugLog(`Admin Panel Main canceled by ${adminPlayer.nameTag}.`, adminPlayer.nameTag);
            }
            return;
        }

        switch (response.selection) {
            case 0: // View Online Players
                await showOnlinePlayersList(adminPlayer, playerDataManager);
                break;
            case 1: // Server Stats TODO
                adminPlayer.sendMessage("§7Server Stats functionality is not yet implemented.");
                break;
            case 2: // Settings TODO
                adminPlayer.sendMessage("§7Settings functionality is not yet implemented.");
                break;
            default:
                adminPlayer.sendMessage("§cInvalid selection from Admin Panel.");
                break;
        }
    } catch (error) {
        playerUtils.debugLog(`Error in showAdminPanelMain for ${adminPlayer.nameTag}: ${error}`, adminPlayer.nameTag);
        console.error(`[uiManager.showAdminPanelMain] Error for ${adminPlayer.nameTag}:`, error, error.stack);
        adminPlayer.sendMessage("§cAn error occurred while trying to display the Admin Panel.");
    }
}

/**
 * Displays a read-only view of a target player's inventory to an admin.
 * @param {mc.Player} adminPlayer The admin player who initiated the request.
 * @param {mc.Player} targetPlayer The player whose inventory is to be displayed.
 */
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

        // 1. Main Hand Slot
        const mainHandItem = container.getItem(targetPlayer.selectedSlot);
        inventoryContent += `§eMain Hand (Slot ${targetPlayer.selectedSlot}):§r\n`;
        if (mainHandItem) {
            inventoryContent += `  §f- ${mainHandItem.typeId} (x${mainHandItem.amount}) ${mainHandItem.nameTag ? '§7[' + mainHandItem.nameTag + ']§r' : ''}\n`;
        } else {
            inventoryContent += `  §7- Empty\n`;
        }

        // 2. Armor Slots
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
                     inventoryContent += `Error accessing ${armorSlot.name} slot.\n`; // Should not happen if component exists
                     playerUtils.debugLog(`Error accessing ${armorSlot.name} for ${targetPlayer.nameTag}: ${e}`, adminPlayer.nameTag);
                }
            }
        } else {
            inventoryContent += "  Could not access armor slots component.\n";
        }

        // 3. Main Inventory
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

        if (inventoryContent.trim() === `§lInventory of ${targetPlayer.nameTag}§r`) { // Check if only title part is there
            inventoryContent = "Inventory appears to be empty or inaccessible after checks.";
        }

        const form = new MessageFormData();
        form.title(`Inventory of ${targetPlayer.nameTag}`);
        form.body(inventoryContent);
        form.button1("Close"); // "OK" or "Close"

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
