/**
 * @file AntiCheatsBP/scripts/commands/worldborder.js
 * Manages world border settings via commands.
 * @version 1.0.1
 */
import * as mc from '@minecraft/server';
import { world, system } from '@minecraft/server';
import { getPlayerPermissionLevel, permissionLevels } from '../core/rankManager.js';
import { saveBorderSettings, getBorderSettings, clearBorderSettings } from '../utils/worldBorderManager.js';
import { getString } from '../core/i18n.js'; // Corrected path

// Removed original commandData as description and syntax are now localized or constructed.

export const definition = {
    name: "worldborder",
    description: "Manages the world border for different dimensions.", // Static description, detailed help is dynamic
    aliases: ["wb"],
    permissionLevel: permissionLevels.admin,
    requiresCheats: false,
    syntax: "!wb <set|get|toggle|remove|shrink|expand|resizepause|resizeresume|setglobalparticle|setparticle> [args...]",
    // Subcommand details will be shown in the dynamic help message
};


export async function execute(player, args, subCommand, config, dependencies) {
    const { playerUtils, logManager, configModule } = dependencies;
    const cmdPrefix = configModule.prefix;

    if (!subCommand || subCommand === "help") {
        playerUtils.notifyPlayer(player, getString('command.worldborder.help.header'));
        playerUtils.notifyPlayer(player, getString('command.worldborder.help.set', { prefix: cmdPrefix }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.help.get', { prefix: cmdPrefix }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.help.toggle', { prefix: cmdPrefix }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.help.remove', { prefix: cmdPrefix }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.help.shrink', { prefix: cmdPrefix }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.help.expand', { prefix: cmdPrefix }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.help.resizepause', { prefix: cmdPrefix }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.help.resizeresume', { prefix: cmdPrefix }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.help.setglobalparticle', { prefix: cmdPrefix }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.help.setparticle', { prefix: cmdPrefix }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.help.dimNote'));
        playerUtils.notifyPlayer(player, getString('command.worldborder.help.interpNote'));
        return;
    }

    // Subcommand validation (basic check, specific handlers do more)
    const validSubcommands = ["set", "get", "toggle", "remove", "shrink", "expand", "resizepause", "resizeresume", "setglobalparticle", "setparticle"];
    if (!validSubcommands.includes(subCommand)) {
        playerUtils.warnPlayer(player, getString('command.worldborder.error.invalidSubcommand', { subCommand: subCommand, prefix: cmdPrefix }));
        return;
    }

    switch (subCommand) {
        case "set":
            await handleSetCommand(player, args, playerUtils, logManager, cmdPrefix, dependencies); // Pass cmdPrefix
            break;
        case "get":
            await handleGetCommand(player, args, playerUtils, logManager, cmdPrefix, dependencies); // Pass cmdPrefix
            break;
        case "toggle":
            await handleToggleCommand(player, args, playerUtils, logManager, cmdPrefix, dependencies);
            break;
        case "remove":
            await handleRemoveCommand(player, args, playerUtils, logManager, cmdPrefix, dependencies);
            break;
        case "shrink":
            await handleShrinkCommand(player, args, playerUtils, logManager, cmdPrefix, dependencies);
            break;
        case "expand":
            await handleExpandCommand(player, args, playerUtils, logManager, cmdPrefix, dependencies);
            break;
        case "resizepause":
            await handleResizePauseCommand(player, args, playerUtils, logManager, cmdPrefix, dependencies);
            break;
        case "resizeresume":
            await handleResizeResumeCommand(player, args, playerUtils, logManager, cmdPrefix, dependencies);
            break;
        case "setglobalparticle":
            await handleSetGlobalParticleCommand(player, args, playerUtils, logManager, cmdPrefix, dependencies);
            break;
        case "setparticle":
            await handleSetParticleCommand(player, args, playerUtils, logManager, cmdPrefix, dependencies);
            break;
        default:
            playerUtils.warnPlayer(player, getString('command.worldborder.error.invalidSubcommand', { subCommand: subCommand, prefix: cmdPrefix }));
    }
}

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

