/**
 * @file Manages the registration, parsing, and execution of chat-based commands for the AntiCheat system.
 * It dynamically loads command modules and handles permission checking and alias resolution.
 */
import { commandModules } from '../commands/commandRegistry.js';

/**
 * @description Stores all command definitions, mapping command name to its definition object.
 * Populated dynamically from `commandModules`.
 * @type {Map<string, import('../types.js').CommandDefinition>}
 */
export const commandDefinitionMap = new Map();

/**
 * @description Stores all command execution functions, mapping command name to its execute function.
 * Populated dynamically from `commandModules`.
 * @type {Map<string, Function>}
 */
export const commandExecutionMap = new Map();

/**
 * Loads or reloads command definitions and execution functions from the commandRegistry.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies, used for logging.
 */
export function initializeCommands(dependencies) {
    const { playerUtils } = dependencies;
    commandDefinitionMap.clear();
    commandExecutionMap.clear();

    if (Array.isArray(commandModules)) {
        for (const cmdModule of commandModules) {
            if (cmdModule?.definition?.name && typeof cmdModule.definition.name === 'string' && typeof cmdModule.execute === 'function') {
                const cmdName = cmdModule.definition.name.toLowerCase();
                if (commandDefinitionMap.has(cmdName)) {
                    playerUtils.debugLog(`[CommandManager] Duplicate command name detected and overwritten during init: ${cmdName}`, null, dependencies);
                }
                commandDefinitionMap.set(cmdName, cmdModule.definition);
                commandExecutionMap.set(cmdName, cmdModule.execute);

                if (Array.isArray(cmdModule.definition.aliases)) {
                    cmdModule.definition.aliases.forEach(alias => {
                        const aliasLower = alias.toLowerCase();
                        if (commandDefinitionMap.has(aliasLower) || commandExecutionMap.has(aliasLower)) {
                            playerUtils.debugLog(`[CommandManager] Alias '${aliasLower}' for command '${cmdName}' conflicts with an existing command or alias. Skipping this alias definition.`, null, dependencies);
                        } else {
                            // Primary alias handling is via config.commandAliases. This note is for direct definitions.
                            playerUtils.debugLog(`[CommandManager] Command '${cmdName}' also defines alias '${aliasLower}' directly. Note: Primary alias resolution uses config.commandAliases.`, null, dependencies);
                        }
                    });
                }
            } else {
                playerUtils.debugLog(`[CommandManager] Invalid command module structure encountered during init. Module: ${JSON.stringify(cmdModule)}`, null, dependencies);
            }
        }
        playerUtils.debugLog(`[CommandManager] Initialized/Reloaded ${commandDefinitionMap.size} command definitions.`, null, dependencies);
    } else {
        console.error('[CommandManager] commandModules is not an array or is undefined. No commands loaded during init.');
        // playerUtils might not be fully available if config itself failed, so console.error is primary here.
    }
}

/**
 * Registers a new command dynamically. (Currently a stub for future expansion)
 * @param {import('../types.js').CommandModule} commandModule - The command module to register.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies.
 */
export function registerCommandInternal(commandModule, dependencies) {
    const { playerUtils } = dependencies;
    playerUtils.debugLog('[CommandManager] registerCommandInternal is a stub and not fully implemented for dynamic runtime changes.', null, dependencies);
}

/**
 * Unregisters a command dynamically. (Currently a stub for future expansion)
 * @param {string} commandName - The name of the command to unregister.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies.
 */
export function unregisterCommandInternal(commandName, dependencies) {
    const { playerUtils } = dependencies;
    playerUtils.debugLog('[CommandManager] unregisterCommandInternal is a stub and not fully implemented for dynamic runtime changes.', null, dependencies);
}

// IIFE for initial command loading
(() => {
    const initialLoadDeps = {
        playerUtils: { debugLog: (msg) => console.log(`[CommandManagerInitialLoad] ${msg}`) },
        config: { commandAliases: {} }
    };
    try {
        initializeCommands(initialLoadDeps);
    } catch (e) {
        console.error(`[CommandManagerInitialLoad] Critical error during initial command loading: ${e.stack || e}`);
    }
})();

/**
 * Handles incoming chat messages to process potential commands.
 * This function is typically called from a `beforeChatSend` event listener in `main.js`.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object, including command maps.
 * @returns {Promise<void>}
 */
