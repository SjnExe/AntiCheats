// AntiCheatsBP/scripts/core/locales/en_US.js
export const translations = {
    // === General Messages (from config.js) ===
    "message.welcome": "Welcome, {playerName}, to our amazing server! We're glad to have you.",
    "message.deathCoords": "§7You died at X: {x}, Y: {y}, Z: {z} in dimension {dimensionId}.",
    "message.combatLogAdminNotify": "§c[CombatLog] §e{playerName}§c disconnected {timeSinceCombat}s after being in combat! Flags: +{incrementAmount}",

    // === Common ===
    "common.button.close": "Close",
    "common.button.back": "Back",
    "common.button.confirm": "Confirm",
    "common.button.cancel": "Cancel",
    "common.error.noPermissionCommand": "You do not have permission to use this command.",
    "common.error.invalidPlayer": "Player \"{targetName}\" not found.",
    "common.error.playerNotFoundOnline": "§cPlayer '{playerName}' not found or is not online.",
    "common.error.generic": "§cAn unexpected error occurred.",
    "common.error.genericForm": "An error occurred while displaying this form.",
    "common.error.commandModuleNotFound": "§cError: Command module '{moduleName}' not found or failed to load.",
    "common.error.nameEmpty": "§cName cannot be empty.",
    "common.status.enabled": "ENABLED",
    "common.status.disabled": "DISABLED",
    "common.status.locked": "§cLOCKED",
    "common.status.unlocked": "§aUNLOCKED",
    "common.boolean.yes": "Yes",
    "common.boolean.no": "No",
    "common.value.none": "None",
    "common.value.notApplicable": "N/A",
    "common.value.permanent": "Permanent",
    "common.value.unknown": "Unknown",
    "common.value.noReasonProvided": "No reason provided.",

    // === Command Specific Errors / Usage ===
    "command.error.specifyPlayer": "§cPlease specify a player name.",
    "command.error.gamemodeSettingFailed": "§cError setting game mode for {playerName}.",
    "command.error.invalidArgOnOffStatus": "§cInvalid argument. Use 'on', 'off', or 'status'.",
    "command.error.invalidArgOnOffStatusToggle": "§cInvalid argument. Use 'on', 'off', 'toggle', or 'status'.",

    // === TPA System (Commands) ===
    "command.tpa.systemDisabled": "§cThe TPA system is currently disabled.",
    "command.tpa.description": "Request to teleport to another player.",
    "command.tpa.usage": "§cUsage: {prefix}tpa <playerName>",
    "command.tpa.error.selfRequest": "§cYou cannot send a TPA request to yourself.",
    "command.tpa.error.targetDisabled": "§cPlayer \"{targetName}\" is not currently accepting TPA requests.",
    "command.tpa.error.existingRequest": "§cYou already have an active TPA request with \"{targetName}\".",
    "command.tpa.error.cooldown": "§cYou must wait {remaining} more seconds before sending another TPA request.",
    "command.tpa.requestSent": "§aTPA request sent to \"{targetName}\". They have {timeout} seconds to accept. Type {prefix}tpacancel to cancel.",
    "command.tpa.requestReceived": "§e{requesterName} has requested to teleport to you. Use {prefix}tpaccept {requesterName} or {prefix}tpacancel {requesterName}.",
    "command.tpa.failToSend": "§cCould not send TPA request. There might be an existing request or other issue.",

    "command.tpahere.description": "Request another player to teleport to your location.",
    "command.tpahere.usage": "§cUsage: {prefix}tpahere <playerName>",
    "command.tpahere.error.selfRequest": "§cYou cannot send a TPA Here request to yourself.",
    "command.tpahere.requestSent": "§aTPA Here request sent to \"{targetName}\". They have {timeout} seconds to accept. Type {prefix}tpacancel to cancel.",
    "command.tpahere.requestReceived": "§e{requesterName} has requested you to teleport to them. Use {prefix}tpaccept {requesterName} or {prefix}tpacancel {requesterName}.",
    "command.tpahere.failToSend": "§cCould not send TPA Here request. There might be an existing request or other issue.",

    "command.tpaccept.description": "Accepts an incoming TPA request.",
    "command.tpaccept.usage": "§cUsage: {prefix}tpaccept [playerName]",
    "command.tpaccept.error.noPending": "§cYou have no pending TPA requests.",
    "command.tpaccept.error.noRequestFrom": "§cNo pending TPA request found from \"{playerName}\".",
    "command.tpaccept.error.pendingFromList": "§7Pending requests are from: {playerList}",
    "command.tpaccept.error.couldNotFind": "§cCould not find a suitable TPA request to accept. Type {prefix}tpastatus to see your requests.",
    "command.tpaccept.success": "§aAccepted TPA request from \"{playerName}\". Teleport will occur in {warmupSeconds} seconds if the teleporting player avoids damage and stays online.",
    "command.tpaccept.fail": "§cCould not accept TPA request from \"{playerName}\". It might have expired or been cancelled.",
    "command.tpaccept.teleportWarmupCancelled": "§cTeleport cancelled for TPA request from {requesterName} to {targetName} because {reason}.",
    "command.tpaccept.teleportSuccess": "§aTeleport successful for TPA request from {requesterName} to {targetName}.",
    "command.tpaccept.teleportFail": "§cTeleport failed for TPA request from {requesterName} to {targetName}. Reason: {reason}.",
    "command.tpaccept.notifyRequester.accepted": "§a{targetName} accepted your TPA request. Teleporting in {warmupSeconds}s. Don't move or take damage!",
    "command.tpaccept.notifyRequester.teleporting": "§eTeleporting now...",
    "command.tpaccept.notifyRequester.cancelled": "§cYour TPA request to {targetName} was cancelled because {reason}.",
    "command.tpaccept.notifyRequester.failed": "§cYour TPA request to {targetName} failed. Reason: {reason}.",
    "command.tpaccept.warmup.dontMove": "§eTeleporting in {seconds}s... Don't move or take damage!",

    "command.tpacancel.description": "Cancels or declines a TPA request.",
    "command.tpacancel.usage": "§cUsage: {prefix}tpacancel [playerName]",
    "command.tpacancel.success.specific": "§aSuccessfully cancelled/declined TPA request involving \"{playerName}\".",
    "command.tpacancel.success.all": "§aCancelled/declined {count} TPA request(s).",
    "command.tpacancel.error.noRequests": "§cYou have no active TPA requests to cancel or decline.",
    "command.tpacancel.error.noSpecificRequest": "§cNo active or pending TPA request found with \"{playerName}\" that can be cancelled.",
    "command.tpacancel.error.noneCancellable": "§cNo active requests were found in a state that could be cancelled/declined.",
    "command.tpacancel.notifyOther.cancelled": "§eTPA request involving \"{otherPlayerName}\" was cancelled by {cancellingPlayerName}.",

    "command.tpastatus.description": "Manage or view your TPA request availability.",
    "command.tpastatus.usage": "§cUsage: {prefix}tpastatus [on|off|status]",
    "command.tpastatus.nowEnabled": "§aYou are now accepting TPA requests.",
    "command.tpastatus.nowDisabled": "§cYou are no longer accepting TPA requests.",
    "command.tpastatus.nowDisabledDeclined": "§e{count} pending incoming TPA request(s) were automatically declined.",
    "command.tpastatus.current.enabled": "§aYou are currently accepting TPA requests.",
    "command.tpastatus.current.disabled": "§cYou are currently not accepting TPA requests.",
    "command.tpastatus.error.invalidOption": "§cInvalid option. Usage: {prefix}tpastatus [on|off|status]",
    "command.tpastatus.notifyRequester.declined": "§e{targetPlayerName} is no longer accepting TPA requests; your request was automatically declined.",

    // === Help Command ===
    "help.specific.header": "§l§b--- Help: {prefix}{commandName} ---",
    "help.specific.syntax": "§eSyntax:§r {prefix}{commandName} {syntaxArgs}",
    "help.specific.description": "§bDescription:§r {description}",
    "help.specific.permission": "§7Permission: {permLevelName} (Level {permissionLevel})",
    "help.specific.notFoundOrNoPermission": "§cCommand \"{commandName}\" not found or you do not have permission to view its details. Type {prefix}help for a list of available commands.",
    "help.error.unknownCommand": "§cUnknown command: \"{commandName}\". Type {prefix}help for a list of available commands.",
    "help.list.header": "§l§bAvailable Commands (prefix: {prefix}):§r",
    "help.list.noCommandsAvailable": "§7No commands available to you at this time.",
    "help.list.category.general": "--- General Player Commands ---",
    "help.list.category.tpa": "--- TPA Commands ---",
    "help.list.category.moderation": "--- Moderation Commands ---",
    "help.list.category.administrative": "--- Administrative Commands ---",
    "help.list.category.owner": "--- Owner Commands ---",
    "help.descriptionOverride.panel": "Opens the Admin/User Interface Panel.",
    "help.descriptionOverride.ui": "Alias for !panel. Opens the Admin/User Interface Panel.",

    // === Rules Command ===
    "command.rules.description": "Displays the server rules.",
    "command.rules.ui.title": "Server Rules",
    "command.rules.noRulesConfigured": "No server rules are currently configured. Please check back later!",

    // === Version Command ===
    "command.version.description": "Displays addon version.",
    "command.version.message": "§7AntiCheat Addon Version: §e{version}",

    // === CopyInv Command ===
    "command.copyinv.description": "Copies another player's inventory to your own.",
    "command.copyinv.error.playerLookupUnavailable": "§cCommand error: Player lookup utility not available.",
    "command.copyinv.usage": "§cUsage: {prefix}copyinv <playername>",
    "command.copyinv.error.selfCopy": "§cYou cannot copy your own inventory.",
    "command.copyinv.error.inventoryAccess": "§cCould not access inventories.",
    "command.copyinv.confirm.title": "Confirm Inventory Copy",
    "command.copyinv.confirm.body": "Overwrite YOUR inventory with a copy of {targetPlayerName}'s inventory? THIS CANNOT BE UNDONE.",
    "command.copyinv.confirm.toggle": "Yes, I confirm.",
    "command.copyinv.cancelled": "§7Inventory copy cancelled.",
    "command.copyinv.success": "§aCopied {targetPlayerName}'s inventory ({itemCount} items/stacks). Your inventory overwritten.",
    "command.copyinv.log": "Copied {itemCount} items.",
    "command.copyinv.notifyAdmins": "{adminName} copied {targetPlayerName}'s inventory.",

    // === MyFlags Command ===
    "command.myflags.description": "Shows your own current flag status.",
    "command.myflags.header": "§7Your current flags: §eTotal={totalFlags}§7. Last type: §e{lastFlagType}§r",
    "command.myflags.flagEntry": " §7- {flagName}: §e{count} §7(Last: {lastDetectionTime})\n",
    "command.myflags.noFlags": "§7You have no active flags.",
    "command.myflags.noSpecificFlags": "§7Your current flags: §eTotal={totalFlags}§7. Last type: §e{lastFlagType}§r\n§7(No specific flag type details available with counts > 0).",
    "command.myflags.noData": "§7No flag data found for you, or you have no flags.",

    // === Inspect Command ===
    "command.inspect.description": "Inspects a player's AntiCheat data summary.",
    "command.inspect.usage": "§cUsage: {prefix}inspect <playername>",
    "command.inspect.error.notFoundOrNoData": "§cPlayer \"{playerName}\" not found or no AntiCheat data available.",
    "command.inspect.header": "§e--- AntiCheat Data for {playerName} ---",
    "command.inspect.playerId": "§fPlayer ID: §7{id}",
    "command.inspect.watchedStatus": "§fIs Watched: §7{status}",
    "command.inspect.totalFlags": "§fTotal Flags: §c{count}",
    "command.inspect.lastFlagType": "§fLast Flag Type: §7{type}",
    "command.inspect.flagsByTypeHeader": "§fFlags by type:",
    "command.inspect.flagEntry": "  §f- {flagKey}: §c{count} §7(Last: {timestamp})",
    "command.inspect.noSpecificFlags": "    §7No specific flag types recorded.",
    "command.inspect.mutedYes": "§fMuted: §cYes (Expires: {expiryDate}, Reason: {reason})",
    "command.inspect.mutedNo": "§fMuted: §aNo",
    "command.inspect.bannedYes": "§fBanned: §cYes (Expires: {expiryDate}, Reason: {reason})",
    "command.inspect.bannedNo": "§fBanned: §aNo",
    "command.inspect.noData": "§7No AntiCheat data found for this player (they might not have triggered any checks or joined recently).",

    // === TestNotify Command ===
    "command.testnotify.description": "Sends a test notification to all online admins.",
    "command.testnotify.success": "§aTest notification sent to online admins/owners.",
    "command.testnotify.adminNotification.message": "§6This is a test notification from {playerName} via the AntiCheat system.",
    "command.testnotify.error.unavailable": "§cError: Notification utility not available.",

    // === Check Violation Details ===
    "check.invalidSprint.condition.blindness": "Blindness",
    "check.invalidSprint.condition.sneaking": "Sneaking",
    "check.invalidSprint.condition.riding": "Riding Entity",
    "check.inventoryMod.details.switchAndUseSameTick": "Item used in the same tick as hotbar slot change",
    "check.inventoryMod.details.movedWhileLocked": "Inventory item moved/changed (slot {slotNum}) while {action}",
    "check.inventoryMod.action.usingConsumable": "using consumable",
    "check.inventoryMod.action.chargingBow": "charging bow",
    "check.flatRotation.reason.staticPitchYaw": "Static Pitch & Yaw",
    "check.flatRotation.reason.staticPitch": "Static Pitch",
    "check.flatRotation.reason.staticYaw": "Static Yaw",
    "check.flatRotation.reason.flatHorizontal": "Flat Horizontal Pitch Range",
    "check.flatRotation.reason.flatDownward": "Flat Downward Pitch Range",
    "check.nameSpoof.reason.lengthExceeded": "NameTag length limit exceeded ({currentLength}/{maxLength})",
    "check.nameSpoof.reason.disallowedChars": "NameTag contains disallowed character(s) (e.g., '{char}')",
    "check.nameSpoof.reason.rapidChange": "NameTag changed too rapidly (within {interval} ticks, min is {minInterval}t)",
    "check.pistonLag.details.activationRate": "Piston at {x},{y},{z} in {dimensionName} activated {rate} times/sec over {duration}s.",
    "check.clientInfo.renderDistance.details": "Reported: {reportedDistance}, Max: {maxAllowed}",
    "check.netherRoof.details.onRoof": "Player on Nether roof at Y: {detectedY} (Threshold: {threshold})",
    "check.noSlow.action.eatingDrinking": "Eating/Drinking",
    "check.noSlow.action.chargingBow": "Charging Bow",
    "check.noSlow.action.usingShield": "Using Shield",
    "check.noSlow.action.sneaking": "Sneaking",

    // === PlayerDataManager ===
    "playerData.ban.kickHeader": "§cYou are banned from this server.",
    "playerData.ban.kickBannedBy": "§fBanned by: §e{adminName}",
    "playerData.ban.kickReason": "§fReason: §e{reason}",
    "playerData.ban.kickExpires": "§fExpires: §e{expiryDate}",
    "playerData.ban.kickDiscord": "§fDiscord: §b{discordLink}",
    "playerData.mute.defaultReason": "Muted by system.",
    "playerData.ban.defaultReason": "Banned by system.",

    // === AutoModManager ===
    "automod.action.warnDefaultReason": "You have received an automated warning.",
    "automod.action.kickDefaultReason": "Kicked by AutoMod due to rule violation.",
    "automod.action.tempbanDefaultReason": "Temporarily banned by AutoMod for rule violations.",
    "automod.action.permbanDefaultReason": "Permanently banned by AutoMod for severe rule violations.",
    "automod.action.muteDefaultReason": "Muted by AutoMod.",
    "automod.action.freezeDefaultReason": "Player frozen by AutoMod due to rule violation.",
    "automod.kickMessage.tempban.header": "You are temporarily banned by AutoMod.",
    "automod.kickMessage.common.reason": "Reason: {reason}",
    "automod.kickMessage.common.duration": "Duration: {duration}",
    "automod.adminNotify.actionReport": "{basePrefix} Action: {actionType} on {playerName} for {checkType}. Reason: {reason}{details}",
    "automod.adminNotify.basePrefix": "§7[§cAutoMod§7]",
    "automod.adminNotify.details.duration": ". Duration: {duration}",
    "automod.adminNotify.details.item": ". Item: {item}",
    "automod.default.itemRemoved": "AutoMod removed {quantity}x {itemTypeId} from your inventory.",

    // === TpaManager (Internal System Messages, some might be shown to player if commands don't override) ===
    "tpa.manager.error.targetOfflineOnAccept": "§c{offlinePlayerName} is no longer online. TPA request cancelled.",
    "tpa.manager.warmupMessage": "§eTeleporting in {warmupSeconds} seconds. Do not move or take damage.",
    "tpa.manager.requester.accepted": "§aYour TPA request to \"{targetPlayerName}\" has been accepted. {warmupMessage}",
    "tpa.manager.target.acceptedByRequester": "§a\"{requesterPlayerName}\" accepted your TPA request. {warmupMessage}",
    "tpa.manager.target.acceptedFromRequester": "§aYou accepted the TPA request from \"{requesterPlayerName}\". They will teleport in {warmupSeconds}s.",
    "tpa.manager.requester.acceptedHere": "§a\"{targetPlayerName}\" accepted your TPA Here request. They will teleport in {warmupSeconds}s.",
    "tpa.manager.error.teleportTargetOffline": "§cTeleport cancelled: {offlinePlayerName} logged off.",
    "tpa.manager.teleport.successToTarget": "§aTeleported successfully to {targetPlayerName}.",
    "tpa.manager.teleport.successTargetNotified": "§a{requesterPlayerName} has teleported to you.",
    "tpa.manager.teleport.successToRequester": "§aTeleported successfully to {requesterPlayerName}.",
    "tpa.manager.teleport.successRequesterNotified": "§a{targetPlayerName} has teleported to you.",
    "tpa.manager.error.teleportGenericErrorToRequester": "§cAn error occurred during teleportation. Please try again.",
    "tpa.manager.error.teleportGenericErrorToTarget": "§cAn error occurred during a TPA teleportation involving {otherPlayerName}.",
    "tpa.manager.decline.requesterNotified": "§c\"{targetPlayerName}\" declined your TPA request.",
    "tpa.manager.decline.targetNotified": "§cYou declined the TPA request from \"{requesterPlayerName}\".",
    "tpa.manager.decline.otherCancelledRequester": "§cTPA request involving \"{targetPlayerName}\" was cancelled.",
    "tpa.manager.decline.otherCancelledTarget": "§cTPA request involving \"{requesterPlayerName}\" was cancelled.",
    "tpa.manager.expired.requesterNotified": "§cYour TPA request to \"{targetName}\" has expired.",
    "tpa.manager.expired.targetNotified": "§cThe TPA request from \"{requesterName}\" has expired.",

    // === Check Action Profile Messages ===
    "profile.example_fly_hover.flagReason": "System detected Fly (Hover).",
    "profile.example_fly_hover.notifyMessage": "§eAC: {playerName} flagged for Fly (Hover). Details: {detailsString}",
    "profile.example_speed_ground.flagReason": "System detected excessive ground speed.",
    "profile.example_speed_ground.notifyMessage": "§eAC: {playerName} flagged for Speed (Ground). Speed: {speedBps} BPS (Max: {maxAllowedBps})",
    "profile.example_reach_attack.flagReason": "System detected excessive reach during combat.",
    "profile.example_reach_attack.notifyMessage": "§eAC: {playerName} flagged for Reach. Distance: {actualDistance} (Max: {allowedDistance})",
    "profile.movement_nofall.flagReason": "System detected suspicious fall damage negation (NoFall).",
    "profile.movement_nofall.notifyMessage": "§eAC: {playerName} flagged for NoFall. Fall Distance: {fallDistance}m. Details: {detailsString}",
    "profile.world_nuker.flagReason": "System detected Nuker activity (rapid/wide-area block breaking).",
    "profile.world_nuker.notifyMessage": "§eAC: {playerName} flagged for Nuker. Blocks: {blocksBroken} in window. Details: {detailsString}",
    "profile.combat_cps_high.flagReason": "System detected abnormally high CPS (Clicks Per Second).",
    "profile.combat_cps_high.notifyMessage": "§eAC: {playerName} flagged for High CPS. Count: {cpsCount} in {windowSeconds}s. Max: {threshold}",
    "profile.combat_viewsnap_pitch.flagReason": "System detected suspicious pitch snap after attack.",
    "profile.combat_viewsnap_pitch.notifyMessage": "§eAC: {playerName} flagged for Pitch Snap. Change: {change}°, Limit: {limit}° ({postAttackTimeMs}ms after attack)",
    "profile.combat_viewsnap_yaw.flagReason": "System detected suspicious yaw snap after attack.",
    "profile.combat_viewsnap_yaw.notifyMessage": "§eAC: {playerName} flagged for Yaw Snap. Change: {change}°, Limit: {limit}° ({postAttackTimeMs}ms after attack)",
    "profile.combat_invalid_pitch.flagReason": "System detected invalid view pitch (e.g., looking straight up/down).",
    "profile.combat_invalid_pitch.notifyMessage": "§eAC: {playerName} flagged for Invalid Pitch. Pitch: {pitch}° (Limits: {minLimit}° to {maxLimit}°)",
    "profile.combat_multitarget_aura.flagReason": "System detected Multi-Target Aura (hitting multiple entities rapidly).",
    "profile.combat_multitarget_aura.notifyMessage": "§eAC: {playerName} flagged for Multi-Target Aura. Targets: {targetsHit} in {windowSeconds}s (Threshold: {threshold})",
    "profile.combat_attack_while_sleeping.flagReason": "System detected player attacking while sleeping.",
    "profile.combat_attack_while_sleeping.notifyMessage": "§eAC: {playerName} flagged for Attacking While Sleeping. Target: {targetEntity}",
    "profile.combat_attack_while_consuming.flagReason": "System detected player attacking while consuming an item.",
    "profile.combat_attack_while_consuming.notifyMessage": "§eAC: {playerName} flagged for Attacking While Consuming. State: {state}, Item Category: {itemUsed}",
    "profile.combat_attack_while_bow_charging.flagReason": "System detected player attacking while charging a bow.",
    "profile.combat_attack_while_bow_charging.notifyMessage": "§eAC: {playerName} flagged for Attacking While Charging Bow. State: {state}, Item Category: {itemUsed}",
    "profile.combat_attack_while_shielding.flagReason": "System detected player attacking while actively using a shield.",
    "profile.combat_attack_while_shielding.notifyMessage": "§eAC: {playerName} flagged for Attacking While Shielding. State: {state}, Item Category: {itemUsed}",
    "profile.world_illegal_item_use.flagReason": "System detected use of a banned item: {itemTypeId}.",
    "profile.world_illegal_item_use.notifyMessage": "§eAC: {playerName} flagged for Illegal Item Use. Item: {itemTypeId}. Details: {detailsString}",
    "profile.world_illegal_item_place.flagReason": "System detected placement of a banned item: {itemTypeId}.",
    "profile.world_illegal_item_place.notifyMessage": "§eAC: {playerName} flagged for Illegal Item Placement. Item: {itemTypeId} at {blockLocationX},{blockLocationY},{blockLocationZ}. Details: {detailsString}",
    "profile.world_tower_build.flagReason": "System detected suspicious tower-like building.",
    "profile.world_tower_build.notifyMessage": "§eAC: {playerName} flagged for Tower Building. Height: {height}, Look Pitch: {pitch}° (Threshold: {pitchThreshold}°)",
    "profile.world_flat_rotation_building.flagReason": "System detected unnatural (flat or static) head rotation while building.",
    "profile.world_flat_rotation_building.notifyMessage": "§eAC: {playerName} flagged for Flat/Static Rotation Building. Pitch Variance: {pitchVariance}, Yaw Variance: {yawVariance}, Details: {details}",
    "profile.world_downward_scaffold.flagReason": "System detected suspicious downward scaffolding while airborne.",
    "profile.world_downward_scaffold.notifyMessage": "§eAC: {playerName} flagged for Downward Scaffold. Blocks: {count}, Speed: {hSpeed}bps (MinSpeed: {minHSpeed}bps)",
    "profile.world_air_place.flagReason": "System detected block placed against air/liquid without solid support.",
    "profile.world_air_place.notifyMessage": "§eAC: {playerName} flagged for Air Placement. Block: {blockType} at {x},{y},{z} targeting air/liquid.",
    "profile.action_fast_use.flagReason": "System detected item being used too quickly: {itemType}.",
    "profile.action_fast_use.notifyMessage": "§eAC: {playerName} flagged for Fast Use. Item: {itemType}, Cooldown: {cooldown}ms, Actual: {actualTime}ms",
    "profile.world_fast_place.flagReason": "System detected blocks being placed too quickly.",
    "profile.world_fast_place.notifyMessage": "§eAC: {playerName} flagged for Fast Place. Blocks: {count} in {window}ms (Max: {maxBlocks})",
    "profile.movement_noslow.flagReason": "System detected movement faster than allowed for current action (e.g., eating, sneaking, using bow).",
    "profile.movement_noslow.notifyMessage": "§eAC: {playerName} flagged for NoSlow. Action: {action}, Speed: {speed}bps (Max: {maxSpeed}bps)",
    "profile.movement_invalid_sprint.flagReason": "System detected sprinting under invalid conditions (e.g., blind, sneaking, riding).",
    "profile.movement_invalid_sprint.notifyMessage": "§eAC: {playerName} flagged for Invalid Sprint. Condition: {condition}",
    "profile.world_autotool.flagReason": "System detected suspicious tool switching before/after breaking a block (AutoTool).",
    "profile.world_autotool.notifyMessage": "§eAC: {playerName} flagged for AutoTool. Block: {blockType}, ToolUsed: {toolType}, Switched: {switchPattern}",
    "profile.world_instabreak_unbreakable.flagReason": "Attempted to break an unbreakable block: {blockType}.",
    "profile.world_instabreak_unbreakable.notifyMessage": "§cAC: {playerName} flagged for InstaBreak (Unbreakable). Block: {blockType} at {x},{y},{z}. Event cancelled.",
    "profile.world_instabreak_speed.flagReason": "System detected block broken significantly faster than possible: {blockType}.",
    "profile.world_instabreak_speed.notifyMessage": "§eAC: {playerName} flagged for InstaBreak (Speed). Block: {blockType}. Expected: {expectedTicks}t, Actual: {actualTicks}t",
    "profile.player_namespoof.flagReason": "System detected an invalid or suspicious player nameTag ({reasonDetail}).",
    "profile.player_namespoof.notifyMessage": "§eAC: {playerName} flagged for NameSpoofing. Reason: {reasonDetail}. NameTag: '{nameTag}'",
    "profile.player_antigmc.flagReason": "System detected unauthorized Creative Mode.",
    "profile.player_antigmc.notifyMessage": "§cAC: {playerName} detected in unauthorized Creative Mode! Switched to {switchToMode}: {autoSwitched}",
    "profile.player_inventory_mod.flagReason": "System detected suspicious inventory/hotbar manipulation ({reasonDetail}).",
    "profile.player_inventory_mod.notifyMessage": "§eAC: {playerName} flagged for InventoryMod. Detail: {reasonDetail}. Item: {itemType}, Slot: {slot}",
    "profile.chat_spam_fast_message.flagReason": "Sent messages too quickly ({timeSinceLastMsgMs}ms apart)",
    "profile.chat_spam_fast_message.notifyMessage": "§c[AC] §e{playerName} §7is sending messages too quickly ({timeSinceLastMsgMs}ms). Flagged. (Msg: §f{messageContent}§7)",
    "profile.chat_spam_max_words.flagReason": "Message too long ({wordCount} words, max: {maxWords})",
    "profile.chat_spam_max_words.notifyMessage": "§c[AC] §e{playerName} §7sent message with too many words ({wordCount}/{maxWords}). Flagged. (Msg: §f{messageContent}§7)",
    "profile.world_antigrief_tnt_place.flagReason": "Player attempted to place TNT without authorization.",
    "profile.world_antigrief_tnt_place.notifyMessage": "§eAC [AntiGrief]: {playerName} attempted to place TNT at {x},{y},{z}. Action: {actionTaken}.",
    "profile.world_antigrief_wither_spawn.flagReason": "Player involved in unauthorized Wither spawn or Wither killed by AntiGrief.",
    "profile.world_antigrief_wither_spawn.notifyMessage": "§cAC [AntiGrief]: A Wither spawn event occurred. Context: {playerNameOrContext}. Action: {actionTaken}.",
    "profile.world_antigrief_fire.flagReason": "Player involved in unauthorized or excessive fire incident.",
    "profile.world_antigrief_fire.notifyMessage": "§eAC [AntiGrief]: Fire event involving {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}",
    "profile.world_antigrief_lava.flagReason": "Player involved in unauthorized lava placement.",
    "profile.world_antigrief_lava.notifyMessage": "§eAC [AntiGrief]: Lava placement event involving {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}",
    "profile.world_antigrief_water.flagReason": "Player involved in unauthorized water placement.",
    "profile.world_antigrief_water.notifyMessage": "§eAC [AntiGrief]: Water placement event involving {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}",
    "profile.world_antigrief_blockspam.flagReason": "Player suspected of block spamming.",
    "profile.world_antigrief_blockspam.notifyMessage": "§eAC [AntiGrief]: {playerName} suspected of Block Spam. Blocks: {count}/{maxBlocks} in {windowMs}ms. Type: {blockType}. Action: {actionTaken}.",
    "profile.world_antigrief_entityspam.flagReason": "Player suspected of entity spamming.",
    "profile.world_antigrief_entityspam.notifyMessage": "§eAC [AntiGrief]: {playerName} suspected of Entity Spam. Entity: {entityType}. Count: {count}/{maxSpawns} in {windowMs}ms. Action: {actionTaken}.",
    "profile.world_antigrief_blockspam_density.flagReason": "Player suspected of block spamming (high density).",
    "profile.world_antigrief_blockspam_density.notifyMessage": "§eAC [AntiGrief]: {playerName} suspected of Block Spam (Density). Density: {densityPercentage}% in {radius} radius. Block: {blockType}. Action: {actionTaken}.",
    "profile.world_antigrief_piston_lag.notifyMessage": "§eAC [AntiGrief]: Rapid piston activity detected at {x},{y},{z} in {dimensionId}. Rate: {rate}/sec over {duration}s. (Potential Lag)",
    "profile.player_invalid_render_distance.flagReason": "Client reported an excessive render distance: {reportedDistance} chunks (Max: {maxAllowed} chunks).",
    "profile.player_invalid_render_distance.notifyMessage": "§eAC: {playerName} reported render distance of {reportedDistance} chunks (Max: {maxAllowed}). Potential client modification.",
    "profile.player_chat_during_combat.flagReason": "Attempted to chat too soon after combat ({timeSinceCombat}s ago).",
    "profile.player_chat_during_combat.notifyMessage": "§eAC: {playerName} attempted to chat during combat cooldown ({timeSinceCombat}s ago). Message cancelled.",
    "profile.player_chat_during_item_use.flagReason": "Attempted to chat while actively using an item ({itemUseState}).",
    "profile.player_chat_during_item_use.notifyMessage": "§eAC: {playerName} attempted to chat while {itemUseState}. Message cancelled.",
    "profile.chat_swear_violation.flagReason": "Swear word detected in message: {detectedWord}",
    "profile.chat_swear_violation.notifyMessage": "§eAC: {playerName} flagged for Swear Word. Word: '{detectedWord}'. Message: §f{messageContent}",
    "profile.player_self_hurt.flagReason": "System detected suspicious self-inflicted damage.",
    "profile.player_self_hurt.notifyMessage": "§eAC: {playerName} flagged for Self-Hurt. Cause: {damageCause}, Attacker: {damagingEntityType}, Health: {playerHealth}",

    // === EventHandlers & Other Core UI related ===
    "admin.notify.newPlayerJoined": "§e[Admin] New player {playerName} has joined the server for the first time!",
    "dimensionLock.teleportMessage": "§cYou cannot enter {lockedDimensionName} as it is currently locked.",
    "chat.error.muted": "§cYou are currently muted and cannot send messages.",
    "chat.error.combatCooldown": "§cYou cannot chat for {seconds} seconds after combat.",
    "chat.error.itemUse": "§cYou cannot chat while {itemUseState}.",
    "command.panel.error.uiManagerUnavailable": "§cError: The UI Panel manager is currently unavailable.",

    // === System Info UI ===
    "ui.systemInfo.label.currentTick": "Current Server Tick:",
    "ui.systemInfo.label.worldTime": "World Time (ticks):",

    // === ClearChat Command ===
    "command.clearchat.description": "Clears the chat for all players.",
    "command.clearchat.success": "§aChat has been cleared.",
    "command.clearchat.notifyAdmins": "Chat was cleared by {playerName}.",

    // === Warnings Command ===
    "command.warnings.description": "Shows a detailed list of warnings/flags for a player.",
    "command.warnings.usage": "§cUsage: {prefix}warnings <playername>",
    "command.warnings.header": "§e--- Warnings for {playerName} ---",
    "command.warnings.individualFlagsHeader": "§eIndividual Flags:",
    "command.warnings.noData": "§cNo warning data found for {playerName}.",

    // === UI Player Actions ===
    "ui.playerActions.kick.cancelled": "Kick action cancelled.",
    "ui.playerActions.ban.cancelled": "Ban action cancelled.",
    "ui.playerActions.mute.cancelled": "Mute action cancelled."
}
};

