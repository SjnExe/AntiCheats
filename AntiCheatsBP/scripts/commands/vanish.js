/**
 * @file Defines the !vanish command for administrators to become invisible to other players.
 * This is a basic implementation using tags and potentially gamemode changes.
 * True vanish requires more complex server-side packet manipulation not available in Bedrock Scripting API.
 */
import * as mc from '@minecraft/server';
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'vanish',
    syntax: '[on|off|toggle] [silent|notify]', // Prefix handled by commandManager
    description: 'Makes you invisible to other players. Optional mode: silent (no join/leave msgs) or notify.',
    permissionLevel: permissionLevels.admin, // Typically admin or higher
    enabled: true, // This command's master toggle
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
    const vanishedPlayerTagName = config?.vanishedPlayerTag ?? 'vanished'; // Tag to mark vanished players

    let mode = 'notify'; // Default mode
    let action = 'toggle'; // Default action

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

    pData.vanishMode = mode; // Store selected mode even if already vanished/unvanished in that mode
    pData.isDirtyForSave = true;

    if (targetVanishState) { // Entering vanish
        if (isCurrentlyVanished && pData.vanishTagApplied) { // Already vanished and tag is set (check pData to avoid re-applying effects if already applied)
             player.sendMessage(`§eYou are already vanished (Mode: ${pData.vanishMode ?? mode}).`);
             return;
        }
        player.addTag(vanishedPlayerTagName);
        pData.vanishTagApplied = true; // Track that we applied the tag and effects
        pData.isDirtyForSave = true;

        // Effects for vanish (invisibility, optionally no collision if possible though not via API)
        player.addEffect(mc.MinecraftEffectTypes.invisibility, 2000000, { amplifier: 1, showParticles: false });
        // Consider adding NoGravity component if available and desired, though it has side effects.
        // player.triggerEvent('minecraft:start_flying'); // If wanting to force flight, but might conflict with survival

        if (mode === 'notify') {
            mc.world.sendMessage(getString('command.vanish.notify.leftGame', { playerName: adminName }));
        }
        player.onScreenDisplay.setActionBar(getString(mode === 'silent' ? 'command.vanish.actionBar.on.silent' : 'command.vanish.actionBar.on.notify'));
        logManager?.addLog({ adminName, actionType: 'vanishEnabled', details: `Mode: ${mode}` }, dependencies);

    } else { // Exiting vanish
        if (!isCurrentlyVanished && !pData.vanishTagApplied) { // Already unvanished
            player.sendMessage(`§eYou are already unvanished.`);
            return;
        }
        player.removeTag(vanishedPlayerTagName);
        pData.vanishTagApplied = false;
        pData.isDirtyForSave = true;

        player.removeEffect(mc.MinecraftEffectTypes.invisibility);
        // player.triggerEvent('minecraft:stop_flying'); // If flight was forced

        if (mode === 'notify') {
            mc.world.sendMessage(getString('command.vanish.notify.joinedGame', { playerName: adminName }));
        }
        player.sendMessage(getString(mode === 'silent' ? 'command.vanish.message.off.silent' : 'command.vanish.message.off.notify'));
        logManager?.addLog({ adminName, actionType: 'vanishDisabled', details: `Mode: ${mode}` }, dependencies);
    }
    playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

    // Update nametag after vanish state change
    if (rankManager?.updatePlayerNametag) {
        await rankManager.updatePlayerNametag(player, dependencies);
    }
}
