/**
 * Manages world border settings via commands.
 */
import * as mc from '@minecraft/server';
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
    const { playerUtils, logManager, config, worldBorderManager } = dependencies;
    const subCommand = args.shift()?.toLowerCase();
    const cmdPrefix = config.prefix;

    if (!subCommand || subCommand === 'help') {
        playerUtils.notifyPlayer(player, '--- World Border Commands ---');
        playerUtils.notifyPlayer(player, `${cmdPrefix}wb set <square|circle> <centerX> <centerZ> <size> [dimension] - Sets a border.`);
        playerUtils.notifyPlayer(player, '  Example Size: For square, size is half-length (e.g., 500 for 1000x1000). For circle, size is radius.');
        playerUtils.notifyPlayer(player, `${cmdPrefix}wb get [dimension] - Shows current border settings.`);
        playerUtils.notifyPlayer(player, `${cmdPrefix}wb toggle <on|off> [dimension] - Enables/disables the border.`);
        playerUtils.notifyPlayer(player, `${cmdPrefix}wb remove [dimension] confirm - Removes the border.`);
        playerUtils.notifyPlayer(player, `${cmdPrefix}wb <shrink|expand> <newSize> <timeSeconds> [dimension] [interpolationType] - Resizes border.`);
        playerUtils.notifyPlayer(player, `${cmdPrefix}wb resizepause [dimension] - Pauses an active resize.`);
        playerUtils.notifyPlayer(player, `${cmdPrefix}wb resizeresume [dimension] - Resumes a paused resize.`);
        playerUtils.notifyPlayer(player, `${cmdPrefix}wb setglobalparticle <particleName> - Sets default particle for all borders.`);
        playerUtils.notifyPlayer(player, `${cmdPrefix}wb setparticle <particleName|reset> [dimension] - Sets particle for a specific border or resets to global.`);
        playerUtils.notifyPlayer(player, 'Dimension defaults to current if not specified (overworld, nether, end).');
        playerUtils.notifyPlayer(player, 'Interpolation types: linear (default), easeoutquad, easeinoutquad.');
        return;
    }

    const validSubcommands = ['set', 'get', 'toggle', 'remove', 'shrink', 'expand', 'resizepause', 'resizeresume', 'setglobalparticle', 'setparticle'];
    if (!validSubcommands.includes(subCommand)) {
        playerUtils.warnPlayer(player, `§cInvalid subcommand '${subCommand}'. Use ${cmdPrefix}wb help.`);
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
        default:
            playerUtils.warnPlayer(player, `§cInvalid subcommand '${subCommand}'. Use ${cmdPrefix}wb help.`);
    }
}

function normalizeDimensionId(player, inputDimId) {
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
    if (normalized === 'overworld') return 'minecraft:overworld';
    if (normalized === 'nether') return 'minecraft:the_nether';
    if (normalized === 'the_end' || normalized === 'end') return 'minecraft:the_end';
    if (normalized === 'minecraft:overworld' || normalized === 'minecraft:the_nether' || normalized === 'minecraft:the_end') return normalized;
    return null;
}

