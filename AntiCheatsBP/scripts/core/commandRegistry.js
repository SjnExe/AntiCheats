/**
 * @file Central registry for all command modules. This file imports all individual command
 * @module AntiCheatsBP/scripts/core/commandRegistry
 * files and exports them as an array to be used by the commandManager.
 *
 * IMPORTANT: THIS FILE IS MANUALLY MAINTAINED.
 * Ensure this file is updated when adding, removing, or renaming command files
 * in the '../commands/' directory. Refer to 'Dev/README.md' for instructions.
 */

// Import all command modules
import * as addrankCmd from '../commands/addrank.js';
import * as banCmd from '../commands/ban.js';
import * as clearchatCmd from '../commands/clearchat.js';
import * as clearreportsCmd from '../commands/clearreports.js';
import * as copyinvCmd from '../commands/copyinv.js';
import * as endlockCmd from '../commands/endlock.js';
import * as freezeCmd from '../commands/freeze.js';
import * as gmaCmd from '../commands/gma.js';
import * as gmcCmd from '../commands/gmc.js';
import * as gmsCmd from '../commands/gms.js';
import * as gmspCmd from '../commands/gmsp.js';
import * as helpCmd from '../commands/help.js';
import * as inspectCmd from '../commands/inspect.js';
import * as invseeCmd from '../commands/invsee.js';
import * as kickCmd from '../commands/kick.js';
import * as listranksCmd from '../commands/listranks.js';
import * as listwatchedCmd from '../commands/listwatched.js';
import * as muteCmd from '../commands/mute.js';
import * as myflagsCmd from '../commands/myflags.js';
import * as netherlockCmd from '../commands/netherlock.js';
import * as notifyCmd from '../commands/notify.js';
import * as panelCmd from '../commands/panel.js';
import * as purgeflagsCmd from '../commands/purgeflags.js';
import * as removerankCmd from '../commands/removerank.js';
import * as reportCmd from '../commands/report.js';
import * as resetflagsCmd from '../commands/resetflags.js';
import * as rulesCmd from '../commands/rules.js';
import * as testnotifyCmd from '../commands/testnotify.js';
import * as tpCmd from '../commands/tp.js';
import * as tpaCmd from '../commands/tpa.js';
import * as tpacancelCmd from '../commands/tpacancel.js';
import * as tpacceptCmd from '../commands/tpaccept.js';
import * as tpahereCmd from '../commands/tpahere.js';
import * as tpastatusCmd from '../commands/tpastatus.js';
import * as unbanCmd from '../commands/unban.js';
import * as unmuteCmd from '../commands/unmute.js';
import * as vanishCmd from '../commands/vanish.js';
import * as versionCmd from '../commands/version.js';
import * as viewreportsCmd from '../commands/viewreports.js';
import * as warningsCmd from '../commands/warnings.js';
import * as watchCmd from '../commands/watch.js';
import * as worldborderCmd from '../commands/worldborder.js';
import * as xraynotifyCmd from '../commands/xraynotify.js';

/**
 * Array containing all registered command modules.
 * Each module is expected to export a `definition` object (conforming to `CommandDefinition` type)
 * and an `execute` function.
 */
/** @type {Array<import('../types.js').CommandModule>} */
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
    unbanCmd,
    unmuteCmd,
    vanishCmd,
    versionCmd,
    viewreportsCmd,
    warningsCmd,
    watchCmd,
    worldborderCmd,
    xraynotifyCmd,
];

// Ensure JSDoc type import path is correct based on its location relative to types.js
// If commandRegistry.js is in 'core/', and types.js is in root 'scripts/', path is '../types.js'
// If commandRegistry.js is in 'commands/', and types.js is in root 'scripts/', path is '../../types.js'
// Current: core/commandRegistry.js -> ../types.js is correct.
