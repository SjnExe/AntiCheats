// Defines the !vanish command for administrators to become invisible to other players.
import * as mc from '@minecraft/server';

const veryLongEffectDuration = 2000000;

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'vanish',
    syntax: '[on|off|toggle] [silent|notify]',
    description: 'Makes you invisible to other players. Optional mode: silent (no join/leave msgs) or notify.',
    permissionLevel: 1, // admin
};

/**
 * Executes the !vanish command.
 * @async
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args Command arguments: [on|off|toggle] [silent|notify].
 * @param {import('../types.js').Dependencies} dependencies Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString, rankManager } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const vanishedPlayerTagName = config?.vanishedPlayerTag ?? 'vanished';

    const pData = dependencies.playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        player.sendMessage(getString('common.error.playerDataNotFound'));
        return;
    }

    const actionArg = args.find(arg => ['on', 'off', 'toggle'].includes(arg.toLowerCase())) || 'toggle';
    const modeArg = args.find(arg => ['silent', 'notify'].includes(arg.toLowerCase())) || pData.vanishMode || 'notify';

    const isCurrentlyVanished = player.hasTag(vanishedPlayerTagName);
    let targetVanishState;

    switch (actionArg) {
        case 'on':
            targetVanishState = true;
            break;
        case 'off':
            targetVanishState = false;
            break;
        case 'toggle':
        default:
            targetVanishState = !isCurrentlyVanished;
            break;
    }

    if (targetVanishState === isCurrentlyVanished && pData.vanishMode === modeArg) {
        const message = isCurrentlyVanished ? `§eYou are already vanished (Mode: ${modeArg}).` : '§eYou are already unvanished.';
        player.sendMessage(message);
        return;
    }

    pData.vanishMode = modeArg;
    pData.isDirtyForSave = true;

    if (targetVanishState) {
        player.addTag(vanishedPlayerTagName);
        player.addEffect(mc.MinecraftEffectTypes.invisibility, veryLongEffectDuration, { amplifier: 1, showParticles: false });

        if (modeArg === 'notify' && !isCurrentlyVanished) { // Only show leave message if they weren't already vanished
            mc.world.sendMessage(getString('command.vanish.notify.leftGame', { playerName: adminName }));
        }

        if (player.onScreenDisplay) {
            player.onScreenDisplay.setActionBar(getString(modeArg === 'silent' ? 'command.vanish.actionBar.on.silent' : 'command.vanish.actionBar.on.notify'));
        }

        logManager?.addLog({ adminName, actionType: 'vanishEnabled', details: `Mode: ${modeArg}` }, dependencies);
    } else {
        player.removeTag(vanishedPlayerTagName);
        player.removeEffect(mc.MinecraftEffectTypes.invisibility);

        if (modeArg === 'notify' && isCurrentlyVanished) { // Only show join message if they were previously vanished
            mc.world.sendMessage(getString('command.vanish.notify.joinedGame', { playerName: adminName }));
        }

        player.sendMessage(getString(modeArg === 'silent' ? 'command.vanish.message.off.silent' : 'command.vanish.message.off.notify'));
        logManager?.addLog({ adminName, actionType: 'vanishDisabled', details: `Mode: ${modeArg}` }, dependencies);
    }
    playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);

    if (rankManager?.updatePlayerNametag) {
        await rankManager.updatePlayerNametag(player, dependencies);
    }
}
