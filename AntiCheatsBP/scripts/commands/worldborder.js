/**
 * Manages world border settings via commands.
 */
import * as mc from '@minecraft/server';

// Helper function to format duration
function formatDurationBrief(ms) {
    if (ms < 0) ms = 0;
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
}

// world and system are available via mc.
import { permissionLevels } from '../core/rankManager.js';

export const definition = {
    name: 'worldborder',
    description: 'Manages the world border for different dimensions.',
    aliases: ['wb'],
    permissionLevel: permissionLevels.admin,
    requiresCheats: false,
    syntax: '!wb <set|get|toggle|remove|shrink|expand|resizepause|resizeresume|setglobalparticle|setparticle> [args...]',
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, config, worldBorderManager, getString } = dependencies;
    const subCommand = args.shift()?.toLowerCase();
    const cmdPrefix = config.prefix;

    if (!subCommand || subCommand === 'help') {
        let helpMsg = getString('command.worldborder.help.header') + '\n';
        helpMsg += getString('command.worldborder.help.set', { prefix: cmdPrefix }) + '\n';
        helpMsg += getString('command.worldborder.help.setSizeNote') + '\n';
        helpMsg += getString('command.worldborder.help.get', { prefix: cmdPrefix }) + '\n';
        helpMsg += getString('command.worldborder.help.toggle', { prefix: cmdPrefix }) + '\n';
        helpMsg += getString('command.worldborder.help.remove', { prefix: cmdPrefix }) + '\n';
        helpMsg += getString('command.worldborder.help.resize', { prefix: cmdPrefix }) + '\n';
        helpMsg += getString('command.worldborder.help.pause', { prefix: cmdPrefix }) + '\n';
        helpMsg += getString('command.worldborder.help.resume', { prefix: cmdPrefix }) + '\n';
        helpMsg += getString('command.worldborder.help.setGlobalParticle', { prefix: cmdPrefix }) + '\n';
        helpMsg += getString('command.worldborder.help.setParticle', { prefix: cmdPrefix }) + '\n';
        helpMsg += getString('command.worldborder.help.dimensionNote') + '\n';
        helpMsg += getString('command.worldborder.help.interpolationNote');
        playerUtils.notifyPlayer(player, helpMsg);
        return;
    }

    const validSubcommands = ['set', 'get', 'toggle', 'remove', 'shrink', 'expand', 'resizepause', 'resizeresume', 'setglobalparticle', 'setparticle'];
    if (!validSubcommands.includes(subCommand)) {
        playerUtils.warnPlayer(player, getString('command.worldborder.invalidSubcommand', { subCommand: subCommand, prefix: cmdPrefix }));
        return;
    }

    switch (subCommand) {
        case 'set':
            await handleSetCommand(player, args, dependencies);
            break;
        case 'get':
            await handleGetCommand(player, args, dependencies);
            break;
        case 'toggle':
            await handleToggleCommand(player, args, dependencies);
            break;
        case 'remove':
            await handleRemoveCommand(player, args, dependencies);
            break;
        case 'shrink':
            await handleShrinkCommand(player, args, dependencies);
            break;
        case 'expand':
            await handleExpandCommand(player, args, dependencies);
            break;
        case 'resizepause':
            await handleResizePauseCommand(player, args, dependencies);
            break;
        case 'resizeresume':
            await handleResizeResumeCommand(player, args, dependencies);
            break;
        case 'setglobalparticle':
            await handleSetGlobalParticleCommand(player, args, dependencies);
            break;
        case 'setparticle':
            await handleSetParticleCommand(player, args, dependencies);
            break;
        default: // Should be caught by validSubcommands check
            playerUtils.warnPlayer(player, getString('command.worldborder.invalidSubcommand', { subCommand: subCommand, prefix: cmdPrefix }));
    }
}

function normalizeDimensionId(player, inputDimId) {
    const currentPlayerDimensionId = player.dimension.id;
    let normalized = inputDimId ? inputDimId.toLowerCase() : currentPlayerDimensionId;
    if (normalized === 'overworld') return 'minecraft:overworld';
    if (normalized === 'nether') return 'minecraft:the_nether';
    if (normalized === 'the_end' || normalized === 'end') return 'minecraft:the_end';
    if (normalized === 'minecraft:overworld' || normalized === 'minecraft:the_nether' || normalized === 'minecraft:the_end') return normalized;
    return null;
}