async function handleSetCommand(player, args, dependencies) {
    const { playerUtils, logManager, config: currentRunTimeConfig, worldBorderManager } = dependencies;
    const prefix = currentRunTimeConfig.prefix;

    if (args.length < 4) {
        playerUtils.warnPlayer(player, `§cUsage: ${prefix}wb set <square|circle> <centerX> <centerZ> <size> [dimension]`);
        playerUtils.notifyPlayer(player, '§eNote: For square, size is half-length (e.g., 500 for 1000x1000). For circle, size is radius.');
        return;
    }

    const shape = args[0].toLowerCase();
    if (shape !== 'square' && shape !== 'circle') {
        playerUtils.warnPlayer(player, '§cInvalid shape. Use \'square\' or \'circle\'.');
        return;
    }

    const centerX = parseInt(args[1]);
    const centerZ = parseInt(args[2]);
    const sizeParam = parseFloat(args[3]);

    if (isNaN(centerX) || isNaN(centerZ) || isNaN(sizeParam)) {
        playerUtils.warnPlayer(player, '§cInvalid numbers for centerX, centerZ, or size.');
        return;
    }
    if (sizeParam <= 0) {
        playerUtils.warnPlayer(player, '§cSize must be a positive number.');
        return;
    }

    const dimensionIdInput = args.length > 4 ? args[4] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `§cInvalid dimension: ${dimensionIdInput || player.dimension.id}. Use overworld, nether, or end.`);
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
        const damageStatus = settingsToSave.enableDamage ? `ON (Amount: ${settingsToSave.damageAmount}, Interval: ${settingsToSave.damageIntervalTicks}t, TP Events: ${settingsToSave.teleportAfterNumDamageEvents})` : 'OFF';

        playerUtils.notifyPlayer(player, `§aWorld border set for ${dimensionId.replace('minecraft:', '')}:`);
        playerUtils.notifyPlayer(player, `  Shape: ${shape}, Center: (${centerX}, ${centerZ}), Size: ${sizeDisplay}`);
        playerUtils.notifyPlayer(player, `  Damage: ${damageStatus}`);
        if (cancelledResize) {
            playerUtils.notifyPlayer(player, '§eAny active border resize for this dimension was cancelled.');
        }
        logManager.addLog({ adminName: player.nameTag, actionType: 'worldBorderSet', targetName: dimensionId, details: JSON.stringify(worldBorderManager.getBorderSettings(dimensionId, dependencies) || settingsToSave) }, dependencies);
    } else {
        playerUtils.warnPlayer(player, '§cFailed to save world border settings.');
    }
}

async function handleGetCommand(player, args, dependencies) {
    const { playerUtils, logManager, config: currentRunTimeConfig, worldBorderManager } = dependencies;
    const prefix = currentRunTimeConfig.prefix;
    const dimensionIdInput = args.length > 0 ? args[0] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `§cInvalid dimension: ${dimensionIdInput || player.dimension.id}. Use overworld, nether, or end.`);
        return;
    }

    const settings = worldBorderManager.getBorderSettings(dimensionId, dependencies);
    if (settings) {
        playerUtils.notifyPlayer(player, `§e--- World Border: ${dimensionId.replace('minecraft:','')} ---`);
        playerUtils.notifyPlayer(player, `  Enabled: ${settings.enabled}`);
        playerUtils.notifyPlayer(player, `  Shape: ${settings.shape}`);
        playerUtils.notifyPlayer(player, `  Center: X=${settings.centerX}, Z=${settings.centerZ}`);

        if (settings.shape === 'square' && typeof settings.halfSize === 'number') {
            playerUtils.notifyPlayer(player, `  Half Size: ${settings.halfSize} (Diameter: ${settings.halfSize * 2})`);
            playerUtils.notifyPlayer(player, `  Bounds: X(${settings.centerX - settings.halfSize} to ${settings.centerX + settings.halfSize}), Z(${settings.centerZ - settings.halfSize} to ${settings.centerZ + settings.halfSize})`);
        } else if (settings.shape === 'circle' && typeof settings.radius === 'number') {
            playerUtils.notifyPlayer(player, `  Radius: ${settings.radius}`);
        }

        const enableDamage = settings.enableDamage ?? currentRunTimeConfig.worldBorderDefaultEnableDamage;
        playerUtils.notifyPlayer(player, `  Damage Enabled: ${enableDamage}`);
        if (enableDamage) {
            playerUtils.notifyPlayer(player, `  Damage Amount: ${settings.damageAmount ?? currentRunTimeConfig.worldBorderDefaultDamageAmount}`);
            playerUtils.notifyPlayer(player, `  Damage Interval: ${settings.damageIntervalTicks ?? currentRunTimeConfig.worldBorderDefaultDamageIntervalTicks} ticks`);
            playerUtils.notifyPlayer(player, `  Teleport After: ${settings.teleportAfterNumDamageEvents ?? currentRunTimeConfig.worldBorderTeleportAfterNumDamageEvents} damage events`);
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

            playerUtils.notifyPlayer(player, `  Resizing: YES (From ${settings.originalSize} to ${settings.targetSize})`);
            playerUtils.notifyPlayer(player, `  Progress: ${progressPercent.toFixed(1)}% (${remainingSec.toFixed(1)}s remaining)`);
            playerUtils.notifyPlayer(player, `  Current Approx. Size: ${currentInterpolatedSize.toFixed(1)}`);
            playerUtils.notifyPlayer(player, `  Interpolation: ${settings.resizeInterpolationType || 'linear'}`);
            if (settings.isPaused) {
                playerUtils.notifyPlayer(player, '  Resize Status: PAUSED');
                let displayPausedTime = accumulatedPausedTime;
                if (settings.isPaused && typeof settings.resizeLastPauseStartTimeMs === 'number') {
                    displayPausedTime += (Date.now() - settings.resizeLastPauseStartTimeMs);
                }
                playerUtils.notifyPlayer(player, `  Total Paused Time: ${formatDurationBrief(displayPausedTime)}`);
            }
        }

        const currentGlobalParticle = dependencies.config.worldBorderParticleName;
        if (settings.particleNameOverride) {
            playerUtils.notifyPlayer(player, `  Particle Override: ${settings.particleNameOverride}`);
            if (settings.particleNameOverride !== currentGlobalParticle) {
                 playerUtils.notifyPlayer(player, `    (Global default is: ${currentGlobalParticle})`);
            }
        } else {
            playerUtils.notifyPlayer(player, `  Particle: Global Default (${currentGlobalParticle})`);
        }
    } else {
        playerUtils.notifyPlayer(player, `§eNo world border configured for ${dimensionId.replace('minecraft:', '')}. Use ${prefix}wb set to create one.`);
    }
}

