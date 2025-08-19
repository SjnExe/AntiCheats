import { world } from '@minecraft/server';

/**
 * Finds an online player by their name.
 * @param {string} playerName The name of the player to find.
 * @returns {import('@minecraft/server').Player | undefined} The player object if found, otherwise undefined.
 */
export function findPlayerByName(playerName) {
    const lowerCasePlayerName = playerName.toLowerCase();
    for (const player of world.getAllPlayers()) {
        if (player.name.toLowerCase() === lowerCasePlayerName) {
            return player;
        }
    }
    return undefined;
}