export async function handleChatCommand(eventData, dependencies) {
    const { sender: player, message } = eventData;
    const { config, playerUtils, playerDataManager, logManager, permissionLevels, rankManager, getString } = dependencies;

    const args = message.substring(config.prefix.length).trim().split(/\s+/);
    const commandNameInput = args.shift()?.toLowerCase();

    const senderPDataForLog = playerDataManager.getPlayerData(player.id);
    playerUtils.debugLog(`Player ${player?.nameTag} issued command attempt: '${commandNameInput || ''}' with args: [${args.join(', ')}]`, senderPDataForLog?.isWatched ? player?.nameTag : null, dependencies);

    if (!commandNameInput) {
        // No need to cancel eventData here as it's a chat message, not a command yet.
        // If prefix matched but no command, it's handled as a normal message unless explicitly cancelled.
        // However, standard practice is to cancel if it looked like a command attempt.
        player.sendMessage(getString('command.error.noCommandEntered', { prefix: config.prefix }));
        eventData.cancel = true;
        return;
    }

    const aliasTarget = config.commandAliases?.[commandNameInput];
    const finalCommandName = aliasTarget ? aliasTarget.toLowerCase() : commandNameInput;

    if (aliasTarget) {
        playerUtils.debugLog(`Command alias '${commandNameInput}' resolved to '${finalCommandName}'.`, player?.nameTag, dependencies);
    }

    const commandDef = dependencies.commandDefinitionMap.get(finalCommandName);
    const commandExecute = dependencies.commandExecutionMap.get(finalCommandName);

    if (!commandDef || !commandExecute) {
        player.sendMessage(getString('command.error.unknownCommand', { prefix: config.prefix, commandName: finalCommandName }));
        eventData.cancel = true;
        return;
    }

    let isEffectivelyEnabled = commandDef.enabled;
    if (config.commandSettings && typeof config.commandSettings[finalCommandName]?.enabled === 'boolean') {
        isEffectivelyEnabled = config.commandSettings[finalCommandName].enabled;
    }

    if (!isEffectivelyEnabled) {
        player.sendMessage(getString('command.error.unknownCommand', { prefix: config.prefix, commandName: finalCommandName }));
        eventData.cancel = true;
        playerUtils.debugLog(`Command '${finalCommandName}' is disabled. Access denied for ${player?.nameTag}.`, player?.nameTag, dependencies);
        return;
    }

    const userPermissionLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
    if (userPermissionLevel > commandDef.permissionLevel) {
        playerUtils.warnPlayer(player, getString('command.error.noPermission'));
        playerUtils.debugLog(`Command '${commandDef.name}' denied for ${player?.nameTag} due to insufficient permissions. Required: ${commandDef.permissionLevel}, Player has: ${userPermissionLevel}`, player?.nameTag, dependencies);
        eventData.cancel = true;
        return;
    }

    eventData.cancel = true;

    if (userPermissionLevel <= permissionLevels.admin) {
        const timestamp = new Date().toISOString();
        console.warn(`[AdminCommandLog] ${timestamp} - Player: ${player?.nameTag} (Perm: ${userPermissionLevel}) - Command: ${message}`);
    }

    if (senderPDataForLog?.isWatched && userPermissionLevel <= permissionLevels.admin) {
        playerUtils.debugLog(`Watched admin ${player?.nameTag} is executing command: ${message}`, player?.nameTag, dependencies);
    }

    try {
        await commandExecute(player, args, dependencies);
        playerUtils.debugLog(`Successfully executed command '${finalCommandName}' for ${player?.nameTag}.`, senderPDataForLog?.isWatched ? player?.nameTag : null, dependencies);
    } catch (error) {
        player.sendMessage(getString('command.error.executionFailed', { commandName: finalCommandName }));
        const errorMessage = error.message || String(error);
        const errorStack = error.stack || 'N/A';
        console.error(`[CommandManager] Error executing command ${finalCommandName} for player ${player?.nameTag}: ${errorStack}`);
        playerUtils.debugLog(`Error executing command ${finalCommandName} for ${player?.nameTag}: ${errorMessage}. Stack: ${errorStack}`, null, dependencies);
        logManager.addLog({
            actionType: 'errorCommandExecution',
            command: finalCommandName,
            targetName: player?.nameTag,
            details: `Args: [${args.join(', ')}]. Error: ${errorMessage}`,
            error: errorMessage,
            stack: errorStack,
        }, dependencies);
    }
}