function normalizeDimensionId(player, inputDimId) {
    const currentPlayerDimensionId = player.dimension.id;
    let normalized = inputDimId ? inputDimId.toLowerCase() : currentPlayerDimensionId;
    if (normalized === "overworld") return "minecraft:overworld";
    if (normalized === "nether") return "minecraft:the_nether";
    if (normalized === "the_end" || normalized === "end") return "minecraft:the_end";
    if (normalized === "minecraft:overworld" || normalized === "minecraft:the_nether" || normalized === "minecraft:the_end") return normalized;
    return null;
}


async function handleSetCommand(player, args, playerUtils, logManager, prefix, dependencies) {
    const { config: currentRunTimeConfig } = dependencies; // This is editableConfigValues

    if (args.length < 4) {
        playerUtils.warnPlayer(player, getString('command.worldborder.set.usage', { prefix: prefix }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.set.sizeNote'));
        return;
    }

    const shape = args[0].toLowerCase();
    if (shape !== "square" && shape !== "circle") {
        playerUtils.warnPlayer(player, getString('command.worldborder.set.error.invalidShape'));
        return;
    }

    const centerX = parseInt(args[1]);
    const centerZ = parseInt(args[2]);
    const sizeParam = parseFloat(args[3]);

    if (isNaN(centerX) || isNaN(centerZ) || isNaN(sizeParam)) {
        playerUtils.warnPlayer(player, getString('command.worldborder.set.error.invalidNumbers'));
        return;
    }
    if (sizeParam <= 0) {
        playerUtils.warnPlayer(player, getString('command.worldborder.set.error.sizePositive'));
        return;
    }

    const dimensionIdInput = args.length > 4 ? args[4] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, getString('command.worldborder.error.invalidDimension', { dimensionIdInput: (dimensionIdInput || player.dimension.id) }));
        return;
    }

    let currentSettings = getBorderSettings(dimensionId);
    let cancelledResize = false;
    if (currentSettings && currentSettings.isResizing) {
        currentSettings.isResizing = false;
        cancelledResize = true;
    }

    let settingsToSave = {
        ...(currentSettings || {}),
        shape,
        centerX,
        centerZ,
        enabled: true,
        enableDamage: currentRunTimeConfig.worldBorderDefaultEnableDamage,
        damageAmount: currentRunTimeConfig.worldBorderDefaultDamageAmount,
        damageIntervalTicks: currentRunTimeConfig.worldBorderDefaultDamageIntervalTicks,
        teleportAfterNumDamageEvents: currentRunTimeConfig.worldBorderTeleportAfterNumDamageEvents,
    };

    if (shape === "square") settingsToSave.halfSize = sizeParam;
    else if (shape === "circle") settingsToSave.radius = sizeParam;

    if (saveBorderSettings(dimensionId, settingsToSave)) {
        let sizeDisplay = shape === "square" ? `halfSize ${settingsToSave.halfSize} (Full: ${settingsToSave.halfSize * 2}x${settingsToSave.halfSize * 2})` : `radius ${settingsToSave.radius}`;
        const damageStatus = settingsToSave.enableDamage ? `ON (Amount: ${settingsToSave.damageAmount}, Interval: ${settingsToSave.damageIntervalTicks}t, TP Events: ${settingsToSave.teleportAfterNumDamageEvents})` : 'OFF';

        playerUtils.notifyPlayer(player, getString('command.worldborder.set.successHeader', { dimensionId: dimensionId.replace('minecraft:', '') }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.set.successDetails', { shape: shape, centerX: centerX, centerZ: centerZ, sizeDisplay: sizeDisplay }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.set.successDamageInfo', { damageStatus: damageStatus }));
        if (cancelledResize) {
            playerUtils.notifyPlayer(player, getString('command.worldborder.set.cancelledResize'));
        }

        if (logManager && typeof logManager.addLog === 'function') {
            logManager.addLog({ adminName: player.nameTag, actionType: 'worldborder_set', targetName: dimensionId, details: JSON.stringify(getBorderSettings(dimensionId) || settingsToSave) });
        }
    } else {
        playerUtils.warnPlayer(player, getString('command.worldborder.error.saveFail'));
    }
}

