/**
 * Defines the !vanish command for administrators to toggle their visibility and related effects.
 */
import * as mc from '@minecraft/server';

const vanishedTag = 'vanished';
const vanishModeNotifyTag = 'vanish_mode_notify';
const effectDuration = 2000000; // Max duration for effects
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'vanish',
    syntax: '!vanish [silent|notify]',
    description: 'Toggles your visibility and related effects.',
    permissionLevel: importedPermissionLevels.admin,
    enabled: true,
};
/**
 * Executes the vanish command.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, playerDataManager, getString, mc: minecraft } = dependencies; // Added mc for consistency

    let mode = args[0] ? args[0].toLowerCase() : 'silent';
    if (mode !== 'silent' && mode !== 'notify') {
        mode = 'silent';
    }

    const isCurrentlyVanished = player.hasTag(vanishedTag);
    const targetStateIsOn = !isCurrentlyVanished;

    if (targetStateIsOn) {
        player.addTag(vanishedTag);
        player.addEffect(minecraft.MinecraftEffectTypes.invisibility, effectDuration, { amplifier: 0, showParticles: false });
        player.addEffect(minecraft.MinecraftEffectTypes.nightVision, effectDuration, { amplifier: 0, showParticles: false });
        player.addEffect(minecraft.MinecraftEffectTypes.resistance, effectDuration, { amplifier: 4, showParticles: false });
        player.addEffect(minecraft.MinecraftEffectTypes.fireResistance, effectDuration, { amplifier: 0, showParticles: false });
        player.canPickupItems = false;

        if (mode === 'notify') {
            player.addTag(vanishModeNotifyTag);
            minecraft.world.sendMessage(getString('command.vanish.notify.leftGame', { playerName: player.nameTag }));
            player.onScreenDisplay.setActionBar(getString('command.vanish.actionBar.on.notify'));
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanishOnNotify', details: `${player.nameTag} enabled vanish (notify).` }, dependencies);
        } else {
            player.onScreenDisplay.setActionBar(getString('command.vanish.actionBar.on.silent'));
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanishOnSilent', details: `${player.nameTag} enabled vanish (silent).` }, dependencies);
        }

        const pData = playerDataManager.getPlayerData(player.id);
        playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 has enabled vanish (${mode} mode).`, dependencies, player, pData); // Admin notification can remain
    } else {
        player.onScreenDisplay.setActionBar(''); // Clear action bar
        const wasNotifyMode = player.hasTag(vanishModeNotifyTag);

        player.canPickupItems = true;
        player.removeTag(vanishedTag);
        player.removeEffect(minecraft.MinecraftEffectTypes.invisibility);
        player.removeEffect(minecraft.MinecraftEffectTypes.nightVision);
        player.removeEffect(minecraft.MinecraftEffectTypes.resistance);
        player.removeEffect(minecraft.MinecraftEffectTypes.fireResistance);

        if (wasNotifyMode) {
            minecraft.world.sendMessage(getString('command.vanish.notify.joinedGame', { playerName: player.nameTag }));
            player.sendMessage(getString('command.vanish.message.off.notify'));
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanishOffNotify', details: `${player.nameTag} disabled vanish (notify).` }, dependencies);
            player.removeTag(vanishModeNotifyTag);
        } else {
            player.sendMessage(getString('command.vanish.message.off.silent'));
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanishOffSilent', details: `${player.nameTag} disabled vanish (silent).` }, dependencies);
        }

        const pData = playerDataManager.getPlayerData(player.id);
        playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 has disabled vanish (${wasNotifyMode ? 'notify' : 'silent'} mode).`, dependencies, player, pData); // Admin notification
    }
}
