import { system, world } from '@minecraft/server';
import { getPlayerRank } from './rankManager.js';
import { getConfig } from './configManager.js';
import { debugLog } from './logger.js';

/**
 * --- Test Method 1: Direct Kick Command ---
 * Tries to kick players using a single /kick command with selectors.
 */
function runTestKickMethod1() {
    try {
        const overworld = world.getDimension('overworld');
        const config = getConfig();
        const ownerNames = config.ownerPlayerNames.map(name => `name=!"${name}"`).join(',');
        const command = `kick @a[tag=!${config.adminTag},${ownerNames}] Kicked by Test Method 1: Direct Kick`;

        world.sendMessage('§e[Test] Running Method 1: Direct Kick Command...');
        debugLog(`[TestManager] Running command: /${command}`);

        const result = overworld.runCommand(command);
        world.sendMessage(`§e[Test] Method 1 finished. Success count: ${result.successCount}`);
        debugLog(`[TestManager] Method 1 success count: ${result.successCount}`);
    } catch (error) {
        world.sendMessage('§c[Test] Method 1 failed to execute.');
        console.error('[TestManager] Method 1 failed:', error);
    }
}

/**
 * --- Test Method 2: Tag and Kick Command ---
 * Tries to kick players by first tagging them, then kicking based on the tag.
 */
function runTestKickMethod2() {
    try {
        const overworld = world.getDimension('overworld');
        const config = getConfig();
        const tempTag = 'kickme';
        const ownerNames = config.ownerPlayerNames.map(name => `name=!"${name}"`).join(',');

        world.sendMessage('§e[Test] Running Method 2: Tag and Kick...');

        // Step 1: Add tag
        const tagCommand = `tag @a[tag=!${config.adminTag},${ownerNames}] add ${tempTag}`;
        debugLog(`[TestManager] Running command: /${tagCommand}`);
        overworld.runCommand(tagCommand);

        // Step 2: Kick
        const kickCommand = `kick @a[tag=${tempTag}] Kicked by Test Method 2: Tag and Kick`;
        debugLog(`[TestManager] Running command: /${kickCommand}`);
        const kickResult = overworld.runCommand(kickCommand);

        // Step 3: Clean up tag
        const cleanupCommand = `tag @a[tag=${tempTag}] remove ${tempTag}`;
        debugLog(`[TestManager] Running command: /${cleanupCommand}`);
        overworld.runCommand(cleanupCommand);

        world.sendMessage(`§e[Test] Method 2 finished. Kicked players: ${kickResult.successCount}`);
        debugLog(`[TestManager] Method 2 success count: ${kickResult.successCount}`);
    } catch (error) {
        world.sendMessage('§c[Test] Method 2 failed to execute.');
        console.error('[TestManager] Method 2 failed:', error);
    }
}

/**
 * --- Test Method 3: Script-Based Command Kick ---
 * Iterates through players in script, checks rank, and runs a /kick command for each one.
 */
function runTestKickMethod3() {
    world.sendMessage('§e[Test] Running Method 3: Script-Based Command Kick...');
    debugLog('[TestManager] Running Method 3...');

    const overworld = world.getDimension('overworld');
    const config = getConfig();
    const kickReason = 'Kicked by Test Method 3: Script-Based Command';
    let kickedPlayers = 0;

    for (const player of world.getAllPlayers()) {
        const rank = getPlayerRank(player, config);
        if (rank.permissionLevel > 1) {
            try {
                // Using a command-based kick for maximum reliability.
                // Player names with spaces must be quoted.
                const command = `kick "${player.name}" ${kickReason}`;
                debugLog(`[TestManager] Running command: /${command}`);
                overworld.runCommand(command);
                kickedPlayers++;
            } catch (error) {
                console.error(`[TestManager] Failed to kick player ${player.name} via command: ${error}`);
            }
        } else {
            debugLog(`[TestManager] Did not kick player ${player.name} (Rank: ${rank.name})`);
        }
    }
    world.sendMessage(`§e[Test] Method 3 finished. Attempted to kick ${kickedPlayers} player(s).`);
    debugLog(`[TestManager] Method 3 complete. Attempted kicks: ${kickedPlayers}.`);
}


/**
 * Handles the test kick script event, running all test methods sequentially.
 */
function handleTestKick() {
    debugLog('[TestManager] Received test_kick scriptevent. Starting test suite...');
    world.sendMessage('§a[Test] Starting kick test suite. Each method will run after a 5-second delay.');

    // Run Method 1 immediately
    runTestKickMethod1();

    // Schedule Method 2 after 5 seconds
    system.runTimeout(() => {
        runTestKickMethod2();
    }, 100); // 5 seconds * 20 ticks/sec

    // Schedule Method 3 after 10 seconds
    system.runTimeout(() => {
        runTestKickMethod3();
    }, 200); // 10 seconds * 20 ticks/sec
}

// Register the scriptevent listener
system.afterEvents.scriptEventReceive.subscribe(
    (event) => {
        if (event.id === 'addonexe:test_kick') {
            handleTestKick();
        }
    },
    { namespaces: ['addonexe'] }
);
