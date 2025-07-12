/**
 * @file Manages the registration, parsing, and execution of chat-based commands for the AntiCheat system.
 * @module AntiCheatsBP/scripts/core/commandManager
 * It dynamically loads command modules and handles permission checking and alias resolution.
 * All command names and aliases are treated as case-insensitive (converted to lowerCase).
 */
import { commandModules } from './commandRegistry.js';

export const commandDefinitionMap = new Map();
export const commandExecutionMap = new Map();

export function initializeCommands(dependencies) {
    const { playerUtils } = dependencies;
    const { debugLog } = playerUtils;
    commandDefinitionMap.clear();
    commandExecutionMap.clear();
    dependencies.aliasToCommandMap = new Map();

    if (!Array.isArray(commandModules)) {
        console.error('[CommandManager.initializeCommands CRITICAL] commandModules is not an array or is undefined. No commands loaded.');
        return;
    }

    for (const cmdModule of commandModules) {
        if (cmdModule?.definition?.name && typeof cmdModule.definition.name === 'string' && typeof cmdModule.execute === 'function') {
            const cmdNameLower = cmdModule.definition.name.toLowerCase();

            if (commandDefinitionMap.has(cmdNameLower)) {
                debugLog(`[CommandManager.initializeCommands WARNING] Duplicate main command name detected and overwritten: ${cmdNameLower}`, null, dependencies);
            }
            commandDefinitionMap.set(cmdNameLower, cmdModule.definition);
            commandExecutionMap.set(cmdNameLower, cmdModule.execute);

            if (Array.isArray(cmdModule.definition.aliases)) {
                cmdModule.definition.aliases.forEach(alias => {
                    const aliasLower = alias.toLowerCase();
                    if (commandDefinitionMap.has(aliasLower)) {
                        debugLog(`[CommandManager.initializeCommands WARNING] Alias '${aliasLower}' for command '${cmdNameLower}' conflicts with an existing main command name. Alias NOT registered.`, null, dependencies);
                    } else if (dependencies.aliasToCommandMap.has(aliasLower)) {
                        const existingCmd = dependencies.aliasToCommandMap.get(aliasLower);
                        debugLog(`[CommandManager.initializeCommands WARNING] Alias '${aliasLower}' for command '${cmdNameLower}' is already an alias for command '${existingCmd}'. Alias NOT registered for '${cmdNameLower}'.`, null, dependencies);
                    } else {
                        dependencies.aliasToCommandMap.set(aliasLower, cmdNameLower);
                    }
                });
            }
        } else {
            debugLog(`[CommandManager.initializeCommands WARNING] Invalid command module structure encountered. Module: ${JSON.stringify(cmdModule)}`, null, dependencies);
        }
    }
    debugLog(`[CommandManager.initializeCommands] Initialized/Reloaded ${commandDefinitionMap.size} command definitions and ${dependencies.aliasToCommandMap.size} aliases.`, null, dependencies);
}

export function registerCommandInternal(commandModule, dependencies) {
    const { debugLog } = dependencies.playerUtils;
    debugLog('[CommandManager.registerCommandInternal] Stub function. Dynamic registration not fully implemented. Please use commandRegistry.js and reload.', null, dependencies);
}

export function unregisterCommandInternal(commandName, dependencies) {
    const { debugLog } = dependencies.playerUtils;
    debugLog('[CommandManager.unregisterCommandInternal] Stub function. Dynamic unregistration not fully implemented. Please modify commandRegistry.js and reload.', null, dependencies);
}

(() => {
    const initialLoadDeps = { playerUtils: { debugLog: (msg) => console.log(`[CommandManagerInitialLoad] ${msg}`) }};
    try {
        initializeCommands(initialLoadDeps);
    } catch (e) {
        console.error(`[CommandManagerInitialLoad CRITICAL] Error during initial command loading: ${e.stack || e}`);
    }
})();

