/**
 * @file Manages the registration, parsing, and execution of chat-based commands for the AntiCheat system.
 * @module AntiCheatsBP/scripts/core/commandManager
 * It dynamically loads command modules and handles permission checking and alias resolution.
 * All command names and aliases are treated as case-insensitive (converted to lowerCase).
 */
import { commandModules } from './commandRegistry.js'; // Assuming commandRegistry.js is in the same directory

/** @type {Map<string, import('../types.js').CommandDefinition>} Stores all command definitions, mapping command name (lowerCase) to its definition object. Populated dynamically from `commandModules`. */
export const commandDefinitionMap = new Map();

/** @type {Map<string, (player: import('@minecraft/server').Player, args: string[], dependencies: import('../types.js').Dependencies) => Promise<void>>} Stores all command execution functions, mapping command name (lowerCase) to its execute function. Populated dynamically from `commandModules`. */
export const commandExecutionMap = new Map();

/**
 * Loads or reloads command definitions and execution functions from the commandRegistry.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies, used for logging.
 */
export function initializeCommands(dependencies) {
    const { playerUtils } = dependencies; // config is no longer needed here for commandAliases
    commandDefinitionMap.clear();
    commandExecutionMap.clear();
    // This map will store alias -> mainCommandName for resolution during command handling.
    // It will be populated here and then used by handleChatCommand.
    // We'll attach it to dependencies so handleChatCommand can access it.
    dependencies.aliasToCommandMap = new Map();

    if (!Array.isArray(commandModules)) {
        console.error('[CommandManager.initializeCommands CRITICAL] commandModules is not an array or is undefined. No commands loaded.');
        return;
    }

    for (const cmdModule of commandModules) {
        if (cmdModule?.definition?.name && typeof cmdModule.definition.name === 'string' && typeof cmdModule.execute === 'function') {
            const cmdNameLower = cmdModule.definition.name.toLowerCase();

            // Register main command
            if (commandDefinitionMap.has(cmdNameLower)) {
                playerUtils?.debugLog(`[CommandManager.initializeCommands WARNING] Duplicate main command name detected and overwritten: ${cmdNameLower}`, null, dependencies);
            }
            commandDefinitionMap.set(cmdNameLower, cmdModule.definition);
            commandExecutionMap.set(cmdNameLower, cmdModule.execute);

            // Process aliases defined directly in command definition
            if (Array.isArray(cmdModule.definition.aliases)) {
                cmdModule.definition.aliases.forEach(alias => {
                    const aliasLower = alias.toLowerCase();
                    if (commandDefinitionMap.has(aliasLower)) {
                        // Conflict: Alias is the same as another main command name
                        playerUtils?.debugLog(`[CommandManager.initializeCommands WARNING] Alias '${aliasLower}' for command '${cmdNameLower}' conflicts with an existing main command name. Alias NOT registered.`, null, dependencies);
                    } else if (dependencies.aliasToCommandMap.has(aliasLower)) {
                        // Conflict: Alias is already registered for another command
                        const existingCmd = dependencies.aliasToCommandMap.get(aliasLower);
                        playerUtils?.debugLog(`[CommandManager.initializeCommands WARNING] Alias '${aliasLower}' for command '${cmdNameLower}' is already an alias for command '${existingCmd}'. Alias NOT registered for '${cmdNameLower}'.`, null, dependencies);
                    } else {
                        dependencies.aliasToCommandMap.set(aliasLower, cmdNameLower);
                    }
                });
            }
        } else {
            playerUtils?.debugLog(`[CommandManager.initializeCommands WARNING] Invalid command module structure encountered. Module: ${JSON.stringify(cmdModule)}`, null, dependencies);
        }
    }
    playerUtils?.debugLog(`[CommandManager.initializeCommands] Initialized/Reloaded ${commandDefinitionMap.size} command definitions and ${dependencies.aliasToCommandMap.size} aliases.`, null, dependencies);
}

/**
 * Registers a new command dynamically. (Currently a stub for future expansion)
 * @param {import('../types.js').CommandModule} commandModule - The command module to register.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies.
 */
