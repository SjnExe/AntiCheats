# AntiCheats Addon: Full Features Overview

This document provides a detailed breakdown of the features available in the AntiCheats Addon. For in-depth configuration of these features, please refer to the [Configuration Guide](ConfigurationGuide.md) and for command usage, see the [Commands List](Commands.md).

## I. Core Cheat Detection Capabilities

The addon employs a sophisticated suite of checks to identify and mitigate unfair advantages. Most checks can be toggled and fine-tuned via `config.js`.

### A. Movement Violation Detections
*   **Fly/AirWalk:** Detects unauthorized flying, hovering, or extended airtime.
    *   Includes checks for sustained vertical/horizontal flight and unusual Y-velocity (e.g., high jumps not attributable to effects).
    *   *Key Configs: `enableFlyCheck`, `flySustainedVerticalSpeedThreshold`, `flyHoverVerticalSpeedThreshold`, `flyHoverNearGroundThreshold`, `enableHighYVelocityCheck` (this is a conceptual grouping, specific config names for sub-checks might vary slightly or be part of the general fly check logic).*
*   **Speed:** Identifies players moving faster than legitimately possible on ground or in liquid, considering effects like Speed potions.
    *   *Key Configs: `enableSpeedCheck`, `speedToleranceBuffer`, `speedGroundConsecutiveTicksThreshold`*
*   **NoFall:** Catches players negating fall damage without valid means (e.g., landing in water, on slime blocks, or having Slow Falling effect).
    *   *Key Configs: `enableNofallCheck`, `minFallDistanceForDamage`, `noFallMitigationBlocks`*
*   **NoSlow:** Detects bypassing of slowdown effects while eating, sneaking, using a bow, or actively using a shield.
    *   *Key Configs: `enableNoSlowCheck`, `noSlowMaxSpeedEating`, `noSlowMaxSpeedChargingBow`, `noSlowMaxSpeedUsingShield`, `noSlowMaxSpeedSneaking`*
*   **Invalid Sprint:** Flags sprinting under disallowed conditions such as low hunger, blindness, or while using items that normally prevent sprinting.
    *   *Key Configs: `enableInvalidSprintCheck`, `sprintHungerLimit`*
*   **Nether Roof Access:** Monitors and can warn or prevent players from accessing the area above the Nether bedrock ceiling.
    *   *Key Configs: `enableNetherRoofCheck`, `netherRoofYLevelThreshold`*

### B. Combat Violation Detections
*   **Reach:** Detects attacks or block interactions occurring from distances beyond standard vanilla limits for the player's game mode.
    *   *Key Configs: `enableReachCheck`, `reachDistanceSurvival`, `reachDistanceCreative`, `reachBuffer`*
*   **CPS (Clicks Per Second) / AutoClicker:** Monitors attack rates to identify abnormally high Clicks Per Second, which can indicate the use of auto-clickers.
    *   *Key Configs: `enableCpsCheck`, `maxCpsThreshold`, `cpsCalculationWindowMs`*
*   **View Snapping / Invalid Pitch (Aimbot Utilities):** Identifies unnaturally rapid or impossible camera movements (pitch/yaw snaps) immediately after an attack, often associated with aimbots or killaura. Also checks for generally invalid pitch angles.
    *   *Key Configs: `enableViewSnapCheck`, `maxPitchSnapPerTick`, `maxYawSnapPerTick`, `viewSnapWindowTicks`, `invalidPitchThresholdMin`, `invalidPitchThresholdMax`*
*   **Multi-Target Aura:** Detects a player rapidly attacking multiple distinct entities in a short time window, a common killaura behavior.
    *   *Key Configs: `enableMultiTargetCheck`, `multiTargetWindowMs`, `multiTargetThreshold`*
*   **State Conflict Combat:** Flags players attacking while performing actions that should normally prevent attacks.
    *   Examples: Attacking while consuming food/potions, charging a bow, or actively using/raising a shield.
    *   *Key Configs: `enableStateConflictCheck` (master toggle), `itemUseStateClearTicks`*
*   **Combat Logging:** Penalizes players who disconnect from the server shortly after engaging in PvP combat to evade consequences.
    *   *Key Configs: `enableCombatLogDetection`, `combatLogThresholdSeconds`, `combatLogFlagIncrement`*

### C. World Interaction & Building Violation Detections
*   **Nuker:** Detects rapid or wide-area block breaking inconsistent with normal gameplay.
    *   *Key Configs: `enableNukerCheck`, `nukerMaxBreaksShortInterval`, `nukerCheckIntervalMs`*
*   **Illegal Item Usage/Placement:** Prevents the use or placement of items blacklisted by administrators.
    *   *Key Configs: `enableIllegalItemCheck`, `bannedItemsPlace`, `bannedItemsUse`*
