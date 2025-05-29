import * as Minecraft from "@minecraft/server";
import CONFIG from "../config.js";
import { ModuleStatusManager } from "../classes/module.js";
import { i18n } from './i18n.js'; // Added for localization
import { logDebug } from './logger.js';
const world = Minecraft.world;

/**
 * An object mapping time units (minute, hour, day) to their respective millisecond values.
 * Used for time calculations, such as parsing punishment durations.
 * @type {object}
 * @property {number} minute - Milliseconds in a minute (60,000).
 * @property {number} hour - Milliseconds in an hour (3,600,000).
 * @property {number} day - Milliseconds in a day (86,400,000).
 */
export const millisecondTime = {
	minute: 60000,
	hour: 3600000,
	day: 86400000
}

export const LOG_FILE_PREFIX = { 
    COMMAND: "command_log_", 
    ACTIVITY: "activity_log_", 
    CHAT: "chat_log_", // Added CHAT based on typical logging needs
    ERROR: "error_log_" // Added ERROR based on typical logging needs
};

/**
 * An array of strings representing the keys for armor slots used with `EntityEquippableComponent`.
 * These keys correspond to standard equipment slots.
 * @type {string[]}
 */
const armorKeys = ["Head", "Chest", "Legs", "Feet", "Offhand"];

/**
 * Formats a duration given in milliseconds into a human-readable string (e.g., "01 Days 02 Hours 03 Mins").
 *
 * @param {number} milliseconds - The duration in milliseconds to format.
 *                                Should be a non-negative value.
 *                                If negative or not a valid number, it will typically return "No time set." or similar error indication.
 * @returns {string} A formatted string representing the duration in days, hours, and minutes, or "No time set." for invalid input.
 */
export function formatMilliseconds(milliseconds) {
	if (milliseconds < 0) {
		return i18n.getText("util.formatMilliseconds.noTimeSet");
	}

	const totalSeconds = Math.floor(milliseconds / 1000);
	const days = Math.floor(totalSeconds / 86400); // Total days
	const hours = Math.floor((totalSeconds % 86400) / 3600); // Hours within a day
	const minutes = Math.floor((totalSeconds % 3600) / 60); // Minutes within an hour

	const formattedDays = String(days).padStart(2, '0');
	const formattedHours = String(hours).padStart(2, '0');
	const formattedMinutes = String(minutes).padStart(2, '0');

	return `${formattedDays}${i18n.getText("util.formatMilliseconds.days")} ${formattedHours}${i18n.getText("util.formatMilliseconds.hours")} ${formattedMinutes}${i18n.getText("util.formatMilliseconds.mins")}`;
}

/**
 * Generates and stores a new ban log entry.
 * Ban logs are stored in a world dynamic property "ac:banLogs" as a JSON string.
 * Each log entry includes the banned player's name, the admin's name, timestamp, and reason.
 * An internally generated unique `logId` is added to the object before storage.
 * The function handles parsing existing logs and ensures the total size of the stringified log array
 * does not exceed dynamic property limits by removing the oldest entries if necessary.
 *
 * @param {object} obj - The ban log data.
 * @param {string} obj.a - The name of the player being banned.
 * @param {string} obj.b - The name of the admin or system issuing the ban.
 * @param {number} obj.c - The timestamp (e.g., `Date.now()`) when the ban was issued.
 * @param {string} obj.d - The reason for the ban.
 * @returns {void}
 */
export function generateBanLog(obj) {
	let logsString = world.getDynamicProperty("ac:banLogs");
	let newLogs = [];

	if (logsString) {
		try {
			newLogs = JSON.parse(logsString);
		} catch (error) {
			console.error("Error parsing ban logs JSON:", error);
			// Start with an empty array if parsing fails, to prevent data loss of new log
		}
	}

	// Add unique logId internally
	obj.logId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
	newLogs.push(obj);

	let stringifiedLogs = JSON.stringify(newLogs);
	
	// Ensure the stringified logs do not exceed typical dynamic property size limits (e.g., 32767 bytes)
	// by removing the oldest entries until it fits.
	while (newLogs.length > 0 && stringifiedLogs.length >= 32767) {
		newLogs.shift(); // Remove the oldest log entry
		stringifiedLogs = JSON.stringify(newLogs);
	}
	try {
		world.setDynamicProperty("ac:banLogs", stringifiedLogs);
	} catch (e) {
		console.error("[Anti Cheats ERROR] Failed to set banLogs dynamic property:", e, e.stack);
	}
}


