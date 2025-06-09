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
    syntax: `${config.prefix}wb <set|get|toggle|remove|shrink|expand> [args...]`, // General syntax
    subcommands: [
        {
            name: "set",
            description: "Sets a square or circle world border. Cancels any ongoing resize. Applies default damage settings.",
            parameters: [
                { name: "shape", type: "string", description: "'square' or 'circle'." },
                { name: "centerX", type: "number", description: "Center X-coordinate." },
                { name: "centerZ", type: "number", description: "Center Z-coordinate." },
                { name: "size", type: "number", description: "For square: half-size. For circle: radius." },
                { name: "dimensionId", type: "string", optional: true, description: "Dimension ID (e.g., overworld). Defaults to current." }
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
            description: "Removes the world border settings for a dimension (requires confirmation). Syntax: !wb remove [dimensionId] confirm",
            parameters: [
                { name: "dimensionId", type: "string", optional: true, description: "Dimension ID (e.g., overworld, nether, the_end). Defaults to current dimension if 'confirm' is the only argument or if no dimension is specified before 'confirm'." },
                { name: "confirm", type: "literal", value: "confirm", optional: true, description: "Required to confirm the removal action." }
            ]
        },
        {
            name: "shrink",
            description: "Gradually shrinks the border to a new size over a specified time.",
            parameters: [
                { name: "new_size", type: "number", description: "Target size (halfSize for square, radius for circle)." },
                { name: "time_seconds", type: "number", description: "Duration of the shrink operation in seconds." },
                { name: "dimensionId", type: "string", optional: true, description: "Dimension ID. Defaults to current." }
            ]
        },
        {
            name: "expand",
            description: "Gradually expands the border to a new size over a specified time.",
            parameters: [
                { name: "new_size", type: "number", description: "Target size (halfSize for square, radius for circle)." },
                { name: "time_seconds", type: "number", description: "Duration of the expand operation in seconds." },
                { name: "dimensionId", type: "string", optional: true, description: "Dimension ID. Defaults to current." }
            ]
        },
        {
            name: "resizepause",
            description: "Pauses an ongoing border resize operation.",
            parameters: [
                { name: "dimensionId", type: "string", optional: true, description: "Dimension ID. Defaults to current." }
            ]
        },
        {
            name: "resizeresume",
            description: "Resumes a paused border resize operation.",
            parameters: [
                { name: "dimensionId", type: "string", optional: true, description: "Dimension ID. Defaults to current." }
            ]
        },
        {
            name: "setglobalparticle",
            description: "Sets the global default particle name for world border visuals.",
            parameters: [
                { name: "particleName", type: "string", description: "The Minecraft particle name (e.g., minecraft:end_rod)." }
            ]
        }
    ]
};

