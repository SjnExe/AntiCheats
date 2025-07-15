/**
 * @file Central registry for all command modules.
 * @module AntiCheatsBP/scripts/core/commandRegistry
 */

// This file is now only used for command aliases.
// The commandFilePaths map is generated dynamically in commandManager.js.

/**
 * Maps command aliases to their main command names.
 * @type {Map<string, string>}
 */
export const commandAliases = new Map([
    ['b', 'ban'],
    ['cc', 'clearchat'],
    ['i', 'inspect'],
    ['inv', 'invsee'],
    ['lr', 'listranks'],
    ['lw', 'listwatched'],
    ['m', 'mute'],
    ['p', 'panel'],
    ['pr', 'purgerank'],
    ['rr', 'removerank'],
    ['v', 'vanish'],
    ['ver', 'version'],
    ['vr', 'viewreports'],
    ['w', 'watch'],
    ['wb', 'worldborder'],
    ['xray', 'xraynotify'],
    // Add other aliases here
]);