export function registerCommandInternal(commandModule, dependencies) {
    const { playerUtils } = dependencies;
    playerUtils?.debugLog('[CommandManager.registerCommandInternal] Stub function. Dynamic registration not fully implemented. Please use commandRegistry.js and reload.', null, dependencies);
    // When implemented:
    // 1. Validate commandModule structure.
    // 2. Add to commandDefinitionMap and commandExecutionMap.
    // 3. Handle potential conflicts or overwrites with clear logging.
    // 4. Consider if aliases need special handling or if they should only be managed via config.
    // initializeCommands(dependencies); // Or a more targeted update.
}

/**
 * Unregisters a command dynamically. (Currently a stub for future expansion)
 * @param {string} commandName - The name of the command to unregister.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies.
 */
export function unregisterCommandInternal(commandName, dependencies) {
    const { playerUtils } = dependencies;
    playerUtils?.debugLog('[CommandManager.unregisterCommandInternal] Stub function. Dynamic unregistration not fully implemented. Please modify commandRegistry.js and reload.', null, dependencies);
    // When implemented:
    // 1. Remove from commandDefinitionMap and commandExecutionMap.
    // 2. Handle aliases pointing to this command (potentially complex if not managed centrally).
    // initializeCommands(dependencies); // Or a more targeted update.
}

// IIFE for initial command loading on script start.
// Aliases are now sourced directly from command definitions within commandModules,
// and `initializeCommands` populates `dependencies.aliasToCommandMap`.
(() => {
    const initialLoadDeps = {
        playerUtils: {
            /**
             * Minimal debug logger for initial command load.
             * @param {string} msg - The message to log.
             * @returns {void}
             */
            debugLog: (msg) => console.log(`[CommandManagerInitialLoad] ${msg}`),
        },
        // config: {} // config.commandAliases is no longer used for alias resolution
        // aliasToCommandMap will be initialized within initializeCommands
    };
    try {
        initializeCommands(initialLoadDeps);
    } catch (e) {
        console.error(`[CommandManagerInitialLoad CRITICAL] Error during initial command loading: ${e.stack || e}`);
    }
})();

/**
 * Handles incoming chat messages to process potential commands.
 * This function is typically called from a `beforeChatSend` event listener in `main.js`.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object, including command maps.
 * @returns {Promise<void>}
 */