export async function execute(player, args, subCommand, config, dependencies) {
    const { playerUtils, logManager, configModule } = dependencies; // Destructure configModule

    // Centralized help display if no subcommand or "help" is used
    if (!subCommand || subCommand === "help") {
        // Use configModule.prefix for consistency if editableConfigValues.prefix might differ or not exist
        const cmdPrefix = configModule.prefix || config.prefix; // Fallback to passed config.prefix
        playerUtils.notifyPlayer(player, "§b--- World Border Commands ---§r");
        playerUtils.notifyPlayer(player, `§7${cmdPrefix}wb set <square|circle> <centerX> <centerZ> <size> [dim]§r - Sets border. Cancels resize.`);
        playerUtils.notifyPlayer(player, `§7${cmdPrefix}wb get [dim]§r - Shows current border settings & resize progress.`);
        playerUtils.notifyPlayer(player, `§7${cmdPrefix}wb toggle <on|off> [dim]§r - Enables/disables border. Cancels resize if off.`);
        playerUtils.notifyPlayer(player, `§7${cmdPrefix}wb remove [dim] confirm§r - Deletes border. Cancels resize.`);
        playerUtils.notifyPlayer(player, `§7${cmdPrefix}wb shrink <new_size> <time_s> [dim]§r - Gradually shrinks border.`);
        playerUtils.notifyPlayer(player, `§7${cmdPrefix}wb expand <new_size> <time_s> [dim]§r - Gradually expands border.`);
        playerUtils.notifyPlayer(player, `§7${cmdPrefix}wb resizepause [dim]§r - Pauses an ongoing resize.`);
        playerUtils.notifyPlayer(player, `§7${cmdPrefix}wb resizeresume [dim]§r - Resumes a paused resize.`);
        playerUtils.notifyPlayer(player, `§7${cmdPrefix}wb setglobalparticle <particleName>§r - Sets global default particle.`);
        playerUtils.notifyPlayer(player, `§7Dimension [dim] can be 'overworld', 'nether', 'the_end', or omitted for current.`);
        return;
    }

    const subCommandData = commandData.subcommands.find(sc => sc.name === subCommand);
    if (!subCommandData) {
        playerUtils.warnPlayer(player, `Invalid subcommand '${subCommand}'. Use '${config.prefix}wb help' for a list of commands.`);
        return;
    }

    switch (subCommand) {
        case "set":
            await handleSetCommand(player, args, playerUtils, logManager, config, dependencies);
            break;
        case "get":
            await handleGetCommand(player, args, playerUtils, logManager, config, dependencies); // Pass config for defaults
            break;
        case "toggle":
            await handleToggleCommand(player, args, playerUtils, logManager, config, dependencies);
            break;
        case "remove":
            await handleRemoveCommand(player, args, playerUtils, logManager, config, dependencies); // Added config
            break;
        case "shrink":
            await handleShrinkCommand(player, args, playerUtils, logManager, config, dependencies);
            break;
        case "expand":
            await handleExpandCommand(player, args, playerUtils, logManager, config, dependencies);
            break;
        case "resizepause":
            await handleResizePauseCommand(player, args, playerUtils, logManager, config, dependencies);
            break;
        case "resizeresume":
            await handleResizeResumeCommand(player, args, playerUtils, logManager, config, dependencies);
            break;
        case "setglobalparticle":
            await handleSetGlobalParticleCommand(player, args, playerUtils, logManager, config, dependencies);
            break;
        default: // Should be caught by subCommandData check, but as a fallback
            playerUtils.warnPlayer(player, `Unknown subcommand '${subCommand}'. Use '${config.prefix}wb help'.`);
    }
}

// Helper function
function formatDurationBrief(ms) {
    if (ms <= 0) return "0s";
    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    seconds %= 60;
    minutes %= 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(' ');
}

function normalizeDimensionId(player, inputDimId) { // Added player for default dimension
    const currentPlayerDimensionId = player.dimension.id;
    let normalized = inputDimId ? inputDimId.toLowerCase() : currentPlayerDimensionId;
    if (normalized === "overworld") return "minecraft:overworld";
    if (normalized === "nether") return "minecraft:the_nether";
    if (normalized === "the_end" || normalized === "end") return "minecraft:the_end";
    // Check if it's already in the correct full format
    if (normalized === "minecraft:overworld" || normalized === "minecraft:the_nether" || normalized === "minecraft:the_end") return normalized;
    return null; // Invalid or unrecognized
}


