/**
 * Parses a duration string (e.g., "10m", "2h", "7d") and returns the duration in milliseconds.
 * Supports seconds (s), minutes (m), hours (h), days (d), and weeks (w).
 * @param {string} durationString The duration string to parse.
 * @returns {number} The duration in milliseconds, or 0 if the format is invalid.
 */
export function parseDuration(durationString) {
    const durationRegex = /^(\d+)([smhdw])$/;
    const match = durationString.toLowerCase().match(durationRegex);

    if (!match) {
        return 0;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];
    let multiplier = 0;

    switch (unit) {
        case 's':
            multiplier = 1000; // seconds
            break;
        case 'm':
            multiplier = 1000 * 60; // minutes
            break;
        case 'h':
            multiplier = 1000 * 60 * 60; // hours
            break;
        case 'd':
            multiplier = 1000 * 60 * 60 * 24; // days
            break;
        case 'w':
            multiplier = 1000 * 60 * 60 * 24 * 7; // weeks
            break;
    }

    return value * multiplier;
}

/**
 * Plays a sound for a specific player.
 * @param {import('@minecraft/server').Player} player The player to play the sound for.
 * @param {string} soundId The ID of the sound to play.
 */
export function playSound(player, soundId) {
    try {
        player.playSound(soundId);
    } catch (e) {
        console.error(`Failed to play sound "${soundId}" for player ${player.name}: ${e}`);
    }
}
