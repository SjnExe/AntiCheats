import { system } from '@minecraft/server';
import {
    CommandPermissionLevel,
    CustomCommandParamType
} from '@minecraft/server';
import { getPlayer } from '../../core/playerDataManager.js';
import { getConfig } from '../../core/configManager.js';
import { errorLog } from '../../core/errorLogger.js';

/**
 * Manages the registration and execution of both slash and chat commands.
 */
class CommandManager {
    constructor() {
        this.commands = [];
        this.aliases = new Map();
        this.prefix = 'exe'; // Namespace for all custom commands

        system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
            this.commands.forEach(command => {
                if (command.disableSlashCommand) {return;}

                // Register the primary command name
                this.registerSlashCommand(customCommandRegistry, command, command.slashName || command.name);

                // Register all aliases as separate slash commands
                if (command.aliases) {
                    command.aliases.forEach(alias => {
                        if (command.disabledSlashAliases && command.disabledSlashAliases.includes(alias)) {
                            return; // Skip slash command registration for this alias
                        }
                        this.registerSlashCommand(customCommandRegistry, command, alias);
                    });
                }
            });
        });
    }

    /**
     * Registers a single slash command or alias.
     * @param {object} customCommandRegistry The registry object from the startup event.
     * @param {object} command The command definition.
     * @param {string} name The name to register (either primary or an alias).
     * @private
     */
    registerSlashCommand(customCommandRegistry, command, name) {
        const commandData = this.prepareCommandData(command, name);

        const commandCallback = (origin, ...args) => {
            const player = origin.sourceEntity;
            if (!player) {
                return;
            }

            const pData = getPlayer(player.id);
            if (!pData || pData.permissionLevel > command.permissionLevel) {
                player.sendMessage('§cYou do not have permission to use this command.');
                return;
            }

            const mandatoryParams = command.parameters?.filter(p => !p.optional) || [];
            const optionalParams = command.parameters?.filter(p => p.optional) || [];
            const allParams = [...mandatoryParams, ...optionalParams];

            const parsedArgs = {};
            for (let i = 0; i < allParams.length; i++) {
                if (args[i] !== undefined) {
                    parsedArgs[allParams[i].name] = args[i];
                }
            }

            system.run(() => {
                try {
                    command.execute(player, parsedArgs);
                } catch (error) {
                    if (getConfig().debug) {
                        errorLog(`[CommandManager] Error executing slash command '${name}': ${error.stack}`);
                    }
                    player.sendMessage('§cAn unexpected error occurred while running this command.');
                }
            });
        };

        try {
            customCommandRegistry.registerCommand(commandData, commandCallback);
        } catch (e) {
            // We expect an error if an alias conflicts with a vanilla command, which is fine.
            if (e.toString().includes('already in use')) {
                // Do nothing, this is expected for some aliases.
            } else {
                if (getConfig().debug) {
                    errorLog(`[CommandManager] Failed to register slash command '${name}':`, e);
                }
            }
        }
    }

    /**
     * Prepares the command data for registration with the Minecraft API.
     * @param {object} command The command definition.
     * @param {string} nameOverride The specific name to use for this registration (main name or alias).
     * @returns {object} The formatted command data.
     * @private
     */
    prepareCommandData(command, nameOverride) {
        const slashCommandName = nameOverride || command.slashName || command.name;
        const mandatoryParameters = (command.parameters || []).filter(p => !p.optional).map(p => this.formatParameter(p));
        const optionalParameters = (command.parameters || []).filter(p => p.optional).map(p => this.formatParameter(p));

        return {
            name: `${this.prefix}:${slashCommandName}`,
            description: command.description,
            permissionLevel: this.translatePermissionLevel(command.permissionLevel),
            mandatoryParameters,
            optionalParameters
        };
    }

    /**
     * Handles an incoming chat message and schedules it for execution if it's a valid command.
     * @param {import('@minecraft/server').BeforeChatSendEvent} eventData The chat event data.
     * @returns {boolean} `true` if the message was a command, otherwise `false`.
     */
    handleChatCommand(eventData) {
        const config = getConfig();
        const { sender: player, message } = eventData;
        if (!message.startsWith(config.commandPrefix)) {
            return false;
        }

        eventData.cancel = true;

        const rawArgs = message.slice(config.commandPrefix.length).trim().split(/ +/);
        let commandName = rawArgs.shift().toLowerCase();

        if (this.aliases.has(commandName)) {
            commandName = this.aliases.get(commandName);
        }

        const command = this.commands.find(c => c.name === commandName);

        if (!command) {
            player.sendMessage(`§cUnknown command: ${commandName}`);
            return false;
        }

        // Permission Check for chat command
        const pData = getPlayer(player.id);
        if (!pData || pData.permissionLevel > command.permissionLevel) {
            player.sendMessage('§cYou do not have permission to use this command.');
            return true; // Command was handled, just no permission
        }

        // For consistency, parse chat arguments into an object like slash commands do.
        const mandatoryParams = command.parameters?.filter(p => !p.optional) || [];
        const optionalParams = command.parameters?.filter(p => p.optional) || [];
        const allParams = [...mandatoryParams, ...optionalParams];

        const parsedArgs = {};
        for (let i = 0; i < allParams.length; i++) {
            if (rawArgs[i] !== undefined) {
                parsedArgs[allParams[i].name] = rawArgs[i];
            }
        }

        system.run(() => {
            try {
                command.execute(player, parsedArgs);
            } catch (error) {
                if (getConfig().debug) {
                    errorLog(`[CommandManager] Error executing chat command '${command.name}': ${error.stack}`);
                }
                player.sendMessage('§cAn unexpected error occurred while running this command.');
            }
        });

        return true;
    }

    /**
     * Formats a parameter for registration with the Minecraft API.
     * @param {object} param The parameter definition.
     * @returns {object} The formatted parameter data.
     * @private
     */
    formatParameter(param) {
        const paramTypeMap = {
            'player': CustomCommandParamType.PlayerSelector,
            'string': CustomCommandParamType.String,
            'int': CustomCommandParamType.Integer,
            'float': CustomCommandParamType.Float,
            'boolean': CustomCommandParamType.Boolean,
            'block': CustomCommandParamType.BlockType,
            'item': CustomCommandParamType.ItemType,
            'position': CustomCommandParamType.Position,
            'target': CustomCommandParamType.PlayerSelector
        };

        const type = paramTypeMap[param.type.toLowerCase()];

        if (!type) {
            errorLog(`[CommandManager] Unknown parameter type '${param.type}' for parameter '${param.name}'. Defaulting to String.`);
            return {
                name: param.name,
                type: CustomCommandParamType.String
            };
        }

        return {
            name: param.name,
            type: type
        };
    }

    /**
     * Translates the numeric permission level to the API's enum.
     * @param {number} level The numeric permission level.
     * @returns {CommandPermissionLevel} The corresponding enum value.
     * @private
     */
    translatePermissionLevel(level) {
        if (level > 1000) { // Assuming 1024 is for everyone
            return CommandPermissionLevel.Any;
        } else {
            return CommandPermissionLevel.Admin;
        }
    }

    /**
     * Registers a new command.
     * @param {object} commandOptions
     */
    register(commandOptions) {
        const command = { permissionLevel: 0, ...commandOptions };
        this.commands.push(command);

        if (command.aliases) {
            for (const alias of command.aliases) {
                this.aliases.set(alias.toLowerCase(), command.name);
            }
        }
    }
}

export const commandManager = new CommandManager();
