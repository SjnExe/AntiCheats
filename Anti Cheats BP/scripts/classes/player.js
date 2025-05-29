import { Player, world, InputPermissionCategory } from "@minecraft/server";
import { formatMilliseconds, generateBanLog, sendMessageToAllAdmins, getPlayerByName } from "../assets/util.js";
import { logDebug } from '../assets/logger.js';
import { ModuleStatusManager as ACModule } from "./module.js";
import { i18n } from '../assets/i18n.js';

/** @property {number} initialClick - Timestamp of the initial click for CPS calculation. Primarily for internal use by anti-cheat modules. */
Player.prototype.initialClick = 0;
/** @property {number} finalCps - The final calculated Clicks Per Second (CPS) for the player. Primarily for internal use by anti-cheat modules. */
Player.prototype.finalCps = 0;
/** @property {number} currentCps - The current click count for the ongoing CPS calculation. Primarily for internal use by anti-cheat modules. */
Player.prototype.currentCps = 0;
/** @property {Array<string>} hitEntities - Array of entity IDs hit by the player in a tick. Primarily for Killaura detection. */
Player.prototype.hitEntities = [];
/** @property {number} previousYVelocity - The player's Y-axis velocity from the previous tick. Primarily for Fly/Movement checks. */
Player.prototype.previousYVelocity = 0;
/** @property {number} previousSpeed - The player's overall speed from the previous tick. Primarily for Speed/Movement checks. */
Player.prototype.previousSpeed = 0;
/** @property {boolean} registerValidCoords - Whether to register the player's current coordinates as valid. Used by teleport-back mechanisms. */
Player.prototype.registerValidCoords = true;
/** @property {boolean} isMuted - Current mute status of the player. Updated by mute/unmute methods. */
Player.prototype.isMuted = false;
/** @property {number} tridentLastUse - Timestamp of the last trident use with riptide. Used to prevent false flags in movement checks. */
Player.prototype.tridentLastUse = 0;

/**
 * Retrieves the warning history for the player.
 * Warnings are stored as a JSON string in a dynamic property.
 * @memberof Player.prototype
 * @returns {object} An object where keys are module IDs (or "manual") and values are the corresponding warning counts.
 *                   Returns an empty object if no warnings are found or if an error occurs during parsing.
 * @example
 * const warnings = player.getWarnings();
 * if (warnings.killaura && warnings.killaura > 2) {
 *   player.sendMessage("You have multiple killaura warnings!");
 * }
 */
Player.prototype.getWarnings = function(){
	const warnings_string = this.getDynamicProperty("ac:warnings");
	if(!warnings_string) return {};
	try {
		const warnings = JSON.parse(warnings_string);
		return warnings;
	} catch (error) {
		logDebug(`[Anti Cheats] Error parsing warnings JSON for player ${this.name}:`, error);
		return {}; // Default to an empty object on error
	}
}

/**
 * Clears all warnings for the player.
 * This is achieved by setting the "ac:warnings" dynamic property to an empty JSON object string.
 * @memberof Player.prototype
 * @returns {void}
 * @example
 * player.clearWarnings();
 * player.sendMessage("Your warnings have been cleared.");
 */
Player.prototype.clearWarnings = function(){
	try {
		this.setDynamicProperty("ac:warnings",JSON.stringify({}));
	} catch (e) {
		logDebug(`[Anti Cheats ERROR] Failed to clear warnings for ${this.name}:`, e, e.stack);
	}
}

/**
 * Adds or increments a warning for the player under a specific module or as a manual warning.
 * If the module is "manual" and the warning count reaches 3, the player is permanently banned.
 * @memberof Player.prototype
 * @param {string} module - The module ID (e.g., "killaura", "fly") or "manual" for a manually issued warning.
 * @returns {void}
 * @throws {ReferenceError} If `module` is not "manual" and not a valid registered module ID.
 * @example
 * player.setWarning("killaura"); // Automatic warning from Killaura module
 * player.setWarning("manual");   // Manual warning from an admin
 */
