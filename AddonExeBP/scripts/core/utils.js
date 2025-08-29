import { system } from '@minecraft/server';
import { getConfig } from './configManager.js';

/**
 * Parses a duration string (e.g., "10m", "2h", "7d") and returns the duration in milliseconds.
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
            multiplier = 1000;
            break;
        case 'm':
            multiplier = 1000 * 60;
            break;
        case 'h':
            multiplier = 1000 * 60 * 60;
            break;
        case 'd':
            multiplier = 1000 * 60 * 60 * 24;
            break;
        case 'w':
            multiplier = 1000 * 60 * 60 * 24 * 7;
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

/**
 * Shows a form to a player, handling the 'UserBusy' case by sending a one-time message and then retrying.
 * @param {import('@minecraft/server').Player} player The player to show the form to.
 * @param {import('@minecraft/server-ui').ActionFormData | import('@minecraft/server-ui').ModalFormData | import('@minecraft/server-ui').MessageFormData} form The form to show.
 * @returns {Promise<any>} A promise that resolves with the form response, or undefined if it times out or is cancelled for other reasons.
 */
export async function uiWait(player, form) {
    let firstAttempt = await form.show(player);
    if (firstAttempt.cancelationReason !== 'UserBusy') {
        return firstAttempt;
    }

    // If the first attempt failed because the UI was busy, send the message and start retrying.
    player.sendMessage('§eOpening UI... please close chat to view.§r');

    const startTick = system.currentTick;
    while ((system.currentTick - startTick) < 1200) { // 1 minute timeout
        const subsequentAttempt = await form.show(player);
        if (subsequentAttempt.cancelationReason !== 'UserBusy') {
            return subsequentAttempt;
        }
    }

    return undefined; // Timeout
}

/**
 * Plays a configured sound for a player if it's enabled in the config.
 * @param {import('@minecraft/server').Player} player The player to play the sound for.
 * @param {keyof import('../config.js').config.soundEvents} soundEventKey The key of the sound event in the config.
 */
export function playSoundFromConfig(player, soundEventKey) {
    try {
        const config = getConfig();
        const soundEvent = config.soundEvents?.[soundEventKey];
        if (soundEvent && soundEvent.enabled) {
            player.playSound(soundEvent.soundId, {
                volume: soundEvent.volume,
                pitch: soundEvent.pitch
            });
        }
    } catch (e) {
        console.error(`Failed to play sound from config for key "${soundEventKey}": ${e}`);
    }
}
