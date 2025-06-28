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
export const commandDefinitionMap = new Map(); // Export for potential external use/inspection

/**
 * @description Stores all command execution functions, mapping command name to its execute function.
 * Populated dynamically from `commandModules`.
 * @type {Map<string, Function>}
 */
export const commandExecutionMap = new Map(); // Export for potential external use/inspection

/**
 * Loads or reloads command definitions and execution functions from the commandRegistry.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies, used for logging.
 */
export function initializeCommands(dependencies) {
    const { playerUtils } = dependencies;
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

                // Register aliases
                if (cmdModule.definition.aliases && Array.isArray(cmdModule.definition.aliases)) {
                    cmdModule.definition.aliases.forEach(alias => {
                        const aliasLower = alias.toLowerCase();
                        if (commandDefinitionMap.has(aliasLower) || commandExecutionMap.has(aliasLower)) {
                             playerUtils.debugLog(`[CommandManager] Duplicate alias detected (conflicts with existing command/alias): ${aliasLower}. Alias for '${cmdName}' skipped.`, 'System', dependencies);
                        } else {
                            // For aliases, we might point them to the main command's definition and execution
                            // Or handle them purely at the config.commandAliases level.
                            // For now, primary loading is direct names. Aliases are resolved in handleChatCommand.
                            // If we wanted aliases to also be in the map, we'd add them here.
                            // Example: commandDefinitionMap.set(aliasLower, cmdModule.definition);
                            //          commandExecutionMap.set(aliasLower, cmdModule.execute);
                            // However, current alias resolution in handleChatCommand uses config.commandAliases.
                        }
                    });
                }
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
    // Basic implementation idea:
    // if (commandModule && commandModule.definition && typeof commandModule.definition.name === 'string' && typeof commandModule.execute === 'function') {
    //     const cmdName = commandModule.definition.name.toLowerCase();
    //     if (commandDefinitionMap.has(cmdName)) {
    //         playerUtils.debugLog(`[CommandManager] Overwriting existing command: ${cmdName}`, 'System', dependencies);
    //     }
    //     commandDefinitionMap.set(cmdName, commandModule.definition);
    //     commandExecutionMap.set(cmdName, commandModule.execute);
    //     playerUtils.debugLog(`[CommandManager] Dynamically registered command: ${cmdName}`, 'System', dependencies);
    // } else {
    //     playerUtils.debugLog('[CommandManager] Attempted to register invalid command module.', 'System', dependencies);
    // }
}

/**
 * Unregisters a command dynamically. (Currently a stub for future expansion)
 * @param {string} commandName - The name of the command to unregister.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies.
 */
export function unregisterCommandInternal(commandName, dependencies) {
    const { playerUtils } = dependencies;
    playerUtils.debugLog('[CommandManager] unregisterCommandInternal is a stub and not fully implemented for dynamic runtime changes.', 'System', dependencies);
    // Basic implementation idea:
    // const cmdNameLower = commandName.toLowerCase();
    // if (commandDefinitionMap.has(cmdNameLower)) {
    //     commandDefinitionMap.delete(cmdNameLower);
    //     commandExecutionMap.delete(cmdNameLower);
    //     playerUtils.debugLog(`[CommandManager] Dynamically unregistered command: ${cmdNameLower}`, 'System', dependencies);
    //     // Need to also handle aliases that might point to this command if they are stored in the maps.
    // } else {
    //     playerUtils.debugLog(`[CommandManager] Command ${cmdNameLower} not found for unregistration.`, 'System', dependencies);
    // }
}


