// AntiCheatsBP/scripts/core/automodConfig.js
/**
 * @file Stores the configuration for the AutoMod system.
 * This includes rules for automated actions based on flag counts,
 * messages for those actions, and per-check type toggles for AutoMod.
 * @version 1.1.0
 */

/**
 * @typedef {object} AutoModRuleParameter
 * @property {string} messageTemplate - The message template string for this rule.
 * @property {string} [adminMessageTemplate] - Optional admin-specific message template.
 * @property {string} [duration] - Duration for actions like TEMP_BAN or MUTE (e.g., "5m", "1h").
 * @property {string} [itemToRemoveTypeId] - Specific item TypeId for REMOVE_ILLEGAL_ITEM action.
 * @property {object} [coordinates] - Coordinates for TELEPORT_SAFE action.
 */

/**
 * @typedef {object} AutoModRule
 * @property {number} flagThreshold - Number of flags of a specific checkType to trigger this rule.
 * @property {string} actionType - Type of action (e.g., "warn", "kick", "tempBan", "mute", "removeIllegalItem", "flagOnly").
 * @property {AutoModRuleParameter} parameters - Parameters for the action.
 * @property {boolean} resetFlagsAfterAction - Whether to reset the flag count for this checkType after the action.
 */

/**
 * Configuration for the AutoMod system.
 * Defines rules for automated actions based on flag counts, messages for those actions,
 * and per-check type toggles for AutoMod.
 * @type {{
 *   automodRules: Object.<string, AutoModRule[]>,
 *   automodPerCheckTypeToggles: Object.<string, boolean>
 * }}
 */
