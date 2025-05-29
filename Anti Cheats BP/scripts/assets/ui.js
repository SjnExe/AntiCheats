import * as Minecraft from '@minecraft/server';
import { ActionFormData, MessageFormData, ModalFormData } from '@minecraft/server-ui';
import { addPlayerToUnbanQueue, copyInv, getPlayerByName, invsee, millisecondTime, sendMessageToAllAdmins } from './util.js';
import { logDebug } from './logger.js';
import { ModuleStatusManager } from '../classes/module.js';
import CONFIG from "../config.js";
// import { reportPlayerInternal } from '../command/src/report.js'; // No longer needed here, submitReport will be used
import { submitReport } from '../systems/report_system.js';      // For submitting player reports
import { i18n } from './i18n.js'; // Added for localization

const world = Minecraft.world;

const uiLogCache = {
    // Example structure: 'ac:commandLogs': { data: [], timestamp: 0, raw: "" }
};
const UI_LOG_CACHE_DURATION_MS = 3000; // Cache for 3 seconds

/**
 * Retrieves and parses logs from a dynamic property, utilizing a short-lived cache.
 * @param {string} dynamicPropertyKey The key of the dynamic property.
 * @param {string} logTypeNameForError A user-friendly name for the log type for error messages.
 * @returns {Array<object>} The parsed array of log objects.
 */
function getLogsFromPropertyWithCache(dynamicPropertyKey, logTypeNameForError) {
    const cached = uiLogCache[dynamicPropertyKey];
    const currentTime = Date.now();
    const rawLogs = world.getDynamicProperty(dynamicPropertyKey); // Read current raw string

    if (cached && (currentTime - cached.timestamp < UI_LOG_CACHE_DURATION_MS) && cached.raw === rawLogs) {
        // Cache is valid if time hasn't expired AND raw string hasn't changed
        return cached.data;
    }

    let logsArray = [];
    if (typeof rawLogs === 'string') {
        try {
            logsArray = JSON.parse(rawLogs);
            if (!Array.isArray(logsArray)) {
                logsArray = [];
                logDebug(`[Anti Cheats UI] ${dynamicPropertyKey} was not an array, treated as empty.`);
            }
        } catch (e) {
            logDebug(`[Anti Cheats UI ERROR] Failed to parse ${dynamicPropertyKey}:`, e);
            // Avoid player.sendMessage here as this function might be called where 'player' is not in scope directly
            // The caller function should handle player messages if needed.
            logsArray = [];
        }
    }
    
    uiLogCache[dynamicPropertyKey] = { data: logsArray, timestamp: currentTime, raw: rawLogs };
    return logsArray;
}


/**
 * Handles the ban process for a target player.
 * It can perform a "quick" permanent ban or a "slow" ban with configurable duration.
 * Displays appropriate UI forms to the initiating player.
 * Navigates back to a previous form if specified.
 * This function does not return a value directly but manages UI flow.
 *
 * @param {Minecraft.Player} player The player initiating the ban.
 * @param {Minecraft.Player} targetPlayer The player to be banned.
 * @param {"quick"|"slow"} type The type of ban to perform. "quick" for a quick, permanent ban; "slow" for a ban with custom duration and reason.
 * @param {string} [banReason] The reason for the ban (used in "slow" ban if provided, otherwise "No reason provided" for "quick" ban if not applicable).
 * @param {Function} [previousForm] An optional function to call to navigate back to the previous UI screen.
 * @returns {void}
 * @throws {Error} If an error occurs during UI display or interaction, or if the target player is an admin.
 */
function banForm(player, targetPlayer, type, banReason, previousForm) { // Added previousForm
	if(targetPlayer.hasAdmin()) {
		player.sendMessage(`§6[§eAnti Cheats§6]§r Can't ban §e${targetPlayer.name}§f they're an admin.`);
		if (previousForm) return previousForm(player); // Go back if target is admin
		return;
	}

	if(type == "quick"){ 
		let confirmQuickBanForm = new MessageFormData() // Renamed
			.title("§l§4Quick Ban Player") // Enhanced title
			.body(`§lTarget:§r ${targetPlayer.name}\n\nAre you sure you want to issue a quick, permanent ban?`) // Enhanced body
			.button2("§4Confirm Ban")    // selection 1
			.button1("§cCancel");        // selection 0
		confirmQuickBanForm.show(player).then((confirmData) => {
			if(confirmData.canceled || confirmData.selection === 0) { // Cancelled or pressed "Cancel"
				player.sendMessage(`§6[§eAnti Cheats§6]§f Ban cancelled.`);
				if (previousForm) return previousForm(player); 
				return;
			}
			// Ban action (selection 1)
			targetPlayer.ban("No reason provided.", Date.now(), true, player);
			targetPlayer.runCommand(`kick "${targetPlayer.name}" §r§6[§eAnti Cheats§6]§r §4You are permanently banned.\n§4Reason: §cNo reason provided\n§4Banned by: §c${player.name}`);
			player.sendMessage(`§6[§eAnti Cheats§6]§f Successfully banned §e${targetPlayer.name}`);
			sendMessageToAllAdmins(`§6[§eAnti Cheats Notify§6]§f §e${player.name}§f banned §e${targetPlayer.name}§f!`,true);
			
			if (previousForm) return previousForm(player); // After action, return to previous form

		}).catch(e => {
			logDebug(`[Anti Cheats UI Error][banFormQuick]: ${e} ${e.stack}`);
			if (player && typeof player.sendMessage === 'function') {
				player.sendMessage("§cAn error occurred with the UI. Please try again.");
			}
			if (previousForm) previousForm(player);
		});
	}
	else if(type=="slow"){ 
		let banModalForm = new ModalFormData() 
		.title("§l§4Custom Ban: " + targetPlayer.name) // Enhanced title
		.slider("Days",0,360,1,0) // Simplified labels
		.slider("Hours",0,23,1,0)
		.slider("Minutes",0,59,1,0)
		.toggle("Permanent Ban", false); // Simplified label, ensure defaultValue is boolean

		banModalForm.show(player).then((banFormData) => {
			if(banFormData.canceled) {
				player.sendMessage(`§6[§eAnti Cheats§6]§f Ban form cancelled.`);
				if (previousForm) return previousForm(player); 
				return;
			}
			const now = Date.now();
			const values = banFormData.formValues;
			let unbanMinute = values[2] * millisecondTime.minute;
			let unbanHour = values[1] * millisecondTime.hour;
			let unbanDay = values[0] * millisecondTime.day;
			const unbanTime = now + (unbanMinute + unbanHour + unbanDay);
			const isPermanent = values[3];
			banReason = banReason ?? "No reason provided."
			
			if(unbanTime == now && !isPermanent) return player.sendMessage(`§r§6[§eAnti Cheats§6]§r§l§c ERROR:§r§4 You did not enter an unban time and did not set the ban to permanent, please make the ban permanent or enter a custom time for unban. The ban was not performed on §c${targetPlayer.name}`) 

			targetPlayer.ban(banReason, unbanTime, isPermanent, player);

			player.sendMessage(`§6[§eAnti Cheats§6]§f Successfully banned §e${targetPlayer.name}`);
			sendMessageToAllAdmins(`§6[§eAnti Cheats Notify§6]§f §e${player.name}§f banned §e${targetPlayer.name}§f!`, true);
			
			if (!isPermanent) player.runCommand(`kick "${targetPlayer.name}" §r§6[§eAnti Cheats§6]§r §4You are banned.\n§4Time Remaining: §c${values[0]} Days ${values[1]} Hours ${values[2]} Mins\n§4Reason: §c${banReason == "" ? "No reason provided." : banReason}\n§4Banned by: §c${player.name}`)
			if (isPermanent) player.runCommand(`kick "${targetPlayer.name}" §r§6[§eAnti Cheats§6]§r §4You are permanently banned.\n§4Reason: §c${banReason == "" ? "No reason provided." : banReason}\n§4Banned by: §c${player.name}`)
			

		}).catch(e => {
			logDebug(`[Anti Cheats UI Error][banFormSlow]: ${e} ${e.stack}`);
			if (player && typeof player.sendMessage === 'function') {
				player.sendMessage("§cAn error occurred with the UI. Please try again.");
			}
		});
	}
	else{
		return player.sendMessage(`§6[§eAnti Cheats§6]§r§c§lERROR:§4 Unexpected type of ban: §c${type}`)
	}
}

/**
 * Displays a form to unban a player by name.
 * Adds the specified player to an unban queue for processing.
 *
 * @export
 * @param {Minecraft.Player} player The player initiating the unban request.
 * @param {Function} [previousForm] An optional function to call to navigate back to the previous UI screen.
 * @returns {void}
 * @throws {Error} If an error occurs during UI display or interaction.
 */
export function unbanForm(player, previousForm){
	let unbanModalForm = new ModalFormData() 
	.title("§l§7Unban Player") // Enhanced title
	.textField("Enter Player Name (Case Sensitive)", "Player's exact name"); // Enhanced labels

	unbanModalForm.show(player).then((formData) => {
		if (formData.canceled) {
			player.sendMessage(`§6[§eAnti Cheats§6]§r Unban form cancelled.`);
			if (previousForm) return previousForm(player); // Go back if cancelled
			return;
		}
		const playerName = formData.formValues[0];
		
		addPlayerToUnbanQueue(player,playerName);
		// After attempting to add to queue, optionally go back or stay.
		// Going back is usually better for UI flow.
		if (previousForm) return previousForm(player);

	}).catch(e => {
		logDebug(`[Anti Cheats UI Error][unbanForm]: ${e} ${e.stack}`);
		if (player && typeof player.sendMessage === 'function') {
			player.sendMessage("§cAn error occurred with the UI. Please try again.");
		}
	});
}

/**
 * Displays the main user interface to a player.
 * Allows navigation to player list.
 *
 * @export
 * @param {Minecraft.Player} player The player to show the UI to.
 */
export function showMainUserInterface(player) {
    const form = new ActionFormData();
    form.title(i18n.getText("ui.main.title"));
    form.button(i18n.getText("ui.main.button.playerList")/*, "textures/ui/icon_steve.png"*/); // Optional icon

    form.show(player).then(response => {
        if (response.canceled || response.selection === undefined) {
            return;
        }

        if (response.selection === 0) { // Player List button
            showPlayerList(player);
        }
    }).catch(e => {
        logDebug(`[Anti Cheats UI Error][showMainUserInterface]: ${e} ${e.stack}`);
        if (player && typeof player.sendMessage === 'function') {
            player.sendMessage("§cAn error occurred with the User Interface. Please try again."); // Consider localizing this error too
        }
    });
}

