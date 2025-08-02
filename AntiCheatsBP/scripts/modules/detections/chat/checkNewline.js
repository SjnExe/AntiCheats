/**
 * @typedef {import('../../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../../types.js').Dependencies} Dependencies
 */

const maxMessageSnippetLength = 50;

/**
 * Checks for newline characters in a chat message.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} event The chat event.
 * @param {PlayerAntiCheatData} pData The player's data.
 * @param {Dependencies} dependencies The command dependencies.
 */
export async function checkNewline(player, event, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const originalMessage = event.message;

    if (originalMessage.includes('\n') || originalMessage.includes('\r')) {
        playerUtils?.warnPlayer(player, playerUtils.getString('chat.error.newline', dependencies));
        const messageSnippet = originalMessage.substring(0, maxMessageSnippetLength) + (originalMessage.length > maxMessageSnippetLength ? '...' : '');

        const shouldCancelForNewline = config.cancelMessageOnNewline !== false;
        if (shouldCancelForNewline) {
            event.cancel = true;
        }

        if (config.flagOnNewline) {
            await actionManager?.executeCheckAction(player, 'chatNewline', { message: messageSnippet }, dependencies);
        }
    }
}
