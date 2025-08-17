import { world, GameMode } from '@minecraft/server';
import { commandManager } from './commandManager.js';

commandManager.register({
    name: 'debug',
    description: 'Runs diagnostic tests for addon functionality.',
    permissionLevel: 1, // Admins only
    execute: async (player, args) => {
        player.sendMessage("§e[Debug] §fStarting diagnostic tests...");
        console.log("[Debug] Starting diagnostic tests...");

        // --- Test 1: player.setGameMode() ---
        try {
            player.sendMessage("§e[Debug] §fTesting player.setGameMode()...");
            player.setGameMode(GameMode.creative);
            player.sendMessage("§a[Debug] player.setGameMode() SUCCESS");
            console.log("[Debug] player.setGameMode() SUCCESS");
            // Set it back for the next test
            player.setGameMode(GameMode.survival);
        } catch (error) {
            player.sendMessage("§c[Debug] player.setGameMode() FAILED. See console.");
            console.error(`[Debug] player.setGameMode() FAILED: ${error?.stack ?? JSON.stringify(error)}`);
        }

        // --- Test 2: player.runCommandAsync() ---
        try {
            player.sendMessage("§e[Debug] §fTesting player.runCommandAsync()...");
            await player.runCommandAsync('gamemode creative');
            player.sendMessage("§a[Debug] player.runCommandAsync() SUCCESS");
            console.log("[Debug] player.runCommandAsync() SUCCESS");
            // Set it back
            await player.runCommandAsync('gamemode survival');
        } catch (error) {
            player.sendMessage("§c[Debug] player.runCommandAsync() FAILED. See console.");
            console.error(`[Debug] player.runCommandAsync() FAILED: ${error?.stack ?? JSON.stringify(error)}`);
        }

        // --- Test 3: world.runCommandAsync() ---
        try {
            player.sendMessage("§e[Debug] §fTesting world.runCommandAsync()...");
            await world.runCommandAsync(`gamemode creative "${player.name}"`);
            player.sendMessage("§a[Debug] world.runCommandAsync() SUCCESS");
            console.log("[Debug] world.runCommandAsync() SUCCESS");
            // Set it back
            await world.runCommandAsync(`gamemode survival "${player.name}"`);
        } catch (error) {
            player.sendMessage("§c[Debug] world.runCommandAsync() FAILED. See console.");
            console.error(`[Debug] world.runCommandAsync() FAILED: ${error?.stack ?? JSON.stringify(error)}`);
        }

        player.sendMessage("§e[Debug] §fDiagnostic tests complete.");
        console.log("[Debug] Diagnostic tests complete.");
    }
});