/**
 * Stub function for displaying a player list.
 * Currently sends a "coming soon" message.
 *
 * @export
 * @param {Minecraft.Player} player The player to show the message to.
 */
export function showPlayerList(player) {
    const form = new MessageFormData();
    form.title(i18n.getText("ui.playerlist.title"));

    const allPlayers = world.getPlayers();
    const owners = [];
    const admins = [];
    const normalPlayers = [];

    for (const p of allPlayers) {
        if (p.isOwner()) {
            owners.push(p);
        } else if (p.hasAdmin()) {
            admins.push(p);
        } else {
            normalPlayers.push(p);
        }
    }

    let bodyText = "";

    // Owners
    bodyText += i18n.getText("ui.playerlist.category.owners") + "\n";
    if (owners.length > 0) {
        owners.forEach(p => {
            const ownerPrefix = i18n.getText("ui.playerlist.label.owner", { playerName: "" }); // Get prefix if any
            const rankColor = CONFIG.ranks.owner.nameColor || "§c";
            bodyText += `${ownerPrefix}${rankColor}${p.name}§r\n`;
        });
    } else {
        bodyText += i18n.getText("ui.playerlist.noneOnline") + "\n";
    }
    bodyText += "\n"; // Add a space between categories

    // Admins
    bodyText += i18n.getText("ui.playerlist.category.admins") + "\n";
    if (admins.length > 0) {
        admins.forEach(p => {
            const adminPrefix = i18n.getText("ui.playerlist.label.admin", { playerName: "" }); // Get prefix if any
            const rankColor = CONFIG.ranks.admin.nameColor || "§6";
            bodyText += `${adminPrefix}${rankColor}${p.name}§r\n`;
        });
    } else {
        bodyText += i18n.getText("ui.playerlist.noneOnline") + "\n";
    }
    bodyText += "\n"; // Add a space between categories

    // Normal Players / Members
    bodyText += i18n.getText("ui.playerlist.category.members") + "\n";
    if (normalPlayers.length > 0) {
        normalPlayers.forEach(p => {
            // Attempt to get specific rank color, fallback to member color
            const playerRankId = p.getDynamicProperty("ac:rankId") || CONFIG.defaultRank;
            const rankIdStr = typeof playerRankId === 'string' ? playerRankId : CONFIG.defaultRank;
            const rankInfo = CONFIG.ranks[rankIdStr];
            const rankColor = rankInfo ? rankInfo.nameColor : (CONFIG.ranks.member.nameColor || "§a");
            // For normal players, usually no prefix like "[Rank]" is used unless specified by rankInfo.displayText
            // For simplicity here, just name with color.
            bodyText += `${rankColor}${p.name}§r\n`;
        });
    } else {
        bodyText += i18n.getText("ui.playerlist.noneOnline") + "\n";
    }

    form.body(bodyText.trim()); // Trim trailing newline
    form.button1(i18n.getText("ui.button.back")); // "Back"
    form.button2("§7"); // Dummy button, often used as "Cancel" or just to fill the second slot

    form.show(player).then(response => {
        if (response.canceled) {
             // If player cancels (e.g. hits escape), go back to main UI.
            showMainUserInterface(player);
            return;
        }
        // Selection 0 is button1 ("Back")
        if (response.selection === 0) {
            showMainUserInterface(player);
        }
        // If there was a button2 and it was selected (selection 1), it would also go back here or do nothing.
    }).catch(e => {
        logDebug(`[Anti Cheats UI Error][showPlayerList]: ${e} ${e.stack}`);
        if (player && typeof player.sendMessage === 'function') {
            player.sendMessage(i18n.getText("ui.error.generic"));
        }
    });
}

/**
 * Displays system information to an admin player using a MessageFormData.
 * Information includes server time, player counts (total, owners, admins, normal),
 * total banned players, and script-observed TPS.
 *
 * @export
 * @param {Minecraft.Player} player The admin player to show the form to.
 * @param {Function} previousForm A function to call to return to the previous UI screen.
 * @returns {void}
 * @throws {Error} If the player is not an admin or if a UI error occurs.
 */
export function showSystemInformation(player, previousForm) { 
	if (!player.hasAdmin()) {
		player.tell("§cYou do not have permission to view system information.");
		return previousForm(player); // Go back if not admin
	}

	const form = new MessageFormData();
	form.title("§l§7System Information");

	// Gather information
	const serverTime = new Date().toLocaleString();
	
	const allPlayers = world.getAllPlayers();
	const onlinePlayerCount = allPlayers.length;
	
	let ownerNames = [];
    let adminNames = [];
    let normalPlayerNames = [];

	for (const p of allPlayers) {
        if (p.isOwner()) {
            ownerNames.push(`§c${p.name}§r`); 
        } else if (p.hasTag('admin')) { 
            adminNames.push(`§6${p.name}§r`); 
        } else {
            normalPlayerNames.push(`§a${p.name}§r`); 
        }
    }
    const ownerOnlineCount = ownerNames.length;
    const displayedAdminsOnlineCount = adminNames.length;
    const normalPlayerCount = normalPlayerNames.length; 

	let bannedPlayersCount = "0"; // Default
    const banLogsArray = getLogsFromPropertyWithCache("ac:banLogs", "ban");
    bannedPlayersCount = banLogsArray.length.toString(); 
	
    const scriptTps = world.getDynamicProperty("ac:systemInfo_scriptTps") ?? "N/A";

	// Format body
	let bodyText = `§gCurrent Server Time:§r ${serverTime}\n\n`;
	bodyText += `§gTotal Online Players:§r ${onlinePlayerCount}\n\n`;
    bodyText += `§gOwners (${ownerOnlineCount}):§r ${ownerNames.length > 0 ? ownerNames.join(", ") : "N/A"}\n`;
    bodyText += `§gAdmins (${displayedAdminsOnlineCount}):§r ${adminNames.length > 0 ? adminNames.join(", ") : "N/A"}\n`;
    bodyText += `§gNormal Players (${normalPlayerCount}):§r ${normalPlayerNames.length > 0 ? normalPlayerNames.join(", ") : "N/A"}\n\n`;
	bodyText += `§gTotal Banned Players:§r ${bannedPlayersCount}\n\n`;
    bodyText += `§gScript-Observed TPS:§r ${scriptTps}\n`; 

	form.body(bodyText);
	form.button1("§9Re-fetch Info"); 
	form.button2("§cBack");   

	form.show(player).then((response) => {
            if (response.canceled) {
                if (previousForm) return previousForm(player);
                return;
            }
            if (response.selection === 0) { 
                return showSystemInformation(player, previousForm); 
            }
            if (previousForm) {
                return previousForm(player);
            }
        }).catch(e => {
		logDebug(`[UI Error][showSystemInformation]: ${e} ${e.stack}`);
		if (player && typeof player.sendMessage === 'function') {
			player.sendMessage("§cAn error occurred while displaying system information.");
		}
		if (previousForm) { 
			previousForm(player);
		}
	});
}

/**
 * Displays the main admin panel to a player.
 * Requires the player to have admin privileges.
 * Provides navigation to player management, server settings, logs, and system information.
 *
 * @export
 * @param {Minecraft.Player} player The player to show the admin panel to.
 * @returns {void} Returns early if the player does not have admin permissions.
 * @throws {Error} If an error occurs during UI display or interaction.
 */
export function showAdminPanelMain(player) {
	if (!player.hasAdmin()) {
		return player.tell("§cYou do not have permission to access the admin panel.");
	}

	const form = new ActionFormData()
		.title("§l§7Admin Panel") // Enhanced title
		.body("Manage players, server settings, and view system information.") // Added body
		.button("Player Management", "textures/ui/icon_steve.png")
		.button("Server Settings", "textures/ui/icon_setting.png")
		.button("View Logs", "textures/ui/icon_book_writable.png")
		.button("Command Logs", "textures/ui/beacon.png") 
		.button("Player Activity Logs", "textures/ui/multiplayer_glyph_color.png") 
		.button("System Information", "textures/ui/icon_resource_pack.png") 
		.button("§cClose", "textures/ui/cancel.png");

	form.show(player).then((response) => {
		if (response.canceled) {
			return;
		}

		switch (response.selection) {
			case 0: // Player Management
				playerSelectionForm(player, 'action', showAdminPanelMain);
				break;
			case 1: // Server Settings
				settingSelector(player, showAdminPanelMain);
				break;
			case 2: // View Logs (Ban Logs)
				banLogForm(player, showAdminPanelMain);
				break;
			case 3: // Command Logs
				showCommandLogsForm(player, showAdminPanelMain);
				break;
			case 4: // Player Activity Logs
				showPlayerActivityLogsForm(player, showAdminPanelMain);
				break;
			case 5: // System Information
				showSystemInformation(player, showAdminPanelMain); 
				break;
			case 6: // Close
				// Do nothing, form closes.
				break;
			default:
				// Should not happen with current setup
				showAdminPanelMain(player);
				break;
		}
	}).catch(e => {
		logDebug(`[Anti Cheats UI Error][showAdminPanelMain]: ${e} ${e.stack}`);
		if (player && typeof player.sendMessage === 'function') {
			player.sendMessage("§cAn error occurred with the Admin Panel UI. Please try again.");
		}
	});
}

/**
 * Helper function to create a basic log viewer list form.
 * Handles fetching logs from a dynamic property, parsing, displaying a list, and navigating to a detail view.
 * @param {Minecraft.Player} player The player to show the form to.
 * @param {Function} previousForm Function to call to go back to the previous screen.
 * @param {object} options Configuration for the log viewer.
 * @param {string} options.dynamicPropertyKey Key for the dynamic property storing the logs.
 * @param {string} options.formTitle Title of the ActionFormData.
 * @param {string} options.logTypeName User-friendly name for the log type (e.g., "command", "player activity").
 * @param {function(object): string} options.formatButtonTextCallback Callback to format the text for each log button.
 * @param {string|function(object):string} options.buttonIconPath Path to the icon for each log entry button, or a function that returns a path based on the log.
 * @param {function(Minecraft.Player, object, Function): void} options.showDetailFormCallback Callback to show the detail form for a selected log.
 * @param {number} [options.maxLogButtons=45] Maximum number of log buttons to display.
 */