async function handleSetCommand(player, args, playerUtils, logManager, config, dependencies) { // Added dependencies
    // Command structure: !wb set <shape> <centerX> <centerZ> <sizeParam> [dimensionId]
    // Example args array for `handleSetCommand(player, args...)`:
    // args[0] = shape ("square" or "circle")
    // args[1] = centerX
    // args[2] = centerZ
    // args[3] = sizeParam (halfSize or radius)
    // args[4] = dimensionId (optional)

    if (args.length < 4) { // Need at least shape, centerX, centerZ, sizeParam
        playerUtils.warnPlayer(player, `Usage: ${config.prefix}wb set <square|circle> <centerX> <centerZ> <size> [dimensionId]`);
        playerUtils.notifyPlayer(player, "§7Size is half-length for square, radius for circle.");
        return;
    }

    const shape = args[0].toLowerCase();
    if (shape !== "square" && shape !== "circle") {
        playerUtils.warnPlayer(player, "Invalid shape. Must be 'square' or 'circle'.");
        return;
    }

    const centerX = parseInt(args[1]);
    const centerZ = parseInt(args[2]);
    const sizeParam = parseFloat(args[3]); // Use parseFloat for flexibility

    if (isNaN(centerX) || isNaN(centerZ) || isNaN(sizeParam)) {
        playerUtils.warnPlayer(player, "Invalid coordinates or size. centerX, centerZ, and size must be numbers.");
        return;
    }
    if (sizeParam <= 0) {
        playerUtils.warnPlayer(player, "Size parameter (halfSize/radius) must be greater than 0.");
        return;
    }

    const dimensionIdInput = args.length > 4 ? args[4] : undefined; // Pass undefined if not provided
    const dimensionId = normalizeDimensionId(player, dimensionIdInput); // normalizeDimensionId now takes player

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `Invalid dimension ID: '${dimensionIdInput || player.dimension.id}'. Use overworld, nether, or the_end, or their full Minecraft IDs.`);
        return;
    }

    let currentSettings = getBorderSettings(dimensionId);
    let cancelledResize = false;
    if (currentSettings && currentSettings.isResizing) {
        currentSettings.isResizing = false;
        currentSettings.originalSize = undefined;
        currentSettings.targetSize = undefined;
        currentSettings.resizeStartTimeMs = undefined;
        currentSettings.resizeDurationMs = undefined;
        // These fields will be cleaned by saveBorderSettings if isResizing is false
        cancelledResize = true;
    }


    let settingsToSave = {
        ...(currentSettings || {}), // Preserve existing settings like damage if just changing geometry
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
        playerUtils.notifyPlayer(player, `  Damage settings (defaults applied on new border): ${damageStatus}.`);
        if (cancelledResize) {
            playerUtils.notifyPlayer(player, "§eCancelled ongoing border resize operation.");
        }

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
    const dimensionIdInput = args.length > 0 ? args[0] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `Invalid dimension ID: '${dimensionIdInput || player.dimension.id}'. Use overworld, nether, or the_end, or their full IDs.`);
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

        if (settings.isResizing && settings.resizeDurationMs > 0) {
            const elapsedMs = Date.now() - (settings.resizeStartTimeMs || Date.now());
            const progressPercent = Math.min(100, (elapsedMs / settings.resizeDurationMs) * 100);
            const remainingSec = Math.max(0, (settings.resizeDurationMs - elapsedMs) / 1000);

            let currentInterpolatedSize = settings.originalSize; // Default to original if duration is 0 or already past
            if (settings.resizeDurationMs > 0 && elapsedMs > 0) {
                 currentInterpolatedSize = settings.originalSize + (settings.targetSize - settings.originalSize) * Math.min(1, elapsedMs / settings.resizeDurationMs);
            } else if (elapsedMs >= settings.resizeDurationMs) {
                currentInterpolatedSize = settings.targetSize;
            }


            playerUtils.notifyPlayer(player, `  Resizing: §eYes (from ${settings.originalSize} to ${settings.targetSize})`);
            playerUtils.notifyPlayer(player, `    Progress: §e${progressPercent.toFixed(1)}% (${remainingSec.toFixed(1)}s remaining)`);
            playerUtils.notifyPlayer(player, `    Current Effective Size (approx.): §e${currentInterpolatedSize.toFixed(1)}`);
            if (settings.isPaused) {
                playerUtils.notifyPlayer(player, "    Status: §ePAUSED");
                playerUtils.notifyPlayer(player, `    Total Paused Time: §e${formatDurationBrief(settings.resizePausedTimeMs || 0)}`);
            }
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

    const dimensionIdInput = args.length > 1 ? args[1] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `Invalid dimension ID: '${dimensionIdInput || player.dimension.id}'. Use overworld, nether, or the_end, or their full IDs.`);
        return;
    }

    const currentSettings = getBorderSettings(dimensionId);
    if (!currentSettings) {
        playerUtils.warnPlayer(player, `§eNo world border configured for ${dimensionId}. Use 'set' command first to define a border.`);
        return;
    }

    const newState = state === 'on';
    if (currentSettings.enabled === newState && !currentSettings.isResizing) { // Don't just say it's already on if a resize is active
        playerUtils.notifyPlayer(player, `§eWorld border for ${dimensionId} is already ${state}.`);
        return;
    }

    currentSettings.enabled = newState;
    let cancelledResizeMessage = "";

    // If turning border off and a resize is active, cancel the resize.
    if (!newState && currentSettings.isResizing) {
        currentSettings.isResizing = false;
        currentSettings.originalSize = undefined;
        currentSettings.targetSize = undefined;
        currentSettings.resizeStartTimeMs = undefined;
        currentSettings.resizeDurationMs = undefined;
        cancelledResizeMessage = " Ongoing border resize operation was cancelled.";
    }

    // saveBorderSettings will clean up undefined resize fields if isResizing is false.
    if (saveBorderSettings(dimensionId, currentSettings)) {
        let successMsg = `§aWorld border for ${dimensionId} turned ${state}.${cancelledResizeMessage}`;
        playerUtils.notifyPlayer(player, successMsg);

        const finalSettingsForLog = getBorderSettings(dimensionId);
        if (logManager && typeof logManager.addLog === 'function') {
            logManager.addLog({ adminName: player.nameTag, actionType: 'worldborder_toggle', targetName: dimensionId, details: `Set to ${state}. Full settings: ${JSON.stringify(finalSettingsForLog)}` });
        } else {
            playerUtils.debugLog("LogManager or addLog not available for worldborder_toggle.", null);
        }
    } else {
        playerUtils.warnPlayer(player, "§cFailed to update world border state.");
    }
}

