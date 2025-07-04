/**
 * @file Example Configuration for AntiCheat System
 *
 * This file provides an example of how to structure your 'config.js'.
 * Rename this file to 'config.js' and place it in the same directory
 * (AntiCheatsBP/scripts/) to use these settings.
 *
 * Customize the values below to suit your server's needs.
 * Detailed explanations for most settings can be found in the documentation
 * or by referring to the JSDoc comments in the actual 'config.js' file
 * (specifically the `defaultConfigSettings` object).
 */

// --- Essential System Settings ---
export const acVersion = 'v__VERSION_STRING__'; // This is usually set by the build process

export const defaultConfigSettings = {
    adminTag: 'admin',
    ownerPlayerName: 'YourExactPlayerName', // IMPORTANT: Replace with the owner's exact Minecraft username
    enableDebugLogging: false, // Set to true ONLY for development or active troubleshooting
    prefix: '!',
    vanishedPlayerTag: 'vanished',

    // --- Notifications ---
    // These control which admin notifications are sent.
    // The `playerUtils.notifyAdmins` function has its own global toggle (`acGlobalNotificationsDefaultOn`)
    // and per-admin tags (`ac_notifications_on`/`ac_notifications_off`) that determine if an admin *receives*
    // a generated notification. These toggles here determine if the notification is *generated* in the first place.
    notifications: {
        notifyOnPlayerFlagged: true,       // When a player is flagged by any check
        notifyOnCombatLog: true,           // For combat log detections
        notifyOnAutoModAction: true,       // When AutoMod performs an action (warn, kick, mute, ban)
        notifyOnNewPlayerJoin: true,       // When a new player (initial spawn) joins the server
        notifyOnDimensionLockAttempt: true,// When a player tries to enter a locked dimension
        notifyOnAdminUtilCommandUsage: true, // For general admin commands like /clearchat, /vanish, rank changes
        notifyOnCopyInventory: true,       // For /copyinv command usage
        notifyOnNewPlayerReport: true,     // When a new player report is submitted
    },

    // --- Sound Events Configuration ---
    /**
     * @description Configuration for sound events triggered by the AntiCheat system.
     * Each key represents a specific event.
     * `enabled`: (boolean) Whether this sound event is active.
     * `soundId`: (string) The Minecraft sound ID (e.g., "random.orb", "note.pling"). Empty or null means no sound.
     * `volume`: (number, optional) Sound volume, typically 0.0 to 1.0. Defaults to 1.0.
     * `pitch`: (number, optional) Sound pitch. Defaults to 1.0.
     * `target`: (string, optional) Who hears the sound:
     *           - "player": The player directly involved in or causing the event.
     *           - "admin": All online administrators who have notifications enabled.
     *           - "targetPlayer": A specific target player of an action (e.g., for TPA).
     *           - "global": All online players (use with extreme caution).
     * `description`: (string) A human-readable description of when this sound plays.
     */
    soundEvents: {
        tpaRequestReceived: {
            enabled: true,
            soundId: "random.orb",
            volume: 1.0,
            pitch: 1.2,
            target: "targetPlayer",
            description: "Sound played for a player when they receive a TPA request (tpa or tpahere)."
        },
        adminNotificationReceived: {
            enabled: true,
            soundId: "note.pling",
            volume: 0.8,
            pitch: 1.5,
            target: "admin",
            description: "Sound played for an admin when they receive any AntiCheat system notification via notifyAdmins."
        },
        playerWarningReceived: {
            enabled: true,
            soundId: "note.bass",
            volume: 1.0,
            pitch: 0.8,
            target: "player",
            description: "Sound played for a player when they receive a direct warning message from AntiCheat (e.g., from a check or AutoMod)."
        },
        uiFormOpen: {
            enabled: false, // Example: Disabled by default
            soundId: "ui.button.click",
            volume: 0.7,
            pitch: 1.0,
            target: "player",
            description: "Sound played when a UI form (e.g., admin panel, report form) is opened for a player."
        },
        commandSuccess: {
            enabled: false, // Example: Disabled by default
            soundId: "random.successful_hit",
            volume: 0.8,
            pitch: 1.0,
            target: "player",
            description: "Sound played for a player when they execute a command successfully."
        },
        commandError: {
            enabled: false, // Example: Disabled by default
            soundId: "mob.villager.no",
            volume: 1.0,
            pitch: 0.9,
            target: "player",
            description: "Sound played for a player when a command they executed results in an error."
        },
        automodActionTaken: {
            enabled: true,
            soundId: "mob.irongolem.hit", // A more impactful sound
            volume: 1.0,
            pitch: 0.9,
            target: "player",
            description: "Sound played for a player when AutoMod takes a significant action against them (e.g., mute, kick, ban)."
        }
    },

    // Add other essential or commonly modified configurations here as examples.
    // For a full list of all default configurations, refer to the main `config.js` file's `defaultConfigSettings`.
    enableAutoMod: false,
    enableTpaSystem: false,
    enableCombatLogDetection: false,
    // ... etc.
};

// This is the object that will be imported and used by other modules.
// It starts as a copy of defaultConfigSettings and can be updated at runtime.
export let editableConfigValues = { ...defaultConfigSettings };

// Function to update config values at runtime (simplified example)
export function updateConfigValue(key, value) {
    if (Object.prototype.hasOwnProperty.call(editableConfigValues, key)) {
        // Basic type coercion could be added here if necessary
        editableConfigValues[key] = value;
        console.log(`[Config] Updated '${key}' to: ${JSON.stringify(value)}`);
        return true;
    }
    console.warn(`[Config] Attempted to update unknown config key: ${key}`);
    return false;
}

// It's crucial that this example file mirrors the export structure of the actual config.js
// so that if a user renames it, the addon continues to function.
```