function _createBasicLogViewerListForm(player, previousForm, options) {
    if (!player.hasAdmin()) {
        player.tell(`§cYou do not have permission to view ${options.logTypeName} logs.`);
        if (previousForm) return previousForm(player);
        return;
    }

    let logsArray = getLogsFromPropertyWithCache(options.dynamicPropertyKey, options.logTypeName);
    if (logsArray.length === 0 && typeof world.getDynamicProperty(options.dynamicPropertyKey) === 'string' && world.getDynamicProperty(options.dynamicPropertyKey) !== '[]') {
        player.sendMessage(`§cError reading ${options.logTypeName} logs. Data might be corrupted or empty.`);
    }


    const displayLogs = [...logsArray].reverse(); // Show newest first
    const maxButtons = options.maxLogButtons || 45;

    const form = new ActionFormData()
        .title(options.formTitle)
        .body(displayLogs.length > 0 ? `Select a log entry to view details. (${displayLogs.length} logs found)` : `No ${options.logTypeName} logs found.`);

    if (displayLogs.length > 0) {
        const logsToShow = displayLogs.slice(0, maxButtons);
        if (displayLogs.length > maxButtons) {
            form.body(`Displaying the ${maxButtons} most recent ${options.logTypeName} logs. (${displayLogs.length} total logs found)`);
        }
        for (const log of logsToShow) {
            // Corrected line for buttonIconPath handling:
            form.button(options.formatButtonTextCallback(log), typeof options.buttonIconPath === 'function' ? options.buttonIconPath(log) : options.buttonIconPath);
        }
    }
    
    form.button("§cBack", "textures/ui/cancel.png");

    form.show(player).then((response) => {
        if (response.canceled) {
            if (previousForm) return previousForm(player);
            return;
        }
        
        const selection = response.selection;
        const logsToShowCount = displayLogs.length > maxButtons ? maxButtons : displayLogs.length;

        if (selection < logsToShowCount) {
            const selectedLog = displayLogs[selection];
            // Recursively call the list form as the previous form for the detail view
            options.showDetailFormCallback(player, selectedLog, () => _createBasicLogViewerListForm(player, previousForm, options));
        } else { // Back button
            if (previousForm) return previousForm(player);
        }
    }).catch(e => {
        logDebug(`[Anti Cheats UI Error][${options.formTitle}]: ${e} ${e.stack}`);
        player.sendMessage(`§cAn error occurred while displaying ${options.logTypeName} logs.`);
        if (previousForm) previousForm(player);
    });
}

/**
 * Displays a list of player activity logs (join/leave) to the player.
 * Each log entry is a button leading to a detailed view.
 *
 * @export
 * @param {Minecraft.Player} player The player viewing the activity logs.
 * @param {Function} previousForm A function to call to return to the previous UI screen.
 * @returns {void}
 */
export function showPlayerActivityLogsForm(player, previousForm) {
    _createBasicLogViewerListForm(player, previousForm, {
        dynamicPropertyKey: "ac:playerActivityLogs",
        formTitle: "§l§7Player Activity Logs",
        logTypeName: "player activity",
        formatButtonTextCallback: (log) => {
            const eventText = log.eventType === 'join' ? '§aJoined' : '§cLeft';
            const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return `§e${log.playerName}§r (${eventText}§r)\n§7${time}`;
        },
        buttonIconPath: (log) => log.eventType === 'join' ? "textures/ui/plus_glyph.png" : "textures/ui/minus_glyph.png",
        showDetailFormCallback: showPlayerActivityLogDetailForm 
        // maxLogButtons can be omitted to use default 45
    });
}

/**
 * Displays detailed information for a single player activity log entry.
 *
 * @param {Minecraft.Player} player The player viewing the log detail.
 * @param {object} logEntry The player activity log entry object.
 * @param {Function} previousForm Function to call to go back to the activity log list.
 */
function showPlayerActivityLogDetailForm(player, logEntry, previousForm) {
	const form = new MessageFormData()
		.title("§l§7Activity Log Detail");

	let body = "";
	body += `§lPlayer:§r ${logEntry.playerName}\n`;
	body += `§lPlayer ID:§r ${logEntry.playerId || "N/A"}\n`;
	body += `§lEvent:§r ${logEntry.eventType === 'join' ? 'Player Join' : 'Player Leave'}\n`;
	body += `§lTimestamp:§r ${new Date(logEntry.timestamp).toLocaleString()}\n`;

	form.body(body);
	form.button1("§cBack");
	form.button2("§7 "); // Dummy

	form.show(player).then((response) => {
		if (previousForm) return previousForm(player);
	}).catch(e => {
		logDebug(`[Anti Cheats UI Error][showPlayerActivityLogDetailForm]: ${e} ${e.stack}`);
		player.sendMessage("§cAn error occurred while displaying the log detail.");
		if (previousForm) previousForm(player);
	});
}

/**
 * Displays command logs to an admin player.
 * @export
 * @param {Minecraft.Player} player The player viewing the command logs.
 * @param {Function} previousForm A function to call to return to the previous UI screen (e.g., showAdminPanelMain).
 * @returns {void}
 */
export function showCommandLogsForm(player, previousForm) {
    _createBasicLogViewerListForm(player, previousForm, {
        dynamicPropertyKey: "ac:commandLogs",
        formTitle: "§l§7Command Logs",
        logTypeName: "command",
        formatButtonTextCallback: (log) => {
            const cmdPreview = log.command.length > 25 ? log.command.substring(0, 22) + "..." : log.command;
            const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return `§e${log.playerName}§r: ${cmdPreview}\n§7${time}`;
        },
        buttonIconPath: "textures/ui/speech_bubble_glyph.png", // Fixed icon
        showDetailFormCallback: showCommandLogDetailForm
    });
}

/**
 * Displays detailed information for a single command log entry.
 *
 * @param {Minecraft.Player} player The player viewing the log detail.
 * @param {object} logEntry The command log entry object.
 * @param {Function} previousForm Function to call to go back to the command log list.
 */
function showCommandLogDetailForm(player, logEntry, previousForm) {
	const form = new MessageFormData()
		.title("§l§7Command Log Detail");

	let body = "";
	body += `§lPlayer:§r ${logEntry.playerName}\n`;
	body += `§lPlayer ID:§r ${logEntry.playerId || "N/A"}\n`;
	body += `§lTimestamp:§r ${new Date(logEntry.timestamp).toLocaleString()}\n`;
	body += `§lCommand:§r\n${logEntry.command}`;

	form.body(body);
	form.button1("§cBack"); 
	form.button2("§7 ");    

	form.show(player).then((response) => {
		if (previousForm) return previousForm(player);
	}).catch(e => {
		logDebug(`[Anti Cheats UI Error][showCommandLogDetailForm]: ${e} ${e.stack}`);
		player.sendMessage("§cAn error occurred while displaying the log detail.");
		if (previousForm) previousForm(player);
	});
}

/**
 * Displays a settings selector form to the player.
 * Allows navigation to module settings, config editor, and config debug.
 * If `CONFIG.other.ownerOnlySettings` is true and player is not an owner, it prompts for owner login.
 *
 * @export
 * @param {Minecraft.Player} player The player to show the settings selector to.
 * @param {Function} previousForm A function to call to return to the previous UI screen.
 * @returns {void}
 * @throws {Error} If an error occurs during UI display or interaction, especially related to owner login.
 */
export function settingSelector(player, previousForm){ 
	if (CONFIG.other.ownerOnlySettings && !player.isOwner()) return ownerLoginForm(player, settingSelector, previousForm);

	const form = new ActionFormData()
		.title("§l§7Server Settings") 
		.body("Configure Anti-Cheat modules and system settings.") 
		.button("Module Settings", "textures/ui/redstone_torch_on.png") 
		.button("Config Editor", "textures/ui/document_glyph_edit.png") 
		.button("Config Debug", "textures/ui/icon_debug.png"); 

	if (previousForm) {
		form.button("§cBack", "textures/ui/cancel.png"); 
	}
	player.playSound("random.pop");

	form.show(player).then((formData) => {
		if (formData.canceled) {
			if (previousForm) return previousForm(player); 
			return;
		}
		switch (formData.selection) {
			case 0:
				return moduleSettingsForm(player, (p) => settingSelector(p, previousForm)); 
			case 1:
				return configEditorForm(player, (p) => settingSelector(p, previousForm));
			case 2:
				return configDebugForm(player, (p) => settingSelector(p, previousForm));
			case 3: 
				if (previousForm) return previousForm(player);
				break;
		}
	}).catch(e => {
		logDebug(`[Anti Cheats UI Error][settingSelector]: ${e} ${e.stack}`);
		if (player && typeof player.sendMessage === 'function') {
			player.sendMessage("§cAn error occurred with the UI. Please try again.");
		}
	});
}

/**
 * Displays a form to show ban logs, with options for filtering and sorting.
 * Allows navigation to a detailed view of a specific log entry and deletion of entries (for owners).
 * Integrates with `showBanLogFilterSortForm` to get filter/sort criteria.
 *
 * @export
 * @param {Minecraft.Player} player The player to show the form to.
 * @param {Function} previousForm A function to call to return to the previous UI screen.
 * @param {object} [filterOptions={}] Optional parameters for filtering and sorting the logs.
 * @param {string} [filterOptions.playerName=""] Filter logs by player name (case-insensitive, partial match).
 * @param {string} [filterOptions.adminName=""] Filter logs by admin name (case-insensitive, partial match).
 * @param {"date"|"playerName"|"adminName"} [filterOptions.sortBy="date"] Criteria to sort logs by. Defaults to "date".
 * @param {"asc"|"desc"} [filterOptions.sortOrder="desc"] Order to sort logs in ("asc" for ascending, "desc" for descending). Defaults to "desc".
 * @returns {void}
 * @throws {Error} If an error occurs during UI display, log parsing, or interaction.
 */