export async function handleChatCommand(eventData, dependencies) {
    const { sender: player, message } = eventData;
    const { config, playerUtils, playerDataManager, logManager, permissionLevels, rankManager, getString } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        console.warn('[CommandManager.handleChatCommand] Invalid player object in eventData.');
        eventData.cancel = true; // Prevent further processing
        return;
    }

    if (!config?.prefix) {
        console.error('[CommandManager.handleChatCommand CRITICAL] Command prefix is not configured. Cannot process commands.');
        playerUtils?.debugLog(`[CommandManager.handleChatCommand] Prefix not configured. Message from ${playerName} not treated as command.`, playerName, dependencies);
        // Do not cancel eventData, let it pass as normal chat if prefix is missing.
        return;
    }

    const args = message.substring(config.prefix.length).trim().split(/\s+/);
    const commandNameInput = args.shift()?.toLowerCase();

    const senderPDataForLog = playerDataManager?.getPlayerData(player.id); // Fetch pData for logging context
    playerUtils?.debugLog(`[CommandManager.handleChatCommand] Player ${playerName} command attempt: '${commandNameInput || ''}', Args: [${args.join(', ')}]`, senderPDataForLog?.isWatched ? playerName : null, dependencies);

    if (!commandNameInput) {
        player?.sendMessage(getString('command.error.noCommandEntered', { prefix: config.prefix }));
        eventData.cancel = true;
        return;
    }

    // Resolve alias using the new aliasToCommandMap from dependencies
    const aliasTargetCommand = dependencies.aliasToCommandMap?.get(commandNameInput);
    const finalCommandName = aliasTargetCommand || commandNameInput; // No .toLowerCase() needed as keys in map are already lowercase

    if (aliasTargetCommand) {
        playerUtils?.debugLog(`[CommandManager.handleChatCommand] Alias '${commandNameInput}' for ${playerName} resolved to main command '${finalCommandName}'.`, playerName, dependencies);
    }

    // commandDefinitionMap and commandExecutionMap are now part of dependencies directly.
    const commandDef = dependencies.commandDefinitionMap?.get(finalCommandName);
    const commandExecute = dependencies.commandExecutionMap?.get(finalCommandName);

    if (!commandDef || !commandExecute) {
        player?.sendMessage(getString('command.error.unknownCommand', { prefix: config.prefix, commandName: finalCommandName }));
        eventData.cancel = true;
        return;
    }

    let isEffectivelyEnabled = commandDef.enabled !== false; // Default to true if undefined
    if (config?.commandSettings?.[finalCommandName] && typeof config.commandSettings[finalCommandName].enabled === 'boolean') {
        isEffectivelyEnabled = config.commandSettings[finalCommandName].enabled;
    }

    if (!isEffectivelyEnabled) {
        player?.sendMessage(getString('command.error.unknownCommand', { prefix: config.prefix, commandName: finalCommandName }));
        eventData.cancel = true;
        playerUtils?.debugLog(`[CommandManager.handleChatCommand] Command '${finalCommandName}' is disabled. Access denied for ${playerName}.`, playerName, dependencies);
        return;
    }

    const userPermissionLevel = rankManager?.getPlayerPermissionLevel(player, dependencies);
    if (typeof userPermissionLevel !== 'number' || userPermissionLevel > commandDef.permissionLevel) {
        playerUtils?.warnPlayer(player, getString('common.error.permissionDenied'));
        playerUtils?.debugLog(`[CommandManager.handleChatCommand] Command '${commandDef.name}' denied for ${playerName}. Required: ${commandDef.permissionLevel}, Player has: ${userPermissionLevel ?? 'N/A'}`, playerName, dependencies);
        eventData.cancel = true;
        return;
    }

    eventData.cancel = true;

    if (permissionLevels?.admin !== undefined && userPermissionLevel <= permissionLevels.admin) {
        const timestamp = new Date().toISOString();
        // console.warn is often filtered less strictly than console.log on some systems.
        console.warn(`[AdminCommandLog] ${timestamp} - Player: ${playerName} (Perm: ${userPermissionLevel}) - Command: ${message}`);
        if (senderPDataForLog?.isWatched) { // Additional debug log for watched admins
            playerUtils?.debugLog(`[CommandManager.handleChatCommand] Watched admin ${playerName} is executing command: ${message}`, playerName, dependencies);
        }
    }

    try {
        await commandExecute(player, args, dependencies);
        playerUtils?.debugLog(`[CommandManager.handleChatCommand] Successfully executed '${finalCommandName}' for ${playerName}.`, senderPDataForLog?.isWatched ? playerName : null, dependencies);
        playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
    } catch (error) {
        player?.sendMessage(getString('command.error.executionFailed', { commandName: finalCommandName }));
        const errorMessage = error?.message || String(error);
        const errorStack = error?.stack || 'N/A';
        console.error(`[CommandManager.handleChatCommand CRITICAL] Error executing ${finalCommandName} for ${playerName}: ${errorStack}`);
        playerUtils?.debugLog(`[CommandManager.handleChatCommand CRITICAL] Error executing ${finalCommandName} for ${playerName}: ${errorMessage}. Stack: ${errorStack}`, null, dependencies);
        logManager?.addLog({
            actionType: 'error.cmd.exec', // Standardized actionType
            targetName: playerName,
            targetId: player.id,
            context: `commandManager.handleChatCommand.${finalCommandName}`, // More specific context
            details: {
                errorCode: 'CMD_EXEC_FAIL',
                message: errorMessage,
                rawErrorStack: errorStack,
                meta: {
                    command: finalCommandName,
                    args: args.join(', '),
                }
            }
        }, dependencies);
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
    }
}
