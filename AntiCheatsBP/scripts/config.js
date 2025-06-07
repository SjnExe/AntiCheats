// Anti-Cheat Configuration File

/** @type {string} Tag required for players to be recognized as administrators. */
export const adminTag = "admin";

/**
 * @type {string}
 * Stores the exact in-game name of the project owner.
 * This is used to grant special permissions or bypass certain checks
 * for the owner. Case-sensitive.
 */
export const ownerPlayerName = "PlayerNameHere"; // TODO: Replace with actual owner name

/** @type {boolean} If true, enables detailed console logging for debugging purposes. */
export const enableDebugLogging = true;

/** @type {string} The prefix used for chat-based commands (e.g., "!ac version"). */
export const prefix = "!";

// --- General Check Toggles ---

/** @type {boolean} If true, the Reach check is active. */
export const enableReachCheck = true;
/** @type {boolean} If true, the CPS (Clicks Per Second) check is active. */
export const enableCpsCheck = true;
/** @type {boolean} If true, the View Snap / Invalid Pitch check is active. */
export const enableViewSnapCheck = true;
/** @type {boolean} If true, the Multi-Target Killaura check is active. */
export const enableMultiTargetCheck = true;
/** @type {boolean} If true, various state conflict checks (e.g., attack while sleeping) are active. */
export const enableStateConflictCheck = true;
/** @type {boolean} If true, the Fly check (both sustained and hover) is active. */
export const enableFlyCheck = true;
/** @type {boolean} If true, the Speed check is active. */
export const enableSpeedCheck = true;
/** @type {boolean} If true, the NoFall check is active. */
export const enableNofallCheck = true;
/** @type {boolean} If true, the Nuker check is active. */
export const enableNukerCheck = true;
/** @type {boolean} If true, the Illegal Item check (both use and place) is active. */
export const enableIllegalItemCheck = true;
/** @type {boolean} If true, the Self-Hurt Detection check is active. */
export const enableSelfHurtCheck = true; // Detects suspicious self-inflicted damage


// --- Movement Checks ---

/** @type {number} Maximum vertical speed (intended interpretation: blocks per second, but actual check logic may vary). */
export const maxVerticalSpeed = 10;
/** @type {number} Maximum horizontal speed (intended interpretation: blocks per second). Default sprint speed is ~5.6 blocks/sec. */
export const maxHorizontalSpeed = 15;
/** @type {number} Flat bonus to maximum horizontal speed (blocks/sec) per level of the Speed effect. */
export const speedEffectBonus = 2.0;
/** @type {number} Minimum fall distance in blocks that is expected to cause fall damage. */
export const minFallDistanceForDamage = 3.5;
/** @type {number} Threshold for vertical speed (blocks per tick, positive is upward) for sustained fly detection. */
export const flySustainedVerticalSpeedThreshold = 0.5;
/** @type {number} Number of consecutive off-ground ticks, while exceeding `flySustainedVerticalSpeedThreshold`, to trigger a fly flag. */
export const flySustainedOffGroundTicksThreshold = 10;
/** @type {number} Minimum height in blocks above the last known ground position for hover detection. */
export const flyHoverNearGroundThreshold = 3;
/** @type {number} Vertical speed (absolute value, blocks per tick) below which a player is considered hovering. */
export const flyHoverVerticalSpeedThreshold = 0.08;
/** @type {number} Number of consecutive off-ground ticks, while meeting hover conditions, to trigger a hover flag. */
export const flyHoverOffGroundTicksThreshold = 20;
/** @type {number} Maximum fall distance accumulated while hovering. */
export const flyHoverMaxFallDistanceThreshold = 1.0;
/** @type {number} A tolerance buffer added to the maximum horizontal speed. */
export const speedToleranceBuffer = 0.5;
/** @type {number} Number of consecutive ticks a player must exceed max horizontal speed on ground to be flagged. */
export const speedGroundConsecutiveTicksThreshold = 5;

/** @type {boolean} If true, the NoSlow check is active. */
export const enableNoSlowCheck = true;
/** @type {number} Maximum horizontal speed (blocks/sec) allowed while eating/drinking. Vanilla is very slow. */
export const noSlowMaxSpeedEating = 1.0; // Slightly above 0 to allow minor adjustments
/** @type {number} Maximum horizontal speed (blocks/sec) allowed while charging a bow. Vanilla is very slow. */
export const noSlowMaxSpeedChargingBow = 1.0;
/** @type {number} Maximum horizontal speed (blocks/sec) allowed while actively using/raising a shield (if this slows). Vanilla walk: ~4.3, Sneak: ~1.3. Shield doesn't slow walk/sprint. */
export const noSlowMaxSpeedUsingShield = 4.4; // Set slightly above normal walk, as shield itself doesn't slow. This might catch if combined with other speed hacks.
/** @type {number} Maximum horizontal speed (blocks/sec) allowed while sneaking. Vanilla is ~1.31 B/s. */
export const noSlowMaxSpeedSneaking = 1.5; // Slightly above vanilla sneak speed

/** @type {boolean} If true, the Invalid Sprint check is active. */
export const enableInvalidSprintCheck = true;


// --- Combat Checks ---

/** @type {number} Maximum clicks per second (CPS) threshold. */
export const maxCpsThreshold = 20;
/** @type {number} Maximum reach distance in blocks for Survival/Adventure mode. */
export const reachDistanceSurvival = 4.5;
/** @type {number} Maximum reach distance in blocks for Creative mode. */
export const reachDistanceCreative = 6.0;
/** @type {number} A small buffer added to maximum reach distance. */
export const reachBuffer = 0.5;
/** @type {number} Time window in milliseconds for calculating CPS. */
export const cpsCalculationWindowMs = 1000;