async function handleSetCommand(player, args, dependencies) {
    const { playerUtils, logManager, config: currentRunTimeConfig, worldBorderManager, getString } = dependencies;
    const prefix = currentRunTimeConfig.prefix;

    if (args.length < 4) {
        playerUtils.warnPlayer(player, getString('command.worldborder.set.usage', { prefix: prefix }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.set.noteSize'));
        return;
    }

    const shape = args[0].toLowerCase();
    if (shape !== 'square' && shape !== 'circle') {
        playerUtils.warnPlayer(player, getString('command.worldborder.set.invalidShape'));
        return;
    }

    const centerX = parseInt(args[1]);
    const centerZ = parseInt(args[2]);
    const sizeParam = parseFloat(args[3]);

    if (isNaN(centerX) || isNaN(centerZ) || isNaN(sizeParam)) {
        playerUtils.warnPlayer(player, getString('command.worldborder.set.invalidNumbers'));
        return;
    }
    if (sizeParam <= 0) {
        playerUtils.warnPlayer(player, getString('command.worldborder.set.sizePositive'));
        return;
    }

    const dimensionIdInput = args.length > 4 ? args[4] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, getString('command.worldborder.invalidDimension', { dimensionName: dimensionIdInput || player.dimension.id.split(':')[1] }));
        return;
    }

    let currentSettings = worldBorderManager.getBorderSettings(dimensionId, dependencies);
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

    if (shape === 'square') settingsToSave.halfSize = sizeParam;
    else if (shape === 'circle') settingsToSave.radius = sizeParam;

    if (worldBorderManager.saveBorderSettings(dimensionId, settingsToSave, dependencies)) {
        let sizeDisplay = shape === 'square' ? `halfSize ${settingsToSave.halfSize} (Full: ${settingsToSave.halfSize * 2}x${settingsToSave.halfSize * 2})` : `radius ${settingsToSave.radius}`;
        const damageStatus = settingsToSave.enableDamage ?
            getString('command.worldborder.set.damage.on', { damageAmount: settingsToSave.damageAmount.toString(), damageIntervalTicks: settingsToSave.damageIntervalTicks.toString(), teleportAfterNumDamageEvents: settingsToSave.teleportAfterNumDamageEvents.toString() }) :
            getString('command.worldborder.set.damage.off');

        playerUtils.notifyPlayer(player, getString('command.worldborder.set.successHeader', { dimensionName: dimensionId.replace('minecraft:', '') }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.set.successDetails', { shape: shape, centerX: centerX.toString(), centerZ: centerZ.toString(), sizeDisplay: sizeDisplay }));
        playerUtils.notifyPlayer(player, getString('command.worldborder.set.successDamage', { damageStatus: damageStatus }));
        if (cancelledResize) {
            playerUtils.notifyPlayer(player, getString('command.worldborder.set.resizeCancelled'));
        }
        logManager.addLog({ adminName: player.nameTag, actionType: 'worldBorderSet', targetName: dimensionId, details: JSON.stringify(worldBorderManager.getBorderSettings(dimensionId, dependencies) || settingsToSave) }, dependencies);
    } else {
        playerUtils.warnPlayer(player, getString('command.worldborder.set.failSave'));
    }
}

async function handleGetCommand(player, args, dependencies) {
    const { playerUtils, logManager, config: currentRunTimeConfig, worldBorderManager, getString } = dependencies;
    const prefix = currentRunTimeConfig.prefix;
    const dimensionIdInput = args.length > 0 ? args[0] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);
    const dimensionName = dimensionId ? dimensionId.replace('minecraft:','') : (dimensionIdInput || player.dimension.id.split(':')[1]);


    if (!dimensionId) {
        playerUtils.warnPlayer(player, getString('command.worldborder.invalidDimension', { dimensionName: dimensionName }));
        return;
    }

    const settings = worldBorderManager.getBorderSettings(dimensionId, dependencies);
    if (settings) {
        let message = getString('command.worldborder.get.header', { dimensionName: dimensionName }) + '\n';
        message += getString('command.worldborder.get.enabled', { status: settings.enabled.toString() }) + '\n';
        message += getString('command.worldborder.get.shape', { shape: settings.shape }) + '\n';
        message += getString('command.worldborder.get.center', { centerX: settings.centerX.toString(), centerZ: settings.centerZ.toString() }) + '\n';


        if (settings.shape === 'square' && typeof settings.halfSize === 'number') {
            message += getString('command.worldborder.get.square.halfSize', { halfSize: settings.halfSize.toString(), diameter: (settings.halfSize * 2).toString() }) + '\n';
            message += getString('command.worldborder.get.square.bounds', { minX: (settings.centerX - settings.halfSize).toString(), maxX: (settings.centerX + settings.halfSize).toString(), minZ: (settings.centerZ - settings.halfSize).toString(), maxZ: (settings.centerZ + settings.halfSize).toString() }) + '\n';
        } else if (settings.shape === 'circle' && typeof settings.radius === 'number') {
            message += getString('command.worldborder.get.circle.radius', { radius: settings.radius.toString() }) + '\n';
        }

        const enableDamage = settings.enableDamage ?? currentRunTimeConfig.worldBorderDefaultEnableDamage;
        message += getString('command.worldborder.get.damageEnabled', { status: enableDamage.toString() }) + '\n';
        if (enableDamage) {
            message += getString('command.worldborder.get.damageAmount', { amount: (settings.damageAmount ?? currentRunTimeConfig.worldBorderDefaultDamageAmount).toString() }) + '\n';
            message += getString('command.worldborder.get.damageInterval', { interval: (settings.damageIntervalTicks ?? currentRunTimeConfig.worldBorderDefaultDamageIntervalTicks).toString() }) + '\n';
            message += getString('command.worldborder.get.teleportAfter', { events: (settings.teleportAfterNumDamageEvents ?? currentRunTimeConfig.worldBorderTeleportAfterNumDamageEvents).toString() }) + '\n';
        }

        if (settings.isResizing && settings.resizeDurationMs > 0) {
            const accumulatedPausedTime = settings.resizePausedTimeMs || 0;
            let actualElapsedResizingMs;

            if (settings.isPaused && typeof settings.resizeLastPauseStartTimeMs === 'number') {
                actualElapsedResizingMs = (settings.resizeLastPauseStartTimeMs - (settings.resizeStartTimeMs || settings.resizeLastPauseStartTimeMs)) - accumulatedPausedTime;
            } else {
                actualElapsedResizingMs = (Date.now() - (settings.resizeStartTimeMs || Date.now())) - accumulatedPausedTime;
            }
            actualElapsedResizingMs = Math.max(0, actualElapsedResizingMs);

            const progressPercent = Math.min(100, (actualElapsedResizingMs / settings.resizeDurationMs) * 100);
            const remainingSec = Math.max(0, (settings.resizeDurationMs - actualElapsedResizingMs) / 1000);
            let currentInterpolatedSize = settings.originalSize + (settings.targetSize - settings.originalSize) * Math.min(1, actualElapsedResizingMs / settings.resizeDurationMs);
            if (actualElapsedResizingMs >= settings.resizeDurationMs) currentInterpolatedSize = settings.targetSize;
            if (actualElapsedResizingMs <= 0) currentInterpolatedSize = settings.originalSize;

            message += getString('command.worldborder.get.resizing.yes', { originalSize: settings.originalSize.toString(), targetSize: settings.targetSize.toString() }) + '\n';
            message += getString('command.worldborder.get.resizing.progress', { progressPercent: progressPercent.toFixed(1), remainingSeconds: remainingSec.toFixed(1) }) + '\n';
            message += getString('command.worldborder.get.resizing.currentSize', { currentSize: currentInterpolatedSize.toFixed(1) }) + '\n';
            message += getString('command.worldborder.get.resizing.interpolation', { interpolationType: settings.resizeInterpolationType || 'linear' }) + '\n';
            if (settings.isPaused) {
                message += getString('command.worldborder.get.resizing.statusPaused') + '\n';
                let displayPausedTime = accumulatedPausedTime;
                if (settings.isPaused && typeof settings.resizeLastPauseStartTimeMs === 'number') {
                    displayPausedTime += (Date.now() - settings.resizeLastPauseStartTimeMs);
                }
                message += getString('command.worldborder.get.resizing.totalPausedTime', { pausedTime: formatDurationBrief(displayPausedTime) }) + '\n';
            }
        }

        const currentGlobalParticle = dependencies.config.worldBorderParticleName;
        if (settings.particleNameOverride) {
            message += getString('command.worldborder.get.particle.override', { particleNameOverride: settings.particleNameOverride }) + '\n';
            if (settings.particleNameOverride !== currentGlobalParticle) {
                 message += getString('command.worldborder.get.particle.override.globalInfo', { globalParticle: currentGlobalParticle }) + '\n';
            }
        } else {
            message += getString('command.worldborder.get.particle.globalDefault', { globalParticle: currentGlobalParticle }) + '\n';
        }
        playerUtils.notifyPlayer(player, message.trimEnd());
    } else {
        playerUtils.notifyPlayer(player, getString('command.worldborder.get.noBorder', { dimensionName: dimensionName, prefix: prefix }));
    }
}

async function handleToggleCommand(player, args, dependencies) {
    const { config, playerUtils, logManager, worldBorderManager, getString } = dependencies;
    const prefix = config.prefix;

    if (args.length < 1) {
        playerUtils.warnPlayer(player, getString('command.worldborder.toggle.usage', { prefix: prefix }));
        return;
    }

    const state = args[0].toLowerCase();
    if (state !== 'on' && state !== 'off') {
        playerUtils.warnPlayer(player, getString('command.worldborder.toggle.invalidState'));
        return;
    }

    const dimensionIdInput = args.length > 1 ? args[1] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);
    const dimensionName = dimensionId ? dimensionId.replace('minecraft:', '') : (dimensionIdInput || player.dimension.id.split(':')[1]);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, getString('command.worldborder.invalidDimension', { dimensionName: dimensionName }));
        return;
    }

    const currentSettings = worldBorderManager.getBorderSettings(dimensionId, dependencies);
    if (!currentSettings) {
        playerUtils.warnPlayer(player, getString('command.worldborder.toggle.noBorder', { dimensionName: dimensionName }));
        return;
    }

    const newState = state === 'on';
    if (currentSettings.enabled === newState && !currentSettings.isResizing) { // Only consider already in state if not resizing
        playerUtils.notifyPlayer(player, getString('command.worldborder.toggle.alreadyState', { dimensionName: dimensionName, state: state }));
        return;
    }

    currentSettings.enabled = newState;
    let cancelledResizeMessage = '';
    if (!newState && currentSettings.isResizing) {
        currentSettings.isResizing = false; // Stop resizing if border is turned off
        cancelledResizeMessage = ' ' + getString('command.worldborder.set.resizeCancelled'); // Reuse this key
    }

    if (worldBorderManager.saveBorderSettings(dimensionId, currentSettings, dependencies)) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.toggle.success', { dimensionName: dimensionName, state: state, resizeCancelledMessage: cancelledResizeMessage }));
        logManager.addLog({ adminName: player.nameTag, actionType: 'worldBorderToggle', targetName: dimensionId, details: `Set to ${state}. Full settings: ${JSON.stringify(worldBorderManager.getBorderSettings(dimensionId, dependencies))}` }, dependencies);
    } else {
        playerUtils.warnPlayer(player, getString('command.worldborder.toggle.fail'));
    }
}

