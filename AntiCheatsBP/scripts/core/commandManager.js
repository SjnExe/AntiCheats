/**
 * @file Manages the registration, parsing, and execution of chat-based commands.
 * @module AntiCheatsBP/scripts/core/commandManager
 */
import { commandAliases } from '../config.js';
import { loadCommand } from './dynamicCommandLoader.js';
import { CommandError } from '../types.js';

/** @type {Map<string, string>} */
export const commandFilePaths = new Map();

/** @type {Map<string, import('../types.js').CommandDefinition>} */
export const commandDefinitionMap = new Map();

/** @type {Map<string, import('../types.js').CommandExecuteFunction>} */
export const commandExecutionMap = new Map();

import * as commandModules from '../commands/index.js';

/**
 * Dynamically discovers and registers command files.
 */
function discoverCommands() {
    commandFilePaths.clear();
    for (const moduleName in commandModules) {
        const cmdModule = commandModules[moduleName];
        if (cmdModule?.definition?.name) {
            const commandName = cmdModule.definition.name.toLowerCase();
            // The key in commandFilePaths should be the command name, and the value should be the path.
            // However, dynamic import paths need to be relative to the importing file.
            // Since we are now importing from an index, the path needs to be adjusted.
            // Let's assume the moduleName is the file name without the .js extension.
            commandFilePaths.set(commandName, `../commands/${moduleName}.js`);
        }
    }
}

/**
 * Initializes the command manager.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export function initializeCommands(dependencies) {
    const { playerUtils } = dependencies;
    const { debugLog } = playerUtils;

    discoverCommands();
    commandDefinitionMap.clear();
    commandExecutionMap.clear();

    // Set the alias map from the command registry
    dependencies.aliasToCommandMap = new Map(commandAliases);

    debugLog(`[CommandManager.initializeCommands] Command system initialized. ${commandFilePaths.size} commands available, ${dependencies.aliasToCommandMap.size} aliases registered.`, null, dependencies);
}


/**
 * Handles incoming chat messages to check for and execute commands.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export async function handleChatCommand(eventData, dependencies) {
    const { sender: player, message } = eventData;
    const { config, playerUtils, playerDataManager, logManager, rankManager, aliasToCommandMap } = dependencies;
    const { debugLog, getString, warnPlayer, playSoundForEvent } = playerUtils;
    const { getPlayerData } = playerDataManager;
    const { addLog } = logManager;
    const { getPlayerPermissionLevel } = rankManager;

    const playerName = player?.name ?? 'UnknownPlayer';
    if (!player?.isValid()) {
        console.warn('[CommandManager.handleChatCommand] Invalid player object in eventData.');
        eventData.cancel = true;
        return;
    }

    if (!config?.prefix || !message.startsWith(config.prefix)) {
        return; // Not a command
    }

    eventData.cancel = true; // Cancel the original chat message

    const args = message.substring(config.prefix.length).trim().split(/\s+/);
    const commandNameInput = args.shift()?.toLowerCase();
    const senderPDataForLog = getPlayerData(player.id);

    debugLog(`[CommandManager.handleChatCommand] Player ${playerName} command attempt: '${commandNameInput || ''}', Args: [${args.join(', ')}]`, senderPDataForLog?.isWatched ? playerName : null, dependencies);

    if (!commandNameInput) {
        player?.sendMessage(getString('command.error.noCommandEntered', { prefix: config.prefix }));
        return;
    }

    // Resolve alias or use the input name
    const resolvedCommandName = aliasToCommandMap.get(commandNameInput) || commandNameInput;

    // Dynamically load the command
    const commandModule = await loadCommand(resolvedCommandName, dependencies);
    if (!commandModule) {
        player?.sendMessage(getString('command.error.unknownCommand', { prefix: config.prefix, commandName: commandNameInput }));
        debugLog(`[CommandManager.handleChatCommand] Failed to load module for command '${resolvedCommandName}'.`, playerName, dependencies);
        return;
    }

    const { definition: commandDef, execute: commandExecute } = commandModule;

    // Check if the command is enabled
    if (!isCommandEnabled(resolvedCommandName, commandDef, config)) {
        player?.sendMessage(getString('command.error.disabled', { commandName: resolvedCommandName }));
        debugLog(`[CommandManager.handleChatCommand] Command '${resolvedCommandName}' is disabled. Access denied for ${playerName}.`, playerName, dependencies);
        return;
    }

    // Check permission level
    const userPermissionLevel = getPlayerPermissionLevel(player, dependencies);
    if (typeof userPermissionLevel !== 'number' || userPermissionLevel > commandDef.permissionLevel) {
        warnPlayer(player, getString('common.error.permissionDenied'), dependencies);
        debugLog(`[CommandManager.handleChatCommand] Command '${commandDef.name}' denied for ${playerName}. Required: ${commandDef.permissionLevel}, Player has: ${userPermissionLevel ?? 'N/A'}`, playerName, dependencies);
        return;
    }

    // Log admin command usage
    if (dependencies.permissionLevels?.admin !== undefined && userPermissionLevel <= dependencies.permissionLevels.admin) {
        const timestamp = new Date().toISOString();
        const logMessage = `[AdminCommandLog] ${timestamp} - Player: ${playerName} (Perm: ${userPermissionLevel}) - Command: ${message}`;
        console.warn(logMessage);
        addLog({
            actionType: 'info.command.admin',
            targetName: playerName,
            targetId: player.id,
            context: 'commandManager.handleChatCommand',
            details: { command: resolvedCommandName, fullMessage: message, permissionLevel: userPermissionLevel }
        }, dependencies);
    }

    // Execute the command
    try {
        await commandExecute(player, args, dependencies);
        debugLog(`[CommandManager.handleChatCommand] Successfully executed '${resolvedCommandName}' for ${playerName}.`, senderPDataForLog?.isWatched ? playerName : null, dependencies);
        playSoundForEvent(player, 'commandSuccess', dependencies);
    } catch (error) {
        if (error instanceof CommandError) {
            player?.sendMessage(error.message);
        } else {
            player?.sendMessage(getString('command.error.executionFailed', { commandName: resolvedCommandName }));
        }

        const errorMessage = error?.message || String(error);
        const errorStack = error?.stack || 'N/A';
        console.error(`[CommandManager.handleChatCommand CRITICAL] Error executing ${resolvedCommandName} for ${playerName}: ${errorStack}`);
        addLog({
            actionType: 'error.cmd.exec',
            targetName: playerName,
            targetId: player.id,
            context: `commandManager.handleChatCommand.${resolvedCommandName}`,
            details: { errorCode: 'CMD_EXEC_FAIL', message: errorMessage, rawErrorStack: errorStack, meta: { command: resolvedCommandName, args: args.join(', ') } },
        }, dependencies);
        playSoundForEvent(player, 'commandError', dependencies);
    }
}

/**
 * Checks if a command is enabled.
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
 * Gets a list of all registered command names.
 * @returns {string[]} An array of command names.
 */
export function getAllRegisteredCommandNames() {
    return Array.from(commandFilePaths.keys());
}
