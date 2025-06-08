/**
 * @file AntiCheatsBP/scripts/commands/worldborder.js
 * Manages world border settings via commands.
 * @version 1.0.0
 */
import * as mc from '@minecraft/server';
import { world, system } from '@minecraft/server';
import { getPlayerPermissionLevel, permissionLevels } from '../core/rankManager.js';
import { saveBorderSettings, getBorderSettings, clearBorderSettings } from '../utils/worldBorderManager.js';
// logManager.addLog will be accessed via dependencies.logManager.addLog

export const commandData = {
    name: "worldborder",
    description: "Manages the world border for different dimensions.",
    aliases: ["wb"],
    permissionLevel: permissionLevels.admin, // Or owner, adjust as needed
    requiresCheats: false,
    subcommands: [
        {
            name: "set",
            description: "Sets a square world border for a dimension.",
            parameters: [
                { name: "shape", type: "string", description: "Shape of the border (currently only 'square')." },
                { name: "centerX", type: "number", description: "Center X-coordinate." },
                { name: "centerZ", type: "number", description: "Center Z-coordinate." },
                { name: "halfSize", type: "number", description: "Half the side length of the square border." },
                { name: "dimensionId", type: "string", optional: true, description: "Dimension ID (e.g., overworld, nether, the_end). Defaults to current." }
            ]
        },
        {
            name: "get",
            description: "Gets the current world border settings for a dimension.",
            parameters: [
                { name: "dimensionId", type: "string", optional: true, description: "Dimension ID. Defaults to current." }
            ]
        },
        {
            name: "toggle",
            description: "Toggles the world border on or off for a dimension.",
            parameters: [
                { name: "state", type: "string", description: "'on' or 'off'."},
                { name: "dimensionId", type: "string", optional: true, description: "Dimension ID. Defaults to current." }
            ]
        },
        {
            name: "remove",
            description: "Removes the world border settings for a dimension.",
            parameters: [
                { name: "dimensionId", type: "string", optional: true, description: "Dimension ID. Defaults to current." }
            ]
        }
    ]
};

export async function execute(player, args, subCommand, config, dependencies) {
    const { playerUtils, logManager } = dependencies;
    const subCommandData = commandData.subcommands.find(sc => sc.name === subCommand);

    if (!subCommandData) {
        playerUtils.warnPlayer(player, "Invalid subcommand. Available: set, get, toggle, remove.");
        return;
    }

    // Permission check is handled by commandManager

    switch (subCommand) {
        case "set":
            await handleSetCommand(player, args, playerUtils, logManager, config, dependencies);
            break;
        case "get":
            await handleGetCommand(player, args, playerUtils, logManager, dependencies);
            break;
        case "toggle":
            await handleToggleCommand(player, args, playerUtils, logManager, config, dependencies);
            break;
        case "remove":
            await handleRemoveCommand(player, args, playerUtils, logManager, dependencies);
            break;
    }
}

function normalizeDimensionId(inputDimId, currentPlayerDimensionId) {
    let normalized = inputDimId ? inputDimId.toLowerCase() : currentPlayerDimensionId;
    if (normalized === "overworld") return "minecraft:overworld";
    if (normalized === "nether") return "minecraft:the_nether";
    if (normalized === "the_end" || normalized === "end") return "minecraft:the_end";
    // Check if it's already in the correct full format
    if (normalized === "minecraft:overworld" || normalized === "minecraft:the_nether" || normalized === "minecraft:the_end") return normalized;
    return null; // Invalid or unrecognized
}


