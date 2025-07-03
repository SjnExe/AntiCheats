/**
 * @file Manages the registration, parsing, and execution of chat-based commands for the AntiCheat system.
 * It dynamically loads command modules and handles permission checking and alias resolution.
 * All command names and aliases are treated as case-insensitive (converted to lowerCase).
 */
import { commandModules } from '../commands/commandRegistry.js';

/**
 * @description Stores all command definitions, mapping command name (lowerCase) to its definition object.
 * Populated dynamically from `commandModules`.
 * @type {Map<string, import('../types.js').CommandDefinition>}
 */
export const commandDefinitionMap = new Map();

/**
 * @description Stores all command execution functions, mapping command name (lowerCase) to its execute function.
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

    if (!Array.isArray(commandModules)) {
        console.error('[CommandManager.initializeCommands] commandModules is not an array or is undefined. No commands loaded.');
        return;
    }

    for (const cmdModule of commandModules) {
        if (cmdModule?.definition?.name && typeof cmdModule.definition.name === 'string' && typeof cmdModule.execute === 'function') {
            const cmdName = cmdModule.definition.name.toLowerCase(); // Ensure command name is lowerCase
            if (commandDefinitionMap.has(cmdName)) {
                playerUtils?.debugLog(`[CommandManager.initializeCommands] Duplicate command name detected and overwritten: ${cmdName}`, null, dependencies);
            }
            commandDefinitionMap.set(cmdName, cmdModule.definition);
            commandExecutionMap.set(cmdName, cmdModule.execute);

            // Process aliases defined directly in command definition (though config.commandAliases is primary)
            if (Array.isArray(cmdModule.definition.aliases)) {
                cmdModule.definition.aliases.forEach(alias => {
                    const aliasLower = alias.toLowerCase();
                    if (commandDefinitionMap.has(aliasLower) || commandExecutionMap.has(aliasLower)) {
                        // Avoid overwriting a main command with an alias, or an existing alias from another command.
                        // The config.commandAliases map is the primary source for aliases and handles conflicts there.
                        playerUtils?.debugLog(`[CommandManager.initializeCommands] Alias '${aliasLower}' for command '${cmdName}' conflicts or is already handled by config.commandAliases. Skipping direct definition.`, null, dependencies);
                    } else {
                        // This path is less common if config.commandAliases is comprehensive.
                        // commandDefinitionMap.set(aliasLower, cmdModule.definition); // Could point to the same def
                        // commandExecutionMap.set(aliasLower, cmdModule.execute); // Could point to the same func
                        playerUtils?.debugLog(`[CommandManager.initializeCommands] Command '${cmdName}' defined direct alias '${aliasLower}'. Note: config.commandAliases is primary.`, null, dependencies);
                    }
                });
            }
        } else {
            playerUtils?.debugLog(`[CommandManager.initializeCommands] Invalid command module structure encountered. Module: ${JSON.stringify(cmdModule)}`, null, dependencies);
        }
    }
    playerUtils?.debugLog(`[CommandManager.initializeCommands] Initialized/Reloaded ${commandDefinitionMap.size} command definitions.`, null, dependencies);
}

/**
 * Registers a new command dynamically. (Currently a stub for future expansion)
 * @param {import('../types.js').CommandModule} commandModule - The command module to register.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies.
 */
export function registerCommandInternal(commandModule, dependencies) {
    const { playerUtils } = dependencies;
    playerUtils?.debugLog('[CommandManager.registerCommandInternal] Stub function. Dynamic registration not fully implemented.', null, dependencies);
    // When implemented, ensure it calls initializeCommands or updates maps carefully to handle potential reloads/conflicts.
}

/**
 * Unregisters a command dynamically. (Currently a stub for future expansion)
 * @param {string} commandName - The name of the command to unregister.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies.
 */
export function unregisterCommandInternal(commandName, dependencies) {
    const { playerUtils } = dependencies;
    playerUtils?.debugLog('[CommandManager.unregisterCommandInternal] Stub function. Dynamic unregistration not fully implemented.', null, dependencies);
    // When implemented, ensure it calls initializeCommands or updates maps carefully.
}