Player.prototype.setWarning = function(module){
	try {
		if (module !== "manual" && !ACModule.getValidModules().includes(module)) {
			logDebug(i18n.getText("player.error.invalidModuleForWarning", { module: module }));
			throw ReferenceError(i18n.getText("player.error.invalidModuleReference", { moduleName: module }));
		}
		const warnings = this.getWarnings(); // Already has try-catch for parsing
		const moduleID = module === "manual" ? module : ACModule.getModuleID(module);

		if(!warnings[moduleID]) warnings[moduleID] = 1;
		else warnings[moduleID] += 1;
		
		logDebug(JSON.stringify(warnings));

		this.setDynamicProperty("ac:warnings", JSON.stringify(warnings));

		if(module === "manual"){
			const manualWarningCount = warnings[moduleID];
			if (manualWarningCount === 2) {
				this.sendMessage(i18n.getText("player.warn.manual.approachingBan"));
			} else if(manualWarningCount === 3){
				this.ban("Reaching 3 manual warnings", -1, true, "Anti Cheats AntiCheat"); // ban itself will be wrapped
				this.runCommand(`kick "${this.name}" ${i18n.getText("player.kick.manualWarnings.3")}`);
				sendMessageToAllAdmins("player.notify.admin.permBannedForManualWarnings", { playerName: this.name }, true);
			}
		}
	} catch (e) {
		logDebug(i18n.getText("player.error.failedToSetWarning", { playerName: this.name, module: module }), e, e.stack);
	}
}

/**
 * Retrieves the ban information for the player from their dynamic properties.
 * It also handles automatic unbanning if a temporary ban has expired.
 * @memberof Player.prototype
 * @returns {{isBanned: boolean, unbanTime?: number, isPermanent?: boolean, bannedBy?: string, banTime?: number, reason?: string}}
 *           An object containing ban details. If the player is not banned, or an error occurs,
 *           it returns an object like `{isBanned: false}`.
 *           - `isBanned`: True if currently banned, false otherwise.
 *           - `unbanTime`: Timestamp when the ban expires (for temporary bans).
 *           - `isPermanent`: True if the ban is permanent.
 *           - `bannedBy`: Name of the admin or system that issued the ban.
 *           - `banTime`: Timestamp when the ban was issued.
 *           - `reason`: The reason for the ban.
 * @example
 * const banStatus = player.getBan();
 * if (banStatus.isBanned) {
 *   console.log(`${player.name} is banned. Reason: ${banStatus.reason}`);
 * }
 */
Player.prototype.getBan = function() {
	const banProperty = this.getDynamicProperty("ac:banInfo");
	if (!banProperty) return { isBanned: false };

	try {
		const playerBanInfo = JSON.parse(banProperty);

		// It's crucial to check if playerBanInfo is an object and has the expected properties
		if (typeof playerBanInfo !== 'object' || playerBanInfo === null || typeof playerBanInfo.isBanned === 'undefined') {
			logDebug(`[Anti Cheats] Invalid or malformed banInfo JSON for player ${this.name}. Property: ${banProperty}`);
			return { isBanned: false };
		}

		if (!playerBanInfo.isBanned) return { isBanned: false };

		// Check if the ban has expired
		if (!playerBanInfo.isPermanent && Date.now() > playerBanInfo.unbanTime) {
			// Unban the player by updating the dynamic property
			const unbannedInfo = { ...playerBanInfo, isBanned: false };
			try {
				this.setDynamicProperty("ac:banInfo", JSON.stringify(unbannedInfo));
			} catch (e) {
				logDebug(`[Anti Cheats ERROR] Failed to set dynamic property for unbanned player ${this.name} in getBan:`, e, e.stack);
			}
			return { isBanned: false };
		}

		return playerBanInfo;
	} catch (error) {
		logDebug(`[Anti Cheats ERROR] Error parsing banInfo JSON for player ${this.name}:`, error, `Raw property: ${banProperty}`);
		return { isBanned: false }; // Default to not banned on error
	}
};

/**
 * Retrieves the mute information for the player.
 * It checks the "ac:muteInfo" dynamic property and parses it.
 * Also updates the player's `isMuted` property based on the current status.
 * @memberof Player.prototype
 * @returns {{duration: number, isPermanent: boolean, reason: string, admin: string, isActive: boolean}}
 *           An object containing mute details:
 *           - `duration`: Timestamp when the mute expires, or -1 if permanent or not active.
 *           - `isPermanent`: True if the mute is permanent.
 *           - `reason`: The reason for the mute.
 *           - `admin`: Name of the admin or system that issued the mute.
 *           - `isActive`: True if the mute is currently active.
 * @example
 * const muteStatus = player.getMuteInfo();
 * if (muteStatus.isActive) {
 *   player.sendMessage(`You are muted. Reason: ${muteStatus.reason}`);
 * }
 */