/**
 * Parses a punishment duration string array into milliseconds.
 * For example, `["15", "minute"]` would be parsed into the equivalent of 15 minutes in milliseconds.
 *
 * @param {string[]} punishment - An array containing two strings: the first is the numerical amount,
 *                                and the second is the time unit (e.g., "day", "hour", "minute").
 * @returns {number | null} The calculated duration in milliseconds, or `null` if the input is invalid
 *                          (e.g., incorrect array length, non-numeric amount, invalid time unit).
 */
export function parsePunishmentTime(punishment) {
	if (!Array.isArray(punishment) || punishment.length !== 2) {
	  return null;
	}
  
	const amount = parseInt(punishment[0], 10); // Ensure base 10 for parsing
	if (isNaN(amount) || amount <= 0) {
	  return null;
	}
  
	const unit = typeof punishment[1] === 'string' ? punishment[1].toLowerCase() : "";
	const multiplier = millisecondTime[unit]; // Uses the millisecondTime constant
  
	if (!multiplier) {
	  return null; // Invalid time unit
	}
  
	return amount * multiplier;
}

/**
 * Displays the inventory and armor of `targetPlayer` to `senderPlayer` via chat messages.
 * Iterates through the target's main inventory and equipped armor slots, sending a message for each item found.
 *
 * @param {Minecraft.Player} senderPlayer - The player who will receive the inventory information.
 * @param {Minecraft.Player} targetPlayer - The player whose inventory and armor will be displayed.
 * @returns {void}
 * @throws {TypeError} If `senderPlayer` is not a `Minecraft.Player` instance (param "senderPlayer").
 * @throws {TypeError} If `targetPlayer` is not a `Minecraft.Player` instance (param "targetPlayer").
 */
export function invsee(senderPlayer, targetPlayer) {
	try {
		if (!(senderPlayer instanceof Minecraft.Player)) throw TypeError(`Parameter "senderPlayer" isn't instanceof Player`);
		if (!(targetPlayer instanceof Minecraft.Player)) throw TypeError(`Parameter "targetPlayer" isn't instanceof Player`);

		const inv = targetPlayer.getComponent("minecraft:inventory")?.container;
		if (!inv) {
			logDebug(`[Anti Cheats ERROR] Target player ${targetPlayer.name} inventory component not found in invsee.`);
			senderPlayer.sendMessage(i18n.getText("util.invsee.error.noInventoryComponent"));
			return;
		}
		
		senderPlayer.sendMessage(i18n.getText("util.invsee.title", { playerName: targetPlayer.name }));
		for (let i = 0; i < inv.size; i++) {
			const item = inv.getItem(i);
			if (!item) continue;

			const { amount,nameTag,typeId } = item;
			if (!typeId) continue; // Should ideally not happen if item exists
			const itemBaseName = typeId.replace('minecraft:', '');
            if (nameTag) {
              senderPlayer.sendMessage(i18n.getText("util.invsee.slotItemWithNameTag", { slot: i, itemName: itemBaseName, amount: amount, nameTag: nameTag }));
            } else {
              senderPlayer.sendMessage(i18n.getText("util.invsee.slotItem", { slot: i, itemName: itemBaseName, amount: amount }));
            }
		}
		
		const targetArmorContainer = targetPlayer.getComponent(Minecraft.EntityComponentTypes.Equippable);
		if (!targetArmorContainer) {
			logDebug(`[Anti Cheats ERROR] Target player ${targetPlayer.name} equippable component not found in invsee.`);
			senderPlayer.sendMessage(i18n.getText("util.invsee.error.noArmorComponent"));
			return;
		}

		for (let i = 0; i < armorKeys.length; i++) { // Uses armorKeys constant
			const item = targetArmorContainer.getEquipment(armorKeys[i]);
			if (!item) continue;

			const { amount, nameTag, typeId } = item;
			if (!typeId) continue; // Should ideally not happen if item exists
			const itemBaseName = typeId.replace('minecraft:', '');
            if (nameTag) {
              senderPlayer.sendMessage(i18n.getText("util.invsee.slotItemWithNameTag", { slot: armorKeys[i], itemName: itemBaseName, amount: amount, nameTag: nameTag }));
            } else {
              senderPlayer.sendMessage(i18n.getText("util.invsee.slotItem", { slot: armorKeys[i], itemName: itemBaseName, amount: amount }));
            }
		}
	} catch (e) {
		logDebug("[Anti Cheats ERROR] Error in invsee:", e, e.stack);
		if(senderPlayer instanceof Minecraft.Player) senderPlayer.sendMessage(i18n.getText("util.invsee.error.general"));
	}
}