// IIFE for initial command loading on script start
(() => {
    // Create minimal dependencies for initial load, as full dependencies might not be ready.
    const initialLoadDeps = {
        playerUtils: { debugLog: (msg) => console.log(`[CommandManagerInitialLoad] ${msg}`) },
        // config might not be fully loaded yet, so provide a minimal structure if needed by initializeCommands.
        // config.commandAliases is used by initializeCommands if playerUtils.debugLog is called for alias conflicts.
        config: { commandAliases: {} } // Assuming commandAliases might be accessed.
    };
    try {
        initializeCommands(initialLoadDeps);
    } catch (e) {
        console.error(`[CommandManagerInitialLoad] CRITICAL ERROR during initial command loading: ${e.stack || e}`);
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
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.prefix) {
        console.error('[CommandManager.handleChatCommand] Command prefix is not configured. Cannot process commands.');
        playerUtils?.debugLog(`[CommandManager.handleChatCommand] Prefix not configured. Message from ${playerName} not treated as command.`, playerName, dependencies);
        return; // Let the message pass through as normal chat if prefix is missing.
    }

    const args = message.substring(config.prefix.length).trim().split(/\s+/);
    const commandNameInput = args.shift()?.toLowerCase(); // Ensure lowercase for matching

    const senderPDataForLog = playerDataManager?.getPlayerData(player.id);
    playerUtils?.debugLog(`[CommandManager.handleChatCommand] Player ${playerName} command attempt: '${commandNameInput || ''}', Args: [${args.join(', ')}]`, senderPDataForLog?.isWatched ? playerName : null, dependencies);

    if (!commandNameInput) {
        player?.sendMessage(getString('command.error.noCommandEntered', { prefix: config.prefix }));
        eventData.cancel = true; // Cancel if it was a prefix-only message
        return;
    }

    const aliasTarget = config.commandAliases?.[commandNameInput]; // commandNameInput is already lowerCase
    const finalCommandName = aliasTarget ? aliasTarget.toLowerCase() : commandNameInput; // Ensure alias target is also lowerCase

    if (aliasTarget) {
        playerUtils?.debugLog(`[CommandManager.handleChatCommand] Alias '${commandNameInput}' for ${playerName} resolved to '${finalCommandName}'.`, playerName, dependencies);
    }

    const commandDef = dependencies.commandDefinitionMap?.get(finalCommandName);
    const commandExecute = dependencies.commandExecutionMap?.get(finalCommandName);

    if (!commandDef || !commandExecute) {
        player?.sendMessage(getString('command.error.unknownCommand', { prefix: config.prefix, commandName: finalCommandName }));
        eventData.cancel = true;
        return;
    }

    // Check if command is enabled, first via commandDefinition, then via config override
    let isEffectivelyEnabled = commandDef.enabled; // Default to definition's enabled state
    if (config.commandSettings?.[finalCommandName] && typeof config.commandSettings[finalCommandName].enabled === 'boolean') {
        isEffectivelyEnabled = config.commandSettings[finalCommandName].enabled; // Override with config if present
    }

    if (!isEffectivelyEnabled) {
        player?.sendMessage(getString('command.error.unknownCommand', { prefix: config.prefix, commandName: finalCommandName })); // Treat as unknown if disabled
        eventData.cancel = true;
        playerUtils?.debugLog(`[CommandManager.handleChatCommand] Command '${finalCommandName}' is disabled. Access denied for ${playerName}.`, playerName, dependencies);
        return;
    }

    const userPermissionLevel = rankManager?.getPlayerPermissionLevel(player, dependencies);
    if (userPermissionLevel === undefined || userPermissionLevel === null || userPermissionLevel > commandDef.permissionLevel) {
        playerUtils?.warnPlayer(player, getString('command.error.noPermission'));
        playerUtils?.debugLog(`[CommandManager.handleChatCommand] Command '${commandDef.name}' denied for ${playerName}. Required: ${commandDef.permissionLevel}, Player has: ${userPermissionLevel}`, playerName, dependencies);
        eventData.cancel = true;
        return;
    }

    eventData.cancel = true; // Command attempt recognized and authorized, cancel original chat message.

    // Log admin command usage to console
    if (permissionLevels?.admin !== undefined && userPermissionLevel <= permissionLevels.admin) {
        const timestamp = new Date().toISOString();
        console.warn(`[AdminCommandLog] ${timestamp} - Player: ${playerName} (Perm: ${userPermissionLevel}) - Command: ${message}`);
    }

    if (senderPDataForLog?.isWatched && permissionLevels?.admin !== undefined && userPermissionLevel <= permissionLevels.admin) {
        playerUtils?.debugLog(`[CommandManager.handleChatCommand] Watched admin ${playerName} is executing command: ${message}`, playerName, dependencies);
    }

    try {
        await commandExecute(player, args, dependencies);
        playerUtils?.debugLog(`[CommandManager.handleChatCommand] Successfully executed '${finalCommandName}' for ${playerName}.`, senderPDataForLog?.isWatched ? playerName : null, dependencies);
    } catch (error) {
        player?.sendMessage(getString('command.error.executionFailed', { commandName: finalCommandName }));
        const errorMessage = error?.message || String(error);
        const errorStack = error?.stack || 'N/A';
        console.error(`[CommandManager.handleChatCommand] Error executing ${finalCommandName} for ${playerName}: ${errorStack}`);
        playerUtils?.debugLog(`[CommandManager.handleChatCommand] Error executing ${finalCommandName} for ${playerName}: ${errorMessage}. Stack: ${errorStack}`, null, dependencies); // Log full stack for system debug
        logManager?.addLog({
            actionType: 'errorCommandExecution',
            command: finalCommandName,
            targetName: playerName,
            details: `Args: [${args.join(', ')}]. Error: ${errorMessage}`,
            error: errorMessage, // For brief error display
            stack: errorStack,   // For detailed debugging
        }, dependencies);
    }
}
