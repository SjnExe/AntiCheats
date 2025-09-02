import { system } from '@minecraft/server';
import {
    CustomCommandPermissionLevel,
    CustomCommandParamType
} from '@minecraft/server';
import { getPlayer } from '../../core/playerDataManager.js';

/**
 * Manages the registration and execution of custom slash commands.
 */
class CustomCommandManager {
    constructor() {
        this.commands = [];
        this.prefix = 'exe'; // Namespace for all custom commands

        system.beforeEvents.startup.subscribe(event => {
            this.commands.forEach(command => {
                const commandData = this.prepareCommandData(command);
                const commandCallback = (commandExecuteData) => this.executeCommand(command, commandExecuteData);
                event.customCommandRegistry.registerCommand(commandData, commandCallback);
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
        const mandatoryParameters = (command.parameters || []).filter(p => !p.optional).map(p => this.formatParameter(p));
        const optionalParameters = (command.parameters || []).filter(p => p.optional).map(p => this.formatParameter(p));

        return {
            name: `${this.prefix}:${command.name}`,
            description: command.description,
            permissionLevel: this.translatePermissionLevel(command.permissionLevel),
            mandatoryParameters,
            optionalParameters
        };
    }

    /**
     * Executes a registered command.
     * @param {object} command The command definition.
     * @param {object} commandExecuteData The data from the command execution event.
     * @private
     */
    executeCommand(command, commandExecuteData) {
        const player = commandExecuteData.sender;

        const pData = getPlayer(player.id);
        if (!pData || pData.permissionLevel > command.permissionLevel) {
            player.sendMessage('§cYou do not have permission to use this command.');
            return;
        }

        system.run(() => {
            try {
                const args = commandExecuteData.parameters;
                command.execute(player, args);
            } catch (error) {
                console.error(`[CustomCommandManager] Error executing command '${command.name}': ${error.stack}`);
                player.sendMessage('§cAn unexpected error occurred while running this command.');
            }
        });
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
     * @returns {CustomCommandPermissionLevel} The corresponding enum value.
     * @private
     */
    translatePermissionLevel(level) {
        if (level === 0) {
            return CustomCommandPermissionLevel.Any;
        } else {
            return CustomCommandPermissionLevel.Admin;
        }
    }

    /**
     * Registers a new custom slash command.
     * @param {object} commandOptions
     * @param {string} commandOptions.name The primary name of the command.
     * @param {string} [commandOptions.description] A brief description of what the command does.
     * @param {number} [commandOptions.permissionLevel=0] The minimum permission level required to use the command.
     * @param {object[]} [commandOptions.parameters=[]] A list of parameters for the command.
     * @param {(player: import('@minecraft/server').Player, args: object) => void} commandOptions.execute The function to run when the command is executed.
     */
    register(commandOptions) {
        this.commands.push({ permissionLevel: 0, ...commandOptions });
    }
}

export const customCommandManager = new CustomCommandManager();