export async function handleChatCommand(eventData, dependencies) {
    const { sender: player, message } = eventData;
    const { config, playerUtils, playerDataManager, logManager, permissionLevels, rankManager } = dependencies;
    const { debugLog, getString, warnPlayer, playSoundForEvent } = playerUtils;
    const { getPlayerData } = playerDataManager;
    const { addLog } = logManager;
    const { getPlayerPermissionLevel } = rankManager;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        console.warn('[CommandManager.handleChatCommand] Invalid player object in eventData.');
        eventData.cancel = true;
        return;
    }

    if (!config?.prefix) {
        console.error('[CommandManager.handleChatCommand CRITICAL] Command prefix is not configured.');
        debugLog(`[CommandManager.handleChatCommand] Prefix not configured. Message from ${playerName} not treated as command.`, playerName, dependencies);
        return;
    }

    const args = message.substring(config.prefix.length).trim().split(/\s+/);
    const commandNameInput = args.shift()?.toLowerCase();

    const senderPDataForLog = getPlayerData(player.id);
    debugLog(`[CommandManager.handleChatCommand] Player ${playerName} command attempt: '${commandNameInput || ''}', Args: [${args.join(', ')}]`, senderPDataForLog?.isWatched ? playerName : null, dependencies);

    if (!commandNameInput) {
        player?.sendMessage(getString('command.error.noCommandEntered', { prefix: config.prefix }));
        eventData.cancel = true;
        return;
    }

    const aliasTargetCommand = dependencies.aliasToCommandMap?.get(commandNameInput);
    const finalCommandName = aliasTargetCommand || commandNameInput;

    if (aliasTargetCommand) {
        debugLog(`[CommandManager.handleChatCommand] Alias '${commandNameInput}' for ${playerName} resolved to main command '${finalCommandName}'.`, playerName, dependencies);
    }

    const commandDef = dependencies.commandDefinitionMap?.get(finalCommandName);
    const commandExecute = dependencies.commandExecutionMap?.get(finalCommandName);

    if (!commandDef || !commandExecute) {
        player?.sendMessage(getString('command.error.unknownCommand', { prefix: config.prefix, commandName: finalCommandName }));
        eventData.cancel = true;
        return;
    }

    let isEffectivelyEnabled = commandDef.enabled !== false;
    if (config?.commandSettings?.[finalCommandName] && typeof config.commandSettings[finalCommandName].enabled === 'boolean') {
        isEffectivelyEnabled = config.commandSettings[finalCommandName].enabled;
    }

    if (!isEffectivelyEnabled) {
        player?.sendMessage(getString('command.error.unknownCommand', { prefix: config.prefix, commandName: finalCommandName }));
        eventData.cancel = true;
        debugLog(`[CommandManager.handleChatCommand] Command '${finalCommandName}' is disabled. Access denied for ${playerName}.`, playerName, dependencies);
        return;
    }

    const userPermissionLevel = getPlayerPermissionLevel(player, dependencies);
    if (typeof userPermissionLevel !== 'number' || userPermissionLevel > commandDef.permissionLevel) {
        warnPlayer(player, getString('common.error.permissionDenied'), dependencies);
        debugLog(`[CommandManager.handleChatCommand] Command '${commandDef.name}' denied for ${playerName}. Required: ${commandDef.permissionLevel}, Player has: ${userPermissionLevel ?? 'N/A'}`, playerName, dependencies);
        eventData.cancel = true;
        return;
    }

    eventData.cancel = true;

    if (permissionLevels?.admin !== undefined && userPermissionLevel <= permissionLevels.admin) {
        const timestamp = new Date().toISOString();
        console.warn(`[AdminCommandLog] ${timestamp} - Player: ${playerName} (Perm: ${userPermissionLevel}) - Command: ${message}`);
        if (senderPDataForLog?.isWatched) {
            debugLog(`[CommandManager.handleChatCommand] Watched admin ${playerName} is executing command: ${message}`, playerName, dependencies);
        }
    }

    try {
        await commandExecute(player, args, dependencies);
        debugLog(`[CommandManager.handleChatCommand] Successfully executed '${finalCommandName}' for ${playerName}.`, senderPDataForLog?.isWatched ? playerName : null, dependencies);
        playSoundForEvent(player, 'commandSuccess', dependencies);
    } catch (error) {
        player?.sendMessage(getString('command.error.executionFailed', { commandName: finalCommandName }));
        const errorMessage = error?.message || String(error);
        const errorStack = error?.stack || 'N/A';
        console.error(`[CommandManager.handleChatCommand CRITICAL] Error executing ${finalCommandName} for ${playerName}: ${errorStack}`);
        addLog({
            actionType: 'error.cmd.exec',
            targetName: playerName,
            targetId: player.id,
            context: `commandManager.handleChatCommand.${finalCommandName}`,
            details: { errorCode: 'CMD_EXEC_FAIL', message: errorMessage, rawErrorStack: errorStack, meta: { command: finalCommandName, args: args.join(', ') }},
        }, dependencies);
        playSoundForEvent(player, 'commandError', dependencies);
    }
}

export function getAllRegisteredCommandNames() {
    return Array.from(commandDefinitionMap.keys());
}
