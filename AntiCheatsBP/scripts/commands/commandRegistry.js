/**
 * @file AntiCheatsBP/scripts/commands/commandRegistry.js
 * Central registry for all command modules. This file imports all individual command
 * files and exports them as an array to be used by the commandManager.
 * @version 1.0.1
 */
// AntiCheatsBP/scripts/commands/commandRegistry.js
import * as versionCmd from './version.js';
import * as myflagsCmd from './myflags.js';
import * as testnotifyCmd from './testnotify.js';
import * as kickCmd from './kick.js';
import * as clearchatCmd from './clearchat.js';
import * as inspectCmd from './inspect.js';
import * as warningsCmd from './warnings.js';
import * as resetflagsCmd from './resetflags.js'; // Handles resetflags (and clearwarnings via alias)
import * as vanishCmd from './vanish.js';
import * as freezeCmd from './freeze.js';
import * as muteCmd from './mute.js';
import * as unmuteCmd from './unmute.js';
import * as banCmd from './ban.js';
import * as unbanCmd from './unban.js';
import * as gmcCmd from './gmc.js';
import * as gmsCmd from './gms.js';
import * as gmaCmd from './gma.js';
import * as gmspCmd from './gmsp.js';
import * as helpCmd from './help.js';
import * as invseeCmd from './invsee.js';
import * as panelCmd from './panel.js';
import * as notifyCmd from './notify.js';
import * as xraynotifyCmd from './xraynotify.js';
import * as tpCmd from './tp.js';
import * as copyinvCmd from './copyinv.js';
import * as uinfoCmd from './uinfo.js';

/**
 * Array containing all registered command modules.
 * Each module is expected to export a `definition` object and an `execute` function.
 * @type {Array<import('../types.js').CommandModule>}
 */
export const commandModules = [
    versionCmd,
    myflagsCmd,
    testnotifyCmd,
    kickCmd,
    clearchatCmd,
    inspectCmd,
    warningsCmd,
    resetflagsCmd,
    vanishCmd,
    freezeCmd,
    muteCmd,
    unmuteCmd,
    banCmd,
    unbanCmd,
    gmcCmd,
    gmsCmd,
    gmaCmd,
    gmspCmd,
    helpCmd,
    invseeCmd,
    panelCmd,
    notifyCmd,
    xraynotifyCmd,
    tpCmd,
    copyinvCmd,
    uinfoCmd,
];
// console.log("[CommandRegistry] Registered final batch of commands.");