async function handleToggleCommand(player, args, dependencies) {
    const { config, playerUtils, logManager, worldBorderManager } = dependencies;
    const prefix = config.prefix;

    if (args.length < 1) {
        playerUtils.warnPlayer(player, `§cUsage: ${prefix}wb toggle <on|off> [dimension]`);
        return;
    }

    const state = args[0].toLowerCase();
    if (state !== 'on' && state !== 'off') {
        playerUtils.warnPlayer(player, '§cInvalid state. Use \'on\' or \'off\'.');
        return;
    }

    const dimensionIdInput = args.length > 1 ? args[1] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `§cInvalid dimension: ${dimensionIdInput || player.dimension.id}.`);
        return;
    }

    const currentSettings = worldBorderManager.getBorderSettings(dimensionId, dependencies);
    if (!currentSettings) {
        playerUtils.warnPlayer(player, `§cNo border configured for ${dimensionId.replace('minecraft:', '')} to toggle.`);
        return;
    }

    const newState = state === 'on';
    if (currentSettings.enabled === newState && !currentSettings.isResizing) {
        playerUtils.notifyPlayer(player, `§eBorder for ${dimensionId.replace('minecraft:', '')} is already ${state}.`);
        return;
    }

    currentSettings.enabled = newState;
    let cancelledResizeMessage = '';
    if (!newState && currentSettings.isResizing) {
        currentSettings.isResizing = false;
        cancelledResizeMessage = ' Active resize has been cancelled.';
    }

    if (worldBorderManager.saveBorderSettings(dimensionId, currentSettings, dependencies)) {
        playerUtils.notifyPlayer(player, `§aBorder for ${dimensionId.replace('minecraft:', '')} turned ${state}.${cancelledResizeMessage}`);
        logManager.addLog({ adminName: player.nameTag, actionType: 'worldBorderToggle', targetName: dimensionId, details: `Set to ${state}. Full settings: ${JSON.stringify(worldBorderManager.getBorderSettings(dimensionId, dependencies))}` }, dependencies);
    } else {
        playerUtils.warnPlayer(player, '§cFailed to toggle world border state.');
    }
}

