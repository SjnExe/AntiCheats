/**
/**
 * @file Defines the !worldborder command (aliased as !wb) for managing per-dimension world borders.
 */
import * as mc from '@minecraft/server';

// Default configuration values and argument counts
const MIN_ARGS_WB_SET = 4;
const DEFAULT_WB_DAMAGE_AMOUNT = 0.5;
const DEFAULT_WB_DAMAGE_INTERVAL_TICKS = 20;
const DEFAULT_WB_TELEPORT_AFTER_DAMAGE_EVENTS = 30;

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'worldborder',
    syntax: '<subcommand> [args...]',
    description: 'Manages per-dimension world borders. Use "!wb help" for subcommands.',
    aliases: ['wb', 'worldb'],
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Helper to parse dimension ID from arguments or default to player's current dimension.
 * @param {string | undefined} dimensionArg - The dimension argument from the command.
 * @param {import('@minecraft/server').Player} player - The command issuer.
 * @param {import('../types.js').Dependencies} dependencies - For getString.
 * @returns {{dimensionId: string | null, dimensionName: string | null, error?: string}} Parsed dimension info or error.
 */
function parseDimensionArgument(dimensionArg, player, dependencies) {
    const { getString } = dependencies;
    let dimensionId = player.dimension.id;
    let dimensionName = player.dimension.id.replace('minecraft:', '');

    if (dimensionArg) {
        const lowerDimArg = dimensionArg.toLowerCase().replace('minecraft:', '');
        switch (lowerDimArg) {
            case 'overworld':
                dimensionId = mc.DimensionTypes.overworld.id;
                dimensionName = 'overworld';
                break;
            case 'nether':
                dimensionId = mc.DimensionTypes.nether.id;
                dimensionName = 'nether';
                break;
            case 'the_end':
                dimensionId = mc.DimensionTypes.theEnd.id;
                dimensionName = 'the_end';
                break;
            default:
                return { dimensionId: null, dimensionName: null, error: getString('command.worldborder.invalidDimension', { dimensionName: dimensionArg }) };
        }
    }
    return { dimensionId, dimensionName };
}