export function setCurrentLanguage(langCode) {
    if (translations[langCode]) {
        currentLanguage = langCode;
        console.log(`[i18n] Runtime language set to: ${langCode}`);
    } else {
        console.warn(`[i18n] Attempted to set runtime language to '${langCode}', which is not loaded. Current language remains '${currentLanguage}'.`);
    }
}

setCurrentLanguage(runTimeConfig.defaultServerLanguage || DEFAULT_LANGUAGE);

export function getString(key, args) {
    let langToUse = currentLanguage;
    if (!translations[langToUse] || typeof translations[langToUse][key] !== 'string') {
        if (langToUse !== DEFAULT_LANGUAGE && translations[DEFAULT_LANGUAGE] && typeof translations[DEFAULT_LANGUAGE][key] === 'string') {
            langToUse = DEFAULT_LANGUAGE;
        } else {
            console.warn(`[i18n] String key "${key}" not found for language "${currentLanguage}" or fallback "${DEFAULT_LANGUAGE}". Returning key.`);
            return key;
        }
    }

    let str = translations[langToUse][key];

    if (args) {
        if (Array.isArray(args)) {
            for (let i = 0; i < args.length; i++) {
                const regex = new RegExp(`\\{\${i}\\}`, "g");
                str = str.replace(regex, String(args[i]));
            }
        } else if (typeof args === 'object' && args !== null) {
            for (const placeholderKey in args) {
                if (Object.prototype.hasOwnProperty.call(args, placeholderKey)) {
                    const regex = new RegExp(`\\{\${placeholderKey}\\}`, "g");
                    str = str.replace(regex, String(args[placeholderKey]));
                }
            }
        }
    }
    return str;
}

[end of AntiCheatsBP/scripts/core/i18n.js]