async function handleRemoveCommand(player, args, dependencies) {
    const { config, playerUtils, logManager, worldBorderManager } = dependencies;
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
        else { playerUtils.warnPlayer(player, `§cTo remove, type: ${prefix}wb remove ${dimensionIdInput} confirm`); return; }
    } else { playerUtils.warnPlayer(player, `§cUsage: ${prefix}wb remove [dimension] confirm`); return; }

    const dimensionId = normalizeDimensionId(player, dimensionIdInput);
    if (!dimensionId) {
        playerUtils.warnPlayer(player, `§cInvalid dimension: ${dimensionIdInput || player.dimension.id}.`);
        return;
    }

    if (!confirmationArg) {
        const dimToDisplay = dimensionIdInput ? dimensionId.replace('minecraft:', '') : `your current dimension (${dimensionId.replace('minecraft:', '')})`;
        const confirmCmd = `${prefix}wb remove ${dimensionIdInput ? dimensionId.replace('minecraft:', '') + ' ' : ''}confirm`;
        playerUtils.warnPlayer(player, `§cAre you sure you want to remove the border for ${dimToDisplay}? Type: ${confirmCmd}`);
        return;
    }

    const currentSettings = worldBorderManager.getBorderSettings(dimensionId, dependencies);
    let cancelledResizeMessage = (currentSettings && currentSettings.isResizing) ? ' Active resize was also cancelled.' : '';

    if (worldBorderManager.clearBorderSettings(dimensionId, dependencies)) {
        playerUtils.notifyPlayer(player, `§aWorld border for ${dimensionId.replace('minecraft:', '')} removed.${cancelledResizeMessage}`);
        logManager.addLog({ adminName: player.nameTag, actionType: 'worldBorderRemove', targetName: dimensionId, details: `Border removed.${cancelledResizeMessage}` }, dependencies);
    } else {
        playerUtils.warnPlayer(player, `§cFailed to remove border for ${dimensionId.replace('minecraft:', '')}.`);
    }
}

