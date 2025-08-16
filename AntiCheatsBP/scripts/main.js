import { world, system } from '@minecraft/server';

// This function will contain the main logic of the addon that runs continuously.
function mainTick() {
    // For now, this is empty. We will add cheat detections here later.
}

// Run the initialization logic on the next tick after the script is loaded.
system.run(() => {
    console.log('[AntiCheats] Initializing addon...');

    const defaultConfig = {
        version: '1.0.0',
        modules: {
            fly: {
                enabled: true,
                puniishment: 'kick',
            },
            speed: {
                enabled: true,
                maxSpeed: 10,
                punishment: 'teleport_back',
            },
        },
    };

    // Check if the configuration is already stored in a dynamic property
    const config = world.getDynamicProperty('anticheats:config');
    if (config === undefined) {
        // If not, this is the first time the addon is running.
        // Store the default configuration.
        world.setDynamicProperty('anticheats:config', JSON.stringify(defaultConfig));
        console.log('[AntiCheats] No existing config found. Created a new one.');
    } else {
        // If a config already exists, we will load it.
        // For now, we just log that we found it.
        // In the future, we will add migration logic here.
        console.log('[AntiCheats] Existing config found.');
    }

    // Start the main tick loop
    system.runInterval(mainTick);

    console.log('[AntiCheats] Addon initialized successfully.');
});

// For now, I will keep the chat message forwarder to show the addon is active.
world.beforeEvents.chatSend.subscribe((eventData) => {
    eventData.cancel = true;
    world.sendMessage(`§l§cAnti §eCheats§r> §a${eventData.sender.name}§r: ${eventData.message}`);
});