export function banLogForm(player, previousForm, filterOptions = {}) {
    let allLogs = getLogsFromPropertyWithCache("ac:banLogs", "ban");
    if (allLogs.length === 0 && typeof world.getDynamicProperty("ac:banLogs") === 'string' && world.getDynamicProperty("ac:banLogs") !== '[]') {
        player.sendMessage("§6[§eAnti Cheats§6]§c Error reading ban logs. Data might be corrupted or empty.");
    }

    const defaultSortBy = "date";
    const defaultSortOrder = "desc";
    const currentFilterOptions = {
        playerName: filterOptions.playerName || "",
        adminName: filterOptions.adminName || "",
        sortBy: filterOptions.sortBy || defaultSortBy, 
        sortOrder: filterOptions.sortOrder || defaultSortOrder 
    };

	if (allLogs.length < 1 && !(currentFilterOptions.playerName || currentFilterOptions.adminName) ) { // Check if truly no logs or just filtered out
		player.sendMessage(`§6[§eAnti Cheats§6]§f No logs to display.`);
		if (previousForm) return previousForm(player); 
		return;
	}
	
	let filteredLogs = [...allLogs]; 

    if (currentFilterOptions.playerName && currentFilterOptions.playerName.trim() !== "") {
        const filterPlayer = currentFilterOptions.playerName.trim().toLowerCase();
        filteredLogs = filteredLogs.filter(log => log.a && log.a.toLowerCase().includes(filterPlayer));
    }

    if (currentFilterOptions.adminName && currentFilterOptions.adminName.trim() !== "") {
        const filterAdmin = currentFilterOptions.adminName.trim().toLowerCase();
        filteredLogs = filteredLogs.filter(log => log.b && log.b.toLowerCase().includes(filterAdmin));
    }

    const sortBy = filterOptions.sortBy || "date"; 
    const sortOrder = filterOptions.sortOrder || "desc"; 

    filteredLogs.sort((log1, log2) => {
        let val1, val2;
        switch (sortBy) {
            case "playerName":
                val1 = (log1.a || "").toLowerCase();
                val2 = (log2.a || "").toLowerCase();
                break;
            case "adminName":
                val1 = (log1.b || "").toLowerCase();
                val2 = (log2.b || "").toLowerCase();
                break;
            case "date":
            default: 
                val1 = typeof log1.c === 'string' ? new Date(log1.c).getTime() : Number(log1.c || 0);
                val2 = typeof log2.c === 'string' ? new Date(log2.c).getTime() : Number(log2.c || 0);
                break;
        }

        if (typeof val1 === 'string' && typeof val2 === 'string') {
            return sortOrder === "asc" ? val1.localeCompare(val2) : val2.localeCompare(val1);
        } else { 
            return sortOrder === "asc" ? val1 - val2 : val2 - val1;
        }
    });

	const MAX_LOGS_DISPLAY = 45; 
	let displayLogs = filteredLogs;
	let bodyMessage = `Select a log entry to view details. Total logs shown: ${filteredLogs.length} (out of ${allLogs.length} total).`;
    if (filteredLogs.length === 0) {
        bodyMessage = `No logs match your current filters. Total logs stored: ${allLogs.length}.`;
    }


	if (filteredLogs.length > MAX_LOGS_DISPLAY) {
		displayLogs = filteredLogs.slice(-MAX_LOGS_DISPLAY); 
		bodyMessage = `Displaying the most recent ${MAX_LOGS_DISPLAY} of ${filteredLogs.length} matching logs. Older logs are still stored.`;
	}

	const form = new ActionFormData()
		.title("§l§7Ban Logs") 
		.body(bodyMessage);

    form.button("§bFilter & Sort Logs", "textures/ui/icon_filter.png"); 

    const isFilteredOrSorted = currentFilterOptions.playerName || 
                               currentFilterOptions.adminName || 
                               currentFilterOptions.sortBy !== defaultSortBy || 
                               currentFilterOptions.sortOrder !== defaultSortOrder;

    if (isFilteredOrSorted) {
        form.button("§eClear Filters/Sort", "textures/ui/refresh_light.png");
    }
	
	for(const log of displayLogs){ 
		if(!log) continue;
		const dateString = new Date(log.c).toLocaleDateString(); 
		const buttonText = `§e${log.a}§r - By: ${log.b}\nOn: ${dateString} (ID: ${log.logId ? log.logId.substring(0,5) : 'N/A'}...)`;
		form.button(buttonText, "textures/ui/paper.png"); 
	}

	if (previousForm) {
		form.button("§cBack", "textures/ui/cancel.png"); 
	}
	
	form.show(player).then(async (formData) => { 
		if (formData.canceled) {
			if (previousForm) return previousForm(player);
			return;
		}

        let actionIndex = formData.selection;
        let hasClearButton = isFilteredOrSorted;

        if (actionIndex === 0) { 
            const newOptions = await showBanLogFilterSortForm(player, currentFilterOptions);
            if (newOptions) {
                return banLogForm(player, previousForm, newOptions); 
            } else {
                return banLogForm(player, previousForm, currentFilterOptions); 
            }
        }
        
        if (hasClearButton && actionIndex === 1) { 
            return banLogForm(player, previousForm, {}); 
        }
        
        let logSelectionIndex = actionIndex - (hasClearButton ? 2 : 1);
        
		if (previousForm && logSelectionIndex === displayLogs.length) { 
			return previousForm(player);
		}

		if (logSelectionIndex < 0 || logSelectionIndex >= displayLogs.length) {
            logDebug(`[UI Error] banLogForm: Invalid log selection index ${logSelectionIndex}. ActionIndex: ${actionIndex}, HasClear: ${hasClearButton}, Displayed: ${displayLogs.length}`);
            return banLogForm(player, previousForm, currentFilterOptions); 
        }

		const banLog = displayLogs[logSelectionIndex]; 
		const form2 = new MessageFormData()
			.title(`§l§7Log Details: ${banLog.a}`) 
			.body(
				`§lPlayer:§r ${banLog.a}\n` +
				`§lLog ID:§r ${banLog.logId || "N/A"}\n` +
				`§l--------------------\n` +
				`§lBanned By:§r ${banLog.b}\n` +
				`§lDate:§r ${new Date(banLog.c).toLocaleString()}\n` +
				`§lReason:§r ${banLog.d}\n` +
				`§l--------------------`
			)
			.button2("§7OK") 
			.button1(player.isOwner() ? "§4Delete Log" : "§cBack to Log List"); 
		
		form2.show(player).then((confirmData) => {
			if (confirmData.canceled || (confirmData.selection === 0 && !player.isOwner())) {
				return banLogForm(player, previousForm); 
			}
			
			if (confirmData.selection === 0 && player.isOwner()) { 
				const selectedLogId = banLog.logId; 
				if (!selectedLogId) {
					player.sendMessage("§6[§eAnti Cheats§6]§c Error: Selected log entry does not have a unique ID. Cannot delete.");
					logDebug("[Anti Cheats UI Error][banLogFormConfirm] Selected log for deletion is missing a logId:", banLog);
					return banLogForm(player, previousForm);
				}

				const currentLogsString = world.getDynamicProperty("ac:banLogs") ?? "[]";
				let currentLogsArray;
				try {
					currentLogsArray = JSON.parse(currentLogsString);
					if (!Array.isArray(currentLogsArray)) throw new Error("Ban logs are not an array.");
				} catch (error) {
					logDebug("[Anti Cheats UI] Error parsing banLogs JSON in banLogForm (delete log):", error, `Raw: ${currentLogsString}`);
					player.sendMessage("§6[§eAnti Cheats§6]§c Error processing ban logs for deletion. Data might be corrupted.");
					return banLogForm(player, previousForm);
				}

				const initialLogCount = currentLogsArray.length;
				const filteredLogsAfterDeletion = currentLogsArray.filter(log => log.logId !== selectedLogId);

				if (filteredLogsAfterDeletion.length === initialLogCount) {
					logDebug(`Log entry with ID ${selectedLogId} not found for deletion. Player: ${banLog.a}`);
					player.sendMessage(`§6[§eAnti Cheats§6]§c Could not find the specific log entry for ${banLog.a} to delete.`);
					return banLogForm(player, previousForm); 
				}
				
				world.setDynamicProperty("ac:banLogs", JSON.stringify(filteredLogsAfterDeletion));
                if (uiLogCache["ac:banLogs"]) delete uiLogCache["ac:banLogs"]; // Cache invalidation
				player.sendMessage(`§6[§eAnti Cheats§6]§f Successfully deleted log entry for: ${banLog.a} (ID: ${selectedLogId.substring(0,5)}...).`);
				return banLogForm(player, previousForm);
			}
			else if (confirmData.selection === 1) {
				return banLogForm(player, previousForm);
			}
		}).catch(e => {
			logDebug(`[Anti Cheats UI Error][banLogFormConfirm]: ${e} ${e.stack}`);
			if (player && typeof player.sendMessage === 'function') {
				player.sendMessage("§cAn error occurred with the UI. Please try again.");
			}
		});
	}).catch(e => {
		logDebug(`[Anti Cheats UI Error][banLogFormInitial]: ${e} ${e.stack}`);
		if (player && typeof player.sendMessage === 'function') {
			player.sendMessage("§cAn error occurred with the UI. Please try again.");
		}
	});
}


/**
 * Shows a modal form to the player for filtering and sorting ban logs.
 * @param {Minecraft.Player} player The player to show the form to.
 * @param {object} currentOptions An object containing the current filter and sort options.
 * @param {string} [currentOptions.playerName=""] Current filter for player name.
 * @param {string} [currentOptions.adminName=""] Current filter for admin name.
 * @param {"date"|"playerName"|"adminName"} [currentOptions.sortBy="date"] Current sort criteria.
 * @param {"asc"|"desc"} [currentOptions.sortOrder="desc"] Current sort order.
 * @returns {Promise<object|null>} A promise that resolves to an object with the selected filter/sort options
 *                                 (keys: `playerName`, `adminName`, `sortBy`, `sortOrder`)
 *                                 if the form is submitted, or `null` if it's cancelled or an error occurs.
 * @throws {Error} If an error occurs during UI display or interaction.
 */
export async function showBanLogFilterSortForm(player, currentOptions = {}) {
	const form = new ModalFormData();
	form.title("Filter & Sort Ban Logs");

	const defaultPlayerName = currentOptions.playerName || "";
	const defaultAdminName = currentOptions.adminName || "";
	const defaultSortBy = currentOptions.sortBy || "date";
	const defaultSortOrder = currentOptions.sortOrder || "desc";

	form.textField("Filter by Player Name (leave empty for no filter):", "Enter player name...", defaultPlayerName);
	form.textField("Filter by Admin Name (leave empty for no filter):", "Enter admin name...", defaultAdminName);

	const sortByOptions = ["Date", "Player Name", "Admin Name"];
	let defaultSortByIndex = 0;
	if (defaultSortBy === "playerName") defaultSortByIndex = 1;
	else if (defaultSortBy === "adminName") defaultSortByIndex = 2;
	form.dropdown("Sort By:", sortByOptions, { defaultValue: defaultSortByIndex });

	const sortOrderOptions = ["Ascending", "Descending"];
	let defaultSortOrderIndex = 1; 
	if (defaultSortOrder === "asc") defaultSortOrderIndex = 0;
	form.dropdown("Sort Order:", sortOrderOptions, { defaultValue: defaultSortOrderIndex });

	try {
		const response = await form.show(player);

		if (response.cancelationReason) {
			logDebug("[UI] Ban Log Filter/Sort form cancelled by player.", response.cancelationReason);
			return null; 
		}

		if (response.formValues) {
			const selectedPlayerName = response.formValues[0];
			const selectedAdminName = response.formValues[1];
			const selectedSortByIndex = response.formValues[2];
			const selectedSortOrderIndex = response.formValues[3];

			let sortByValue = "date"; 
			if (selectedSortByIndex === 1) sortByValue = "playerName";
			else if (selectedSortByIndex === 2) sortByValue = "adminName";

			const sortOrderValue = selectedSortOrderIndex === 0 ? "asc" : "desc";

			return {
				playerName: selectedPlayerName,
				adminName: selectedAdminName,
				sortBy: sortByValue,
				sortOrder: sortOrderValue,
			};
		}
		return null; 
	} catch (e) {
		logDebug(`[UI Error][showBanLogFilterSortForm]: ${e} ${e.stack}`);
		if (player && typeof player.sendMessage === 'function') {
			player.sendMessage("§cAn error occurred with the Filter & Sort Logs form. Please try again.");
		}
		return null; 
	}
}

