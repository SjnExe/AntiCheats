import * as Minecraft from '@minecraft/server';
import { getPlayerByName, sendMessageToAllAdmins } from './assets/util.js';
import { logDebug } from './assets/logger.js';
import CONFIG from './config.js';

const world = Minecraft.world;

/**
 * Gets a display name for the command executor.
 * If the origin is a Player, it returns the player's name.
 * Otherwise, it returns "Server" (e.g., for commands run from the console or command blocks).
 *
 * @param {Minecraft.Player | object} origin - The command's execution origin (e.g., a Player object or server context).
 * @returns {string} The name of the command executor.
 */
function getCommandExecutorName(origin) {
    if (origin instanceof Minecraft.Player) {
        return origin.name;
    }
    return "Server"; // Or any placeholder for console/command blocks
}

const commandDefinitions = [
    {
        name: "ac:offlineunban",
        baseName: "offlineunban",
        description: "Removes a player from the global ban list (offline).",
        permissionLevel: Minecraft.CommandPermissionLevel.Admin,
        mandatoryParameters: [{
            name: "playerName",
            type: Minecraft.CustomCommandParamType.String,
            description: "The exact name of the player to remove from the offline ban list."
        }],
        optionalParameters: [],
        /**
         * Callback function for the "/ac:offlineunban" slash command (first definition).
         * Removes a player from the global ban list.
         *
         * @param {Minecraft.Player | object} origin - The entity or context that executed the command.
         * @param {object} args - Parsed command arguments. Expects `args.playerName`.
         * @returns {void}
         */
        callback: (origin, args) => {
            const targetName = args.playerName;
            const gbanListString = world.getDynamicProperty("ac:gbanList");
            let gbanList = [];
            if (typeof gbanListString === 'string') {
                try {
                    gbanList = JSON.parse(gbanListString);
                    if (!Array.isArray(gbanList)) gbanList = [];
                } catch (e) {
                    logDebug("Failed to parse dynamic global ban list for /ac:offlineunban:", e);
                    gbanList = [];
                }
            }
            const playerIndex = gbanList.findIndex(entry => 
                (typeof entry === 'string' && entry === targetName) || 
                (typeof entry === 'object' && entry.name === targetName)
            );
            if (playerIndex === -1) {
                const message = `§cPlayer ${targetName} is not on the offline ban list.`;
                if (origin instanceof Minecraft.Player) origin.sendMessage(message); else console.warn(message.replace(/§[0-9a-fk-or]/g, ''));
                return;
            }
            gbanList.splice(playerIndex, 1);
            world.setDynamicProperty("ac:gbanList", JSON.stringify(gbanList));
            const successMessage = `§aPlayer ${targetName} has been removed from the offline ban list.`;
            if (origin instanceof Minecraft.Player) origin.sendMessage(successMessage); else console.warn(successMessage.replace(/§[0-9a-fk-or]/g, ''));
            const adminName = getCommandExecutorName(origin);
            logDebug(`[OfflineUnban] ${adminName} removed ${targetName} from the offline ban list via slash command.`);
        }
    },
    {
        name: "ac:ban",
        baseName: "ban",
        description: "Permanently bans an online player, optionally specifying a reason.",
        permissionLevel: Minecraft.CommandPermissionLevel.Admin,
        mandatoryParameters: [{
            name: "targetPlayerName",
            type: Minecraft.CustomCommandParamType.Player, 
            description: "Name of the player to ban."
        }],
        optionalParameters: [{
            name: "reason",
            type: Minecraft.CustomCommandParamType.String,
            description: "Reason for the ban."
        }],
        /**
         * Callback function for the "/ac:ban" slash command.
         * Permanently bans an online player, with an optional reason.
         *
         * @param {Minecraft.Player | object} origin - The entity or context that executed the command.
         * @param {object} args - Parsed command arguments. Expects `args.targetPlayerName` (array of Player) and optionally `args.reason`.
         * @returns {void}
         */
        callback: (origin, args) => {
            const adminPlayer = (origin instanceof Minecraft.Player) ? origin : null;
            const targetPlayers = args.targetPlayerName;
            if (!targetPlayers || targetPlayers.length === 0) {
                if (adminPlayer) adminPlayer.sendMessage("§cTarget player not found or specified.");
                else console.warn("Target player not found or specified for /ac:ban.");
                return;
            }
            const targetPlayer = targetPlayers[0];
            let reason = args.reason ? args.reason.trim() : "No reason provided.";
            const adminName = getCommandExecutorName(origin);
            if (adminPlayer && targetPlayer.name === adminPlayer.name) {
                adminPlayer.sendMessage(`§6[§eAnti Cheats§6]§f Cannot execute this command on yourself!`);
                return;
            }
            if (adminPlayer) {
                adminPlayer.sendMessage(`§6[§eAnti Cheats§6]§f Successfully banned §e${targetPlayer.name}§f for: ${reason}`);
            } else { 
                console.warn(`[Anti Cheats] Successfully banned ${targetPlayer.name} for: ${reason} (executed by ${adminName})`);
            }
            sendMessageToAllAdmins("notify.slash.ban", { adminName: adminName, targetName: targetPlayer.name, reason: reason }, true);
            try {
                 world.getDimension(targetPlayer.dimension.id).runCommandAsync(`kick "${targetPlayer.name}" §r§6[§eAnti Cheats§6]§r §4You are permanently banned.\n§4Reason: §c${reason}\n§4Banned by: §c${adminName}`);
            } catch(err) {
                logDebug(`[Anti Cheats] Failed to kick ${targetPlayer.name} during ban: ${err}`);
            }
            targetPlayer.ban(reason, true, adminName); 
            logDebug(`[Anti Cheats] ${adminName} banned ${targetPlayer.name} via /ac:ban. Reason: ${reason}`);
        }
    },
    {
        name: "ac:version",
        baseName: "version",
        description: "Displays the current version of the Anti Cheats pack.",
        permissionLevel: Minecraft.CommandPermissionLevel.Any,
        mandatoryParameters: [],
        optionalParameters: [],
        /**
         * Callback function for the "/ac:version" slash command.
         * Displays the current version of the Anti Cheats pack.
         *
         * @param {Minecraft.Player | object} origin - The entity or context that executed the command.
         * @param {object} args - Parsed command arguments (empty for this command).
         * @returns {void}
         */
        callback: (origin, args) => {
            const versionMessage = `§r§6[§eAnti Cheats§6]§f Version: §ev${CONFIG.version}`;
            if (origin instanceof Minecraft.Player) {
                origin.sendMessage(versionMessage);
            } else {
                console.warn(versionMessage.replace(/§[0-9a-fk-or]/g, '')); 
            }
        }
    },
    {
        name: "ac:offlineban",
        baseName: "offlineban",
        description: "Adds a player to the global ban list (offline). They will be banned on next join.",
        permissionLevel: Minecraft.CommandPermissionLevel.Admin, 
        mandatoryParameters: [{
            name: "playerName",
            type: Minecraft.CustomCommandParamType.String, 
            description: "The exact name of the player to offline ban."
        }],
        optionalParameters: [{
            name: "reason",
            type: Minecraft.CustomCommandParamType.String,
            description: "Reason for the offline ban (stored with the ban)."
        }],
        /**
         * Callback function for the "/ac:offlineban" slash command (second definition, with reason).
         * Adds a player to the global ban list with a reason.
         *
         * @param {Minecraft.Player | object} origin - The entity or context that executed the command.
         * @param {object} args - Parsed command arguments. Expects `args.playerName` and optionally `args.reason`.
         * @returns {void}
         */
        callback: (origin, args) => {
            const targetName = args.playerName;
            const reason = args.reason || "No reason provided";
            const adminName = getCommandExecutorName(origin);
            const gbanListString = world.getDynamicProperty("ac:gbanList");
            let gbanList = [];
            if (typeof gbanListString === 'string') {
                try {
                    gbanList = JSON.parse(gbanListString);
                    if (!Array.isArray(gbanList)) gbanList = [];
                } catch (e) {
                    logDebug("Failed to parse dynamic global ban list for /ac:offlineban:", e);
                    gbanList = [];
                }
            }
            const isAlreadyBanned = gbanList.some(entry => 
                (typeof entry === 'string' && entry === targetName) || 
                (typeof entry === 'object' && entry.name === targetName)
            );
            if (isAlreadyBanned) {
                const message = `§cPlayer ${targetName} is already on the offline ban list.`;
                if (origin instanceof Minecraft.Player) origin.sendMessage(message); else console.warn(message.replace(/§[0-9a-fk-or]/g, ''));
                return;
            }
            gbanList.push({ name: targetName, reason: reason, bannedBy: adminName, date: Date.now() });
            world.setDynamicProperty("ac:gbanList", JSON.stringify(gbanList));
            const successMessage = `§aPlayer ${targetName} has been added to the offline ban list. Reason: ${reason}`;
            if (origin instanceof Minecraft.Player) origin.sendMessage(successMessage); else console.warn(successMessage.replace(/§[0-9a-fk-or]/g, ''));
            logDebug(`[OfflineBan] ${adminName} added ${targetName} to the offline ban list via slash command. Reason: ${reason}`);
        }
    },
    {
        name: "ac:setrank",
        baseName: "setrank",
        description: "<playerName> <rankId> - Sets a player's rank.",
        permissionLevel: Minecraft.CommandPermissionLevel.Admin,
        mandatoryParameters: [
            { name: "targetPlayerName", type: Minecraft.CustomCommandParamType.Player, description: "Player to set rank for." },
            { name: "rankId", type: Minecraft.CustomCommandParamType.String, description: "ID of the rank (e.g., owner, admin, member)." }
        ],
        optionalParameters: [],
        /**
         * Callback function for the "/ac:setrank" slash command.
         * Sets the rank of a target player.
         *
         * @param {Minecraft.Player | object} origin - The entity or context that executed the command.
         * @param {object} args - Parsed command arguments. Expects `args.targetPlayerName` (array of Player) and `args.rankId`.
         * @returns {void}
         */
        callback: (origin, args) => {
            const targetPlayers = args.targetPlayerName; 
            const rankIdInput = args.rankId.toLowerCase();
            const executorName = getCommandExecutorName(origin);

            if (!targetPlayers || targetPlayers.length === 0) {
                const msg = "§cTarget player not found or specified for /ac:setrank.";
                if (origin instanceof Minecraft.Player) origin.sendMessage(msg);
                else console.warn(msg.replace(/§[0-9a-fk-or]/g, ''));
                return;
            }
            const targetPlayer = targetPlayers[0]; 

            const validRankIds = Object.keys(CONFIG.ranks);
            if (!validRankIds.includes(rankIdInput)) {
                const msg = `§cInvalid rankId "${rankIdInput}". Valid ranks are: ${validRankIds.join(", ")}.`;
                if (origin instanceof Minecraft.Player) origin.sendMessage(msg);
                else console.warn(msg.replace(/§[0-9a-fk-or]/g, ''));
                return;
            }

            targetPlayer.setDynamicProperty("ac:rankId", rankIdInput);
            const rankName = CONFIG.ranks[rankIdInput]?.name || rankIdInput;

            const successMsgToOrigin = `§aSuccessfully set ${targetPlayer.name}'s rank to ${rankName}.`;
            if (origin instanceof Minecraft.Player) origin.sendMessage(successMsgToOrigin);
            else console.warn(successMsgToOrigin.replace(/§[0-9a-fk-or]/g, ''));
            
            targetPlayer.sendMessage(`§aYour rank has been set to ${rankName} by ${executorName}.`);
            logDebug(`[SetRank] ${executorName} set ${targetPlayer.name}'s rank to ${rankIdInput} (${rankName}) via /ac:setrank.`);
        }
    },
    {
        name: "ac:clearbanlogs",
        baseName: "clearbanlogs",
        description: "Clears all ban logs stored by Anti Cheats.",
        permissionLevel: Minecraft.CommandPermissionLevel.Admin,
        mandatoryParameters: [],
        optionalParameters: [],
        /**
         * Callback function for the "/ac:clearbanlogs" slash command.
         * Clears all stored ban logs.
         *
         * @param {Minecraft.Player | object} origin - The entity or context that executed the command.
         * @param {object} args - Parsed command arguments (empty for this command).
         * @returns {void}
         */
        callback: (origin, args) => {
            world.setDynamicProperty("ac:banLogs", undefined);
            
            const feedbackMessage = "§6[§eAnti Cheats§6]§f The ban logs were successfully cleared";
            if (origin instanceof Minecraft.Player) {
                origin.sendMessage(feedbackMessage);
            } else {
                console.warn(feedbackMessage.replace(/§[0-9a-fk-or]/g, ''));
            }
            const executorName = getCommandExecutorName(origin);
            logDebug(`[ClearBanLogs] ${executorName} cleared all ban logs via /ac:clearbanlogs.`);
        }
    },
    {
        name: "ac:clearchat",
        baseName: "clearchat",
        description: "Clears the chat for all players.",
        permissionLevel: Minecraft.CommandPermissionLevel.Admin,
        mandatoryParameters: [],
        optionalParameters: [],
        /**
         * Callback function for the "/ac:clearchat" slash command.
         * Clears the chat for all players by running a Minecraft function.
         *
         * @param {Minecraft.Player | object} origin - The entity or context that executed the command.
         * @param {object} args - Parsed command arguments (empty for this command).
         * @returns {void}
         */
        callback: (origin, args) => {
            const executorName = getCommandExecutorName(origin);
            try {
                if (origin instanceof Minecraft.Player) {
                    origin.runCommandAsync("function admin_cmds/clearchat");
                } else {
                    world.getDimension("overworld").runCommandAsync("function admin_cmds/clearchat");
                }
                logDebug(`[ClearChat] ${executorName} cleared the chat via /ac:clearchat.`);
            } catch (runCmdError) {
                logDebug(`[ClearChat] Failed to execute clear chat function for ${executorName}: ${runCmdError}`);
                if (origin instanceof Minecraft.Player) {
                    origin.sendMessage("§cError trying to clear chat.");
                } else {
                    console.warn("Error trying to clear chat via server console.");
                }
            }
        }
    },
    {
        name: "ac:clearwarn",
        baseName: "clearwarn",
        description: "Clears a player's warnings.",
        permissionLevel: Minecraft.CommandPermissionLevel.Admin,
        mandatoryParameters: [
            { name: "targetPlayerName", type: Minecraft.CustomCommandParamType.Player, description: "Player whose warnings to clear." }
        ],
        optionalParameters: [],
        /**
         * Callback function for the "/ac:clearwarn" slash command.
         * Clears all warnings for a specified player.
         *
         * @param {Minecraft.Player | object} origin - The entity or context that executed the command.
         * @param {object} args - Parsed command arguments. Expects `args.targetPlayerName` (array of Player).
         * @returns {void}
         */
        callback: (origin, args) => {
            const adminPlayer = (origin instanceof Minecraft.Player) ? origin : null;
            const targetPlayers = args.targetPlayerName; 

            if (!targetPlayers || targetPlayers.length === 0) {
                const msg = "§cTarget player not found or specified for /ac:clearwarn.";
                if (adminPlayer) adminPlayer.sendMessage(msg);
                else console.warn(msg.replace(/§[0-9a-fk-or]/g, ''));
                return;
            }
            const targetPlayer = targetPlayers[0]; 

            if (typeof targetPlayer.hasAdmin === 'function' && targetPlayer.hasAdmin()) {
                 const msg = "§cCan't clear warnings of an admin.";
                 if (adminPlayer) adminPlayer.sendMessage(msg);
                 else console.warn(msg.replace(/§[0-9a-fk-or]/g, ''));
                 return;
            }

            if (typeof targetPlayer.clearWarnings === 'function') {
                targetPlayer.clearWarnings();
            } else {
                logDebug(`[ClearWarn] targetPlayer.clearWarnings is not a function for ${targetPlayer.name}. Attempting to set dynamic property ac:warnings to undefined.`);
                targetPlayer.setDynamicProperty("ac:warnings", undefined); 
            }
            
            const executorName = getCommandExecutorName(origin);
            const successMsgToAdmins = `§6[§eAnti Cheats Notify§6]§e ${executorName} §fcleared the warnings of the player§e ${targetPlayer.name}! §r`;
            sendMessageToAllAdmins(successMsgToAdmins, true, adminPlayer);

            const successMsgToOrigin = `§6[§eAnti Cheats§6]§f Successfully cleared warnings for ${targetPlayer.name}`;
            if (adminPlayer) {
                adminPlayer.sendMessage(successMsgToOrigin);
            } else {
                console.warn(successMsgToOrigin.replace(/§[0-9a-fk-or]/g, '') + ` (executed by ${executorName})`);
            }
            logDebug(`[ClearWarn] ${executorName} cleared warnings for ${targetPlayer.name} via /ac:clearwarn.`);
        }
    }
];