async function handleRemoveCommand(player, args, dependencies) {
    const { config, playerUtils, logManager, worldBorderManager, getString } = dependencies;
    const prefix = config.prefix;
    let dimensionIdInput;
    let confirmationArg = false;

    if (args.length === 0) dimensionIdInput = undefined;
    else if (args.length === 1) {
        if (args[0].toLowerCase() === 'confirm') { dimensionIdInput = undefined; confirmationArg = true; }
        else { dimensionIdInput = args[0]; }
    } else if (args.length === 2) {
        dimensionIdInput = args[0];
        if (args[1].toLowerCase() === 'confirm') confirmationArg = true;
        else { playerUtils.warnPlayer(player, getString('command.worldborder.remove.usage', { prefix: prefix })); return; } // Corrected usage message here
    } else { playerUtils.warnPlayer(player, getString('command.worldborder.remove.usage', { prefix: prefix })); return; }

    const dimensionId = normalizeDimensionId(player, dimensionIdInput);
    const dimensionName = dimensionId ? dimensionId.replace('minecraft:', '') : (dimensionIdInput || player.dimension.id.split(':')[1]);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, getString('command.worldborder.invalidDimension', { dimensionName: dimensionName }));
        return;
    }

    if (!confirmationArg) {
        const dimToDisplay = dimensionIdInput ? dimensionName : getString('command.worldborder.remove.confirmNeeded.currentDimension', { dimensionName: dimensionName });
        const confirmCommand = `${prefix}wb remove ${dimensionIdInput ? dimensionName + ' ' : ''}confirm`;
        playerUtils.warnPlayer(player, getString('command.worldborder.remove.confirmNeeded', { dimensionDisplayName: dimToDisplay, confirmCommand: confirmCommand }));
        return;
    }

    const currentSettings = worldBorderManager.getBorderSettings(dimensionId, dependencies);
    let cancelledResizeMessage = (currentSettings && currentSettings.isResizing) ? ' ' + getString('command.worldborder.set.resizeCancelled') : '';


    if (worldBorderManager.clearBorderSettings(dimensionId, dependencies)) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.remove.success', { dimensionName: dimensionName, resizeCancelledMessage: cancelledResizeMessage }));
        logManager.addLog({ adminName: player.nameTag, actionType: 'worldBorderRemove', targetName: dimensionId, details: `Border removed.${cancelledResizeMessage}` }, dependencies);
    } else {
        playerUtils.warnPlayer(player, getString('command.worldborder.remove.fail', { dimensionName: dimensionName }));
    }
}