/**
 * Displays an owner login form.
 * If the correct owner password (from `CONFIG.OWNER_PASSWORD`) is entered,
 * sets temporary owner status for the player and proceeds to `nextForm`.
 *
 * @param {Minecraft.Player} player The player attempting to log in.
 * @param {Function} nextForm The function to call upon successful login.
 * @param {Function} [previousFormForNext] The `previousForm` argument to pass to `nextForm`.
 * @returns {void}
 * @throws {Error} If an error occurs during UI display or interaction.
 */
function ownerLoginForm(player, nextForm, previousFormForNext){
	if(!CONFIG.OWNER_PASSWORD){
		player.sendMessage(`§6[§eAnti Cheats§6]§4 Error!§c You have not set an owner password inside of the configuration file, access denied.`);
		if (previousFormForNext) return previousFormForNext(player); 
		return;
	}
	const form = new ModalFormData().title("Anti Cheats Owner Login");
	form.textField("Owner Password","Enter password here...");

	form.show(player).then((formData) => {
		if(formData.canceled) {
			if (previousFormForNext) return previousFormForNext(player); 
			return;
		}
		if (formData.formValues[0] === CONFIG.OWNER_PASSWORD) {
			player.sendMessage("§6[§eAnti Cheats§6]§a Access granted, you now have owner status.");
			player.setDynamicProperty("ac:ownerStatus",true);
			player.setDynamicProperty("ac:rankId" ,"owner"); 
			if (nextForm && previousFormForNext) {
				return nextForm(player, previousFormForNext); 
			} else if (nextForm) {
				return nextForm(player); 
			}
		} else {
			player.sendMessage("§6[§eAnti Cheats§6]§4 Invalid password!");
			if (previousFormForNext) return previousFormForNext(player); 
		}
	}).catch(e => {
		logDebug(`[Anti Cheats UI Error][ownerLoginForm]: ${e} ${e.stack}`);
		if (player && typeof player.sendMessage === 'function') {
			player.sendMessage("§cAn error occurred with the UI. Please try again.");
		}
	});
}

/**
 * Displays a configuration debugger form.
 * Allows exporting the current configuration to the console or resetting it.
 *
 * @param {Minecraft.Player} player The player using the debug form.
 * @param {Function} previousForm A function to call to return to the previous UI screen.
 * @returns {void}
 * @throws {Error} If an error occurs during UI display or interaction.
 */
function configDebugForm(player, previousForm){
	const form = new ActionFormData()
		.title("§l§7Config Debugger") 
		.body("Manage and debug the Anti-Cheat configuration.") 
		.button("Export Config to Console", "textures/ui/icon_share.png") 
		.button("Reset Config", "textures/ui/trash.png") 
		.button("§cBack", "textures/ui/cancel.png"); 

	form.show(player).then((formData) => {
		if (formData.canceled) return previousForm(player);
		switch (formData.selection) {
			case 0:
				console.warn(JSON.stringify(CONFIG));
				player.sendMessage(`§6[§eAnti Cheats§6]§f The config was exported to the console`);
                return configDebugForm(player, previousForm); 
			case 1:
				world.setDynamicProperty("ac:config",undefined); 
				player.sendMessage(`§6[§eAnti Cheats§6]§f The config was reset. Run §e/reload§f`);
                return configDebugForm(player, previousForm); 
			case 2: 
				return previousForm(player);
		}
	}).catch(e => {
		logDebug(`[Anti Cheats UI Error][configDebugForm]: ${e} ${e.stack}`);
		if (player && typeof player.sendMessage === 'function') {
			player.sendMessage("§cAn error occurred with the UI. Please try again.");
		}
	});
}

/**
 * Displays a configuration editor form.
 * Allows editing different modules of the `CONFIG` object.
 * Requires owner privileges; prompts for login if the player is not an owner.
 *
 * @param {Minecraft.Player} player The player using the config editor.
 * @param {Function} previousForm A function to call to return to the previous UI screen.
 * @returns {void}
 * @throws {Error} If an error occurs during UI display, interaction, or config processing.
 */
function configEditorForm(player, previousForm) {
	if (!player.isOwner()) return ownerLoginForm(player, configEditorForm, previousForm);

	const mainConfigForm = new ActionFormData()
		.title("§l§7Config Editor - Modules") 
		.body("Select a configuration module to edit its settings."); 
	const configOptions = Object.keys(CONFIG).filter(key => typeof CONFIG[key] === "object");

	for (let i = 0; i < configOptions.length; i++) {
		mainConfigForm.button(configOptions[i], "textures/ui/document_glyph.png"); 
	}
    mainConfigForm.button("§cBack", "textures/ui/cancel.png"); 

	mainConfigForm.show(player).then((configSelection) => {
		if (configSelection.canceled) return previousForm(player);
        if (configSelection.selection === configOptions.length) { 
            return previousForm(player);
        }

		const selectedModule = configOptions[configSelection.selection];
		const configModuleForm = new ModalFormData();
		configModuleForm.title(`§l§7Edit: ${selectedModule}`); 

		const configModuleOptions = Object.entries(CONFIG[selectedModule]);
		const formFields = []; 

		for (const [key, value] of configModuleOptions) {
			if (typeof value === "object") {
				for (const [subKey, subValue] of Object.entries(value)) {
					const fieldPath = `${key}.${subKey}`;
					formFields.push(fieldPath);

					switch (typeof subValue) {
						case "boolean":
							configModuleForm.toggle(`${key} -> ${subKey}\n`, { defaultValue: subValue });
							break;
						case "number":
						case "string":
							configModuleForm.textField(`${key} -> ${subKey}\n`, subValue.toString(), { defaultValue: subValue.toString() });
							break;
					}
				}
			} else {
				formFields.push(key);

				switch (typeof value) {
					case "boolean":
						configModuleForm.toggle(`${key}\n`, { defaultValue: value });
						break;
					case "number":
					case "string":
							configModuleForm.textField(`${key}\n`, value.toString(), { defaultValue: value.toString() });
						break;
				}
			}
		}

		configModuleForm.show(player).then((formData) => {
			if (formData.canceled) {
				return configEditorForm(player, previousForm); 
			}

			formFields.forEach((fieldPath, index) => {
				const keys = fieldPath.split('.');
				let target = CONFIG[selectedModule];

				for (let i = 0; i < keys.length - 1; i++) {
					target = target[keys[i]];
				}

				const finalKey = keys[keys.length - 1];
				const oldValue = target[finalKey];
				const newValue = formData.formValues[index];

				switch (typeof oldValue) {
					case "boolean":
						target[finalKey] = Boolean(newValue);
						break;
					case "number":
						target[finalKey] = isNaN(parseFloat(newValue)) ? oldValue : parseFloat(newValue);
						break;
					case "string":
						target[finalKey] = newValue;
						break;
				}
			});
			world.setDynamicProperty("ac:config",JSON.stringify(CONFIG)); 

			player.sendMessage(`§6[§eAnti Cheats§6]§r Configuration updated successfully!`);
		}).catch(e => {
			logDebug(`[Anti Cheats UI Error][configEditorFormModuleOptions]: ${e} ${e.stack}`);
			if (player && typeof player.sendMessage === 'function') {
				player.sendMessage("§cAn error occurred with the UI. Please try again.");
			}
		});
	}).catch(e => {
		logDebug(`[Anti Cheats UI Error][configEditorFormMain]: ${e} ${e.stack}`);
		if (player && typeof player.sendMessage === 'function') {
			player.sendMessage("§cAn error occurred with the UI. Please try again.");
		}
	});
}

/**
 * Shows a public version of system information.
 * This function displays a read-only view of server information to any player.
 * Information includes server time, player counts (total, owners, admins, normal players with names listed),
 * and the script-observed TPS.
 * It uses a MessageFormData with "Refresh" and "Back" buttons.
 *
 * @async
 * @function showPublicSystemInfo
 * @param {Minecraft.Player} player The player to show the form to.
 * @param {Function} previousForm A function to call to return to the previous UI screen (typically `showPublicInfoPanel`).
 * @returns {Promise<void>} A promise that resolves when the form handling is complete.
 * @throws {Error} If an error occurs while trying to display the form or handle its submission.
 */
async function showPublicSystemInfo(player, previousForm) {
    const form = new MessageFormData();
    form.title("§l§eSystem Information");

    const serverTime = new Date().toLocaleString();
    const allPlayers = world.getAllPlayers();
    const onlinePlayerCount = allPlayers.length;

    let ownerNames = [];
    let adminNames = [];
    let normalPlayerNames = [];

    for (const p of allPlayers) {
        if (p.isOwner()) { 
            ownerNames.push(`§c${p.name}§r`);
        } else if (p.hasTag('admin')) { 
            adminNames.push(`§6${p.name}§r`);
        } else {
            normalPlayerNames.push(`§a${p.name}§r`);
        }
    }

    const ownerOnlineCount = ownerNames.length;
    const adminOnlineCount = adminNames.length;
    const normalPlayerOnlineCount = normalPlayerNames.length;

    const scriptTps = world.getDynamicProperty("ac:systemInfo_scriptTps") ?? "Calculating...";

    let bodyText = `§g§lServer Time:§r §e${serverTime}\n\n`;
    bodyText += `§b§lTotal Online Players:§r §e${onlinePlayerCount}\n\n`;

    bodyText += `§c§lOwners Online (${ownerOnlineCount}):§r\n ${ownerNames.length > 0 ? ownerNames.join(", ") : "N/A"}\n\n`;
    bodyText += `§6§lAdmins Online (${adminOnlineCount}):§r\n ${adminNames.length > 0 ? adminNames.join(", ") : "N/A"}\n\n`;
    bodyText += `§a§lPlayers Online (${normalPlayerOnlineCount}):§r\n ${normalPlayerNames.length > 0 ? normalPlayerNames.join(", ") : "N/A"}\n\n`;
    
    bodyText += `§d§lScript-Observed TPS:§r §e${scriptTps}`;

    form.body(bodyText);
    form.button1("§9Refresh"); 
    form.button2("§cBack");   

    try {
        const response = await form.show(player);

        if (response.cancelationReason) {
            logDebug(`[UI] PublicSystemInfo cancelled by ${player.name}. Reason: ${response.cancelationReason}`);
            if (previousForm) { 
                return previousForm(player);
            }
            return;
        }
        
        if (response.selection === 0) { 
             return showPublicSystemInfo(player, previousForm); 
        }
        
        if (previousForm) {
            return previousForm(player);
        }

    } catch (e) {
        logDebug(`[UI Error][showPublicSystemInfo] Error for ${player.name}: ${e} ${e.stack}`);
        if (player && typeof player.sendMessage === 'function') {
            player.sendMessage("§cAn error occurred while trying to display system information.");
        }
        if (previousForm) {
            try {
                previousForm(player);
            } catch (prevFormError) {
                logDebug(`[UI Error][showPublicSystemInfo] Error calling previousForm after an error: ${prevFormError} ${prevFormError.stack}`);
            }
        }
    }
}

