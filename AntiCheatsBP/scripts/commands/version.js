/**
 * @file AntiCheatsBP/scripts/commands/version.js
 * Defines the !version command to display the AntiCheat addon version.
 * @version 1.0.3
 */
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "version",
    syntax: "!version",
    description: "Displays the AntiCheat addon version.",
    permissionLevel: 1,
    enabled: true,
};
/**
 * Executes the version command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} _args The command arguments (unused in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) {
    const { config, permissionLevels } = dependencies;
    player.sendMessage(`§7AntiCheat Addon Version: §e${config.acVersion || "N/A"}`);
}