async function handleGetCommand(player, args, playerUtils, logManager, prefix, dependencies) {
    const { config: currentRunTimeConfig } = dependencies;
    const dimensionIdInput = args.length > 0 ? args[0] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, getString('command.worldborder.error.invalidDimension', { dimensionIdInput: (dimensionIdInput || player.dimension.id) }));
        return;
    }

    const settings = getBorderSettings(dimensionId);
    if (settings) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.get.header', { dimensionId: dimensionId.replace('minecraft:','') }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.get.entryEnabled', { value: settings.enabled }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.get.entryShape', { value: settings.shape }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.get.entryCenter', { valueX: settings.centerX, valueZ: settings.centerZ }));

        if (settings.shape === "square" && typeof settings.halfSize === 'number') {
            playerUtils.notifyPlayer(player, getString('command.worldborder.get.entryHalfSize', { value: settings.halfSize, diameter: settings.halfSize * 2 }));
            playerUtils.notifyPlayer(player, getString('command.worldborder.get.entryBoundsSquare', { minX: settings.centerX - settings.halfSize, maxX: settings.centerX + settings.halfSize, minZ: settings.centerZ - settings.halfSize, maxZ: settings.centerZ + settings.halfSize }));
        } else if (settings.shape === "circle" && typeof settings.radius === 'number') {
            playerUtils.notifyPlayer(player, getString('command.worldborder.get.entryRadius', { value: settings.radius }));
        }

        const enableDamage = settings.enableDamage ?? currentRunTimeConfig.worldBorderDefaultEnableDamage;
        playerUtils.notifyPlayer(player, getString('command.worldborder.get.entryDamageEnabled', { value: enableDamage }));
        if (enableDamage) {
            playerUtils.notifyPlayer(player, getString('command.worldborder.get.entryDamageAmount', { value: (settings.damageAmount ?? currentRunTimeConfig.worldBorderDefaultDamageAmount) }));
            playerUtils.notifyPlayer(player, getString('command.worldborder.get.entryDamageInterval', { value: (settings.damageIntervalTicks ?? currentRunTimeConfig.worldBorderDefaultDamageIntervalTicks) }));
            playerUtils.notifyPlayer(player, getString('command.worldborder.get.entryTeleportAfter', { value: (settings.teleportAfterNumDamageEvents ?? currentRunTimeConfig.worldBorderTeleportAfterNumDamageEvents) }));
        }

        if (settings.isResizing && settings.resizeDurationMs > 0) {
            const elapsedMs = Date.now() - (settings.resizeStartTimeMs || Date.now());
            const progressPercent = Math.min(100, (elapsedMs / settings.resizeDurationMs) * 100);
            const remainingSec = Math.max(0, (settings.resizeDurationMs - elapsedMs) / 1000);
            let currentInterpolatedSize = settings.originalSize + (settings.targetSize - settings.originalSize) * Math.min(1, elapsedMs / settings.resizeDurationMs);
            if (elapsedMs >= settings.resizeDurationMs) currentInterpolatedSize = settings.targetSize;

            playerUtils.notifyPlayer(player, getString('command.worldborder.get.resizingYes', { originalSize: settings.originalSize, targetSize: settings.targetSize }));
            playerUtils.notifyPlayer(player, getString('command.worldborder.get.resizingProgress', { progressPercent: progressPercent.toFixed(1), remainingTime: remainingSec.toFixed(1) + 's' }));
            playerUtils.notifyPlayer(player, getString('command.worldborder.get.resizingCurrentSize', { currentSize: currentInterpolatedSize.toFixed(1) }));
            playerUtils.notifyPlayer(player, getString('command.worldborder.get.resizingInterpolation', { interpolationType: (settings.resizeInterpolationType || 'linear') }));
            if (settings.isPaused) {
                playerUtils.notifyPlayer(player, getString('command.worldborder.get.resizingStatusPaused'));
                playerUtils.notifyPlayer(player, getString('command.worldborder.get.resizingPausedTime', { pausedTime: formatDurationBrief(settings.resizePausedTimeMs || 0) }));
            }
        }

        const currentGlobalParticle = currentRunTimeConfig.worldBorderParticleName;
        if (settings.particleNameOverride) {
            playerUtils.notifyPlayer(player, getString('command.worldborder.get.particleOverride', { particleName: settings.particleNameOverride }));
            if (settings.particleNameOverride !== currentGlobalParticle) {
                 playerUtils.notifyPlayer(player, getString('command.worldborder.get.particleOverrideGlobalNote', { globalParticle: currentGlobalParticle }));
            }
        } else {
            playerUtils.notifyPlayer(player, getString('command.worldborder.get.particleGlobal', { particleName: currentGlobalParticle }));
        }
    } else {
        playerUtils.notifyPlayer(player, getString('command.worldborder.get.noBorderConfigured', { dimensionId: dimensionId.replace('minecraft:', ''), prefix: prefix }));
    }
}

