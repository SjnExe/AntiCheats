import { commandDefinitionMap, commandExecutionMap, commandFilePaths } from './commandManager.js';

/**
 * @param {string} commandName The name of the command to load (case-insensitive).
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 * @returns {Promise<{definition: import('../types.js').CommandDefinition, execute: import('../types.js').CommandExecuteFunction}|null>} The command's definition and execute function, or null if loading fails.
 */
export async function loadCommand(commandName, dependencies) {
    const { playerUtils } = dependencies;
    const { debugLog } = playerUtils;
    const commandNameLower = commandName.toLowerCase();

    if (commandDefinitionMap.has(commandNameLower)) {
        debugLog(`[DynamicCommandLoader] '${commandNameLower}' already loaded in memory.`, null, dependencies);
        return {
            definition: commandDefinitionMap.get(commandNameLower),
            execute: commandExecutionMap.get(commandNameLower),
        };
    }

    const commandPath = commandFilePaths.get(commandNameLower);
    if (!commandPath) {
        debugLog(`[DynamicCommandLoader] No path found for command '${commandNameLower}'.`, null, dependencies);
        return null;
    }

    try {
        debugLog(`[DynamicCommandLoader] Dynamically importing '${commandNameLower}' from ${commandPath}...`, null, dependencies);
        const cmdModule = await import(commandPath);

        if (cmdModule?.definition?.name && typeof cmdModule.definition.name === 'string' && typeof cmdModule.execute === 'function') {
            const cmdNameLower = cmdModule.definition.name.toLowerCase();

            if (cmdNameLower !== commandNameLower) {
                console.error(`[DynamicCommandLoader CRITICAL] Command name mismatch for ${commandNameLower}: Module exported '${cmdNameLower}'. Aborting load for this command.`);
                return null;
            }

            commandDefinitionMap.set(cmdNameLower, cmdModule.definition);
            commandExecutionMap.set(cmdNameLower, cmdModule.execute);

            debugLog(`[DynamicCommandLoader] Successfully loaded and cached command '${cmdNameLower}'.`, null, dependencies);
            return { definition: cmdModule.definition, execute: cmdModule.execute };
        }
        console.error(`[DynamicCommandLoader CRITICAL] Invalid module structure for command '${commandNameLower}' at path ${commandPath}. Module: ${JSON.stringify(cmdModule)}`);
        return null;

    } catch (error) {
        console.error(`[DynamicCommandLoader CRITICAL] Failed to load command module for '${commandNameLower}' from ${commandPath}: ${error.stack || error}`);
        return null;
    }
}