*   **Fast Item Use:** Detects usage of items (e.g., ender pearls, snowballs, potions) faster than their vanilla cooldowns allow.
    *   *Key Configs: `enableFastUseCheck`, `fastUseItemCooldowns` (object mapping item IDs to cooldowns)*
*   **Fast Block Place:** Flags players placing blocks at an inhumanly fast rate, beyond normal capabilities.
    *   *Key Configs: `enableFastPlaceCheck`, `fastPlaceTimeWindowMs`, `fastPlaceMaxBlocksInWindow`*
*   **AutoTool:** Detects suspicious and instant tool switching immediately before breaking a block and/or switching back immediately after.
    *   *Key Configs: `enableAutoToolCheck`, `autoToolSwitchToOptimalWindowTicks`, `autoToolSwitchBackWindowTicks`*
*   **InstaBreak:**
    *   **Unbreakable Blocks:** Identifies players breaking blocks that should be unbreakable (e.g., bedrock by non-ops).
        *   *Key Configs: `enableInstaBreakUnbreakableCheck`, `instaBreakUnbreakableBlocks`*
    *   **Break Speed:** Detects breaking blocks significantly faster than vanilla speeds allow, considering tools and effects.
        *   *Key Configs: `enableInstaBreakSpeedCheck`, `instaBreakTimeToleranceTicks`*
*   **Advanced Building Anomaly Detections:**
    *   **Tower/Pillaring:** Detects rapid vertical "tower" or "pillar" building straight up.
        *   *Key Configs: `enableTowerCheck`, `towerMaxTickGap`, `towerMinHeight`*
    *   **Flat/Static Rotation Building:** Flags unnatural, static, or overly smooth view angles while placing multiple blocks (e.g., bridging).
        *   *Key Configs: `enableFlatRotationCheck`, `flatRotationConsecutiveBlocks`*
    *   **Downward Scaffold:** Detects suspicious downward scaffolding, especially while airborne and moving quickly.
        *   *Key Configs: `enableDownwardScaffoldCheck`, `downwardScaffoldMinBlocks`*
    *   **AirPlace:** Checks for blocks placed against non-solid blocks (air, liquid) without proper support where vanilla mechanics wouldn't allow.
        *   *Key Configs: `enableAirPlaceCheck`, `airPlaceSolidBlocks`*
*   **Anti-Grief Measures:** Provides configurable actions against various forms of griefing.
    *   **TNT, Fire, Lava, Water Placement Control:** Restrict or manage the placement of potentially harmful elements by non-admins.
        *   *Key Configs: `enableTntAntiGrief`, `enableFireAntiGrief`, `enableLavaAntiGrief`, `enableWaterAntiGrief`, and related `allowAdmin...` toggles.*
    *   **Wither Spawning Control:** Manage unauthorized Wither spawns.
        *   *Key Configs: `enableWitherAntiGrief`, `allowAdminWitherSpawn`*
    *   **Block Spam (Rate & Density):** Detects excessively fast or dense block placement in an area.
        *   *Key Configs: `enableBlockSpamAntiGrief` (rate), `enableBlockSpamDensityCheck` (density), and their specific parameters.*
    *   **Entity Spam:** Detects rapid spawning of entities like boats, armor stands, or item frames.
        *   *Key Configs: `enableEntitySpamAntiGrief`, `entitySpamMonitoredEntityTypes`*
    *   **Piston Lag Machines:** Monitors rapid piston activations to identify potential lag-inducing contraptions.
        *   *Key Configs: `enablePistonLagCheck`, `pistonActivationLogThresholdPerSecond`*

### D. Player State & Behavior Violation Detections
*   **Anti-Gamemode Creative (AntiGMC):** Detects and can automatically correct unauthorized Creative mode usage by non-privileged players.
    *   *Key Configs: `enableAntiGmcCheck`, `antiGmcAutoSwitch`, `antiGmcSwitchToGameMode`*
*   **NameSpoof:** Flags player names containing invalid characters, exceeding length limits, or changing too rapidly.
    *   *Key Configs: `enableNameSpoofCheck`, `nameSpoofMaxLength`, `nameSpoofDisallowedCharsRegex`, `nameSpoofMinChangeIntervalTicks`*
*   **Self-Hurt:** Detects suspicious patterns of self-inflicted damage.
    *   *Key Configs: `enableSelfHurtCheck`*
*   **Inventory Modification:** A general category for checks related to illegal items, enchantments, or suspicious inventory actions. (Further specific checks may be developed under this).
    *   *Key Configs: `enableInventoryModCheck`*
