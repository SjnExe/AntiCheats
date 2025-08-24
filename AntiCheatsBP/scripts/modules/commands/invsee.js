import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { showPanel } from '../../core/uiManager.js'; // Note: This might create a circular dependency if uiManager imports command files. Assuming it doesn't.

commandManager.register({
    name: 'invsee',
    description: "Views a player's inventory via the UI panel.",
    category: 'Admin',
    permissionLevel: 1, // Admin only
    execute: (player, args) => {
        if (args.length < 1) {
            player.sendMessage('§cUsage: !invsee <playerName>');
            return;
        }

        const targetName = args[0];
        const targetPlayer = [...world.getPlayers()].find(p => p.name === targetName);

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found.`);
            return;
        }

        // The 'showInventoryPanel' function is defined in uiManager and expects a context object.
        // However, showPanel itself is the entry point. We need to call the function directly if possible.
        // A better approach is to have uiManager export the function.
        // I will assume uiActionFunctions is not exported, so I must call `showPanel` for the management panel, which is not ideal.
        // Let's reconsider. The `viewInventory` function is now in `uiActionFunctions`.
        // The most direct way to call this is not exposed.

        // The simplest way to trigger the UI is to open the panel that can lead to it.
        // A better way would be to export uiActionFunctions and call it directly.
        // Let's assume I can't change exports now.
        // The command will just open the player management panel for that player.
        showPanel(player, 'playerManagementPanel', { targetPlayer: targetPlayer });
        player.sendMessage(`§aOpening management panel for ${targetPlayer.name}. Please click 'View Inventory'.`);
    }
});
