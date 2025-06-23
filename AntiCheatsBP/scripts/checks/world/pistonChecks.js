/**
 * Piston related checks, primarily for detecting potential lag machines.
 */
let pistonActivityData = new Map();

/**
 * Checks for rapid and sustained piston activations that might indicate a lag machine.
 */
export async function checkPistonLag(pistonBlock, dimensionId, dependencies) {
    const { config, playerUtils, logManager, actionManager, getString } = dependencies;

    if (!pistonBlock || !pistonBlock.location) {
        playerUtils.debugLog("[PistonLagCheck] Invalid pistonBlock provided.", null, dependencies);
        return;
    }

    const pistonKey = `${pistonBlock.location.x},${pistonBlock.location.y},${pistonBlock.location.z},${dimensionId}`;
    let data = pistonActivityData.get(pistonKey);

    if (!data) {
        data = { activations: [], lastLogTime: 0 };
    }

    const currentTime = Date.now();
    data.activations.push(currentTime);

    const sustainedWindowStart = currentTime - (config.pistonActivationSustainedDurationSeconds * 1000);
    data.activations = data.activations.filter(timestamp => timestamp >= sustainedWindowStart);

    const activationRate = data.activations.length / config.pistonActivationSustainedDurationSeconds;

    if (activationRate >= config.pistonActivationLogThresholdPerSecond) {
        if (currentTime - data.lastLogTime > config.pistonLagLogCooldownSeconds * 1000) {
            data.lastLogTime = currentTime;

            const location = pistonBlock.location;
            const dimensionName = dimensionId.split(':')[1] || dimensionId;

            const violationDetails = {
                x: location.x,
                y: location.y,
                z: location.z,
                dimensionId: dimensionName,
                rate: activationRate.toFixed(1),
                duration: config.pistonActivationSustainedDurationSeconds,
                detailsString: getString("check.pistonLag.details.activationRate", {
                    x: location.x,
                    y: location.y,
                    z: location.z,
                    dimensionName: dimensionName,
                    rate: activationRate.toFixed(1),
                    duration: config.pistonActivationSustainedDurationSeconds
                })
            };
            await actionManager.executeCheckAction("worldAntigriefPistonLag", null, violationDetails, dependencies);
            playerUtils.debugLog(`[PistonLagCheck] Logged rapid piston at ${pistonKey}. Rate: ${activationRate.toFixed(1)}/s`, null, dependencies);
        }
    }

    pistonActivityData.set(pistonKey, data);

    const maxMapSize = config.pistonActivityMapMaxSize ?? 2000;
    const entryTimeoutMs = (config.pistonActivityEntryTimeoutSeconds ?? 300) * 1000;

    if (pistonActivityData.size > maxMapSize) {
        const cleanupCutoffTime = currentTime - entryTimeoutMs;
        let prunedCount = 0;
        for (const [key, value] of pistonActivityData.entries()) {
            if ((!value.activations.length || value.activations[value.activations.length - 1] < cleanupCutoffTime) &&
                (value.lastLogTime === 0 || value.lastLogTime < cleanupCutoffTime)) {
                pistonActivityData.delete(key);
                prunedCount++;
            }
        }
        if (prunedCount > 0) {
            playerUtils.debugLog(`[PistonLagCheck] Pruned ${prunedCount} stale entries from pistonActivityData. New size: ${pistonActivityData.size}`, null, dependencies);
        }
    }
}
