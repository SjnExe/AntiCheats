// AntiCheatsBP/scripts/core/automodConfig.js
/**
 * @file Stores the configuration for the AutoMod system.
 * This includes rules for automated actions based on flag counts,
 * messages for those actions, and per-check type toggles for AutoMod.
 * @version 1.0.0
 */

/**
 * @typedef {object} AutoModRuleParameter
 * @property {string} reasonKey - Key to look up the message in `automodActionMessages`.
 * @property {string} [duration] - Duration for actions like TEMP_BAN or MUTE (e.g., "5m", "1h").
 * @property {string} [itemToRemoveTypeId] - Specific item TypeId for REMOVE_ILLEGAL_ITEM action.
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
 *   automodActionMessages: Object.<string, string>,
 *   automodPerCheckTypeToggles: Object.<string, boolean>
 * }}
 */
export const automodConfig = {
    /**
     * Defines sets of rules for different checkTypes.
     * Each key is a checkType (e.g., "movement_hover_fly", "combat_cps_high"),
     * and its value is an array of AutoModRule objects, ordered by escalating severity.
     * Example: "movement_hover_fly": [ { flagThreshold: 5, actionType: "warn", ... }, { flagThreshold: 10, actionType: "kick", ... } ]
     */
    automodRules: {
        "movementFlyHover": [
            { flagThreshold: 10, actionType: "warn", parameters: { reasonKey: "automod.fly.hover.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { reasonKey: "automod.fly.hover.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { reasonKey: "automod.fly.hover.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "movementSpeedGround": [
            { flagThreshold: 15, actionType: "warn", parameters: { reasonKey: "automod.speed.ground.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 25, actionType: "kick", parameters: { reasonKey: "automod.speed.ground.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 35, actionType: "tempBan", parameters: { reasonKey: "automod.speed.ground.tempban1", duration: "5m" }, resetFlagsAfterAction: true }
        ],
        "combatCpsHigh": [
            { flagThreshold: 10, actionType: "warn", parameters: { reasonKey: "automod.cps.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { reasonKey: "automod.cps.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { reasonKey: "automod.cps.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "movementNofall": [
            { flagThreshold: 9, actionType: "warn", parameters: { reasonKey: "automod.nofall.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "kick", parameters: { reasonKey: "automod.nofall.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 27, actionType: "tempBan", parameters: { reasonKey: "automod.nofall.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "worldIllegalItemUse": [
            { flagThreshold: 6, actionType: "warn", parameters: { reasonKey: "automod.illegalitem.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "kick", parameters: { reasonKey: "automod.illegalitem.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "tempBan", parameters: { reasonKey: "automod.illegalitem.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "playerNamespoof": [
            { flagThreshold: 10, actionType: "warn", parameters: { reasonKey: "automod.namespoof.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "kick", parameters: { reasonKey: "automod.namespoof.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "tempBan", parameters: { reasonKey: "automod.namespoof.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "combatReachAttack": [
            { flagThreshold: 15, actionType: "warn", parameters: { reasonKey: "automod.reach.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 25, actionType: "kick", parameters: { reasonKey: "automod.reach.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 40, actionType: "tempBan", parameters: { reasonKey: "automod.reach.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "movementNoslow": [
            { flagThreshold: 10, actionType: "warn", parameters: { reasonKey: "automod.noslow.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { reasonKey: "automod.noslow.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { reasonKey: "automod.noslow.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "actionFastUse": [
            { flagThreshold: 15, actionType: "warn", parameters: { reasonKey: "automod.fastuse.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 25, actionType: "kick", parameters: { reasonKey: "automod.fastuse.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 40, actionType: "tempBan", parameters: { reasonKey: "automod.fastuse.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "playerAntiGMC": [
            { flagThreshold: 10, actionType: "kick", parameters: { reasonKey: "automod.antigmc.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "tempBan", parameters: { reasonKey: "automod.antigmc.tempban1", duration: "6h" }, resetFlagsAfterAction: true }
        ],
        "combatMultitargetAura": [
            { flagThreshold: 6, actionType: "warn", parameters: { reasonKey: "automod.multitarget.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "kick", parameters: { reasonKey: "automod.multitarget.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "tempBan", parameters: { reasonKey: "automod.multitarget.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "worldIllegalItemPlace": [
            { flagThreshold: 6, actionType: "warn", parameters: { reasonKey: "automod.illegalplace.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "kick", parameters: { reasonKey: "automod.illegalplace.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "tempBan", parameters: { reasonKey: "automod.illegalplace.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "movementInvalidSprint": [
            { flagThreshold: 8, actionType: "warn", parameters: { reasonKey: "automod.invalidsprint.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 16, actionType: "kick", parameters: { reasonKey: "automod.invalidsprint.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 24, actionType: "tempBan", parameters: { reasonKey: "automod.invalidsprint.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "chatSpamFastMessage": [
            { flagThreshold: 5, actionType: "warn", parameters: { reasonKey: "automod.chatfast.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "mute", parameters: { reasonKey: "automod.chatfast.mute1", duration: "5m" }, resetFlagsAfterAction: true },
            { flagThreshold: 15, actionType: "mute", parameters: { reasonKey: "automod.chatfast.mute2", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "combatInvalidPitch": [
            { flagThreshold: 6, actionType: "warn", parameters: { reasonKey: "automod.invalidpitch.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "kick", parameters: { reasonKey: "automod.invalidpitch.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "tempBan", parameters: { reasonKey: "automod.invalidpitch.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "combatAttackWhileSleeping": [
            { flagThreshold: 10, actionType: "warn", parameters: { reasonKey: "automod.attacksleep.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "kick", parameters: { reasonKey: "automod.attacksleep.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 25, actionType: "tempBan", parameters: { reasonKey: "automod.attacksleep.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "worldInstabreakSpeed": [
            { flagThreshold: 9, actionType: "warn", parameters: { reasonKey: "automod.instabreak.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "kick", parameters: { reasonKey: "automod.instabreak.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 27, actionType: "tempBan", parameters: { reasonKey: "automod.instabreak.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "chatSpamMaxWords": [
            { flagThreshold: 5, actionType: "warn", parameters: { reasonKey: "automod.chatmaxwords.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "mute", parameters: { reasonKey: "automod.chatmaxwords.mute1", duration: "5m" }, resetFlagsAfterAction: true },
            { flagThreshold: 15, actionType: "mute", parameters: { reasonKey: "automod.chatmaxwords.mute2", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "chatContentRepeat": [
            { "flagThreshold": 3, "actionType": "warn", "parameters": { "reasonKey": "automod.chat.contentrepeat.warn1" }, "resetFlagsAfterAction": false },
            { "flagThreshold": 6, "actionType": "mute", "parameters": { "reasonKey": "automod.chat.contentrepeat.mute1", "duration": "5m" }, "resetFlagsAfterAction": true },
            { "flagThreshold": 9, "actionType": "mute", "parameters": { "reasonKey": "automod.chat.contentrepeat.mute2", "duration": "30m" }, "resetFlagsAfterAction": true }
        ],
        "chatUnicodeAbuse": [
            { "flagThreshold": 2, "actionType": "warn", "parameters": { "reasonKey": "automod.chat.unicodeabuse.warn1" }, "resetFlagsAfterAction": false },
            { "flagThreshold": 4, "actionType": "mute", "parameters": { "reasonKey": "automod.chat.unicodeabuse.mute1", "duration": "10m" }, "resetFlagsAfterAction": true },
            { "flagThreshold": 6, "actionType": "kick", "parameters": { "reasonKey": "automod.chat.unicodeabuse.kick1" }, "resetFlagsAfterAction": true }
        ],
        "chatExcessiveMentions": [
            { "flagThreshold": 2, "actionType": "warn", "parameters": { "reasonKey": "automod.chat.excessivementions.warn1" }, "resetFlagsAfterAction": false },
            { "flagThreshold": 4, "actionType": "mute", "parameters": { "reasonKey": "automod.chat.excessivementions.mute1", "duration": "5m" }, "resetFlagsAfterAction": true },
            { "flagThreshold": 6, "actionType": "mute", "parameters": { "reasonKey": "automod.chat.excessivementions.mute2", "duration": "15m" }, "resetFlagsAfterAction": true }
        ],
        "chatGibberish": [
            { "flagThreshold": 3, "actionType": "warn", "parameters": { "reasonKey": "automod.chat.gibberish.warn1" }, "resetFlagsAfterAction": false },
            { "flagThreshold": 6, "actionType": "mute", "parameters": { "reasonKey": "automod.chat.gibberish.mute1", "duration": "5m" }, "resetFlagsAfterAction": true },
            { "flagThreshold": 9, "actionType": "kick", "parameters": { "reasonKey": "automod.chat.gibberish.kick1" }, "resetFlagsAfterAction": true }
        ],
        "chatImpersonationAttempt": [
            { "flagThreshold": 2, "actionType": "warn", "parameters": { "reasonKey": "automod.chat.impersonation.warn1"}, "resetFlagsAfterAction": false },
            { "flagThreshold": 4, "actionType": "kick", "parameters": { "reasonKey": "automod.chat.impersonation.kick1"}, "resetFlagsAfterAction": false },
            { "flagThreshold": 6, "actionType": "tempBan", "parameters": { "reasonKey": "automod.chat.impersonation.tempban1", "duration": "1h"}, "resetFlagsAfterAction": true }
        ],
        "combatViewsnapPitch": [
            { flagThreshold: 10, actionType: "warn", parameters: { reasonKey: "automod.viewsnap.pitch.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { reasonKey: "automod.viewsnap.pitch.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { reasonKey: "automod.viewsnap.pitch.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "combatViewsnapYaw": [
            { flagThreshold: 10, actionType: "warn", parameters: { reasonKey: "automod.viewsnap.yaw.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { reasonKey: "automod.viewsnap.yaw.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { reasonKey: "automod.viewsnap.yaw.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "combatAttackWhileConsuming": [
            { flagThreshold: 6, actionType: "warn", parameters: { reasonKey: "automod.attackconsume.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "kick", parameters: { reasonKey: "automod.attackconsume.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "tempBan", parameters: { reasonKey: "automod.attackconsume.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "playerInvalidRenderDistance": [
            { flagThreshold: 5, actionType: "warn", parameters: { reasonKey: "automod.renderdistance.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "kick", parameters: { reasonKey: "automod.renderdistance.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "tempBan", parameters: { reasonKey: "automod.renderdistance.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "combatAttackWhileBowCharging": [
            { flagThreshold: 6, actionType: "warn", parameters: { reasonKey: "automod.attackbow.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "kick", parameters: { reasonKey: "automod.attackbow.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "tempBan", parameters: { reasonKey: "automod.attackbow.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "combatAttackWhileShielding": [
            { flagThreshold: 6, actionType: "warn", parameters: { reasonKey: "automod.attackshield.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "kick", parameters: { reasonKey: "automod.attackshield.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "tempBan", parameters: { reasonKey: "automod.attackshield.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "playerChatDuringCombat": [
            { flagThreshold: 5, actionType: "warn", parameters: { reasonKey: "automod.chatcombat.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "mute", parameters: { reasonKey: "automod.chatcombat.mute1", duration: "5m" }, resetFlagsAfterAction: true },
            { flagThreshold: 15, actionType: "mute", parameters: { reasonKey: "automod.chatcombat.mute2", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "playerChatDuringItemUse": [
            { flagThreshold: 5, actionType: "warn", parameters: { reasonKey: "automod.chatitemuse.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "mute", parameters: { reasonKey: "automod.chatitemuse.mute1", duration: "5m" }, resetFlagsAfterAction: true },
            { flagThreshold: 15, actionType: "mute", parameters: { reasonKey: "automod.chatitemuse.mute2", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "worldNuker": [
            { flagThreshold: 10, actionType: "warn", parameters: { reasonKey: "automod.nuker.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { reasonKey: "automod.nuker.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { reasonKey: "automod.nuker.tempban1", duration: "10m" }, resetFlagsAfterAction: true }
        ],
        "worldAutotool": [
            { flagThreshold: 10, actionType: "warn", parameters: { reasonKey: "automod.autotool.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { reasonKey: "automod.autotool.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { reasonKey: "automod.autotool.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "worldInstabreakUnbreakable": [
            { flagThreshold: 10, actionType: "warn", parameters: { reasonKey: "automod.instabreakunbreakable.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { reasonKey: "automod.instabreakunbreakable.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { reasonKey: "automod.instabreakunbreakable.tempban1", duration: "1h" }, resetFlagsAfterAction: true }
        ],
        "playerInventoryMod": [
            { flagThreshold: 9, actionType: "warn", parameters: { reasonKey: "automod.inventorymod.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "kick", parameters: { reasonKey: "automod.inventorymod.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 27, actionType: "tempBan", parameters: { reasonKey: "automod.inventorymod.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "worldTowerBuild": [
            { flagThreshold: 10, actionType: "warn", parameters: { reasonKey: "automod.tower.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { reasonKey: "automod.tower.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { reasonKey: "automod.tower.tempban1", duration: "10m" }, resetFlagsAfterAction: true }
        ],
        "worldFlatRotationBuilding": [
            { flagThreshold: 10, actionType: "warn", parameters: { reasonKey: "automod.flatrotation.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { reasonKey: "automod.flatrotation.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { reasonKey: "automod.flatrotation.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "worldDownwardScaffold": [
            { flagThreshold: 9, actionType: "warn", parameters: { reasonKey: "automod.downscaffold.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "kick", parameters: { reasonKey: "automod.downscaffold.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 27, actionType: "tempBan", parameters: { reasonKey: "automod.downscaffold.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "worldAirPlace": [
            { flagThreshold: 15, actionType: "warn", parameters: { reasonKey: "automod.airplace.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "kick", parameters: { reasonKey: "automod.airplace.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 45, actionType: "tempBan", parameters: { reasonKey: "automod.airplace.tempban1", duration: "5m" }, resetFlagsAfterAction: true }
        ],
        "worldFastPlace": [
            { flagThreshold: 15, actionType: "warn", parameters: { reasonKey: "automod.fastplace.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "kick", parameters: { reasonKey: "automod.fastplace.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 45, actionType: "tempBan", parameters: { reasonKey: "automod.fastplace.tempban1", duration: "10m" }, resetFlagsAfterAction: true }
        ],
        "chatSwearViolation": [
            { flagThreshold: 3, actionType: "warn", parameters: { reasonKey: "automod.swear.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 5, actionType: "mute", parameters: { reasonKey: "automod.swear.mute1", duration: "10m" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "mute", parameters: { reasonKey: "automod.swear.mute2", duration: "1h" }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefTntPlace": [
            { flagThreshold: 5, actionType: "warn", parameters: { reasonKey: "automod.tnt.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "kick", parameters: { reasonKey: "automod.tnt.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "tempBan", parameters: { reasonKey: "automod.tnt.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefWitherSpawn": [
            { flagThreshold: 5, actionType: "warn", parameters: { reasonKey: "automod.wither.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "kick", parameters: { reasonKey: "automod.wither.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "tempBan", parameters: { reasonKey: "automod.wither.tempban1", duration: "1h" }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefFire": [
            { flagThreshold: 10, actionType: "warn", parameters: { reasonKey: "automod.fire.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { reasonKey: "automod.fire.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { reasonKey: "automod.fire.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefLava": [
            { flagThreshold: 10, actionType: "warn", parameters: { reasonKey: "automod.lava.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { reasonKey: "automod.lava.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { reasonKey: "automod.lava.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefWater": [
            { flagThreshold: 15, actionType: "warn", parameters: { reasonKey: "automod.water.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "kick", parameters: { reasonKey: "automod.water.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 45, actionType: "tempBan", parameters: { reasonKey: "automod.water.tempban1", duration: "10m" }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefBlockspam": [
            { flagThreshold: 15, actionType: "warn", parameters: { reasonKey: "automod.blockspam.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "kick", parameters: { reasonKey: "automod.blockspam.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 45, actionType: "tempBan", parameters: { reasonKey: "automod.blockspam.tempban1", duration: "5m" }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefEntityspam": [
            { flagThreshold: 15, actionType: "warn", parameters: { reasonKey: "automod.entityspam.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "kick", parameters: { reasonKey: "automod.entityspam.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 45, actionType: "tempBan", parameters: { reasonKey: "automod.entityspam.tempban1", duration: "10m" }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefBlockspamDensity": [
            { flagThreshold: 10, actionType: "warn", parameters: { reasonKey: "automod.densityspam.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "kick", parameters: { reasonKey: "automod.densityspam.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "tempBan", parameters: { reasonKey: "automod.densityspam.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "playerSelfHurt": [
            { flagThreshold: 6, actionType: "warn", parameters: { reasonKey: "automod.selfhurt.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "kick", parameters: { reasonKey: "automod.selfhurt.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "tempBan", parameters: { reasonKey: "automod.selfhurt.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "chatAdvertisingDetected": [
            { flagThreshold: 2, actionType: "warn", parameters: { reasonKey: "automod.chat.advertising.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 4, actionType: "mute", parameters: { reasonKey: "automod.chat.advertising.mute1", duration: "10m" }, resetFlagsAfterAction: true },
            { flagThreshold: 6, actionType: "kick", parameters: { reasonKey: "automod.chat.advertising.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 8, actionType: "tempBan", parameters: { reasonKey: "automod.chat.advertising.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "chatCapsAbuseDetected": [
            { flagThreshold: 3, actionType: "warn", parameters: { reasonKey: "automod.chat.caps.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 6, actionType: "mute", parameters: { reasonKey: "automod.chat.caps.mute1", duration: "5m" }, resetFlagsAfterAction: true },
            { flagThreshold: 10, actionType: "mute", parameters: { reasonKey: "automod.chat.caps.mute2", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "chatCharRepeatDetected": [
            { flagThreshold: 3, actionType: "warn", parameters: { reasonKey: "automod.chat.charrepeat.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 6, actionType: "mute", parameters: { reasonKey: "automod.chat.charrepeat.mute1", duration: "5m" }, resetFlagsAfterAction: true },
            { flagThreshold: 10, actionType: "mute", parameters: { reasonKey: "automod.chat.charrepeat.mute2", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "chatSymbolSpamDetected": [
            { flagThreshold: 3, actionType: "warn", parameters: { reasonKey: "automod.chat.symbolspam.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 6, actionType: "mute", parameters: { reasonKey: "automod.chat.symbolspam.mute1", duration: "5m" }, resetFlagsAfterAction: true },
            { flagThreshold: 10, actionType: "mute", parameters: { reasonKey: "automod.chat.symbolspam.mute2", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "chatNewline": [
            { flagThreshold: 2, actionType: "warn", parameters: { reasonKey: "automod.chat.newline.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 4, actionType: "mute", parameters: { reasonKey: "automod.chat.newline.mute1", duration: "5m" }, resetFlagsAfterAction: true }
        ],
        "chatMaxlength": [
            { flagThreshold: 2, actionType: "warn", parameters: { reasonKey: "automod.chat.maxlength.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 4, actionType: "mute", parameters: { reasonKey: "automod.chat.maxlength.mute1", duration: "5m" }, resetFlagsAfterAction: true }
        ],
        "movementNetherRoof": [
            { flagThreshold: 1, actionType: "warn", parameters: { reasonKey: "automod.netherroof.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 2, actionType: "teleportSafe", parameters: { reasonKey: "automod.netherroof.teleport1", coordinates: { y: 120 } }, resetFlagsAfterAction: false },
            { flagThreshold: 3, actionType: "kick", parameters: { reasonKey: "automod.netherroof.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 5, actionType: "tempBan", parameters: { reasonKey: "automod.netherroof.tempban1", duration: "1h" }, resetFlagsAfterAction: true }
        ],
        "movementHighYVelocity": [
            { flagThreshold: 3, actionType: "warn", parameters: { reasonKey: "automod.fly.high_y_velocity.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 6, actionType: "kick", parameters: { reasonKey: "automod.fly.high_y_velocity.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "tempBan", parameters: { reasonKey: "automod.fly.high_y_velocity.tempban1", duration: "10m" }, resetFlagsAfterAction: true }
        ],
        "movementSustainedFly": [
            { flagThreshold: 5, actionType: "warn", parameters: { reasonKey: "automod.fly.sustained_fly.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "kick", parameters: { reasonKey: "automod.fly.sustained_fly.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "tempBan", parameters: { reasonKey: "automod.fly.sustained_fly.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "worldAntigriefPistonLag": [
            { flagThreshold: 1, actionType: "flagOnly", parameters: { reasonKey: "automod.pistonlag.flag1" }, resetFlagsAfterAction: true }
        ]
        // Add more checkTypes here in the future
    },

    /**
     * Stores user-facing messages for AutoMod actions.
     * Keys are `reasonKey` strings (e.g., "automod.fly.hover.warn") used in `AutoModRule.parameters`.
     * Values are the message strings.
     * Example: "automod.fly.hover.warn": "AutoMod: Flying (hover) detected. Please return to the ground."
     */
    automodActionMessages: {
        // General structure: "AutoMod [{actionType}|{checkType}]: {playerName}, specific message (Flags: {flagCount}/{flagThreshold}). [Punishment details: {duration}]"
        // For kicks/bans, the entire message is the reason.

        "automod.fly.hover.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, persistent hovering detected (Flags: {flagCount}/{flagThreshold}). Please adhere to server rules.",
        "automod.fly.hover.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for continued hovering violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.fly.hover.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive hovering violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.speed.ground.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, excessive ground speed detected (Flags: {flagCount}/{flagThreshold}). Please play fairly.",
        "automod.speed.ground.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated ground speed violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.speed.ground.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to repeated ground speed violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.cps.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, high click speed detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.cps.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated high click speed violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.cps.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive click speed violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.nofall.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, NoFall (fall damage negation) detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.nofall.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated NoFall violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.nofall.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive NoFall violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.illegalitem.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, use of illegal items ({itemTypeId}) detected (Flags: {flagCount}/{flagThreshold}). Items may be removed if behavior persists.",
        "automod.illegalitem.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated use of illegal items ({itemTypeId}) (Flags: {flagCount}/{flagThreshold}).",
        "automod.illegalitem.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive use of illegal items ({itemTypeId}) (Flags: {flagCount}/{flagThreshold}).",
        "automod.namespoof.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, name spoofing detected (Flags: {flagCount}/{flagThreshold}). Please change your name.",
        "automod.namespoof.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated name spoofing violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.namespoof.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive name spoofing violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.reach.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, excessive reach detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.reach.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated reach violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.reach.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive reach violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.noslow.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, NoSlow (movement exploit) detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.noslow.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated NoSlow violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.noslow.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive NoSlow violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.fastuse.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, fast item usage detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.fastuse.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated fast item usage (Flags: {flagCount}/{flagThreshold}).",
        "automod.fastuse.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive fast item usage (Flags: {flagCount}/{flagThreshold}).",
        "automod.antigmc.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for unauthorized Creative Mode usage (Flags: {flagCount}/{flagThreshold}).",
        "automod.antigmc.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for repeated unauthorized Creative Mode usage (Flags: {flagCount}/{flagThreshold}).",
        "automod.antigmc.permban1": "AutoMod [{actionType}|{checkType}]: {playerName} permanently banned for repeated unauthorized Creative Mode usage (Flags: {flagCount}/{flagThreshold}).",
        "automod.multitarget.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, attacking multiple targets too quickly (Flags: {flagCount}/{flagThreshold}). Please play fairly.",
        "automod.multitarget.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated multi-target aura violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.multitarget.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive multi-target aura violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.illegalplace.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, placing illegal or restricted items ({itemTypeId}) detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.illegalplace.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeatedly placing illegal items ({itemTypeId}) (Flags: {flagCount}/{flagThreshold}).",
        "automod.illegalplace.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessively placing illegal items ({itemTypeId}) (Flags: {flagCount}/{flagThreshold}).",
        "automod.invalidsprint.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, sprinting under invalid conditions detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.invalidsprint.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated invalid sprint violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.invalidsprint.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive invalid sprint violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.chatfast.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, please do not send messages so quickly (Flags: {flagCount}/{flagThreshold}).",
        "automod.chatfast.mute1": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for sending messages too quickly (Flags: {flagCount}/{flagThreshold}).",
        "automod.chatfast.mute2": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent fast message spam (Flags: {flagCount}/{flagThreshold}).",
        "automod.invalidpitch.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, invalid viewing angles detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.invalidpitch.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated invalid viewing angles (Flags: {flagCount}/{flagThreshold}).",
        "automod.invalidpitch.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive invalid viewing angles (Flags: {flagCount}/{flagThreshold}).",
        "automod.attacksleep.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, attacking while sleeping detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.attacksleep.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeatedly attacking while sleeping (Flags: {flagCount}/{flagThreshold}).",
        "automod.attacksleep.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessively attacking while sleeping (Flags: {flagCount}/{flagThreshold}).",
        "automod.instabreak.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, breaking blocks too quickly detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.instabreak.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated instabreak violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.instabreak.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive instabreak violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.chatmaxwords.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, please avoid sending messages with excessive words (Flags: {flagCount}/{flagThreshold}).",
        "automod.chatmaxwords.mute1": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for sending messages with too many words (Flags: {flagCount}/{flagThreshold}).",
        "automod.chatmaxwords.mute2": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent overly long messages (Flags: {flagCount}/{flagThreshold}).",
        "automod.viewsnap.pitch.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, suspicious vertical camera movements detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.viewsnap.pitch.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated suspicious vertical camera movements (Flags: {flagCount}/{flagThreshold}).",
        "automod.viewsnap.pitch.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive suspicious vertical camera movements (Flags: {flagCount}/{flagThreshold}).",
        "automod.viewsnap.yaw.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, suspicious horizontal camera movements detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.viewsnap.yaw.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated suspicious horizontal camera movements (Flags: {flagCount}/{flagThreshold}).",
        "automod.viewsnap.yaw.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive suspicious horizontal camera movements (Flags: {flagCount}/{flagThreshold}).",
        "automod.attackconsume.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, attacking while consuming items detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.attackconsume.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeatedly attacking while consuming items (Flags: {flagCount}/{flagThreshold}).",
        "automod.attackconsume.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessively attacking while consuming items (Flags: {flagCount}/{flagThreshold}).",
        "automod.renderdistance.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, invalid client render distance reported (Flags: {flagCount}/{flagThreshold}).",
        "automod.renderdistance.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeatedly reporting invalid render distance (Flags: {flagCount}/{flagThreshold}).",
        "automod.renderdistance.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for persistently reporting invalid render distance (Flags: {flagCount}/{flagThreshold}).",
        "automod.attackbow.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, attacking while charging a bow detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.attackbow.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeatedly attacking while charging a bow (Flags: {flagCount}/{flagThreshold}).",
        "automod.attackbow.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessively attacking while charging a bow (Flags: {flagCount}/{flagThreshold}).",
        "automod.attackshield.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, attacking while shielding detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.attackshield.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeatedly attacking while shielding (Flags: {flagCount}/{flagThreshold}).",
        "automod.attackshield.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessively attacking while shielding (Flags: {flagCount}/{flagThreshold}).",
        "automod.chatcombat.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, please avoid chatting during combat cooldown (Flags: {flagCount}/{flagThreshold}).",
        "automod.chatcombat.mute1": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for chatting during combat cooldown (Flags: {flagCount}/{flagThreshold}).",
        "automod.chatcombat.mute2": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistently chatting during combat cooldown (Flags: {flagCount}/{flagThreshold}).",
        "automod.chatitemuse.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, please avoid chatting while using items (Flags: {flagCount}/{flagThreshold}).",
        "automod.chatitemuse.mute1": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for chatting while using items (Flags: {flagCount}/{flagThreshold}).",
        "automod.chatitemuse.mute2": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistently chatting while using items (Flags: {flagCount}/{flagThreshold}).",
        "automod.nuker.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, Nuker activity detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.nuker.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent Nuker activity (Flags: {flagCount}/{flagThreshold}).",
        "automod.nuker.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive Nuker activity (Flags: {flagCount}/{flagThreshold}).",
        "automod.autotool.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, suspicious tool switching (AutoTool) detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.autotool.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent AutoTool activity (Flags: {flagCount}/{flagThreshold}).",
        "automod.autotool.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive AutoTool activity (Flags: {flagCount}/{flagThreshold}).",
        "automod.instabreakunbreakable.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, attempted to break an unbreakable block ({itemTypeId}) (Flags: {flagCount}/{flagThreshold}).",
        "automod.instabreakunbreakable.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for attempting to break unbreakable blocks ({itemTypeId}) (Flags: {flagCount}/{flagThreshold}).",
        "automod.instabreakunbreakable.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for persistent attempts to break unbreakable blocks ({itemTypeId}) (Flags: {flagCount}/{flagThreshold}).",
        "automod.inventorymod.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, suspicious inventory manipulation detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.inventorymod.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent inventory manipulation (Flags: {flagCount}/{flagThreshold}).",
        "automod.inventorymod.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive inventory manipulation (Flags: {flagCount}/{flagThreshold}).",
        "automod.tower.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, rapid tower building detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.tower.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent tower building (Flags: {flagCount}/{flagThreshold}).",
        "automod.tower.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive tower building (Flags: {flagCount}/{flagThreshold}).",
        "automod.flatrotation.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, unnatural building rotation detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.flatrotation.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent unnatural building rotation (Flags: {flagCount}/{flagThreshold}).",
        "automod.flatrotation.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive unnatural building rotation (Flags: {flagCount}/{flagThreshold}).",
        "automod.downscaffold.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, downward scaffolding detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.downscaffold.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent downward scaffolding (Flags: {flagCount}/{flagThreshold}).",
        "automod.downscaffold.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive downward scaffolding (Flags: {flagCount}/{flagThreshold}).",
        "automod.airplace.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, placing blocks in air detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.airplace.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent air placement (Flags: {flagCount}/{flagThreshold}).",
        "automod.airplace.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive air placement (Flags: {flagCount}/{flagThreshold}).",
        "automod.fastplace.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, placing blocks too quickly detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.fastplace.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent fast placement (Flags: {flagCount}/{flagThreshold}).",
        "automod.fastplace.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive fast placement (Flags: {flagCount}/{flagThreshold}).",
        "automod.swear.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, swear word detected in chat (Flags: {flagCount}/{flagThreshold}). Please be respectful.",
        "automod.swear.mute1": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for using inappropriate language (Flags: {flagCount}/{flagThreshold}).",
        "automod.swear.mute2": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent use of inappropriate language (Flags: {flagCount}/{flagThreshold}).",
        "automod.tnt.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, unauthorized TNT placement detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.tnt.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent unauthorized TNT placement (Flags: {flagCount}/{flagThreshold}).",
        "automod.tnt.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive unauthorized TNT placement (Flags: {flagCount}/{flagThreshold}).",
        "automod.wither.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, unauthorized Wither spawning activity detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.wither.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent unauthorized Wither spawning (Flags: {flagCount}/{flagThreshold}).",
        "automod.wither.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive unauthorized Wither spawning (Flags: {flagCount}/{flagThreshold}).",
        "automod.fire.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, unauthorized fire placement detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.fire.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent unauthorized fire placement (Flags: {flagCount}/{flagThreshold}).",
        "automod.fire.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive unauthorized fire placement (Flags: {flagCount}/{flagThreshold}).",
        "automod.lava.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, unauthorized lava placement detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.lava.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent unauthorized lava placement (Flags: {flagCount}/{flagThreshold}).",
        "automod.lava.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive unauthorized lava placement (Flags: {flagCount}/{flagThreshold}).",
        "automod.water.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, unauthorized water placement detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.water.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent unauthorized water placement (Flags: {flagCount}/{flagThreshold}).",
        "automod.water.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive unauthorized water placement (Flags: {flagCount}/{flagThreshold}).",
        "automod.blockspam.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, block spamming detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.blockspam.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent block spamming (Flags: {flagCount}/{flagThreshold}).",
        "automod.blockspam.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive block spamming (Flags: {flagCount}/{flagThreshold}).",
        "automod.entityspam.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, entity spamming detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.entityspam.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent entity spamming (Flags: {flagCount}/{flagThreshold}).",
        "automod.entityspam.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive entity spamming (Flags: {flagCount}/{flagThreshold}).",
        "automod.densityspam.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, high-density block spamming detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.densityspam.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent high-density block spamming (Flags: {flagCount}/{flagThreshold}).",
        "automod.densityspam.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive high-density block spamming (Flags: {flagCount}/{flagThreshold}).",
        "automod.selfhurt.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, suspicious self-inflicted damage detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.selfhurt.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated suspicious self-inflicted damage (Flags: {flagCount}/{flagThreshold}).",
        "automod.selfhurt.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive self-inflicted damage (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.advertising.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, advertising is not allowed (Flags: {flagCount}/{flagThreshold}). Please review server rules.",
        "automod.chat.advertising.mute1": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for advertising (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.advertising.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent advertising (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.advertising.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive advertising (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.caps.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, excessive capitalization detected (Flags: {flagCount}/{flagThreshold}). Please disable caps lock.",
        "automod.chat.caps.mute1": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for excessive caps (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.caps.mute2": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent caps abuse (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.contentrepeat.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, please avoid repeating the same message content (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.contentrepeat.mute1": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for repeating message content (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.contentrepeat.mute2": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent message content repetition (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.unicodeabuse.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, please avoid using excessive special characters or text effects that disrupt chat (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.unicodeabuse.mute1": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for disruptive text patterns (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.unicodeabuse.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent use of disruptive text patterns (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.excessivementions.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, please avoid mentioning too many users or the same user repeatedly in a single message (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.excessivementions.mute1": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for excessive user mentions (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.excessivementions.mute2": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent excessive user mentions (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.gibberish.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, please ensure your messages are readable and contribute to the conversation (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.gibberish.mute1": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} due to unreadable message patterns (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.gibberish.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for persistent unreadable or gibberish messages (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.impersonation.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, your message format appears to mimic server or staff announcements (Flags: {flagCount}/{flagThreshold}). Please avoid this.",
        "automod.chat.impersonation.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for attempting to impersonate server or staff messages (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.impersonation.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for persistent attempts to impersonate server or staff messages (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.charrepeat.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, excessive character repetition detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.charrepeat.mute1": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for character repetition (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.charrepeat.mute2": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent character repetition (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.symbolspam.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, excessive symbol usage detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.symbolspam.mute1": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for symbol spam (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.symbolspam.mute2": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent symbol spam (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.newline.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, newlines in chat are not allowed (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.newline.mute1": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for using newlines in chat (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.maxlength.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, message is too long (Flags: {flagCount}/{flagThreshold}).",
        "automod.chat.maxlength.mute1": "AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for sending overly long messages (Flags: {flagCount}/{flagThreshold}).",
        "automod.netherroof.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, detected on the Nether roof (Flags: {flagCount}/{flagThreshold}). This area is restricted.",
        "automod.netherroof.teleport1": "AutoMod [{actionType}|{checkType}]: Teleporting {playerName} from the Nether roof to {teleportCoordinates} (Flags: {flagCount}/{flagThreshold}).",
        "automod.netherroof.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeatedly accessing the Nether roof (Flags: {flagCount}/{flagThreshold}).",
        "automod.netherroof.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for persistent Nether roof violations (Flags: {flagCount}/{flagThreshold}).",
        "automod.fly.high_y_velocity.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, excessive vertical acceleration detected (Flags: {flagCount}/{flagThreshold}).",
        "automod.fly.high_y_velocity.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for excessive vertical acceleration (Flags: {flagCount}/{flagThreshold}).",
        "automod.fly.high_y_velocity.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for excessive vertical acceleration (Flags: {flagCount}/{flagThreshold}).",
        "automod.fly.sustained_fly.warn1": "AutoMod [{actionType}|{checkType}]: {playerName}, sustained flight detected (Flags: {flagCount}/{flagThreshold}). Please land.",
        "automod.fly.sustained_fly.kick1": "AutoMod [{actionType}|{checkType}]: Kicked {playerName} for sustained flight (Flags: {flagCount}/{flagThreshold}).",
        "automod.fly.sustained_fly.tempban1": "AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for sustained flight (Flags: {flagCount}/{flagThreshold}).",
        "automod.pistonlag.flag1": "AutoMod [{actionType}|{checkType}]: Potential piston lag machine detected involving {playerName} (Flags: {flagCount}/{flagThreshold}). Logged."
        // Add more messages here
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