async function handleResizeCommand(player, args, operationType, dependencies) {
    const { config, playerUtils, logManager, worldBorderManager, getString } = dependencies;
    const prefix = config.prefix;

    if (args.length < 2) {
        playerUtils.warnPlayer(player, getString('command.worldborder.resize.usage', { prefix: prefix, operationType: operationType }));
        return;
    }

    const newSize = parseFloat(args[0]);
    const timeSeconds = parseFloat(args[1]);
    let dimensionIdInput = undefined;
    let interpolationType = 'linear'; // Default

    if (args.length > 3) { // dimension and interpolation type provided
        dimensionIdInput = args[2];
        interpolationType = args[3].toLowerCase();
    } else if (args.length > 2) { // either dimension or interpolation type
        const thirdArg = args[2].toLowerCase();
        const validInterpTypes = ['linear', 'easeoutquad', 'easeinoutquad'];
        if (validInterpTypes.includes(thirdArg)) interpolationType = thirdArg;
        else dimensionIdInput = args[2];
    }

    const dimensionId = normalizeDimensionId(player, dimensionIdInput);
    const dimensionName = dimensionId ? dimensionId.replace('minecraft:', '') : (dimensionIdInput || player.dimension.id.split(':')[1]);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, getString('command.worldborder.invalidDimension', { dimensionName: dimensionName }));
        return;
    }

    const validInterpTypes = ['linear', 'easeoutquad', 'easeinoutquad'];
    if (!validInterpTypes.includes(interpolationType)) {
        playerUtils.warnPlayer(player, getString('command.worldborder.resize.invalidInterpolation', { interpolationType: interpolationType, validTypes: validInterpTypes.join(', ') }));
        interpolationType = 'linear'; // Default back
    }

    if (isNaN(newSize) || newSize <= 0 || isNaN(timeSeconds) || timeSeconds <= 0) {
        playerUtils.warnPlayer(player, getString('command.worldborder.resize.positiveNumbers'));
        return;
    }

    let currentSettings = worldBorderManager.getBorderSettings(dimensionId, dependencies);
    if (!currentSettings || !currentSettings.enabled) {
        playerUtils.warnPlayer(player, getString('command.worldborder.resize.noActiveBorder', { dimensionName: dimensionName, operationType: operationType }));
        return;
    }

    const currentActualSize = currentSettings.shape === 'circle' ? currentSettings.radius : currentSettings.halfSize;
    if (typeof currentActualSize !== 'number') {
        playerUtils.warnPlayer(player, getString('command.worldborder.resize.notDefined', { dimensionName: dimensionName, operationType: operationType }));
        return;
    }

    if (operationType === 'shrink' && newSize >= currentActualSize) {
        playerUtils.warnPlayer(player, getString('command.worldborder.resize.shrinkTooLarge', { newSize: newSize.toString(), currentSize: currentActualSize.toString() }));
        return;
    }
    if (operationType === 'expand' && newSize <= currentActualSize) {
        playerUtils.warnPlayer(player, getString('command.worldborder.resize.expandTooSmall', { newSize: newSize.toString(), currentSize: currentActualSize.toString() }));
        return;
    }

    if (currentSettings.isResizing) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.resize.overrideCurrent'));
    }

    currentSettings.isResizing = true;
    currentSettings.originalSize = currentActualSize;
    currentSettings.targetSize = newSize;
    currentSettings.resizeStartTimeMs = Date.now();
    currentSettings.resizeDurationMs = timeSeconds * 1000;
    currentSettings.resizeInterpolationType = interpolationType;
    currentSettings.isPaused = false; // Reset pause state on new resize
    currentSettings.resizePausedTimeMs = 0;
    currentSettings.resizeLastPauseStartTimeMs = undefined;


    if (worldBorderManager.saveBorderSettings(dimensionId, currentSettings, dependencies)) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.resize.success', { dimensionName: dimensionName, operationType: operationType, originalSize: currentActualSize.toString(), newSize: newSize.toString(), timeSeconds: timeSeconds.toString(), interpolationType: interpolationType }));
        logManager.addLog({ adminName: player.nameTag, actionType: `worldBorder${operationType.charAt(0).toUpperCase() + operationType.slice(1)}Start`, targetName: dimensionId, details: JSON.stringify(currentSettings) }, dependencies);
    } else {
        playerUtils.warnPlayer(player, getString('command.worldborder.resize.fail', { operationType: operationType }));
    }
}