// --- View Snap / Invalid Pitch (Aimbot/Killaura components) ---
/** @type {number} Max degrees pitch can change in one tick after an attack. */
export const maxPitchSnapPerTick = 75;
/** @type {number} Max degrees yaw can change in one tick after an attack. */
export const maxYawSnapPerTick = 100;
/** @type {number} Ticks after an attack to monitor for view snaps. */
export const viewSnapWindowTicks = 10;
/** @type {number} Minimum pitch considered invalid. */
export const invalidPitchThresholdMin = -90.5;
/** @type {number} Maximum pitch considered invalid. */
export const invalidPitchThresholdMax = 90.5;
/** @type {string} Reason message for invalid pitch flags. */
export const flagReasonInvalidPitch = "Invalid Pitch";
/** @type {string} Reason message for view snap flags. */
export const flagReasonViewSnap = "View Snap";
/** @type {number} Flag increment value for view snap related flags. */
export const flagIncrementViewSnap = 1;

// --- Multi-Target Killaura ---
/** @type {number} Time window in milliseconds for multi-target detection. */
export const multiTargetWindowMs = 1000;
/** @type {number} Number of distinct entities hit within the window to trigger a flag. */
export const multiTargetThreshold = 3;
/** @type {number} Maximum number of recent hit records to store per player. */
export const multiTargetMaxHistory = 10;
/** @type {string} Reason message for multi-target aura flags. */
export const flagReasonMultiAura = "Multi-Target Aura";

// --- State Conflict Checks (Killaura components) ---
/** @type {string} Reason message for attacking while sleeping. */
export const flagReasonAttackWhileSleeping = "Attack While Sleeping";

/** @type {string[]} Item type IDs for consumables that should prevent attacking while being used. */
export const attackBlockingConsumables = [
    "minecraft:apple", "minecraft:golden_apple", "minecraft:enchanted_golden_apple",
    "minecraft:mushroom_stew", "minecraft:rabbit_stew", "minecraft:beetroot_soup",
    "minecraft:suspicious_stew", "minecraft:cooked_beef", "minecraft:cooked_porkchop",
    "minecraft:cooked_mutton", "minecraft:cooked_chicken", "minecraft:cooked_rabbit",
    "minecraft:cooked_salmon", "minecraft:cooked_cod", "minecraft:baked_potato",
    "minecraft:bread", "minecraft:melon_slice", "minecraft:carrot", "minecraft:potato",
    "minecraft:beetroot", "minecraft:dried_kelp", "minecraft:potion", "minecraft:honey_bottle"
    // Add other foods/potions as necessary
];

/** @type {string[]} Item type IDs for bows that should prevent attacking while being charged. */
export const attackBlockingBows = ["minecraft:bow", "minecraft:crossbow"];

/** @type {string[]} Item type IDs for shields that should prevent attacking while being actively used (raised). */
export const attackBlockingShields = ["minecraft:shield"];

/** @type {number} Number of ticks the 'using item' state (like isUsingConsumable) should persist before being auto-cleared if no explicit stop event occurs. (20 ticks = 1 second) */
export const itemUseStateClearTicks = 60; // Default to 3 seconds


// --- World Checks ---

// --- AutoTool Check ---
/** @type {boolean} If true, the AutoTool check is active. */
export const enableAutoToolCheck = true;
/** @type {number} Max ticks between starting to break a block and switching to an optimal tool to be considered suspicious. */
export const autoToolSwitchToOptimalWindowTicks = 2; // e.g., switch must happen almost immediately
/** @type {number} Max ticks after breaking a block (with a switched optimal tool) to detect a switch back to a previous non-optimal tool. */
export const autoToolSwitchBackWindowTicks = 5;

// --- InstaBreak Check ---
/** @type {boolean} If true, the check for breaking unbreakable blocks is active. */
export const enableInstaBreakUnbreakableCheck = true;
/** @type {string[]} List of block type IDs considered normally unbreakable by non-operators. */
export const instaBreakUnbreakableBlocks = [
    "minecraft:bedrock", "minecraft:barrier", "minecraft:command_block",
    "minecraft:repeating_command_block", "minecraft:chain_command_block",
    "minecraft:structure_block", "minecraft:structure_void", "minecraft:jigsaw",
    "minecraft:light_block", "minecraft:end_portal_frame", "minecraft:end_gateway"
];
/** @type {boolean} If true, the check for breaking blocks too fast is active. */
export const enableInstaBreakSpeedCheck = true;
/** @type {number} Tolerance in ticks for block breaking speed. (e.g., 1-2 ticks). ActualTime < ExpectedTime - Tolerance -> Flag. */
export const instaBreakTimeToleranceTicks = 2;

// --- Player Behavior Checks ---
/** @type {boolean} If true, the NameSpoof check is active. */
export const enableNameSpoofCheck = true;
/** @type {number} Maximum allowed length for a player's nameTag. */
export const nameSpoofMaxLength = 48; // Generous to account for rank prefixes + long names
/**
 * @type {string} Regex pattern for disallowed characters in nameTags.
 * Default aims to allow common characters, color codes, and spaces, but block most control/uncommon symbols.
 * Example: "[^\w\s§\-\[\]().#@!']" - disallows anything NOT (word chars, space, §, -, [, ], (, ), ., #, @, !, ')
 * Another option: "[^\x20-\x7E§]" - allows only printable ASCII (space to ~) and §. This is more restrictive.
 * Current choice: lenient, disallows common problematic chars like newlines, excessive symbols.
 */
