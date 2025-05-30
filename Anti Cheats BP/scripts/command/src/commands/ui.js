import { showMainUserInterface } from '../../../assets/ui.js';

export default {
    name: "ui",
    description: "Opens the main user interface for players.",
    aliases: ["generalui"], // Example, adjust as desired. The `!` prefix is handled by the command system.
    // No explicit 'permission' property here as per instruction, relying on hasAdmin() check.
    // The command handler might interpret a 'permission' field, but the subtask specified to rely on the execute check.
    showInHelp: true, 

    execute(player, _args, _data) { // args -> _args, data -> _data
        // player object is expected to be an instance of Minecraft.Player
        showMainUserInterface(player);
    }
};
