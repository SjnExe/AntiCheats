/**
 * @file Central registry for all command modules. This file provides mappings
 * @module AntiCheatsBP/scripts/core/commandRegistry
 * for command names to their module paths and for aliases to their main command names.
 * This setup facilitates dynamic command loading.
 */

/**
 * A map where keys are lowercase command names and values are the paths to the command modules.
 * This allows the commandManager to dynamically import a command only when it's first used.
 * @type {Map<string, string>}
 */
export const commandFilePaths = new Map([
    ['addrank', '../commands/addrank.js'],
    ['ban', '../commands/ban.js'],
    ['clearchat', '../commands/clearchat.js'],
    ['clearreports', '../commands/clearreports.js'],
    ['copyinv', '../commands/copyinv.js'],
    ['endlock', '../commands/endlock.js'],
    ['freeze', '../commands/freeze.js'],
    ['gma', '../commands/gma.js'],
    ['gmc', '../commands/gmc.js'],
    ['gms', '../commands/gms.js'],
    ['gmsp', '../commands/gmsp.js'],
    ['help', '../commands/help.js'],
    ['inspect', '../commands/inspect.js'],
    ['invsee', '../commands/invsee.js'],
    ['kick', '../commands/kick.js'],
    ['listranks', '../commands/listranks.js'],
    ['listwatched', '../commands/listwatched.js'],
    ['mute', '../commands/mute.js'],
    ['myflags', '../commands/myflags.js'],
    ['netherlock', '../commands/netherlock.js'],
    ['notify', '../commands/notify.js'],
    ['panel', '../commands/panel.js'],
    ['purgeflags', '../commands/purgeflags.js'],
    ['removerank', '../commands/removerank.js'],
    ['report', '../commands/report.js'],
    ['resetflags', '../commands/resetflags.js'],
    ['rules', '../commands/rules.js'],
    ['testnotify', '../commands/testnotify.js'],
    ['tp', '../commands/tp.js'],
    ['tpa', '../commands/tpa.js'],
    ['tpacancel', '../commands/tpacancel.js'],
    ['tpaccept', '../commands/tpaccept.js'],
    ['tpahere', '../commands/tpahere.js'],
    ['tpastatus', '../commands/tpastatus.js'],
    ['unban', '../commands/unban.js'],
    ['unmute', '../commands/unmute.js'],
    ['vanish', '../commands/vanish.js'],
    ['version', '../commands/version.js'],
    ['viewreports', '../commands/viewreports.js'],
    ['warnings', '../commands/warnings.js'],
    ['watch', '../commands/watch.js'],
    ['worldborder', '../commands/worldborder.js'],
    ['xraynotify', '../commands/xraynotify.js'],
]);

/**
 * A map where keys are lowercase aliases and values are their corresponding main command names (also lowercase).
 * This map is loaded at startup to allow for immediate alias resolution without needing to load the command module itself.
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
