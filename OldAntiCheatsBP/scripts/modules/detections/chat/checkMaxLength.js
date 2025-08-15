/**
 * @typedef {import('../../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../../types.js').Dependencies} Dependencies
 */

const maxMessageSnippetLength = 50;
const defaultMaxMessageLength = 256;

/**
 * Checks if a chat message exceeds the configured maximum length.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} event The chat event.
 * @param {PlayerAntiCheatData} pData The player's data.
 * @param {Dependencies} dependencies The command dependencies.
 */
export async function checkMaxLength(player, event, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const originalMessage = event.message;
    const maxLength = config.maxMessageLength ?? defaultMaxMessageLength;

    if (originalMessage.length > maxLength) {
        playerUtils?.warnPlayer(player, playerUtils.getString('chat.error.maxLength', dependencies, { maxLength }));
        const messageSnippet = originalMessage.substring(0, maxMessageSnippetLength) + (originalMessage.length > maxMessageSnippetLength ? '...' : '');

        const shouldCancelForMaxLength = config.cancelOnMaxMessageLength !== false;
        if (shouldCancelForMaxLength) {
            event.cancel = true;
        }

        if (config.flagOnMaxMessageLength) {
            await actionManager?.executeCheckAction(player, 'chatMaxLength', { messageLength: originalMessage.length, maxLength, messageSnippet }, dependencies);
        }
    }
}