export const nameSpoofDisallowedCharsRegex = "[\n\r\t\x00-\x1F\x7F-\x9F]"; // Disallow newlines, tabs, control chars, some extended ASCII
/** @type {number} Minimum interval in ticks between allowed nameTag changes. */
export const nameSpoofMinChangeIntervalTicks = 200; // 10 seconds

/** @type {boolean} If true, the Anti-Gamemode Creative (Anti-GMC) check is active. */
export const enableAntiGMCCheck = true;
/**
 * @type {string} The gamemode to switch players to if unauthorized creative mode is detected and auto-switch is enabled.
 * Valid values: "survival", "adventure", "spectator". Default: "survival".
 */
export const antiGMCSwitchToGameMode = "survival";
/** @type {boolean} If true, automatically switch player's gamemode if unauthorized creative is detected. */
export const antiGMCAutoSwitch = true;

/** @type {boolean} If true, the InventoryMods (Hotbar Switch) checks are active. */
export const enableInventoryModCheck = true;


/** @type {number} Max blocks broken in `nukerCheckIntervalMs` for Nuker. */
export const nukerMaxBreaksShortInterval = 4;
/** @type {number} Time window in milliseconds for Nuker check. */
export const nukerCheckIntervalMs = 200;
/** @type {string[]} Array of item type IDs banned from being placed. */
export const bannedItemsPlace = ["minecraft:command_block", "minecraft:moving_block"];
/** @type {string[]} Array of item type IDs banned from being used. */
export const bannedItemsUse = [];

// --- Chat Checks ---
/** @type {boolean} If true, the Fast Message Spam check is active. */
export const enableFastMessageSpamCheck = true;
/** @type {number} Time in milliseconds between messages to be considered spam. */
export const fastMessageSpamThresholdMs = 500; // 2 messages within 0.5s = spam.
/** @type {string} The action profile name to use for fast message spam. */
export const fastMessageSpamActionProfileName = "chat_spam_fast_message";

/** @type {boolean} If true, checks for newline/carriage return characters in chat messages. */
export const enableNewlineCheck = true;
/** @type {boolean} If true, sending a message with newlines/carriage returns will flag the player. */
export const flagOnNewline = true;
/** @type {boolean} If true, messages containing newlines/carriage returns will be cancelled and not sent. */
export const cancelMessageOnNewline = true;
/** @type {boolean} If true, checks if chat messages exceed the maximum configured length. */
export const enableMaxMessageLengthCheck = true;
/** @type {number} Maximum allowed character length for a chat message. */
export const maxMessageLength = 256;
/** @type {boolean} If true, sending a message exceeding max length will flag the player. */
export const flagOnMaxMessageLength = true;
/** @type {boolean} If true, messages exceeding max length will be cancelled. */
export const cancelOnMaxMessageLength = true;
/** @type {boolean} If true, checks for players sending the same/similar messages repeatedly. */
export const spamRepeatCheckEnabled = true;
/** @type {number} Number of identical/similar messages within the time window to trigger a spam flag. */
export const spamRepeatMessageCount = 3;
/** @type {number} Time window in seconds to monitor for repeated messages. */
export const spamRepeatTimeWindowSeconds = 5;
/** @type {boolean} If true, flags the player for repeated message spam. */
export const spamRepeatFlagPlayer = true;
/** @type {boolean} If true, cancels the message that triggers the repeated spam detection. */
export const spamRepeatCancelMessage = false;

// --- Scaffold/Tower Detection ---
/** @type {boolean} If true, the Scaffold/Tower (Tower-like upward building) check is active. */
export const enableTowerCheck = true;
/** @type {number} Maximum time in ticks between consecutive pillar blocks for it to be considered part of the same tower. */
export const towerMaxTickGap = 10; // 0.5 seconds
/** @type {number} Minimum number of consecutive upward blocks to trigger a tower flag. */
export const towerMinHeight = 5;
/** @type {number} Maximum pitch deviation (degrees) allowed when pillaring up. E.g., if pitch is > -30 (looking too far up/ahead). */
export const towerMaxPitchWhilePillaring = -30; // Player should be looking down somewhat. Pitch < -30 means looking more upwards.
/** @type {number} How many recent block placements to store for pattern analysis. */
export const towerPlacementHistoryLength = 20;
/** @type {boolean} If true, the Flat/Invalid Rotation While Building check is active. */
export const enableFlatRotationCheck = true;
/** @type {number} Number of consecutive block placements to analyze for static or flat rotation. */
export const flatRotationConsecutiveBlocks = 4;
/** @type {number} Maximum degrees of variance allowed for pitch over consecutive placements to be considered 'static'. */
export const flatRotationMaxPitchVariance = 2.0;
/** @type {number} Maximum degrees of variance allowed for yaw over consecutive placements to be considered 'static'. */
export const flatRotationMaxYawVariance = 2.0;
// Define specific pitch ranges considered "flat" or indicative of cheating while building
/** @type {number} Minimum pitch for 'flat horizontal' building detection (e.g., looking straight ahead). */
export const flatRotationPitchHorizontalMin = -5.0;
/** @type {number} Maximum pitch for 'flat horizontal' building detection. */
export const flatRotationPitchHorizontalMax = 5.0;
/** @type {number} Minimum pitch for 'flat downward' building detection (e.g., looking straight down). */
export const flatRotationPitchDownwardMin = -90.0;
/** @type {number} Maximum pitch for 'flat downward' building detection. */
export const flatRotationPitchDownwardMax = -85.0;
        /** @type {boolean} If true, the Downward Scaffold check is active. */
        export const enableDownwardScaffoldCheck = true;
        /** @type {number} Minimum number of consecutive downward blocks while airborne to trigger. */
        export const downwardScaffoldMinBlocks = 3;
        /** @type {number} Maximum time in ticks between consecutive downward scaffold blocks. */
        export const downwardScaffoldMaxTickGap = 10; // 0.5 seconds
        /** @type {number} Minimum horizontal speed (blocks/sec) player must maintain while downward scaffolding to flag. Vanilla players usually stop or slow down significantly. */
        export const downwardScaffoldMinHorizontalSpeed = 3.0; // Approx crouch-walking speed
        /** @type {boolean} If true, the Placing Blocks onto Air/Liquid check is active. */
        export const enableAirPlaceCheck = true;
        /**
         * @type {string[]} List of block type IDs that are considered 'solid' and require support.
         * Placing these against air/liquid without other solid adjacent support will be flagged.
         */
        export const airPlaceSolidBlocks = [
            "minecraft:cobblestone", "minecraft:stone", "minecraft:dirt", "minecraft:grass_block",
            "minecraft:oak_planks", "minecraft:spruce_planks", "minecraft:birch_planks",
            "minecraft:jungle_planks", "minecraft:acacia_planks", "minecraft:dark_oak_planks",
            "minecraft:crimson_planks", "minecraft:warped_planks", "minecraft:sand", "minecraft:gravel",
            "minecraft:obsidian", "minecraft:netherrack", "minecraft:end_stone"
            // Add more as needed
        ];