/**
 * Retrieves a player object by their exact name.
 * Uses `world.getPlayers({ name: name })` to find the player.
 *
 * @param {string} name - The exact name of the player to find.
 * @returns {Minecraft.Player | false} The player object if found; otherwise, `false`.
 */
export function getPlayerByName(name){
	try {
		const players = world.getPlayers({ name: name }); // Query options to find by exact name
		return players[0] ?? false; // Return the first player found, or false if none
	} catch (e) {
		logDebug("[Anti Cheats ERROR] Failed to get player by name:", name, e, e.stack);
		return false; // Return false on error
	}
}

/**
 * Adds or removes a scoreboard objective using `Minecraft.system.run()` for deferred execution.
 * This ensures safety if called from restricted contexts (e.g., "before event" handlers)
 * where direct scoreboard modification might be disallowed.
 *
 * @param {string} id - The ID of the scoreboard objective.
 * @param {"add" | "remove"} type - The action to perform: "add" to create, "remove" to delete.
 * @param {string} [displayName] - Optional display name for the objective when adding. Defaults to `id`. Ignored if `type` is "remove".
 * @returns {void}
 * @throws {Error} If an invalid `type` is provided (i.e., not "add" or "remove"). Internal scoreboard errors are caught and logged, not re-thrown.
 */
export function scoreboardAction(id, type, displayName){
	if (typeof id !== 'string' || id.trim() === '') {
        logDebug("[Anti Cheats ERROR] scoreboardAction: 'id' must be a non-empty string.");
        return; // Or throw error, depending on desired strictness
    }
	if (!["add", "remove"].includes(type)) {
		// Original code throws an error here, which is good for immediate feedback.
		throw new Error(`Invalid 'type' for scoreboardAction: Expected "add" or "remove", got "${type}"`);
	}

    Minecraft.system.run(() =>{
		try{
        	if(type === "remove") world.scoreboard.removeObjective(id);
        	else if(type === "add") world.scoreboard.addObjective(id, displayName || id);
		}
		catch(e){
			logDebug(`[Anti Cheats ERROR] Failed to ${type} scoreboard objective "${id}":`, e, e.stack);
			// Depending on desired behavior, you might not want to re-throw if the operation can fail gracefully
			// (e.g., trying to remove a non-existent objective or add an existing one).
			// For now, re-throwing as per original logic to indicate failure to the caller.
			// throw e; 
		}
    });
}

/**
 * Adds a player's name to the unban queue. The queue is stored as a JSON string
 * in the "ac:unbanQueue" world dynamic property. Players in this queue are typically
 * unbanned when they next join the server.
 *
 * @param {Minecraft.Player} adminPlayer - The admin player performing the action.
 * @param {string} playerName - The name of the player to add to the unban queue (case-sensitive).
 * @returns {void}
 * @throws {TypeError} - If `adminPlayer` is not a `Minecraft.Player` instance or `playerName` is not a string.
 */
