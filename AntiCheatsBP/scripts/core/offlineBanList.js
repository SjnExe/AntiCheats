/**
 * @file Defines a static, offline ban list.
 * @module AntiCheatsBP/scripts/core/offlineBanList
 * This list is used to ban players by name or XUID without them needing to be online.
 * It is intended to be edited directly by server administrators in the addon files.
 */

/**
 * @typedef {object} OfflineBanEntry
 * @property {string} [playerName] The case-insensitive name of the player to ban.
 * @property {string} [xuid] The XUID of the player to ban.
 * @property {string} [reason] The reason for the ban.
 * @property {string} [bannedBy] The name of the admin who added the ban.
 */

/**
 * An array of players to be banned. Add entries to this list.
 * At least one of playerName or xuid must be provided for each entry.
 * @type {OfflineBanEntry[]}
 */
export const offlineBanList = [
    // Example entries:
    // { playerName: 'SomeGriefer', reason: 'Persistent griefing.', bannedBy: 'AdminName' },
    // { xuid: '1234567890123456', reason: 'X-Ray usage.', bannedBy: 'AdminName' },
];