// --- Fast Use/Place Checks ---
/** @type {boolean} If true, the Fast Item Use check is active. */
export const enableFastUseCheck = true;
/**
 * @type {Object.<string, number>} Defines minimum cooldown in milliseconds between uses for specific items.
 * Example: { "minecraft:ender_pearl": 1000, "minecraft:snowball": 250 }
 */
export const fastUseItemCooldowns = {
    "minecraft:ender_pearl": 1000, // 1 second vanilla cooldown
    "minecraft:snowball": 150,    // Vanilla allows fairly rapid throws
    "minecraft:egg": 150,
    "minecraft:bow": 200,         // Min time to draw and fire a weak arrow.
                                  // This is for *consecutive separate* bow uses, not charge time of one shot.
    "minecraft:crossbow": 1250,   // Base reload time for crossbow
    "minecraft:potion": 800,      // Approximate time to drink a potion
    "minecraft:splash_potion": 500,
    "minecraft:lingering_potion": 500,
    "minecraft:chorus_fruit": 800, // Cooldown on chorus fruit teleport
    "minecraft:shield": 500       // Cooldown for blocking after being hit or raising/lowering
};
        /** @type {boolean} If true, the Fast Block Place check is active. */
        export const enableFastPlaceCheck = true;
        /** @type {number} Time window in milliseconds for fast placement detection. */
        export const fastPlaceTimeWindowMs = 1000; // 1 second
        /** @type {number} Maximum number of blocks allowed to be placed within the time window. */
        export const fastPlaceMaxBlocksInWindow = 10; // Max 10 blocks per second

// --- X-Ray Detection ---
/** @type {boolean} If true, enables notifications for mining valuable ores. */
export const xrayDetectionNotifyOnOreMineEnabled = true;
/** @type {string[]} List of block type IDs to monitor for mining notifications. */
export const xrayDetectionMonitoredOres = [
    "minecraft:diamond_ore", "minecraft:deepslate_diamond_ore",
    "minecraft:ancient_debris", "minecraft:emerald_ore",
    "minecraft:deepslate_emerald_ore"
];
/** @type {boolean} If true, admins will receive X-Ray mining notifications by default. */
export const xrayDetectionAdminNotifyByDefault = true;

// --- Combat Log Detection ---
/** @type {boolean} If true, enables detection of players leaving shortly after combat. */
export const enableCombatLogDetection = false; // MODIFIED
/** @type {number} Time in seconds after last combat interaction to consider a disconnect as combat logging. */
export const combatLogThresholdSeconds = 15;
/** @type {number} Number of flags to add when combat logging is detected. */
export const combatLogFlagIncrement = 1;
/** @type {string} Default reason message for combat log flags. */
export const combatLogReason = "Disconnected shortly after combat.";
/** @type {string} Template for admin notification message for combat logging. Placeholders: {playerName}, {timeSinceCombat}, {incrementAmount} */
export const combatLogMessage = "§cCombat Log: {playerName} disconnected {timeSinceCombat}s after combat. Flagged +{incrementAmount}.";


/** @type {boolean} If true, admins receive all AC notifications by default. */
export const acGlobalNotificationsDefaultOn = true;

// --- UI Display Texts ---
/** @type {string[]} Defines the server rules to be displayed in the UI. */
export const serverRules = [
  "1. Be respectful to all players and staff.",
  "2. No cheating, exploiting, or unfair advantages.",
  "3. No griefing or stealing.",
  "4. Do not spam chat or use excessive caps.",
  "5. PVP is only allowed in designated areas or if agreed upon."
];
/** @type {{title: string, url: string}[]} Defines links to be displayed in the Help & Links UI. */
export const helpLinks = [
  { title: "Our Discord Server", url: "https://discord.gg/YourInviteCode" },
  { title: "Website/Forums", url: "https://yourwebsite.com/forums" },
  { title: "Report a Player", url: "https://yourwebsite.com/report" }
];
/** @type {string[]} General help messages or tips to display in the UI. */
export const generalHelpMessages = [
  "Welcome to the server! We hope you have a great time.",
  "For a list of commands, type !help in chat.",
  "If you suspect a player of cheating, please use the report link or contact staff.",
  "Please be familiar with our server rules, available via !uinfo."
];

