import { dependencies as liveDependencies } from './dependencies.js';

// Minimal profiler wrapper to mimic the main addon's structure
function profileEventHandler(handlerName, handlerFunction) {
    return async function (...args) {
        if (!liveDependencies.isInitialized) {
            return;
        }
        // In this minimal test, we don't need the performance profiling logic,
        // we just need to call the real handler with the live dependencies.
        const newArgs = [...args.slice(0, -1), liveDependencies];
        try {
            await handlerFunction.apply(null, newArgs);
        } catch (e) {
            console.error(`[AC Test - EventHandler] Unhandled error in ${handlerName}: ${e?.message}\n${e?.stack}`);
        }
    };
}

import * as commandManager from './commandManager.js';

export const handleBeforeChatSend = profileEventHandler('handleBeforeChatSend', async (eventData, dependencies) => {
    const { sender, message } = eventData;
    const { config } = dependencies;

    console.log(`[AC Test - EventHandler] handleBeforeChatSend fired for player ${sender.name} with message: ${message}`);

    if (message.startsWith(config.prefix)) {
        console.log(`[AC Test - EventHandler] Attempting to handle command: ${message}`);
        await commandManager.handleChatCommand(eventData, dependencies);
    }
});