async function handleToggleCommand(player, args, playerUtils, logManager, prefix, dependencies) {
    if (args.length < 1) {
        playerUtils.warnPlayer(player, getString('command.worldborder.toggle.usage', { prefix: prefix }));
        return;
    }

    const state = args[0].toLowerCase();
    if (state !== 'on' && state !== 'off') {
        playerUtils.warnPlayer(player, getString('command.worldborder.toggle.error.invalidState'));
        return;
    }

    const dimensionIdInput = args.length > 1 ? args[1] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, getString('command.worldborder.error.invalidDimension', { dimensionIdInput: (dimensionIdInput || player.dimension.id) }));
        return;
    }

    const currentSettings = getBorderSettings(dimensionId);
    if (!currentSettings) {
        playerUtils.warnPlayer(player, getString('command.worldborder.toggle.error.noBorder', { dimensionId: dimensionId.replace('minecraft:', '') }));
        return;
    }

    const newState = state === 'on';
    if (currentSettings.enabled === newState && !currentSettings.isResizing) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.toggle.alreadyState', { dimensionId: dimensionId.replace('minecraft:', ''), state: state }));
        return;
    }

    currentSettings.enabled = newState;
    let cancelledResizeMessage = "";
    if (!newState && currentSettings.isResizing) {
        currentSettings.isResizing = false;
        cancelledResizeMessage = getString('command.worldborder.toggle.cancelledResizeMessage');
    }

    if (saveBorderSettings(dimensionId, currentSettings)) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.toggle.success', { dimensionId: dimensionId.replace('minecraft:', ''), state: state, cancelledResizeMessage: cancelledResizeMessage }));
        if (logManager && typeof logManager.addLog === 'function') {
            logManager.addLog({ adminName: player.nameTag, actionType: 'worldborder_toggle', targetName: dimensionId, details: `Set to ${state}. Full settings: ${JSON.stringify(getBorderSettings(dimensionId))}` });
        }
    } else {
        playerUtils.warnPlayer(player, getString('command.worldborder.toggle.error.fail'));
    }
}

async function handleRemoveCommand(player, args, playerUtils, logManager, prefix, dependencies) {
    let dimensionIdInput;
    let confirmationArg = false;

    if (args.length === 0) dimensionIdInput = undefined;
    else if (args.length === 1) {
        if (args[0].toLowerCase() === 'confirm') { dimensionIdInput = undefined; confirmationArg = true; }
        else { dimensionIdInput = args[0]; }
    } else if (args.length === 2) {
        dimensionIdInput = args[0];
        if (args[1].toLowerCase() === 'confirm') confirmationArg = true;
        else { playerUtils.warnPlayer(player, getString('command.worldborder.remove.confirmPrompt', { dimToDisplay: 'specified', confirmCommand: `${prefix}wb remove ${dimensionIdInput} confirm`})); return; }
    } else { playerUtils.warnPlayer(player, getString('command.worldborder.remove.confirmPrompt', { dimToDisplay: 'specified', confirmCommand: `${prefix}wb remove [dim] confirm`})); return; }

    const dimensionId = normalizeDimensionId(player, dimensionIdInput);
    if (!dimensionId) {
        playerUtils.warnPlayer(player, getString('command.worldborder.error.invalidDimension', { dimensionIdInput: (dimensionIdInput || player.dimension.id) }));
        return;
    }

    if (!confirmationArg) {
        const dimToDisplay = dimensionIdInput ? dimensionId.replace('minecraft:', '') : `your current dimension (${dimensionId.replace('minecraft:', '')})`;
        const confirmCmd = `${prefix}wb remove ${dimensionIdInput ? dimensionId.replace('minecraft:', '') + ' ' : ''}confirm`;
        playerUtils.warnPlayer(player, getString('command.worldborder.remove.confirmPrompt', { dimToDisplay: dimToDisplay, confirmCommand: confirmCmd }));
        return;
    }

    const currentSettings = getBorderSettings(dimensionId);
    let cancelledResizeMessage = (currentSettings && currentSettings.isResizing) ? getString('command.worldborder.toggle.cancelledResizeMessage') : "";

    if (clearBorderSettings(dimensionId)) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.remove.success', { dimensionId: dimensionId.replace('minecraft:', ''), cancelledResizeMessage: cancelledResizeMessage }));
        if (logManager && typeof logManager.addLog === 'function') {
            logManager.addLog({ adminName: player.nameTag, actionType: 'worldborder_remove', targetName: dimensionId, details: `Border removed.${cancelledResizeMessage}` });
        }
    } else {
        playerUtils.warnPlayer(player, getString('command.worldborder.remove.error.fail', { dimensionId: dimensionId.replace('minecraft:', '') }));
    }
}