// Initial load when the module is first imported.
// This is a bit unusual as initializeCommands would typically be called from main.js explicitly.
// However, to ensure maps are populated for direct export and use by handleChatCommand if it's called
// before an explicit initializeCommands from main (which it is, via dependencies), we do an initial population.
// The explicit call from main.js will then serve as a "reload".
(() => {
    // A minimal dependencies object for this initial, self-contained load.
    const initialLoadDeps = {
        playerUtils: { debugLog: (msg) => console.log(msg) }, // Basic logger
        config: {} // Empty config, as alias resolution isn't part of this initial map population
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
    const { config, playerUtils, playerDataManager, logManager, permissionLevels, rankManager } = dependencies;

    const args = message.substring(config.prefix.length).trim().split(/\s+/);
    let commandNameInput = args.shift()?.toLowerCase();

    const senderPDataForLog = playerDataManager.getPlayerData(player.id);
    playerUtils.debugLog(`Player ${player.nameTag} issued command attempt: '${commandNameInput || ''}' with args: [${args.join(', ')}]`, senderPDataForLog?.isWatched ? player.nameTag : null, dependencies);

    if (!commandNameInput) {
        player.sendMessage(`§cPlease enter a command after the prefix. Type ${config.prefix}help for a list of commands.`);
        eventData.cancel = true;
        return;
    }

    const aliasTarget = config.commandAliases?.[commandNameInput];
    const finalCommandName = aliasTarget ? aliasTarget.toLowerCase() : commandNameInput;

    if (aliasTarget) {
        playerUtils.debugLog(`Command alias '${commandNameInput}' resolved to '${finalCommandName}'.`, player.nameTag, dependencies);
    }

    const commandDef = dependencies.commandDefinitionMap.get(finalCommandName);
    const commandExecute = dependencies.commandExecutionMap.get(finalCommandName);

    if (!commandDef || !commandExecute) {
        player.sendMessage(`§cUnknown command: ${config.prefix}${finalCommandName}§r. Type ${config.prefix}help for assistance.`);
        eventData.cancel = true;
        return;
    }

    let isEffectivelyEnabled = commandDef.enabled;
    if (config.commandSettings && typeof config.commandSettings[finalCommandName]?.enabled === 'boolean') {
        isEffectivelyEnabled = config.commandSettings[finalCommandName].enabled;
    }

    if (!isEffectivelyEnabled) {
        player.sendMessage(`§cUnknown command: ${config.prefix}${finalCommandName}§r. Type ${config.prefix}help for assistance.`);
        eventData.cancel = true;
        playerUtils.debugLog(`Command '${finalCommandName}' is disabled. Access denied for ${player.nameTag}.`, player.nameTag, dependencies);
        return;
    }

    const userPermissionLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
    if (userPermissionLevel > commandDef.permissionLevel) {
        playerUtils.warnPlayer(player, 'You do not have permission to use this command.');
        playerUtils.debugLog(`Command '${commandDef.name}' denied for ${player.nameTag} due to insufficient permissions. Required: ${commandDef.permissionLevel}, Player has: ${userPermissionLevel}`, player.nameTag, dependencies);
        eventData.cancel = true;
        return;
    }

    eventData.cancel = true; // Cancel the original chat message to prevent it from appearing in chat.

    // Log admin command usage to console for audit purposes.
    if (userPermissionLevel <= permissionLevels.admin) {
        const timestamp = new Date().toISOString();
        console.warn(`[AdminCommandLog] ${timestamp} - Player: ${player.name} - Command: ${message}`);
    }

    // Additional debug log for watched admins, if they are being monitored.
    const pDataForAdminLog = playerDataManager.getPlayerData(player.id);
    if (pDataForAdminLog && pDataForAdminLog.isWatched && playerUtils.isAdmin(player, dependencies)) {
        playerUtils.debugLog(`Watched admin ${player.nameTag} is executing command: ${message}`, player.nameTag, dependencies);
    }

    try {
        await commandExecute(player, args, dependencies);
        playerUtils.debugLog(`Successfully executed command '${finalCommandName}' for ${player.nameTag}.`, senderPDataForLog?.isWatched ? player.nameTag : null, dependencies);
    } catch (error) {
        player.sendMessage(`§cAn error occurred while executing command '${finalCommandName}'. Please report this.`);
        const errorMessage = error.message || String(error);
        const errorStack = error.stack || 'N/A';
        console.error(`[CommandManager] Error executing command ${finalCommandName} for player ${player.nameTag}: ${errorStack}`);
        playerUtils.debugLog(`Error executing command ${finalCommandName} for ${player.nameTag}: ${errorMessage}`, null, dependencies);
        logManager.addLog({
            actionType: 'errorCommandExecution',
            command: finalCommandName,
            targetName: player.nameTag,
            details: `Args: [${args.join(', ')}]. Error: ${errorMessage}`,
            error: errorMessage,
            stack: errorStack,
        }, dependencies);
    }
}
