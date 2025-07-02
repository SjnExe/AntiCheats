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
    const { playerUtils, config } = dependencies; // Added config for alias access
    commandDefinitionMap.clear();
    commandExecutionMap.clear();

    if (commandModules && Array.isArray(commandModules)) {
        for (const cmdModule of commandModules) {
            if (cmdModule && cmdModule.definition && typeof cmdModule.definition.name === 'string' && typeof cmdModule.execute === 'function') {
                const cmdName = cmdModule.definition.name.toLowerCase();
                if (commandDefinitionMap.has(cmdName)) {
                    playerUtils.debugLog(`[CommandManager] Duplicate command name detected and overwritten during init: ${cmdName}`, 'System', dependencies);
                }
                commandDefinitionMap.set(cmdName, cmdModule.definition);
                commandExecutionMap.set(cmdName, cmdModule.execute);

                // Process aliases defined in command definition (less common, but supported)
                if (cmdModule.definition.aliases && Array.isArray(cmdModule.definition.aliases)) {
                    cmdModule.definition.aliases.forEach(alias => {
                        const aliasLower = alias.toLowerCase();
                        if (commandDefinitionMap.has(aliasLower) || commandExecutionMap.has(aliasLower)) {
                            playerUtils.debugLog(`[CommandManager] Alias '${aliasLower}' for command '${cmdName}' conflicts with an existing command or alias. Skipping this alias definition.`, 'System', dependencies);
                        } else {
                            // This path is less common; primary alias handling is via config.commandAliases
                            // For now, we just note it. If we were to fully support it here,
                            // we'd need a way to map alias -> commandDef/Execute, or ensure config.commandAliases is the sole source.
                            playerUtils.debugLog(`[CommandManager] Command '${cmdName}' also defines alias '${aliasLower}' directly. Note: Primary alias resolution uses config.commandAliases.`, 'System', dependencies);
                        }
                    });
                }
            } else {
                playerUtils.debugLog(`[CommandManager] Invalid command module structure encountered during init. Module: ${JSON.stringify(cmdModule)}`, 'System', dependencies);
            }
        }
        playerUtils.debugLog(`[CommandManager] Initialized/Reloaded ${commandDefinitionMap.size} command definitions.`, 'System', dependencies);
    } else {
        console.error('[CommandManager] commandModules is not an array or is undefined. No commands loaded during init.');
        playerUtils.debugLog('[CommandManager] commandModules is not an array or is undefined. No commands loaded during init.', 'System', dependencies);
    }
}

/**
 * Registers a new command dynamically. (Currently a stub for future expansion)
 * @param {import('../types.js').CommandModule} commandModule - The command module to register.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies.
 */
export function registerCommandInternal(commandModule, dependencies) {
    const { playerUtils } = dependencies;
    playerUtils.debugLog('[CommandManager] registerCommandInternal is a stub and not fully implemented for dynamic runtime changes.', 'System', dependencies);
    // Future: Add logic to update commandDefinitionMap and commandExecutionMap, handle aliases, etc.
}

/**
 * Unregisters a command dynamically. (Currently a stub for future expansion)
 * @param {string} commandName - The name of the command to unregister.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies.
 */
export function unregisterCommandInternal(commandName, dependencies) {
    const { playerUtils } = dependencies;
    playerUtils.debugLog('[CommandManager] unregisterCommandInternal is a stub and not fully implemented for dynamic runtime changes.', 'System', dependencies);
    // Future: Add logic to remove from commandDefinitionMap and commandExecutionMap, handle aliases, etc.
}

