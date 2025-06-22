/**
 * @file AntiCheatsBP/scripts/core/commandManager.js
 * Manages the registration, parsing, and execution of chat-based commands for the AntiCheat system.
 * It dynamically loads command modules and handles permission checking and alias resolution.
 * @version 1.1.0
 */
import * as mc from '@minecraft/server';
import { commandModules } from '../commands/commandRegistry.js';
/**
 * @type {Map<string, import('../types.js').CommandDefinition>}
 * Stores all command definitions, mapping command name to its definition object.
 * Loaded dynamically from commandModules.
 */
const commandDefinitionMap = new Map();
/**
 * @type {Map<string, function>}
 * Stores all command execution functions, mapping command name to its execute function.
 * Loaded dynamically from commandModules.
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
        } else {
        }
    }
    console.log(`[CommandManager] Dynamically loaded ${commandDefinitionMap.size} command definitions.`);
} else {
    console.error("[CommandManager] commandModules is not an array or is undefined. No commands loaded.");
}
/**
 * Handles incoming chat messages to process potential commands.
 * It parses the message, checks for command validity and permissions, and then executes the command.
 * Also logs admin command usage to the console.
 * @param {mc.ChatSendBeforeEvent} eventData - The chat send event data.
 * @param {object} dependencies - The comprehensive dependencies object passed from main.js, providing access to various managers, utilities, and configurations.
 */
export async function handleChatCommand(eventData, dependencies) {
    const { sender: player, message } = eventData;
    const { config, playerUtils, playerDataManager, logManager, permissionLevels } = dependencies;

    const args = message.substring(config.prefix.length).trim().split(/\s+/);
    let commandNameInput = args.shift()?.toLowerCase();

    const senderPDataForLog = playerDataManager.getPlayerData(player.id);
    if (playerUtils.debugLog) {
        playerUtils.debugLog(`Player ${player.nameTag} issued command attempt: "${commandNameInput || ''}" with args: [${args.join(', ')}]`, senderPDataForLog?.isWatched ? player.nameTag : null, dependencies);
    }

    if (!commandNameInput) {
        player.sendMessage(`§cPlease enter a command after the prefix. Type ${config.prefix}help for a list of commands.`);
        eventData.cancel = true;
        return;
    }

    const aliasTarget = config.commandAliases?.[commandNameInput];
    const finalCommandName = aliasTarget ? aliasTarget.toLowerCase() : commandNameInput;

    if (aliasTarget && playerUtils.debugLog) {
        playerUtils.debugLog(`Command alias '${commandNameInput}' resolved to '${finalCommandName}'.`, player.nameTag, dependencies);
    }

    const commandDef = commandDefinitionMap.get(finalCommandName);
    const commandExecute = commandExecutionMap.get(finalCommandName);

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
        if (playerUtils?.debugLog) {
            playerUtils.debugLog(`Command '${finalCommandName}' is disabled. Access denied for ${player.nameTag}.`, player.nameTag, dependencies);
        }
        return;
    }

    const userPermissionLevel = dependencies.rankManager.getPlayerPermissionLevel(player, dependencies);
    if (userPermissionLevel > commandDef.permissionLevel) {
        playerUtils.warnPlayer(player, "You do not have permission to use this command.");
        if (playerUtils.debugLog) {
            playerUtils.debugLog(`Command '${commandDef.name}' denied for ${player.nameTag} due to insufficient permissions. Required: ${commandDef.permissionLevel}, Player has: ${userPermissionLevel}`, player.nameTag, dependencies);
        }
        eventData.cancel = true;
        return;
    }

    eventData.cancel = true;

    if (userPermissionLevel <= permissionLevels.admin) {
        const timestamp = new Date().toISOString();
        console.warn(`[AdminCommandLog] ${timestamp} - Player: ${player.name} - Command: ${message}`);
    }

    const pDataForAdminLog = playerDataManager.getPlayerData(player.id);
    if (pDataForAdminLog && pDataForAdminLog.isWatched && playerUtils.isAdmin(player, dependencies)) {
        playerUtils.debugLog(`Watched admin ${player.nameTag} is executing command: ${message}`, player.nameTag, dependencies);
    }

    try {
        await commandExecute(player, args, dependencies);
        if (playerUtils.debugLog) {
            playerUtils.debugLog(`Successfully executed command '${finalCommandName}' for ${player.nameTag}.`, senderPDataForLog?.isWatched ? player.nameTag : null, dependencies);
        }
    } catch (error) {
        player.sendMessage(`§cAn error occurred while executing command '${finalCommandName}'. Please report this.`);
        console.error(`[CommandManager] Error executing command ${finalCommandName} for player ${player.nameTag}: ${error.stack || error}`);
        if (playerUtils.debugLog) {
            playerUtils.debugLog(`Error executing command ${finalCommandName} for ${player.nameTag}: ${error.message || error}`, null, dependencies);
        }
        logManager.addLog('command_execution_error', {
            command: finalCommandName,
            player: player.nameTag,
            args: args,
            error: error.message,
            stack: error.stack
        }, dependencies);
    }
}