if (Minecraft.world.commands) {
    commandDefinitions.forEach(commandDef => {
        // Register the main command
        try {
            Minecraft.world.commands.registerCommand({
                name: commandDef.name,
                description: commandDef.description,
                permissionLevel: commandDef.permissionLevel,
                mandatoryParameters: commandDef.mandatoryParameters,
                optionalParameters: commandDef.optionalParameters
            }, commandDef.callback);
            logDebug(`[Anti Cheats] Registered /${commandDef.name} command`);
        } catch (e) {
            logDebug(`[Anti Cheats] Failed to register /${commandDef.name} command: ${e}`);
        }

        // Register Aliases for this command
        if (CONFIG.aliases) {
            for (const aliasKey in CONFIG.aliases) {
                if (CONFIG.aliases[aliasKey] === commandDef.baseName) {
                    const aliasFullName = "ac:" + aliasKey;
                    // Check if the alias is already defined as a main command to prevent conflicts
                    if (commandDefinitions.some(def => def.name === aliasFullName)) {
                        logDebug(`[Anti Cheats] Alias ${aliasFullName} for ${commandDef.name} conflicts with a defined main command. Skipping alias registration.`);
                        continue;
                    }
                    const aliasDescription = `Alias for /${commandDef.name}. ${commandDef.description}`;
                    try {
                        Minecraft.world.commands.registerCommand({
                            name: aliasFullName,
                            description: aliasDescription.substring(0, 100), // Ensure description length limit
                            permissionLevel: commandDef.permissionLevel,
                            mandatoryParameters: commandDef.mandatoryParameters,
                            optionalParameters: commandDef.optionalParameters
                        }, commandDef.callback);
                        logDebug(`[Anti Cheats] Registered alias ${aliasFullName} for /${commandDef.name}`);
                    } catch (e) {
                        logDebug(`[Anti Cheats] Failed to register alias ${aliasFullName} for /${commandDef.name}: ${e}`);
                    }
                }
            }
        }
    });
} else {
    logDebug("[Anti Cheats] CustomCommandRegistry not available, skipping all slash command registrations.");
}