async function handleShrinkCommand(player, args, dependencies) {
    await handleResizeCommand(player, args, 'shrink', dependencies);
}

async function handleExpandCommand(player, args, dependencies) {
    await handleResizeCommand(player, args, 'expand', dependencies);
}

async function handleResizePauseCommand(player, args, dependencies) {
    const { playerUtils, logManager, worldBorderManager, config, getString } = dependencies;
    const dimensionIdInput = args.length > 0 ? args[0] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);
    const dimensionName = dimensionId ? dimensionId.replace('minecraft:', '') : (dimensionIdInput || player.dimension.id.split(':')[1]);


    if (!dimensionId) {
        playerUtils.warnPlayer(player, getString('command.worldborder.invalidDimension', { dimensionName: dimensionName }));
        return;
    }
    const settings = worldBorderManager.getBorderSettings(dimensionId, dependencies);
    if (!settings || !settings.isResizing) {
        playerUtils.warnPlayer(player, getString('command.worldborder.pause.noResize', { dimensionName: dimensionName }));
        return;
    }
    if (settings.isPaused) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.pause.alreadyPaused', { dimensionName: dimensionName }));
        return;
    }
    settings.isPaused = true;
    settings.resizeLastPauseStartTimeMs = Date.now();
    if (worldBorderManager.saveBorderSettings(dimensionId, settings, dependencies)) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.pause.success', { dimensionName: dimensionName }));
        logManager.addLog({ adminName: player.nameTag, actionType: 'worldBorderResizePause', targetName: dimensionId, details: JSON.stringify(settings) }, dependencies);
    } else {
        playerUtils.warnPlayer(player, getString('command.worldborder.pause.fail', { dimensionName: dimensionName }));
    }
}

