import { commandAliases } from '../config.js';
import { loadCommand } from './dynamicCommandLoader.js';
import { logError } from '../modules/utils/playerUtils.js';
import { CommandError } from '../types.js';

/** @type {Map<string, string>} Maps command names to their file paths for dynamic loading. */
export const commandFilePaths = new Map();
/** @type {Map<string, import('../types.js').CommandDefinition>} Maps command names to their definitions. */
export const commandDefinitionMap = new Map();
/** @type {Map<string, import('../types.js').CommandExecuteFunction>} Maps command names to their execution functions. */
export const commandExecutionMap = new Map();

import * as commandFiles from '../modules/commands/index.js';

function discoverCommands() {
    commandFilePaths.clear();
    for (const moduleKey in commandFiles) {
        const cmdModule = commandFiles[moduleKey];
        if (cmdModule?.definition?.name) {
            const commandName = cmdModule.definition.name.toLowerCase();
            const filePath = `../modules/commands/${moduleKey}.js`;
            commandFilePaths.set(commandName, filePath);
        }
    }
}

/**
 * Initializes the command system by discovering commands and setting up alias maps.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
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

/**
 * Handles an incoming chat message to check for and execute a command.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
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

    if (!isCommandEnabled(resolvedCommandName, config)) {
        player?.sendMessage(getString('command.error.unknownCommand', { prefix: config.prefix, commandName: commandNameInput }));
        return;
    }

    const userPermissionLevel = getPlayerPermissionLevel(player, dependencies);
    const requiredPermissionLevel = commandDef.permissionLevel ?? 0; // Default to the highest permission level (owner)

    if (userPermissionLevel > requiredPermissionLevel) {
        warnPlayer(player, getString('common.error.permissionDenied'), dependencies);
        return;
    }

    await executeCommand(player, commandDef, commandExecute, args, dependencies);
}

function isCommandEnabled(commandName, config) {
    const commandConfig = config?.commandSettings?.[commandName];
    // The single source of truth is now the config. Default to false if not specified.
    return commandConfig?.enabled ?? false;
}

/** @returns {string[]} */
export function getAllRegisteredCommandNames() {
    return Array.from(commandFilePaths.keys());
}
