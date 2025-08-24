import { commandManager } from './commandManager.js';

commandManager.register({
    name: 'test1',
    description: 'Tests restarting the server by running /reload all directly.',
    category: 'Admin',
    permissionLevel: 0, // Owner only
    execute: (player, args) => {
        player.sendMessage('§eAttempting restart via Test 1: /reload all...');
        try {
            player.runCommandAsync('/reload all');
            // Note: We don't expect a success message here, as the script will likely terminate.
        } catch (e) {
            player.sendMessage(`§cTest 1 failed: ${e.message}`);
            console.error(`[Test1] ${e.stack}`);
        }
    }
});
