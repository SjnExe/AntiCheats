import { system } from '@minecraft/server';
import {
    CommandPermissionLevel,
    CustomCommandParamType
} from '@minecraft/server';
import { getPlayer } from '../../core/playerDataManager.js';
import { getConfig } from '../../core/configManager.js';

/**
 * Manages the registration and execution of both slash and chat commands.
 */
class CustomCommandManager {
    constructor() {
        this.commands = [];
        this.aliases = new Map();
        this.prefix = 'exe'; // Namespace for all custom commands

        system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
            this.commands.forEach(command => {
                if (command.disableSlashCommand) return;

                const commandData = this.prepareCommandData(command);

                // The actual callback that will be executed by the game
                const commandCallback = (origin, ...args) => {
                    const player = origin.sourceEntity;

                    // This can happen if the command is run from a command block
                    if (!player) {
                        console.warn(`Command '${command.name}' executed by a non-player entity.`);
                        return;
                    }

                    // Permission Check
                    const pData = getPlayer(player.id);
                    if (!pData || pData.permissionLevel > command.permissionLevel) {
                        player.sendMessage('§cYou do not have permission to use this command.');
                        return;
                    }

                    // The game API passes arguments as a flat array. We need to map them to an object
                    // based on the parameter definitions for our command's execute function.
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
                            console.error(`[CustomCommandManager] Error executing slash command '${command.name}': ${error.stack}`);
                            player.sendMessage('§cAn unexpected error occurred while running this command.');
                        }
                    });
                };

                try {
                    customCommandRegistry.registerCommand(commandData, commandCallback);
                } catch (e) {
                    console.error(`[CustomCommandManager] Failed to register slash command '${command.name}':`, e);
                }
            });
        });
    }

    /**
     * Prepares the command data for registration with the Minecraft API.
     * @param {object} command The command definition.
     * @returns {object} The formatted command data.
     * @private
     */
    prepareCommandData(command) {
        const slashCommandName = command.slashName || command.name;
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
                console.error(`[CustomCommandManager] Error executing chat command '${command.name}': ${error.stack}`);
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
            console.warn(`[CustomCommandManager] Unknown parameter type '${param.type}' for parameter '${param.name}'. Defaulting to String.`);
            return {
                name: param.name,
                type: CustomCommandParamType.String,
            };
        }

        return {
            name: param.name,
            type: type,
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

export const customCommandManager = new CustomCommandManager();
