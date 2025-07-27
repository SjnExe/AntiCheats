import { commandAliases } from '../config.js';
import { loadCommand } from './dynamicCommandLoader.js';
import { logError } from '../utils/playerUtils.js';
import { CommandError } from '../types.js';

export const commandFilePaths = new Map();
export const commandDefinitionMap = new Map();
export const commandExecutionMap = new Map();

import * as commandFiles from '../commands/index.js';

function discoverCommands() {
    commandFilePaths.clear();
    for (const moduleKey in commandFiles) {
        const cmdModule = commandFiles[moduleKey];
        if (cmdModule?.definition?.name) {
            const commandName = cmdModule.definition.name.toLowerCase();
            const filePath = `../commands/${moduleKey}.js`;
            commandFilePaths.set(commandName, filePath);
        }
    }
}

export function initializeCommands(dependencies) {
    const { playerUtils } = dependencies;
    const { debugLog } = playerUtils;

    discoverCommands();
    commandDefinitionMap.clear();
    commandExecutionMap.clear();

    dependencies.aliasToCommandMap = new Map(commandAliases);

    debugLog(`[CommandManager.initializeCommands] Command system initialized. ${commandFilePaths.size} commands available, ${dependencies.aliasToCommandMap.size} aliases registered.`, null, dependencies);
}

async function getCommand(commandName, dependencies) {
    let commandDef = commandDefinitionMap.get(commandName);
    let commandExecute = commandExecutionMap.get(commandName);

    if (!commandDef || !commandExecute) {
        const commandModule = await loadCommand(commandName, dependencies);
        if (commandModule) {
            commandDef = commandModule.definition;
            commandExecute = commandModule.execute;
            commandDefinitionMap.set(commandName, commandDef);
            commandExecutionMap.set(commandName, commandExecute);
        }
    }

    return { commandDef, commandExecute };
}

async function executeCommand(player, commandDef, commandExecute, args, dependencies) {
    const { playerUtils, logManager } = dependencies;
    const { debugLog, getString, playSoundForEvent } = playerUtils;
    const { addLog } = logManager;
    const playerName = player.name;

    try {
        debugLog(`[CommandManager.executeCommand] Executing '${commandDef.name}' for ${playerName}.`, null, dependencies);
        await commandExecute(player, args, dependencies);
        playSoundForEvent(player, 'commandSuccess', dependencies);
    } catch (error) {
        if (error instanceof CommandError) {
            player?.sendMessage(error.message);
        } else {
            player?.sendMessage(getString('command.error.executionFailed', { commandName: commandDef.name }));
        }

        const errorMessage = error?.message || String(error);
        const errorStack = error?.stack || 'N/A';
        logError(`[CommandManager.executeCommand CRITICAL] Error executing ${commandDef.name} for ${playerName}: ${errorStack}`, error);
        addLog({
            actionType: 'error.cmd.exec',
            targetName: playerName,
            targetId: player.id,
            context: `commandManager.executeCommand.${commandDef.name}`,
            details: { errorCode: 'CMD_EXEC_FAIL', message: errorMessage, rawErrorStack: errorStack, meta: { command: commandDef.name, args: args.join(', ') } },
        }, dependencies);
        playSoundForEvent(player, 'commandError', dependencies);
    }
}

export async function handleChatCommand(eventData, dependencies) {
    const { sender: player, message } = eventData;
    const { config, playerUtils, rankManager, aliasToCommandMap } = dependencies;
    const { getString, warnPlayer } = playerUtils;
    const { getPlayerPermissionLevel } = rankManager;

    if (!player?.isValid() || !config?.prefix || !message.startsWith(config.prefix)) {
        return;
    }

    eventData.cancel = true;

    const args = message.substring(config.prefix.length).trim().split(/\s+/);
    const commandNameInput = args.shift()?.toLowerCase();

    if (!commandNameInput) {
        player?.sendMessage(getString('command.error.noCommandEntered', { prefix: config.prefix }));
        return;
    }

    const resolvedCommandName = aliasToCommandMap.get(commandNameInput) || commandNameInput;
    const { commandDef, commandExecute } = await getCommand(resolvedCommandName, dependencies);

    if (!commandDef || !commandExecute) {
        player?.sendMessage(getString('command.error.unknownCommand', { prefix: config.prefix, commandName: commandNameInput }));
        return;
    }

    if (!isCommandEnabled(resolvedCommandName, commandDef, config)) {
        player?.sendMessage(getString('command.error.disabled', { commandName: resolvedCommandName }));
        return;
    }

    const userPermissionLevel = getPlayerPermissionLevel(player, dependencies);
    if (typeof userPermissionLevel !== 'number' || userPermissionLevel > commandDef.permissionLevel) {
        warnPlayer(player, getString('common.error.permissionDenied'), dependencies);
        return;
    }

    await executeCommand(player, commandDef, commandExecute, args, dependencies);
}

/**
 * @param {string} commandName The name of the command.
 * @param {import('../types.js').CommandDefinition} commandDef The command's definition.
 * @param {import('../types.js').Config} config The system's configuration.
 * @returns {boolean} True if the command is enabled, false otherwise.
 */
function isCommandEnabled(commandName, commandDef, config) {
    const commandConfig = config?.commandSettings?.[commandName];
    if (typeof commandConfig?.enabled === 'boolean') {
        return commandConfig.enabled;
    }
    return commandDef.enabled !== false;
}

/**
 * @returns {string[]} An array of command names.
 */
export function getAllRegisteredCommandNames() {
    return Array.from(commandFilePaths.keys());
}