async function handleResizeCommand(player, args, operationType, dependencies) {
    const { config, playerUtils, logManager, worldBorderManager } = dependencies;
    const prefix = config.prefix;

    if (args.length < 2) {
        playerUtils.warnPlayer(player, `§cUsage: ${prefix}wb ${operationType} <newSize> <timeSeconds> [dimension] [interpolationType]`);
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
        playerUtils.warnPlayer(player, `§cInvalid dimension: ${dimensionIdInput || player.dimension.id}.`);
        return;
    }

    const validInterpTypes = ['linear', 'easeoutquad', 'easeinoutquad'];
    if (!validInterpTypes.includes(interpolationType)) {
        playerUtils.warnPlayer(player, `§cInvalid interpolation type: ${interpolationType}. Valid: ${validInterpTypes.join(', ')}.`);
        interpolationType = 'linear';
    }

    if (isNaN(newSize) || newSize <= 0 || isNaN(timeSeconds) || timeSeconds <= 0) {
        playerUtils.warnPlayer(player, '§cNew size and time must be positive numbers.');
        return;
    }

    let currentSettings = worldBorderManager.getBorderSettings(dimensionId, dependencies);
    if (!currentSettings || !currentSettings.enabled) {
        playerUtils.warnPlayer(player, `§cNo active border in ${dimensionId.replace('minecraft:', '')} to ${operationType}.`);
        return;
    }

    const currentActualSize = currentSettings.shape === 'circle' ? currentSettings.radius : currentSettings.halfSize;
    if (typeof currentActualSize !== 'number') {
        playerUtils.warnPlayer(player, `§cCurrent border size not defined for ${dimensionId.replace('minecraft:', '')} to ${operationType}.`);
        return;
    }

    if (operationType === 'shrink' && newSize >= currentActualSize) {
        playerUtils.warnPlayer(player, `§cNew size (${newSize}) must be smaller than current size (${currentActualSize}) for shrink.`);
        return;
    }
    if (operationType === 'expand' && newSize <= currentActualSize) {
        playerUtils.warnPlayer(player, `§cNew size (${newSize}) must be larger than current size (${currentActualSize}) for expand.`);
        return;
    }

    if (currentSettings.isResizing) {
        playerUtils.notifyPlayer(player, '§eOverriding current border resize operation.');
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

    if (worldBorderManager.saveBorderSettings(dimensionId, currentSettings, dependencies)) {
        playerUtils.notifyPlayer(player, `§aBorder for ${dimensionId.replace('minecraft:', '')} now ${operationType}ing from ${currentActualSize} to ${newSize} over ${timeSeconds}s (${interpolationType}).`);
        logManager.addLog({ adminName: player.nameTag, actionType: `worldBorder${operationType.charAt(0).toUpperCase() + operationType.slice(1)}Start`, targetName: dimensionId, details: JSON.stringify(currentSettings) }, dependencies);
    } else {
        playerUtils.warnPlayer(player, `§cFailed to start border ${operationType}.`);
    }
}

async function handleShrinkCommand(player, args, dependencies) {
    await handleResizeCommand(player, args, 'shrink', dependencies);
}

async function handleExpandCommand(player, args, dependencies) {
    await handleResizeCommand(player, args, 'expand', dependencies);
}

async function handleResizePauseCommand(player, args, dependencies) {
    const { playerUtils, logManager, worldBorderManager, config } = dependencies;
    const prefix = config.prefix;
    const dimensionIdInput = args.length > 0 ? args[0] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `§cInvalid dimension: ${dimensionIdInput || player.dimension.id}.`);
        return;
    }
    const settings = worldBorderManager.getBorderSettings(dimensionId, dependencies);
    if (!settings || !settings.isResizing) {
        playerUtils.warnPlayer(player, `§cNo border is currently resizing in ${dimensionId.replace('minecraft:', '')}.`);
        return;
    }
    if (settings.isPaused) {
        playerUtils.notifyPlayer(player, `§eBorder resize in ${dimensionId.replace('minecraft:', '')} is already paused.`);
        return;
    }
    settings.isPaused = true;
    settings.resizeLastPauseStartTimeMs = Date.now();
    if (worldBorderManager.saveBorderSettings(dimensionId, settings, dependencies)) {
        playerUtils.notifyPlayer(player, `§aBorder resize in ${dimensionId.replace('minecraft:', '')} paused.`);
        logManager.addLog({ adminName: player.nameTag, actionType: 'worldBorderResizePause', targetName: dimensionId, details: JSON.stringify(settings) }, dependencies);
    } else {
        playerUtils.warnPlayer(player, `§cFailed to pause border resize in ${dimensionId.replace('minecraft:', '')}.`);
    }
}

async function handleResizeResumeCommand(player, args, dependencies) {
    const { playerUtils, logManager, worldBorderManager, config } = dependencies;
    const prefix = config.prefix;
    const dimensionIdInput = args.length > 0 ? args[0] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `§cInvalid dimension: ${dimensionIdInput || player.dimension.id}.`);
        return;
    }
    const settings = worldBorderManager.getBorderSettings(dimensionId, dependencies);
    if (!settings || !settings.isResizing) {
        playerUtils.warnPlayer(player, `§cNo border is currently resizing in ${dimensionId.replace('minecraft:', '')} to resume.`);
        return;
    }
    if (!settings.isPaused) {
        playerUtils.notifyPlayer(player, `§eBorder resize in ${dimensionId.replace('minecraft:', '')} is not currently paused.`);
        return;
    }
    const currentPauseDurationMs = Date.now() - (settings.resizeLastPauseStartTimeMs || Date.now());
    settings.resizePausedTimeMs = (settings.resizePausedTimeMs || 0) + currentPauseDurationMs;
    settings.isPaused = false;
    settings.resizeLastPauseStartTimeMs = undefined;
    if (worldBorderManager.saveBorderSettings(dimensionId, settings, dependencies)) {
        playerUtils.notifyPlayer(player, `§aBorder resize in ${dimensionId.replace('minecraft:', '')} resumed.`);
        logManager.addLog({ adminName: player.nameTag, actionType: 'worldBorderResizeResume', targetName: dimensionId, details: JSON.stringify(settings) }, dependencies);
    } else {
        playerUtils.warnPlayer(player, `§cFailed to resume border resize in ${dimensionId.replace('minecraft:', '')}.`);
    }
}

