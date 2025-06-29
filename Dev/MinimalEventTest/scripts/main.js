import * as mc from '@minecraft/server';

const TEST_DELAY_TICKS = 200; // 10 seconds

mc.system.runTimeout(() => {
    console.warn(`[MinimalEventTest] Starting test after ${TEST_DELAY_TICKS} ticks.`);

    let worldDefined = false;
    if (typeof mc.world !== 'undefined') {
        console.warn(`[MinimalEventTest] typeof mc.world: object`);
        worldDefined = true;
    } else {
        console.error(`[MinimalEventTest] typeof mc.world: undefined - CRITICAL`);
    }

    let beforeEventsDefined = false;
    if (worldDefined && typeof mc.world.beforeEvents !== 'undefined') {
        console.warn(`[MinimalEventTest] typeof mc.world.beforeEvents: object`);
        beforeEventsDefined = true;
    } else if (worldDefined) {
        console.error(`[MinimalEventTest] typeof mc.world.beforeEvents: undefined - CRITICAL`);
    }

    let chatSendDefined = false;
    if (beforeEventsDefined && typeof mc.world.beforeEvents.chatSend !== 'undefined') {
        console.warn(`[MinimalEventTest] typeof mc.world.beforeEvents.chatSend: ${typeof mc.world.beforeEvents.chatSend}`);
        chatSendDefined = true;
    } else if (beforeEventsDefined) {
        console.error(`[MinimalEventTest] typeof mc.world.beforeEvents.chatSend: undefined - CRITICAL`);
    }

    if (chatSendDefined) {
        console.warn("[MinimalEventTest] SUCCESS: mc.world.beforeEvents.chatSend IS DEFINED and accessible.");
        // As a final test, try to actually access it in a way that would use subscribe
        try {
            if (typeof mc.world.beforeEvents.chatSend.subscribe === 'function') {
                console.warn("[MinimalEventTest] SUCCESS: mc.world.beforeEvents.chatSend.subscribe IS a function.");
            } else {
                console.error("[MinimalEventTest] FAILURE: mc.world.beforeEvents.chatSend.subscribe is NOT a function.");
            }
        } catch (e) {
            console.error(`[MinimalEventTest] Error accessing .subscribe on chatSend: ${e}`);
        }
    } else {
        console.error("[MinimalEventTest] FAILURE: mc.world.beforeEvents.chatSend IS UNDEFINED.");
    }

    console.warn(`[MinimalEventTest] Test complete.`);

}, TEST_DELAY_TICKS);

console.warn('[MinimalEventTest] Script loaded. Test scheduled.');