async function handleResizeCommand(player, args, playerUtils, logManager, prefix, operationType, dependencies) {
    const { config: currentRunTimeConfig } = dependencies;
    if (args.length < 2) {
        playerUtils.warnPlayer(player, getString('command.worldborder.resize.usage', { prefix: prefix, operationType: operationType }));
        return;
    }

    const newSize = parseFloat(args[0]);
    const timeSeconds = parseFloat(args[1]);
    let dimensionIdInput = undefined;
    let interpolationType = 'linear';

    if (args.length > 3) {
        dimensionIdInput = args[2];
        interpolationType = args[3].toLowerCase();
    } else if (args.length > 2) {
        const thirdArg = args[2].toLowerCase();
        const validInterpTypes = ['linear', 'easeoutquad', 'easeinoutquad'];
        if (validInterpTypes.includes(thirdArg)) interpolationType = thirdArg;
        else dimensionIdInput = args[2];
    }

    const dimensionId = normalizeDimensionId(player, dimensionIdInput);
    if (!dimensionId) {
        playerUtils.warnPlayer(player, getString('command.worldborder.error.invalidDimension', { dimensionIdInput: (dimensionIdInput || player.dimension.id) }));
        return;
    }

    const validInterpTypes = ['linear', 'easeoutquad', 'easeinoutquad'];
    if (!validInterpTypes.includes(interpolationType)) {
        playerUtils.warnPlayer(player, getString('command.worldborder.resize.invalidInterpolation', { interpolationType: interpolationType, validTypes: validInterpTypes.join(', ') }));
        interpolationType = 'linear';
    }

    if (isNaN(newSize) || newSize <= 0 || isNaN(timeSeconds) || timeSeconds <= 0) {
        playerUtils.warnPlayer(player, getString('command.worldborder.resize.error.positiveNumbers'));
        return;
    }

    let currentSettings = getBorderSettings(dimensionId);
    if (!currentSettings || !currentSettings.enabled) {
        playerUtils.warnPlayer(player, getString('command.worldborder.resize.error.noBorder', { dimensionId: dimensionId.replace("minecraft:", ""), operationType: operationType }));
        return;
    }

    const currentActualSize = currentSettings.shape === 'circle' ? currentSettings.radius : currentSettings.halfSize;
    if (typeof currentActualSize !== 'number') {
        playerUtils.warnPlayer(player, getString('command.worldborder.resize.error.sizeNotDefined', { dimensionId: dimensionId.replace("minecraft:", ""), operationType: operationType }));
        return;
    }

    if (operationType === 'shrink' && newSize >= currentActualSize) {
        playerUtils.warnPlayer(player, getString('command.worldborder.resize.error.shrinkSize', { newSize: newSize, currentActualSize: currentActualSize }));
        return;
    }
    if (operationType === 'expand' && newSize <= currentActualSize) {
        playerUtils.warnPlayer(player, getString('command.worldborder.resize.error.expandSize', { newSize: newSize, currentActualSize: currentActualSize }));
        return;
    }

    if (currentSettings.isResizing) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.resize.overrideNotification'));
    }

    currentSettings.isResizing = true;
    currentSettings.originalSize = currentActualSize;
    currentSettings.targetSize = newSize;
    currentSettings.resizeStartTimeMs = Date.now();
    currentSettings.resizeDurationMs = timeSeconds * 1000;
    currentSettings.resizeInterpolationType = interpolationType;
    currentSettings.isPaused = false;
    currentSettings.resizePausedTimeMs = 0;
    currentSettings.resizeLastPauseStartTimeMs = undefined;

    if (saveBorderSettings(dimensionId, currentSettings)) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.resize.success', { dimensionId: dimensionId.replace("minecraft:", ""), operationType: operationType, currentActualSize: currentActualSize, newSize: newSize, timeSeconds: timeSeconds, interpolationType: interpolationType }));
        if (logManager && typeof logManager.addLog === 'function') {
            logManager.addLog({ adminName: player.nameTag, actionType: `worldborder_${operationType}_start`, targetName: dimensionId, details: JSON.stringify(currentSettings) });
        }
    } else {
        playerUtils.warnPlayer(player, getString('command.worldborder.resize.error.fail', { operationType: operationType }));
    }
}

