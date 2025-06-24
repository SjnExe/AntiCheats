/**
 * @file Manages the registration, parsing, and execution of chat-based commands for the AntiCheat system.
 * It dynamically loads command modules and handles permission checking and alias resolution.
 */
import * as mc from '@minecraft/server';
import { commandModules } from '../commands/commandRegistry.js';

/**
 * @description Stores all command definitions, mapping command name to its definition object.
 * Populated dynamically from `commandModules`.
 * @type {Map<string, import('../types.js').CommandDefinition>}
 */
const commandDefinitionMap = new Map();

/**
 * @description Stores all command execution functions, mapping command name to its execute function.
 * Populated dynamically from `commandModules`.
 * @type {Map<string, Function>}
 */
const commandExecutionMap = new Map();

if (commandModules && Array.isArray(commandModules)) {
    for (const cmdModule of commandModules) {
        if (cmdModule && cmdModule.definition && typeof cmdModule.definition.name === 'string' && typeof cmdModule.execute === 'function') {
            const cmdName = cmdModule.definition.name.toLowerCase();
            if (commandDefinitionMap.has(cmdName)) {
                console.warn(`[CommandManager] Duplicate command name detected and overwritten: ${cmdName}`);
            }
            commandDefinitionMap.set(cmdName, cmdModule.definition);
            commandExecutionMap.set(cmdName, cmdModule.execute);
        }
    }
    console.log(`[CommandManager] Dynamically loaded ${commandDefinitionMap.size} command definitions.`);
} else {
    console.error('[CommandManager] commandModules is not an array or is undefined. No commands loaded.');
}

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

    // commandDefinitionMap and commandExecutionMap are now passed via dependencies by main.js
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

    eventData.cancel = true; // Cancel the original chat message

    // Log admin command usage to console
    if (userPermissionLevel <= permissionLevels.admin) {
        const timestamp = new Date().toISOString();
        console.warn(`[AdminCommandLog] ${timestamp} - Player: ${player.name} - Command: ${message}`);
    }

    // Additional debug log for watched admins
    const pDataForAdminLog = playerDataManager.getPlayerData(player.id);
    if (pDataForAdminLog && pDataForAdminLog.isWatched && playerUtils.isAdmin(player, dependencies)) {
        playerUtils.debugLog(`Watched admin ${player.nameTag} is executing command: ${message}`, player.nameTag, dependencies);
    }

    try {
        await commandExecute(player, args, dependencies);
        playerUtils.debugLog(`Successfully executed command '${finalCommandName}' for ${player.nameTag}.`, senderPDataForLog?.isWatched ? player.nameTag : null, dependencies);
    } catch (error) {
        player.sendMessage(`§cAn error occurred while executing command '${finalCommandName}'. Please report this.`);
        console.error(`[CommandManager] Error executing command ${finalCommandName} for player ${player.nameTag}: ${error.stack || error}`);
        playerUtils.debugLog(`Error executing command ${finalCommandName} for ${player.nameTag}: ${error.message || error}`, null, dependencies);
        logManager.addLog({
            actionType: 'command_execution_error',
            command: finalCommandName,
            player: player.nameTag,
            args: args.join(' '), // Log args as a string for easier reading
            error: error.message,
            stack: error.stack, // Include stack for better debugging
        }, dependencies);
    }
}