async function handleRemoveCommand(player, args, playerUtils, logManager, config, dependencies) {
    let dimensionIdInput;
    let confirmationArg = false;

    if (args.length === 0) {
        // Case: !wb remove (implies current dimension, needs confirm)
        dimensionIdInput = undefined;
    } else if (args.length === 1) {
        if (args[0].toLowerCase() === 'confirm') {
            // Case: !wb remove confirm (current dimension, confirmed)
            dimensionIdInput = undefined;
            confirmationArg = true;
        } else {
            // Case: !wb remove <dimensionId> (needs confirm)
            dimensionIdInput = args[0];
        }
    } else if (args.length === 2) {
        dimensionIdInput = args[0];
        if (args[1].toLowerCase() === 'confirm') {
            // Case: !wb remove <dimensionId> confirm (specific dimension, confirmed)
            confirmationArg = true;
        } else {
            // Case: !wb remove <dimensionId> <something_else> (invalid)
            playerUtils.warnPlayer(player, `Usage: ${config.prefix}wb remove [dimensionId] confirm`);
            return;
        }
    } else {
        playerUtils.warnPlayer(player, `Usage: ${config.prefix}wb remove [dimensionId] confirm`);
        return;
    }

    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `Invalid dimension ID: '${dimensionIdInput || player.dimension.id}'. Use overworld, nether, or the_end, or their full Minecraft IDs.`);
        return;
    }

    if (!confirmationArg) {
        const dimToDisplay = dimensionIdInput ? dimensionIdInput : `your current dimension (${dimensionId.replace('minecraft:', '')})`;
        const confirmCommand = `${config.prefix}wb remove ${dimensionIdInput ? dimensionIdInput + ' ' : ''}confirm`;
        playerUtils.warnPlayer(player, `To confirm removal of the world border for ${dimToDisplay}, please run: ${confirmCommand}`);
        return;
    }

    // If we reach here, confirmationArg is true
    const currentSettings = getBorderSettings(dimensionId);
    let cancelledResizeMessage = "";
    if (currentSettings && currentSettings.isResizing) {
        cancelledResizeMessage = " Ongoing border resize operation was also cancelled.";
    }

    if (clearBorderSettings(dimensionId)) {
        playerUtils.notifyPlayer(player, `§aWorld border settings removed for ${dimensionId.replace('minecraft:', '')}.${cancelledResizeMessage}`);
        if (logManager && typeof logManager.addLog === 'function') {
            logManager.addLog({ adminName: player.nameTag, actionType: 'worldborder_remove', targetName: dimensionId, details: `Border removed.${cancelledResizeMessage}` });
        } else {
            playerUtils.debugLog("LogManager or addLog not available for worldborder_remove.", null);
        }
    } else {
        playerUtils.warnPlayer(player, `§cFailed to remove world border settings for ${dimensionId.replace('minecraft:', '')}. It might not have been set or an error occurred.`);
    }
}