async function handleShrinkCommand(player, args, playerUtils, logManager, prefix, dependencies) {
    await handleResizeCommand(player, args, playerUtils, logManager, prefix, "shrink", dependencies);
}

async function handleExpandCommand(player, args, playerUtils, logManager, prefix, dependencies) {
    await handleResizeCommand(player, args, playerUtils, logManager, prefix, "expand", dependencies);
}

async function handleResizePauseCommand(player, args, playerUtils, logManager, prefix, dependencies) {
    const dimensionIdInput = args.length > 0 ? args[0] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, getString('command.worldborder.error.invalidDimension', { dimensionIdInput: (dimensionIdInput || player.dimension.id) }));
        return;
    }
    const settings = getBorderSettings(dimensionId);
    if (!settings || !settings.isResizing) {
        playerUtils.warnPlayer(player, getString('command.worldborder.resizepause.notResizing', { dimensionId: dimensionId.replace("minecraft:", "") }));
        return;
    }
    if (settings.isPaused) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.resizepause.alreadyPaused', { dimensionId: dimensionId.replace("minecraft:", "") }));
        return;
    }
    settings.isPaused = true;
    settings.resizeLastPauseStartTimeMs = Date.now();
    if (saveBorderSettings(dimensionId, settings)) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.resizepause.success', { dimensionId: dimensionId.replace("minecraft:", "") }));
        if (logManager && typeof logManager.addLog === 'function') {
            logManager.addLog({ adminName: player.nameTag, actionType: 'worldborder_resize_pause', targetName: dimensionId, details: JSON.stringify(settings) });
        }
    } else {
        playerUtils.warnPlayer(player, getString('command.worldborder.resizepause.fail', { dimensionId: dimensionId.replace("minecraft:", "") }));
    }
}

async function handleResizeResumeCommand(player, args, playerUtils, logManager, prefix, dependencies) {
    const dimensionIdInput = args.length > 0 ? args[0] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, getString('command.worldborder.error.invalidDimension', { dimensionIdInput: (dimensionIdInput || player.dimension.id) }));
        return;
    }
    const settings = getBorderSettings(dimensionId);
    if (!settings || !settings.isResizing) {
        playerUtils.warnPlayer(player, getString('command.worldborder.resizeresume.notResizing', { dimensionId: dimensionId.replace("minecraft:", "") }));
        return;
    }
    if (!settings.isPaused) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.resizeresume.notPaused', { dimensionId: dimensionId.replace("minecraft:", "") }));
        return;
    }
    const currentPauseDurationMs = Date.now() - (settings.resizeLastPauseStartTimeMs || Date.now());
    settings.resizePausedTimeMs = (settings.resizePausedTimeMs || 0) + currentPauseDurationMs;
    settings.isPaused = false;
    settings.resizeLastPauseStartTimeMs = undefined;
    if (saveBorderSettings(dimensionId, settings)) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.resizeresume.success', { dimensionId: dimensionId.replace("minecraft:", "") }));
        if (logManager && typeof logManager.addLog === 'function') {
            logManager.addLog({ adminName: player.nameTag, actionType: 'worldborder_resize_resume', targetName: dimensionId, details: JSON.stringify(settings) });
        }
    } else {
        playerUtils.warnPlayer(player, getString('command.worldborder.resizeresume.fail', { dimensionId: dimensionId.replace("minecraft:", "") }));
    }
}

