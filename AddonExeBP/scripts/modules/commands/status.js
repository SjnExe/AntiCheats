import { commandManager } from './commandManager.js';
import { world, system } from '@minecraft/server';

commandManager.register({
    name: 'status',
    description: 'Displays the current server status.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    allowConsole: true,
    parameters: [],
    execute: (player, args) => {
        const onlinePlayers = world.getAllPlayers().length;
        const statusText = [
            '§l§b--- Server Status ---§r',
            `§eOnline Players: §f${onlinePlayers}`,
            `§eCurrent Tick: §f${system.currentTick}`
        ].join('\n');

        player.sendMessage(statusText);
    }
});
