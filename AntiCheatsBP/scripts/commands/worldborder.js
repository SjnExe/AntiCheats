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
    permissionLevel: permissionLevels.admin,
    requiresCheats: false,
    syntax: `${config.prefix}wb <set|get|toggle|remove> [args...]`, // General syntax
    subcommands: [
        {
            name: "set",
            description: "Sets a square or circle world border for a dimension. Applies default damage settings.",
            parameters: [ // Note: These are more for help text generation; actual parsing is manual.
                { name: "shape", type: "string", description: "'square' or 'circle'." },
                { name: "centerX", type: "number", description: "Center X-coordinate." },
                { name: "centerZ", type: "number", description: "Center Z-coordinate." },
                { name: "size", type: "number", description: "For square: half-size. For circle: radius." },
                { name: "dimensionId", type: "string", optional: true, description: "Dimension ID (e.g., overworld). Defaults to current." },
                // Damage parameters are not explicitly listed here for 'set' to keep it simpler,
                // as 'set' now applies defaults. A separate damage config command would be clearer.
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
        playerUtils.warnPlayer(player, `Invalid subcommand. Usage: ${commandData.syntax}`);
        playerUtils.notifyPlayer(player, `Available subcommands: set, get, toggle, remove. Use !help wb <subcommand> for details.`);
        return;
    }

    // Permission check is handled by commandManager

    // Updated help message
    if (args.length === 0 && !subCommand) { // Or if subCommand is 'help' and no further args
        playerUtils.notifyPlayer(player, "§b--- World Border Commands ---§r");
        playerUtils.notifyPlayer(player, `§7${config.prefix}wb set <square|circle> <centerX> <centerZ> <size> [dim]§r - Sets border. Size is half-length for square, radius for circle.`);
        playerUtils.notifyPlayer(player, `§7${config.prefix}wb get [dim]§r - Shows current border settings.`);
        playerUtils.notifyPlayer(player, `§7${config.prefix}wb toggle <on|off> [dim]§r - Enables/disables border.`);
        playerUtils.notifyPlayer(player, `§7${config.prefix}wb remove [dim]§r - Deletes border settings.`);
        playerUtils.notifyPlayer(player, `§7Dimension [dim] can be 'overworld', 'nether', 'the_end', or omitted for current.`);
        return;
    }

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
    // Command structure: !wb set <shape> <centerX> <centerZ> <sizeParam> [dimensionId]
    // Example args array for `handleSetCommand(player, args...)`:
    // args[0] = shape ("square" or "circle")
    // args[1] = centerX
    // args[2] = centerZ
    // args[3] = sizeParam (halfSize or radius)
    // args[4] = dimensionId (optional)

    if (args.length < 4) { // Need at least shape, centerX, centerZ, sizeParam
        playerUtils.warnPlayer(player, `Usage: ${config.prefix}wb set <square|circle> <centerX> <centerZ> <size> [dimensionId]`);
        playerUtils.notifyPlayer(player, "Size is half-length for square, radius for circle.");
        return;
    }

    const shape = args[0].toLowerCase();
    if (shape !== "square" && shape !== "circle") {
        playerUtils.warnPlayer(player, "Invalid shape. Must be 'square' or 'circle'.");
        return;
    }

    const centerX = parseInt(args[1]);
    const centerZ = parseInt(args[2]);
    const sizeParam = parseInt(args[3]);

    if (isNaN(centerX) || isNaN(centerZ) || isNaN(sizeParam)) {
        playerUtils.warnPlayer(player, "Invalid coordinates or size. centerX, centerZ, and size must be numbers.");
        return;
    }
    if (sizeParam <= 0) {
        playerUtils.warnPlayer(player, "Size parameter (halfSize/radius) must be greater than 0.");
        return;
    }

    const dimensionIdInput = args.length > 4 ? args[4] : player.dimension.id; // If dimensionId is args[4]
    const dimensionId = normalizeDimensionId(dimensionIdInput, player.dimension.id);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `Invalid dimension ID: '${dimensionIdInput}'. Use overworld, nether, or the_end, or their full Minecraft IDs.`);
        return;
    }

    let settingsToSave = {
        shape,
        centerX,
        centerZ,
        enabled: true, // Default to enabled when set
        // Apply default damage settings when setting a new border or changing shape
        enableDamage: config.worldBorderDefaultEnableDamage,
        damageAmount: config.worldBorderDefaultDamageAmount,
        damageIntervalTicks: config.worldBorderDefaultDamageIntervalTicks,
        teleportAfterNumDamageEvents: config.worldBorderTeleportAfterNumDamageEvents,
    };

    if (shape === "square") {
        settingsToSave.halfSize = sizeParam;
    } else if (shape === "circle") {
        settingsToSave.radius = sizeParam;
    }
    // No 'else' needed here due to earlier shape validation

    // When setting a new border geometry, always apply default damage settings from config.
    // This simplifies the 'set' command. Fine-tuning damage can be a separate command.
    // Note: config.worldBorderDefaultEnableDamage etc. are the global defaults.

    if (saveBorderSettings(dimensionId, settingsToSave)) {
        let sizeDisplay = "";
        if (shape === "square") {
            sizeDisplay = `halfSize ${settingsToSave.halfSize} (Full: ${settingsToSave.halfSize * 2}x${settingsToSave.halfSize * 2})`;
        } else { // circle
            sizeDisplay = `radius ${settingsToSave.radius}`;
        }
        const damageStatus = settingsToSave.enableDamage ? `ON (Amount: ${settingsToSave.damageAmount}, Interval: ${settingsToSave.damageIntervalTicks}t, TP Events: ${settingsToSave.teleportAfterNumDamageEvents})` : 'OFF';

        playerUtils.notifyPlayer(player, `§aWorld border set for ${dimensionId}:`);
        playerUtils.notifyPlayer(player, `  Shape: ${shape}, Center: (${centerX},${centerZ}), ${sizeDisplay}.`);
        playerUtils.notifyPlayer(player, `  Damage settings applied from defaults: ${damageStatus}.`);

        if (logManager && typeof logManager.addLog === 'function') {
            const savedSettingsForLog = getBorderSettings(dimensionId); // Get the fully processed settings
            logManager.addLog({ adminName: player.nameTag, actionType: 'worldborder_set', targetName: dimensionId, details: JSON.stringify(savedSettingsForLog || settingsToSave) });
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
        playerUtils.notifyPlayer(player, `§b--- World Border for ${dimensionId} ---§r`);
        playerUtils.notifyPlayer(player, `  Enabled: §e${settings.enabled}`);
        playerUtils.notifyPlayer(player, `  Shape: §e${settings.shape}`);
        playerUtils.notifyPlayer(player, `  Center: §e(${settings.centerX}, ${settings.centerZ})`);

        if (settings.shape === "square" && typeof settings.halfSize === 'number') {
            playerUtils.notifyPlayer(player, `  Half Size: §e${settings.halfSize} §7(Full Diameter: ${settings.halfSize * 2})`);
            playerUtils.notifyPlayer(player, `  Bounds: §7X[${settings.centerX - settings.halfSize} to ${settings.centerX + settings.halfSize}], Z[${settings.centerZ - settings.halfSize} to ${settings.centerZ + settings.halfSize}]`);
        } else if (settings.shape === "circle" && typeof settings.radius === 'number') {
            playerUtils.notifyPlayer(player, `  Radius: §e${settings.radius}`);
            // Bounds for a circle are implicit and not easily represented as min/max X/Z.
        }

        // Display damage settings, using global defaults from config if not set on the border object
        const enableDamage = settings.enableDamage ?? config.worldBorderDefaultEnableDamage;
        const damageAmount = settings.damageAmount ?? config.worldBorderDefaultDamageAmount;
        const damageInterval = settings.damageIntervalTicks ?? config.worldBorderDefaultDamageIntervalTicks;
        const teleportEvents = settings.teleportAfterNumDamageEvents ?? config.worldBorderTeleportAfterNumDamageEvents;

        playerUtils.notifyPlayer(player, `  Damage Enabled: §e${enableDamage}`);
        if (enableDamage) {
            playerUtils.notifyPlayer(player, `    Damage Amount: §e${damageAmount}`);
            playerUtils.notifyPlayer(player, `    Damage Interval: §e${damageInterval} ticks`);
            playerUtils.notifyPlayer(player, `    Teleport After: §e${teleportEvents} damage events`);
        }
    } else {
        playerUtils.notifyPlayer(player, `§eNo world border configured for ${dimensionId}. Use '${config.prefix}wb set ...' to create one.`);
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