Player.prototype.getMuteInfo = function(){
	const muteInfoString = this.getDynamicProperty("ac:muteInfo") ?? '{"duration":-1, "isPermanent": false, "reason": "", "admin": ""}';
	try {
		let muteInfo = JSON.parse(muteInfoString);

		// Ensure essential properties exist and have default values if missing from parsed JSON
		muteInfo.duration = muteInfo.duration ?? -1;
		muteInfo.isPermanent = muteInfo.isPermanent ?? false;
		muteInfo.reason = muteInfo.reason ?? "";
		muteInfo.admin = muteInfo.admin ?? "";

		const isActive = muteInfo.isPermanent ? true : (muteInfo.duration > 0 && (muteInfo.duration - Date.now()) > 0);
		muteInfo.isActive = isActive;
		
		// If not active and not permanent, ensure duration reflects this (e.g., -1 or 0)
		if(!isActive && !muteInfo.isPermanent) {
			muteInfo.duration = -1; 
		}
		
		this.isMuted = isActive;
		return muteInfo;
	} catch (error) {
		logDebug(`[Anti Cheats] Error parsing muteInfo JSON for player ${this.name}:`, error, `Raw property: ${muteInfoString}`);
		this.isMuted = false;
		return { duration: -1, isPermanent: false, reason: "", admin: "", isActive: false }; // Default structure
	}
}

/**
 * Bans the player, storing ban information in their dynamic properties and generating a ban log.
 * @memberof Player.prototype
 * @param {string} [reason="No reason provided"] - The reason for the ban. Max 200 characters.
 * @param {number} unbanTime - The timestamp (milliseconds since epoch) when the ban should expire.
 *                             For permanent bans, this value is typically -1 or 0, but `permanent` flag is authoritative.
 * @param {boolean} permanent - Whether the ban is permanent.
 * @param {string|Player} [admin] - The name of the admin or the Player object of the admin issuing the ban.
 *                                 Defaults to "Anti Cheats AntiCheat" if not provided.
 * @returns {void}
 * @throws {TypeError} If any parameter is of an incorrect type.
 * @throws {Error} If trying to ban an admin player, or if the `admin` parameter is an invalid Player object or lacks ban permissions.
 * @throws {RangeError} If the `reason` string exceeds 200 characters.
 * @throws {SyntaxError} If the player is already banned.
 * @example
 * // Temporary ban
 * player.ban("Griefing", Date.now() + (24 * 60 * 60 * 1000), false, adminPlayer);
 * // Permanent ban by system
 * player.ban("Exploiting critical bug", -1, true, "Anti Cheats AntiCheat");
 */
