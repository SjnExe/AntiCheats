/**
 * @file Stores the configuration for the AutoMod system.
 * @module AntiCheatsBP/scripts/core/automodConfig
 * @typedef {import('../types.js').AutoModActionParameters} AutoModActionParameters
 * @typedef {import('../types.js').AutoModTierRule} AutoModTierRule
 * @typedef {object} AutoModRuleDef
 * @property {string} checkType The type of check this rule applies to.
 * @property {boolean} enabled Whether this rule is enabled.
 * @property {string} [description] A description of the rule.
 * @property {number} [resetFlagsAfterSeconds] The number of seconds after which to reset the flags for this rule.
 * @property {AutoModTierRule[]} tiers The tiers of actions to take based on the flag count.
 */
/** @type {{ automodRuleSets: AutoModRuleDef[] }} */
export const automodConfig = {
    automodRuleSets: [
        {
            checkType: 'movementFlyHover',
            enabled: false,
            description: 'Actions for persistent hovering/flying.',
            resetFlagsAfterSeconds: 300,
            tiers: [
                { flagThreshold: 10, actionType: 'warn', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName}, persistent hovering detected (Flags: {flagCount}/{flagThreshold}). Please adhere to server rules.' }, resetFlagsAfterAction: false },
                { flagThreshold: 20, actionType: 'kick', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: Kicked {playerName} for continued hovering violations (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
                { flagThreshold: 30, actionType: 'tempBan', parameters: { duration: '15m', messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive hovering violations (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
            ],
        },
        {
            checkType: 'movementSpeed',
            enabled: false,
            description: 'Actions for excessive ground speed.',
            tiers: [
                { flagThreshold: 15, actionType: 'warn', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName}, excessive ground speed detected (Flags: {flagCount}/{flagThreshold}). Please play fairly.' }, resetFlagsAfterAction: false },
                { flagThreshold: 25, actionType: 'kick', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated ground speed violations (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
                { flagThreshold: 35, actionType: 'tempBan', parameters: { duration: '5m', messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to repeated ground speed violations (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
            ],
        },
        {
            checkType: 'combatCpsHigh',
            enabled: false,
            description: 'Actions for abnormally high CPS.',
            tiers: [
                { flagThreshold: 10, actionType: 'warn', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName}, high click speed detected (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: false },
                { flagThreshold: 20, actionType: 'kick', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated high click speed violations (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
                { flagThreshold: 30, actionType: 'tempBan', parameters: { duration: '15m', messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive click speed violations (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
            ],
        },
        {
            checkType: 'movementNoFall',
            enabled: false,
            description: 'Actions for fall damage negation.',
            tiers: [
                { flagThreshold: 9, actionType: 'warn', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName}, NoFall (fall damage negation) detected (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: false },
                { flagThreshold: 18, actionType: 'kick', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated NoFall violations (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
                { flagThreshold: 27, actionType: 'tempBan', parameters: { duration: '30m', messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive NoFall violations (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
            ],
        },
        {
            checkType: 'worldIllegalItemUse',
            enabled: false,
            description: 'Actions for using illegal/banned items.',
            tiers: [
                { flagThreshold: 6, actionType: 'warn', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName}, use of illegal items ({itemTypeId}) detected (Flags: {flagCount}/{flagThreshold}). Items may be removed if behavior persists.' }, resetFlagsAfterAction: false },
                { flagThreshold: 12, actionType: 'kick', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated use of illegal items ({itemTypeId}) (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
                { flagThreshold: 20, actionType: 'tempBan', parameters: { duration: '30m', messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive use of illegal items ({itemTypeId}) (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
            ],
        },
        {
            checkType: 'playerNameSpoof',
            enabled: false,
            description: 'Actions for invalid or suspicious player nameTags.',
            tiers: [
                { flagThreshold: 10, actionType: 'warn', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName}, name spoofing detected (Flags: {flagCount}/{flagThreshold}). Please change your name.' }, resetFlagsAfterAction: false },
                { flagThreshold: 15, actionType: 'kick', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeated name spoofing violations (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
                { flagThreshold: 20, actionType: 'tempBan', parameters: { duration: '30m', messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} due to excessive name spoofing violations (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
            ],
        },
        {
            checkType: 'playerAntiGmc',
            enabled: false,
            description: 'Actions for unauthorized Creative Mode usage.',
            tiers: [
                { flagThreshold: 10, actionType: 'kick', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: Kicked {playerName} for unauthorized Creative Mode usage (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
                { flagThreshold: 20, actionType: 'tempBan', parameters: { duration: '6h', messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for repeated unauthorized Creative Mode usage (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
            ],
        },
        {
            checkType: 'chatSpamFastMessage',
            enabled: false,
            description: 'Actions for sending chat messages too quickly.',
            tiers: [
                { flagThreshold: 5, actionType: 'warn', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName}, please do not send messages so quickly (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: false },
                { flagThreshold: 10, actionType: 'mute', parameters: { duration: '5m', messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for sending messages too quickly (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
                { flagThreshold: 15, actionType: 'mute', parameters: { duration: '30m', messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent fast message spam (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
            ],
        },
        {
            checkType: 'chatSwearViolation',
            enabled: false,
            description: 'Actions for using swear words in chat.',
            tiers: [
                { flagThreshold: 3, actionType: 'warn', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName}, swear word detected in chat (Flags: {flagCount}/{flagThreshold}). Please be respectful.' }, resetFlagsAfterAction: false },
                { flagThreshold: 5, actionType: 'mute', parameters: { duration: '10m', messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for using inappropriate language (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
                { flagThreshold: 10, actionType: 'mute', parameters: { duration: '1h', messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName} muted for {duration} for persistent use of inappropriate language (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
            ],
        },
        {
            checkType: 'movementNetherRoof',
            enabled: false,
            description: 'Actions for accessing the Nether roof.',
            tiers: [
                { flagThreshold: 1, actionType: 'warn', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName}, detected on the Nether roof (Flags: {flagCount}/{flagThreshold}). This area is restricted.' }, resetFlagsAfterAction: false },
                { flagThreshold: 2, actionType: 'teleportSafe', parameters: { coordinates: { y: 120 }, messageTemplate: 'AutoMod [{actionType}|{checkType}]: Teleporting {playerName} from the Nether roof to {teleportCoordinates} (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: false },
                { flagThreshold: 3, actionType: 'kick', parameters: { messageTemplate: 'AutoMod [{actionType}|{checkType}]: Kicked {playerName} for repeatedly accessing the Nether roof (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
                { flagThreshold: 5, actionType: 'tempBan', parameters: { duration: '1h', messageTemplate: 'AutoMod [{actionType}|{checkType}]: {playerName} temporarily banned for {duration} for persistent Nether roof violations (Flags: {flagCount}/{flagThreshold}).' }, resetFlagsAfterAction: true },
            ],
        },
        {
            checkType: 'worldAntiGriefPistonLag',
            enabled: false,
            description: 'Logs potential piston-based lag machines. No direct player punishment via AutoMod tiers.',
            resetFlagsAfterSeconds: 600,
            tiers: [
                {
                    flagThreshold: 1,
                    actionType: 'flagOnly',
                    parameters: {
                        messageTemplate: 'AutoMod Log: Potential piston lag activity recorded for {playerName} at coordinates {x},{y},{z}. Flag count: {flagCount}. Threshold for logging: {flagThreshold}.',
                        adminMessageTemplate: 'AutoMod Log: Potential piston lag activity recorded for {playerName} at {x},{y},{z}. Rate: {rate}/sec over {duration}s. Check logs for details.',
                    },
                    resetFlagsAfterAction: true,
                },
            ],
        },
    ],
};
