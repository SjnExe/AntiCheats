/**
 * @file AntiCheatsBP/scripts/checks/world/pistonChecks.js
 * Piston related checks, primarily for detecting potential lag machines.
 */

// Global map to store piston activation data.
// Key: string like "x,y,z,dimensionId"
// Value: { activations: number[], lastLogTime: number }
let pistonActivityData = new Map();

/**
 * Checks for rapid and sustained piston activations that might indicate a lag machine.
 * @param {import('@minecraft/server').Block} pistonBlock - The piston block that activated.
 * @param {string} dimensionId - The ID of the dimension where the piston activated.
 * @param {import('../../config.js').editableConfigValues} config - The server configuration object.
 * @param {import('../../utils/playerUtils.js').PlayerUtils} playerUtils - Utility functions.
 * @param {import('../../core/logManager.js').LogManager} logManager - Log manager instance.
 * @param {import('../../core/actionManager.js').ActionManager} actionManager - Action manager instance.
 * @param {import('../../../types.js').EventHandlerDependencies} dependencies - Full dependencies object.
 */
export async function checkPistonLag(pistonBlock, dimensionId, config, playerUtils, logManager, actionManager, dependencies) {
    if (!pistonBlock || !pistonBlock.location) {
        playerUtils.debugLog("PistonLag: Invalid pistonBlock provided.", null);
        return;
    }

    const pistonKey = `${pistonBlock.location.x},${pistonBlock.location.y},${pistonBlock.location.z},${dimensionId}`;
    let data = pistonActivityData.get(pistonKey);

    if (!data) {
        data = { activations: [], lastLogTime: 0 };
    }

    const currentTime = Date.now();
    data.activations.push(currentTime);

    // Filter activations to keep only those within the sustained duration window
    const sustainedWindowStart = currentTime - (config.pistonActivationSustainedDurationSeconds * 1000);
    data.activations = data.activations.filter(timestamp => timestamp >= sustainedWindowStart);

    // Calculate activation rate
    const activationRate = data.activations.length / config.pistonActivationSustainedDurationSeconds;

    if (activationRate >= config.pistonActivationLogThresholdPerSecond) {
        if (currentTime - data.lastLogTime > config.pistonLagLogCooldownSeconds * 1000) {
            data.lastLogTime = currentTime;

            const location = pistonBlock.location;
            const dimensionName = dimensionId.split(':')[1] || dimensionId; // Get cleaner dimension name

            const violationDetails = {
                x: location.x,
                y: location.y,
                z: location.z,
                dimensionId: dimensionName,
                rate: activationRate.toFixed(1),
                duration: config.pistonActivationSustainedDurationSeconds,
                detailsString: `Piston at ${location.x},${location.y},${location.z} in ${dimensionName} activated ${activationRate.toFixed(1)} times/sec over ${config.pistonActivationSustainedDurationSeconds}s.`
            };

            // Assuming actionManager is passed correctly within dependencies if needed by executeCheckAction's profile
            // If executeCheckAction is a direct function: await actionManager(profileName, player, details, fullDependencies)
            // If actionManager is an object with executeCheckAction method: await actionManager.executeCheckAction(...)
            if (dependencies.actionManager && typeof dependencies.actionManager.executeCheckAction === 'function') {
                 await dependencies.actionManager.executeCheckAction("world_antigrief_piston_lag", null, violationDetails, dependencies);
            } else if (typeof actionManager === 'function') { // Fallback if actionManager itself is executeCheckAction
                 await actionManager("world_antigrief_piston_lag", null, violationDetails, dependencies);
            }


            playerUtils.debugLog(`PistonLag: Logged rapid piston at ${pistonKey}. Rate: ${activationRate.toFixed(1)}/s`, null);
        }
    }

    pistonActivityData.set(pistonKey, data);

    // Simple pruning mechanism: if map gets too large, clear entries not active for a long time
    // This is a basic example; a more robust solution might involve a separate cleanup interval.
    if (pistonActivityData.size > 1000) { // Example threshold
        const cleanupTime = currentTime - (config.pistonLagLogCooldownSeconds * 1000 * 5); // 5 times the cooldown
        for (const [key, value] of pistonActivityData.entries()) {
            if (value.lastLogTime < cleanupTime && (!value.activations.length || value.activations[value.activations.length -1] < cleanupTime) ) {
                pistonActivityData.delete(key);
            }
        }
        if(playerUtils.debugLog) playerUtils.debugLog(`PistonLag: Pruned pistonActivityData. New size: ${pistonActivityData.size}`, null);
    }
}
