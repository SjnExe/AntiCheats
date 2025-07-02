/**
 * @file Defines a simple key-value store for UI and message strings.
 * Since full localization is not required, this provides a centralized
 * place for text, allowing for easier management and consistency.
 * All keys should be camelCase or dot.case for structure.
 */

export const stringDB = {
    // Common UI elements
    'common.button.back': '§l§cBack§r',
    'common.button.close': '§l§cClose§r',
    'common.button.confirm': '§l§aConfirm§r',
    'common.button.cancel': '§l§cCancel§r',
    'common.button.ok': '§l§aOK§r',
    'common.boolean.yes': '§aYes§r',
    'common.boolean.no': '§cNo§r',
    'common.value.notAvailable': 'N/A',
    'common.value.player': 'Player', // Generic placeholder for player name if actual name is unavailable
    'common.value.unknown': 'Unknown',
    'common.value.noReasonProvided': 'No reason provided.',
    'common.error.genericForm': '§cAn error occurred with the form.',
    'common.error.playerNotFound': '§cPlayer "{playerName}" not found.',
    'common.error.playerNotFoundOnline': '§cPlayer "{playerName}" is not online.',
    'common.error.nameEmpty': '§cName cannot be empty.',
    'common.error.reasonEmpty': '§cReason cannot be empty.',
    'common.error.durationInvalid': '§cInvalid duration format.',
    'common.error.commandModuleNotFound': '§cError: Command module "{moduleName}" not found or not enabled.',
    'common.error.permissionDenied': '§cYou do not have permission to use this command.',
    'common.error.chatProcessingUnavailable': '§cChat processing is currently unavailable. Please try again later or contact an admin.',
    'common.success.generic': '§aAction successful.',

    // Admin Panel
    'ui.adminPanel.title': '§l§bAntiCheat Admin Panel§r',
    'ui.adminPanel.body': 'Welcome, {playerName}! Select an action:',
    'ui.adminPanel.button.viewPlayers': '§lView Online Players§r',
    'ui.adminPanel.button.inspectPlayerText': '§lInspect Player (Text)§r',
    'ui.adminPanel.button.resetFlagsText': '§lReset Player Flags (Text)§r',
    'ui.adminPanel.button.listWatched': '§lList Watched Players§r',
    'ui.adminPanel.button.serverManagement': '§lServer Management§r',
    'ui.adminPanel.button.editConfig': '§l§6Edit Configuration§r (Owner)',
    'ui.adminPanel.error.generic': '§cError displaying admin panel.',

    // Normal User Panel
    'ui.normalPanel.title': '§l§aPlayer Panel§r',
    'ui.normalPanel.body': 'Welcome, {playerName}!',
    'ui.normalPanel.button.myStats': '§bMy Stats§r',
    'ui.normalPanel.button.serverRules': '§eServer Rules§r',
    'ui.normalPanel.button.helpLinks': '§9Helpful Links§r',

    // My Stats UI
    'ui.myStats.title': '§l§bYour Stats§r',
    'ui.myStats.body': 'Session Playtime: {playtime}',
    'ui.myStats.labelLocation': 'Location: X: {x}, Y: {y}, Z: {z}',
    'ui.myStats.labelDimension': 'Dimension: {dimensionName}',

    // Server Rules UI
    'ui.serverRules.title': '§l§eServer Rules§r',
    'ui.serverRules.noRulesDefined': 'No server rules have been defined by the admin yet.',

    // Helpful Links UI
    'ui.helpfulLinks.title': '§l§9Helpful Links§r',
    'ui.helpfulLinks.body': 'Select a link to view it in chat:',
    'ui.helpfulLinks.noLinks': 'No helpful links have been configured by the admin.',
    'ui.helpfulLinks.linkMessageFormat': '§e{title}: §9§n{url}§r (Copy and paste into your browser)',

    // Online Players List
    'ui.onlinePlayers.title': '§l§bOnline Players ({count})§r',
    'ui.onlinePlayers.body': 'Select a player to manage:',
    'ui.onlinePlayers.noPlayers': 'No players are currently online.',
    'ui.onlinePlayers.button.playerEntry': '{playerName} §7(Flags: {flagCount})§r',
    'ui.button.backToAdminPanel': '§l§cBack to Admin Panel§r',
    'ui.onlinePlayers.error.generic': '§cError displaying online players list.',

    // Inspect Player Form (Text Input)
    'ui.inspectPlayerForm.title': '§l§3Inspect Player§r',
    'ui.inspectPlayerForm.textField.label': 'Player Name:',
    'ui.inspectPlayerForm.textField.placeholder': 'Enter exact player name',

    // Player Actions Form
    'ui.playerActions.title': '§l§6Actions for {targetPlayerName}§r',
    'ui.playerActions.body': 'Flags: {flags} | Watched: {watchedStatus}',
    'ui.playerActions.button.viewFlags': '§bView Detailed Flags§r',
    'ui.playerActions.button.viewInventory': '§3View Inventory§r',
    'ui.playerActions.button.teleportTo': '§dTeleport To Player§r',
    'ui.playerActions.button.teleportHere': '§dTeleport Player Here§r',
    'ui.playerActions.button.kick': '§cKick Player§r',
    'ui.playerActions.button.freeze': '§bFreeze Player§r',
    'ui.playerActions.button.unfreeze': '§aUnfreeze Player§r',
    'ui.playerActions.button.mute': '§6Mute Player§r',
    'ui.playerActions.button.unmutePermanent': '§aUnmute (Permanent)§r',
    'ui.playerActions.button.unmuteTimed': '§aUnmute (Expires: {expiryDate})§r',
    'ui.playerActions.button.ban': '§4Ban Player§r',
    'ui.playerActions.button.resetFlags': '§eReset All Flags§r',
    'ui.playerActions.button.clearInventory': '§cClear Inventory§r',
    'ui.playerActions.button.backToList': '§l§cBack to Player List§r',
    'ui.playerActions.teleport.error': '§cTeleport failed: {error}',
    'ui.playerActions.teleportTo.success': '§aTeleported to {targetPlayerName}.',
    'ui.playerActions.teleportHere.success': '§aTeleported {targetPlayerName} to you.',
    'ui.playerActions.teleportHere.targetNotification': '§eYou have been teleported by an admin.',
    'ui.playerActions.kick.title': '§l§cKick {targetPlayerName}§r',
    'ui.playerActions.kick.reasonPrompt': 'Reason for kicking (optional):',
    'ui.playerActions.kick.reasonPlaceholder': 'Enter kick reason',
    'ui.playerActions.kick.cancelled': '§7Kick action cancelled.',
    'ui.playerActions.mute.title': '§l§6Mute {targetPlayerName}§r',
    'ui.playerActions.mute.durationPrompt': 'Mute duration (e.g., 30s, 5m, 1h, perm):',
    'ui.playerActions.mute.durationPlaceholder': 'Enter duration or "perm"',
    'ui.playerActions.mute.reasonPrompt': 'Reason for muting (optional):',
    'ui.playerActions.mute.reasonPlaceholder': 'Enter mute reason',
    'ui.playerActions.mute.cancelled': '§7Mute action cancelled.',
    'ui.playerActions.ban.title': '§l§4Ban {targetPlayerName}§r',
    'ui.playerActions.ban.durationPrompt': 'Ban duration (e.g., 7d, 1mo, perm):',
    'ui.playerActions.ban.durationPlaceholder': 'Enter duration or "perm"',
    'ui.playerActions.ban.reasonPrompt': 'Reason for banning:',
    'ui.playerActions.ban.reasonPlaceholder': 'Enter ban reason',
    'ui.playerActions.ban.cancelled': '§7Ban action cancelled.',
    'ui.playerActions.clearInventory.confirmTitle': '§l§cConfirm Clear Inventory§r',
    'ui.playerActions.clearInventory.confirmBody': 'Are you sure you want to clear the inventory of {targetPlayerName}? This cannot be undone.',
    'ui.playerActions.clearInventory.confirmToggle': '§cConfirm Clear Inventory',
    'ui.playerActions.clearInventory.success': '§aInventory of {targetPlayerName} cleared.',
    'ui.playerActions.clearInventory.fail': '§cFailed to clear inventory for {targetPlayerName}.',
    'ui.playerActions.error.invalidSelection': '§cInvalid selection.',
    'ui.playerActions.error.generic': '§cAn error occurred performing the player action.',

    // Detailed Flags Form
    'ui.detailedFlags.title': '§l§3Flags for {playerName}§r',
    'ui.detailedFlags.noFlags': 'No flags recorded for this player.',
    'ui.detailedFlags.flagEntry': '§e{flagName}: §f{count} §7(Last: {lastDetectionTime})§r',

    // Confirmation Modal (Generic)
    'ui.common.actionCancelled': '§7Action cancelled.',

    // Server Management
    'ui.serverManagement.title': '§l§6Server Management§r',
    'ui.serverManagement.body': 'Select a server management action:',
    'ui.serverManagement.button.systemInfo': '§bSystem Information§r',
    'ui.serverManagement.button.clearChat': '§eClear Global Chat§r',
    'ui.serverManagement.button.lagClear': '§cClear Ground Items/Entities§r',
    'ui.serverManagement.button.actionLogs': '§3View Action Logs (All)§r',
    'ui.serverManagement.button.modLogs': '§3View Moderation Logs (Filtered)§r',
    'ui.serverManagement.button.editConfig': '§l§6Edit Configuration§r (Owner)',
    'ui.serverManagement.button.backToAdminPanel': '§l§cBack to Admin Panel§r',
    'ui.serverManagement.clearChat.confirmTitle': '§l§cConfirm Clear Chat§r',
    'ui.serverManagement.clearChat.confirmBody': 'Are you sure you want to clear the global chat for all players?',
    'ui.serverManagement.clearChat.confirmToggle': '§cConfirm Clear Chat',
    'ui.serverManagement.lagClear.confirmTitle': '§l§cConfirm Lag Clear§r',
    'ui.serverManagement.lagClear.confirmBody': 'Are you sure you want to clear all ground items and non-player/non-persistent entities? This may cause lag temporarily.',
    'ui.serverManagement.lagClear.confirmToggle': '§cConfirm Lag Clear',
    'ui.serverManagement.error.generic': '§cError in server management action.',

    // System Info
    'ui.systemInfo.title': '§l§bSystem Information§r',
    'ui.systemInfo.entry.acVersion': '§aAntiCheat Version:§r §e{version}',
    'ui.systemInfo.entry.mcVersion': '§aMinecraft Version:§r §e{version}',
    'ui.systemInfo.entry.serverTime': '§aCurrent Server Time:§r §e{time}',
    'ui.systemInfo.label.currentTick': '§aCurrent Game Tick:',
    'ui.systemInfo.label.worldTime': '§aCurrent World Time:',
    'ui.systemInfo.entry.onlinePlayers': '§aOnline Players:§r §e{onlinePlayers} / {maxPlayers}',
    'ui.systemInfo.entry.totalPlayerData': '§aCached PlayerData Entries:§r §e{count}',
    'ui.systemInfo.entry.watchedPlayers': '§aWatched Players (Online):§r §e{count}',
    'ui.systemInfo.entry.mutedPersistent': '§aActive Mutes (Persistent):§r §e{count}',
    'ui.systemInfo.entry.bannedPersistent': '§aActive Bans (Persistent):§r §e{count}',
    'ui.systemInfo.entry.activeWorldBorders': '§aActive World Borders:§r §e{count}',
    'ui.systemInfo.entry.logManagerEntries': '§aLogManager Entries (In-Memory):§r §e{count}',
    'ui.systemInfo.entry.reportManagerEntries': '§aReportManager Entries (In-Memory):§r §e{count}',
    'ui.systemInfo.button.backToServerMgmt': '§l§cBack to Server Management§r',

    // Config Editor
    'ui.configEditor.title': '§l§6Configuration Editor§r (Owner Only)',
    'ui.configEditor.body': 'Select a configuration key to edit its value. Changes apply at runtime.',
    'ui.configEditor.button.format': '§e{key} §7({type}): §f{value}',
    'ui.configEditor.button.formatTruncated': '§e{key} §7({type}): §f{value}...',
    'ui.configEditor.button.objectPlaceholder': '§o(Complex Object/Array)§r',
    'ui.configEditor.button.backToAdminPanel': '§l§cBack to Server Management§r',
    'ui.configEditor.error.ownerOnly': '§cOnly the server owner can edit the configuration.',
    'ui.configEditor.error.generic': '§cError displaying config editor.',
    'ui.configEditor.error.invalidSelection': '§cInvalid selection in config editor.',
    'ui.configEditor.error.nonArrayObject': '§cCannot edit non-array objects directly ({keyName}). Use specific commands if available.',
    'ui.configEditor.error.nonArrayObjectEdit': '§cDirect editing of complex objects for "{keyName}" is not supported via this UI. Arrays of simple types are supported.',
    'ui.configEditor.valueInput.title': '§l§6Edit: {keyName}§r',
    'ui.configEditor.valueInput.boolean.label': 'New value for {keyName} (boolean: true/false):',
    'ui.configEditor.valueInput.string.label': 'New value for {keyName} (string):',
    'ui.configEditor.valueInput.string.placeholder': 'Enter new string value',
    'ui.configEditor.valueInput.number.label': 'New value for {keyName} (number):',
    'ui.configEditor.valueInput.number.placeholder': 'Enter new numeric value',
    'ui.configEditor.valueInput.array.label': 'New value for {keyName} (array - JSON format or comma-separated for simple types):',
    'ui.configEditor.valueInput.array.placeholder': 'e.g., ["a","b"] or 1,2,3',
    'ui.configEditor.valueInput.error.typeUnknown': '§cCannot edit type "{type}" for key "{keyName}" via this UI.',
    'ui.configEditor.valueInput.error.notANumber': '§cInvalid input. Please enter a valid number.',
    'ui.configEditor.valueInput.error.notAnArray': '§cInvalid input. Please enter a valid JSON array (e.g., ["item1", "item2"] or [1, 2, 3]).',
    'ui.configEditor.valueInput.error.jsonFormat': '§cInvalid JSON format for array: {error}',
    'ui.configEditor.valueInput.error.updateFailed': '§cFailed to update "{keyName}": {reason}.',
    'ui.configEditor.valueInput.error.updateFailedInternal': '§cFailed to update "{keyName}" due to an internal error.',
    'ui.configEditor.valueInput.noChange': '§eNo change detected for "{keyName}". Value remains the same.',
    'ui.configEditor.valueInput.success': '§aSuccessfully updated "{keyName}" to: {value}.',
    'ui.configEditor.valueInput.error.generic': '§cError updating config value for "{keyName}".',

    // Reset Flags Form (Text Input)
    'ui.resetFlagsForm.title': '§l§eReset Player Flags§r',
    'ui.resetFlagsForm.textField.label': 'Player Name to Reset Flags For:',
    'ui.resetFlagsForm.textField.placeholder': 'Enter exact player name',
    'ui.resetFlagsForm.toggle.label': '§cConfirm Resetting All Flags',
    'ui.resetFlagsForm.cancelled': '§7Flag reset action cancelled.',
    'ui.resetFlagsForm.error.nameEmpty': '§cPlayer name cannot be empty.',
    'ui.resetFlagsForm.error.generic': '§cError processing flag reset.',

    // Watched Players List
    'ui.watchedPlayers.title': '§l§bWatched Players§r',
    'ui.watchedPlayers.header': 'Currently watched players (online):\n',
    'ui.watchedPlayers.noPlayers': 'No players are currently being watched or online.',
    'ui.watchedPlayers.playerEntry': '- {playerName}',
    'ui.watchedPlayers.button.ok': '§l§aOK§r',

    // Action Logs / Mod Logs
    'ui.actionLogs.title': '§l§3Action Logs (All)§r',
    'ui.actionLogs.bodyHeader': 'Recent server actions:\n',
    'ui.actionLogs.noLogs': 'No logs found matching criteria.',
    'ui.actionLogs.logEntry': '§7[{timestamp}] §e{actor} §f{actionType} §b{target}§r{duration}{reason}{details}',
    'ui.actionLogs.logEntry.duration': ' (Duration: {duration})',
    'ui.actionLogs.logEntry.reason': ' (Reason: {reason})',
    'ui.actionLogs.logEntry.details': ' (Details: {details})',
    'ui.actionLogs.footer.showingLatest': '\n§o(Showing latest {count} entries. More may exist.)§r',
    'ui.actionLogs.body.empty': 'No action logs available.',
    'ui.actionLogs.button.backToServerMgmt': '§l§cBack to Server Management§r',

    'ui.modLogSelect.title': '§l§3Moderation Log Viewer§r',
    'ui.modLogSelect.body.all': 'Select log type or filter by player name.',
    'ui.modLogSelect.body.filtered': 'Showing logs for "{filterName}". Select type or clear filter.',
    'ui.modLogSelect.button.banUnban': '§cBans/Unbans§r',
    'ui.modLogSelect.button.muteUnmute': '§6Mutes/Unmutes§r',
    'ui.modLogSelect.button.filterByName': '§bFilter by Player Name§r',
    'ui.modLogSelect.button.clearFilter': '§eClear Filter ({filterName})§r',
    'ui.modLogSelect.button.backToServerMgmt': '§l§cBack to Server Management§r',
    'ui.modLogSelect.filterModal.title': '§l§bFilter Logs by Player Name§r',
    'ui.modLogSelect.filterModal.textField.label': 'Player Name (leave blank to clear):',
    'ui.modLogSelect.filterModal.textField.placeholder': 'Enter player name',
    'ui.modLogSelect.filterModal.filterSet': '§aLog filter set to: {filterName}.',
    'ui.modLogSelect.filterModal.filterCleared': '§eLog filter cleared.',
    'ui.modLogSelect.filterModal.filterBlank': '§eLog filter cannot be blank, cleared instead.',
    'ui.modLogSelect.error.generic': '§cError with mod log selection.',

    'ui.logViewer.title.banUnban': '§l§cBan/Unban Logs§r',
    'ui.logViewer.title.muteUnmute': '§l§6Mute/Unmute Logs§r',
    'ui.logViewer.title.filtered': '§l§3{logTypeName} for {filterName}§r',
    'ui.logViewer.noLogs': 'No logs found matching your criteria.',
    'ui.logViewer.button.backToLogSelect': '§l§cBack to Log Selection§r',

    // Player Data Manager specific (used by its functions, not directly UI)
    'playerData.mute.defaultReason': 'Muted by system.',
    'playerData.ban.defaultReason': 'Banned by system.',

    // TPA Manager Messages
    'tpa.manager.error.targetOfflineOnAccept': '§cTarget player {offlinePlayerName} went offline. TPA cancelled.',
    'tpa.manager.warmupMessage': '§eTeleporting in {warmupSeconds}s. Don\'t move or take damage!',
    'tpa.manager.requester.accepted': '§a{targetPlayerName} accepted your TPA request! {warmupMessage}',
    'tpa.manager.target.acceptedFromRequester': '§aYou accepted {requesterPlayerName}\'s TPA request. They will teleport in {warmupSeconds}s.',
    'tpa.manager.target.acceptedByRequester': '§a{requesterPlayerName} accepted your TPAHere request! {warmupMessage}',
    'tpa.manager.requester.acceptedHere': '§aYou accepted {targetPlayerName}\'s TPAHere request. They will teleport in {warmupSeconds}s.',
    'tpa.manager.error.teleportTargetOffline': '§cCannot teleport: {offlinePlayerName} is no longer online.',
    'tpa.manager.teleport.successToTarget': '§aSuccessfully teleported to {targetPlayerName}.',
    'tpa.manager.teleport.successTargetNotified': '§a{requesterPlayerName} has teleported to you.',
    'tpa.manager.teleport.successToRequester': '§aSuccessfully teleported to {requesterPlayerName}.',
    'tpa.manager.teleport.successRequesterNotified': '§a{targetPlayerName} has teleported to you.',
    'tpa.manager.error.teleportGenericErrorToRequester': '§cTeleport failed due to an unexpected error.',
    'tpa.manager.error.teleportGenericErrorToTarget': '§cTeleport for {otherPlayerName} failed due to an unexpected error.',
    'tpa.manager.warmupCancelledDamage.player': '§cTPA cancelled: You took damage ({damageCause}) during warm-up!',
    'tpa.manager.warmupCancelledMovement.player': '§cTPA cancelled: You moved during warm-up!',
    'tpa.manager.decline.requesterNotified': '§c{targetPlayerName} declined your TPA request.',
    'tpa.manager.decline.targetNotified': '§cYou declined {requesterPlayerName}\'s TPA request.',
    'tpa.manager.decline.otherCancelledRequester': '§cYour TPA request to {targetPlayerName} was cancelled.',
    'tpa.manager.decline.otherCancelledTarget': '§cThe TPA request from {requesterPlayerName} was cancelled.',
    'tpa.manager.expired.requesterNotified': '§cYour TPA request to {targetName} has expired.',
    'tpa.manager.expired.targetNotified': '§cThe TPA request from {requesterName} has expired.',

    // Command specific: addrank
    'command.addrank.usage': '§cUsage: {prefix}addrank <playername> <rankId>',
    'command.addrank.playerNotFound': "§cPlayer '{playerName}' not found.",
    'command.addrank.rankIdInvalid': "§cRank ID '{rankId}' is not a valid rank.",
    'command.addrank.rankNotManuallyAssignable': "§cRank '{rankName}' cannot be assigned using this command (not configured for manual tag assignment).",
    'command.addrank.permissionDeniedAssign': "§cYou do not have permission to assign the rank '{rankName}'.",
    'command.addrank.alreadyHasRank': "§ePlayer {playerName} already has the rank '{rankName}'.",
    'command.addrank.assignSuccessToIssuer': "§aSuccessfully assigned rank '{rankName}' to {playerName}.",
    'command.addrank.assignSuccessToTarget': "§aYou have been assigned the rank: {rankName}.",
    'command.addrank.errorAssign': "§cAn error occurred while assigning the rank: {errorMessage}",

    // Command specific: ban
    'command.ban.usage': "§cUsage: {prefix}ban <playername> [duration] [reason]",
    'command.ban.playerNotFound': "§cPlayer '{playerName}' not found.",
    'command.ban.cannotBanSelf': "§cYou cannot ban yourself.",
    'command.ban.permissionDeniedAdminOwner': "§cYou do not have permission to ban an admin or owner.",
    'command.ban.permissionDeniedOwner': "§cYou do not have permission to ban an owner.",
    'command.ban.ownerCannotBanOwner': "§cOwners cannot ban other owners through this command.",
    'command.ban.invalidDuration': "§cInvalid duration format. Use: 7d, 2h, 30m, or perm.",
    'command.ban.kickMessage.header': "§cYou have been banned from the server.",
    'command.ban.kickMessage.reason': "§eReason: §f{reason}",
    'command.ban.kickMessage.bannedBy': "§eBanned by: §f{bannedBy}",
    'command.ban.kickMessage.duration': "§eDuration: §f{durationDisplay}",
    'command.ban.kickMessage.appeal': "§eAppeal on Discord: §9{discordLink}",
    'command.ban.success': "§aSuccessfully banned {playerName} for {durationString}. Reason: {reason}",
    'command.ban.failure': "§cFailed to ban {playerName}. They might already be banned or an error occurred.",

    // Command specific: clearchat
    'command.clearchat.failPartial': "§cChat clear failed partially. Some messages might remain.",
    'command.clearchat.success': "§aChat cleared successfully.",

    // Command specific: clearreports
    'command.clearreports.usage': "§cUsage: {prefix}{syntax}",
    'command.clearreports.example': "§cExample: {prefix}clearreports <report_id> OR {prefix}clearreports <player_name> OR {prefix}clearreports all",
    'command.clearreports.allSuccess': "§aSuccessfully cleared all {count} reports.",
    'command.clearreports.idSuccess': "§aReport with ID '{reportId}' has been cleared.",
    'command.clearreports.idNotFound': "§cReport with ID '{reportId}' not found.",
    'command.clearreports.playerSuccess': "§aCleared {count} reports associated with player '{playerName}'.",
    'command.clearreports.playerNotFound': "§eNo reports found associated with player '{playerName}'.",

    // Configurable value descriptions (for potential UI)
    'config.key.chatClearLinesCount.title': "Chat Clear Lines Count",
    'config.key.chatClearLinesCount.description': "Number of empty lines sent by !clearchat command to clear chat.",
    'config.key.reportsViewPerPage.title': "Reports View Per Page",
    'config.key.reportsViewPerPage.description': "Number of reports displayed per page in the !viewreports command.",

    // Add more string keys and their corresponding text here as needed.
    // Example: 'some.module.someMessage': 'This is a message for {placeholder}.',

    // --- copyinv.js ---
    'command.copyinv.usage': '§cUsage: {prefix}copyinv <playername>',
    'command.copyinv.playerNotFound': "§cPlayer '{playerName}' not found.",
    'command.copyinv.cannotSelf': '§cYou cannot copy your own inventory.',
    'command.copyinv.noAccess': '§cCould not access inventories.',
    'ui.copyinv.confirm.title': 'Confirm Inventory Copy',
    'ui.copyinv.confirm.body': "Type 'confirm' to copy {targetPlayerName}'s inventory. THIS WILL OVERWRITE YOUR CURRENT INVENTORY.",
    'ui.copyinv.confirm.placeholder': "Type 'confirm' here",
    'ui.copyinv.confirm.toggle': 'Yes, I understand my inventory will be overwritten.',
    'command.copyinv.cancelled': '§eInventory copy cancelled.',
    'command.copyinv.error.form': '§cAn error occurred with the confirmation form.',
    'command.copyinv.success': "§aSuccessfully copied {targetPlayerName}'s inventory ({itemsCopied} items/stacks).",
    'command.copyinv.error.generic': '§cAn unexpected error occurred: {errorMessage}',

    // --- endlock.js ---
    'command.endlock.usage': '§cUsage: {prefix}endlock <on|off|status>',
    'command.endlock.locked': '§aThe End dimension is now locked.',
    'command.endlock.unlocked': '§aThe End dimension is now unlocked.',
    'command.endlock.failUpdate': '§cFailed to update End lock status.',
    'command.endlock.status': '§eEnd dimension status: {statusText}',
    'command.endlock.status.locked': '§cLocked',
    'command.endlock.status.unlocked': '§aUnlocked',
    'command.endlock.error.generic': '§cAn unexpected error occurred with the {commandName} command: {errorMessage}',

    // --- freeze.js ---
    'command.freeze.usage': '§cUsage: {prefix}freeze <playername> [on|off|toggle|status]',
    // playerNotFound is common, can reuse 'common.error.playerNotFound'
    'command.freeze.cannotSelf': '§cYou cannot freeze yourself.',
    'command.freeze.status.isFrozen': '§ePlayer {playerName} is currently frozen.',
    'command.freeze.status.notFrozen': '§ePlayer {playerName} is not frozen.',
    'command.freeze.invalidArg': '§cInvalid argument. Use: on, off, toggle, or status.',
    'command.freeze.targetFrozen': '§cYou have been frozen by an administrator.',
    'command.freeze.success.frozen': '§aSuccessfully froze {playerName}.',
    'command.freeze.error.apply': '§cError applying freeze to {playerName}: {errorMessage}',
    'command.freeze.targetUnfrozen': '§aYou have been unfrozen.',
    'command.freeze.success.unfrozen': '§aSuccessfully unfroze {playerName}.',
    'command.freeze.error.remove': '§cError removing freeze from {playerName}: {errorMessage}',
    'command.freeze.alreadyFrozen': '§ePlayer {playerName} is already frozen.',
    'command.freeze.alreadyUnfrozen': '§ePlayer {playerName} is already unfrozen.',

    // --- gma.js, gmc.js, gms.js, gmsp.js ---
    'command.gamemode.gma.usage': '§cUsage: {prefix}gma [playername]',
    'command.gamemode.gmc.usage': '§cUsage: {prefix}gmc [playername]',
    'command.gamemode.gms.usage': '§cUsage: {prefix}gms [playername]',
    'command.gamemode.gmsp.usage': '§cUsage: {prefix}gmsp [playername]',
    'command.gamemode.success.other': "§aSet {playerName}'s gamemode to {gamemodeName}.",
    'command.gamemode.success.self': '§aYour gamemode has been set to {gamemodeName}.',
    'command.gamemode.targetNotification': '§eYour gamemode has been set to {gamemodeName}.',
    'command.gamemode.error.generic': '§cFailed to set gamemode for {targetNameForError} to {gamemodeName}: {errorMessage}',

    // --- help.js ---
    'command.help.unknownCommand': '§cUnknown command: {prefix}{commandName}',
    'command.help.noPermission': '§cCommand {prefix}{commandName} not found or you do not have permission.',
    'command.help.header': '§6--- Available Commands (Prefix: {prefix}) ---§r',
    'command.help.specific.header': '§6--- Help: {prefix}{commandName} ---',
    'command.help.specific.syntax': '§eSyntax: {prefix}{commandName} {syntaxArgs}',
    'command.help.specific.description': '§7Description: {description}',
    'command.help.specific.permission': '§7Permission: {permLevelName} (Level {permissionLevel})',
    'command.help.category.general': '§2General Commands:§r',
    'command.help.category.teleport': '§2Teleportation Commands:§r',
    'command.help.category.moderation': '§cModeration Commands:§r',
    'command.help.category.admin': '§cAdministrative Commands:§r',
    'command.help.category.owner': '§4Owner Commands:§r',
    'command.help.entryFormat': '§e{prefix}{commandName} {syntaxArgs}§7 - {description}',
    'command.help.noCommandsAvailable': '§7No commands available to you at this time.',

    // --- inspect.js ---
    'command.inspect.usage': '§cUsage: {prefix}inspect <playername>',
    'command.inspect.header': '§6--- AntiCheat Status for {playerName} ---',
    'command.inspect.playerId': '§ePlayer ID: §f{playerId}',
    'command.inspect.watched': '§eWatched: §f{isWatched}',
    'command.inspect.totalFlags': '§eTotal Flags: §f{totalFlags}',
    'command.inspect.lastFlagType': '§eLast Flag Type: §f{lastFlagType}',
    'command.inspect.flagsByTypeHeader': '§eFlags by Type:',
    'command.inspect.flagEntry': '  §7- {flagKey}: §f{count} (Last: {timestamp})',
    'command.inspect.noSpecificFlags': '  §7(No specific flags with counts > 0)',
    'command.inspect.muted.yes': '§eMuted: §cYes (Expires: {expiry}, Reason: {reason})',
    'command.inspect.muted.no': '§eMuted: §aNo',
    'command.inspect.banned.yes': '§eBanned: §cYes (Expires: {expiry}, Reason: {reason})',
    'command.inspect.banned.no': '§eBanned: §aNo',
    'command.inspect.noData': '§cNo AntiCheat data found for this player.',

    // --- invsee.js ---
    'command.invsee.usage': '§cUsage: {prefix}invsee <playername>',
    'command.invsee.noAccess': "§cCould not access {playerName}'s inventory.",
    'ui.invsee.title': 'Inventory: {playerName}',
    'ui.invsee.header': '§6Inventory of {playerName}:§r',
    'ui.invsee.slotEntry': '§eSlot {slotNum}: §f{itemId} §7x{amount}{nameTagText}{durabilityText}{enchantsText}{loreText}',
    'ui.invsee.empty': '§7(Inventory is empty)',
    'command.invsee.error.display': '§cAn error occurred while trying to display the inventory.',
    // For item details within invsee:
    'command.invsee.item.nameTag': ' (Name: {nameTag})',
    'command.invsee.item.durability': ' (Dur: {currentDurability}/{maxDurability})',
    'command.invsee.item.lore': " (Lore: ['{loreEntries}'])", // {loreEntries} will be pre-joined with ', '
    'command.invsee.item.enchants': ' (Enchants: {enchantEntries})', // {enchantEntries} will be pre-joined

    // --- kick.js ---
    'command.kick.usage': '§cUsage: {prefix}kick <playername> [reason]',
    'command.kick.cannotSelf': '§cYou cannot kick yourself.',
    'command.kick.noPermission': '§cYou do not have permission to kick this player.',
    'command.kick.noPermissionOwner': '§cOnly the server owner can kick another owner.',
    'command.kick.targetMessage': '§cYou have been kicked by {kickerName}. Reason: {reason}',
    'command.kick.success': '§aKicked {playerName}. Reason: {reason}',
    'command.kick.error': '§cError kicking {playerName}: {errorMessage}',

    // --- listranks.js ---
    'command.listranks.noRanks': '§cNo ranks are currently defined in the system.',
    'command.listranks.header': '§e--- Available Ranks ---',
    'command.listranks.rank.id': '§aID: §f{id}',
    'command.listranks.rank.name': '  §bName: §f{name}',
    'command.listranks.rank.permLevel': '  §dPermLevel: §f{permLevel}',
    'command.listranks.rank.priority': '  §6Priority: §f{priority}',
    'command.listranks.rank.conditions': '  §3Conditions: §f{conditions}',
    'command.listranks.rank.chatPrefix': '  §7Chat Prefix: §r{prefix}',
    'command.listranks.rank.nametag': '  §7Nametag: §r{nametag}',
    'command.listranks.condition.ownerName': 'Is Owner (by name)',
    'command.listranks.condition.adminTag': 'Has Admin Tag',
    'command.listranks.condition.manualTagPrefix': 'Manual Tag (e.g., {prefix}{rankId})',
    'command.listranks.condition.tag': 'Has Tag: {tag}',
    'command.listranks.condition.default': 'Default fallback',
    'command.listranks.condition.custom': 'Custom ({type})',
    'command.listranks.condition.none': 'None (or implicit default)',
    'command.listranks.formatting.default': 'Default',

    // --- listwatched.js ---
    'command.listwatched.noPlayers': 'No players are currently being watched.',
    'command.listwatched.header': 'Currently watched players: ',

    // --- mute.js ---
    'command.mute.usage': '§cUsage: {prefix}mute <playername> [duration] [reason]',
    'command.mute.systemNoArgs': '[MuteCommand] Mute command called by system without sufficient arguments.',
    'command.mute.systemNoTarget': '[MuteCommand] System call missing target player name.',
    'command.mute.playerNotFound': "§cPlayer '{playerName}' not found.", // Reusable
    'command.mute.cannotSelf': '§cYou cannot mute yourself.',
    'command.mute.noPermission': '§cYou do not have permission to mute this player.',
    'command.mute.invalidDuration': '§cInvalid duration. Example: 10m, 1h, 2d, perm. Default: {defaultDuration}',
    'command.mute.automodReason': 'AutoMod action for {checkType} violations.',
    'command.mute.defaultReason': 'Muted by an administrator.',
    'command.mute.targetNotification.permanent': '§cYou have been permanently muted. Reason: {reason}',
    'command.mute.targetNotification.timed': '§cYou have been muted for {durationString}. Reason: {reason}',
    'command.mute.success': '§aMuted {playerName} for {durationText}. Reason: {reason}',
    'command.mute.failure': '§cFailed to mute {playerName}. They might already be muted with a longer or permanent duration.',
    'command.mute.error.generic': '§cError muting {playerName}: {errorMessage}',

    // --- myflags.js ---
    'command.myflags.header': '§7Your current flags: §eTotal={totalFlags}§7. Last type: §e{lastFlagType}§r',
    'command.myflags.flagEntry': ' §7- {key}: §e{count} §7(Last: {lastDetectionTime})',
    'command.myflags.noFlags': '§7You have no active flags.',
    'command.myflags.noSpecificFlags': '§7(No specific flag type details available with counts > 0).',
    'command.myflags.noData': '§7No flag data found for you, or you have no flags.',

    // --- netherlock.js ---
    'command.netherlock.usage': '§cUsage: {prefix}netherlock <on|off|status>',
    'command.netherlock.locked': '§cNether dimension is now LOCKED.',
    'command.netherlock.unlocked': '§aNether dimension is now UNLOCKED.',
    'command.netherlock.failUpdate': '§cFailed to update Nether lock state. Check server logs for details.',
    'command.netherlock.status': '§eNether dimension status: {statusText}',
    'command.netherlock.status.locked': '§cLOCKED',
    'command.netherlock.status.unlocked': '§aUNLOCKED',
    'command.netherlock.error.generic': '§cAn unexpected error occurred while executing the command: {errorMessage}',

    // --- notify.js ---
    'command.notify.enabled': '§aAntiCheat notifications are now ENABLED for you.',
    'command.notify.disabled': '§cAntiCheat notifications are now DISABLED for you.',
    'command.notify.status': '§eYour AntiCheat notifications are currently: {statusText} {sourceText}',
    'command.notify.status.source.default': '(Server Default)',
    'command.notify.status.source.explicit': '(Explicitly Set)',
    'command.notify.usage': '§cUsage: {prefix}notify <on|off|toggle|status>',
    'command.notify.error.update': '§cAn error occurred while updating your notification settings.',

    // --- panel.js ---
    'command.panel.error.generic': '§cAn unexpected error occurred while opening the panel. Please contact an administrator.',

    // --- purgeflags.js ---
    'command.purgeflags.usage': '§cUsage: {prefix}{syntax}',
    'command.purgeflags.playerNotFound': '§cPlayer "{playerName}" not found or is not online.',
    'command.purgeflags.noData': '§cCould not retrieve data for player "{playerName}".',
    'command.purgeflags.success.admin': '§aSuccessfully purged all flags and violation history for player "{playerName}". Old total flags: {oldTotalFlags}.',
    'command.purgeflags.success.target': '§eYour AntiCheat flags and violation history have been purged by an administrator ({adminName}).',

    // --- removerank.js ---
    'command.removerank.usage': '§cUsage: {prefix}removerank <playerName> <rankId>',
    'command.removerank.rankIdInvalid': '§cRank ID "{rankId}" is not a valid rank.',
    'command.removerank.notManuallyManaged': '§cRank "{rankName}" cannot be removed with this command (it is not managed by manual tags).',
    'command.removerank.permissionDenied': '§cYou do not have permission to remove the rank "{rankName}".',
    'command.removerank.notHasRank': '§ePlayer {playerName} does not currently have the rank "{rankName}" (missing tag: {rankTag}).',
    'command.removerank.success.issuer': '§aSuccessfully removed rank "{rankName}" from {playerName}.',
    'command.removerank.success.target': '§eYour rank "{rankName}" has been removed.',
    'command.removerank.error.generic': '§cAn error occurred while removing the rank: {errorMessage}',

    // --- report.js ---
    'command.report.usage': '§cUsage: {prefix}{syntax}',
    'command.report.cannotSelf': '§cYou cannot report yourself.',
    'command.report.reasonTooShort': '§cPlease provide a more detailed reason (at least 10 characters).',
    'command.report.reasonTooLong': '§cYour report reason is too long (max 256 characters).',
    'command.report.success': '§aReport submitted successfully against "{reportedPlayerName}". Report ID: {reportId}. Thank you.',
    'command.report.failure': '§cCould not submit your report at this time. Please try again later.',

    // --- resetflags.js ---
    'command.resetflags.usage': '§cUsage: {prefix}resetflags <playerName>',
    'command.resetflags.success': '§aSuccessfully reset flags and violation data for {playerName}.',
    'command.resetflags.noData': '§cCould not reset flags for {playerName} (no player data found).',

    // --- rules.js (UI strings are in uiManager section or directly in config.serverRules) ---
    // No command-specific messages here, as it opens a UI.

    // --- testnotify.js ---
    'command.testnotify.message': '§6This is a test notification from {playerName} via the AntiCheat system.',
    'command.testnotify.success': '§aTest notification sent to online admins/owners.',
    'command.testnotify.error': '§cAn error occurred while sending the test notification. Check server logs.',

    // --- tp.js ---
    'command.tp.usage': '§cUsage: {prefix}tp <targetPlayerOrX> [destinationPlayerOrY] [z] [dimension]',
    'command.tp.playerToMoveNotFound': '§cPlayer to move "{playerName}" not found.',
    'command.tp.destinationPlayerNotFound': '§cDestination player "{playerName}" not found.',
    'command.tp.cannotTeleportSelfToSelf': '§cCannot teleport {playerName} to themselves.',
    'command.tp.invalidCoordinatesArgs': '§cInvalid coordinate arguments for self-teleport.',
    'command.tp.invalidCoordinatesForTarget': '§cInvalid coordinates provided for target player.',
    'command.tp.invalidDimension': '§cInvalid dimension specified: {dimensionName}. Valid: overworld, nether, end.',
    'command.tp.failedResolveParams': '§cFailed to resolve teleport parameters.',
    'command.tp.success.toPlayer': '§aTeleported {playerToMoveName} to player {destinationPlayerName}.',
    'command.tp.success.toCoords': '§aTeleported {playerToMoveName} to {x}, {y}, {z}{dimensionInfo}.',
    'command.tp.targetNotification': '§eYou have been teleported by {adminName} to {destinationDescription}.',
    'command.tp.fail': '§cTeleport failed: {errorMessage}',

    // --- TPA System Commands (tpa.js, tpacancel.js, tpaccept.js, tpahere.js, tpastatus.js) ---
    // These primarily use keys already defined in stringDB starting with 'tpa.manager.'
    // Adding usage messages:
    'command.tpa.usage': '§cUsage: {prefix}tpa <playerName>',
    'command.tpahere.usage': '§cUsage: {prefix}tpahere <playerName>',
    'command.tpaccept.usage': '§cUsage: {prefix}tpaccept [playerName]',
    'command.tpacancel.usage': '§cUsage: {prefix}tpacancel [playerName]',
    'command.tpastatus.usage': '§cUsage: {prefix}tpastatus [on|off|status]',
    // Specific messages not covered by tpa.manager:
    'command.tpa.systemDisabled': "§cThe TPA system is currently disabled.", // Common for all TPA commands
    'command.tpa.cannotSelf': "§cYou cannot send a TPA request to yourself.",
    'command.tpahere.cannotSelf': "§cYou cannot send a TPA Here request to yourself.",
    'command.tpa.targetNotAccepting': '§cPlayer "{playerName}" is not currently accepting TPA requests.',
    'command.tpa.alreadyActive': '§cYou already have an active TPA request with "{playerName}".',
    'command.tpa.cooldown': '§cYou must wait {remainingTime} more seconds before sending another TPA request.',
    'command.tpa.requestSent': '§aTPA request sent to "{playerName}". They have {timeoutSeconds} seconds to accept. Type {prefix}tpacancel to cancel.',
    'command.tpahere.requestSent': '§aTPA Here request sent to "{playerName}". They have {timeoutSeconds} seconds to accept. Type {prefix}tpacancel to cancel.',
    'command.tpa.error.genericSend': "§cCould not send TPA request. There might be an existing request or other issue.",
    'command.tpahere.error.genericSend': "§cCould not send TPA Here request. There might be an existing request or other issue.",
    'command.tpaccept.noPending': "§cYou have no pending TPA requests.",
    'command.tpaccept.noRequestFromPlayer': '§cNo pending TPA request found from "{playerName}".',
    'command.tpaccept.pendingFrom': '§7Pending requests are from: {playerNames}',
    'command.tpaccept.couldNotFind': '§cCould not find a suitable TPA request to accept. Type {prefix}tpastatus to see your requests.',
    'command.tpaccept.success': '§aAccepted TPA request from "{playerName}". Teleport will occur in {warmupSeconds} seconds if the teleporting player avoids damage and stays online.',
    'command.tpaccept.failure': '§cCould not accept TPA request from "{playerName}". It might have expired or been cancelled.',
    'command.tpacancel.specific.success': '§aSuccessfully cancelled/declined TPA request involving "{playerName}".',
    'command.tpacancel.specific.notFound': '§cNo active or pending TPA request found with "{playerName}" that can be cancelled.',
    'command.tpacancel.all.noneFound': "§cYou have no active TPA requests to cancel or decline.",
    'command.tpacancel.all.success': '§aCancelled/declined {count} TPA request(s).',
    'command.tpacancel.all.noneCancellable': "§cNo active requests were found in a state that could be cancelled/declined.",
    'command.tpacancel.error.generic': "§cAn unexpected error occurred.",
    'command.tpastatus.on': "§aYou are now accepting TPA requests.",
    'command.tpastatus.off': "§cYou are no longer accepting TPA requests.",
    'command.tpastatus.off.declinedNotification': "§e{count} pending incoming TPA request(s) were automatically declined.",
    'command.tpastatus.status.accepting': "§aYou are currently accepting TPA requests.",
    'command.tpastatus.status.notAccepting': "§cYou are currently not accepting TPA requests.",
    'command.tpastatus.invalidOption': '§cInvalid option. Usage: {prefix}tpastatus [on|off|status]',

    // --- uinfo.js (UI strings are mostly in ui.*, but some internal logic might generate text) ---
    // Many uinfo strings are already in ui.* sections.
    'uinfo.myStats.noData': "No AntiCheat data found for you.", // Fallback if pData or pData.flags is null
    'uinfo.myStats.noSpecificFlags': " (No specific flag details)", // If totalFlags > 0 but no specific types

    // --- unban.js ---
    'command.unban.usage': '§cUsage: {prefix}unban <playername>',
    'command.unban.offline': '§cCannot unban offline player "{playerName}". Player must be online or unbanned via console/external tool.',
    'command.unban.notBanned': '§ePlayer "{playerName}" is not currently banned.',
    'command.unban.success': '§aSuccessfully unbanned {playerName}.',
    'command.unban.flagsCleared': "§7Flags for check type '{checkType}' were cleared for {playerName} due to unban from AutoMod action.",
    'command.unban.failure': '§cFailed to unban {playerName}.',
    'command.unban.error.generic': '§cAn unexpected error occurred.: {errorMessage}',

    // --- unmute.js ---
    'command.unmute.usage': '§cUsage: {prefix}unmute <playername>',
    'command.unmute.notMuted': '§ePlayer "{playerName}" is not currently muted.',
    'command.unmute.targetNotification': '§aYou have been unmuted.',
    'command.unmute.success': '§aSuccessfully unmuted {playerName}.',
    'command.unmute.flagsCleared': "§7Flags for check type '{checkType}' were cleared for {playerName} due to unmute from AutoMod action.",
    'command.unmute.failure': '§cFailed to unmute {playerName}.',
    'command.unmute.error.generic': '§cAn unexpected error occurred.: {errorMessage}',

    // --- unwatch.js ---
    'command.unwatch.usage': '§cUsage: {prefix}{syntax}',
    'command.unwatch.playerNotFound': '§cPlayer "{playerName}" not found or is not online.', // Can reuse common.error.playerNotFoundOnline
    'command.unwatch.noData': '§cCould not retrieve data for player "{playerName}".',
    'command.unwatch.notWatched': '§ePlayer "{playerName}" is not currently being watched.',
    'command.unwatch.success.admin': '§aPlayer "{playerName}" is no longer being watched.',
    'command.unwatch.success.target': '§eYou are no longer being watched by an administrator ({adminName}).',

    // --- vanish.js ---
    'command.vanish.notify.leftGame': '§e{playerName} left the game',
    'command.vanish.actionBar.on.notify': '§7You are now vanished (notify mode).',
    'command.vanish.actionBar.on.silent': '§7You are now vanished (silent mode).',
    'command.vanish.notify.joinedGame': '§e{playerName} joined the game',
    'command.vanish.message.off.notify': '§7You are no longer vanished (notify mode).',
    'command.vanish.message.off.silent': '§7You are no longer vanished (silent mode).',

    // --- version.js ---
    'command.version.message': '§7AntiCheat Addon Version: §e{version}',

    // --- viewreports.js ---
    'command.viewreports.idNotFound': '§cReport with ID "{reportId}" not found.',
    'command.viewreports.playerNoReports': '§cNo reports found involving player "{playerName}".',
    'command.viewreports.noReportsMatching': '§eNo reports found matching your criteria.',
    'command.viewreports.noReportsOnPage': '§cNo reports on page {pageNumber}. Max pages: {totalPages}.',
    'command.viewreports.noReportsFound': '§eNo reports found.',
    'command.viewreports.header.all': '§2--- Reports (Page {pageNumber}/{totalPages}, Total: {totalReports}) ---',
    'command.viewreports.header.filtered': '§2--- Reports (Filter: {filterType} {filterValue}, Page {pageNumber}/{totalPages}, Total: {totalReports}) ---',
    'command.viewreports.entry.id': '§eID: §f{reportId} §7({timeAgo} ago)',
    'command.viewreports.entry.reporter': '  §bReporter: §f{reporterName}',
    'command.viewreports.entry.reported': '  §cReported: §f{reportedName}',
    'command.viewreports.entry.reason': '  §dReason: §f{reason}',
    'command.viewreports.entry.status': '  §7Status: §f{status}',
    'command.viewreports.entry.assigned': '  §7Assigned: §f{assignedAdmin}',
    'command.viewreports.entry.resolution': '  §7Resolution: §f{resolutionDetails}',
    'command.viewreports.entry.separator': '§7--------------------',
    'command.viewreports.footer.nextPage': '§aType "{nextPageCommand}" for the next page.',
    'command.viewreports.footer.prevPage': '§aType "{prevPageCommand}" for the previous page.',

    // --- warnings.js ---
    'command.warnings.usage': '§cUsage: {prefix}warnings <playername>',
    // Player not found can reuse common.error.playerNotFound
    'command.warnings.header': '§e--- Warnings for {playerName} ---',
    'command.warnings.totalFlags': '§fTotal Flags: §c{totalFlags}',
    'command.warnings.lastFlagType': '§fLast Flag Type: §7{lastFlagType}',
    'command.warnings.individualFlagsHeader': '§eIndividual Flags:',
    'command.warnings.flagEntry': '  §f- {flagKey}: §c{count} §7(Last: {lastTime})',
    'command.warnings.noSpecific': '    §7No specific flag types recorded.',
    'command.warnings.noData': '§cNo warning data found for {playerName}.',

    // --- watch.js ---
    'command.watch.usage': '§cUsage: {prefix}{syntax}',
    // playerNotFound can reuse common.error.playerNotFoundOnline
    'command.watch.noData': '§cCould not retrieve data for player "{playerName}".',
    'command.watch.alreadyWatched': '§ePlayer "{playerName}" is already being watched.',
    'command.watch.success.admin': '§aPlayer "{playerName}" is now being watched. Detailed logs will be generated.',
    'command.watch.success.target': '§eYou are now being watched by an administrator ({adminName}). More detailed logging of your activity will occur.',

    // --- worldborder.js ---
    'command.worldborder.help.header': '--- World Border Commands ---',
    'command.worldborder.help.set': '{prefix}wb set <square|circle> <centerX> <centerZ> <size> [dimension] - Sets a border.',
    'command.worldborder.help.setSizeNote': '  Example Size: For square, size is half-length (e.g., 500 for 1000x1000). For circle, size is radius.',
    'command.worldborder.help.get': '{prefix}wb get [dimension] - Shows current border settings.',
    'command.worldborder.help.toggle': '{prefix}wb toggle <on|off> [dimension] - Enables/disables the border.',
    'command.worldborder.help.remove': '{prefix}wb remove [dimension] confirm - Removes the border.',
    'command.worldborder.help.resize': '{prefix}wb <shrink|expand> <newSize> <timeSeconds> [dimension] [interpolationType] - Resizes border.',
    'command.worldborder.help.pause': '{prefix}wb resizepause [dimension] - Pauses an active resize.',
    'command.worldborder.help.resume': '{prefix}wb resizeresume [dimension] - Resumes a paused resize.',
    'command.worldborder.help.setGlobalParticle': '{prefix}wb setglobalparticle <particleName> - Sets default particle for all borders.',
    'command.worldborder.help.setParticle': '{prefix}wb setparticle <particleName|reset> [dimension] - Sets particle for a specific border or resets to global.',
    'command.worldborder.help.dimensionNote': 'Dimension defaults to current if not specified (overworld, nether, end).',
    'command.worldborder.help.interpolationNote': 'Interpolation types: linear (default), easeoutquad, easeinoutquad.',
    'command.worldborder.invalidSubcommand': "§cInvalid subcommand '{subCommand}'. Use {prefix}wb help.",
    'command.worldborder.set.usage': '§cUsage: {prefix}wb set <square|circle> <centerX> <centerZ> <size> [dimension]',
    'command.worldborder.set.noteSize': '§eNote: For square, size is half-length (e.g., 500 for 1000x1000). For circle, size is radius.',
    'command.worldborder.set.invalidShape': "§cInvalid shape. Use 'square' or 'circle'.",
    'command.worldborder.set.invalidNumbers': '§cInvalid numbers for centerX, centerZ, or size.',
    'command.worldborder.set.sizePositive': '§cSize must be a positive number.',
    'command.worldborder.invalidDimension': '§cInvalid dimension: {dimensionName}. Use overworld, nether, or end.',
    'command.worldborder.set.successHeader': '§aWorld border set for {dimensionName}:',
    'command.worldborder.set.successDetails': '  Shape: {shape}, Center: ({centerX}, {centerZ}), Size: {sizeDisplay}',
    'command.worldborder.set.successDamage': '  Damage: {damageStatus}',
    'command.worldborder.set.damage.on': 'ON (Amount: {damageAmount}, Interval: {damageIntervalTicks}t, TP Events: {teleportAfterNumDamageEvents})',
    'command.worldborder.set.damage.off': 'OFF',
    'command.worldborder.set.resizeCancelled': '§eAny active border resize for this dimension was cancelled.',
    'command.worldborder.set.failSave': '§cFailed to save world border settings.',
    'command.worldborder.get.header': '§e--- World Border: {dimensionName} ---',
    'command.worldborder.get.enabled': '  Enabled: {status}', // status will be true/false
    'command.worldborder.get.shape': '  Shape: {shape}',
    'command.worldborder.get.center': '  Center: X={centerX}, Z={centerZ}',
    'command.worldborder.get.square.halfSize': '  Half Size: {halfSize} (Diameter: {diameter})',
    'command.worldborder.get.square.bounds': '  Bounds: X({minX} to {maxX}), Z({minZ} to {maxZ})',
    'command.worldborder.get.circle.radius': '  Radius: {radius}',
    'command.worldborder.get.damageEnabled': '  Damage Enabled: {status}',
    'command.worldborder.get.damageAmount': '  Damage Amount: {amount}',
    'command.worldborder.get.damageInterval': '  Damage Interval: {interval} ticks',
    'command.worldborder.get.teleportAfter': '  Teleport After: {events} damage events',
    'command.worldborder.get.resizing.yes': '  Resizing: YES (From {originalSize} to {targetSize})',
    'command.worldborder.get.resizing.progress': '  Progress: {progressPercent}% ({remainingSeconds}s remaining)',
    'command.worldborder.get.resizing.currentSize': '  Current Approx. Size: {currentSize}',
    'command.worldborder.get.resizing.interpolation': '  Interpolation: {interpolationType}',
    'command.worldborder.get.resizing.statusPaused': '  Resize Status: PAUSED',
    'command.worldborder.get.resizing.totalPausedTime': '  Total Paused Time: {pausedTime}',
    'command.worldborder.get.particle.override': '  Particle Override: {particleNameOverride}',
    'command.worldborder.get.particle.override.globalInfo': '    (Global default is: {globalParticle})',
    'command.worldborder.get.particle.globalDefault': '  Particle: Global Default ({globalParticle})',
    'command.worldborder.get.noBorder': '§eNo world border configured for {dimensionName}. Use {prefix}wb set to create one.',
    'command.worldborder.toggle.usage': '§cUsage: {prefix}wb toggle <on|off> [dimension]',
    'command.worldborder.toggle.invalidState': "§cInvalid state. Use 'on' or 'off'.",
    'command.worldborder.toggle.noBorder': '§cNo border configured for {dimensionName} to toggle.',
    'command.worldborder.toggle.alreadyState': '§eBorder for {dimensionName} is already {state}.',
    'command.worldborder.toggle.success': '§aBorder for {dimensionName} turned {state}.{resizeCancelledMessage}',
    'command.worldborder.toggle.fail': '§cFailed to toggle world border state.',
    'command.worldborder.remove.usage': '§cUsage: {prefix}wb remove [dimension] confirm',
    'command.worldborder.remove.confirmNeeded': '§cAre you sure you want to remove the border for {dimensionDisplayName}? Type: {confirmCommand}',
    'command.worldborder.remove.success': '§aWorld border for {dimensionName} removed.{resizeCancelledMessage}',
    'command.worldborder.remove.fail': '§cFailed to remove border for {dimensionName}.',
    'command.worldborder.resize.usage': '§cUsage: {prefix}wb {operationType} <newSize> <timeSeconds> [dimension] [interpolationType]',
    'command.worldborder.resize.invalidInterpolation': '§cInvalid interpolation type: {interpolationType}. Valid: {validTypes}.',
    'command.worldborder.resize.positiveNumbers': '§cNew size and time must be positive numbers.',
    'command.worldborder.resize.noActiveBorder': '§cNo active border in {dimensionName} to {operationType}.',
    'command.worldborder.resize.notDefined': '§cCurrent border size not defined for {dimensionName} to {operationType}.',
    'command.worldborder.resize.shrinkTooLarge': '§cNew size ({newSize}) must be smaller than current size ({currentSize}) for shrink.',
    'command.worldborder.resize.expandTooSmall': '§cNew size ({newSize}) must be larger than current size ({currentSize}) for expand.',
    'command.worldborder.resize.overrideCurrent': '§eOverriding current border resize operation.',
    'command.worldborder.resize.success': '§aBorder for {dimensionName} now {operationType}ing from {originalSize} to {newSize} over {timeSeconds}s ({interpolationType}).',
    'command.worldborder.resize.fail': '§cFailed to start border {operationType}.',
    'command.worldborder.pause.noResize': '§cNo border is currently resizing in {dimensionName}.',
    'command.worldborder.pause.alreadyPaused': '§eBorder resize in {dimensionName} is already paused.',
    'command.worldborder.pause.success': '§aBorder resize in {dimensionName} paused.',
    'command.worldborder.pause.fail': '§cFailed to pause border resize in {dimensionName}.',
    'command.worldborder.resume.noResize': '§cNo border is currently resizing in {dimensionName} to resume.',
    'command.worldborder.resume.notPaused': '§eBorder resize in {dimensionName} is not currently paused.',
    'command.worldborder.resume.success': '§aBorder resize in {dimensionName} resumed.',
    'command.worldborder.resume.fail': '§cFailed to resume border resize in {dimensionName}.',
    'command.worldborder.setglobalparticle.usage': '§cUsage: {prefix}wb setglobalparticle <particleName>',
    'command.worldborder.particle.emptyName': '§cParticle name cannot be empty.',
    'command.worldborder.setglobalparticle.errorConfig': '§cConfiguration system error. Cannot set global particle.',
    'command.worldborder.setglobalparticle.success': '§aGlobal world border particle set to: {particleName}',
    'command.worldborder.setglobalparticle.alreadySet': '§eGlobal particle is already set to {particleName}. No change made.',
    'command.worldborder.setglobalparticle.failInternal': '§cFailed to set global particle due to an internal error.',
    'command.worldborder.setparticle.usage': '§cUsage: {prefix}wb setparticle <particleName|reset> [dimension]',
    'command.worldborder.setparticle.noActiveBorder': '§cNo active border in {dimensionName} to set particle for.',
    'command.worldborder.setparticle.success': '§aParticle for border in {dimensionName} set to: {particleNameDisplay}',
    'command.worldborder.setparticle.fail': '§cFailed to set particle for world border.',

    // --- xraynotify.js ---
    'command.xraynotify.enabled': '§aX-Ray mining notifications are now ENABLED for you.',
    'command.xraynotify.disabled': '§cX-Ray mining notifications are now DISABLED for you.',
    'command.xraynotify.status.onExplicit': '§eYour X-Ray notifications are currently: ON (explicitly set)',
    'command.xraynotify.status.offExplicit': '§eYour X-Ray notifications are currently: OFF (explicitly set)',
    'command.xraynotify.status.onDefault': '§eYour X-Ray notifications are currently: ON (server default)',
    'command.xraynotify.status.offDefault': '§eYour X-Ray notifications are currently: OFF (server default)',
    'command.xraynotify.usage': '§cUsage: {prefix}xraynotify <on|off|status>',

    // --- Player Data Manager specific (used by its functions, not directly UI, but for messages it might construct) ---
    // Already have 'playerData.mute.defaultReason' and 'playerData.ban.defaultReason'
    'error.playerDataNotFound': '§cYour player data could not be found. Please rejoin or contact an admin.', // For chatProcessor

    // --- Event Handler specific (e.g., dimension lock messages) ---
    'dimensionLock.name.nether': 'The Nether',
    'dimensionLock.name.end': 'The End',
    'dimensionLock.teleportMessage': '§cAccess to {lockedDimensionName} is currently restricted. You have been teleported back.',
    'admin.notify.dimensionLockAttempt': '§e[AC] Player {playerName} attempted to enter the locked dimension: {dimensionName}. They were teleported back.',

    // --- Chat Processor specific (some might overlap with command responses) ---
    'chat.error.muted': '§cYou are currently muted and cannot send messages.', // More specific than a generic "no permission"
    'chat.error.combatCooldown': '§cYou cannot chat for another {seconds} seconds due to recent combat.',
    'chat.error.itemUse': '§cYou cannot chat while {itemUseState}.',
    'check.inventoryMod.action.usingConsumable': 'using an item', // For {itemUseState} placeholder
    'check.inventoryMod.action.chargingBow': 'charging a bow', // For {itemUseState} placeholder
    'chat.error.newline': '§cYour message contains newline characters, which are not allowed.',
    'chat.error.maxLength': '§cYour message is too long (max {maxLength} characters).',

    // --- AntiGrief specific (used by actionProfiles, but good to have keys if they are ever directly messaged) ---
    'antigrief.tntPlacementDenied': '§cTNT placement is restricted here.',
    'antigrief.itemUseDenied': "§cUse of '{item}' is restricted here.",

    // --- Ban/Mute duration formatting (used by getBanInfo/getMuteInfo potentially, or their callers) ---
    'ban.duration.permanent': 'Permanent',
    'ban.duration.expires': 'Expires: {expiryDate}', // {expiryDate} would be pre-formatted date string
    'ban.kickMessage': '§cYou have been banned.\nReason: {reason}\n{durationMessage}', // Example for combining
    'ban.kickMessage.discord': 'Appeal at: {discordLink}',

    // --- Admin notifications (some are direct, some could be templatized) ---
    'admin.notify.newPlayerJoined': '§e[AC] New player {playerName} has joined the server for the first time!',
    'admin.notify.combatLog': '§c[CombatLog] §e{playerName}§c disconnected {timeSinceCombat}s after being in combat! Flags: +{incrementAmount}', // Example if used by actionProfile
    // ... more admin notifications can be added if they become complex enough to warrant externalization

    // --- UI Manager specific (beyond what's in ui.*) ---
    // If uiManager constructs complex strings dynamically that aren't just titles/buttons, they could go here.
    // For now, most specific UI text is keyed under ui.*
};