/**
 * Handles the player reporting process initiated from the public UI.
 * This function allows any player to report another online player.
 * It presents a ModalFormData with a dropdown to select the target player and a text field for the reason.
 * - Validates that a reason is provided.
 * - If no other players are online, it informs the reporter.
 * - On successful submission, it calls `reportPlayerInternal` to process the report.
 * - Provides feedback to the reporter on submission or error.
 *
 * @async
 * @function handlePublicReportPlayer
 * @param {Minecraft.Player} reporter The player initiating the report.
 * @param {Function} previousForm A function to call to return to the previous UI screen (typically `showPublicInfoPanel`).
 * @returns {Promise<void>} A promise that resolves when the form handling is complete.
 * @throws {Error} If an error occurs during form display, validation, or report submission.
 */
async function handlePublicReportPlayer(reporter, previousForm) {
    logDebug(`[UI] handlePublicReportPlayer called by ${reporter.name}. Previous form: ${previousForm?.name}`);

    const onlinePlayers = world.getAllPlayers();
    const reportablePlayers = onlinePlayers.filter(p => p.id !== reporter.id);

    if (reportablePlayers.length === 0) {
        const noPlayersForm = new MessageFormData()
            .title("§cReport Player")
            .body("There are no other players currently online to report.")
            .button1("§cBack") 
            .button2("§7 "); 
        
        await noPlayersForm.show(reporter); 
        if (previousForm) previousForm(reporter); 
        return;
    }

    const reportForm = new ModalFormData();
    reportForm.title("§l§cReport Player");

    const playerNames = reportablePlayers.map(p => p.name);
    reportForm.dropdown("Select Player to Report:", playerNames, {defaultValueIndex: 0});
    reportForm.textField("Reason for Report (be specific):", "Enter details here...");

    try {
        const response = await reportForm.show(reporter);

        if (response.cancelationReason) {
            logDebug(`[UI] ReportPlayer form cancelled by ${reporter.name}. Reason: ${response.cancelationReason}`);
            if (previousForm) previousForm(reporter);
            return;
        }

        const [selectedPlayerIndex, reason] = response.formValues;
        const targetPlayer = reportablePlayers[selectedPlayerIndex];

        if (!reason || reason.trim().length === 0) {
            const errorForm = new MessageFormData()
                .title("§cReport Error")
                .body("A reason is required to submit a report. Please provide details.")
                .button1("§cTry Again")
                .button2("§7Cancel Report");

            const errorResponse = await errorForm.show(reporter);
            if (errorResponse.selection === 0) { 
                return handlePublicReportPlayer(reporter, previousForm); 
            } else { 
                if (previousForm) previousForm(reporter);
                return;
            }
        }
        
        reportPlayerInternal(reporter, targetPlayer, reason); 

        const confirmationForm = new MessageFormData()
            .title("§aReport Submitted")
            .body(`Your report against §e${targetPlayer.name}§r for: "${reason}" has been submitted. Thank you.`)
            .button1("§7OK") 
            .button2("§7 "); 

        await confirmationForm.show(reporter);
        if (previousForm) previousForm(reporter); 

    } catch (e) {
        logDebug(`[UI Error][handlePublicReportPlayer] Error for ${reporter.name}: ${e} ${e.stack}`);
        if (reporter && typeof reporter.sendMessage === 'function') {
            reporter.sendMessage("§cAn error occurred while trying to process your report. Please try again later.");
        }
        if (previousForm) {
            try {
                previousForm(reporter);
            } catch (prevFormError) {
                logDebug(`[UI Error][handlePublicReportPlayer] Error calling previousForm after an error: ${prevFormError} ${prevFormError.stack}`);
            }
        }
    }
}


/**
 * Displays the main public information panel accessible via the `!ui` command.
 * This panel provides options for players to view a public version of system information
 * and to report other players. It serves as a navigation hub for these features.
 *
 * @export
 * @async
 * @function showPublicInfoPanel
 * @param {Minecraft.Player} player The player to show the form to.
 * @returns {Promise<void>} A promise that resolves when the form handling is complete.
 * @throws {Error} If an error occurs while trying to display the form or handle its selection.
 */
export async function showPlayerList_Public(player) {
    const form = new ActionFormData();
    form.title("Online Players");

    const allPlayers = world.getAllPlayers();
    const owners = [];
    const admins = [];
    const normalPlayers = [];

    for (const p of allPlayers) {
        if (p.isOwner()) {
            owners.push(p);
        } else if (p.hasAdmin()) {
            admins.push(p);
        } else {
            normalPlayers.push(p);
        }
    }

    const playerButtons = []; // To keep track of player buttons vs section/back buttons

    // Owners Section
    form.button("§6--- Owners ---");
    playerButtons.push({ type: "header" });
    if (owners.length > 0) {
        owners.forEach(p => {
            form.button(`§6${p.name}`);
            playerButtons.push({ type: "player", name: p.name });
        });
    } else {
        form.button("§7None");
        playerButtons.push({ type: "none" });
    }

    // Admins Section
    form.button("§9--- Admins ---");
    playerButtons.push({ type: "header" });
    if (admins.length > 0) {
        admins.forEach(p => {
            form.button(`§9${p.name}`);
            playerButtons.push({ type: "player", name: p.name });
        });
    } else {
        form.button("§7None");
        playerButtons.push({ type: "none" });
    }

    // Normal Players Section
    form.button("§f--- Normal Players ---");
    playerButtons.push({ type: "header" });
    if (normalPlayers.length > 0) {
        normalPlayers.forEach(p => {
            form.button(`§f${p.name}`);
            playerButtons.push({ type: "player", name: p.name });
        });
    } else {
        form.button("§7None");
        playerButtons.push({ type: "none" });
    }

    form.button("§cBack to Main Menu"); // Back button

    try {
        const response = await form.show(player);
        if (response.canceled) {
            logDebug(`[UI] PlayerList cancelled by ${player.name}. Reason: ${response.cancelationReason || "Form closed"}`);
            return; // Or showPublicInfoPanel(player) if direct return to menu on escape is desired
        }

        // Check if the last button ("Back to Main Menu") was pressed
        if (response.selection === playerButtons.length) { // playerButtons.length will be the index of the "Back" button
            showPublicInfoPanel(player); // Go back to the main menu
        }
        // Player name buttons do nothing for now when clicked
    } catch (e) {
        logDebug(`[UI Error][showPlayerList] Error for ${player.name}: ${e} ${e.stack}`);
        if (player && typeof player.sendMessage === 'function') {
            player.sendMessage("§cAn error occurred while trying to display the player list. Please try again later.");
        }
    }
}

export async function showPublicInfoPanel(player) {
    const uiSettings = CONFIG.uiSettings;
    const featuresEnabled = uiSettings.featuresEnabled;

    const form = new ActionFormData();

    form.title(uiSettings.welcomeMessage || "Info Panel"); // Use welcome message as title, or fallback

    const buttonActions = []; // To map selection to action

    if (featuresEnabled.playerList) {
        form.button("Online Players");
        buttonActions.push({ text: "Online Players", action: () => showPlayerList_Public(player) }); // Modified Action
    }
    if (featuresEnabled.serverInfo) {
        form.button("Server Info");
        buttonActions.push({ text: "Server Info", action: () => showServerInfo(player) }); // Modified Action
    }
    if (featuresEnabled.personalInfo) {
        form.button("My Info");
        buttonActions.push({ text: "My Info", action: () => showMyInfo(player) }); // Modified Action
    }
    if (featuresEnabled.rulesButton) {
        form.button("Rules");
        buttonActions.push({ text: "Rules", action: () => showRules(player) }); // Modified Action
    }
    if (featuresEnabled.customLinkButton) {
        form.button(uiSettings.customLinkTitle || "Custom Link");
        buttonActions.push({ text: uiSettings.customLinkTitle || "Custom Link", action: () => showCustomLink(player) }); // Modified Action
    }
    // Keep the old buttons if their features are enabled, as per the config structure
    if (featuresEnabled.systemInformationButton) {
        form.button("System Information"); 
        buttonActions.push({ text: "System Information", action: () => showSystemInfo(player) }); // Modified Action
    }
    if (featuresEnabled.reportPlayerButton) {
        form.button("Report Player"); 
        buttonActions.push({ text: "Report Player", action: () => showReportPlayerForm(player) }); // Modified Action
    }
    
    try {
        const response = await form.show(player);

        if (response.canceled) {
            logDebug(`[UI] PublicInfoPanel cancelled by ${player.name}. Reason: ${response.cancelationReason || "Form closed"}`);
            return;
        }

        if (response.selection !== undefined && buttonActions[response.selection]) {
            buttonActions[response.selection].action();
        } else if (response.selection !== undefined) {
            logDebug(`[UI Error][showPublicInfoPanel] Unexpected selection: ${response.selection} by ${player.name}. No action mapped.`);
            player.sendMessage("§cAn error occurred: Invalid selection.");
        }

    } catch (e) {
        logDebug(`[UI Error][showPublicInfoPanel] Error for ${player.name}: ${e} ${e.stack}`);
        if (player && typeof player.sendMessage === 'function') {
			player.sendMessage("§cAn error occurred while trying to display the information panel. Please try again later.");
        }
    }
}