async function handleResizeResumeCommand(player, args, dependencies) {
    const { playerUtils, logManager, worldBorderManager, config, getString } = dependencies;
    const dimensionIdInput = args.length > 0 ? args[0] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);
    const dimensionName = dimensionId ? dimensionId.replace('minecraft:', '') : (dimensionIdInput || player.dimension.id.split(':')[1]);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, getString('command.worldborder.invalidDimension', { dimensionName: dimensionName }));
        return;
    }
    const settings = worldBorderManager.getBorderSettings(dimensionId, dependencies);
    if (!settings || !settings.isResizing) {
        playerUtils.warnPlayer(player, getString('command.worldborder.resume.noResize', { dimensionName: dimensionName }));
        return;
    }
    if (!settings.isPaused) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.resume.notPaused', { dimensionName: dimensionName }));
        return;
    }
    const currentPauseDurationMs = Date.now() - (settings.resizeLastPauseStartTimeMs || Date.now());
    settings.resizePausedTimeMs = (settings.resizePausedTimeMs || 0) + currentPauseDurationMs;
    settings.isPaused = false;
    settings.resizeLastPauseStartTimeMs = undefined;
    if (worldBorderManager.saveBorderSettings(dimensionId, settings, dependencies)) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.resume.success', { dimensionName: dimensionName }));
        logManager.addLog({ adminName: player.nameTag, actionType: 'worldBorderResizeResume', targetName: dimensionId, details: JSON.stringify(settings) }, dependencies);
    } else {
        playerUtils.warnPlayer(player, getString('command.worldborder.resume.fail', { dimensionName: dimensionName }));
    }
}

