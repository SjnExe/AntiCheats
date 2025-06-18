/**
 * @file AntiCheatsBP/scripts/checks/world/pistonChecks.js
 * Piston related checks, primarily for detecting potential lag machines.
 * @version 1.0.2
 */
// getString will be accessed via dependencies.getString

// Global map to store piston activation data.
// Key: string like "x,y,z,dimensionId"
// Value: { activations: number[], lastLogTime: number }
let pistonActivityData = new Map();

/**
 * Checks for rapid and sustained piston activations that might indicate a lag machine.
 * @param {import('@minecraft/server').Block} pistonBlock - The piston block that activated.
 * @param {string} dimensionId - The ID of the dimension where the piston activated.
 * @param {import('../../types.js').Dependencies} dependencies - Full dependencies object.
 */
export async function checkPistonLag(pistonBlock, dimensionId, dependencies) {
    const { config, playerUtils, logManager, actionManager, getString } = dependencies;

    if (!pistonBlock || !pistonBlock.location) {
        playerUtils.debugLog("[PistonLagCheck] Invalid pistonBlock provided.", dependencies, null);
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
                detailsString: getString("check.pistonLag.details.activationRate", { // getString from dependencies
                    x: location.x,
                    y: location.y,
                    z: location.z,
                    dimensionName: dimensionName,
                    rate: activationRate.toFixed(1),
                    duration: config.pistonActivationSustainedDurationSeconds
                })
            };

            await actionManager.executeCheckAction("worldAntigriefPistonLag", null, violationDetails, dependencies);

            playerUtils.debugLog(`[PistonLagCheck] Logged rapid piston at ${pistonKey}. Rate: ${activationRate.toFixed(1)}/s`, dependencies, null);
        }
    }

    pistonActivityData.set(pistonKey, data);

    // Simple cleanup strategy: if map grows too large, iterate and remove old entries.
    // A more robust solution might involve a separate cleanup interval or more sophisticated data structure.
    const maxMapSize = config.pistonActivityMapMaxSize ?? 2000; // Max entries before attempting prune
    const entryTimeoutMs = (config.pistonActivityEntryTimeoutSeconds ?? 300) * 1000; // Time after which an inactive entry is stale

    if (pistonActivityData.size > maxMapSize) {
        const cleanupCutoffTime = currentTime - entryTimeoutMs;
        let prunedCount = 0;
        for (const [key, value] of pistonActivityData.entries()) {
            // Remove if no recent activations AND last log time is also old (or never logged)
            if ((!value.activations.length || value.activations[value.activations.length - 1] < cleanupCutoffTime) &&
                (value.lastLogTime === 0 || value.lastLogTime < cleanupCutoffTime)) {
                pistonActivityData.delete(key);
                prunedCount++;
            }
        }
        if (prunedCount > 0) {
            playerUtils.debugLog(`[PistonLagCheck] Pruned ${prunedCount} stale entries from pistonActivityData. New size: ${pistonActivityData.size}`, dependencies, null);
        }
    }
}
