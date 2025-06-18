/**
 * @file AntiCheatsBP/scripts/commands/version.js
 * Defines the !version command to display the AntiCheat addon version.
 * @version 1.0.3
 */
// permissionLevels and getString are now accessed via dependencies

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "version",
    syntax: "!version",
    description: "Displays the AntiCheat addon version.", // Static fallback
    permissionLevel: 1, // Admin level as static fallback
    enabled: true,
};

/**
 * Executes the version command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} _args The command arguments (unused in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) {
    const { config, getString, permissionLevels } = dependencies; // Destructure getString and permissionLevels
    // Definition properties can be dynamically set here by commandManager or if needed:
    // definition.description = getString("command.version.description");
    // definition.permissionLevel = permissionLevels.admin;

    player.sendMessage(getString("command.version.message", { version: config.acVersion || getString("command.myflags.value.notApplicable") }));
}