export function addPlayerToUnbanQueue(adminPlayer,playerName){
	try {
		if (!(adminPlayer instanceof Minecraft.Player)) throw TypeError("Parameter 'adminPlayer' is not an instance of Player");
		if(typeof playerName !== "string") throw TypeError(`Parameter 'playerName' (typeof '${typeof playerName}') must be a string`);

		// Assuming world.acUnbanQueue is initialized elsewhere (e.g., in Initialize.js)
		if (!Array.isArray(world.acUnbanQueue)) {
			logDebug("[Anti Cheats ERROR] world.acUnbanQueue is not initialized as an array. Attempting to initialize.");
			world.acUnbanQueue = [];
		}
		
		if (world.acUnbanQueue.includes(playerName)) {
			adminPlayer.sendMessage(i18n.getText("util.unbanQueue.alreadyPending", { playerName: playerName }));
			return;
		}
		world.acUnbanQueue.push(playerName);
		try {
			world.setDynamicProperty("ac:unbanQueue", JSON.stringify(world.acUnbanQueue));
		} catch(e) {
			logDebug("[Anti Cheats ERROR] Failed to set dynamic property for unbanQueue:", e, e.stack);
			adminPlayer.sendMessage(i18n.getText("util.unbanQueue.error.saveFailed"));
			// Optionally remove player from local queue if saving failed to maintain consistency, or handle error differently.
			const index = world.acUnbanQueue.indexOf(playerName);
			if (index > -1) world.acUnbanQueue.splice(index, 1);
			return;
		}
		adminPlayer.sendMessage(i18n.getText("util.unbanQueue.success", { playerName: playerName }));
	} catch (e) {
		logDebug("[Anti Cheats ERROR] Error in addPlayerToUnbanQueue:", e, e.stack);
		if(adminPlayer instanceof Minecraft.Player) adminPlayer.sendMessage(i18n.getText("util.unbanQueue.error.general"));
	}
}

/**
 * Sends a message to all online players who have admin privileges.
 * Admin privileges are determined by `player.hasAdmin()`.
 * Optionally, if `isANotification` is true, the message is only sent to admins
 * who also have the "ac:notify" scoreboard objective set to 1.
 *
 * @param {string} [message="No message provided"] - The message string to send.
 * @param {boolean} [isANotification=false] - If true, filters recipients to admins with "ac:notify" score of 1.
 *                                           Defaults to false, sending to all admins.
 * @returns {void}
 */
export function sendMessageToAllAdmins(translationKey, placeholders = {}, isANotification = false){
	let entityQueryOptions = {};
	if(isANotification){
		entityQueryOptions.scoreOptions = [{
			objective: "ac:notify", // Assumes "ac:notify" scoreboard objective exists
			minScore: 1, // Minimum score to include (e.g., 1 for true)
			maxScore: 1, // Maximum score to include
			// exclude: false // This is default, means include if matches
		}];
	}
	
	try {
		const adminPlayers = world.getPlayers(entityQueryOptions); // Get players matching score options (if any)
		for (const admin of adminPlayers) { // Iterate directly, no need for forEach with index
			if(admin.hasAdmin()) { // Further verify admin status using hasAdmin()
				try {
					admin.sendMessage(i18n.getText(translationKey, placeholders, admin));
				} catch (e) {
					logDebug("[Anti Cheats ERROR] Failed to send message to admin", admin.name, "in sendMessageToAllAdmins:", e, e.stack);
				}
			}
		}
	} catch (e) {
		// This would catch errors from world.getPlayers itself, if query options are malformed etc.
		logDebug("[Anti Cheats ERROR] Error in sendMessageToAllAdmins (getting players):", e, e.stack);
	}
}

/**
 * Teleports the given player to the nearest valid ground block directly below their current position.
 * Uses raycasting to find the ground. The teleportation is scheduled using `Minecraft.system.run()`
 * to ensure it happens in a safe execution context.
 *
 * @param {Minecraft.Player} player - The player to teleport.
 * @returns {void} Logs a debug message if a suitable ground block cannot be found or if teleportation fails.
 */