Player.prototype.ban = function(reason="No reason provided", unbanTime, permanent, admin) {
	if (typeof reason !== "string") throw TypeError(i18n.getText("player.error.mute.paramTypeReason", { type: typeof reason })); // Re-using mute key for generic param type
	if (typeof permanent !== "boolean") throw TypeError(i18n.getText("player.error.ban.paramTypePermanent", { type: typeof permanent }));
	if (typeof unbanTime !== "number") throw TypeError(i18n.getText("player.error.ban.paramTypeTime", { type: typeof unbanTime }));
	
	if(admin && typeof admin !== "string"){
		if (!(admin instanceof Player)) throw TypeError(i18n.getText("player.error.mute.adminInstance")); // Re-using mute key
		if (!admin.hasAdmin()) throw Error(i18n.getText("player.error.ban.adminPermission", { adminName: admin.name }));
	}
	if (this.hasAdmin()) throw Error(i18n.getText("player.error.ban.targetIsAdmin", { playerName: this.name }));
	if (reason.length > 200) throw RangeError(i18n.getText("player.error.ban.reasonTooLong", { length: reason.length }));

	const banProperty = this.getDynamicProperty("ac:banInfo");

	if (banProperty?.isBanned) throw SyntaxError(i18n.getText("player.error.ban.alreadyBanned", { playerName: this.name }));

	const bannedByAdminName = (admin?.name ?? admin) || "Anti Cheats AntiCheat";

	try {
		//a - banned persons name
		//b - admin name
		//c - time of ban
		//d - ban reason
		try{ // Inner try-catch for generateBanLog as it's a distinct operation
			generateBanLog({ // generateBanLog itself has internal try-catch for its parsing
				a:this.name,
				b:bannedByAdminName,
				c:Date.now(),
				d:reason
			})
		}
		catch(e){ // This would catch errors in the generateBanLog call itself, not its internal logic
			logDebug(i18n.getText("player.error.ban.logFailed", { playerName: this.name }), e, e.stack);
			sendMessageToAllAdmins("player.notify.admin.banLogError", { playerName: this.name, error: e })
		}

		const banObject = {
			isBanned: true,
			unbanTime: unbanTime,
			isPermanent: permanent,
			bannedBy: bannedByAdminName,
			banTime: Date.now(),
			reason: reason,
		};

		this.setDynamicProperty("ac:banInfo", JSON.stringify(banObject));
	} catch (e) {
		logDebug(i18n.getText("player.error.ban.setDynamicPropertyFailed", { playerName: this.name }), e, e.stack);
		// Potentially send message to admin if ban failed
		if (admin instanceof Player) {
			admin.sendMessage(i18n.getText("player.notify.admin.banFailed", { playerName: this.name }));
		}
	}
};

/**
 * Unbans the player.
 * This involves updating the player's "ac:banInfo" dynamic property to reflect they are no longer banned
 * and removing them from the "ac:unbanQueue" if they were present.
 * The method attempts to ensure the player's state is consistently "not banned" even if initial parsing fails or state is inconsistent.
 * @memberof Player.prototype
 * @returns {boolean} True if the unban operation was processed. This includes scenarios where the player wasn't banned,
 *                    or if an error occurred but was handled by setting the player to an unbanned state.
 * @example
 * if (player.unban()) {
 *   console.log(`${player.name} has been unbanned or was not banned.`);
 * }
 */
Player.prototype.unban = function() {
	function removeFromUnbanQueue(player) {
		try {
			const unbanInfo = {
				isBanned: false,
			};
			const playerIndex = world.acUnbanQueue.indexOf(player.name);
			if (playerIndex > -1) {
				world.acUnbanQueue.splice(playerIndex, 1);
				try {
					world.setDynamicProperty("ac:unbanQueue", JSON.stringify(world.acUnbanQueue));
				} catch (e) {
					logDebug(`[Anti Cheats ERROR] Failed to set unbanQueue dynamic property for ${player.name}:`, e, e.stack);
				}
			}
			try {
				player.setDynamicProperty("ac:banInfo", JSON.stringify(unbanInfo));
			} catch (e) {
				logDebug(`[Anti Cheats ERROR] Failed to set banInfo dynamic property for ${player.name} during unban:`, e, e.stack);
			}
		} catch (e) {
			logDebug(`[Anti Cheats ERROR] Error in removeFromUnbanQueue for ${player.name}:`, e, e.stack);
		}
	}
	const banProperty = this.getDynamicProperty("ac:banInfo");
	if (!banProperty) {
		logDebug(`Player "${this.name}" is not banned (property missing), no unban action needed.`);
		// Attempt to remove from unban queue just in case, and ensure ban info is cleared.
		removeFromUnbanQueue(this); // Ensures banInfo is cleared and queue is updated
		return true; // Considered successful as the state is now definitely "not banned".
	}

	try {
		const banInfo = JSON.parse(banProperty);

		if (typeof banInfo !== 'object' || banInfo === null || typeof banInfo.isBanned === 'undefined') {
			logDebug(`[Anti Cheats] Invalid or malformed banInfo JSON for player ${this.name} during unban. Property: ${banProperty}. Clearing ban state.`);
			removeFromUnbanQueue(this); // Attempt to clear queue and set clean ban state
			return true; 
		}

		if (!banInfo.isBanned) {
			logDebug(`Player "${this.name}" is not marked as banned in banInfo (.isBanned=${banInfo.isBanned}). Ensuring clean state.`);
			// If they are in unban queue but record says not banned, still attempt to clean queue and record.
			removeFromUnbanQueue(this);
			return true; // Return true as an unban operation was effectively performed or corrected.
		}
		
		// Player is confirmed banned, proceed with normal unban.
		removeFromUnbanQueue(this);
		return true;

	} catch (error) {
		logDebug(i18n.getText("player.error.unban.parsingFailed", { playerName: this.name }), error, `Raw property: ${banProperty}`);
		// If parsing fails, it's unclear if the player was banned but err on the side of unbanning.
		removeFromUnbanQueue(this); // Force clear queue and set clean ban state
		return true; // Return true as a corrective unban action was taken.
	}
};

