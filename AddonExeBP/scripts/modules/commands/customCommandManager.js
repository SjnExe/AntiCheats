import { system } from '@minecraft/server';
import {
    CustomCommandParamType
} from '@minecraft/server';
import { getPlayer } from '../../core/playerDataManager.js';
import { getConfig } from '../../core/configManager.js';

/**
 * Manages the registration and execution of both slash and chat commands.
 */
class CustomCommandManager {
    constructor() {
        console.log('[CustomCommandManager] Initializing...');
        this.commands = [];
        this.aliases = new Map();
        this.prefix = 'x'; // Namespace for all custom commands
        this.registry = null;
        this.queue = [];

        system.beforeEvents.startup.subscribe(event => {
            console.log('[CustomCommandManager] Startup event fired.');
            this.registry = event.customCommandRegistry;
            this.processQueue();
        });
    }

    processQueue() {
        console.log(`[CustomCommandManager] Processing registration queue with ${this.queue.length} commands...`);
        this.queue.forEach(command => this.registerSlashCommand(command));
        this.queue = []; // Clear the queue
    }

    registerSlashCommand(command) {
        if (!this.registry) {
            console.warn(`[CustomCommandManager] Registry not available, queuing command '${command.name}'.`);
            this.queue.push(command);
            return;
        }

        if (command.disableSlashCommand) {
            console.log(`[CustomCommandManager] Skipping slash command registration for '${command.name}' because it is disabled.`);
            return;
        }

        console.log(`[CustomCommandManager] Registering slash command '${command.name}'...`);
        try {
            const commandData = this.prepareCommandData(command);
            const commandCallback = (commandExecuteData) => this.executeCommand(command, commandExecuteData, true);
            this.registry.registerCommand(commandData, commandCallback);
            console.log(`[CustomCommandManager] Successfully registered slash command '${command.name}'.`);
        } catch (e) {
            console.error(`[CustomCommandManager] Failed to register slash command '${command.name}': ${e.stack}`);
        }
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
     * @param {boolean} isSlashCommand Whether the command was executed as a slash command.
     * @private
     */
    executeCommand(command, commandExecuteData, isSlashCommand) {
        const player = commandExecuteData.sender;

        const pData = getPlayer(player.id);
        if (!pData || pData.permissionLevel > command.permissionLevel) {
            player.sendMessage('§cYou do not have permission to use this command.');
            return;
        }

        system.run(() => {
            try {
                const args = isSlashCommand ? commandExecuteData.parameters : commandExecuteData.args;
                command.execute(player, args);
            } catch (error) {
                console.error(`[CustomCommandManager] Error executing command '${command.name}': ${error.stack}`);
                player.sendMessage('§cAn unexpected error occurred while running this command.');
            }
        });
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

        const args = message.slice(config.commandPrefix.length).trim().split(/ +/);
        let commandName = args.shift().toLowerCase();

        if (this.aliases.has(commandName)) {
            commandName = this.aliases.get(commandName);
        }

        const command = this.commands.find(c => c.name === commandName);

        if (!command) {
            return false;
        }

        const commandExecuteData = {
            sender: player,
            args: args
        };

        this.executeCommand(command, commandExecuteData, false);
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
     * @returns {string} The corresponding permission level string.
     * @private
     */
    translatePermissionLevel(level) {
        if (level > 1000) { // Assuming 1024 is for everyone
            return 'Any';
        } else {
            return 'Admin';
        }
    }

    /**
     * Registers a new command.
     * @param {object} commandOptions
     */
    register(commandOptions) {
        console.log(`[CustomCommandManager] Registering command '${commandOptions.name}'...`);
        const command = { permissionLevel: 0, ...commandOptions };
        this.commands.push(command);

        if (command.aliases) {
            for (const alias of command.aliases) {
                this.aliases.set(alias.toLowerCase(), command.name);
            }
        }

        this.registerSlashCommand(command);
    }
}

export const customCommandManager = new CustomCommandManager();
