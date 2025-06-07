import * as mc from '@minecraft/server';
import { permissionLevels } from './rankManager.js';
import { getPlayerPermissionLevel, findPlayer, parseDuration } from '../utils/playerUtils.js';
import { addLog } from './logManager.js';
import * as reportManager from './reportManager.js';
import { ActionFormData, MessageFormData, ModalFormData } from '@minecraft/server-ui';
// ItemComponentTypes is not directly used in this file, consider removing if not needed by commands via dependencies.
// For now, keeping it as it might be part of the `dependencies` object passed to commands.
import { ItemComponentTypes } from '@minecraft/server';

// Import command modules from the commandRegistry
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
            const cmdName = cmdModule.definition.name.toLowerCase(); // Normalize command names to lowercase
            if (commandDefinitionMap.has(cmdName)) {
                console.warn(`[CommandManager] Duplicate command name detected and overwritten: ${cmdName}`);
            }
            commandDefinitionMap.set(cmdName, cmdModule.definition);
            commandExecutionMap.set(cmdName, cmdModule.execute);
        } else {
            // console.warn(`[CommandManager] A module in commandRegistry is missing a valid definition, name, or execute function.`);
        }
    }
    console.log(`[CommandManager] Dynamically loaded ${commandDefinitionMap.size} command definitions.`);
} else {
    console.error("[CommandManager] commandModules is not an array or is undefined. No commands loaded.");
}

/**
 * Handles incoming chat messages to process potential commands.
 * It parses the message, checks for command validity and permissions, and then executes the command.
 * @param {mc.ChatSendBeforeEvent} eventData - The chat send event data.
 * @param {import('./playerDataManager.js')} playerDataManager - Manager for player data operations.
 * @param {import('./uiManager.js')} uiManager - Manager for UI forms.
 * @param {import('../config.js').editableConfigValues} config - The server configuration object.
 * @param {import('../utils/playerUtils.js')} playerUtils - Utility functions for player interactions.
 */
export async function handleChatCommand(eventData, playerDataManager, uiManager, config, playerUtils) {
    const { sender: player, message } = eventData;
    const args = message.substring(config.prefix.length).trim().split(/\s+/);
    let commandNameInput = args.shift()?.toLowerCase(); // Normalize to lowercase immediately

    const senderPDataForLog = playerDataManager.getPlayerData(player.id);
    if (playerUtils.debugLog) { // Check if debugLog itself exists
        playerUtils.debugLog(`Player ${player.nameTag} issued command attempt: "${commandNameInput || ''}" with args: [${args.join(', ')}]`, senderPDataForLog?.isWatched ? player.nameTag : null);
    }

    if (!commandNameInput) {
        player.sendMessage(`§cPlease enter a command after the prefix. Type ${config.prefix}help for a list of commands.`);
        eventData.cancel = true;
        return;
    }

    // Resolve alias if it exists
    const aliasTarget = config.commandAliases?.[commandNameInput];
    const finalCommandName = aliasTarget ? aliasTarget.toLowerCase() : commandNameInput;

    if (aliasTarget && playerUtils.debugLog) {
        playerUtils.debugLog(`Command alias '${commandNameInput}' resolved to '${finalCommandName}'.`, player.nameTag);
    }

    const commandDef = commandDefinitionMap.get(finalCommandName);
    const commandExecute = commandExecutionMap.get(finalCommandName);

    if (!commandDef || !commandExecute) {
        player.sendMessage(`§cUnknown command: ${config.prefix}${finalCommandName}§r. Type ${config.prefix}help for assistance.`);
        eventData.cancel = true;
        return;
    }

    const userPermissionLevel = getPlayerPermissionLevel(player);
    if (userPermissionLevel > commandDef.permissionLevel) {
        playerUtils.warnPlayer(player, "You do not have permission to use this command.");
        eventData.cancel = true;
        return;
    }

    eventData.cancel = true; // Command is being handled, cancel original chat message

    const dependencies = {
        mc, // Minecraft server module
        playerDataManager,
        uiManager,
        config,
        playerUtils,
        addLog,
        // getPlayerPermissionLevel is already available in playerUtils
        permissionLevels, // permissionLevels enum/object
        // findPlayer and parseDuration are part of playerUtils
        ActionFormData, // UI Class
        MessageFormData, // UI Class
        ModalFormData, // UI Class
        reportManager,
        allCommands: Array.from(commandDefinitionMap.values()), // Provide array of definitions for help commands etc.
        commandDefinitionMap, // Provide the map for more direct lookups if needed by commands
        ItemComponentTypes // Provide ItemComponentTypes if commands might need it
    };

    try {
        await commandExecute(player, args, dependencies);
        if (playerUtils.debugLog) {
            playerUtils.debugLog(`Successfully executed command '${finalCommandName}' for ${player.nameTag}.`, senderPDataForLog?.isWatched ? player.nameTag : null);
        }
    } catch (error) {
        player.sendMessage(`§cAn error occurred while executing command '${finalCommandName}'. Please report this.`);
        console.error(`[CommandManager] Error executing command ${finalCommandName} for player ${player.nameTag}: ${error.stack || error}`);
        if (playerUtils.debugLog) {
            playerUtils.debugLog(`Error executing command ${finalCommandName} for ${player.nameTag}: ${error}`, null); // Context already known
        }
        // Optionally, log to logManager as well
        addLog('command_error', `Cmd: ${finalCommandName}, Player: ${player.nameTag}, Args: [${args.join(', ')}], Error: ${error.message}`);
    }
}