*   **Client Anomalies:**
    *   **Invalid Render Distance:** Detects clients reporting an unusually high render distance to the server.
        *   *Key Configs: `enableInvalidRenderDistanceCheck`, `maxAllowedClientRenderDistance`*

### E. Chat Violation Detections
The addon includes a comprehensive suite of chat checks to maintain a clean and fair communication environment.
*   **Spam Control:**
    *   **Fast Message Spam:** Prevents sending messages too quickly.
        *   *Key Configs: `enableFastMessageSpamCheck`, `fastMessageSpamThresholdMs`*
    *   **Max Words Spam:** Limits the number of words in a single message.
        *   *Key Configs: `enableMaxWordsSpamCheck`, `maxWordsSpamThreshold`*
    *   **Content Repetition:** Detects players sending the same or very similar messages repeatedly.
        *   *Key Configs: `enableChatContentRepeatCheck`*
*   **Content Filtering:**
    *   **Swear Word Filtering:** Detects and acts on a configurable list of blacklisted words.
        *   *Key Configs: `enableSwearCheck`, `swearWordList`, `swearCheckMuteDuration`*
    *   **Advertising Filtering:** Basic pattern matching and advanced regex-based link detection to prevent unwanted advertisements, with a whitelist system.
        *   *Key Configs: `enableAntiAdvertisingCheck`, `antiAdvertisingPatterns`, `enableAdvancedLinkDetection`, `advancedLinkRegexList`, `advertisingWhitelistPatterns`*
*   **Chat Formatting & Abuse:**
    *   **CAPS Abuse:** Detects messages with excessive capitalization.
        *   *Key Configs: `enableCapsCheck`, `capsCheckMinLength`, `capsCheckUpperCasePercentage`*
    *   **Character Repetition:** Catches messages with excessive repetition of single characters (e.g., "helloooooo").
        *   *Key Configs: `enableCharRepeatCheck`, `charRepeatMinLength`, `charRepeatThreshold`*
    *   **Symbol Spam:** Flags messages with a high percentage of non-alphanumeric characters.
        *   *Key Configs: `enableSymbolSpamCheck`, `symbolSpamMinLength`, `symbolSpamPercentage`*
    *   **Unicode Abuse (Zalgo):** Detects disruptive Unicode characters or "Zalgo" text.
        *   *Key Configs: `enableUnicodeAbuseCheck`*
    *   **Gibberish/Unreadable Messages:** Attempts to identify messages that appear to be random, unreadable characters.
        *   *Key Configs: `enableGibberishCheck`*
    *   **Excessive Mentions:** Prevents spamming player tags (@player) in messages.
        *   *Key Configs: `enableExcessiveMentionsCheck`*
    *   **Simple Impersonation:** Detects attempts to mimic server or staff messages using common formats or color codes.
        *   *Key Configs: `enableSimpleImpersonationCheck`, `impersonationServerMessagePatterns`*
    *   **Newline Characters / Max Message Length:** Prevents use of newlines and enforces a maximum message length.
        *   *Key Configs: `enableNewlineCheck`, `enableMaxMessageLengthCheck`, `maxMessageLength`*
*   **Chat Behavior Control:**
    *   **Chat During Combat:** Optionally prevents players from chatting for a short duration after engaging in combat.
        *   *Key Configs: `enableChatDuringCombatCheck`, `chatDuringCombatCooldownSeconds`*
    *   **Chat During Item Use:** Optionally prevents players from chatting while actively using certain items (e.g., food, potions).
        *   *Key Configs: `enableChatDuringItemUseCheck`*

## II. Administrative & Server Management Systems

### A. Core Admin Tools
*   **Intuitive Admin Panel:** Accessible via `!panel` (or its alias `!ui`). Provides a graphical user interface for:
    *   Viewing and managing online players (inspect details, kick, ban, mute, freeze, teleport, clear inventory, etc.).
    *   Viewing detailed player flags and violation history.
    *   Accessing server-wide management functions (clear chat, lag clear).
    *   Viewing AntiCheat action logs and player-submitted reports.
    *   Editing many runtime configuration values directly from the UI (some settings are owner-only).
*   **Comprehensive Text Commands:** A full suite of chat-based commands offers granular control over all features and administrative actions. (See [Commands List](Commands.md) for a complete reference).
*   **Persistent Player Data:** Critical player data such as flags, violation records, active mutes, and bans are saved using Minecraft's dynamic properties, ensuring they persist across player sessions and server restarts.
*   **Admin Notifications:** Real-time alerts are sent to administrators for significant cheat detections or actions taken by the AutoMod system. Admin notification preferences can be toggled per admin using the `!notify` command.
    *   *Key Configs: `acGlobalNotificationsDefaultOn` (server default for new admins), `notifyAdminOnBannedPlayerAttempt`*

