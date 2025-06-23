/**
 * Defines the !setlang command for changing the server's default language for AntiCheat messages.
 * This command is currently non-functional.
 */
// permissionLevels, getString, setCurrentLanguage, and translations were previously accessed via dependencies or specific i18n import.
// i18n.js has been removed, so these imports are no longer valid or needed.
export const definition = {
    name: "setlang",
    description: "This command is no longer functional.",
    aliases: ["setlanguage"],
    permissionLevel: 1, // Admin
    requiresCheats: false,
    syntax: "!setlang", // Simplified as it takes no args now
    parameters: [],
    enabled: false, // Command is disabled
};

export async function execute(player, args, dependencies) {
    const { playerUtils } = dependencies; // getString, etc. removed
    // Inform user command is deprecated/removed
    playerUtils.warnPlayer(player, "§cThe !setlang command has been removed as multi-language support is no longer available.");
    // Optionally log the attempt if desired
    if (dependencies.logManager) {
        dependencies.logManager.addLog({
            adminName: player.nameTag,
            actionType: 'command_attempt_disabled',
            targetName: 'setlang',
            details: `Attempted to use disabled command: !setlang ${args.join(" ")}`
        }, dependencies);
    }
}
