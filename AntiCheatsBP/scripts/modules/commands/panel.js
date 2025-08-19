import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';

commandManager.register({
    name: 'panel',
    description: 'Opens the admin control panel.',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        const mainPanel = new ActionFormData()
            .title("Admin Panel")
            .body("Select an action to perform.")
            .button("Kick Player", "textures/ui/hammer_l.png")
            .button("Mute Player", "textures/ui/mute_l.png");

        mainPanel.show(player).then(response => {
            if (response.canceled) return;

            if (response.selection === 0) { // Kick Player
                showKickForm(player);
            } else if (response.selection === 1) { // Mute Player
                showMuteForm(player);
            }
        });
    }
});

function showKickForm(player) {
    const form = new ModalFormData()
        .title("Kick Player")
        .textField("Player Name", "Enter the name of the player to kick")
        .textField("Reason", "Enter the reason for kicking", "No reason provided");

    form.show(player).then(async response => {
        if (response.canceled) return;

        const [targetName, reason] = response.formValues;
        const targetPlayer = findPlayerByName(targetName);

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found.`);
            return;
        }

        try {
            await world.runCommandAsync(`kick "${targetPlayer.name}" ${reason}`);
            player.sendMessage(`§aSuccessfully kicked ${targetPlayer.name}.`);
        } catch (error) {
            player.sendMessage(`§cFailed to kick ${targetPlayer.name}.`);
        }
    });
}

function showMuteForm(player) {
    const form = new ModalFormData()
        .title("Mute Player")
        .textField("Player Name", "Enter the name of the player to mute");

    form.show(player).then(response => {
        if (response.canceled) return;

        const [targetName] = response.formValues;
        const targetPlayer = findPlayerByName(targetName);

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found.`);
            return;
        }

        try {
            targetPlayer.addTag('muted');
            player.sendMessage(`§aSuccessfully muted ${targetPlayer.name}.`);
            targetPlayer.sendMessage("§cYou have been muted.");
        } catch (error) {
            player.sendMessage(`§cFailed to mute ${targetPlayer.name}.`);
        }
    });
}