### B. Automated Moderation (AutoMod)
*   The AutoMod system can automatically apply escalating consequences (warnings, kicks, mutes, temporary bans, or permanent bans) based on configurable flag thresholds for each specific cheat type.
*   Rules are highly customizable, allowing for different punishment ladders for different violations.
*   Actions can include resetting a player's flags for a specific check after a severe punishment.
*   For detailed setup and rule configuration, see [AutoMod Details](AutoModDetails.md).
    *   *Key Configs: `enableAutoMod` (master switch), `automodConfig.js` (file for defining rules), `actionProfiles.js` (file defining immediate actions that trigger flags for AutoMod)*

### C. Flexible Rank System
*   Define roles like Owner, Admin, Member, and create custom ranks with specific permission levels.
*   Permissions control access to commands and certain addon features.
*   Customize visual chat prefixes/suffixes and nametag appearances for each rank.
*   For configuration details, see [Rank System Details](RankSystem.md).
    *   *Key Configs: `ranksConfig.js` (file for defining rank properties and conditions)*

### D. Player Reporting System
*   Players can report others for suspected violations using the `!report <playerName> <reason>` command.
*   Administrators can view, manage, and clear submitted reports using the `!viewreports` and `!clearreports` commands, or via the Admin Panel.
    *   *Key Configs: `reportsViewPerPage` (for `!viewreports` command)*

## III. Server Utility & Player Experience Features

### A. Dynamic World Border System
*   Create and manage per-dimension (Overworld, Nether, End) world borders.
*   Supports **square** or **circle** shapes with configurable centers and sizes/radii.
*   **Damage System:** Optionally inflict damage on players who venture outside the border. Damage amount, interval, and a threshold for automatic teleportation back inside are configurable.
*   **Visuals:** Display the border using configurable particle effects. Settings include particle type, density, visual range, wall height, and an optional pulsing effect. Admins can set a global default particle or per-dimension overrides.
*   **Dynamic Resizing:** Gradually shrink or expand borders over a specified time, with options for different interpolation methods (e.g., linear, ease-out). Resize operations can be paused and resumed.
*   Full configuration and commands are detailed in [World Border Details](WorldBorderDetails.md).
    *   *Key Configs: `enableWorldBorderSystem`, `worldBorderDefaultEnableDamage`, `worldBorderDefaultDamageAmount`, `worldBorderEnableVisuals`, `worldBorderParticleName`, etc.*

### B. Teleport Request System (TPA/TPAHere)
*   Allows players to request teleports to other players (`!tpa <playerName>`) or request others to teleport to them (`!tpahere <playerName>`).
*   Features include:
    *   Configurable request timeout periods.
    *   Cooldowns between sending requests.
    *   Teleport warmup period, during which movement or taking damage can cancel the teleport.
    *   Players can toggle their TPA acceptance status using `!tpastatus <on|off>`.
    *   *Key Configs: `enableTpaSystem`, `tpaRequestTimeoutSeconds`, `tpaRequestCooldownSeconds`, `tpaTeleportWarmupSeconds`, `tpaCancelOnMoveDuringWarmup`, `tpaMovementTolerance`*

### C. Player Information & Engagement
*   **Customizable Welcome Messages:** Greet players when they join the server.
    *   *Key Configs: `enableWelcomerMessage`, `welcomeMessage`*
*   **New Player Join Notifications:** Optionally alert admins when a completely new player joins the server for the first time.
    *   *Key Configs: `notifyAdminOnNewPlayerJoin`*
*   **Death Coordinates:** Optionally inform players of their last death location upon respawning.
    *   *Key Configs: `enableDeathCoordsMessage`, `deathCoordsMessage`*
*   **Server Rules Display:** Players can view server rules using the `!rules` command.
    *   *Key Configs: `serverRules` (string containing all rules)*
*   **Helpful Links:** Admins can configure a list of helpful links (e.g., Discord, website, forums) accessible via `!helplinks` (or a UI button).
    *   *Key Configs: `helpLinks` (array of title/URL objects)*
*   **X-Ray Ore Mining Notifications:** Optionally notify admins when players mine valuable ores like diamonds or ancient debris. This is a monitoring tool, not a preventative measure.
    *   *Key Configs: `xrayDetectionNotifyOnOreMineEnabled`, `xrayDetectionMonitoredOres`, `xrayDetectionAdminNotifyByDefault`*
*   **Cosmetic Death Effects:** Admins can enable optional particles and sounds to play when a player dies, adding a bit of flair.
    *   *Key Configs: `enableDeathEffects`, `deathEffectParticleName`, `deathEffectSoundId`*

This overview covers the primary features. For specific configuration options and command usage, please refer to the linked detailed documentation within the `Docs` folder.
