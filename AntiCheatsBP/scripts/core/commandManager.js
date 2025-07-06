/**
 * @file Manages the registration, parsing, and execution of chat-based commands for the AntiCheat system.
 * It dynamically loads command modules and handles permission checking and alias resolution.
 * All command names and aliases are treated as case-insensitive (converted to lowerCase).
 */
import { commandModules } from './commandRegistry.js'; // Assuming commandRegistry.js is in the same directory

/**
 * @description Stores all command definitions, mapping command name (lowerCase) to its definition object.
 * Populated dynamically from `commandModules`.
 * @type {Map<string, import('../types.js').CommandDefinition>}
 */
export const commandDefinitionMap = new Map();

/**
 * @description Stores all command execution functions, mapping command name (lowerCase) to its execute function.
 * Populated dynamically from `commandModules`.
 * @type {Map<string, (player: import('@minecraft/server').Player, args: string[], dependencies: import('../types.js').Dependencies) => Promise<void>>}
 */
export const commandExecutionMap = new Map();

/**
 * Loads or reloads command definitions and execution functions from the commandRegistry.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies, used for logging.
 */
export function initializeCommands(dependencies) {
    const { playerUtils, config } = dependencies; // config is needed for commandAliases
    commandDefinitionMap.clear();
    commandExecutionMap.clear();

    if (!Array.isArray(commandModules)) {
        console.error('[CommandManager.initializeCommands CRITICAL] commandModules is not an array or is undefined. No commands loaded.');
        return;
    }

    for (const cmdModule of commandModules) {
        if (cmdModule?.definition?.name && typeof cmdModule.definition.name === 'string' && typeof cmdModule.execute === 'function') {
            const cmdNameLower = cmdModule.definition.name.toLowerCase();
            if (commandDefinitionMap.has(cmdNameLower)) {
                playerUtils?.debugLog(`[CommandManager.initializeCommands WARNING] Duplicate command name detected and overwritten: ${cmdNameLower}`, null, dependencies);
            }
            commandDefinitionMap.set(cmdNameLower, cmdModule.definition);
            commandExecutionMap.set(cmdNameLower, cmdModule.execute);

            // Process aliases defined directly in command definition (less common, config.commandAliases is primary)
            if (Array.isArray(cmdModule.definition.aliases)) {
                cmdModule.definition.aliases.forEach(alias => {
                    const aliasLower = alias.toLowerCase();
                    // Check if this alias is already defined as a main command or in config.commandAliases
                    // to prevent direct definition from overriding a primary command or a configured alias.
                    if (commandDefinitionMap.has(aliasLower) && commandDefinitionMap.get(aliasLower)?.name.toLowerCase() === aliasLower) {
                        playerUtils?.debugLog(`[CommandManager.initializeCommands WARNING] Alias '${aliasLower}' for command '${cmdNameLower}' conflicts with an existing main command. Skipping direct alias definition.`, null, dependencies);
                    } else if (config?.commandAliases && Object.values(config.commandAliases).includes(aliasLower)) {
                         playerUtils?.debugLog(`[CommandManager.initializeCommands INFO] Alias '${aliasLower}' for command '${cmdNameLower}' is already managed by config.commandAliases. Skipping direct definition.`, null, dependencies);
                    } else if (commandExecutionMap.has(aliasLower) && !config?.commandAliases?.[aliasLower]) {
                        // If it's in commandExecutionMap but not as a configured alias, it might be from another command's direct alias.
                        playerUtils?.debugLog(`[CommandManager.initializeCommands WARNING] Alias '${aliasLower}' for command '${cmdNameLower}' conflicts with another directly defined alias. Skipping.`, null, dependencies);
                    }
                    // Direct definition of aliases here is generally discouraged in favor of central config.commandAliases
                    // If needed, one might add them, but with warnings or clear precedence rules.
                });
            }
        } else {
            playerUtils?.debugLog(`[CommandManager.initializeCommands WARNING] Invalid command module structure encountered. Module: ${JSON.stringify(cmdModule)}`, null, dependencies);
        }
    }
    playerUtils?.debugLog(`[CommandManager.initializeCommands] Initialized/Reloaded ${commandDefinitionMap.size} command definitions.`, null, dependencies);
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

// IIFE for initial command loading on script start
(() => {
    const initialLoadDeps = {
        playerUtils: { debugLog: (msg) => console.log(`[CommandManagerInitialLoad] ${msg}`) },
        config: { commandAliases: globalThis.loadedConfig?.commandAliases || {} } // Attempt to use loaded config if available
    };
    try {
        // Assuming config.js might have loaded its commandAliases into a global or accessible scope.
        // This is a best-effort for initial load before full dependencies are wired.
        // A more robust system might delay command init until config is fully ready.
        if (typeof globalThis.loadedConfig === 'undefined' && initialLoadDeps.playerUtils && typeof initialLoadDeps.playerUtils.debugLog === 'function') {
            initialLoadDeps.playerUtils.debugLog('WARNING: globalThis.loadedConfig not found. Command alias conflict checks might be incomplete during initial load.');
        }
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

    const aliasTarget = config?.commandAliases?.[commandNameInput];
    const finalCommandName = aliasTarget ? aliasTarget.toLowerCase() : commandNameInput;

    if (aliasTarget) {
        playerUtils?.debugLog(`[CommandManager.handleChatCommand] Alias '${commandNameInput}' for ${playerName} resolved to '${finalCommandName}'.`, playerName, dependencies);
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
            actionType: 'errorCommandExecution',
            targetName: playerName,
            targetId: player.id,
            details: {
                command: finalCommandName,
                args: args.join(', '),
                errorMessage: errorMessage,
            },
            errorStack: errorStack, // Store full stack for detailed debugging
        }, dependencies);
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
    }
}