/**
 * Freezes or unfreezes the player, restricting their movement and camera input.
 * Stores the freeze status in the "ac:freezeStatus" dynamic property.
 * @memberof Player.prototype
 * @param {boolean} freeze - True to freeze the player, false to unfreeze.
 * @returns {void}
 * @throws {TypeError} If the `freeze` parameter is not a boolean.
 * @example
 * player.setFreezeTo(true); // Freezes the player
 * player.setFreezeTo(false); // Unfreezes the player
 */
Player.prototype.setFreezeTo = function(freeze){
	try {
		if(typeof freeze !== "boolean") throw TypeError(i18n.getText("player.error.freeze.type", { type: typeof freeze }));

		this.setDynamicProperty("ac:freezeStatus",freeze);

		this.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, !freeze);
		this.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, !freeze);
	} catch (e) {
		logDebug(i18n.getText("player.error.freeze.failed", { playerName: this.name, status: freeze }), e, e.stack);
	}
};

/**
 * Mutes the player for a specified duration or permanently.
 * Stores mute information in the "ac:muteInfo" dynamic property and updates `player.isMuted`.
 * @memberof Player.prototype
 * @param {string|Player} adminPlayer - The name of the admin or the Player object of the admin issuing the mute.
 *                                     Can also be a system identifier string like "Anti Cheats AntiCheat".
 * @param {string} reason - The reason for the mute.
 * @param {number} durationMs - The duration of the mute in milliseconds. Use -1 for a permanent mute.
 * @returns {void}
 * @throws {TypeError} If `adminPlayer` is an invalid type, or `reason` is not a string, or `durationMs` is not a number.
 * @throws {Error} If `adminPlayer` is a Player object but lacks admin permissions.
 * @example
 * // Temporary mute by an admin
 * player.mute(adminPlayerObject, "Spamming chat", 60 * 60 * 1000); // 1 hour mute
 * // Permanent mute by the system
 * player.mute("Anti Cheats AntiCheat", "Excessive profanity after warnings", -1);
 */
Player.prototype.mute = function(adminPlayer,reason, durationMs) {
	if (adminPlayer && typeof adminPlayer !== "string") {
		if (!(adminPlayer instanceof Player)) throw TypeError(i18n.getText("player.error.mute.adminInstance"));
		if (!adminPlayer.hasAdmin()) throw Error(i18n.getText("player.error.mute.adminPermission", { adminName: adminPlayer.name }));
	}
	if(typeof reason !== "string") throw TypeError(i18n.getText("player.error.mute.paramTypeReason", { type: typeof reason }));
	if(typeof durationMs !== "number") throw TypeError(i18n.getText("player.error.mute.paramTypeDuration", { type: typeof durationMs }));

	const adminName = (adminPlayer?.name ?? adminPlayer) || "Anti Cheats AntiCheat";
	try {
		const isPermanent = durationMs == -1;
		const endTime = isPermanent ? "permanent" : Date.now() + durationMs;
		const muteTimeDisplay = isPermanent ? "permanent" : formatMilliseconds(durationMs); // formatMilliseconds is from util, assume it's safe or handle there
		const muteInfo = {
			admin: adminName,
			duration: endTime,
			isPermanent: isPermanent,
			reason: reason
		}
		this.setDynamicProperty("ac:muteInfo", JSON.stringify(muteInfo));
		this.isMuted = true;

		// Notify player and admins
		if (adminPlayer instanceof Player) { // Check if adminPlayer is a Player object
			adminPlayer.sendMessage(i18n.getText("player.mute.successAdmin", { playerName: this.name, duration: muteTimeDisplay }));
		} else if (typeof adminPlayer === 'string') {
			// If adminPlayer is a string (name), try to find the player and send message
			const actualAdminPlayer = getPlayerByName(adminPlayer); // Use getPlayerByName
            if (actualAdminPlayer) { // Check if player was found
                actualAdminPlayer.sendMessage(i18n.getText("player.mute.successAdmin", { playerName: this.name, duration: muteTimeDisplay }));
            }
		}
		sendMessageToAllAdmins("player.notify.admin.muteSuccess", { playerName: this.name, duration: muteTimeDisplay, adminName: adminName, reason: reason }, true); // sendMessageToAllAdmins from util
		logDebug(`MUTED NAME="${this.name}"; REASON="${reason}"; DURATION=${muteTimeDisplay}`);
	} catch (e) {
		logDebug(i18n.getText("player.error.mute.failed", { playerName: this.name }), e, e.stack);
		if (adminPlayer instanceof Player) {
			adminPlayer.sendMessage(i18n.getText("player.notify.admin.muteFailed", { playerName: this.name }));
		}
	}
}

