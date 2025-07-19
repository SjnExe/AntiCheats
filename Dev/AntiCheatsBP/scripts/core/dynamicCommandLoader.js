/**
 * @file Handles the dynamic loading of command modules.
 * @module AntiCheatsBP/scripts/core/dynamicCommandLoader
 */

import { commandAliases } from '../config.js';
import { commandDefinitionMap, commandExecutionMap, commandFilePaths } from './commandManager.js';

/**
 * Dynamically loads a command module by name.
 * @param {string} commandName The name of the command to load (case-insensitive).
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 * @returns {Promise<{definition: import('../types.js').CommandDefinition, execute: import('../types.js').CommandExecuteFunction}|null>} The command's definition and execute function, or null if loading fails.
 */
export async function loadCommand(commandName, dependencies) {
    const { playerUtils } = dependencies;
    const { debugLog } = playerUtils;
    const lowerCaseCommandName = commandName.toLowerCase();

    // Resolve alias to a main command name
    const resolvedCommandName = commandAliases.get(lowerCaseCommandName) || lowerCaseCommandName;

    // Check if the command is already loaded
    if (commandDefinitionMap.has(resolvedCommandName)) {
        debugLog(`[DynamicCommandLoader] '${resolvedCommandName}' already loaded in memory.`, null, dependencies);
        return {
            definition: commandDefinitionMap.get(resolvedCommandName),
            execute: commandExecutionMap.get(resolvedCommandName),
        };
    }

    const commandPath = commandFilePaths.get(resolvedCommandName);
    if (!commandPath) {
        debugLog(`[DynamicCommandLoader] No path found for command '${resolvedCommandName}'.`, null, dependencies);
        return null; // Command does not exist in the registry
    }

    try {
        debugLog(`[DynamicCommandLoader] Dynamically importing '${resolvedCommandName}' from ${commandPath}...`, null, dependencies);
        const cmdModule = await import(commandPath);

        if (cmdModule?.definition?.name && typeof cmdModule.definition.name === 'string' && typeof cmdModule.execute === 'function') {
            const cmdNameLower = cmdModule.definition.name.toLowerCase();

            // Check for name consistency between registry and module
            if (cmdNameLower !== resolvedCommandName) {
                console.error(`[DynamicCommandLoader CRITICAL] Command name mismatch for ${resolvedCommandName}: Module exported '${cmdNameLower}'. Aborting load for this command.`);
                return null;
            }

            // Store the loaded command definition and execution function
            commandDefinitionMap.set(cmdNameLower, cmdModule.definition);
            commandExecutionMap.set(cmdNameLower, cmdModule.execute);

            debugLog(`[DynamicCommandLoader] Successfully loaded and cached command '${cmdNameLower}'.`, null, dependencies);
            return { definition: cmdModule.definition, execute: cmdModule.execute };
        }
        console.error(`[DynamicCommandLoader CRITICAL] Invalid module structure for command '${resolvedCommandName}' at path ${commandPath}. Module: ${JSON.stringify(cmdModule)}`);
        return null;

    } catch (error) {
        console.error(`[DynamicCommandLoader CRITICAL] Failed to load command module for '${resolvedCommandName}' from ${commandPath}: ${error.stack || error}`);
        return null;
    }
}
