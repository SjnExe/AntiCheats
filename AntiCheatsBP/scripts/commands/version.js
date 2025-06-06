// AntiCheatsBP/scripts/commands/version.js
import { permissionLevels } from '../core/rankManager.js';

export const definition = {
    name: "version",
    syntax: "!version",
    description: "Displays addon version.",
    permissionLevel: permissionLevels.ADMIN
};

export async function execute(player, args, dependencies) {
    const { config } = dependencies;
    player.sendMessage(`§7AntiCheat Addon Version: §e${config.acVersion || 'Not Set'}`);
}