async function handleSetCommand(player, args, playerUtils, logManager, config, dependencies) {
    if (args.length < 4) {
        playerUtils.warnPlayer(player, "Usage: !worldborder set <square> <centerX> <centerZ> <halfSize> [dimensionId]");
        return;
    }

    const shape = args[0].toLowerCase();
    if (shape !== 'square') {
        playerUtils.warnPlayer(player, "Invalid shape. Currently only 'square' is supported.");
        return;
    }

    const centerX = parseInt(args[1]);
    const centerZ = parseInt(args[2]);
    const halfSize = parseInt(args[3]);

    const dimensionIdInput = args.length > 4 ? args[4] : player.dimension.id;
    const dimensionId = normalizeDimensionId(dimensionIdInput, player.dimension.id);

    if (isNaN(centerX) || isNaN(centerZ) || isNaN(halfSize) || halfSize <= 0) {
        playerUtils.warnPlayer(player, "Invalid coordinates or size. centerX, centerZ, halfSize must be numbers, and halfSize > 0.");
        return;
    }

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `Invalid dimension ID: '${args[4] || player.dimension.id}'. Use overworld, nether, or the_end, or their full IDs.`);
        return;
    }

    const settings = {
        shape: "square",
        centerX: centerX,
        centerZ: centerZ,
        halfSize: halfSize,
                enabled: true, // Default to enabled when set
                // Initialize damage properties based on inputs or defaults
                enableDamage: args.length > 5 ? (args[5].toLowerCase() === 'true' || args[5] === 'on') : config.worldBorderDefaultEnableDamage,
    };

            if (settings.enableDamage) {
                settings.damageAmount = args.length > 6 && !isNaN(parseFloat(args[6])) ? parseFloat(args[6]) : config.worldBorderDefaultDamageAmount;
                settings.damageIntervalTicks = args.length > 7 && !isNaN(parseInt(args[7])) ? parseInt(args[7]) : config.worldBorderDefaultDamageIntervalTicks;
                settings.teleportAfterNumDamageEvents = args.length > 8 && !isNaN(parseInt(args[8])) ? parseInt(args[8]) : config.worldBorderTeleportAfterNumDamageEvents;
            } else {
                // If damage is not enabled, we can either not store them, or store them with defaults/nulls
                // Storing with defaults might be better if user toggles damage on later without re-setting values
                settings.damageAmount = config.worldBorderDefaultDamageAmount;
                settings.damageIntervalTicks = config.worldBorderDefaultDamageIntervalTicks;
                settings.teleportAfterNumDamageEvents = config.worldBorderTeleportAfterNumDamageEvents;
            }

            // dimensionId is added by saveBorderSettings internally from the parameter
            const { dimensionId: dimId, ...settingsToPersist } = settings; // Exclude dimensionId for saving if it's part of settings

            if (saveBorderSettings(dimensionId, settingsToPersist)) {
                let successMsg = `§aWorld border set for ${dimensionId}: square, center (${centerX},${centerZ}), size ${halfSize*2}x${halfSize*2}.`;
                if (settings.enableDamage) {
                    successMsg += ` Damage: ON (Amount: ${settings.damageAmount}, Interval: ${settings.damageIntervalTicks}t, Teleport After: ${settings.teleportAfterNumDamageEvents} events).`;
                } else {
                    successMsg += ` Damage: OFF.`;
                }
        playerUtils.notifyPlayer(player, successMsg);
        if (logManager && typeof logManager.addLog === 'function') {
                    logManager.addLog({ adminName: player.nameTag, actionType: 'worldborder_set', targetName: dimensionId, details: JSON.stringify(fullSettings) }); // Log full settings
        } else {
            playerUtils.debugLog("LogManager or addLog not available for worldborder_set.", null);
        }
    } else {
        playerUtils.warnPlayer(player, "§cFailed to save world border settings.");
    }
}

async function handleGetCommand(player, args, playerUtils, logManager, dependencies) {
    const dimensionIdInput = args.length > 0 ? args[0] : player.dimension.id;
    const dimensionId = normalizeDimensionId(dimensionIdInput, player.dimension.id);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `Invalid dimension ID: '${args[0] || player.dimension.id}'. Use overworld, nether, or the_end, or their full IDs.`);
        return;
    }

    const settings = getBorderSettings(dimensionId);
    if (settings) {
        playerUtils.notifyPlayer(player, `§bWorld Border for ${dimensionId}:`);
        playerUtils.notifyPlayer(player, `  Enabled: ${settings.enabled}`);
        playerUtils.notifyPlayer(player, `  Shape: ${settings.shape}`);
        playerUtils.notifyPlayer(player, `  Center: (${settings.centerX}, ${settings.centerZ})`);
        playerUtils.notifyPlayer(player, `  Half Size: ${settings.halfSize} (Full Size: ${settings.halfSize * 2})`);
        playerUtils.notifyPlayer(player, `  Bounds: X[${settings.centerX - settings.halfSize} to ${settings.centerX + settings.halfSize}], Z[${settings.centerZ - settings.halfSize} to ${settings.centerZ + settings.halfSize}]`);
                if (typeof settings.enableDamage !== 'undefined') { // Check if damage settings exist
                    playerUtils.notifyPlayer(player, `  Damage Enabled: ${settings.enableDamage}`);
                    if (settings.enableDamage) {
                        playerUtils.notifyPlayer(player, `    Damage Amount: ${settings.damageAmount ?? config.worldBorderDefaultDamageAmount}`);
                        playerUtils.notifyPlayer(player, `    Damage Interval: ${settings.damageIntervalTicks ?? config.worldBorderDefaultDamageIntervalTicks} ticks`);
                        playerUtils.notifyPlayer(player, `    Teleport After: ${settings.teleportAfterNumDamageEvents ?? config.worldBorderTeleportAfterNumDamageEvents} damage events`);
                    }
                } else {
                    playerUtils.notifyPlayer(player, `  Damage Settings: Not specified (Defaults will apply if enabled via toggle).`);
                }
    } else {
        playerUtils.notifyPlayer(player, `§eNo world border configured for ${dimensionId}.`);
    }
}