async function handleSetGlobalParticleCommand(player, args, dependencies) {
    const { playerUtils, logManager, editableConfig, config: currentRunTimeConfig } = dependencies;
    const prefix = currentRunTimeConfig.prefix;

    if (args.length < 1) {
        playerUtils.warnPlayer(player, `§cUsage: ${prefix}wb setglobalparticle <particleName>`);
        return;
    }
    const particleName = args[0];
    if (typeof particleName !== 'string' || particleName.trim() === '') {
        playerUtils.warnPlayer(player, '§cParticle name cannot be empty.');
        return;
    }
    if (!editableConfig || typeof editableConfig.updateConfigValue !== 'function') {
        playerUtils.warnPlayer(player, '§cConfiguration system error. Cannot set global particle.');
        console.warn('[WB SetGlobalParticle] editableConfig or updateConfigValue is not available in dependencies.');
        return;
    }
    const success = editableConfig.updateConfigValue('worldBorderParticleName', particleName);
    if (success) {
        playerUtils.notifyPlayer(player, `§aGlobal world border particle set to: ${particleName}`);
        logManager.addLog({ adminName: player.nameTag, actionType: 'worldBorderSetGlobalParticle', targetName: 'global_config', details: `Set worldBorderParticleName to: ${particleName}` }, dependencies);
    } else {
        // Compare against the live runtime config value
        const currentGlobalParticleFromRuntime = currentRunTimeConfig.worldBorderParticleName;
        if (currentGlobalParticleFromRuntime === particleName) {
            playerUtils.warnPlayer(player, `§eGlobal particle is already set to ${particleName}. No change made.`);
        } else {
            playerUtils.warnPlayer(player, '§cFailed to set global particle due to an internal error.');
        }
    }
}

async function handleSetParticleCommand(player, args, dependencies) {
    const { playerUtils, logManager, config: currentRunTimeConfig, worldBorderManager } = dependencies;
    const prefix = currentRunTimeConfig.prefix;
    const globalDefaultParticle = currentRunTimeConfig.worldBorderParticleName;

    if (args.length < 1) {
        playerUtils.warnPlayer(player, `§cUsage: ${prefix}wb setparticle <particleName|reset> [dimension]`);
        return;
    }
    const particleNameInput = args[0];
    const dimensionIdInput = args.length > 1 ? args[1] : undefined;
    const dimensionId = normalizeDimensionId(player, dimensionIdInput);

    if (!dimensionId) {
        playerUtils.warnPlayer(player, `§cInvalid dimension: ${dimensionIdInput || player.dimension.id}.`);
        return;
    }
    let settings = worldBorderManager.getBorderSettings(dimensionId, dependencies);
    if (!settings || !settings.enabled) {
        playerUtils.warnPlayer(player, `§cNo active border in ${dimensionId.replace('minecraft:','')} to set particle for.`);
        return;
    }
    let newParticleOverride;
    let messageParticleName = particleNameInput;
    if (particleNameInput.toLowerCase() === 'reset' || particleNameInput.toLowerCase() === 'default') {
        newParticleOverride = undefined;
        messageParticleName = `Global Default (${globalDefaultParticle})`;
    } else {
        if (typeof particleNameInput !== 'string' || particleNameInput.trim() === '') {
            playerUtils.warnPlayer(player, '§cParticle name cannot be empty.');
            return;
        }
        newParticleOverride = particleNameInput.trim();
    }
    settings.particleNameOverride = newParticleOverride;
    if (worldBorderManager.saveBorderSettings(dimensionId, settings, dependencies)) {
        playerUtils.notifyPlayer(player, `§aParticle for border in ${dimensionId.replace('minecraft:','')} set to: ${messageParticleName}`);
        logManager.addLog({ adminName: player.nameTag, actionType: 'worldBorderSetParticle', targetName: dimensionId, details: `Set particle override to: ${newParticleOverride === undefined ? 'Global Default' : newParticleOverride}` }, dependencies);
    } else {
        playerUtils.warnPlayer(player, '§cFailed to set particle for world border.');
    }
}
