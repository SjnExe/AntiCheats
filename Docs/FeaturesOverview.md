# AntiCheats Addon: Full Features Overview

This document provides a detailed breakdown of the features available in the AntiCheats Addon.

## Core Detection Capabilities

The addon is equipped to identify a wide array of common cheating behaviors:

*   **Movement Cheats:**
    *   **Fly:** Detects players moving vertically or horizontally in the air without proper justification (e.g., elytra, effects).
    *   **Speed:** Identifies players moving at speeds unattainable through legitimate means (sprinting, effects).
    *   **NoFall:** Catches players who negate fall damage without valid reasons (e.g., water, slime blocks, effects).
    *   *(Other specific movement exploits as developed)*

*   **Combat Cheats:**
    *   **Reach:** Detects players hitting entities or interacting with blocks from distances beyond normal vanilla limits.
    *   **CPS/AutoClicker:** Monitors click/attack rates to identify abnormally high Clicks Per Second, indicative of auto-clickers.
    *   **KillAura/MultiAura:** Identifies players rapidly attacking multiple entities or entities through walls/obstructions.
    *   *(Other combat anomalies as developed)*

*   **World Interaction & Player Behavior Cheats:**
    *   **Nuker:** Detects players breaking an unusually large number of blocks in a short period or wide area.
    *   **Illegal Item Usage/Placement:** Prevents the use or placement of items blacklisted by administrators (configurable).
    *   **AntiGMC (GameMode Creative):** Alerts or acts if non-authorized players switch to Creative mode.
    *   **NameSpoof:** Detects players using invalid characters, excessively long names, or rapidly changing names.
    *   **InstaBreak:** Identifies players breaking blocks significantly faster than vanilla speeds allow, even with enchantments/effects.
    *   **Scaffolding/Towering:** Detects unnatural building patterns like rapid upward or outward building.
    *   *(Other specific world interaction or player state exploits as developed)*

*   **Exploit Detections:**
    *   **Nether Roof Access:** Monitors and can prevent players from accessing the area above the Nether bedrock ceiling.
    *   **Combat Logging:** Flags players who disconnect from the server shortly after engaging in PvP combat.

## Administrative & Management Tools

*   **Comprehensive Admin UI:** Accessible via `!panel` (or `!ui`), providing a user-friendly interface for:
    *   Viewing online players and their AntiCheat status.
    *   Inspecting individual player flags and violation details.
    *   Executing moderation actions (kick, ban, mute, freeze, etc.).
    *   Managing server-wide settings related to the AntiCheat system.
    *   Viewing system logs and player reports.
*   **Extensive Text Commands:** A full suite of chat-based commands for fine-grained control. See [Commands Guide](Commands.md).
*   **Persistent Player Data:**
    *   Violation flags and key player data (like mute/ban status) are saved across server restarts.
    *   Allows for tracking repeat offenders and escalating actions.
*   **Admin Notifications:** Real-time alerts to administrators for significant detections or AutoMod actions.

## Customization & Automation

*   **Highly Configurable System:**
    *   Most features and checks can be enabled/disabled.
    *   Detection thresholds, sensitivity, and specific parameters for many checks can be adjusted in `config.js` and related configuration files.
    *   Refer to the [Configuration Guide](ConfigurationGuide.md) for details.
*   **Automated Moderation (AutoMod):**
    *   Define rules to automatically issue warnings, kicks, temporary bans, or permanent bans based on accumulated flag counts for specific cheat types.
    *   Highly customizable rule sets and action parameters.
    *   See [AutoMod Details](AutoModDetails.md) for in-depth information.

## Server Utility Features

*   **Advanced World Border:**
    *   Per-dimension (Overworld, Nether, End) configurable borders.
    *   Supports square or circular shapes.
    *   Optional damage for players outside the border.
    *   Visual particle effects to indicate border proximity.
    *   Gradual resizing capabilities (shrinking/expanding over time).
    *   See [World Border Details](WorldBorderDetails.md) for more.
*   **Rank System:**
    *   Basic system to visually distinguish Owner, Admin, and Member roles.
    *   Configurable chat prefixes and nametag appearances.
    *   Permission levels tied to ranks for command access.
    *   See [Rank System Details](RankSystem.md) for setup.
*   **Player Utilities:**
    *   TPA System (Teleport Ask): Allows players to request teleports to each other, with admin-configurable settings.
    *   Death Coordinates: Optionally informs players of their death location.
    *   Welcome Messages: Customizable messages for players joining the server.

This overview covers the primary features. For specific configuration options and usage, please refer to the linked detailed documentation within the `Docs` folder.
