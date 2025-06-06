import * as mc from '@minecraft/server';
import { permissionLevels } from './rankManager.js';
import { getPlayerPermissionLevel, findPlayer, parseDuration } from '../utils/playerUtils.js'; // Import newly moved functions
import { addLog } from './logManager.js';
import * as reportManager from './reportManager.js';
import { ActionFormData, MessageFormData, ModalFormData } from '@minecraft/server-ui';
import { ItemComponentTypes } from '@minecraft/server';

// Import command modules from the new registry
import { commandModules } from '../commands/commandRegistry.js';

// Dynamically build allCommands from loaded modules
/**
 * Array containing all command definitions loaded from modules.
 * @type {import('../types.js').CommandDefinition[]}
 */
let allCommands = [];
if (commandModules && Array.isArray(commandModules)) {
    for (const cmdModule of commandModules) {
        if (cmdModule && cmdModule.definition && typeof cmdModule.definition.name === 'string') {
            allCommands.push(cmdModule.definition);
        } else {
            // console.warn(`[CommandManager] A module in commandRegistry is missing a valid definition or name.`);
        }
    }
} else {
    console.error("[CommandManager] commandModules is not an array or is undefined. No commands loaded from modules.");
}
// console.log(`[CommandManager] Dynamically loaded ${allCommands.length} command definitions.`);

// findPlayer and parseDuration are now imported from playerUtils.js

/**
 * Handles incoming chat messages to process potential commands.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat send event data.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} uiManager Manager for UI forms.
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 */
export async function handleChatCommand(eventData, playerDataManager, uiManager, config, playerUtils) {
    const player = eventData.sender;
    const message = eventData.message;
    const args = message.substring(config.prefix.length).trim().split(/\s+/);
    let commandName = args.shift()?.toLowerCase();

    const senderPDataForLog = playerDataManager.getPlayerData(player.id);
    if (playerUtils && playerUtils.debugLog) {
        playerUtils.debugLog(`Player ${player.nameTag} issued attempt: ${commandName || ''} with args: ${args.join(', ')}`, senderPDataForLog?.isWatched ? player.nameTag : null);
    }

    if (commandName && config.commandAliases && config.commandAliases[commandName]) {
        const resolvedCommand = config.commandAliases[commandName];
        if (playerUtils && playerUtils.debugLog) {
            playerUtils.debugLog(`Command alias '${commandName}' resolved to '${resolvedCommand}'.`, player.nameTag);
        }
        commandName = resolvedCommand;
    }

    if (!commandName) {
        player.sendMessage(`§cPlease enter a command after the prefix. Type ${config.prefix}help.`);
        eventData.cancel = true;
        return;
    }

    const cmdDef = allCommands.find(c => c.name === commandName);

    if (!cmdDef) {
        player.sendMessage(`§cUnknown command: ${config.prefix}${commandName}§r. Type ${config.prefix}help.`);
        eventData.cancel = true;
        return;
    }

    const userPermissionLevel = getPlayerPermissionLevel(player); // getPlayerPermissionLevel is from playerUtils
    if (userPermissionLevel > cmdDef.permissionLevel) {
        if (playerUtils && playerUtils.warnPlayer) {
            playerUtils.warnPlayer(player, "You do not have permission to use this command.");
        } else {
            player.sendMessage("§cYou do not have permission to use this command.");
        }
        eventData.cancel = true;
        return;
    }

    eventData.cancel = true;

    const targetModule = commandModules.find(mod => mod.definition && mod.definition.name === commandName);

    if (targetModule && typeof targetModule.execute === 'function') {
        const dependencies = {
            mc,
            playerDataManager,
            uiManager,
            config,
            playerUtils, // Pass the whole playerUtils object
            addLog,
            getPlayerPermissionLevel, // Already imported and available in this scope
            permissionLevels, // Already imported and available in this scope
            findPlayer: playerUtils.findPlayer, // Explicitly pass from playerUtils
            parseDuration: playerUtils.parseDuration, // Explicitly pass from playerUtils
            ActionFormData,
            MessageFormData,
            ModalFormData,
            reportManager,
            allCommands: allCommands
        };
        try {
            await targetModule.execute(player, args, dependencies);
        } catch (e) {
            player.sendMessage(`§cAn error occurred while executing command '${commandName}'.`);
            console.error(`[CommandManager] Error executing command ${commandName}: ${e}${e.stack ? '\n' + e.stack : ''}`);
            if (playerUtils && playerUtils.debugLog) {
                playerUtils.debugLog(`Error executing command ${commandName} for ${player.nameTag}: ${e}`, null);
            }
        }
    } else {
        player.sendMessage(`§cError: Command '${commandName}' is defined but missing an executable module. Please contact an admin.`);
        console.error(`[CommandManager] Command ${commandName} found in allCommands but no matching executable module or execute function found in commandModules.`);
    }
}