async function handleSetGlobalParticleCommand(player, args, playerUtils, logManager, prefix, dependencies) {
    const { configModule } = dependencies;
    if (args.length < 1) {
        playerUtils.warnPlayer(player, getString('command.worldborder.setglobalparticle.usage', { prefix: prefix }));
        return;
    }
    const particleName = args[0];
    if (typeof particleName !== 'string' || particleName.trim() === "") {
        playerUtils.warnPlayer(player, getString('command.worldborder.setglobalparticle.error.emptyName'));
        return;
    }
    if (!configModule || typeof configModule.updateConfigValue !== 'function') {
        playerUtils.warnPlayer(player, getString('command.worldborder.setglobalparticle.error.configSystem'));
        console.warn("[WB SetGlobalParticle] configModule or updateConfigValue is not available in dependencies.");
        return;
    }
    const success = configModule.updateConfigValue('worldBorderParticleName', particleName);
    if (success) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.setglobalparticle.success', { particleName: particleName }));
        if (logManager && typeof logManager.addLog === 'function') {
            logManager.addLog({ adminName: player.nameTag, actionType: 'worldborder_setglobalparticle', targetName: 'global_config', details: `Set worldBorderParticleName to: ${particleName}` });
        }
    } else {
        const currentParticleName = configModule.editableConfigValues.worldBorderParticleName;
        if (currentParticleName === particleName) {
            playerUtils.warnPlayer(player, getString('command.worldborder.setglobalparticle.noChange', { particleName: particleName }));
        } else {
            playerUtils.warnPlayer(player, getString('command.worldborder.setglobalparticle.error.failInternal'));
        }
    }
}

async function handleSetParticleCommand(player, args, playerUtils, logManager, prefix, dependencies) {
    const { config: currentRunTimeConfig } = dependencies; // This is editableConfigValues
    const globalDefaultParticle = currentRunTimeConfig.worldBorderParticleName;

    if (args.length < 1) {
        playerUtils.warnPlayer(player, getString('command.worldborder.setparticle.usage', { prefix: prefix }));
        return;
    }
    const particleNameInput = args[0];
    const dimensionIdInput = args.length > 1 ? args[1] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, getString('command.worldborder.error.invalidDimension', { dimensionIdInput: (dimensionIdInput || player.dimension.id) }));
        return;
    }
    let settings = getBorderSettings(dimensionId);
    if (!settings || !settings.enabled) {
        playerUtils.warnPlayer(player, getString('command.worldborder.setparticle.error.noActiveBorder', { dimensionId: dimensionId.replace('minecraft:','') }));
        return;
    }
    let newParticleOverride;
    let messageParticleName = particleNameInput;
    if (particleNameInput.toLowerCase() === 'reset' || particleNameInput.toLowerCase() === 'default') {
        newParticleOverride = undefined;
        messageParticleName = `Global Default (${globalDefaultParticle})`;
    } else {
        if (typeof particleNameInput !== 'string' || particleNameInput.trim() === "") {
            playerUtils.warnPlayer(player, getString('command.worldborder.setparticle.error.emptyName'));
            return;
        }
        newParticleOverride = particleNameInput.trim();
    }
    settings.particleNameOverride = newParticleOverride;
    if (saveBorderSettings(dimensionId, settings)) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.setparticle.success', { dimensionId: dimensionId.replace('minecraft:',''), messageParticleName: messageParticleName }));
        if (logManager && typeof logManager.addLog === 'function') {
            logManager.addLog({ adminName: player.nameTag, actionType: 'worldborder_setparticle', targetName: dimensionId, details: `Set particle override to: ${newParticleOverride === undefined ? 'Global Default' : newParticleOverride}` });
        }
    } else {
        playerUtils.warnPlayer(player, getString('command.worldborder.setparticle.error.fail'));
    }
}
