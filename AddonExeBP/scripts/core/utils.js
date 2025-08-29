import { system } from '@minecraft/server';

/**
 * Shows a form to a player, handling the 'UserBusy' case by retrying.
 * This is a simplified version for the rebuild.
 * @param {import('@minecraft/server').Player} player The player to show the form to.
 * @param {import('@minecraft/server-ui').ActionFormData | import('@minecraft/server-ui').ModalFormData} form The form to show.
 * @returns {Promise<any>} A promise that resolves with the form response.
 */
export async function uiWait(player, form) {
    // A simpler implementation for now, without the complex retry logic.
    return await form.show(player);
}
