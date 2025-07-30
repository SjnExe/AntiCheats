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
];
