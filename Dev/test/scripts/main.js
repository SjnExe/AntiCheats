import { world, system, Player } from '@minecraft/server';

console.log('[AC Test - Baseline] Script loaded.');

system.runInterval(() => {
    try {
        const allEntities = world.getPlayers();
        for (const entity of allEntities) {
            if (entity instanceof Player) {
                // This is a stable loop. We do nothing here for the baseline.
            }
        }
    } catch (e) {
        console.error(`[AC Test - Baseline CRITICAL] Error in tick loop: ${e.message}\\n${e.stack}`);
    }
}, 1);

console.log('[AC Test - Baseline] Tick loop started.');
