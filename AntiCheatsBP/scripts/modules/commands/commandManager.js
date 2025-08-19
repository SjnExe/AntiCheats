import { world, system } from '@minecraft/server';
import { getPlayer } from '../../core/playerDataManager.js';

class CommandManager {
    constructor() {
        this.commands = new Map();
        this.aliases = new Map();
    }

    /**
     * Registers a new command.
     * @param {object} commandOptions
     * @param {string} commandOptions.name The primary name of the command.
     * @param {string[]} [commandOptions.aliases=[]] A list of alternative names for the command.
     * @param {string} commandOptions.description A brief description of what the command does.
     * @param {number} commandOptions.permissionLevel The minimum permission level required to use the command.
     * @param {(player: import('@minecraft/server').Player, args: string[]) => void} commandOptions.execute The function to run when the command is executed.
     */
    register(commandOptions) {
        const name = commandOptions.name.toLowerCase();
        if (this.commands.has(name)) {
            console.warn(`[CommandManager] Command '${name}' is already registered.`);
            return;
        }

        this.commands.set(name, commandOptions);

        if (commandOptions.aliases) {
            for (const alias of commandOptions.aliases) {
                const lowerAlias = alias.toLowerCase();
                if (this.aliases.has(lowerAlias)) {
                    console.warn(`[CommandManager] Alias '${lowerAlias}' is already registered.`);
                } else {
                    this.aliases.set(lowerAlias, name);
                }
            }
        }
    }

    /**
     * Handles an incoming chat message and schedules it for execution if it's a valid command.
     * @param {import('@minecraft/server').BeforeChatSendEvent} eventData The chat event data.
     * @param {object} config The addon's configuration object.
     * @returns {boolean} `true` if the message was a command, otherwise `false`.
     */
    handleCommand(eventData, config) {
        const { sender: player, message } = eventData;
        if (!message.startsWith(config.commandPrefix)) {
            return false; // Not a command, let chat formatting handle it.
        }

        eventData.cancel = true; // It's a command, so don't send it to public chat.

        const args = message.slice(config.commandPrefix.length).trim().split(/ +/);
        let commandName = args.shift().toLowerCase();

        // Check if the command name is an alias
        if (this.aliases.has(commandName)) {
            commandName = this.aliases.get(commandName);
        }

        const command = this.commands.get(commandName);

        if (!command) {
            player.sendMessage(`§cUnknown command. Type §a${config.commandPrefix}help§c for a list of commands.`);
            return true;
        }

        const pData = getPlayer(player.id);
        if (!pData || pData.permissionLevel > command.permissionLevel) {
            player.sendMessage('§cYou do not have permission to use this command.');
            return true;
        }

        // Schedule the command to run on the next tick to escape the read-only event context.
        system.run(() => {
            try {
                command.execute(player, args);
            } catch (error) {
                console.error(`[CommandManager] Error executing command '${commandName}': ${error.stack}`);
                player.sendMessage('§cAn unexpected error occurred while running this command.');
            }
        });

        return true;
    }
}

export const commandManager = new CommandManager();