// IIFE for initial command loading
(() => {
    // Create minimal dependencies for the very first load.
    // config.commandAliases might not be fully populated if config.js hasn't run yet,
    // but initializeCommands primarily relies on commandModules.
    const initialLoadDeps = {
        playerUtils: { debugLog: (msg) => console.log(`[CommandManagerInitialLoad] ${msg}`) }, // Basic logger
        config: { commandAliases: {} } // Provide an empty aliases object
        // Other dependencies might be missing, but initializeCommands should be robust.
    };
    initializeCommands(initialLoadDeps);
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
    const { config, playerUtils, playerDataManager, logManager, permissionLevels, rankManager, getString } = dependencies; // Added getString

    const args = message.substring(config.prefix.length).trim().split(/\s+/);
    let commandNameInput = args.shift()?.toLowerCase();

    const senderPDataForLog = playerDataManager.getPlayerData(player.id);
    playerUtils.debugLog(`Player ${player.nameTag} issued command attempt: '${commandNameInput || ''}' with args: [${args.join(', ')}]`, senderPDataForLog?.isWatched ? player.nameTag : null, dependencies);

    if (!commandNameInput) {
        player.sendMessage(getString('command.error.noCommandEntered', { prefix: config.prefix }));
        eventData.cancel = true;
        return;
    }

    // Resolve alias first
    const aliasTarget = config.commandAliases?.[commandNameInput];
    const finalCommandName = aliasTarget ? aliasTarget.toLowerCase() : commandNameInput;

    if (aliasTarget) {
        playerUtils.debugLog(`Command alias '${commandNameInput}' resolved to '${finalCommandName}'.`, player.nameTag, dependencies);
    }

    const commandDef = dependencies.commandDefinitionMap.get(finalCommandName);
    const commandExecute = dependencies.commandExecutionMap.get(finalCommandName);

    if (!commandDef || !commandExecute) {
        player.sendMessage(getString('command.error.unknownCommand', { prefix: config.prefix, commandName: finalCommandName }));
        eventData.cancel = true;
        return;
    }

    // Check if the command is enabled via commandSettings in config.js, falling back to commandDef.enabled
    let isEffectivelyEnabled = commandDef.enabled; // Default to definition's enabled state
    if (config.commandSettings && typeof config.commandSettings[finalCommandName]?.enabled === 'boolean') {
        isEffectivelyEnabled = config.commandSettings[finalCommandName].enabled;
    }

    if (!isEffectivelyEnabled) {
        player.sendMessage(getString('command.error.unknownCommand', { prefix: config.prefix, commandName: finalCommandName })); // Treat disabled as unknown for non-admins
        eventData.cancel = true;
        playerUtils.debugLog(`Command '${finalCommandName}' is disabled. Access denied for ${player.nameTag}.`, player.nameTag, dependencies);
        return;
    }

    const userPermissionLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
    if (userPermissionLevel > commandDef.permissionLevel) { // Lower number = higher permission
        playerUtils.warnPlayer(player, getString('command.error.noPermission'));
        playerUtils.debugLog(`Command '${commandDef.name}' denied for ${player.nameTag} due to insufficient permissions. Required: ${commandDef.permissionLevel}, Player has: ${userPermissionLevel}`, player.nameTag, dependencies);
        eventData.cancel = true;
        return;
    }

    eventData.cancel = true; // Cancel the original chat message

    // Log admin commands to console for visibility
    if (userPermissionLevel <= permissionLevels.admin) { // Assuming lower number is higher permission
        const timestamp = new Date().toISOString();
        console.warn(`[AdminCommandLog] ${timestamp} - Player: ${player.name} (Perm: ${userPermissionLevel}) - Command: ${message}`);
    }

    // Additional debug log for watched admins
    const pDataForAdminLog = playerDataManager.getPlayerData(player.id); // Re-fetch or use senderPDataForLog if still valid
    if (pDataForAdminLog && pDataForAdminLog.isWatched && userPermissionLevel <= permissionLevels.admin) {
        playerUtils.debugLog(`Watched admin ${player.nameTag} is executing command: ${message}`, player.nameTag, dependencies);
    }

    try {
        await commandExecute(player, args, dependencies);
        playerUtils.debugLog(`Successfully executed command '${finalCommandName}' for ${player.nameTag}.`, senderPDataForLog?.isWatched ? player.nameTag : null, dependencies);
    } catch (error) {
        player.sendMessage(getString('command.error.executionFailed', { commandName: finalCommandName }));
        const errorMessage = error.message || String(error);
        const errorStack = error.stack || 'N/A';
        console.error(`[CommandManager] Error executing command ${finalCommandName} for player ${player.nameTag}: ${errorStack}`);
        playerUtils.debugLog(`Error executing command ${finalCommandName} for ${player.nameTag}: ${errorMessage}. Stack: ${errorStack}`, null, dependencies); // Added stack to debug
        logManager.addLog({
            actionType: 'errorCommandExecution',
            command: finalCommandName,
            targetName: player.nameTag,
            details: `Args: [${args.join(', ')}]. Error: ${errorMessage}`,
            error: errorMessage, // Keep concise error message for typical logs
            stack: errorStack, // Store full stack for detailed debugging
        }, dependencies);
    }
}
