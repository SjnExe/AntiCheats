import { formatMilliseconds, getPlayerByName, sendMessageToAllAdmins } from '../../assets/util.js';
import { logDebug } from '../../assets/logger.js';
import { newCommand } from '../handle.js';
import CONFIG from "../../config.js";
import { i18n } from '../../assets/i18n.js';
import { world } from '@minecraft/server';

newCommand({
	name: "mute",
	description: "<player> [time S | M | H | D] [reason] Mute a player for a specific duration",
	adminOnly: true,
	/**
	 * Executes the mute command.
	 * Mutes a specified player for a given duration (e.g., "10S" for 10 seconds, "5M" for 5 minutes, "1H" for 1 hour, "2D" for 2 days)
	 * or permanently if no duration is provided or "permanent" is specified. An optional reason can also be included.
	 * Handles player names that might be enclosed in quotes.
	 *
	 * @param {object} data - The data object provided by the command handler.
	 * @param {Minecraft.Player} data.player - The player who executed the command.
	 * @param {string[]} data.args - The command arguments.
	 *                               - `args[1]` can be the start of a quoted player name or an unquoted player name.
	 *                               - Subsequent arguments are parsed for duration and reason.
	 * @returns {void} Sends messages to the command executor and attempts to mute the target player.
	 *                 Notifies all admins if the mute is successful.
	 */
	run: (data) => {
		try {
			const { args, player } = data;

			if (args.length < 2) {
				player.sendMessage(i18n.getText("command.mute.usage", {}, player));
				return;
			}
			// Parse the player name with possible quotes
			let playerName, duration, reason;

			if (args[1].startsWith('"') || args[1].startsWith('@"')) {
				let closingQuoteIndex = -1;
				for (let i = 1; i < args.length; i++) {
					if (args[i].endsWith('"')) {
						closingQuoteIndex = i;
						break;
					}
				}
				if (closingQuoteIndex === -1) {
					player.sendMessage(i18n.getText("command.mute.error.missingQuote", {}, player));
					return;
				}
				playerName = args.slice(1, closingQuoteIndex + 1).join(" ").replace(/["@]/g, "");
				duration = args[closingQuoteIndex + 1] ?? "permanent";
				reason = args.slice(closingQuoteIndex + 2).join(" ") || "No reason provided";
			} else {
				playerName = args[1].replace(/["@]/g, "");
				duration = args[2] ?? "permanent";
				reason = args.slice(3).join(" ") || "No reason provided";
			}

			// Verify the player exists
			const muteTarget = getPlayerByName(playerName); // Already wrapped
			
			if (!muteTarget) {
				player.sendMessage(i18n.getText("command.mute.notFound", { playerName: playerName }, player));
				return;
			}
			// if (muteTarget.name === player.name) return player.sendMessage(`§6[§eSafeGuard§6]§f Cannot execute this command on yourself!`);

			// Parse and convert the time duration
			if (duration.toLowerCase() === "permanent" || duration.length < 1) {
				muteTarget.mute(player, reason, -1); // mute is wrapped
				return;
			}

			const timeRegex = /^(\d+)([SMHD])$/i;
			if(!timeRegex.test(duration)){
				player.sendMessage(i18n.getText("command.mute.error.invalidTimeFormat", {}, player));
				return;
			}

			const timeMatch = duration.match(timeRegex);
			
			const timeValue = parseInt(timeMatch[1]);
			const timeUnit = timeMatch[2].toUpperCase();
		
			// Convert to milliseconds
			let timeInMs;
			switch (timeUnit) {
				case "S":
					timeInMs = timeValue * 1000;
					break;
				case "M":
					timeInMs = timeValue * 1000 * 60;
					break;
				case "H":
					timeInMs = timeValue * 1000 * 60 * 60;
					break;
				case "D":
					timeInMs = timeValue * 1000 * 60 * 60 * 24;
					break;
				default: // Should not happen due to regex, but as a fallback
					player.sendMessage(i18n.getText("command.mute.error.invalidTimeUnit", {}, player));
					return;
			}

			// Execute the mute action
			muteTarget.mute(player,reason,timeInMs); // mute is wrapped
		} catch (e) {
			logDebug("[SafeGuard ERROR] Error in mute command:", e, e.stack);
            if (data && data.player) {
                try {
                    data.player.sendMessage(i18n.getText("command.mute.error", {}, data.player));
                } catch (sendError) {
                    logDebug("[SafeGuard ERROR] Failed to send error message to command executor in mute:", sendError, sendError.stack);
                }
            }
		}
	}
});
