import { system, world } from '@minecraft/server';
import { getPlayerRank } from './rankManager.js';
import { getConfig } from './configManager.js';
import { debugLog } from './logger.js';

/**
 * --- Test Method 1: Direct Kick Command ---
 * Tries to kick players using a single /kick command with selectors.
 * This is often unreliable in Bedrock but is included for comprehensive testing.
 */
async function runTestKickMethod1() {
    try {
        const overworld = world.getDimension('overworld');
        const config = getConfig();
        // This selector is complex and may not work as expected in-game, which is part of the test.
        // It attempts to exclude owners by name and admins by tag.
        const ownerNames = config.ownerPlayerNames.map(name => `name=!"${name}"`).join(',');
        const command = `kick @a[tag=!${config.adminTag},${ownerNames}] "Kicked by Test Method 1: Direct Kick"`;

        world.sendMessage('§e[Test] Running Method 1: Direct Kick Command...');
        debugLog(`[TestManager] Running command: /${command}`);

        const result = await overworld.runCommandAsync(command);
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
 * This can sometimes be more reliable than a single complex selector.
 */
async function runTestKickMethod2() {
    try {
        const overworld = world.getDimension('overworld');
        const config = getConfig();
        const tempTag = 'kickme';
        const ownerNames = config.ownerPlayerNames.map(name => `name=!"${name}"`).join(',');

        world.sendMessage('§e[Test] Running Method 2: Tag and Kick...');

        // Step 1: Add tag
        const tagCommand = `tag @a[tag=!${config.adminTag},${ownerNames}] add ${tempTag}`;
        debugLog(`[TestManager] Running command: /${tagCommand}`);
        await overworld.runCommandAsync(tagCommand);

        // Step 2: Kick
        const kickCommand = `kick @a[tag=${tempTag}] "Kicked by Test Method 2: Tag and Kick"`;
        debugLog(`[TestManager] Running command: /${kickCommand}`);
        const kickResult = await overworld.runCommandAsync(kickCommand);

        // Step 3: Clean up tag
        const cleanupCommand = `tag @a[tag=${tempTag}] remove ${tempTag}`;
        debugLog(`[TestManager] Running command: /${cleanupCommand}`);
        await overworld.runCommandAsync(cleanupCommand);

        world.sendMessage(`§e[Test] Method 2 finished. Kicked players: ${kickResult.successCount}`);
        debugLog(`[TestManager] Method 2 success count: ${kickResult.successCount}`);
    } catch (error) {
        world.sendMessage('§c[Test] Method 2 failed to execute.');
        console.error('[TestManager] Method 2 failed:', error);
    }
}

/**
 * --- Test Method 3: Script-Based Kick ---
 * Iterates through players in script, checks their rank, and uses the Player.kick() API.
 * This is expected to be the most reliable method.
 */
function runTestKickMethod3() {
    world.sendMessage('§e[Test] Running Method 3: Script-Based Kick...');
    debugLog('[TestManager] Running Method 3...');

    const config = getConfig();
    const kickMessage = 'Kicked by Test Method 3: Script Event';
    let kickedPlayers = 0;

    for (const player of world.getAllPlayers()) {
        const rank = getPlayerRank(player, config);
        if (rank.permissionLevel > 1) {
            try {
                // Using system.run() to schedule the kick for the next tick, avoiding context issues.
                system.run(() => {
                    player.kick(kickMessage);
                });
                debugLog(`[TestManager] Attempted to kick player ${player.name} (Rank: ${rank.name})`);
                kickedPlayers++;
            } catch (error) {
                console.error(`[TestManager] Failed to kick player ${player.name}: ${error}`);
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