async function handleSetGlobalParticleCommand(player, args, dependencies) {
    const { playerUtils, logManager, editableConfig, config: currentRunTimeConfig, getString } = dependencies;
    const prefix = currentRunTimeConfig.prefix;

    if (args.length < 1) {
        playerUtils.warnPlayer(player, getString('command.worldborder.setglobalparticle.usage', { prefix: prefix }));
        return;
    }
    const particleName = args[0];
    if (typeof particleName !== 'string' || particleName.trim() === '') {
        playerUtils.warnPlayer(player, getString('command.worldborder.particle.emptyName'));
        return;
    }
    if (!editableConfig || typeof editableConfig.updateConfigValue !== 'function') {
        playerUtils.warnPlayer(player, getString('command.worldborder.setglobalparticle.errorConfig'));
        console.warn('[WB SetGlobalParticle] editableConfig or updateConfigValue is not available in dependencies.');
        return;
    }
    const success = editableConfig.updateConfigValue('worldBorderParticleName', particleName);
    if (success) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.setglobalparticle.success', { particleName: particleName }));
        logManager.addLog({ adminName: player.nameTag, actionType: 'worldBorderSetGlobalParticle', targetName: 'global_config', details: `Set worldBorderParticleName to: ${particleName}` }, dependencies);
    } else {
        const currentGlobalParticleFromRuntime = currentRunTimeConfig.worldBorderParticleName;
        if (currentGlobalParticleFromRuntime === particleName) {
            playerUtils.warnPlayer(player, getString('command.worldborder.setglobalparticle.alreadySet', { particleName: particleName }));
        } else {
            playerUtils.warnPlayer(player, getString('command.worldborder.setglobalparticle.failInternal'));
        }
    }
}

async function handleSetParticleCommand(player, args, dependencies) {
    const { playerUtils, logManager, config: currentRunTimeConfig, worldBorderManager, getString } = dependencies;
    const prefix = currentRunTimeConfig.prefix;
    const globalDefaultParticle = currentRunTimeConfig.worldBorderParticleName;

    if (args.length < 1) {
        playerUtils.warnPlayer(player, getString('command.worldborder.setparticle.usage', { prefix: prefix }));
        return;
    }
    const particleNameInput = args[0];
    const dimensionIdInput = args.length > 1 ? args[1] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);
    const dimensionName = dimensionId ? dimensionId.replace('minecraft:', '') : (dimensionIdInput || player.dimension.id.split(':')[1]);


    if (!dimensionId) {
        playerUtils.warnPlayer(player, getString('command.worldborder.invalidDimension', { dimensionName: dimensionName }));
        return;
    }
    let settings = worldBorderManager.getBorderSettings(dimensionId, dependencies);
    if (!settings || !settings.enabled) {
        playerUtils.warnPlayer(player, getString('command.worldborder.setparticle.noActiveBorder', { dimensionName: dimensionName }));
        return;
    }
    let newParticleOverride;
    let messageParticleName = particleNameInput;
    if (particleNameInput.toLowerCase() === 'reset' || particleNameInput.toLowerCase() === 'default') {
        newParticleOverride = undefined;
        messageParticleName = `Global Default (${globalDefaultParticle})`;
    } else {
        if (typeof particleNameInput !== 'string' || particleNameInput.trim() === '') {
            playerUtils.warnPlayer(player, getString('command.worldborder.particle.emptyName'));
            return;
        }
        newParticleOverride = particleNameInput.trim();
    }
    settings.particleNameOverride = newParticleOverride;
    if (worldBorderManager.saveBorderSettings(dimensionId, settings, dependencies)) {
        playerUtils.notifyPlayer(player, getString('command.worldborder.setparticle.success', { dimensionName: dimensionName, particleNameDisplay: messageParticleName }));
        logManager.addLog({ adminName: player.nameTag, actionType: 'worldBorderSetParticle', targetName: dimensionId, details: `Set particle override to: ${newParticleOverride === undefined ? 'Global Default' : newParticleOverride}` }, dependencies);
    } else {
        playerUtils.warnPlayer(player, getString('command.worldborder.setparticle.fail'));
    }
}
