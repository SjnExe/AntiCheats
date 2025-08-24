import { commandManager } from './commandManager.js';

commandManager.register({
    name: 'test2',
    description: 'Tests restarting the server by running /function restart.',
    category: 'Admin',
    permissionLevel: 0, // Owner only
    execute: (player, args) => {
        player.sendMessage('§eAttempting restart via Test 2: /function restart...');
        try {
            player.runCommandAsync('/function restart');
            // Note: We don't expect a success message here, as the script will likely terminate.
        } catch (e) {
            player.sendMessage(`§cTest 2 failed: ${e.message}`);
            console.error(`[Test2] ${e.stack}`);
        }
    },
});
