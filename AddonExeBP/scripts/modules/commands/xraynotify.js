import { commandManager } from './commandManager.js';
import { getPlayer, savePlayerData } from '../../core/playerDataManager.js';
import { addAdminToXrayCache, removeAdminFromXrayCache } from '../../core/playerCache.js';

commandManager.register({
    name: 'xraynotify',
    description: 'Toggles X-Ray notifications for yourself.',
    category: '§4Administration',
    permissionLevel: 1, // Admin and above
    execute: (player, args) => {
        const pData = getPlayer(player.id);
        if (!pData) {
            player.sendMessage('§cCould not find your player data.');
            return;
        }

        pData.xrayNotifications = !pData.xrayNotifications;
        savePlayerData(player.id); // Save the change immediately

        if (pData.xrayNotifications) {
            addAdminToXrayCache(player.id);
        } else {
            removeAdminFromXrayCache(player.id);
        }

        const status = pData.xrayNotifications ? '§aenabled' : '§cdisabled';
        player.sendMessage(`§aX-Ray notifications have been ${status}§a for you.`);
    }
});
