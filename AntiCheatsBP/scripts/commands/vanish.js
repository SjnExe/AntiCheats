/**
 * @file Defines the !vanish command for administrators to become invisible to other players.
 * This is a basic implementation using tags and potentially gamemode changes.
 * True vanish requires more complex server-side packet manipulation not available in Bedrock Scripting API.
 */
import * as mc from '@minecraft/server';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'vanish',
    syntax: '[on|off|toggle] [silent|notify]',
    description: 'Makes you invisible to other players. Optional mode: silent (no join/leave msgs) or notify.',
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the !vanish command.
 * Toggles vanish state for the command issuer.
 * 'silent' mode attempts to suppress join/leave messages (limited effectiveness in Bedrock).
 * 'notify' mode shows fake join/leave messages.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [on|off|toggle] [silent|notify].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString, rankManager } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';
    const vanishedPlayerTagName = config?.vanishedPlayerTag ?? 'vanished';

    let mode = 'notify';
    let action = 'toggle';

    args.forEach(arg => {
        const lowerArg = arg.toLowerCase();
        if (lowerArg === 'on' || lowerArg === 'off' || lowerArg === 'toggle') {
            action = lowerArg;
        } else if (lowerArg === 'silent' || lowerArg === 'notify') {
            mode = lowerArg;
        }
    });

    const pData = dependencies.playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        player.sendMessage(getString('common.error.playerDataNotFound'));
        return;
    }

    const isCurrentlyVanished = player.hasTag(vanishedPlayerTagName);
    let targetVanishState;

    switch (action) {
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

    pData.vanishMode = mode;
    pData.isDirtyForSave = true;

    if (targetVanishState) {
        if (isCurrentlyVanished && pData.vanishTagApplied) {
             player.sendMessage(`§eYou are already vanished (Mode: ${pData.vanishMode ?? mode}).`);
             return;
        }
        player.addTag(vanishedPlayerTagName);
        pData.vanishTagApplied = true;
        pData.isDirtyForSave = true;

        player.addEffect(mc.MinecraftEffectTypes.invisibility, 2000000, { amplifier: 1, showParticles: false });

        if (mode === 'notify') {
            mc.world.sendMessage(getString('command.vanish.notify.leftGame', { playerName: adminName }));
        }
        player.onScreenDisplay.setActionBar(getString(mode === 'silent' ? 'command.vanish.actionBar.on.silent' : 'command.vanish.actionBar.on.notify'));
        logManager?.addLog({ adminName, actionType: 'vanishEnabled', details: `Mode: ${mode}` }, dependencies);

    } else {
        if (!isCurrentlyVanished && !pData.vanishTagApplied) {
            player.sendMessage(`§eYou are already unvanished.`);
            return;
        }
        player.removeTag(vanishedPlayerTagName);
        pData.vanishTagApplied = false;
        pData.isDirtyForSave = true;

        player.removeEffect(mc.MinecraftEffectTypes.invisibility);

        if (mode === 'notify') {
            mc.world.sendMessage(getString('command.vanish.notify.joinedGame', { playerName: adminName }));
        }
        player.sendMessage(getString(mode === 'silent' ? 'command.vanish.message.off.silent' : 'command.vanish.message.off.notify'));
        logManager?.addLog({ adminName, actionType: 'vanishDisabled', details: `Mode: ${mode}` }, dependencies);
    }
    playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

    if (rankManager?.updatePlayerNametag) {
        await rankManager.updatePlayerNametag(player, dependencies);
    }
}