// --- System ---
/** @type {string} The current version of the AntiCheat system. */
export const acVersion = "v__VERSION_STRING__";

// --- Check Action Profiles ---
// Defines actions to be taken for specific cheat detections.
// Used by actionManager.js
//
// Structure for each profile:
// "check_type_string": {
//   enabled: boolean, (Master switch for actions of this check type)
//   flag: {
//     increment: number, (How many times to call addFlag)
//     reason: string, (Reason for the flag, can use {playerName}, {checkType}, {detailsString}, and {violationDetailKey})
//     type: string (Optional: specific flag type for playerData, defaults to checkType if not provided)
//   },
//   notifyAdmins: {
//     message: string (Message template, can use placeholders)
//   },
//   log: {
//     actionType: string, (Optional: specific actionType for logManager, defaults to detected_{checkType})
//     detailsPrefix: string, (Optional: prefix for the log details string)
//     includeViolationDetails: boolean (Optional: defaults to true if not specified)
//   }
// }

export const checkActionProfiles = {
    "example_fly_hover": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected Fly (Hover).",
            type: "fly"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Fly (Hover). Details: {detailsString}"
        },
        log: {
            actionType: "detected_fly_hover",
            detailsPrefix: "Fly (Hover Violation): ",
            includeViolationDetails: true
        }
    },
    "example_speed_ground": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "System detected excessive ground speed.",
            type: "speed"
        },
        notifyAdmins: {
            // Example using specific keys from violationDetails if actionManager's formatActionMessage supports it
            message: "§eAC: {playerName} flagged for Speed (Ground). Speed: {speedBps} BPS (Max: {maxAllowedBps})"
        },
        log: {
            actionType: "detected_speed_ground",
            detailsPrefix: "Speed (Ground Violation): ",
            includeViolationDetails: true
        }
    },
    "example_reach_attack": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "System detected excessive reach during combat.",
            type: "reach"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Reach. Distance: {actualDistance} (Max: {allowedDistance})"
        },
        log: {
            actionType: "detected_reach_attack",
            detailsPrefix: "Reach (Attack Violation): ",
            includeViolationDetails: true
        }
    }
    // NOTE: These are example keys ("example_fly_hover", etc.).
    // Actual keys will be defined when refactoring specific checks.
    // For now, these serve as structural examples.
    "movement_nofall": {
        enabled: true, // Default to true, can be overridden in user's config.js if they copy it
        flag: {
            increment: 3,
            reason: "System detected suspicious fall damage negation (NoFall).",
            type: "movement_violation" // General type for grouping flags
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for NoFall. Fall Distance: {fallDistance}m. Details: {detailsString}"
        },
        log: {
            actionType: "detected_movement_nofall",
            detailsPrefix: "NoFall Violation: ",
            includeViolationDetails: true
        }
    },
    "world_nuker": {
        enabled: true,
        flag: {
            increment: 5,
            reason: "System detected Nuker activity (rapid/wide-area block breaking).",
            type: "world_violation"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Nuker. Blocks: {blocksBroken} in window. Details: {detailsString}"
        },
        log: {
            actionType: "detected_world_nuker",
            detailsPrefix: "Nuker Violation: ",
            includeViolationDetails: true
        }
    },
    "combat_cps_high": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "System detected abnormally high CPS (Clicks Per Second).",
            type: "combat_cps"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for High CPS. Count: {cpsCount} in {windowSeconds}s. Max: {threshold}"
        },
        log: {
            actionType: "detected_combat_cps_high",
            detailsPrefix: "High CPS Violation: ",
            includeViolationDetails: true
        }
    },
    "combat_viewsnap_pitch": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "System detected suspicious pitch snap after attack.",
            type: "combat_viewsnap"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Pitch Snap. Change: {change}°, Limit: {limit}° ({postAttackTimeMs}ms after attack)"
        },
        log: {
            actionType: "detected_viewsnap_pitch",
            detailsPrefix: "Pitch Snap Violation: ",
            includeViolationDetails: true
        }
    },
    "combat_viewsnap_yaw": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "System detected suspicious yaw snap after attack.",
            type: "combat_viewsnap"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Yaw Snap. Change: {change}°, Limit: {limit}° ({postAttackTimeMs}ms after attack)"
        },
        log: {
            actionType: "detected_viewsnap_yaw",
            detailsPrefix: "Yaw Snap Violation: ",
            includeViolationDetails: true
        }
    },
    "combat_invalid_pitch": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected invalid view pitch (e.g., looking straight up/down).",
            type: "combat_view_violation"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Invalid Pitch. Pitch: {pitch}° (Limits: {minLimit}° to {maxLimit}°)"
        },
        log: {
            actionType: "detected_invalid_pitch",
            detailsPrefix: "Invalid Pitch Violation: ",
            includeViolationDetails: true
        }
    },
    "combat_multitarget_aura": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "System detected Multi-Target Aura (hitting multiple entities rapidly).",
            type: "combat_aura"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Multi-Target Aura. Targets: {targetsHit} in {windowSeconds}s (Threshold: {threshold})"
        },
        log: {
            actionType: "detected_multitarget_aura",
            detailsPrefix: "Multi-Target Aura Violation: ",
            includeViolationDetails: true
        }
    },
    "combat_attack_while_sleeping": {
        enabled: true,
        flag: {
            increment: 5, // Higher severity as it's a very clear violation
            reason: "System detected player attacking while sleeping.",
            type: "combat_state_conflict"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Attacking While Sleeping. Target: {targetEntity}"
        },
        log: {
            actionType: "detected_attack_while_sleeping",
            detailsPrefix: "Attack While Sleeping Violation: ",
            includeViolationDetails: true
        }
    },
    "combat_attack_while_consuming": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "System detected player attacking while consuming an item.",
            type: "combat_state_conflict_consuming" // Specific type
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Attacking While Consuming. State: {state}, Item Category: {itemUsed}"
        },
        log: {
            actionType: "detected_attack_while_consuming",
            detailsPrefix: "Attack While Consuming Violation: ",
            includeViolationDetails: true
        }
    },
    "combat_attack_while_bow_charging": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "System detected player attacking while charging a bow.",
            type: "combat_state_conflict_bow"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Attacking While Charging Bow. State: {state}, Item Category: {itemUsed}"
        },
        log: {
            actionType: "detected_attack_while_bow_charging",
            detailsPrefix: "Attack While Charging Bow Violation: ",
            includeViolationDetails: true
        }
    },
    "combat_attack_while_shielding": {
        enabled: true,
        flag: {
            increment: 2, // Shielding might have edge cases, slightly lower increment initially
            reason: "System detected player attacking while actively using a shield.",
            type: "combat_state_conflict_shield"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Attacking While Shielding. State: {state}, Item Category: {itemUsed}"
        },
        log: {
            actionType: "detected_attack_while_shielding",
            detailsPrefix: "Attack While Shielding Violation: ",
            includeViolationDetails: true
        }
    },
    "world_illegal_item_use": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected use of a banned item: {itemTypeId}.",
            type: "world_illegal_item"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Illegal Item Use. Item: {itemTypeId}. Details: {detailsString}"
        },
        log: {
            actionType: "detected_illegal_item_use",
            detailsPrefix: "Illegal Item Use Violation: ",
            includeViolationDetails: true
        }
        // Consider adding a 'messagePlayer' action here if direct feedback beyond flag reason is needed
        // Or rely on the flag reason being displayed to the player by addFlag.
    },
    "world_illegal_item_place": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected placement of a banned item: {itemTypeId}.",
            type: "world_illegal_item"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Illegal Item Placement. Item: {itemTypeId} at {blockLocationX},{blockLocationY},{blockLocationZ}. Details: {detailsString}"
        },
        log: {
            actionType: "detected_illegal_item_place",
            detailsPrefix: "Illegal Item Placement Violation: ",
            includeViolationDetails: true
        }
    },
    "world_tower_build": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected suspicious tower-like building.",
            type: "world_scaffold_tower"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Tower Building. Height: {height}, Look Pitch: {pitch}° (Threshold: {pitchThreshold}°)"
        },
        log: {
            actionType: "detected_world_tower_build",
            detailsPrefix: "Tower Building Violation: ",
            includeViolationDetails: true
        }
    },
    "world_flat_rotation_building": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected unnatural (flat or static) head rotation while building.",
            type: "world_scaffold_rotation"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Flat/Static Rotation Building. Pitch Variance: {pitchVariance}, Yaw Variance: {yawVariance}, Details: {details}"
            // {details} could be "Static Pitch", "Static Yaw", "Flat Horizontal Pitch", "Flat Downward Pitch"
        },
        log: {
            actionType: "detected_world_flat_rotation_building",
            detailsPrefix: "Flat/Static Rotation Building Violation: ",
            includeViolationDetails: true
        }
    },
    "world_downward_scaffold": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "System detected suspicious downward scaffolding while airborne.",
            type: "world_scaffold_downward"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Downward Scaffold. Blocks: {count}, Speed: {hSpeed}bps (MinSpeed: {minHSpeed}bps)"
        },
        log: {
            actionType: "detected_world_downward_scaffold",
            detailsPrefix: "Downward Scaffold Violation: ",
            includeViolationDetails: true
        }
    },
    "world_air_place": {
        enabled: true,
        flag: {
            increment: 1, // Can be noisy if not tuned well
            reason: "System detected block placed against air/liquid without solid support.",
            type: "world_scaffold_airplace"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Air Placement. Block: {blockType} at {x},{y},{z} targeting air/liquid."
        },
        log: {
            actionType: "detected_world_air_place",
            detailsPrefix: "Air Placement Violation: ",
            includeViolationDetails: true
        }
    },
    "action_fast_use": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "System detected item being used too quickly: {itemType}.",
            type: "action_fast_use"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Fast Use. Item: {itemType}, Cooldown: {cooldown}ms, Actual: {actualTime}ms"
        },
        log: {
            actionType: "detected_fast_use",
            detailsPrefix: "Fast Use Violation: ",
            includeViolationDetails: true
        }
    },
    "world_fast_place": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "System detected blocks being placed too quickly.",
            type: "world_fast_place"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Fast Place. Blocks: {count} in {window}ms (Max: {maxBlocks})"
        },
        log: {
            actionType: "detected_world_fast_place",
            detailsPrefix: "Fast Place Violation: ",
            includeViolationDetails: true
        }
    },
    "movement_noslow": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected movement faster than allowed for current action (e.g., eating, sneaking, using bow).",
            type: "movement_noslow"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for NoSlow. Action: {action}, Speed: {speed}bps (Max: {maxSpeed}bps)"
        },
        log: {
            actionType: "detected_movement_noslow",
            detailsPrefix: "NoSlow Violation: ",
            includeViolationDetails: true
        }
    },
    "movement_invalid_sprint": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected sprinting under invalid conditions (e.g., blind, sneaking, riding).",
            type: "movement_invalid_sprint"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Invalid Sprint. Condition: {condition}"
        },
        log: {
            actionType: "detected_movement_invalid_sprint",
            detailsPrefix: "Invalid Sprint Violation: ",
            includeViolationDetails: true
        }
    },
    "world_autotool": {
        enabled: true,
        flag: {
            increment: 2, // AutoTool is a fairly obvious cheat
            reason: "System detected suspicious tool switching before/after breaking a block (AutoTool).",
            type: "world_autotool"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for AutoTool. Block: {blockType}, ToolUsed: {toolType}, Switched: {switchPattern}"
            // {switchPattern} could be "ToOptimalThenBack" or "ToOptimal"
        },
        log: {
            actionType: "detected_world_autotool",
            detailsPrefix: "AutoTool Violation: ",
            includeViolationDetails: true
        }
    },
    "world_instabreak_unbreakable": {
        enabled: true,
        flag: {
            increment: 10, // High severity
            reason: "Attempted to break an unbreakable block: {blockType}.",
            type: "world_instabreak_unbreakable"
        },
        notifyAdmins: {
            message: "§cAC: {playerName} flagged for InstaBreak (Unbreakable). Block: {blockType} at {x},{y},{z}. Event cancelled."
        },
        log: {
            actionType: "detected_instabreak_unbreakable",
            detailsPrefix: "InstaBreak (Unbreakable) Violation: ",
            includeViolationDetails: true
        }
    },
    "world_instabreak_speed": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "System detected block broken significantly faster than possible: {blockType}.",
            type: "world_instabreak_speed"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for InstaBreak (Speed). Block: {blockType}. Expected: {expectedTicks}t, Actual: {actualTicks}t"
        },
        log: {
            actionType: "detected_instabreak_speed",
            detailsPrefix: "InstaBreak (Speed) Violation: ",
            includeViolationDetails: true
        }
    },
    "player_namespoof": {
        enabled: true,
        flag: {
            increment: 5, // Namespoofing can be quite disruptive
            reason: "System detected an invalid or suspicious player nameTag ({reasonDetail}).",
            type: "player_namespoof"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for NameSpoofing. Reason: {reasonDetail}. NameTag: '{nameTag}'"
        },
        log: {
            actionType: "detected_player_namespoof",
            detailsPrefix: "NameSpoof Violation: ",
            includeViolationDetails: true // Will include nameTag and reasonDetail
        }
    },
    "player_antigmc": {
        enabled: true,
        flag: {
            increment: 10, // High severity for unauthorized creative
            reason: "System detected unauthorized Creative Mode.",
            type: "player_antigmc"
        },
        notifyAdmins: {
            message: "§cAC: {playerName} detected in unauthorized Creative Mode! Switched to {switchToMode}: {autoSwitched}"
        },
        log: {
            actionType: "detected_player_antigmc",
            detailsPrefix: "Anti-GMC Violation: ",
            includeViolationDetails: true // Will include player name, gamemode, autoSwitch status
        }
    },
    "player_inventory_mod": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "System detected suspicious inventory/hotbar manipulation ({reasonDetail}).",
            type: "player_inventory_mod"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for InventoryMod. Detail: {reasonDetail}. Item: {itemType}, Slot: {slot}"
        },
        log: {
            actionType: "detected_player_inventory_mod",
            detailsPrefix: "InventoryMod Violation: ",
            includeViolationDetails: true
        }
    },
    "chat_spam_fast_message": {
        enabled: true,
        flag: {
            type: "chat_spam_fast", // This will be the key in pData.flags
            increment: 1,
            reason: "Sent messages too quickly ({timeSinceLastMsgMs}ms apart)"
        },
        log: {
            actionType: "detected_fast_message_spam",
            detailsPrefix: "Msg: '{messageContent}'. Interval: {timeSinceLastMsgMs}ms. Threshold: {thresholdMs}ms. ",
            includeViolationDetails: false // Set to false if detailsPrefix is comprehensive
        },
        notifyAdmins: {
            message: "§c[AC] §e{playerName} §7is sending messages too quickly ({timeSinceLastMsgMs}ms). Flagged. (Msg: §f{messageContent}§7)"
        },
        cancelMessage: true // If true, the spammy message will be cancelled
    }
};