async function handleToggleCommand(player, args, playerUtils, logManager, config, dependencies) {
    if (args.length < 1) {
        playerUtils.warnPlayer(player, "Usage: !worldborder toggle <on|off> [dimensionId]");
        return;
    }

    const state = args[0].toLowerCase();
    if (state !== 'on' && state !== 'off') {
        playerUtils.warnPlayer(player, "Invalid state. Use 'on' or 'off'.");
        return;
    }

    const dimensionIdInput = args.length > 1 ? args[1] : player.dimension.id;
    const dimensionId = normalizeDimensionId(dimensionIdInput, player.dimension.id);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `Invalid dimension ID: '${args[1] || player.dimension.id}'. Use overworld, nether, or the_end, or their full IDs.`);
        return;
    }

    const currentSettings = getBorderSettings(dimensionId);
    if (!currentSettings) {
        playerUtils.warnPlayer(player, `§eNo world border configured for ${dimensionId}. Use 'set' command first to define a border.`);
        return;
    }

    const newState = state === 'on';
    if (currentSettings.enabled === newState) {
        playerUtils.notifyPlayer(player, `§eWorld border for ${dimensionId} is already ${state}.`);
        return;
    }

    currentSettings.enabled = newState;

            // saveBorderSettings expects the settings object without dimensionId if it's passed as a separate arg.
            // Our saveBorderSettings(dimensionId, settingsToSave) adds dimensionId internally.
            // So, we pass the full currentSettings (which includes dimensionId) but it will be overwritten by the explicit param.
            // More accurately, we should pass the part of settings that doesn't include the dimensionId IF saveBorderSettings expects that.
            // Our current saveBorderSettings takes (dimensionId, settingsObject), and adds dimensionId to settingsObject.
            // So, ensure settingsToSave for saveBorderSettings doesn't nest dimensionId if it's already a top-level key.
            const { dimensionId: dimIdToExclude, ...settingsObjectForSaving } = currentSettings;


            if (saveBorderSettings(dimensionId, settingsObjectForSaving)) {
        const successMsg = `§aWorld border for ${dimensionId} turned ${state}.`;
        playerUtils.notifyPlayer(player, successMsg);
                // Log the full settings object to see what's stored, or just the toggle action.
                // For consistency, log the resulting state including all parameters.
                const finalSettingsForLog = getBorderSettings(dimensionId); // Get what was actually saved with defaults.
        if (logManager && typeof logManager.addLog === 'function') {
                    logManager.addLog({ adminName: player.nameTag, actionType: 'worldborder_toggle', targetName: dimensionId, details: `Set to ${state}. Full settings: ${JSON.stringify(finalSettingsForLog)}` });
        } else {
            playerUtils.debugLog("LogManager or addLog not available for worldborder_toggle.", null);
        }
    } else {
        playerUtils.warnPlayer(player, "§cFailed to update world border state.");
    }
}

async function handleRemoveCommand(player, args, playerUtils, logManager, dependencies) {
    const dimensionIdInput = args.length > 0 ? args[0] : player.dimension.id;
    const dimensionId = normalizeDimensionId(dimensionIdInput, player.dimension.id);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `Invalid dimension ID: '${args[0] || player.dimension.id}'. Use overworld, nether, or the_end, or their full IDs.`);
        return;
    }

    if (clearBorderSettings(dimensionId)) {
        const successMsg = `§aWorld border settings removed for ${dimensionId}.`;
        playerUtils.notifyPlayer(player, successMsg);
         if (logManager && typeof logManager.addLog === 'function') {
            logManager.addLog({ adminName: player.nameTag, actionType: 'worldborder_remove', targetName: dimensionId, details: 'Border removed' });
        } else {
            playerUtils.debugLog("LogManager or addLog not available for worldborder_remove.", null);
        }
    } else {
        playerUtils.warnPlayer(player, "§cFailed to remove world border settings. It might not have been set or an error occurred.");
    }
}