async function handleResizeCommand(player, args, playerUtils, logManager, config, operationType) { // Added config
    // Args: <new_size> <time_seconds> [dimensionId]
    // operationType is 'shrink' or 'expand'
    if (args.length < 2) {
        playerUtils.warnPlayer(player, `Usage: ${config.prefix}wb ${operationType} <new_size> <time_seconds> [dimensionId]`);
        return;
    }

    const newSize = parseFloat(args[0]);
    const timeSeconds = parseFloat(args[1]);
    const dimensionIdInput = args.length > 2 ? args[2] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `Invalid dimension ID: '${dimensionIdInput || player.dimension.id}'. Use overworld, nether, or the_end.`);
        return;
    }
    if (isNaN(newSize) || newSize <= 0 || isNaN(timeSeconds) || timeSeconds <= 0) {
        playerUtils.warnPlayer(player, "New size and time must be positive numbers.");
        return;
    }

    let currentSettings = getBorderSettings(dimensionId);
    if (!currentSettings || !currentSettings.enabled) {
        playerUtils.warnPlayer(player, `Border in ${dimensionId.replace("minecraft:", "")} is not set or not enabled. Cannot ${operationType}.`);
        return;
    }

    const currentActualSize = currentSettings.shape === 'circle' ? currentSettings.radius : currentSettings.halfSize;
    if (typeof currentActualSize !== 'number') {
        playerUtils.warnPlayer(player, `Current border size in ${dimensionId.replace("minecraft:", "")} is not properly defined. Cannot ${operationType}.`);
        return;
    }

    if (operationType === 'shrink' && newSize >= currentActualSize) {
        playerUtils.warnPlayer(player, `New size (${newSize}) must be smaller than current size (${currentActualSize}) for shrink.`);
        return;
    }
    if (operationType === 'expand' && newSize <= currentActualSize) {
        playerUtils.warnPlayer(player, `New size (${newSize}) must be larger than current size (${currentActualSize}) for expand.`);
        return;
    }

    if (currentSettings.isResizing) {
        playerUtils.notifyPlayer(player, "§eNote: Overriding an ongoing border resize operation.");
    }

    currentSettings.isResizing = true;
    currentSettings.originalSize = currentActualSize;
    currentSettings.targetSize = newSize;
    currentSettings.resizeStartTimeMs = Date.now();
    currentSettings.resizeDurationMs = timeSeconds * 1000;
    // The actual 'halfSize' or 'radius' field is not changed here;
    // it will be dynamically calculated by the tick loop during resize,
    // and then set to targetSize upon completion.

    if (saveBorderSettings(dimensionId, currentSettings)) {
        playerUtils.notifyPlayer(player, `§aBorder in ${dimensionId.replace("minecraft:", "")} will ${operationType} from ${currentActualSize} to ${newSize} over ${timeSeconds}s.`);
        if (logManager && typeof logManager.addLog === 'function') {
            logManager.addLog({ adminName: player.nameTag, actionType: `worldborder_${operationType}_start`, targetName: dimensionId, details: JSON.stringify(currentSettings) });
        }
    } else {
        playerUtils.warnPlayer(player, `§cFailed to start border ${operationType}.`);
    }
}

async function handleShrinkCommand(player, args, playerUtils, logManager, config, dependencies) {
    await handleResizeCommand(player, args, playerUtils, logManager, config, "shrink");
}

async function handleExpandCommand(player, args, playerUtils, logManager, config, dependencies) {
    await handleResizeCommand(player, args, playerUtils, logManager, config, "expand");
}

