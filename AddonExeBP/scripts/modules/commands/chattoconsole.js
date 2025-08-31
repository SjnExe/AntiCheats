import { commandManager } from './commandManager.js';
import { getConfig, updateConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'chattoconsole',
    aliases: ['ctc', 'chat'],
    description: 'Toggles or sets whether player chat is logged to the server console.',
    category: 'Administration',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        const config = getConfig();
        const chatConfig = config.chat || { logToConsole: false };
        const arg = args[0]?.toLowerCase();

        let newValue;

        if (arg === 'true' || arg === 'on') {
            newValue = true;
        } else if (arg === 'false' || arg === 'off') {
            newValue = false;
        } else {
            // No valid argument, so toggle the current setting
            newValue = !chatConfig.logToConsole;
        }

        if (newValue === chatConfig.logToConsole) {
            player.sendMessage(`§eChat-to-console is already ${newValue ? '§aenabled' : '§cdisabled'}§e.`);
            return;
        }

        // Update the setting
        chatConfig.logToConsole = newValue;
        updateConfig('chat', chatConfig);

        player.sendMessage(`§aChat-to-console has been ${newValue ? '§aenabled' : '§cdisabled'}§a.`);
    }
});
