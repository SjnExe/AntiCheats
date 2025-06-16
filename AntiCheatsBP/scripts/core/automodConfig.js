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
        "chatGibberish": [
            { "flagThreshold": 3, "actionType": "warn", "parameters": { "reasonKey": "automod.chat.gibberish.warn1" }, "resetFlagsAfterAction": false },
            { "flagThreshold": 6, "actionType": "mute", "parameters": { "reasonKey": "automod.chat.gibberish.mute1", "duration": "5m" }, "resetFlagsAfterAction": true },
            { "flagThreshold": 9, "actionType": "kick", "parameters": { "reasonKey": "automod.chat.gibberish.kick1" }, "resetFlagsAfterAction": true }
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
        "automod.fly.hover.warn1": "AutoMod: Persistent hovering detected. Please adhere to server rules.",
        "automod.fly.hover.kick1": "AutoMod: Kicked for continued hovering violations.",
        "automod.fly.hover.tempban1": "AutoMod: Temporarily banned for excessive hovering violations.",
        "automod.speed.ground.warn1": "AutoMod: Excessive ground speed detected. Please play fairly.",
        "automod.speed.ground.kick1": "AutoMod: Kicked for repeated ground speed violations.",
        "automod.speed.ground.tempban1": "AutoMod: Temporarily banned for repeated ground speed violations.",
        "automod.cps.warn1": "AutoMod: High click speed detected multiple times.",
        "automod.cps.kick1": "AutoMod: Kicked for repeated high click speed violations.",
        "automod.cps.tempban1": "AutoMod: Temporarily banned for excessive click speed violations.",
        "automod.nofall.warn1": "AutoMod: NoFall (fall damage negation) detected multiple times.",
        "automod.nofall.kick1": "AutoMod: Kicked for repeated NoFall violations.",
        "automod.nofall.tempban1": "AutoMod: Temporarily banned for excessive NoFall violations.",
        "automod.illegalitem.warn1": "AutoMod: Use of illegal items detected. Items may be removed if behavior persists.",
        "automod.illegalitem.kick1": "AutoMod: Kicked for repeated use of illegal items.",
        "automod.illegalitem.tempban1": "AutoMod: Temporarily banned for excessive use of illegal items.",
        "automod.namespoof.warn1": "AutoMod: Name spoofing detected. Please change your name.",
        "automod.namespoof.kick1": "AutoMod: Kicked for repeated name spoofing violations.",
        "automod.namespoof.tempban1": "AutoMod: Temporarily banned for excessive name spoofing violations.",
        "automod.reach.warn1": "AutoMod: Excessive reach detected.",
        "automod.reach.kick1": "AutoMod: Kicked for repeated reach violations.",
        "automod.reach.tempban1": "AutoMod: Temporarily banned for excessive reach violations.",
        "automod.noslow.warn1": "AutoMod: NoSlow (movement exploit) detected.",
        "automod.noslow.kick1": "AutoMod: Kicked for repeated NoSlow violations.",
        "automod.noslow.tempban1": "AutoMod: Temporarily banned for excessive NoSlow violations.",
        "automod.fastuse.warn1": "AutoMod: Fast item usage detected.",
        "automod.fastuse.kick1": "AutoMod: Kicked for repeated fast item usage.",
        "automod.fastuse.tempban1": "AutoMod: Temporarily banned for excessive fast item usage.",
        "automod.antigmc.kick1": "AutoMod: Kicked for unauthorized Creative Mode usage.",
        "automod.antigmc.tempban1": "AutoMod: Temporarily banned for repeated unauthorized Creative Mode usage.",
        "automod.antigmc.permban1": "AutoMod: Permanently banned for repeated unauthorized Creative Mode usage.",
        "automod.multitarget.warn1": "AutoMod: Attacking multiple targets too quickly. Please play fairly.",
        "automod.multitarget.kick1": "AutoMod: Kicked for repeated multi-target aura violations.",
        "automod.multitarget.tempban1": "AutoMod: Temporarily banned for excessive multi-target aura violations.",
        "automod.illegalplace.warn1": "AutoMod: Placing illegal or restricted items detected.",
        "automod.illegalplace.kick1": "AutoMod: Kicked for repeatedly placing illegal items.",
        "automod.illegalplace.tempban1": "AutoMod: Temporarily banned for excessively placing illegal items.",
        "automod.invalidsprint.warn1": "AutoMod: Sprinting under invalid conditions detected multiple times.",
        "automod.invalidsprint.kick1": "AutoMod: Kicked for repeated invalid sprint violations.",
        "automod.invalidsprint.tempban1": "AutoMod: Temporarily banned for excessive invalid sprint violations.",
        "automod.chatfast.warn1": "AutoMod: Please do not send messages so quickly.",
        "automod.chatfast.mute1": "AutoMod: Muted for 5 minutes for sending messages too quickly.",
        "automod.chatfast.mute2": "AutoMod: Muted for 30 minutes for persistent fast message spam.",
        "automod.invalidpitch.warn1": "AutoMod: Invalid viewing angles detected multiple times.",
        "automod.invalidpitch.kick1": "AutoMod: Kicked for repeated invalid viewing angles.",
        "automod.invalidpitch.tempban1": "AutoMod: Temporarily banned for excessive invalid viewing angles.",
        "automod.attacksleep.warn1": "AutoMod: Attacking while sleeping detected.",
        "automod.attacksleep.kick1": "AutoMod: Kicked for repeatedly attacking while sleeping.",
        "automod.attacksleep.tempban1": "AutoMod: Temporarily banned for excessively attacking while sleeping.",
        "automod.instabreak.warn1": "AutoMod: Breaking blocks too quickly detected multiple times.",
        "automod.instabreak.kick1": "AutoMod: Kicked for repeated instabreak violations.",
        "automod.instabreak.tempban1": "AutoMod: Temporarily banned for excessive instabreak violations.",
        "automod.chatmaxwords.warn1": "AutoMod: Please avoid sending messages with excessive words.",
        "automod.chatmaxwords.mute1": "AutoMod: Muted for 5 minutes for sending messages with too many words.",
        "automod.chatmaxwords.mute2": "AutoMod: Muted for 30 minutes for persistent overly long messages.",
        "automod.viewsnap.pitch.warn1": "AutoMod: Suspicious vertical camera movements detected.",
        "automod.viewsnap.pitch.kick1": "AutoMod: Kicked for repeated suspicious vertical camera movements.",
        "automod.viewsnap.pitch.tempban1": "AutoMod: Temporarily banned for excessive suspicious vertical camera movements.",
        "automod.viewsnap.yaw.warn1": "AutoMod: Suspicious horizontal camera movements detected.",
        "automod.viewsnap.yaw.kick1": "AutoMod: Kicked for repeated suspicious horizontal camera movements.",
        "automod.viewsnap.yaw.tempban1": "AutoMod: Temporarily banned for excessive suspicious horizontal camera movements.",
        "automod.attackconsume.warn1": "AutoMod: Attacking while consuming items detected.",
        "automod.attackconsume.kick1": "AutoMod: Kicked for repeatedly attacking while consuming items.",
        "automod.attackconsume.tempban1": "AutoMod: Temporarily banned for excessively attacking while consuming items.",
        "automod.renderdistance.warn1": "AutoMod: Invalid client render distance reported.",
        "automod.renderdistance.kick1": "AutoMod: Kicked for repeatedly reporting invalid render distance.",
        "automod.renderdistance.tempban1": "AutoMod: Temporarily banned for persistently reporting invalid render distance.",
        "automod.attackbow.warn1": "AutoMod: Attacking while charging a bow detected.",
        "automod.attackbow.kick1": "AutoMod: Kicked for repeatedly attacking while charging a bow.",
        "automod.attackbow.tempban1": "AutoMod: Temporarily banned for excessively attacking while charging a bow.",
        "automod.attackshield.warn1": "AutoMod: Attacking while shielding detected.",
        "automod.attackshield.kick1": "AutoMod: Kicked for repeatedly attacking while shielding.",
        "automod.attackshield.tempban1": "AutoMod: Temporarily banned for excessively attacking while shielding.",
        "automod.chatcombat.warn1": "AutoMod: Please avoid chatting during combat cooldown.",
        "automod.chatcombat.mute1": "AutoMod: Muted for 5 minutes for chatting during combat cooldown.",
        "automod.chatcombat.mute2": "AutoMod: Muted for 15 minutes for persistently chatting during combat cooldown.",
        "automod.chatitemuse.warn1": "AutoMod: Please avoid chatting while using items.",
        "automod.chatitemuse.mute1": "AutoMod: Muted for 5 minutes for chatting while using items.",
        "automod.chatitemuse.mute2": "AutoMod: Muted for 15 minutes for persistently chatting while using items.",
        "automod.nuker.warn1": "AutoMod: Nuker (rapid/wide-area block breaking) activity detected.",
        "automod.nuker.kick1": "AutoMod: Kicked for persistent Nuker activity.",
        "automod.nuker.tempban1": "AutoMod: Temporarily banned for excessive Nuker activity.",
        "automod.autotool.warn1": "AutoMod: Suspicious tool switching (AutoTool) detected.",
        "automod.autotool.kick1": "AutoMod: Kicked for persistent AutoTool activity.",
        "automod.autotool.tempban1": "AutoMod: Temporarily banned for excessive AutoTool activity.",
        "automod.instabreakunbreakable.warn1": "AutoMod: Attempted to break an unbreakable block.",
        "automod.instabreakunbreakable.kick1": "AutoMod: Kicked for attempting to break unbreakable blocks.",
        "automod.instabreakunbreakable.tempban1": "AutoMod: Temporarily banned for persistent attempts to break unbreakable blocks.",
        "automod.inventorymod.warn1": "AutoMod: Suspicious inventory manipulation detected.",
        "automod.inventorymod.kick1": "AutoMod: Kicked for persistent inventory manipulation.",
        "automod.inventorymod.tempban1": "AutoMod: Temporarily banned for excessive inventory manipulation.",
        "automod.tower.warn1": "AutoMod: Rapid tower building detected.",
        "automod.tower.kick1": "AutoMod: Kicked for persistent tower building.",
        "automod.tower.tempban1": "AutoMod: Temporarily banned for excessive tower building.",
        "automod.flatrotation.warn1": "AutoMod: Unnatural building rotation detected.",
        "automod.flatrotation.kick1": "AutoMod: Kicked for persistent unnatural building rotation.",
        "automod.flatrotation.tempban1": "AutoMod: Temporarily banned for excessive unnatural building rotation.",
        "automod.downscaffold.warn1": "AutoMod: Downward scaffolding detected.",
        "automod.downscaffold.kick1": "AutoMod: Kicked for persistent downward scaffolding.",
        "automod.downscaffold.tempban1": "AutoMod: Temporarily banned for excessive downward scaffolding.",
        "automod.airplace.warn1": "AutoMod: Placing blocks in air detected.",
        "automod.airplace.kick1": "AutoMod: Kicked for persistent air placement.",
        "automod.airplace.tempban1": "AutoMod: Temporarily banned for excessive air placement.",
        "automod.fastplace.warn1": "AutoMod: Placing blocks too quickly detected.",
        "automod.fastplace.kick1": "AutoMod: Kicked for persistent fast placement.",
        "automod.fastplace.tempban1": "AutoMod: Temporarily banned for excessive fast placement.",
        "automod.swear.warn1": "AutoMod: Swear word detected in chat. Please be respectful.",
        "automod.swear.mute1": "AutoMod: Muted for 10 minutes for using inappropriate language.",
        "automod.swear.mute2": "AutoMod: Muted for 1 hour for persistent use of inappropriate language.",
        "automod.tnt.warn1": "AutoMod: Unauthorized TNT placement detected.",
        "automod.tnt.kick1": "AutoMod: Kicked for persistent unauthorized TNT placement.",
        "automod.tnt.tempban1": "AutoMod: Temporarily banned for excessive unauthorized TNT placement.",
        "automod.wither.warn1": "AutoMod: Unauthorized Wither spawning activity detected.",
        "automod.wither.kick1": "AutoMod: Kicked for persistent unauthorized Wither spawning.",
        "automod.wither.tempban1": "AutoMod: Temporarily banned for excessive unauthorized Wither spawning.",
        "automod.fire.warn1": "AutoMod: Unauthorized fire placement detected.",
        "automod.fire.kick1": "AutoMod: Kicked for persistent unauthorized fire placement.",
        "automod.fire.tempban1": "AutoMod: Temporarily banned for excessive unauthorized fire placement.",
        "automod.lava.warn1": "AutoMod: Unauthorized lava placement detected.",
        "automod.lava.kick1": "AutoMod: Kicked for persistent unauthorized lava placement.",
        "automod.lava.tempban1": "AutoMod: Temporarily banned for excessive unauthorized lava placement.",
        "automod.water.warn1": "AutoMod: Unauthorized water placement detected.",
        "automod.water.kick1": "AutoMod: Kicked for persistent unauthorized water placement.",
        "automod.water.tempban1": "AutoMod: Temporarily banned for excessive unauthorized water placement.",
        "automod.blockspam.warn1": "AutoMod: Block spamming detected.",
        "automod.blockspam.kick1": "AutoMod: Kicked for persistent block spamming.",
        "automod.blockspam.tempban1": "AutoMod: Temporarily banned for excessive block spamming.",
        "automod.entityspam.warn1": "AutoMod: Entity spamming detected.",
        "automod.entityspam.kick1": "AutoMod: Kicked for persistent entity spamming.",
        "automod.entityspam.tempban1": "AutoMod: Temporarily banned for excessive entity spamming.",
        "automod.densityspam.warn1": "AutoMod: High-density block spamming detected.",
        "automod.densityspam.kick1": "AutoMod: Kicked for persistent high-density block spamming.",
        "automod.densityspam.tempban1": "AutoMod: Temporarily banned for excessive high-density block spamming.",
        "automod.selfhurt.warn1": "AutoMod: Suspicious self-inflicted damage detected.",
        "automod.selfhurt.kick1": "AutoMod: Kicked for repeated suspicious self-inflicted damage.",
        "automod.selfhurt.tempban1": "AutoMod: Temporarily banned for excessive self-inflicted damage.",
        "automod.chat.advertising.warn1": "AutoMod: Advertising is not allowed. Please review server rules.",
        "automod.chat.advertising.mute1": "AutoMod: Muted for 10 minutes for advertising.",
        "automod.chat.advertising.kick1": "AutoMod: Kicked for persistent advertising.",
        "automod.chat.advertising.tempban1": "AutoMod: Temporarily banned for excessive advertising.",
        "automod.chat.caps.warn1": "AutoMod: Excessive capitalization detected. Please disable caps lock.",
        "automod.chat.caps.mute1": "AutoMod: Muted for 5 minutes for excessive caps.",
        "automod.chat.caps.mute2": "AutoMod: Muted for 15 minutes for persistent caps abuse.",
        "automod.chat.contentrepeat.warn1": "AutoMod: Please avoid repeating the same message content.",
        "automod.chat.contentrepeat.mute1": "AutoMod: Muted for 5 minutes for repeating message content.",
        "automod.chat.contentrepeat.mute2": "AutoMod: Muted for 30 minutes for persistent message content repetition.",
        "automod.chat.unicodeabuse.warn1": "AutoMod: Please avoid using excessive special characters or text effects that disrupt chat.",
        "automod.chat.unicodeabuse.mute1": "AutoMod: Muted for 10 minutes for disruptive text patterns.",
        "automod.chat.unicodeabuse.kick1": "AutoMod: Kicked for persistent use of disruptive text patterns.",
        "automod.chat.gibberish.warn1": "AutoMod: Please ensure your messages are readable and contribute to the conversation.",
        "automod.chat.gibberish.mute1": "AutoMod: Muted for 5 minutes due to unreadable message patterns.",
        "automod.chat.gibberish.kick1": "AutoMod: Kicked for persistent unreadable or gibberish messages.",
        "automod.chat.charrepeat.warn1": "AutoMod: Excessive character repetition detected.",
        "automod.chat.charrepeat.mute1": "AutoMod: Muted for 5 minutes for character repetition.",
        "automod.chat.charrepeat.mute2": "AutoMod: Muted for 15 minutes for persistent character repetition.",
        "automod.chat.symbolspam.warn1": "AutoMod: Excessive symbol usage detected.",
        "automod.chat.symbolspam.mute1": "AutoMod: Muted for 5 minutes for symbol spam.",
        "automod.chat.symbolspam.mute2": "AutoMod: Muted for 15 minutes for persistent symbol spam.",
        "automod.chat.newline.warn1": "AutoMod: Newlines in chat are not allowed.",
        "automod.chat.newline.mute1": "AutoMod: Muted for 5 minutes for using newlines in chat.",
        "automod.chat.maxlength.warn1": "AutoMod: Message is too long.",
        "automod.chat.maxlength.mute1": "AutoMod: Muted for 5 minutes for sending overly long messages.",
        "automod.netherroof.warn1": "AutoMod: Detected on the Nether roof. This area is restricted.",
        "automod.netherroof.teleport1": "AutoMod: Teleporting you down from the Nether roof.",
        "automod.netherroof.kick1": "AutoMod: Kicked for repeatedly accessing the Nether roof.",
        "automod.netherroof.tempban1": "AutoMod: Temporarily banned for persistent Nether roof violations.",
        "automod.fly.high_y_velocity.warn1": "AutoMod: Excessive vertical acceleration detected.",
        "automod.fly.high_y_velocity.kick1": "AutoMod: Kicked for excessive vertical acceleration.",
        "automod.fly.high_y_velocity.tempban1": "AutoMod: Temporarily banned for excessive vertical acceleration.",
        "automod.fly.sustained_fly.warn1": "AutoMod: Sustained flight detected. Please land.",
        "automod.fly.sustained_fly.kick1": "AutoMod: Kicked for sustained flight.",
        "automod.fly.sustained_fly.tempban1": "AutoMod: Temporarily banned for sustained flight.",
        "automod.pistonlag.flag1": "AutoMod: Potential piston lag machine detected and logged."
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
        "chatUnicodeAbuse": false,
        "chatGibberish": false,
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

[end of AntiCheatsBP/scripts/core/automodConfig.js]