async function handleSetGlobalParticleCommand(player, args, playerUtils, logManager, configPassedToExecute, dependencies) {
    const { configModule } = dependencies; // This is the full config module with updateConfigValue

    if (args.length < 1) {
        playerUtils.warnPlayer(player, `Usage: ${configModule.prefix}wb setglobalparticle <particleName>`);
        return;
    }
    const particleName = args[0];

    if (typeof particleName !== 'string' || particleName.trim() === "") {
        playerUtils.warnPlayer(player, "Particle name cannot be empty.");
        return;
    }

    // Assuming updateConfigValue is available on the configModule
    if (!configModule || typeof configModule.updateConfigValue !== 'function') {
        playerUtils.warnPlayer(player, "§cError: Configuration system not available or `updateConfigValue` is missing.");
        console.warn("[WB SetGlobalParticle] configModule or updateConfigValue is not available in dependencies.");
        return;
    }

    const success = configModule.updateConfigValue('worldBorderParticleName', particleName);

    if (success) {
        playerUtils.notifyPlayer(player, `§aGlobal world border particle set to: ${particleName}`);
        if (logManager && typeof logManager.addLog === 'function') {
            logManager.addLog({ adminName: player.nameTag, actionType: 'worldborder_setglobalparticle', targetName: 'global_config', details: `Set worldBorderParticleName to: ${particleName}` });
        }
    } else {
        // updateConfigValue returns false if value is same or type mismatch (though it tries coercion)
        // Check current value to give a more specific message
        const currentParticleName = configModule.editableConfigValues.worldBorderParticleName;
        if (currentParticleName === particleName) {
            playerUtils.warnPlayer(player, `§eGlobal world border particle is already set to ${particleName}. No change made.`);
        } else {
            playerUtils.warnPlayer(player, `§cFailed to set global world border particle. It might be an invalid value or an internal error occurred.`);
        }
    }
}

async function handleResizePauseCommand(player, args, playerUtils, logManager, config, dependencies) {
    const dimensionIdInput = args.length > 0 ? args[0] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `Invalid dimension ID: '${dimensionIdInput || player.dimension.id}'. Use overworld, nether, or the_end.`);
        return;
    }

    const settings = getBorderSettings(dimensionId);

    if (!settings || !settings.isResizing) {
        playerUtils.warnPlayer(player, `Border in ${dimensionId.replace("minecraft:", "")} is not currently resizing. Nothing to pause.`);
        return;
    }
    if (settings.isPaused) {
        playerUtils.notifyPlayer(player, `Border resize in ${dimensionId.replace("minecraft:", "")} is already paused.`);
        return;
    }

    settings.isPaused = true;
    settings.resizeLastPauseStartTimeMs = Date.now();

    if (saveBorderSettings(dimensionId, settings)) {
        playerUtils.notifyPlayer(player, `§eBorder resize in ${dimensionId.replace("minecraft:", "")} is now PAUSED.`);
        if (logManager && typeof logManager.addLog === 'function') {
            logManager.addLog({ adminName: player.nameTag, actionType: 'worldborder_resize_pause', targetName: dimensionId, details: JSON.stringify(settings) });
        }
    } else {
        playerUtils.warnPlayer(player, `§cFailed to pause border resize for ${dimensionId.replace("minecraft:", "")}.`);
    }
}

async function handleResizeResumeCommand(player, args, playerUtils, logManager, config, dependencies) {
    const dimensionIdInput = args.length > 0 ? args[0] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `Invalid dimension ID: '${dimensionIdInput || player.dimension.id}'. Use overworld, nether, or the_end.`);
        return;
    }

    const settings = getBorderSettings(dimensionId);

    if (!settings || !settings.isResizing) {
        playerUtils.warnPlayer(player, `Border in ${dimensionId.replace("minecraft:", "")} is not resizing. Nothing to resume.`);
        return;
    }
    if (!settings.isPaused) {
        playerUtils.notifyPlayer(player, `Border resize in ${dimensionId.replace("minecraft:", "")} is not currently paused.`);
        return;
    }

    const currentPauseDurationMs = Date.now() - (settings.resizeLastPauseStartTimeMs || Date.now());
    settings.resizePausedTimeMs = (settings.resizePausedTimeMs || 0) + currentPauseDurationMs;
    settings.isPaused = false;
    settings.resizeLastPauseStartTimeMs = undefined; // Clear it

    if (saveBorderSettings(dimensionId, settings)) {
        playerUtils.notifyPlayer(player, `§aBorder resize in ${dimensionId.replace("minecraft:", "")} has RESUMED.`);
        if (logManager && typeof logManager.addLog === 'function') {
            logManager.addLog({ adminName: player.nameTag, actionType: 'worldborder_resize_resume', targetName: dimensionId, details: JSON.stringify(settings) });
        }
    } else {
        playerUtils.warnPlayer(player, `§cFailed to resume border resize for ${dimensionId.replace("minecraft:", "")}.`);
    }
}
