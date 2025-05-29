/**
 * @file behaviour/scripts/command/importer.js
 * @description This file serves as an importer for all command modules within the system.
 * Its primary purpose is to ensure that each command script is loaded, allowing them
 * to register themselves with the command handler. It does not define any functions,
 * classes, or methods itself but relies on the side effects of the imported modules.
 */

import "../command/src/ban";
import "../command/src/unban";
import "../command/src/invsee";
import "../command/src/copyinv";
import "../command/src/mute";
import "../command/src/unmute";
import "../command/src/summon_npc";
import "../command/src/vanish";
import "../command/src/clearchat";
import "../command/src/fakeleave";
import "../command/src/fakejoin";
import "../command/src/lagclear";
import "../command/src/notify";
import "../command/src/worldborder";
import "../command/src/help";
import "../command/src/freeze";
import "../command/src/toggledeviceban";
import "../command/src/version";
import "../command/src/warn";
import "../command/src/warnings";
import "../command/src/clearwarn";
import "../command/src/systeminfo";
import "../command/src/removeowner";
import "../command/src/clearbanlogs";
import "./src/setrank.js";
import "./src/offlineban.js";
import "./src/offlineunban.js";
import "./src/teleport.js";
import "./src/ui.js"; // Added for the new !ui command
import "./src/commands/owner.js";
import "./src/panel.js"; // Added for the new !panel command

import "../command/src/report";
