/**
 * @file Manages the registration, parsing, and execution of chat-based commands.
 * @module AntiCheatsBP/scripts/core/commandManager
 */
import { commandAliases } from '../config.js';
import { loadCommand } from './dynamicCommandLoader.js';
import { log, logError } from '../utils/playerUtils.js';
import { CommandError } from '../types.js';

/** @type {Map<string, string>} */
export const commandFilePaths = new Map();

/** @type {Map<string, import('../types.js').CommandDefinition>} */
export const commandDefinitionMap = new Map();

/** @type {Map<string, import('../types.js').CommandExecuteFunction>} */
export const commandExecutionMap = new Map();

// Import all command modules, where each key is the module name (e.g., 'ban', 'kick')
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

/**
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


/**
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
        log('[CommandManager.handleChatCommand] Invalid player object in eventData.');
        eventData.cancel = true;
        return;
    }

    if (!config?.prefix || !message.startsWith(config.prefix)) {
        return;
    }

    eventData.cancel = true;

    const args = message.substring(config.prefix.length).trim().split(/\s+/);
    const commandNameInput = args.shift()?.toLowerCase();

    debugLog(`[CommandManager.handleChatCommand] Player ${playerName} command attempt: '${commandNameInput || ''}', Args: [${args.join(', ')}]`, getPlayerData(player.id)?.isWatched ? playerName : null, dependencies);

    if (!commandNameInput) {
        player?.sendMessage(getString('command.error.noCommandEntered', { prefix: config.prefix }));
        return;
    }

    const resolvedCommandName = aliasToCommandMap.get(commandNameInput) || commandNameInput;

    let commandDef = commandDefinitionMap.get(resolvedCommandName);
    let commandExecute = commandExecutionMap.get(resolvedCommandName);

    if (!commandDef || !commandExecute) {
        debugLog(`[CommandManager.handleChatCommand] Command '${resolvedCommandName}' not in cache. Loading dynamically.`, getPlayerData(player.id)?.isWatched ? playerName : null, dependencies);
        const commandModule = await loadCommand(resolvedCommandName, dependencies);
        if (!commandModule) {
            player?.sendMessage(getString('command.error.unknownCommand', { prefix: config.prefix, commandName: commandNameInput }));
            debugLog(`[CommandManager.handleChatCommand] Failed to load module for command '${resolvedCommandName}'.`, playerName, dependencies);
            return;
        }
        commandDef = commandModule.definition;
        commandExecute = commandModule.execute;

        if (commandDef && commandExecute) {
            commandDefinitionMap.set(resolvedCommandName, commandDef);
            commandExecutionMap.set(resolvedCommandName, commandExecute);
        }
    } else {
        debugLog(`[CommandManager.handleChatCommand] Loaded command '${resolvedCommandName}' from cache.`, getPlayerData(player.id)?.isWatched ? playerName : null, dependencies);
    }

    if (!isCommandEnabled(resolvedCommandName, commandDef, config)) {
        player?.sendMessage(getString('command.error.disabled', { commandName: resolvedCommandName }));
        debugLog(`[CommandManager.handleChatCommand] Command '${resolvedCommandName}' is disabled. Access denied for ${playerName}.`, playerName, dependencies);
        return;
    }

    const userPermissionLevel = getPlayerPermissionLevel(player, dependencies);
    if (typeof userPermissionLevel !== 'number' || userPermissionLevel > commandDef.permissionLevel) {
        warnPlayer(player, getString('common.error.permissionDenied'), dependencies);
        debugLog(`[CommandManager.handleChatCommand] Command '${commandDef.name}' denied for ${playerName}. Required: ${commandDef.permissionLevel}, Player has: ${userPermissionLevel ?? 'N/A'}`, playerName, dependencies);
        return;
    }

    if (dependencies.permissionLevels?.admin !== undefined && userPermissionLevel <= dependencies.permissionLevels.admin) {
        addLog({
            actionType: 'info.command.admin',
            targetName: playerName,
            targetId: player.id,
            context: 'commandManager.handleChatCommand',
            details: { command: resolvedCommandName, args: args.join(' '), fullMessage: message, permissionLevel: userPermissionLevel },
        }, dependencies);
    }

    try {
        debugLog(`[CommandManager.handleChatCommand] Executing '${resolvedCommandName}' for ${playerName}.`, getPlayerData(player.id)?.isWatched ? playerName : null, dependencies);
        await commandExecute(player, args, dependencies);
        playSoundForEvent(player, 'commandSuccess', dependencies);
    } catch (error) {
        if (error instanceof CommandError) {
            player?.sendMessage(error.message);
        } else {
            player?.sendMessage(getString('command.error.executionFailed', { commandName: resolvedCommandName }));
        }

        const errorMessage = error?.message || String(error);
        const errorStack = error?.stack || 'N/A';
        logError(`[CommandManager.handleChatCommand CRITICAL] Error executing ${resolvedCommandName} for ${playerName}: ${errorStack}`, error);
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
