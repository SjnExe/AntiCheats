import { world, system, Player } from '@minecraft/server';

console.log('[AC Tick Test] Script loaded. Using system.runInterval and instanceof check.');

function processPlayer(player) {
    // This function now only receives actual Player objects.
    // We can safely access player-specific properties.
    // For this test, we don't need to do anything.
}

system.runInterval(() => {
    try {
        const allEntities = world.getPlayers();
        for (const entity of allEntities) {
            // This is the fix: explicitly check if the entity is a Player.
            if (entity instanceof Player) {
                processPlayer(entity);
            }
            // We can optionally log the non-player entities for debugging, but for now we will just ignore them.
            // else {
            //     console.log(`[AC Tick Test INFO] Found a non-player entity in getPlayers() array: ${entity.typeId}`);
            // }
        }
    } catch (e) {
        console.error(`[AC Tick Test CRITICAL] Error in tick loop: ${e.message}\\n${e.stack}`);
    }
}, 1);

console.log('[AC Tick Test] Tick loop started.');
