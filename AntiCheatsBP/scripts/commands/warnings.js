/**
 * Defines the !warnings command for administrators to view a player's AntiCheat flags.
 */
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js';
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'warnings',
    syntax: '!warnings <playername>',
    description: 'Views a player\'s AntiCheat flags (similar to inspect).',
    permissionLevel: importedPermissionLevels.admin,
    enabled: true,
};
/**
 * Executes the warnings command.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, getString } = dependencies;
    const findPlayer = playerUtils.findPlayer;

    if (args.length < 1) {
        player.sendMessage(getString('command.warnings.usage', { prefix: config.prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = findPlayer(targetPlayerName);

    if (!foundPlayer) {
        player.sendMessage(getString('common.error.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    const pData = playerDataManager.getPlayerData(foundPlayer.id);
    if (pData && pData.flags) {
        let warningDetailsLines = [];
        warningDetailsLines.push(getString('command.warnings.header', { playerName: foundPlayer.nameTag }));
        warningDetailsLines.push(getString('command.warnings.totalFlags', { totalFlags: (pData.flags.totalFlags || 0).toString() }));
        warningDetailsLines.push(getString('command.warnings.lastFlagType', { lastFlagType: pData.lastFlagType || getString('common.value.notAvailable') }));
        warningDetailsLines.push(getString('command.warnings.individualFlagsHeader'));

        let hasSpecificFlags = false;
        for (const flagKey in pData.flags) {
            if (Object.prototype.hasOwnProperty.call(pData.flags, flagKey)) {
                if (flagKey !== 'totalFlags' && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                    const flagData = pData.flags[flagKey];
                    const lastTime = flagData.lastDetectionTime && flagData.lastDetectionTime > 0 ? new Date(flagData.lastDetectionTime).toLocaleString() : getString('common.value.notAvailable');
                    warningDetailsLines.push(getString('command.warnings.flagEntry', { flagKey: flagKey, count: flagData.count.toString(), lastTime: lastTime }));
                    hasSpecificFlags = true;
                }
            }
        }
        if (!hasSpecificFlags) {
            warningDetailsLines.push(getString('command.warnings.noSpecific'));
        }
        player.sendMessage(warningDetailsLines.join('\n').trim());
        logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'viewWarnings', targetName: foundPlayer.nameTag, details: `Viewed warnings for ${foundPlayer.nameTag}` }, dependencies);
    } else {
        player.sendMessage(getString('command.warnings.noData', { playerName: foundPlayer.nameTag }));
    }
}
