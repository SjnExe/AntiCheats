/**
 * @file Piston related checks, primarily for detecting potential lag machines
 * by monitoring rapid and sustained piston activations.
 */

/**
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies;
 * @typedef {import('../../types.js').Config} Config;
 * @typedef {import('@minecraft/server').Block} Block;
 * @typedef {import('@minecraft/server').Dimension} Dimension;
 */

/**
 * Stores activity data for pistons.
 * Key: string representation of piston location and dimension.
 * Value: { activations: number[], lastLogTime: number }
 * @type {Map<string, { activations: number[], lastLogTime: number }>}
 */
let pistonActivityData = new Map();

/**
 * Checks for rapid and sustained piston activations that might indicate a lag machine.
 * This function is typically called from a `PistonActivateAfterEvent` handler.
 *
 * @async
 * @param {Block} pistonBlock - The piston block that activated.
 * @param {string} dimensionId - The ID of the dimension where the piston activated.
 * @param {CommandDependencies} dependencies - Shared dependencies.
 * @returns {Promise<void>}
 */
export async function checkPistonLag(pistonBlock, dimensionId, dependencies) {
    const { config, playerUtils, logManager, actionManager } = dependencies;

    if (!config.enablePistonLagCheck) {
        return;
    }

    if (!pistonBlock || !pistonBlock.location) {
        playerUtils.debugLog('[PistonLagCheck] Invalid pistonBlock provided (null or no location).', null, dependencies);
        return;
    }
    if (typeof dimensionId !== 'string' || dimensionId.trim() === '') {
        playerUtils.debugLog(`[PistonLagCheck] Invalid dimensionId provided for piston at ${JSON.stringify(pistonBlock.location)}.`, null, dependencies);
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
    const actionProfileKey = 'worldAntiGriefPistonLag';

    if (activationRate >= config.pistonActivationLogThresholdPerSecond) {
        if (currentTime - data.lastLogTime > (config.pistonLagLogCooldownSeconds * 1000)) {
            data.lastLogTime = currentTime;

            const location = pistonBlock.location;
            const dimensionName = dimensionId.split(':')[1] || dimensionId;

            const violationDetails = {
                x: location.x.toString(),
                y: location.y.toString(),
                z: location.z.toString(),
                dimensionId: dimensionName,
                rate: activationRate.toFixed(1),
                duration: config.pistonActivationSustainedDurationSeconds.toString(),
                detailsString: `Piston at ${location.x},${location.y},${location.z} in ${dimensionName} activated at ${activationRate.toFixed(1)}/s for ${config.pistonActivationSustainedDurationSeconds}s.`,
            };
            await actionManager.executeCheckAction(null, actionProfileKey, violationDetails, dependencies);
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
            if (
                (value.activations.length === 0 || value.activations[value.activations.length - 1] < cleanupCutoffTime) &&
                (value.lastLogTime === 0 || value.lastLogTime < cleanupCutoffTime)
            ) {
                pistonActivityData.delete(key);
                prunedCount++;
            }
        }
        if (prunedCount > 0 && config.enableDebugLogging) {
            playerUtils.debugLog(`[PistonLagCheck] Pruned ${prunedCount} stale entries from pistonActivityData. New size: ${pistonActivityData.size}`, null, dependencies);
        }
    }
}