/**
 * Unmutes the player.
 * Resets the "ac:muteInfo" dynamic property to its default (unmuted) state and sets `player.isMuted` to false.
 * @memberof Player.prototype
 * @returns {void}
 * @throws {Error} If the player is not currently muted.
 * @example
 * if (player.isMuted) {
 *   player.unmute();
 *   player.sendMessage("You have been unmuted.");
 * }
 */
Player.prototype.unmute = function(){
	try {
		if(!this.isMuted) throw Error(i18n.getText("player.error.unmute.notMuted", { playerName: this.name }));

		const muteInfo_string = JSON.stringify({
			admin: "",
			duration: -1,
			isPermanent: false,
			reason: ""
		});;
		this.setDynamicProperty("ac:muteInfo", muteInfo_string);
		this.isMuted = false;

		logDebug(muteInfo_string);
	} catch (e) {
		logDebug(i18n.getText("player.error.unmute.failed", { playerName: this.name }), e, e.stack);
	}
}

/**
 * Checks if the current player is the designated owner of the world.
 * The owner's name is stored in the "ac:ownerPlayerName" world dynamic property.
 * This method compares the player's name (`this.name`) against the stored owner name.
 * If "ac:ownerPlayerName" is not set or is an empty string, it returns false.
 * The actual designation of the owner is handled during the addon's initialization.
 * @memberof Player.prototype
 * @returns {boolean} True if the player is the designated owner of the world, false otherwise.
 * @example
 * if (player.isOwner()) {
 *   player.sendMessage("You have owner privileges.");
 * }
 */
Player.prototype.isOwner = function(){
	// Retrieve the owner's name from a world dynamic property.
	const ownerPlayerName = world.getDynamicProperty("ac:ownerPlayerName");

	// If the dynamic property is not set or is empty, no one is the owner yet.
	if (typeof ownerPlayerName !== 'string' || ownerPlayerName.trim() === '') {
		return false;
	}

	// Compare the current player's name with the stored owner's name.
	const isPlayerOwner = this.name === ownerPlayerName;
	return isPlayerOwner;
	// Note: The "ac:ownerPlayerName" dynamic property, which this method checks, is set during initialization 
	// (by reading from config's 'ownerPlayerNameManual' or an existing dynamic property) 
	// or via the '!owner' command.
	// NOTE: owner should have more powers than admins, for example editing config and denying admins permissions.
	// CHALLENGE: determining which player to give owner to on initialize - Addressed by first-joiner in initialize.js.
	//
	// POSSIBLE SOLUTION (Old, superseded by current design):
	// first player to use owner password, the owner password could be either set inside config.js (where only owner can access)
	// another way could be to randomly generate a password on initialize, and display it to the first player to run setup
	// problem, if owner doesn't setup correctly, another admin can get owner status with no way to get it back
};

/**
 * Checks if the player has administrative privileges.
 * This is determined by checking if the player has the "admin" tag or if they are the world owner (via `isOwner()`).
 * @memberof Player.prototype
 * @returns {boolean} True if the player has admin privileges, false otherwise.
 * @example
 * if (player.hasAdmin()) {
 *   // Allow admin-only commands
 * }
 */
Player.prototype.hasAdmin = function() {
	// this is in case I ever change the admin tag or if the user wants to change it
	return this.hasTag("admin") || this.isOwner();
};