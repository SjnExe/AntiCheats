/**
 * Defines the !version command to display the AntiCheat addon version.
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
 */
export async function execute(player, _args, dependencies) {
    const { config, permissionLevels } = dependencies;
    player.sendMessage(`§7AntiCheat Addon Version: §e${config.acVersion || "N/A"}`);
}