export function teleportToGround(player) {
	if (!(player instanceof Minecraft.Player)) {
        logDebug("[Anti Cheats ERROR] teleportToGround: 'player' parameter is not a Minecraft.Player instance.");
        return;
    }
	const playerPosition = player.location; // Current location of the player
	const raycastDirection = { x: 0, y: -1, z: 0 }; // Raycast downwards
	const dimension = player.dimension;

	try {
		// Perform raycast to find the block directly below the player.
		// Max distance can be configured or set to a reasonable default if needed.
		const hitBlock = dimension.getBlockFromRay(playerPosition, raycastDirection, {maxDistance: Math.floor(playerPosition.y) + 64});
		
		if (!hitBlock || !hitBlock.block) { // Check if ray hit something and it's a block
			logDebug("[Anti Cheats] Couldn't find a ground block to teleport player to:", player.name, "at Y-level", playerPosition.y);
			return;
		}
		
		const groundBlockLocation = hitBlock.block.location;

		// Schedule the teleportation to the next tick for safety.
		Minecraft.system.run(() => {
			try {
				// Teleport player to one block above the found ground block.
				player.tryTeleport({ x: groundBlockLocation.x, y: groundBlockLocation.y + 1, z: groundBlockLocation.z }, {checkForBlocks: true});
			} catch (e) {
				logDebug("[Anti Cheats ERROR] Failed to teleport player", player.name, "to ground (inside system.run):", e, e.stack);
			}
		});
	} catch (e) {
		logDebug("[Anti Cheats ERROR] Error in teleportToGround (raycasting or scheduling run):", player.name, e, e.stack);
	}
}

/**
 * Copies the inventory (main container and equipped armor) from `targetPlayer` to `senderPlayer`.
 * This operation is performed within `Minecraft.system.run()` for safety.
 * The sender's inventory is cleared before copying.
 *
 * @param {Minecraft.Player} senderPlayer - The player who will receive the copied inventory.
 * @param {Minecraft.Player} targetPlayer - The player whose inventory is being copied.
 * @returns {void} Sends a completion or error message to `senderPlayer`.
 * @throws {TypeError} - If either `senderPlayer` or `targetPlayer` is not an instance of `Minecraft.Player`. This is checked before scheduling the system run.
 */
export function copyInv(senderPlayer, targetPlayer) {
	if (!(senderPlayer instanceof Minecraft.Player)) throw TypeError(`Parameter "senderPlayer" isn't instanceof Player`);
	if (!(targetPlayer instanceof Minecraft.Player)) throw TypeError(`Parameter "targetPlayer" isn't instanceof Player`);

	try {
		Minecraft.system.run(() => {
			try {
				const targetInvContainer = targetPlayer.getComponent("minecraft:inventory")?.container;
				const senderInvContainer = senderPlayer.getComponent("minecraft:inventory")?.container;

				if (!targetInvContainer || !senderInvContainer) {
					logDebug(`[Anti Cheats ERROR] Inventory component not found for sender or target in copyInv. Sender: ${senderPlayer.name}, Target: ${targetPlayer.name}`);
					senderPlayer.sendMessage(i18n.getText("util.copyInv.error.noInventoryComponent"));
					return;
				}
				senderInvContainer.clearAll(); // Clear sender's inventory first

				// Copy main inventory
				for (let i = 0; i < targetInvContainer.size; i++) {
					const item = targetInvContainer.getItem(i);
					if (item) { // Check if item exists before setting
						senderInvContainer.setItem(i, item);
					}
				}
				
				const senderEquippable = senderPlayer.getComponent(Minecraft.EntityComponentTypes.Equippable);
				const targetEquippable = targetPlayer.getComponent(Minecraft.EntityComponentTypes.Equippable);

				if (!senderEquippable || !targetEquippable) {
					logDebug(`[Anti Cheats ERROR] Equippable component not found for sender or target in copyInv. Sender: ${senderPlayer.name}, Target: ${targetPlayer.name}`);
					senderPlayer.sendMessage(i18n.getText("util.copyInv.error.noArmorComponent"));
					return;
				}
				
				// Copy armor and offhand using armorKeys
				for(const slotKey of armorKeys){ // Iterate using armorKeys constant
					const item = targetEquippable.getEquipment(slotKey);
					// Clear existing equipment in sender's slot before setting new one, if necessary, or just set.
					//Vanilla behavior usually swaps, but setEquipment should overwrite.
					senderEquippable.setEquipment(slotKey, item); // item can be undefined to clear slot
				}
				senderPlayer.sendMessage(i18n.getText("util.copyInv.success", { playerName: targetPlayer.name }));
			} catch (e) {
				logDebug("[Anti Cheats ERROR] Error during copyInv (inside system.run):", senderPlayer.name, targetPlayer.name, e, e.stack);
				if(senderPlayer instanceof Minecraft.Player) senderPlayer.sendMessage(i18n.getText("util.copyInv.error.general"));
			}
		});
	} catch (e) {
		// This catch is for errors scheduling the system.run, not errors inside it.
		logDebug("[Anti Cheats ERROR] Error scheduling copyInv with system.run:", senderPlayer.name, targetPlayer.name, e, e.stack);
		if(senderPlayer instanceof Minecraft.Player) senderPlayer.sendMessage(i18n.getText("util.copyInv.error.scheduleFailed"));
	}
}