async function showSystemInfo(player) {
    const form = new MessageFormData();
    form.title("System Information");

    const uiSettings = CONFIG.uiSettings;
    const serverIP = uiSettings.serverIP || "Not Set";
    const serverPort = uiSettings.serverPort || "Not Set";
    
    let ownerName = "Not Claimed";
    try {
        const ownerDynamicProp = world.getDynamicProperty("ac:ownerPlayerName");
        if (typeof ownerDynamicProp === 'string' && ownerDynamicProp.trim() !== '') {
            ownerName = ownerDynamicProp;
        }
    } catch (e) {
        logDebug("[UI Error][showSystemInfo] Could not read ac:ownerPlayerName dynamic property.", e);
    }

    const defaultGameMode = world.gameMode || "Unknown";

    let bodyText = `§lServer IP:§r ${serverIP}\n`;
    bodyText += `§lServer Port:§r ${serverPort}\n\n`;
    bodyText += `§lWorld Owner:§r ${ownerName}\n`;
    bodyText += `§lDefault Gamemode:§r ${defaultGameMode}`;

    form.body(bodyText);
    form.button1("Refresh");          // Button to refresh
    form.button2("Back to Main Menu"); // Button to go back

    try {
        const response = await form.show(player);
        if (response.canceled) {
            logDebug(`[UI] SystemInfo cancelled by ${player.name}. Reason: ${response.cancelationReason || "Form closed"}`);
            return;
        }

        if (response.selection === 0) { // Refresh
            showSystemInfo(player);
        } else if (response.selection === 1) { // Back to Main Menu
            showPublicInfoPanel(player);
        }
    } catch (e) {
        logDebug(`[UI Error][showSystemInfo] Error for ${player.name}: ${e} ${e.stack}`);
        if (player && typeof player.sendMessage === 'function') {
            player.sendMessage("§cAn error occurred while trying to display system information.");
        }
    }
}

async function showReportPlayerForm(player) {
    const form = new ModalFormData();
    form.title("Report a Player");

    const onlinePlayers = [...world.getPlayers()].filter(p => p.id !== player.id); // Exclude self
    const playerNamesArray = ["--- Type Name Manually ---", ...onlinePlayers.map(p => p.name)];

    form.dropdown("Select Online Player (or type manually):", playerNamesArray, 0); // Default to "Type Name Manually"
    form.textField("Reported Player Name (if not in list/offline):", "Enter exact player name");
    form.textArea("Reason for Report (be specific):", "Provide details of the incident...");

    try {
        const response = await form.show(player);

        if (response.canceled) {
            logDebug(`[UI] ReportPlayerForm cancelled by ${player.name}. Reason: ${response.cancelationReason || "Form closed"}`);
            showPublicInfoPanel(player); // Go back to main menu if cancelled
            return;
        }

        const [selectedPlayerIndex, manualName, reason] = response.formValues;
        let reportedPlayerName = "";

        if (selectedPlayerIndex > 0) { // Index 0 is "--- Type Name Manually ---"
            // Ensure onlinePlayers array is not empty and index is valid
            if(onlinePlayers.length > 0 && (selectedPlayerIndex -1) < onlinePlayers.length) {
                reportedPlayerName = onlinePlayers[selectedPlayerIndex - 1].name;
            } else {
                 // This case should ideally not happen if dropdown is populated correctly
                logDebug(`[UI Error][showReportPlayerForm] Invalid selectedPlayerIndex: ${selectedPlayerIndex} when onlinePlayers length is ${onlinePlayers.length}`);
                player.sendMessage("§cError: Invalid player selection from dropdown.");
                showReportPlayerForm(player); // Re-show form
                return;
            }
        } else {
            reportedPlayerName = manualName.trim();
        }

        if (!reportedPlayerName) {
            player.sendMessage("§cError: You must select an online player or manually type a player's name.");
            showReportPlayerForm(player); // Re-show form
            return;
        }

        if (!reason || reason.trim().length === 0) {
            player.sendMessage("§cError: A reason is required to submit a report.");
            showReportPlayerForm(player); // Re-show form
            return;
        }
        
        // Prevent reporting self
        if (reportedPlayerName === player.name) {
            player.sendMessage("§cYou cannot report yourself.");
            showReportPlayerForm(player); // Re-show form
            return;
        }

        const success = await submitReport(player, reportedPlayerName, reason);

        if (success) {
            player.sendMessage("§aReport submitted successfully. Thank you for your contribution.");
        } else {
            player.sendMessage("§cFailed to submit report. Please try again or contact an admin.");
        }
        showPublicInfoPanel(player); // Navigate back to main menu

    } catch (e) {
        logDebug(`[UI Error][showReportPlayerForm] Error for ${player.name}: ${e} ${e.stack}`);
        if (player && typeof player.sendMessage === 'function') {
            player.sendMessage("§cAn error occurred while processing your report. Please try again.");
        }
        // Ensure navigation back even on error, if possible, or just log.
        // Depending on error severity, showPublicInfoPanel might not be callable.
        // For simplicity, we'll try. If it fails, error is already logged.
        try {
            showPublicInfoPanel(player);
        } catch (navError) {
            logDebug(`[UI Error][showReportPlayerForm] Error navigating back to main panel after another error: ${navError}`);
        }
    }
}

async function showCustomLink(player) {
    const form = new MessageFormData();
    const uiSettings = CONFIG.uiSettings;
    const linkTitle = uiSettings.customLinkTitle || "Our Link";
    const linkURL = uiSettings.customLinkURL || "No URL configured.";

    form.title(linkTitle);
    form.body(`You can find our ${linkTitle} at the following address (you may need to copy and paste):\n\n${linkURL}`);

    form.button1("Back to Main Menu"); // Button to go back
    form.button2("Close");             // Button to just close the dialog

    try {
        const response = await form.show(player);
        if (response.canceled) {
            logDebug(`[UI] CustomLink cancelled by ${player.name}. Reason: ${response.cancelationReason || "Form closed"}`);
            return;
        }

        if (response.selection === 0) { // Back to Main Menu
            showPublicInfoPanel(player);
        }
        // If selection is 1 (Close), do nothing, form closes.
    } catch (e) {
        logDebug(`[UI Error][showCustomLink] Error for ${player.name}: ${e} ${e.stack}`);
        if (player && typeof player.sendMessage === 'function') {
            player.sendMessage(`§cAn error occurred while trying to display the ${linkTitle}.`);
        }
    }
}

async function showRules(player) {
    const form = new MessageFormData();
    form.title("Server Rules");

    const uiSettings = CONFIG.uiSettings;
    const rules = uiSettings.rules || "No rules defined."; // Fallback if rules are not set

    form.body(rules.replace(/\\n/g, '\n')); // Replace escaped newlines with actual newlines for display

    form.button1("Back to Main Menu"); // Button to go back
    form.button2("Close");             // Button to just close the dialog

    try {
        const response = await form.show(player);
        if (response.canceled) {
            // If form is cancelled (e.g. escape key), it often behaves like pressing the first available button or a default close.
            // For consistency, we can choose to go back to main menu or do nothing.
            // Going back to main menu is a common UX pattern for cancellation here.
            logDebug(`[UI] Rules cancelled by ${player.name}. Reason: ${response.cancelationReason || "Form closed"}`);
            // Depending on desired behavior, could call showPublicInfoPanel(player) here too.
            // For now, let cancellation be just closing.
            return;
        }

        if (response.selection === 0) { // Back to Main Menu
            showPublicInfoPanel(player);
        }
        // If selection is 1 (Close), do nothing, form closes.
    } catch (e) {
        logDebug(`[UI Error][showRules] Error for ${player.name}: ${e} ${e.stack}`);
        if (player && typeof player.sendMessage === 'function') {
            player.sendMessage("§cAn error occurred while trying to display the server rules.");
        }
    }
}

async function showMyInfo(player) {
    const form = new MessageFormData();
    form.title("My Information");

    let role = "Normal";
    if (player.isOwner()) {
        role = "Owner";
    } else if (player.hasAdmin()) {
        role = "Admin";
    }

    const location = player.location;
    const coords = `X: ${Math.floor(location.x)}, Y: ${Math.floor(location.y)}, Z: ${Math.floor(location.z)}`;

    let gameModeName = "Unknown";
    try {
        // Attempt to get gamemode using matches. Player.getGameMode() is not standard in @minecraft/server.
        if (player.matches({ gameMode: Minecraft.GameMode.survival })) gameModeName = "Survival";
        else if (player.matches({ gameMode: Minecraft.GameMode.creative })) gameModeName = "Creative";
        else if (player.matches({ gameMode: Minecraft.GameMode.adventure })) gameModeName = "Adventure";
        else if (player.matches({ gameMode: Minecraft.GameMode.spectator })) gameModeName = "Spectator";
        // Note: Minecraft.GameMode.spectator might not always work with `matches` depending on API version/implementation details.
        // A more robust way if available would be player.getGameMode() but that's often from @minecraft/server-gametest
    } catch (e) {
        logDebug(`[UI Error][showMyInfo] Error getting gamemode for ${player.name}: ${e}`);
        // gameModeName remains "Unknown"
    }


    const dimension = player.dimension.id;

    let bodyText = `§lName:§r ${player.name}\n`;
    bodyText += `§lRole:§r ${role}\n`;
    bodyText += `§lGamemode:§r ${gameModeName}\n`;
    bodyText += `§lCoordinates:§r ${coords}\n`;
    bodyText += `§lDimension:§r ${dimension}`;

    form.body(bodyText);
    form.button1("Refresh");         // Button for refreshing the info
    form.button2("Back to Main Menu"); // Button to go back

    try {
        const response = await form.show(player);
        if (response.canceled) {
            logDebug(`[UI] MyInfo cancelled by ${player.name}. Reason: ${response.cancelationReason || "Form closed"}`);
            return; 
        }

        if (response.selection === 0) { // Refresh
            showMyInfo(player);
        } else if (response.selection === 1) { // Back to Main Menu
            showPublicInfoPanel(player);
        }
    } catch (e) {
        logDebug(`[UI Error][showMyInfo] Error for ${player.name}: ${e} ${e.stack}`);
        if (player && typeof player.sendMessage === 'function') {
            player.sendMessage("§cAn error occurred while trying to display your information.");
        }
    }
}

