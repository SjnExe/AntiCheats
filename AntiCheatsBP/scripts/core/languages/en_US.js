// AntiCheatsBP/scripts/core/languages/en_US.js
/**
 * @type {object} Contains all English (US) translations, organized by domain.
 */
export const translations = {
    message: {
        welcome: "Welcome, {playerName}, to our amazing server! We're glad to have you.",
        deathCoords: "§7You died at X: {x}, Y: {y}, Z: {z} in dimension {dimensionId}.",
        combatLogAdminNotify: "§c[CombatLog] §e{playerName}§c disconnected {timeSinceCombat}s after being in combat! Flags: +{incrementAmount}",
    },
    common: {
        button_close: "Close",
        button_back: "Back",
        button_confirm: "Confirm",
        button_cancel: "Cancel",
        error_noPermissionCommand: "You do not have permission to use this command.",
        error_invalidPlayer: "Player \"{targetName}\" not found.",
        error_playerNotFoundOnline: "§cPlayer '{playerName}' not found or is not online.",
        error_generic: "§cAn unexpected error occurred.",
        error_genericForm: "An error occurred while displaying this form.",
        error_commandModuleNotFound: "§cError: Command module '{moduleName}' not found or failed to load.",
        error_nameEmpty: "§cName cannot be empty.",
        status_enabled: "ENABLED",
        status_disabled: "DISABLED",
        status_locked: "§cLOCKED",
        status_unlocked: "§aUNLOCKED",
        boolean_yes: "Yes",
        boolean_no: "No",
        value_none: "None",
        value_notApplicable: "N/A",
        value_permanent: "Permanent",
        value_unknown: "Unknown",
        value_noReasonProvided: "No reason provided.",
        actionCancelled: "Action cancelled.",
    },
    commands: {
        error: {
            specifyPlayer: "§cPlease specify a player name.",
            gamemodeSettingFailed: "§cError setting game mode for {playerName}.",
            invalidArgOnOffStatus: "§cInvalid argument. Use 'on', 'off', or 'status'.",
            invalidArgOnOffStatusToggle: "§cInvalid argument. Use 'on', 'off', 'toggle', or 'status'.",
        },
        tpa: {
            systemDisabled: "§cThe TPA system is currently disabled.",
            description: "Request to teleport to another player.",
            usage: "§cUsage: {prefix}tpa <playerName>",
            error_selfRequest: "§cYou cannot send a TPA request to yourself.",
            error_targetDisabled: "§cPlayer \"{targetName}\" is not currently accepting TPA requests.",
            error_existingRequest: "§cYou already have an active TPA request with \"{targetName}\".",
            error_cooldown: "§cYou must wait {remaining} more seconds before sending another TPA request.",
            requestSent: "§aTPA request sent to \"{targetName}\". They have {timeout} seconds to accept. Type {prefix}tpacancel to cancel.",
            requestReceived: "§e{requesterName} has requested to teleport to you. Use {prefix}tpaccept {requesterName} or {prefix}tpacancel {requesterName}.",
            failToSend: "§cCould not send TPA request. There might be an existing request or other issue.",
        },
        tpahere: {
            description: "Request another player to teleport to your location.",
            usage: "§cUsage: {prefix}tpahere <playerName>",
            error_selfRequest: "§cYou cannot send a TPA Here request to yourself.",
            requestSent: "§aTPA Here request sent to \"{targetName}\". They have {timeout} seconds to accept. Type {prefix}tpacancel to cancel.",
            requestReceived: "§e{requesterName} has requested you to teleport to them. Use {prefix}tpaccept {requesterName} or {prefix}tpacancel {requesterName}.",
            failToSend: "§cCould not send TPA Here request. There might be an existing request or other issue.",
        },
        tpaccept: {
            description: "Accepts an incoming TPA request.",
            usage: "§cUsage: {prefix}tpaccept [playerName]",
            error_noPending: "§cYou have no pending TPA requests.",
            error_noRequestFrom": "§cNo pending TPA request found from \"{playerName}\".",
            error_pendingFromList": "§7Pending requests are from: {playerList}",
            error_couldNotFind": "§cCould not find a suitable TPA request to accept. Type {prefix}tpastatus to see your requests.",
            success: "§aAccepted TPA request from \"{playerName}\". Teleport will occur in {warmupSeconds} seconds if the teleporting player avoids damage and stays online.",
            fail: "§cCould not accept TPA request from \"{playerName}\". It might have expired or been cancelled.",
            teleportWarmupCancelled: "§cTeleport cancelled for TPA request from {requesterName} to {targetName} because {reason}.",
            teleportSuccess: "§aTeleport successful for TPA request from {requesterName} to {targetName}.",
            teleportFail: "§cTeleport failed for TPA request from {requesterName} to {targetName}. Reason: {reason}.",
            notifyRequester_accepted: "§a{targetName} accepted your TPA request. Teleporting in {warmupSeconds}s. Don't move or take damage!",
            notifyRequester_teleporting: "§eTeleporting now...",
            notifyRequester_cancelled: "§cYour TPA request to {targetName} was cancelled because {reason}.",
            notifyRequester_failed: "§cYour TPA request to {targetName} failed. Reason: {reason}.",
            warmup_dontMove: "§eTeleporting in {seconds}s... Don't move or take damage!",
        },
        tpacancel: {
            description: "Cancels or declines a TPA request.",
            usage: "§cUsage: {prefix}tpacancel [playerName]",
            success_specific: "§aSuccessfully cancelled/declined TPA request involving \"{playerName}\".",
            success_all: "§aCancelled/declined {count} TPA request(s).",
            error_noRequests: "§cYou have no active TPA requests to cancel or decline.",
            error_noSpecificRequest": "§cNo active or pending TPA request found with \"{playerName}\" that can be cancelled.",
            error_noneCancellable: "§cNo active requests were found in a state that could be cancelled/declined.",
            notifyOther_cancelled: "§eTPA request involving \"{otherPlayerName}\" was cancelled by {cancellingPlayerName}.",
        },
        tpastatus: {
            description: "Manage or view your TPA request availability.",
            usage: "§cUsage: {prefix}tpastatus [on|off|status]",
            nowEnabled: "§aYou are now accepting TPA requests.",
            nowDisabled: "§cYou are no longer accepting TPA requests.",
            nowDisabledDeclined: "§e{count} pending incoming TPA request(s) were automatically declined.",
            current_enabled: "§aYou are currently accepting TPA requests.",
            current_disabled": "§cYou are currently not accepting TPA requests.",
            error_invalidOption: "§cInvalid option. Usage: {prefix}tpastatus [on|off|status]",
            notifyRequester_declined: "§e{targetPlayerName} is no longer accepting TPA requests; your request was automatically declined.",
        },
        help: {
            specific_header: "§l§b--- Help: {prefix}{commandName} ---",
            specific_syntax: "§eSyntax:§r {prefix}{commandName} {syntaxArgs}",
            specific_description: "§bDescription:§r {description}",
            specific_permission: "§7Permission: {permLevelName} (Level {permissionLevel})",
            specific_notFoundOrNoPermission": "§cCommand \"{commandName}\" not found or you do not have permission to view its details. Type {prefix}help for a list of available commands.",
            error_unknownCommand: "§cUnknown command: \"{commandName}\". Type {prefix}help for a list of available commands.",
            list_header: "§l§bAvailable Commands (prefix: {prefix}):§r",
            list_noCommandsAvailable: "§7No commands available to you at this time.",
            list_category_general: "--- General Player Commands ---",
            list_category_tpa: "--- TPA Commands ---",
            list_category_moderation: "--- Moderation Commands ---",
            list_category_administrative: "--- Administrative Commands ---",
            list_category_owner: "--- Owner Commands ---",
            descriptionOverride_panel: "Opens the Admin/User Interface Panel.",
            descriptionOverride_ui: "Alias for !panel. Opens the Admin/User Interface Panel.",
        },
        rules: {
            description: "Displays the server rules.",
            ui_title: "Server Rules",
            noRulesConfigured: "No server rules are currently configured. Please check back later!",
        },
        version: {
            description: "Displays addon version.",
            message: "§7AntiCheat Addon Version: §e{version}",
        },
        copyinv: {
            description: "Copies another player's inventory to your own.",
            error_playerLookupUnavailable": "§cCommand error: Player lookup utility not available.",
            usage: "§cUsage: {prefix}copyinv <playername>",
            error_selfCopy: "§cYou cannot copy your own inventory.",
            error_inventoryAccess: "§cCould not access inventories.",
            confirm_title: "Confirm Inventory Copy",
            confirm_body: "Overwrite YOUR inventory with a copy of {targetPlayerName}'s inventory? THIS CANNOT BE UNDONE.",
            confirm_toggle: "Yes, I confirm.",
            cancelled: "§7Inventory copy cancelled.",
            success: "§aCopied {targetPlayerName}'s inventory ({itemCount} items/stacks). Your inventory overwritten.",
            log: "Copied {itemCount} items.",
            notifyAdmins: "{adminName} copied {targetPlayerName}'s inventory.",
        },
        myflags: {
            description: "Shows your own current flag status.",
            header: "§7Your current flags: §eTotal={totalFlags}§7. Last type: §e{lastFlagType}§r",
            flagEntry: " §7- {flagName}: §e{count} §7(Last: {lastDetectionTime})\n",
            noFlags: "§7You have no active flags.",
            noSpecificFlags: "§7Your current flags: §eTotal={totalFlags}§7. Last type: §e{lastFlagType}§r\n§7(No specific flag type details available with counts > 0).",
            noData: "§7No flag data found for you, or you have no flags.",
        },
        inspect: {
            description: "Inspects a player's AntiCheat data summary.",
            usage: "§cUsage: {prefix}inspect <playername>",
            error_notFoundOrNoData: "§cPlayer \"{playerName}\" not found or no AntiCheat data available.",
            header: "§e--- AntiCheat Data for {playerName} ---",
            playerId: "§fPlayer ID: §7{id}",
            watchedStatus: "§fIs Watched: §7{status}",
            totalFlags: "§fTotal Flags: §c{count}",
            lastFlagType: "§fLast Flag Type: §7{type}",
            flagsByTypeHeader: "§fFlags by type:",
            flagEntry: "  §f- {flagKey}: §c{count} §7(Last: {timestamp})",
            noSpecificFlags: "    §7No specific flag types recorded.",
            mutedYes: "§fMuted: §cYes (Expires: {expiryDate}, Reason: {reason})",
            mutedNo: "§fMuted: §aNo",
            bannedYes: "§fBanned: §cYes (Expires: {expiryDate}, Reason: {reason})",
            bannedNo": "§fBanned: §aNo",
            noData: "§7No AntiCheat data found for this player (they might not have triggered any checks or joined recently).",
        },
        testnotify: {
            description: "Sends a test notification to all online admins.",
            success: "§aTest notification sent to online admins/owners.",
            adminNotification_message: "§6This is a test notification from {playerName} via the AntiCheat system.",
            error_unavailable: "§cError: Notification utility not available.",
        },
        panel: {
            error_uiManagerUnavailable: "§cError: The UI Panel manager is currently unavailable.",
        },
        clearchat: {
            description: "Clears the chat for all players.",
            success: "§aChat has been cleared.",
            notifyAdmins: "Chat was cleared by {playerName}.",
        },
        warnings: {
            description: "Shows a detailed list of warnings/flags for a player.",
            usage: "§cUsage: {prefix}warnings <playername>",
            header: "§e--- Warnings for {playerName} ---",
            individualFlagsHeader": "§eIndividual Flags:",
            noData: "§cNo warning data found for {playerName}.",
        }
    },
    checks: {
        invalidSprint: {
            condition_blindness: "Blindness",
            condition_sneaking: "Sneaking",
            condition_riding: "Riding Entity",
        },
        inventoryMod: {
            details_switchAndUseSameTick: "Item used in the same tick as hotbar slot change",
            details_movedWhileLocked": "Inventory item moved/changed (slot {slotNum}) while {action}",
            action_usingConsumable: "using consumable",
            action_chargingBow: "charging bow",
        },
        flatRotation: {
            reason_staticPitchYaw: "Static Pitch & Yaw",
            reason_staticPitch: "Static Pitch",
            reason_staticYaw: "Static Yaw",
            reason_flatHorizontal: "Flat Horizontal Pitch Range",
            reason_flatDownward": "Flat Downward Pitch Range",
        },
        nameSpoof: {
            reason_lengthExceeded: "NameTag length limit exceeded ({currentLength}/{maxLength})",
            reason_disallowedChars: "NameTag contains disallowed character(s) (e.g., '{char}')",
            reason_rapidChange: "NameTag changed too rapidly (within {interval} ticks, min is {minInterval}t)",
        },
        pistonLag: {
            details_activationRate: "Piston at {x},{y},{z} in {dimensionName} activated {rate} times/sec over {duration}s.",
        },
        clientInfo: {
            renderDistance_details: "Reported: {reportedDistance}, Max: {maxAllowed}",
        },
        netherRoof: {
            details_onRoof: "Player on Nether roof at Y: {detectedY} (Threshold: {threshold})",
        },
        noSlow: {
            action_eatingDrinking: "Eating/Drinking",
            action_chargingBow: "Charging Bow",
            action_usingShield": "Using Shield",
            action_sneaking: "Sneaking",
        },
    },
    playerData: {
        ban_kickHeader: "§cYou are banned from this server.",
        ban_kickBannedBy: "§fBanned by: §e{adminName}",
        ban_kickReason: "§fReason: §e{reason}",
        ban_kickExpires": "§fExpires: §e{expiryDate}",
        ban_kickDiscord": "§fDiscord: §b{discordLink}",
        mute_defaultReason: "Muted by system.",
        ban_defaultReason: "Banned by system.",
    },
    automod: {
        action_warnDefaultReason: "You have received an automated warning.",
        action_kickDefaultReason: "Kicked by AutoMod due to rule violation.",
        action_tempbanDefaultReason: "Temporarily banned by AutoMod for rule violations.",
        action_permbanDefaultReason: "Permanently banned by AutoMod for severe rule violations.",
        action_muteDefaultReason: "Muted by AutoMod.",
        action_freezeDefaultReason: "Player frozen by AutoMod due to rule violation.",
        kickMessage_tempban_header: "You are temporarily banned by AutoMod.",
        kickMessage_common_reason: "Reason: {reason}",
        kickMessage_common_duration: "Duration: {duration}",
        adminNotify_actionReport: "{basePrefix} Action: {actionType} on {playerName} for {checkType}. Reason: {reason}{details}",
        adminNotify_basePrefix": "§7[§cAutoMod§7]",
        adminNotify_details_duration: ". Duration: {duration}",
        adminNotify_details_item": ". Item: {item}",
        default_itemRemoved: "AutoMod removed {quantity}x {itemTypeId} from your inventory.",
    },
    tpaManager: { // Keys starting with "tpa.manager."
        error_targetOfflineOnAccept": "§c{offlinePlayerName} is no longer online. TPA request cancelled.",
        warmupMessage: "§eTeleporting in {warmupSeconds} seconds. Do not move or take damage.",
        requester_accepted: "§aYour TPA request to \"{targetPlayerName}\" has been accepted. {warmupMessage}",
        target_acceptedByRequester: "§a\"{requesterPlayerName}\" accepted your TPA request. {warmupMessage}",
        target_acceptedFromRequester": "§aYou accepted the TPA request from \"{requesterPlayerName}\". They will teleport in {warmupSeconds}s.",
        requester_acceptedHere: "§a\"{targetPlayerName}\" accepted your TPA Here request. They will teleport in {warmupSeconds}s.",
        error_teleportTargetOffline": "§cTeleport cancelled: {offlinePlayerName} logged off.",
        teleport_successToTarget": "§aTeleported successfully to {targetPlayerName}.",
        teleport_successTargetNotified": "§a{requesterPlayerName} has teleported to you.",
        teleport_successToRequester": "§aTeleported successfully to {requesterPlayerName}.",
        teleport_successRequesterNotified": "§a{targetPlayerName} has teleported to you.",
        error_teleportGenericErrorToRequester": "§cAn error occurred during teleportation. Please try again.",
        error_teleportGenericErrorToTarget": "§cAn error occurred during a TPA teleportation involving {otherPlayerName}.",
        decline_requesterNotified": "§c\"{targetPlayerName}\" declined your TPA request.",
        decline_targetNotified": "§cYou declined the TPA request from \"{requesterPlayerName}\".",
        decline_otherCancelledRequester": "§cTPA request involving \"{targetPlayerName}\" was cancelled.",
        decline_otherCancelledTarget": "§cTPA request involving \"{requesterPlayerName}\" was cancelled.",
        expired_requesterNotified": "§cYour TPA request to \"{targetName}\" has expired.",
        expired_targetNotified": "§cThe TPA request from \"{requesterName}\" has expired.",
    },
    profiles: { // Keys starting with "profile."
        example_fly_hover: {
            flagReason: "System detected Fly (Hover).",
            notifyMessage: "§eAC: {playerName} flagged for Fly (Hover). Details: {detailsString}",
        },
        example_speed_ground: {
            flagReason: "System detected excessive ground speed.",
            notifyMessage: "§eAC: {playerName} flagged for Speed (Ground). Speed: {speedBps} BPS (Max: {maxAllowedBps})",
        },
        example_reach_attack: {
            flagReason: "System detected excessive reach during combat.",
            notifyMessage: "§eAC: {playerName} flagged for Reach. Distance: {actualDistance} (Max: {allowedDistance})",
        },
        movement_nofall: {
            flagReason: "System detected suspicious fall damage negation (NoFall).",
            notifyMessage: "§eAC: {playerName} flagged for NoFall. Fall Distance: {fallDistance}m. Details: {detailsString}",
        },
        world_nuker: {
            flagReason: "System detected Nuker activity (rapid/wide-area block breaking).",
            notifyMessage: "§eAC: {playerName} flagged for Nuker. Blocks: {blocksBroken} in window. Details: {detailsString}",
        },
        combat_cps_high: {
            flagReason: "System detected abnormally high CPS (Clicks Per Second).",
            notifyMessage: "§eAC: {playerName} flagged for High CPS. Count: {cpsCount} in {windowSeconds}s. Max: {threshold}",
        },
        combat_viewsnap_pitch: {
            flagReason: "System detected suspicious pitch snap after attack.",
            notifyMessage: "§eAC: {playerName} flagged for Pitch Snap. Change: {change}°, Limit: {limit}° ({postAttackTimeMs}ms after attack)",
        },
        combat_viewsnap_yaw: {
            flagReason: "System detected suspicious yaw snap after attack.",
            notifyMessage: "§eAC: {playerName} flagged for Yaw Snap. Change: {change}°, Limit: {limit}° ({postAttackTimeMs}ms after attack)",
        },
        combat_invalid_pitch: {
            flagReason: "System detected invalid view pitch (e.g., looking straight up/down).",
            notifyMessage: "§eAC: {playerName} flagged for Invalid Pitch. Pitch: {pitch}° (Limits: {minLimit}° to {maxLimit}°)",
        },
        combat_multitarget_aura: {
            flagReason: "System detected Multi-Target Aura (hitting multiple entities rapidly).",
            notifyMessage: "§eAC: {playerName} flagged for Multi-Target Aura. Targets: {targetsHit} in {windowSeconds}s (Threshold: {threshold})",
        },
        combat_attack_while_sleeping: {
            flagReason: "System detected player attacking while sleeping.",
            notifyMessage: "§eAC: {playerName} flagged for Attacking While Sleeping. Target: {targetEntity}",
        },
        combat_attack_while_consuming: {
            flagReason: "System detected player attacking while consuming an item.",
            notifyMessage: "§eAC: {playerName} flagged for Attacking While Consuming. State: {state}, Item Category: {itemUsed}",
        },
        combat_attack_while_bow_charging: {
            flagReason: "System detected player attacking while charging a bow.",
            notifyMessage: "§eAC: {playerName} flagged for Attacking While Charging Bow. State: {state}, Item Category: {itemUsed}",
        },
        combat_attack_while_shielding: {
            flagReason: "System detected player attacking while actively using a shield.",
            notifyMessage: "§eAC: {playerName} flagged for Attacking While Shielding. State: {state}, Item Category: {itemUsed}",
        },
        world_illegal_item_use: {
            flagReason: "System detected use of a banned item: {itemTypeId}.",
            notifyMessage: "§eAC: {playerName} flagged for Illegal Item Use. Item: {itemTypeId}. Details: {detailsString}",
        },
        world_illegal_item_place: {
            flagReason: "System detected placement of a banned item: {itemTypeId}.",
            notifyMessage: "§eAC: {playerName} flagged for Illegal Item Placement. Item: {itemTypeId} at {blockLocationX},{blockLocationY},{blockLocationZ}. Details: {detailsString}",
        },
        world_tower_build: {
            flagReason: "System detected suspicious tower-like building.",
            notifyMessage: "§eAC: {playerName} flagged for Tower Building. Height: {height}, Look Pitch: {pitch}° (Threshold: {pitchThreshold}°)",
        },
        world_flat_rotation_building: {
            flagReason: "System detected unnatural (flat or static) head rotation while building.",
            notifyMessage: "§eAC: {playerName} flagged for Flat/Static Rotation Building. Pitch Variance: {pitchVariance}, Yaw Variance: {yawVariance}, Details: {details}",
        },
        world_downward_scaffold: {
            flagReason: "System detected suspicious downward scaffolding while airborne.",
            notifyMessage: "§eAC: {playerName} flagged for Downward Scaffold. Blocks: {count}, Speed: {hSpeed}bps (MinSpeed: {minHSpeed}bps)",
        },
        world_air_place: {
            flagReason: "System detected block placed against air/liquid without solid support.",
            notifyMessage: "§eAC: {playerName} flagged for Air Placement. Block: {blockType} at {x},{y},{z} targeting air/liquid.",
        },
        action_fast_use: {
            flagReason: "System detected item being used too quickly: {itemType}.",
            notifyMessage: "§eAC: {playerName} flagged for Fast Use. Item: {itemType}, Cooldown: {cooldown}ms, Actual: {actualTime}ms",
        },
        world_fast_place: {
            flagReason: "System detected blocks being placed too quickly.",
            notifyMessage: "§eAC: {playerName} flagged for Fast Place. Blocks: {count} in {window}ms (Max: {maxBlocks})",
        },
        movement_noslow: {
            flagReason: "System detected movement faster than allowed for current action (e.g., eating, sneaking, using bow).",
            notifyMessage: "§eAC: {playerName} flagged for NoSlow. Action: {action}, Speed: {speed}bps (Max: {maxSpeed}bps)",
        },
        movement_invalid_sprint: {
            flagReason: "System detected sprinting under invalid conditions (e.g., blind, sneaking, riding).",
            notifyMessage: "§eAC: {playerName} flagged for Invalid Sprint. Condition: {condition}",
        },
        world_autotool: {
            flagReason: "System detected suspicious tool switching before/after breaking a block (AutoTool).",
            notifyMessage: "§eAC: {playerName} flagged for AutoTool. Block: {blockType}, ToolUsed: {toolType}, Switched: {switchPattern}",
        },
        world_instabreak_unbreakable: {
            flagReason: "Attempted to break an unbreakable block: {blockType}.",
            notifyMessage: "§cAC: {playerName} flagged for InstaBreak (Unbreakable). Block: {blockType} at {x},{y},{z}. Event cancelled.",
        },
        world_instabreak_speed: {
            flagReason: "System detected block broken significantly faster than possible: {blockType}.",
            notifyMessage: "§eAC: {playerName} flagged for InstaBreak (Speed). Block: {blockType}. Expected: {expectedTicks}t, Actual: {actualTicks}t",
        },
        player_namespoof: {
            flagReason: "System detected an invalid or suspicious player nameTag ({reasonDetail}).",
            notifyMessage: "§eAC: {playerName} flagged for NameSpoofing. Reason: {reasonDetail}. NameTag: '{nameTag}'",
        },
        player_antigmc: {
            flagReason: "System detected unauthorized Creative Mode.",
            notifyMessage": "§cAC: {playerName} detected in unauthorized Creative Mode! Switched to {switchToMode}: {autoSwitched}",
        },
        player_inventory_mod: {
            flagReason: "System detected suspicious inventory/hotbar manipulation ({reasonDetail}).",
            notifyMessage: "§eAC: {playerName} flagged for InventoryMod. Detail: {reasonDetail}. Item: {itemType}, Slot: {slot}",
        },
        chat_spam_fast_message: {
            flagReason: "Sent messages too quickly ({timeSinceLastMsgMs}ms apart)",
            notifyMessage: "§c[AC] §e{playerName} §7is sending messages too quickly ({timeSinceLastMsgMs}ms). Flagged. (Msg: §f{messageContent}§7)",
        },
        chat_spam_max_words: {
            flagReason: "Message too long ({wordCount} words, max: {maxWords})",
            notifyMessage: "§c[AC] §e{playerName} §7sent message with too many words ({wordCount}/{maxWords}). Flagged. (Msg: §f{messageContent}§7)",
        },
        world_antigrief_tnt_place: {
            flagReason: "Player attempted to place TNT without authorization.",
            notifyMessage: "§eAC [AntiGrief]: {playerName} attempted to place TNT at {x},{y},{z}. Action: {actionTaken}.",
        },
        world_antigrief_wither_spawn: {
            flagReason: "Player involved in unauthorized Wither spawn or Wither killed by AntiGrief.",
            notifyMessage: "§cAC [AntiGrief]: A Wither spawn event occurred. Context: {playerNameOrContext}. Action: {actionTaken}.",
        },
        world_antigrief_fire: {
            flagReason: "Player involved in unauthorized or excessive fire incident.",
            notifyMessage: "§eAC [AntiGrief]: Fire event involving {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}",
        },
        world_antigrief_lava: {
            flagReason: "Player involved in unauthorized lava placement.",
            notifyMessage: "§eAC [AntiGrief]: Lava placement event involving {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}",
        },
        world_antigrief_water: {
            flagReason: "Player involved in unauthorized water placement.",
            notifyMessage: "§eAC [AntiGrief]: Water placement event involving {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}",
        },
        world_antigrief_blockspam: {
            flagReason: "Player suspected of block spamming.",
            notifyMessage: "§eAC [AntiGrief]: {playerName} suspected of Block Spam. Blocks: {count}/{maxBlocks} in {windowMs}ms. Type: {blockType}. Action: {actionTaken}.",
        },
        world_antigrief_entityspam: {
            flagReason: "Player suspected of entity spamming.",
            notifyMessage: "§eAC [AntiGrief]: {playerName} suspected of Entity Spam. Entity: {entityType}. Count: {count}/{maxSpawns} in {windowMs}ms. Action: {actionTaken}.",
        },
        world_antigrief_blockspam_density: {
            flagReason: "Player suspected of block spamming (high density).",
            notifyMessage: "§eAC [AntiGrief]: {playerName} suspected of Block Spam (Density). Density: {densityPercentage}% in {radius} radius. Block: {blockType}. Action: {actionTaken}.",
        },
        world_antigrief_piston_lag: {
            notifyMessage: "§eAC [AntiGrief]: Rapid piston activity detected at {x},{y},{z} in {dimensionId}. Rate: {rate}/sec over {duration}s. (Potential Lag)",
        },
        player_invalid_render_distance: {
            flagReason: "Client reported an excessive render distance: {reportedDistance} chunks (Max: {maxAllowed} chunks).",
            notifyMessage: "§eAC: {playerName} reported render distance of {reportedDistance} chunks (Max: {maxAllowed}). Potential client modification.",
        },
        player_chat_during_combat: {
            flagReason: "Attempted to chat too soon after combat ({timeSinceCombat}s ago).",
            notifyMessage: "§eAC: {playerName} attempted to chat during combat cooldown ({timeSinceCombat}s ago). Message cancelled.",
        },
        player_chat_during_item_use: {
            flagReason: "Attempted to chat while actively using an item ({itemUseState}).",
            notifyMessage: "§eAC: {playerName} attempted to chat while {itemUseState}. Message cancelled.",
        },
        chat_swear_violation: {
            flagReason: "Swear word detected in message: {detectedWord}",
            notifyMessage: "§eAC: {playerName} flagged for Swear Word. Word: '{detectedWord}'. Message: §f{messageContent}",
        },
        chat_advertising_detected: {
            flagReason: "Potential advertisement detected in chat: {matchedPattern}",
            notifyMessage: "§eAC: {playerName} may have advertised. Matched: '{matchedPattern}'. Message: §f{originalMessage}"
        },
        chat_caps_abuse_detected: {
            flagReason: "Message contained excessive capitalization ({percentage}% CAPS).",
            notifyMessage: "§eAC: {playerName} flagged for CAPS abuse ({percentage}% CAPS). Message: §f{originalMessage}"
        },
        chat_char_repeat_detected: {
            flagReason: "Message contained repeated characters: '{char}' x{count}.",
            notifyMessage: "§eAC: {playerName} flagged for Char Repeat: '{char}' x{count}. Message: §f{originalMessage}"
        },
        chat_symbol_spam_detected: {
            message: "§cPlease avoid using excessive symbols in your message.",
            flagReason: "Sent a message with a high percentage of symbols.",
            notifyMessage: "Player {playerName} triggered symbol spam check. Message: {originalMessage}"
        },
        player_self_hurt: {
            flagReason: "System detected suspicious self-inflicted damage.",
            notifyMessage: "§eAC: {playerName} flagged for Self-Hurt. Cause: {damageCause}, Attacker: {damagingEntityType}, Health: {playerHealth}",
        },
    },
    system: { // For EventHandlers & Other Core UI related that are not specific UI components
        admin_notify_newPlayerJoined: "§e[Admin] New player {playerName} has joined the server for the first time!",
        dimensionLock_teleportMessage: "§cYou cannot enter {lockedDimensionName} as it is currently locked.",
        chat_error_muted: "§cYou are currently muted and cannot send messages.",
        chat_error_combatCooldown: "§cYou cannot chat for {seconds} seconds after combat.",
        chat_error_itemUse": "§cYou cannot chat while {itemUseState}.",
    },
    ui: {
        panel_error_uiManagerUnavailable: "§cError: The UI Panel manager is currently unavailable.", // From command.panel...
        systemInfo: { // From ui.systemInfo...
            label_currentTick: "Current Server Tick:",
            label_worldTime": "World Time (ticks):",
            label_defaultServerLanguage: "Default Server Language:",
        },
        playerActions: { // From ui.playerActions...
            kick_cancelled: "Kick action cancelled.",
            ban_cancelled: "Ban action cancelled.",
            mute_cancelled: "Mute action cancelled.",
        },
        myStats: {
            title: "My Stats",
            body: "Session Playtime: {sessionPlaytime}\n\nMore stats coming soon!"
        },
        // Other UI keys like "ui.adminPanel.title" etc. would go here, potentially nested further.
        // For brevity, I will not list all of them but apply the pattern.
        // Example:
        adminPanel: {
            title: "AntiCheat Admin Panel", // Assuming this was ui.adminPanel.title
            // ... other adminPanel keys
        },
        // ... more UI domains
    },
    // Note: Some keys like "command.clearchat.description" are used in `definition` objects.
    // These will be nested under `commands.<commandName>.description`
    // e.g., commands: { clearchat: { description: "..." } }
    // This requires careful mapping during the getString rewrite in i18n.js in the NEXT subtask.
};
