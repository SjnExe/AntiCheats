import { CommandError } from '../../types.js';

/**
 * A standardized executor for common player-on-player moderation commands (kick, ban, etc.).
 * This function handles argument parsing, target validation, permission checks, and logging.
 *
 * @param {import('@minecraft/server').Player | null} player The player issuing the command. Can be null for system/automod.
 * @param {string[]} args The command arguments.
 * @param {import('../../types.js').Dependencies} dependencies The addon's dependencies.
 * @param {object} options The options for this specific command execution.
 * @param {string} options.commandName The name of the command (e.g., 'kick', 'ban').
 * @param {number} options.minArgs The minimum number of arguments required.
 * @param {string} options.usageMessageKey The key for the usage message string.
 * @param {(targetPlayer: import('@minecraft/server').Player, reason: string, duration?: number) => void} options.executeAction The core action to perform on the target player.
 * @param {object} [options.duration] Options for parsing a duration argument.
 * @param {number} [options.duration.argIndex=1] The index of the duration argument.
 * @param {string} [options.duration.default='perm'] The default duration string if not provided.
 * @param {string} [invokedBy='PlayerCommand'] Who or what invoked the command.
 */
export function executePlayerModerationCommand(player, args, dependencies, options, invokedBy = 'PlayerCommand') {
    const { playerUtils, rankManager, getString, logManager, config } = dependencies;
    const { commandName, minArgs, usageMessageKey, executeAction, duration } = options;

    const issuerName = player?.nameTag ?? (invokedBy === 'AutoMod' ? 'AutoMod' : 'System');
    const prefix = config?.prefix ?? '!';

    if (args.length < minArgs) {
        throw new CommandError(getString(usageMessageKey, { prefix, commandName }));
    }

    const targetPlayerName = args[0];
    let reason;
    let durationMs = Infinity;

    // Standard player & reason parsing
    const reasonArgIndex = duration ? duration.argIndex + 1 : 1;
    const parsedArgs = playerUtils.parsePlayerAndReasonArgs(args, reasonArgIndex, `command.${commandName}.defaultReason`, dependencies);
    reason = parsedArgs.reason;

    // Duration parsing if applicable
    if (duration) {
        const durationString = args[duration.argIndex] || duration.default;
        const parsedDuration = playerUtils.parseDuration(durationString);
        if (parsedDuration === null || (parsedDuration <= 0 && parsedDuration !== Infinity)) {
            throw new CommandError(getString(`command.${commandName}.invalidDuration`));
        }
        durationMs = parsedDuration;
    }

    // Target validation
    const targetPlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName });
    if (!targetPlayer) {
        // validateCommandTarget sends its own messages, so we just exit.
        return;
    }

    // Permission check
    if (player) {
        const permCheck = rankManager.canAdminActionTarget(player, targetPlayer, commandName, dependencies);
        if (!permCheck.allowed) {
            throw new CommandError(getString(permCheck.messageKey || `command.${commandName}.noPermission`, permCheck.messageParams));
        }
    }

    // Execute the core action
    try {
        executeAction(targetPlayer, reason, durationMs);

        // Standard success logging and notifications can be added here later
        // For now, the core action will handle them until more commands are refactored.

    } catch (e) {
        console.error(`[${commandName}Command CRITICAL] Error executing command by ${issuerName}: ${e.stack || e}`);
        logManager?.addLog({
            actionType: `error.cmd.${commandName}.execFail`,
            context: `${commandName}Command.execute`,
            adminName: issuerName,
            targetName: targetPlayerName,
            details: {
                errorCode: `CMD_${commandName.toUpperCase()}_EXEC_FAIL`,
                message: e.message,
                rawErrorStack: e.stack || e.toString(),
            },
        }, dependencies);
        throw new CommandError(getString(`command.${commandName}.error`, { playerName: targetPlayerName, errorMessage: e.message }));
    }
}
