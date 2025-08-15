import * as mc from '@minecraft/server';
import * as eventHandlers from './eventHandlers.js';
import { dependencies, initializeCoreDependencies } from './dependencies.js';

function subscribeToEvents() {
    console.log('[AC Test - InitManager] Subscribing to chatSend event...');
    try {
        mc.world.beforeEvents.chatSend.subscribe((eventData) => {
            eventHandlers.handleBeforeChatSend(eventData, dependencies);
        });
        console.log('[AC Test - InitManager] Subscribed to chatSend successfully.');
    } catch (e) {
        console.error(`[AC Test - InitManager] Could not subscribe to chatSend: ${e.message}`);
    }
}

export function performInitializations() {
    console.log('[AC Test - InitManager] Performing initializations...');
    initializeCoreDependencies();
    subscribeToEvents();
    console.log('[AC Test - InitManager] Initializations complete.');
}