// --- Command Aliases ---
/** @type {Object.<string, string>} Defines aliases for commands. */
export const commandAliases = {
    "v": "version", "w": "watch", "i": "inspect", "rf": "resetflags",
    "xn": "xraynotify", "mf": "myflags", "notifications": "notify",
    "ui": "panel", "cw": "clearwarnings"
};

// --- Editable Configuration ---
// This object will hold the current values of configurations that can be edited at runtime.
export let editableConfigValues = {
    adminTag, ownerPlayerName, enableDebugLogging, prefix,
    enableReachCheck, enableCpsCheck, enableViewSnapCheck, enableMultiTargetCheck,
    enableStateConflictCheck, enableFlyCheck, enableSpeedCheck, enableNofallCheck,
    enableNukerCheck, enableIllegalItemCheck,
    // AutoTool Check Configs
    enableAutoToolCheck,
    autoToolSwitchToOptimalWindowTicks,
    autoToolSwitchBackWindowTicks,
    // InstaBreak Check Configs
    enableInstaBreakUnbreakableCheck,
    instaBreakUnbreakableBlocks,
    enableInstaBreakSpeedCheck,
    instaBreakTimeToleranceTicks,
    // Player Behavior Check Configs
    enableNameSpoofCheck,
    nameSpoofMaxLength,
    nameSpoofDisallowedCharsRegex,
    nameSpoofMinChangeIntervalTicks,
    enableAntiGMCCheck,
    antiGMCSwitchToGameMode,
    antiGMCAutoSwitch,
    enableInventoryModCheck,
    enableSelfHurtCheck, // Added enableSelfHurtCheck
    // Movement Check Configs (including NoSlow)
    enableNoSlowCheck,
    noSlowMaxSpeedEating,
    noSlowMaxSpeedChargingBow,
    noSlowMaxSpeedUsingShield,
    noSlowMaxSpeedSneaking,
    enableInvalidSprintCheck,
    // State Conflict Check Configs
    attackBlockingConsumables,
    attackBlockingBows,
    attackBlockingShields,
    itemUseStateClearTicks,
    maxVerticalSpeed, maxHorizontalSpeed, speedEffectBonus, minFallDistanceForDamage,
    flySustainedVerticalSpeedThreshold, flySustainedOffGroundTicksThreshold,
    flyHoverNearGroundThreshold, flyHoverVerticalSpeedThreshold, flyHoverOffGroundTicksThreshold,
    flyHoverMaxFallDistanceThreshold, speedToleranceBuffer, speedGroundConsecutiveTicksThreshold,
    maxCpsThreshold, reachDistanceSurvival, reachDistanceCreative, reachBuffer,
    cpsCalculationWindowMs, maxPitchSnapPerTick, maxYawSnapPerTick, viewSnapWindowTicks,
    invalidPitchThresholdMin, invalidPitchThresholdMax,
    multiTargetWindowMs, multiTargetThreshold, multiTargetMaxHistory,
    nukerMaxBreaksShortInterval, nukerCheckIntervalMs,
    enableNewlineCheck, flagOnNewline, cancelMessageOnNewline,
    enableMaxMessageLengthCheck, maxMessageLength, flagOnMaxMessageLength, cancelOnMaxMessageLength,
    spamRepeatCheckEnabled, spamRepeatMessageCount, spamRepeatTimeWindowSeconds,
    spamRepeatFlagPlayer, spamRepeatCancelMessage,
    // Fast Message Spam Check
    enableFastMessageSpamCheck,
    fastMessageSpamThresholdMs,
    fastMessageSpamActionProfileName,
    // Scaffold/Tower Detection
    enableTowerCheck,
    towerMaxTickGap,
    towerMinHeight,
    towerMaxPitchWhilePillaring,
    towerPlacementHistoryLength,
    enableFlatRotationCheck,
    flatRotationConsecutiveBlocks,
    flatRotationMaxPitchVariance,
    flatRotationMaxYawVariance,
    flatRotationPitchHorizontalMin,
    flatRotationPitchHorizontalMax,
    flatRotationPitchDownwardMin,
    flatRotationPitchDownwardMax,
    enableDownwardScaffoldCheck,
    downwardScaffoldMinBlocks,
    downwardScaffoldMaxTickGap,
    downwardScaffoldMinHorizontalSpeed,
    enableAirPlaceCheck,
    airPlaceSolidBlocks,
    // Fast Use/Place Checks
    enableFastUseCheck,
    fastUseItemCooldowns,
    enableFastPlaceCheck,
    fastPlaceTimeWindowMs,
    fastPlaceMaxBlocksInWindow,
    xrayDetectionNotifyOnOreMineEnabled, xrayDetectionAdminNotifyByDefault,
    acGlobalNotificationsDefaultOn,
    // Combat Log Configs
    enableCombatLogDetection, // This will correctly reflect the new 'false' default
    combatLogThresholdSeconds,
    combatLogFlagIncrement,
    combatLogReason,
    combatLogMessage,
};