export const automodConfig = {
    /**
     * Defines sets of rules for different checkTypes.
     * Each key is a checkType (e.g., "movement_hover_fly", "combat_cps_high"),
     * and its value is an array of AutoModRule objects, ordered by escalating severity.
     */
    automodRules: {
        "movementFlyHover": [
            { flagThreshold: 10, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, persistent hovering detected (Flags: {flagCount}/{flagThreshold}). Please adhere to server rules." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for continued hovering violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive hovering violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "movementSpeedGround": [
            { flagThreshold: 15, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, excessive ground speed detected (Flags: {flagCount}/{flagThreshold}). Please play fairly." }, resetFlagsAfterAction: false },
            { flagThreshold: 25, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated ground speed violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 35, actionType: "tempBan", parameters: { duration: "5m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to repeated ground speed violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "combatCpsHigh": [
            { flagThreshold: 10, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, high click speed detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated high click speed violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive click speed violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "movementNofall": [
            { flagThreshold: 9, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, NoFall (fall damage negation) detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated NoFall violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 27, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive NoFall violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldIllegalItemUse": [
            { flagThreshold: 6, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, use of illegal items ({itemTypeId}) detected (Flags: {flagCount}/{flagThreshold}). Items may be removed if behavior persists." }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated use of illegal items ({itemTypeId}) (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive use of illegal items ({itemTypeId}) (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "playerNamespoof": [
            { flagThreshold: 10, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, name spoofing detected (Flags: {flagCount}/{flagThreshold}). Please change your name." }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated name spoofing violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive name spoofing violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "combatReachAttack": [
            { flagThreshold: 15, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, excessive reach detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 25, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated reach violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 40, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive reach violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "movementNoslow": [
            { flagThreshold: 10, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, NoSlow (movement exploit) detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated NoSlow violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive NoSlow violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "actionFastUse": [
            { flagThreshold: 15, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, fast item usage detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 25, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated fast item usage (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 40, actionType: "tempBan", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive fast item usage (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "playerAntiGMC": [
            { flagThreshold: 10, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for unauthorized Creative Mode usage (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "tempBan", parameters: { duration: "6h", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for repeated unauthorized Creative Mode usage (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "combatMultitargetAura": [
            { flagThreshold: 6, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, attacking multiple targets too quickly (Flags: {flagCount}/{flagThreshold}). Please play fairly." }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated multi-target aura violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive multi-target aura violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldIllegalItemPlace": [
            { flagThreshold: 6, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, placing illegal or restricted items ({itemTypeId}) detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeatedly placing illegal items ({itemTypeId}) (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessively placing illegal items ({itemTypeId}) (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "movementInvalidSprint": [
            { flagThreshold: 8, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, sprinting under invalid conditions detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 16, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated invalid sprint violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 24, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive invalid sprint violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "chatSpamFastMessage": [
            { flagThreshold: 5, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, please do not send messages so quickly (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "mute", parameters: { duration: "5m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for sending messages too quickly (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true },
            { flagThreshold: 15, actionType: "mute", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent fast message spam (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "combatInvalidPitch": [
            { flagThreshold: 6, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, invalid viewing angles detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated invalid viewing angles (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive invalid viewing angles (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "combatAttackWhileSleeping": [
            { flagThreshold: 10, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, attacking while sleeping detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeatedly attacking while sleeping (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 25, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessively attacking while sleeping (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldInstabreakSpeed": [
            { flagThreshold: 9, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, breaking blocks too quickly detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated instabreak violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 27, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive instabreak violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "chatSpamMaxWords": [
            { flagThreshold: 5, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, please avoid sending messages with excessive words (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "mute", parameters: { duration: "5m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for sending messages with too many words (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true },
            { flagThreshold: 15, actionType: "mute", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent overly long messages (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "chatContentRepeat": [
            { flagThreshold: 3, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, please avoid repeating the same message content (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 6, actionType: "mute", parameters: { duration: "5m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for repeating message content (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true },
            { flagThreshold: 9, actionType: "mute", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent message content repetition (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "chatUnicodeAbuse": [
            { flagThreshold: 2, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, please avoid using excessive special characters or text effects that disrupt chat (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 4, actionType: "mute", parameters: { duration: "10m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for disruptive text patterns (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true },
            { flagThreshold: 6, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent use of disruptive text patterns (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "chatExcessiveMentions": [
            { flagThreshold: 2, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, please avoid mentioning too many users or the same user repeatedly in a single message (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 4, actionType: "mute", parameters: { duration: "5m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for excessive user mentions (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true },
            { flagThreshold: 6, actionType: "mute", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent excessive user mentions (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "chatGibberish": [
            { flagThreshold: 3, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, please ensure your messages are readable and contribute to the conversation (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 6, actionType: "mute", parameters: { duration: "5m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} due to unreadable message patterns (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true },
            { flagThreshold: 9, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent unreadable or gibberish messages (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "chatImpersonationAttempt": [
            { flagThreshold: 2, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, your message format appears to mimic server or staff announcements (Flags: {flagCount}/{flagThreshold}). Please avoid this." }, resetFlagsAfterAction: false },
            { flagThreshold: 4, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for attempting to impersonate server or staff messages (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 6, actionType: "tempBan", parameters: { duration: "1h", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for persistent attempts to impersonate server or staff messages (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "combatViewsnapPitch": [
            { flagThreshold: 10, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, suspicious vertical camera movements detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated suspicious vertical camera movements (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive suspicious vertical camera movements (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "combatViewsnapYaw": [
            { flagThreshold: 10, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, suspicious horizontal camera movements detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated suspicious horizontal camera movements (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive suspicious horizontal camera movements (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "combatAttackWhileConsuming": [
            { flagThreshold: 6, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, attacking while consuming items detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeatedly attacking while consuming items (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessively attacking while consuming items (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "playerInvalidRenderDistance": [
            { flagThreshold: 5, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, invalid client render distance reported (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeatedly reporting invalid render distance (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for persistently reporting invalid render distance (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "combatAttackWhileBowCharging": [
            { flagThreshold: 6, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, attacking while charging a bow detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeatedly attacking while charging a bow (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessively attacking while charging a bow (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "combatAttackWhileShielding": [
            { flagThreshold: 6, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, attacking while shielding detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeatedly attacking while shielding (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessively attacking while shielding (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "playerChatDuringCombat": [
            { flagThreshold: 5, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, please avoid chatting during combat cooldown (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "mute", parameters: { duration: "5m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for chatting during combat cooldown (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true },
            { flagThreshold: 15, actionType: "mute", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistently chatting during combat cooldown (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "playerChatDuringItemUse": [
            { flagThreshold: 5, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, please avoid chatting while using items (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "mute", parameters: { duration: "5m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for chatting while using items (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true },
            { flagThreshold: 15, actionType: "mute", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistently chatting while using items (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldNuker": [
            { flagThreshold: 10, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, Nuker activity detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent Nuker activity (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { duration: "10m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive Nuker activity (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldAutotool": [
            { flagThreshold: 10, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, suspicious tool switching (AutoTool) detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent AutoTool activity (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive AutoTool activity (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldInstabreakUnbreakable": [
            { flagThreshold: 10, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, attempted to break an unbreakable block ({itemTypeId}) (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for attempting to break unbreakable blocks ({itemTypeId}) (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { duration: "1h", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for persistent attempts to break unbreakable blocks ({itemTypeId}) (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "playerInventoryMod": [
            { flagThreshold: 9, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, suspicious inventory manipulation detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent inventory manipulation (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 27, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive inventory manipulation (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldTowerBuild": [
            { flagThreshold: 10, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, rapid tower building detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent tower building (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { duration: "10m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive tower building (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldFlatRotationBuilding": [
            { flagThreshold: 10, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, unnatural building rotation detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent unnatural building rotation (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive unnatural building rotation (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldDownwardScaffold": [
            { flagThreshold: 9, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, downward scaffolding detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent downward scaffolding (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 27, actionType: "tempBan", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive downward scaffolding (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldAirPlace": [
            { flagThreshold: 15, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, placing blocks in air detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent air placement (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 45, actionType: "tempBan", parameters: { duration: "5m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive air placement (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldFastPlace": [
            { flagThreshold: 15, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, placing blocks too quickly detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent fast placement (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 45, actionType: "tempBan", parameters: { duration: "10m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive fast placement (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "chatSwearViolation": [
            { flagThreshold: 3, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, swear word detected in chat (Flags: {flagCount}/{flagThreshold}). Please be respectful." }, resetFlagsAfterAction: false },
            { flagThreshold: 5, actionType: "mute", parameters: { duration: "10m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for using inappropriate language (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "mute", parameters: { duration: "1h", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent use of inappropriate language (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefTntPlace": [
            { flagThreshold: 5, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, unauthorized TNT placement detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent unauthorized TNT placement (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive unauthorized TNT placement (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefWitherSpawn": [
            { flagThreshold: 5, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, unauthorized Wither spawning activity detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent unauthorized Wither spawning (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "tempBan", parameters: { duration: "1h", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive unauthorized Wither spawning (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefFire": [
            { flagThreshold: 10, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, unauthorized fire placement detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent unauthorized fire placement (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive unauthorized fire placement (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefLava": [
            { flagThreshold: 10, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, unauthorized lava placement detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent unauthorized lava placement (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive unauthorized lava placement (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefWater": [
            { flagThreshold: 15, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, unauthorized water placement detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent unauthorized water placement (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 45, actionType: "tempBan", parameters: { duration: "10m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive unauthorized water placement (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefBlockspam": [
            { flagThreshold: 15, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, block spamming detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent block spamming (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 45, actionType: "tempBan", parameters: { duration: "5m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive block spamming (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefEntityspam": [
            { flagThreshold: 15, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, entity spamming detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent entity spamming (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 45, actionType: "tempBan", parameters: { duration: "10m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive entity spamming (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefBlockspamDensity": [
            { flagThreshold: 10, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, high-density block spamming detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent high-density block spamming (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive high-density block spamming (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "playerSelfHurt": [
            { flagThreshold: 6, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, suspicious self-inflicted damage detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated suspicious self-inflicted damage (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive self-inflicted damage (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "chatAdvertisingDetected": [
            { flagThreshold: 2, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, advertising is not allowed (Flags: {flagCount}/{flagThreshold}). Please review server rules." }, resetFlagsAfterAction: false },
            { flagThreshold: 4, actionType: "mute", parameters: { duration: "10m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for advertising (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true },
            { flagThreshold: 6, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent advertising (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 8, actionType: "tempBan", parameters: { duration: "30m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive advertising (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "chatCapsAbuseDetected": [
            { flagThreshold: 3, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, excessive capitalization detected (Flags: {flagCount}/{flagThreshold}). Please disable caps lock." }, resetFlagsAfterAction: false },
            { flagThreshold: 6, actionType: "mute", parameters: { duration: "5m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for excessive caps (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true },
            { flagThreshold: 10, actionType: "mute", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent caps abuse (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "chatCharRepeatDetected": [
            { flagThreshold: 3, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, excessive character repetition detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 6, actionType: "mute", parameters: { duration: "5m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for character repetition (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true },
            { flagThreshold: 10, actionType: "mute", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent character repetition (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "chatSymbolSpamDetected": [
            { flagThreshold: 3, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, excessive symbol usage detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 6, actionType: "mute", parameters: { duration: "5m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for symbol spam (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true },
            { flagThreshold: 10, actionType: "mute", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent symbol spam (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "chatNewline": [
            { flagThreshold: 2, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, newlines in chat are not allowed (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 4, actionType: "mute", parameters: { duration: "5m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for using newlines in chat (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "chatMaxlength": [
            { flagThreshold: 2, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, message is too long (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 4, actionType: "mute", parameters: { duration: "5m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for sending overly long messages (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "movementNetherRoof": [
            { flagThreshold: 1, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, detected on the Nether roof (Flags: {flagCount}/{flagThreshold}). This area is restricted." }, resetFlagsAfterAction: false },
            { flagThreshold: 2, actionType: "teleportSafe", parameters: { coordinates: { y: 120 }, messageTemplate: "AutoMod [{actionType}|{checkType}]: Teleporting {playerName} from the Nether roof to {teleportCoordinates} (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 3, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeatedly accessing the Nether roof (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 5, actionType: "tempBan", parameters: { duration: "1h", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for persistent Nether roof violations (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "movementHighYVelocity": [
            { flagThreshold: 3, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, excessive vertical acceleration detected (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 6, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for excessive vertical acceleration (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "tempBan", parameters: { duration: "10m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive vertical acceleration (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "movementSustainedFly": [
            { flagThreshold: 5, actionType: "warn", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName}, sustained flight detected (Flags: {flagCount}/{flagThreshold}). Please land." }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "kick", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for sustained flight (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "tempBan", parameters: { duration: "15m", messageTemplate: "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for sustained flight (Flags: {flagCount}/{flagThreshold})." }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefPistonLag": [
            { flagThreshold: 1, actionType: "flagOnly", parameters: { messageTemplate: "AutoMod [{actionType}|{checkType}]: Potential piston lag machine detected involving {playerName} (Flags: {flagCount}/{flagThreshold}). Logged." }, resetFlagsAfterAction: true }
        ]
        // Add more checkTypes here in the future
    },

    /**
     * Allows enabling or disabling AutoMod for specific checkTypes.
     * Keys are checkType strings (e.g., "fly_hover").
     * Values are booleans (true to enable AutoMod for this check, false to disable).
     * If a checkType is not listed here, AutoMod processing for it might be skipped or default to enabled,
     * depending on `automodManager.js` logic (current logic implies it would skip if not found or if no rules).
     */
    automodPerCheckTypeToggles: {
        "movementFlyHover": false,
        "movementSpeedGround": false, // Renamed from speed_ground
        "combatCpsHigh": false,
        "movementNofall": false,
        "worldIllegalItemUse": false,
        "playerNamespoof": false,
        "playerAntiGMC": false,
        "combatMultitargetAura": false,
        "worldIllegalItemPlace": false,
        "movementInvalidSprint": false,
        "chatSpamFastMessage": false,
        "combatInvalidPitch": false,
        "combatAttackWhileSleeping": false,
        "worldInstabreakSpeed": false,
        "chatSpamMaxWords": false,
        "combatViewsnapPitch": false,
        "combatViewsnapYaw": false,
        "combatAttackWhileConsuming": false,
        "playerInvalidRenderDistance": false,
        "combatAttackWhileBowCharging": false,
        "combatAttackWhileShielding": false,
        "playerChatDuringCombat": false,
        "playerChatDuringItemUse": false,
        "worldNuker": false,
        "worldAutotool": false,
        "worldInstabreakUnbreakable": false,
        "playerInventoryMod": false,
        "worldTowerBuild": false,
        "worldFlatRotationBuilding": false,
        "worldDownwardScaffold": false,
        "worldAirPlace": false,
        "worldFastPlace": false,
        "chatSwearViolation": false,
        "worldAntigriefTntPlace": false,
        "worldAntigriefWitherSpawn": false,
        "worldAntigriefFire": false,
        "worldAntigriefLava": false,
        "worldAntigriefWater": false,
        "worldAntigriefBlockspam": false,
        "worldAntigriefEntityspam": false,
        "worldAntigriefBlockspamDensity": false,
        "playerSelfHurt": false,
        "chatAdvertisingDetected": false,
        "chatCapsAbuseDetected": false,
        "chatContentRepeat": false,
        "chatExcessiveMentions": false,
        "chatUnicodeAbuse": false,
        "chatGibberish": false,
        "chatImpersonationAttempt": false,
        "chatCharRepeatDetected": false,
        "chatSymbolSpamDetected": false,
        "chatNewline": false,
        "chatMaxlength": false,
        "movementNetherRoof": false,
        "movementHighYVelocity": false,
        "movementSustainedFly": false,
        "worldAntigriefPistonLag": false
        // Add more checkTypes here
    }
};
