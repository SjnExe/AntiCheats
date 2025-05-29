import CONFIG from "../config.js";

let commands = {};

/**
 * Registers a new command for the command handler.
 *
 * @param {object} obj - The command configuration object.
 * @param {string} obj.name - The unique name of the command. This is how the command will be identified internally and typically invoked (before aliasing).
 * @param {string} obj.description - A brief description of what the command does. This is used in help commands. If not provided, a default message is logged and used.
 * @param {function(object): void} obj.run - The function to execute when the command is called. This function will receive an object containing `args` (array of command arguments including command name), `player` (the player object who executed the command), and `message` (the raw message string). For the 'help' command, it also receives `commandsData`.
 * @param {boolean} [obj.disabled=false] - If true, the command will not be registered. Defaults to false.
 * @param {boolean} [obj.adminOnly=true] - If true, only players with admin privileges (checked via `player.hasAdmin()`) can execute the command. Defaults to true.
 * @param {boolean} [obj.ownerOnly=false] - If true, only the player designated as the owner (checked via `player.isOwner()`) can execute the command. This typically overrides `adminOnly`. Defaults to false.
 * @throws {TypeError} If the `obj` parameter is not an object.
 * @returns {void} Logs an error if a command with the same name already exists or if the description is missing, but does not throw an error for these cases.
 */
export function newCommand(obj){
    if(typeof obj !== "object") throw TypeError(`The function "newCommand()" takes in an object as a parameter`);
    if(obj.disabled) return;
    if(commands[obj.name]) return console.error(`§4[Anti Cheats] A command named "${obj.name}" already exists!`)
    if(!obj.description) {
        obj.description = "No description provided";
        console.error(`§4[Anti Cheats] The command "${obj.name}" does not have a description!`)
    }
    if(obj.adminOnly !== false) obj.adminOnly = true;
    commands[obj.name] = obj;
}

/**
 * Retrieves an array of objects containing help information for all registered commands.
 * This data is typically used by the 'help' command.
 *
 * @returns {Array<object>} An array where each object represents a command and contains its
 *                          `name`, `description`, `adminOnly`, and `ownerOnly` properties.
 *                          Returns an empty array if no commands are registered.
 */
export function getHelpData() {
    const helpData = [];
    for (const commandName in commands) {
      const command = commands[commandName];
      helpData.push({ name: command.name, description: command.description, adminOnly: command.adminOnly, ownerOnly: command.ownerOnly });
    }
    return helpData;
}

/**
 * Handles incoming chat messages to execute registered commands.
 * It checks for the command prefix, resolves aliases, and verifies permissions
 * before running the command's associated function.
 *
 * @param {object} data - The data object typically received from a chat event.
 * @param {Minecraft.Player} data.sender - The player who sent the message.
 * @param {string} data.message - The raw message string sent by the player.
 * @returns {void} Sends a message to the player if the command is unknown,
 *                 if they lack permissions, or if an error occurs during command execution.
 */
export function commandHandler(data){
    const prefix = CONFIG.chat.prefix;
    const player = data.sender;
	const message = data.message;
    const args = message.substring(prefix.length).split(" ");
    const cmdName = args[0];

    let actualCmdName = cmdName;
    const commandAliases = CONFIG.aliases;
    if (commandAliases && commandAliases[cmdName]) {
        actualCmdName = commandAliases[cmdName];
    }

    const command = commands[actualCmdName];

    // If 'command' is not found, it means neither the typed alias nor the resolved actualCmdName is a valid command.
    // In this case, showing what the user typed (cmdName, which is args[0]) is appropriate.
    if (!command) return player.sendMessage(`§r§6[§eAnti Cheats§6]§c Unknown command: §f${args[0]}`);

    let runData = {
        args: args,
        player: player,
        message: message
    }
    // If the actual command is 'help', pass commandsData. Note: alias 'h' would resolve actualCmdName to 'help'.
    if(actualCmdName == "help") runData.commandsData = getHelpData(); 

    if(command.adminOnly && !player.hasAdmin()) return player.sendMessage('§6[§eAnti Cheats§6]§r§c You need admin tag to run this!');
    if (command.ownerOnly && !player.isOwner()) return player.sendMessage('§6[§eAnti Cheats§6]§r§c You need owner status to run this!')

    try{
        command.run(runData);
    }
    catch(error){
        // Report the error with the actual command name that was executed.
        player.sendMessage(`§6[§eAnti Cheats§6]§r§c Caught error while running command "${actualCmdName}":\n\n${error}\n${error.stack}`);
    }
}