import { GameMode, world } from '@minecraft/server';
import { commandManager } from './commandManager.js';

commandManager.register({
    name: 'debug',
    description: 'Runs a suite of diagnostic tests and logs the results to the console.',
    permissionLevel: 1, // Admin only
    execute: async (player, args) => {
        console.log("--- Running AntiCheats Debug Command ---");
        player.sendMessage("§7Running diagnostic tests... Check the console for output.");

        // 1. Player Info
        console.log(`[Debug] Player Name: ${player.name}`);
        console.log(`[Debug] Player ID: ${player.id}`);

        // 2. Player Tags
        const tags = player.getTags();
        console.log(`[Debug] Player Tags: ${JSON.stringify(tags)}`);
        if (tags.length === 0) {
            console.log("[Debug] Player has no tags.");
        }

        // 3. Operator Status Check (isOp() is a method on the Player object)
        try {
            const opStatus = player.isOp();
            console.log(`[Debug] player.isOp() returned: ${opStatus}`);
        } catch (e) {
            console.log(`[Debug] player.isOp() threw an error (this is expected if the API is not available): ${e.message}`);
        }

        // 4. GameMode Enum Check
        console.log(`[Debug] Imported GameMode Enum Values:`);
        console.log(`  - Creative: ${GameMode.creative} (Type: ${typeof GameMode.creative})`);
        console.log(`  - Survival: ${GameMode.survival} (Type: ${typeof GameMode.survival})`);
        console.log(`  - Adventure: ${GameMode.adventure} (Type: ${typeof GameMode.adventure})`);
        console.log(`  - Spectator: ${GameMode.spectator} (Type: ${typeof GameMode.spectator})`);

        // 5. Harmless Command Test
        try {
            console.log("[Debug] Testing player.runCommandAsync('say ...')");
            await player.runCommandAsync('say Debug command executed successfully.');
            console.log("[Debug] player.runCommandAsync('say ...') SUCCEEDED.");
            player.sendMessage("§aDebug command test successful.");
        } catch (error) {
            console.log("[Debug] player.runCommandAsync('say ...') FAILED.");
            console.error(`[Debug] Error: ${error?.stack ?? JSON.stringify(error)}`);
            player.sendMessage("§cDebug command test FAILED. Player may not have command permissions.");
        }

        console.log("--- AntiCheats Debug Command Finished ---");
    }
});