/**
 * Executes the !worldborder command and its subcommands.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments.
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString, worldBorderManager: wbManager } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';
    const mainCommand = definition.name;

    if (!config?.enableWorldBorderSystem) {
        player.sendMessage(getString('command.worldborder.systemDisabled', { commandName: mainCommand }));
        return;
    }
    if (!wbManager) {
        player.sendMessage(getString('common.error.genericCommandError', { commandName: mainCommand, errorMessage: 'World Border module unavailable.' }));
        return;
    }

    const subCommand = args[0]?.toLowerCase();
    const subArgs = args.slice(1);

    if (!subCommand || subCommand === 'help') {
        const helpMessages = [
            getString('command.worldborder.help.header'),
            getString('command.worldborder.help.set', { prefix: prefix }),
            getString('command.worldborder.help.setSizeNote'),
            getString('command.worldborder.help.get', { prefix: prefix }),
            getString('command.worldborder.help.toggle', { prefix: prefix }),
            getString('command.worldborder.help.remove', { prefix: prefix }),
            getString('command.worldborder.help.resize', { prefix: prefix }),
            getString('command.worldborder.help.pause', { prefix: prefix }),
            getString('command.worldborder.help.resume', { prefix: prefix }),
            getString('command.worldborder.help.setGlobalParticle', { prefix: prefix }),
            getString('command.worldborder.help.setParticle', { prefix: prefix }),
            getString('command.worldborder.help.dimensionNote'),
            getString('command.worldborder.help.interpolationNote'),
        ];
        player.sendMessage(helpMessages.join('\n'));
        return;
    }

    let dimParseResult, dimensionId, dimensionName, borderSettings;
    let success = false; // Initialize success flag

    try {
        switch (subCommand) {
            case 'set': {
                if (subArgs.length < MIN_ARGS_WB_SET) {
                    player.sendMessage(getString('command.worldborder.set.usage', { prefix: prefix }));
                    player.sendMessage(getString('command.worldborder.set.noteSize'));
                    return;
                }
                const shape = subArgs[0].toLowerCase();
                const centerX = parseFloat(subArgs[1]);
                const centerZ = parseFloat(subArgs[2]);
                const size = parseFloat(subArgs[3]);
                dimParseResult = parseDimensionArgument(subArgs[4], player, dependencies);

                if (dimParseResult.error) {
                    player.sendMessage(dimParseResult.error); return;
                }
                dimensionId = dimParseResult.dimensionId;
                dimensionName = dimParseResult.dimensionName;

                if (shape !== 'square' && shape !== 'circle') {
                    player.sendMessage(getString('command.worldborder.set.invalidShape')); return;
                }
                if (isNaN(centerX) || isNaN(centerZ) || isNaN(size)) {
                    player.sendMessage(getString('command.worldborder.set.invalidNumbers')); return;
                }
                if (size <= 0) {
                    player.sendMessage(getString('command.worldborder.set.sizePositive')); return;
                }

                const newSettings = {
                    dimensionId: dimensionId,
                    enabled: true,
                    shape: shape,
                    centerX: centerX,
                    centerZ: centerZ,
                    ...(wbManager.getBorderSettings(dimensionId, dependencies) || {}),
                    isResizing: false,
                };
                if (shape === 'square') {
                    newSettings.halfSize = size;
                }
                else {
                    newSettings.radius = size;
                }

                success = await wbManager.saveBorderSettings(dimensionId, newSettings, dependencies); // Set success
                if (success) {
                    let message = getString('command.worldborder.set.successHeader', { dimensionName: dimensionName }) + '\n';
                    const sizeDisplay = shape === 'square' ? `${size} (Diameter: ${size * 2})` : `${size}`;
                    message += getString('command.worldborder.set.successDetails', { shape: shape, centerX: centerX.toString(), centerZ: centerZ.toString(), sizeDisplay: sizeDisplay }) + '\n';
                    const damageStatus = newSettings.enableDamage
                        ? getString('command.worldborder.set.damage.on', { damageAmount: (newSettings.damageAmount ?? DEFAULT_WB_DAMAGE_AMOUNT).toString(), damageIntervalTicks: (newSettings.damageIntervalTicks ?? DEFAULT_WB_DAMAGE_INTERVAL_TICKS).toString(), teleportAfterNumDamageEvents: (newSettings.teleportAfterNumDamageEvents ?? DEFAULT_WB_TELEPORT_AFTER_DAMAGE_EVENTS).toString() })
                        : getString('command.worldborder.set.damage.off');
                    message += getString('command.worldborder.set.successDamage', { damageStatus: damageStatus });
                    if (newSettings.wasResizing) {
                        message += '\n' + getString('command.worldborder.set.resizeCancelled');
                    }

                    player.sendMessage(message);
                    logManager?.addLog({ adminName, actionType: 'worldBorderSet', targetName: dimensionName, details: `Set to ${shape}, C:(${centerX},${centerZ}), Size:${size}` }, dependencies);
                }
                else {
                    player.sendMessage(getString('command.worldborder.set.failSave'));
                }
                break;
            }
            case 'get': {
                dimParseResult = parseDimensionArgument(subArgs[0], player, dependencies);
                if (dimParseResult.error) {
                    player.sendMessage(dimParseResult.error); return;
                }
                dimensionId = dimParseResult.dimensionId;
                dimensionName = dimParseResult.dimensionName;

                borderSettings = wbManager.getBorderSettings(dimensionId, dependencies);
                if (!borderSettings || !borderSettings.enabled) {
                    player.sendMessage(getString('command.worldborder.get.noBorder', { dimensionName: dimensionName, prefix: prefix }));
                    return;
                }
                let getMsg = getString('command.worldborder.get.header', { dimensionName: dimensionName }) + '\n';
                getMsg += getString('command.worldborder.get.enabled', { status: borderSettings.enabled ? getString('common.boolean.yes') : getString('common.boolean.no') }) + '\n';
                getMsg += getString('command.worldborder.get.shape', { shape: borderSettings.shape }) + '\n';
                getMsg += getString('command.worldborder.get.center', { centerX: borderSettings.centerX.toString(), centerZ: borderSettings.centerZ.toString() }) + '\n';
                if (borderSettings.shape === 'square') {
                    const diameter = (borderSettings.halfSize ?? 0) * 2;
                    getMsg += getString('command.worldborder.get.square.halfSize', { halfSize: (borderSettings.halfSize ?? 0).toString(), diameter: diameter.toString() }) + '\n';
                    const minX = borderSettings.centerX - (borderSettings.halfSize ?? 0);
                    const maxX = borderSettings.centerX + (borderSettings.halfSize ?? 0);
                    const minZ = borderSettings.centerZ - (borderSettings.halfSize ?? 0);
                    const maxZ = borderSettings.centerZ + (borderSettings.halfSize ?? 0);
                    getMsg += getString('command.worldborder.get.square.bounds', { minX: minX.toString(), maxX: maxX.toString(), minZ: minZ.toString(), maxZ: maxZ.toString() }) + '\n';
                }
                else {
                    getMsg += getString('command.worldborder.get.circle.radius', { radius: (borderSettings.radius ?? 0).toString() }) + '\n';
                }
                player.sendMessage(getMsg.trim());
                break;
            }
            case 'toggle': {
                if (subArgs.length < 1) {
                    player.sendMessage(getString('command.worldborder.toggle.usage', { prefix: prefix })); return;
                }
                const toggleState = subArgs[0].toLowerCase();
                dimParseResult = parseDimensionArgument(subArgs[1], player, dependencies);

                if (dimParseResult.error) {
                    player.sendMessage(dimParseResult.error); return;
                }
                dimensionId = dimParseResult.dimensionId;
                dimensionName = dimParseResult.dimensionName;

                if (toggleState !== 'on' && toggleState !== 'off') {
                    player.sendMessage(getString('command.worldborder.toggle.invalidState')); return;
                }

                borderSettings = wbManager.getBorderSettings(dimensionId, dependencies);
                if (!borderSettings) {
                    player.sendMessage(getString('command.worldborder.toggle.noBorder', { dimensionName: dimensionName })); return;
                }

                const newState = toggleState === 'on';
                if (borderSettings.enabled === newState) {
                    player.sendMessage(getString('command.worldborder.toggle.alreadyState', { dimensionName: dimensionName, state: toggleState }));
                    return;
                }
                borderSettings.enabled = newState;
                let resizeCancelledMessage = '';
                if (!newState && borderSettings.isResizing) {
                    borderSettings.isResizing = false;
                    resizeCancelledMessage = ' ' + getString('command.worldborder.set.resizeCancelled');
                }

                success = await wbManager.saveBorderSettings(dimensionId, borderSettings, dependencies); // Set success
                if (success) {
                    player.sendMessage(getString('command.worldborder.toggle.success', { dimensionName: dimensionName, state: toggleState, resizeCancelledMessage: resizeCancelledMessage }));
                    logManager?.addLog({ adminName, actionType: newState ? 'worldBorderEnabled' : 'worldBorderDisabled', targetName: dimensionName, details: `Border ${toggleState}` }, dependencies);
                }
                else {
                    player.sendMessage(getString('command.worldborder.toggle.fail'));
                }
                break;
            }
            case 'remove': {
                const confirmArg = subArgs[subArgs.length - 1]?.toLowerCase();
                const dimArgIndex = subArgs.length > 1 ? 0 : -1;
                dimParseResult = parseDimensionArgument(dimArgIndex !== -1 ? subArgs[dimArgIndex] : undefined, player, dependencies);

                if (dimParseResult.error) {
                    player.sendMessage(dimParseResult.error); return;
                }
                dimensionId = dimParseResult.dimensionId;
                dimensionName = dimParseResult.dimensionName;

                if (confirmArg !== 'confirm') {
                    const dimDisplay = dimensionId === player.dimension.id ? getString('command.worldborder.remove.confirmNeeded.currentDimension', { dimensionName: dimensionName }) : dimensionName;
                    player.sendMessage(getString('command.worldborder.remove.confirmNeeded', { dimensionDisplayName: dimDisplay, confirmCommand: `${prefix}wb remove ${dimensionId === player.dimension.id ? '' : dimensionName + ' '}confirm` }));
                    return;
                }
                success = await wbManager.clearBorderSettings(dimensionId, dependencies); // Set success
                if (success) {
                    player.sendMessage(getString('command.worldborder.remove.success', { dimensionName: dimensionName, resizeCancelledMessage: ' Any active resize was also cancelled.' }));
                    logManager?.addLog({ adminName, actionType: 'worldBorderRemoved', targetName: dimensionName, details: 'Border removed' }, dependencies);
                }
                else {
                    player.sendMessage(getString('command.worldborder.remove.fail', { dimensionName: dimensionName }));
                }
                break;
            }
            default:
                player.sendMessage(getString('command.worldborder.invalidSubcommand', { subCommand: subCommand, prefix: prefix }));
                break;
        }
        if (success || ['get', 'status', 'help'].includes(subCommand)) {
            playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
        }
        else if (!['get', 'status', 'help'].includes(subCommand)) {
            playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
        }

    }
    catch (error) {
        player.sendMessage(getString('common.error.genericCommandError', { commandName: `${mainCommand} ${subCommand}`, errorMessage: error.message }));
        console.error(`[WorldBorderCommand CRITICAL] Error for ${adminName} command '${mainCommand} ${subCommand}': ${error.stack || error}`);
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
        logManager?.addLog({
            adminName: adminName,
            actionType: 'errorWorldBorderCommand',
            context: `WorldBorderCommand.execute.${subCommand}`,
            details: `Execution error: ${error.message}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