async function showServerInfo(player) {
    const form = new MessageFormData();
    form.title("Server Information");

    const uiSettings = CONFIG.uiSettings;
    const welcomeMessage = uiSettings.welcomeMessage || "Welcome!";
    const currentTimeTicks = world.getTime(); // Gets total world time in ticks
    // Convert ticks to a more readable format (e.g., Day X, HH:MM)
    // 24000 ticks = 1 Minecraft day. 1000 ticks = 1 hour. ~16.66 ticks = 1 minute.
    const ticksPerDay = 24000;
    const ticksPerHour = 1000;
    const gameDay = Math.floor(currentTimeTicks / ticksPerDay) + 1; // Day starts at 1
    const timeWithinDay = currentTimeTicks % ticksPerDay;
    const gameHour = Math.floor(timeWithinDay / ticksPerHour); // 0-23 hour format
    const timeWithinHour = timeWithinDay % ticksPerHour;
    const gameMinute = Math.floor((timeWithinHour / ticksPerHour) * 60); // 0-59 minute format

    const formattedTime = `Day ${gameDay}, ${String(gameHour).padStart(2, '0')}:${String(gameMinute).padStart(2, '0')}`;
    
    const onlinePlayers = world.getAllPlayers().length;

    let bodyText = `${welcomeMessage}\n\n`;
    bodyText += `§lCurrent In-Game Time:§r ${formattedTime} (Ticks: ${currentTimeTicks})\n`;
    bodyText += `§lPlayers Online:§r ${onlinePlayers}`;

    form.body(bodyText);
    form.button1("Refresh"); // Button for refreshing the info
    form.button2("Back to Main Menu");    // Button to go back

    try {
        const response = await form.show(player);
        if (response.canceled) {
            logDebug(`[UI] ServerInfo cancelled by ${player.name}. Reason: ${response.cancelationReason || "Form closed"}`);
            return; 
        }

        if (response.selection === 0) { // Refresh
            showServerInfo(player);
        } else if (response.selection === 1) { // Back to Main Menu
            showPublicInfoPanel(player);
        }
    } catch (e) {
        logDebug(`[UI Error][showServerInfo] Error for ${player.name}: ${e} ${e.stack}`);
        if (player && typeof player.sendMessage === 'function') {
            player.sendMessage("§cAn error occurred while trying to display server information.");
		}
	}
}


/**
 * Displays a form to toggle Anti-Cheat modules on or off.
 *
 * @param {Minecraft.Player} player The player modifying the module settings.
 * @param {Function} previousForm A function to call to return to the previous UI screen.
 * @returns {void}
 * @throws {Error} If an error occurs during UI display or interaction.
 */
function moduleSettingsForm(player, previousForm){

	let settingsModalForm = new ModalFormData() 
		.title("§l§7Module Settings") 
	
	const validModules = ModuleStatusManager.getValidModules();
	for (let i = 0; i < validModules.length; i++) {
		const setting = validModules[i];
		const isSettingEnabled = ModuleStatusManager.getModuleStatus(setting);
		settingsModalForm.toggle(setting, { defaultValue: isSettingEnabled }); 
	}

	settingsModalForm.show(player).then((formData) => {
		if (formData.canceled) {
			return previousForm(player); 
		}

		for (let i = 0; i < validModules.length; i++) {
			const setting = validModules[i];
			const isSettingEnabled = ModuleStatusManager.getModuleStatus(setting)
			const shouldEnableSetting = formData.formValues[i];

			if (isSettingEnabled !== shouldEnableSetting) {
				ModuleStatusManager.toggleModule(setting);
				sendMessageToAllAdmins(`§6[§eAnti Cheats Notify§6]§f ${player.name}§f turned ${shouldEnableSetting ? "on" : "off"} §e${setting}§f!`,true);
			}
		}
        return previousForm(player); 
	}).catch(e => {
		logDebug(`[Anti Cheats UI Error][moduleSettingsForm]: ${e} ${e.stack}`);
		if (player && typeof player.sendMessage === 'function') {
			player.sendMessage("§cAn error occurred with the UI. Please try again.");
		}
	});
}

/**
 * Displays a form to select a player from the list of currently online players.
 * Used as a precursor to performing actions on the selected player (e.g., ban, kick).
 *
 * @export
 * @param {Minecraft.Player} player The player initiating the selection.
 * @param {"action"|"ban"} action The type of action to follow after selection.
 *                                  "action" leads to `playerActionForm`.
 *                                  "ban" leads to a quick ban via `banForm`.
 * @param {Function} previousForm A function to call to return to the previous UI screen.
 * @returns {void}
 * @throws {Error} If an error occurs during UI display or interaction.
 */
export function playerSelectionForm(player, action, previousForm) {
	let players = [...world.getPlayers()];
	let form = new ActionFormData()
		.title("§l§7Player Selector") 
		.body(`Select a player to perform actions on. Online: ${players.length}`); 
	
	players.forEach((targetPlayer) => {
		let playerName = targetPlayer.name;
		let playerDisplayName = playerName; 
		if(targetPlayer.name === player.name) playerDisplayName += " §7(You)";
		if(targetPlayer.isOwner()) playerDisplayName += " §c(Owner)";
		else if(targetPlayer.hasAdmin()) playerDisplayName += " §6(Admin)";
		
		form.button(playerDisplayName, "textures/ui/icon_steve.png"); 
	});

	if (previousForm) {
		form.button("§cBack", "textures/ui/cancel.png"); 
	}

	form.show(player).then((formData) => {
		if(formData.canceled) {
			if (previousForm) return previousForm(player);
			return player.sendMessage(`§6[§eAnti Cheats§6]§r You closed the form without saving!`);
		}

		if (previousForm && formData.selection === players.length) {
			return previousForm(player);
		}

		const selectedPlayer = players[formData.selection];

		if(action == "action") return playerActionForm(player, selectedPlayer, previousForm); 
		if(action == "ban") return banForm(player, selectedPlayer, "quick", null, (p) => playerSelectionForm(p, action, previousForm)); 
	}).catch(e => {
		logDebug(`[Anti Cheats UI Error][playerSelectionForm]: ${e} ${e.stack}`);
		if (player && typeof player.sendMessage === 'function') {
			player.sendMessage("§cAn error occurred with the UI. Please try again.");
		}
	});
}

/**
 * Displays a form with various actions to perform on a target player.
 * Actions include ban, kick, warn, freeze, mute, view/copy inventory, unmute, unfreeze, and clear warnings.
 * Cannot be used on admins.
 *
 * @param {Minecraft.Player} player The player initiating the action.
 * @param {Minecraft.Player} targetPlayer The player on whom the action will be performed.
 * @param {Function} previousForm A function to call to return to the previous UI screen (typically `showAdminPanelMain` via `playerSelectionForm`).
 * @returns {void}
 * @throws {Error} If an error occurs during UI display or interaction, or if the target player is an admin.
 */
function playerActionForm(player, targetPlayer, previousForm){ 
	if(targetPlayer.hasAdmin()) {
		player.sendMessage(`§6[§eAnti Cheats§6]§r Can't perform actions on §e${targetPlayer.name}§f they're an admin.`);
		return playerSelectionForm(player, 'action', previousForm); 
	}

	const playerActions = ["Ban Player","Kick Player","Warn Player","Freeze Player","Mute Player","View Inventory","Copy Inventory","Unmute Player","Unfreeze Player","Remove All Warnings"];
	
	let playerActionModalForm = new ModalFormData() 
		.title(`§l§7Actions: ${targetPlayer.name}`) 
		.dropdown(`Select Action:`, playerActions) 
		.textField("Reason (optional)", "Enter reason for action"); 

	playerActionModalForm.show(player).then((formData) => {
		if(formData.canceled) {
			return playerSelectionForm(player, 'action', previousForm);
		}

		const action = formData.formValues[0];
		const reason = formData.formValues[1] ?? "";
		sendMessageToAllAdmins(`§6[§eAnti Cheats Notify§6]§5§l ${player.name} §bperformed ${playerActions[action]} on§l§5 ${targetPlayer.name}! §r`,true);
		
		switch(action){
			case 0: 
				return banForm(player, targetPlayer, "slow", reason, () => playerActionForm(player, targetPlayer, previousForm));
			case 1: 
				player.runCommand(`kick "${targetPlayer.name}" ${reason}`);
				return playerSelectionForm(player, 'action', previousForm);
			case 2:
				targetPlayer.setWarning("manual");
				targetPlayer.sendMessage(`§6[§eAnti Cheats§6]§r§4§l You were warned!${reason ? ` Reason: §c${reason}` : ""}`);
				player.sendMessage(`§6[§eAnti Cheats§6]§r Successfully warned player §e${targetPlayer.name}`);
				break; 
			case 3: 
				if (targetPlayer.getDynamicProperty("ac:freezeStatus")) {
					player.sendMessage(`§6[§eAnti Cheats§6]§f §e${targetPlayer.name}§f is already frozen.`);
				} else {
					targetPlayer.setFreezeTo(true);
					player.sendMessage(`§6[§eAnti Cheats§6]§f Succesfully froze §e${targetPlayer.name}`);
					targetPlayer.sendMessage(`§6[§eAnti Cheats§6]§f You were §efrozen§f by the admin §e${player.name}`);
				}
				break;
			case 4: 
				targetPlayer.mute(player,reason,-1); 
				break;
			case 5: 
				invsee(player,targetPlayer); 
				break;
			case 6: 
				copyInv(player,targetPlayer); 
				break;
			case 7: 
				if (!targetPlayer.isMuted) {
					player.sendMessage(`§6[§eAnti Cheats§6]§f Player §e${targetPlayer.name}§f is not muted.`);
				} else {
					targetPlayer.unmute();
					player.sendMessage(`§6[§eAnti Cheats§6]§r Successfully unmuted §e${targetPlayer.name}`);
					targetPlayer.sendMessage(`§6[§eAnti Cheats§6]§r You were unmuted!`);
				}
				break;
			case 8: 
				if (!targetPlayer.getDynamicProperty("ac:freezeStatus")) {
					player.sendMessage(`§6[§eAnti Cheats§6]§f §e${targetPlayer.name}§f is not frozen.`);
				} else {
					targetPlayer.setFreezeTo(false);
					player.sendMessage(`§6[§eAnti Cheats§6]§f Succesfully unfroze §e${targetPlayer.name}`);
					targetPlayer.sendMessage(`§6[§eAnti Cheats§6]§f You were §eunfrozen§f by the admin §e${player.name}`);
				}
				break;
			case 9: 
				targetPlayer.clearWarnings();
				player.sendMessage(`§6[§eAnti Cheats§6]§r Successfully reset all warnings of §e${targetPlayer.name}`);
				break;
		}
		if (action !== 0 && action !== 1 && action !== 5 && action !==6 ) { 
			return playerSelectionForm(player, 'action', previousForm);
		}
	}).catch(e => {
		logDebug(`[Anti Cheats UI Error][playerActionForm]: ${e} ${e.stack}`);
		if (player && typeof player.sendMessage === 'function') {
			player.sendMessage("§cAn error occurred with the UI. Please try again.");
		}
	});
}