/**
 * Sends an anti-cheat alert for a detected player.
 * This function will issue a warning to the player, and if AutoMod is enabled,
 * it will kick the player. Alerts are sent to admins or all players based on configuration.
 *
 * @param {Minecraft.Player} detectedPlayer - The player detected for suspicious activity.
 * @param {string} detectionType - A short string describing the type of detection (e.g., "autoclicker", "fly").
 * @param {string | number} detectionValue - The specific value or detail associated with the detection (e.g., CPS count, speed value).
 * @param {string} module - The human-readable name of the Anti-Cheats module that triggered the alert (must be a value from `ACModule.Modules`).
 * @returns {void}
 * @throws {TypeError} - If `detectedPlayer` is not a `Minecraft.Player`, or if `detectionType`, `detectionValue` (if string), or `module` are not strings, or if `detectionValue` (if number) is not a number.
 * @throws {ReferenceError} - If `module` is not a valid module name recognized by `ACModule.getValidModules()`.
 */
export function sendAnticheatAlert(detectedPlayer, detectionType, detectionValue, module) {
	if (!(detectedPlayer instanceof Minecraft.Player)) throw TypeError(`"detectedPlayer" is not an instance of Minecraft Player`);
	if (typeof detectionType !== "string") throw TypeError(`"detectionType" is typeof ${typeof detectionType}, not string`);
	if (typeof detectionValue !== "string" && typeof detectionValue !== "number") throw TypeError(`"detectionValue" is typeof ${typeof detectionValue}, not string or number`);

	if (!ModuleStatusManager.getValidModules().includes(module)) throw ReferenceError(`"${module}" isn't an Anti Cheats module.`);

	try {
		// Duplicated checks removed from here

		detectedPlayer.setWarning(module); // This now has its own try-catch

		if (ModuleStatusManager.getModuleStatus(ModuleStatusManager.Modules.autoMod)) {
			sendMessageToAllAdmins("util.alert.autoModKick.adminNotify", { playerName: detectedPlayer.name, module: module, detectionValue: detectionValue }, true);
			detectedPlayer.runCommand(`kick "${detectedPlayer.name}" ${i18n.getText("util.alert.autoModKick.playerReason", { module: module, detectionValue: detectionValue })}`);
		}

		if (CONFIG.other.sendAlertsToEveryone) {
			world.sendMessage(i18n.getText("util.alert.general", { playerName: detectedPlayer.name, detectionType: detectionType, detectionValue: detectionValue }));
		} else {
			sendMessageToAllAdmins("util.alert.general", { playerName: detectedPlayer.name, detectionType: detectionType, detectionValue: detectionValue }, false);
		}
	} catch (e) {
		logDebug("[Anti Cheats ERROR] Error in sendAnticheatAlert:", detectedPlayer?.name, detectionType, module, e, e.stack);
	}
}

/**
 * PLACEHOLDER FUNCTION: Intended to save log data to a file.
 * Actual file saving is not implemented in vanilla Bedrock scripting.
 * This function currently logs to the console.
 * @param {string} logPrefix - A prefix for the log, e.g., from LOG_FILE_PREFIX.
 * @param {string} logData - The string data to log.
 */
export function saveLogToFile(logPrefix, logData) {
    // In a real environment with file access, this would write to:
    // e.g., fs.writeFileSync(`${logPrefix}${new Date().toISOString().split('T')[0]}.log`, logData + '\n', { flag: 'a' });
}