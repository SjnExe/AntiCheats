import { executePlayerModerationCommand } from '../../modules/utils/index.js';
import { CommandError } from '../../types.js';

/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'ban',
    syntax: '<playername> [duration] [reason]',
    description: 'Bans a player for a specified duration (e.g., 7d, 2h, 30m, perm).',
    permissionLevel: 1, // admin
};

/**
 * Executes the ban command by wrapping the standardized moderation command executor.
 * @param {import('@minecraft/server').Player | null} player
 * @param {string[]} args
 * @param {import('../../types.js').Dependencies} dependencies
 * @param {string} [invokedBy]
 * @param {boolean} [isAutoModAction]
 * @param {string|null} [autoModCheckType]
 */
export function execute(
    player,
    args,
    dependencies,
    invokedBy = 'PlayerCommand',
    isAutoModAction = false,
    autoModCheckType = null,
) {
    const { config, playerUtils, playerDataManager, logManager, getString } = dependencies;
    const issuerName = player?.name ?? (invokedBy === 'AutoMod' ? 'AutoMod' : 'System');

    executePlayerModerationCommand(player, args, dependencies, {
        commandName: 'ban',
        minArgs: 1,
        usageMessageKey: 'command.ban.usage',
        duration: { argIndex: 1, default: 'perm' },
        /**
         * @param {import('@minecraft/server').Player} targetPlayer
         * @param {string} reason
         * @param {number} durationMs
         */
        executeAction: (targetPlayer, reason, durationMs) => {
            const targetPData = playerDataManager.getPlayerData(targetPlayer.id);
            if (!targetPData) {
                throw new CommandError(getString('command.ban.error.noPlayerData', { playerName: targetPlayer.nameTag }));
            }

            const bannedByForRecord = isAutoModAction ? 'AutoMod' : issuerName;
            const banAdded = playerDataManager.addPlayerStateRestriction(
                targetPlayer, targetPData, 'ban', durationMs, reason, bannedByForRecord,
                isAutoModAction, autoModCheckType, dependencies,
            );

            if (!banAdded) {
                throw new CommandError(getString('command.ban.failure', { playerName: targetPlayer.nameTag }));
            }

            // Post-action success logic
            const banInfo = targetPData.banInfo;
            const unbanTime = banInfo?.expiryTimestamp ?? (Date.now() + durationMs);
            const durationDisplay = durationMs === Infinity
                ? getString('ban.duration.permanent')
                : getString('ban.duration.expires', { expiryDate: new Date(unbanTime).toLocaleString() });

            // Kick the player with a detailed message
            /** @type {string[]} */
            const kickMessageParts = [
                getString('command.ban.kickMessage.header'),
                getString('command.ban.kickMessage.reason', { reason }),
                getString('command.ban.kickMessage.bannedBy', { bannedBy: bannedByForRecord }),
                getString('command.ban.kickMessage.duration', { durationDisplay }),
            ];
            if (config?.serverInfo?.discordLink && !config.serverInfo.discordLink.includes('example.com')) {
                kickMessageParts.push(getString('command.ban.kickMessage.appeal', { discordLink: config.serverInfo.discordLink }));
            }
            targetPlayer.kick(kickMessageParts.join('\n'));

            // Notify issuer and admins
            /** @type {string} */
            const successMessage = getString('command.ban.success', { playerName: targetPlayer.nameTag, durationString: durationDisplay, reason });
            if (player) {
                player.sendMessage(successMessage);
                playerUtils.playSoundForEvent(player, 'commandSuccess', dependencies);
            }

            if ((invokedBy === 'PlayerCommand' && config?.notifyOnAdminUtilCommandUsage) || (isAutoModAction && config?.notifyOnAutoModAction)) {
                const notifyMsg = getString('command.ban.notify.banned', { bannedBy: bannedByForRecord, targetName: targetPlayer.nameTag, durationDisplay, reason });
                playerUtils?.notifyAdmins(notifyMsg, dependencies, player, targetPData);
            }

            logManager?.addLog({
                adminName: bannedByForRecord,
                actionType: 'playerBanned',
                targetName: targetPlayer.nameTag,
                targetId: targetPlayer.id,
                duration: durationMs === Infinity ? 'Permanent' : args[1] || 'perm',
                reason,
                isAutoMod: isAutoModAction,
                checkType: autoModCheckType,
            }, dependencies);
        },
    }, invokedBy);
}
