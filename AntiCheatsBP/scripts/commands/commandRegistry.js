/**
 * @file Central registry for all command modules. This file imports all individual command
 * files and exports them as an array to be used by the commandManager.
 */

import * as addrankCmd from './addrank.js';
import * as banCmd from './ban.js';
import * as clearchatCmd from './clearchat.js';
import * as clearreportsCmd from './clearreports.js';
import * as copyinvCmd from './copyinv.js';
import * as endlockCmd from './endlock.js';
import * as freezeCmd from './freeze.js';
import * as gmaCmd from './gma.js';
import * as gmcCmd from './gmc.js';
import * as gmsCmd from './gms.js';
import * as gmspCmd from './gmsp.js';
import * as helpCmd from './help.js';
import * as inspectCmd from './inspect.js';
import * as invseeCmd from './invsee.js';
import * as kickCmd from './kick.js';
import * as listranksCmd from './listranks.js';
import * as listwatchedCmd from './listwatched.js';
import * as muteCmd from './mute.js';
import * as myflagsCmd from './myflags.js';
import * as netherlockCmd from './netherlock.js';
import * as notifyCmd from './notify.js';
import * as panelCmd from './panel.js';
import * as purgeflagsCmd from './purgeflags.js';
import * as removerankCmd from './removerank.js';
import * as reportCmd from './report.js';
import * as resetflagsCmd from './resetflags.js';
import * as rulesCmd from './rules.js';
import * as testnotifyCmd from './testnotify.js';
import * as tpCmd from './tp.js';
import * as tpaCmd from './tpa.js';
import * as tpacancelCmd from './tpacancel.js';
import * as tpacceptCmd from './tpaccept.js';
import * as tpahereCmd from './tpahere.js';
import * as tpastatusCmd from './tpastatus.js';
import * as uinfoCmd from './uinfo.js';
import * as unbanCmd from './unban.js';
import * as unmuteCmd from './unmute.js';
import * as unwatchCmd from './unwatch.js';
import * as vanishCmd from './vanish.js';
import * as versionCmd from './version.js';
import * as viewreportsCmd from './viewreports.js';
import * as warningsCmd from './warnings.js';
import * as watchCmd from './watch.js';
import * as worldborderCmd from './worldborder.js';
import * as xraynotifyCmd from './xraynotify.js';

/**
 * Array containing all registered command modules.
 * Each module is expected to export a `definition` object (conforming to `CommandDefinition` type)
 * and an `execute` function.
 * @type {Array<import('../types.js').CommandModule>}
 */
export const commandModules = [
    addrankCmd,
    banCmd,
    clearchatCmd,
    clearreportsCmd,
    copyinvCmd,
    endlockCmd,
    freezeCmd,
    gmaCmd,
    gmcCmd,
    gmsCmd,
    gmspCmd,
    helpCmd,
    inspectCmd,
    invseeCmd,
    kickCmd,
    listranksCmd,
    listwatchedCmd,
    muteCmd,
    myflagsCmd,
    netherlockCmd,
    notifyCmd,
    panelCmd,
    purgeflagsCmd,
    removerankCmd,
    reportCmd,
    resetflagsCmd,
    rulesCmd,
    testnotifyCmd,
    tpCmd,
    tpaCmd,
    tpacancelCmd,
    tpacceptCmd,
    tpahereCmd,
    tpastatusCmd,
    uinfoCmd,
    unbanCmd,
    unmuteCmd,
    unwatchCmd,
    vanishCmd,
    versionCmd,
    viewreportsCmd,
    warningsCmd,
    watchCmd,
    worldborderCmd,
    xraynotifyCmd,
];