/**
 * Updates a configuration value in memory.
 * @param {string} key The configuration key to update.
 * @param {boolean|string|number} newValue The new value for the configuration.
 * @returns {boolean} True if the update was successful, false otherwise.
 */
export function updateConfigValue(key, newValue) {
    if (!editableConfigValues.hasOwnProperty(key)) {
        console.warn(`[ConfigManager] Attempted to update non-existent config key: ${key}`);
        return false;
    }
    const originalValue = editableConfigValues[key];
    const originalType = typeof originalValue;
    const newType = typeof newValue;

    if (originalType !== newType) {
        if (originalType === 'number' && newType === 'string') {
            const parsedValue = Number(newValue);
            if (!isNaN(parsedValue)) {
                editableConfigValues[key] = parsedValue;
                if (enableDebugLogging) console.log(`[ConfigManager] Updated ${key} from ${originalValue} to ${parsedValue} (type coerced from string)`);
                return true;
            } else {
                console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected ${originalType}, got ${newType} (unparsable string for number). Update rejected.`);
                return false;
            }
        } else {
            console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected ${originalType}, got ${newType}. Update rejected.`);
            return false;
        }
    }
    editableConfigValues[key] = newValue;
    if (enableDebugLogging) console.log(`[ConfigManager] Updated ${key} from ${originalValue} to ${newValue}`);
    return true;
}
