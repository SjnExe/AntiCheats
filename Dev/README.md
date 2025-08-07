# Addon Development Resources

This folder contains useful resources, documentation links, and potentially helper scripts for the development and debugging of this Minecraft Bedrock Edition addon.

## Official Minecraft Bedrock Creator Documentation

The primary hub for all official Bedrock addon development documentation is:

- **[Minecraft Creator Documentation (Bedrock)](https://learn.microsoft.com/en-us/minecraft/creator/?view=minecraft-bedrock-stable)**

Below are links to specific sections particularly relevant for Add-On development, with an emphasis on Anti-Cheat capabilities:

### Scripting APIs (`@minecraft/server`)

- **Overview & Getting Started:**
  - [Getting Started with Scripting APIs](https://learn.microsoft.com/en-us/minecraft/creator/documents/scriptingintroduction?view=minecraft-bedrock-stable)
  - [Scripting API Reference (Main Page)](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/?view=minecraft-bedrock-stable)
  - [Using TypeScript with Minecraft Scripting APIs](https://learn.microsoft.com/en-us/minecraft/creator/documents/scriptinggettingstarted?view=minecraft-bedrock-stable)
- **Core World & Event Handling:**
  - [World Class (world, events)](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/world?view=minecraft-bedrock-stable)
  - [WorldBeforeEvents Class (cancellable events)](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/worldbeforeevents?view=minecraft-bedrock-stable)
  - [WorldAfterEvents Class (post-action events)](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/worldafterevents?view=minecraft-bedrock-stable)
- **Entities & Players:**
  - [Entity Class (base for all entities)](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable)
  - [Player Class (specific to players)](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable)
  - [Entity Behavior Introduction](https://learn.microsoft.com/en-us/minecraft/creator/documents/entitybehaviorintroduction?view=minecraft-bedrock-stable)
  - [Entity Events (JSON-based)](https://learn.microsoft.com/en-us/minecraft/creator/documents/entityevents?view=minecraft-bedrock-stable)
- **Items:**
  - [ItemStack Class](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemstack?view=minecraft-bedrock-stable)
  - [Item JSON Reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/?view=minecraft-bedrock-stable)
- **Blocks:**
  - [Block Class](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/block?view=minecraft-bedrock-stable)
  - [Block JSON Reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/?view=minecraft-bedrock-stable)
- **User Interface (Server-Side):**
  - [@minecraft/server-ui Module](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/minecraft-server-ui?view=minecraft-bedrock-stable)
  - [ActionFormData Class](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/actionformdata?view=minecraft-bedrock-stable)
  - [MessageFormData Class](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/messageformdata?view=minecraft-bedrock-stable)
  - [ModalFormData Class](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/modalformdata?view=minecraft-bedrock-stable)
- **Other Useful Links:**
  - [Introduction to Behavior Packs](https://learn.microsoft.com/en-us/minecraft/creator/documents/behaviorpack?view=minecraft-bedrock-stable)
  - [Introduction to Resource Packs](https://learn.microsoft.com/en-us/minecraft/creator/documents/resourcepack?view=minecraft-bedrock-stable)
  - [Commands Introduction](https://learn.microsoft.com/en-us/minecraft/creator/documents/commandsintroduction?view=minecraft-bedrock-stable)
  - [Command Reference](https://learn.microsoft.com/en-us/minecraft/creator/commands/?view=minecraft-bedrock-stable)

### Key Version Updates & Overviews

- [Minecraft Bedrock 1.21.100 Update Notes for Creators](https://learn.microsoft.com/en-us/minecraft/creator/documents/update1.21.100?view=minecraft-bedrock-stable)
- [Scripting V2.0.0 Overview](https://learn.microsoft.com/en-us/minecraft/creator/documents/scriptingv2.0.0overview?view=minecraft-bedrock-stable) (Details on API v2 changes and Custom Components V2)

### Official Mojang & Microsoft Samples/Tools

- **Mojang Bedrock Addon Samples**:
  - [https://github.com/Mojang/bedrock-samples](https://github.com/Mojang/bedrock-samples)
- **Mojang Minecraft Creator Tools**:
  - [https://github.com/Mojang/minecraft-creator-tools](https://github.com/Mojang/minecraft-creator-tools)
- **Microsoft Minecraft Samples**:
  - [https://github.com/microsoft/minecraft-samples](https://github.com/microsoft/minecraft-samples)
- **Mojang Minecraft Scripting Libraries**:
  - [https://github.com/Mojang/minecraft-scripting-libraries](https://github.com/Mojang/minecraft-scripting-libraries)

## Community Documentation

- **Bedrock.dev**:
  - [https://bedrock.dev/](https://bedrock.dev/)
  - A community-driven documentation website for Minecraft Bedrock Edition. It provides detailed information on various aspects of addon development, including blocks, items, entities, and more.

## Performance Profiling

To help identify potential bottlenecks, the addon includes a basic performance profiling feature.

- **Enable:** Set `enablePerformanceProfiling: true` in `AntiCheatsBP/scripts/config.js`.
- **Logging:** When enabled, aggregated performance data for the main tick loop, individual checks, and event handlers will be logged periodically to the server console/logs (via `playerUtils.debugLog` with a `PerformanceProfile` tag).
- **Usage:** This data can help developers pinpoint specific areas that might be consuming more resources than expected. It's recommended to only enable this for temporary debugging sessions, as continuous profiling can itself have a minor performance overhead.
- **Configuration:** The logging interval can be adjusted with `logPerformanceProfileIntervalTicks` in the config.

## Community Anti-Cheat Projects & Resources

These are community-driven open-source anti-cheat projects that serve as excellent examples and learning resources:

- **Scythe Anticheat:**
  - GitHub: [https://github.com/Scythe-Anticheat/Scythe-Anticheat](https://github.com/Scythe-Anticheat/Scythe-Anticheat)
  - Focuses on a wide range of detections using Beta APIs and mcfunctions. Features include detailed setup, in-game commands, and a configuration file.
- **SafeGuard Anticheat:**
  - GitHub: [https://github.com/BlaizerBrumo/SafeGuard](https://github.com/BlaizerBrumo/SafeGuard)
  - Offers protection against combat, item, and movement hacks. Includes an admin panel item for configuration, Xray alerts, and various utility features.

## Purpose of this Folder

This directory can be used by developers (including AI assistants like Jules) to:

- Store links to relevant external documentation.
- Keep notes on development practices specific to this addon.
- Place utility scripts for debugging or build processes.
- Maintain any other resources that facilitate understanding and working on this addon.

## Command Registration

The `AntiCheatsBP/scripts/core/commandRegistry.js` file is crucial for registering all chat commands used by the addon. This file imports all individual command modules from `AntiCheatsBP/scripts/commands/` and exports them in an array that the `commandManager` uses.

**Important: Manual Updates Required**

Previously, this file was auto-generated by a script. This script has been removed. You must now **manually** update `AntiCheatsBP/scripts/core/commandRegistry.js` whenever you add, remove, or rename a command file in the `AntiCheatsBP/scripts/commands/` directory.

Failure to do so will result in new commands not being registered or errors if the registry references missing or incorrectly named command files.

**How to Manually Update `commandRegistry.js`:**

1. **Open `AntiCheatsBP/scripts/core/commandRegistry.js`**.
2. **If adding a new command (e.g., `newcmd.js`):**
   - Add an import statement at the top with the other imports:
   ```javascript
   import * as newcmdCmd from '../commands/newcmd.js';
   ```
   - Add the module reference (e.g., `newcmdCmd`) to the `commandModules` array, maintaining alphabetical order if possible:
   ```javascript
   export const commandModules = [
       // ... other commands
       newcmdCmd,
       // ... other commands
   ];
   ```
3. **If removing a command:**
   - Delete its corresponding `import` statement.
   - Remove its reference from the `commandModules` array.
4. **If renaming a command file (e.g., `oldcmd.js` to `renamedcmd.js`):**
   - Update its `import` statement:
   ```javascript
   // Before
   // import * as oldcmdCmd from '../commands/oldcmd.js';
   // After
   import * as renamedcmdCmd from '../commands/renamedcmd.js';
   ```
   - Update its reference in the `commandModules` array:
   ```javascript
   // Before
   // oldcmdCmd,
   // After
   // renamedcmdCmd,
   ```
   - Ensure the alias used in the import (e.g., `renamedcmdCmd`) is also updated in the array.

Always double-check your changes to ensure the syntax is correct and all registered commands exist.

## Target Minecraft Version

The addon currently targets Minecraft Bedrock version 1.21.100 and newer. Please ensure development and testing align with this version.

## Codebase Architecture Overview

The AntiCheats addon is structured to be modular and configurable. Here's a high-level overview:

- **`AntiCheatsBP/scripts/`**: This is the root for all behavior pack scripts.
  - **`loader.js` / `initializationManager.js`**: These scripts handle the addon's startup. `loader.js` is the initial entry point, which then calls into `initializationManager.js` to subscribe to events, initialize all core modules, and start the main tick loops.
  - **`main.js`**: This file defines the core, recurring tick loop functions (`mainTick` and `tpaTick`) that are responsible for processing all periodic checks and player data updates. These loops are started by the `initializationManager`.
  - **`config.js`**: Contains a vast array of configurable settings for various features, checks, system behaviors, and general check toggles. It also supports runtime updates for many of these values. (Note: Command aliases are now defined within individual command files, not centrally in `config.js`.)
  - **`core/`**: Houses the central manager modules that form the backbone of the addon:
    - `playerDataManager.js`: Manages runtime and persistent data for each player (`PlayerAntiCheatData`), including flags, mutes, bans, and various states needed by checks. Handles data serialization to dynamic properties.
    - `commandManager.js`: Registers, parses, and executes chat-based commands. Handles permission checking and alias resolution.
    - `actionManager.js`: Executes configured actions (flagging, logging, notifying) based on cheat detection profiles when a check is triggered.
    - `logManager.js`: Manages the storage and retrieval of action logs (admin commands, system events), persisting them to dynamic properties.
    - `automodManager.js`: Handles automated moderation actions (warn, kick, ban, mute) based on player flag counts and escalating rules defined in `automodConfig.js`.
    - `rankManager.js`: Manages player ranks, permission levels, and their display properties (chat/nametag prefixes) based on `ranksConfig.js`.
    - `reportManager.js`: Manages player-submitted reports, storing them and providing admin access.
    - `tpaManager.js`: Manages the Teleport Ask (TPA/TPAHere) system.
    - `panelLayoutConfig.js`: (New) Defines the structure, content (button texts, icons), permission levels, sorting, and actions for all dynamic UI panels (e.g., `!panel` content). This allows for easy customization of panel hierarchies and elements without altering `uiManager.js` logic.
    - `uiManager.js`: Core module for displaying UI. Features a generic `showPanel` function that dynamically renders hierarchical, permission-based UI panels defined in `panelLayoutConfig.js`. Manages UI navigation state per player.
    - `chatProcessor.js`: Handles pre-processing of chat messages for checks and command detection.
    - `eventHandlers.js`: Contains listeners for various Minecraft game events, which often trigger specific checks or update player data.
    - `actionProfiles.js`: Defines immediate consequences (flagging, logging, notifications) for specific `checkType` violations. This is a critical configuration file linking detections to actions.
    - `automodConfig.js`: Defines rules for escalating automated actions based on accumulated flag counts for different `checkType`s.
    - `ranksConfig.js`: Defines the available ranks, their permissions, and display properties.
    - `textDatabase.js`: Stores reusable or configurable user-facing strings, particularly for command responses and dynamic messages. Static single-use UI labels are typically hardcoded in their respective UI modules. Panel button texts and titles are defined in `panelLayoutConfig.js`.
  - **`checks/`**: Contains all the individual cheat detection logic, categorized into subdirectories (e.g., `movement/`, `combat/`, `world/`, `player/`, `chat/`). Each check file typically exports one or more functions that perform specific violation detections.
    - `checks/index.js`: A barrel file that re-exports all check modules for easy importing.
  - **`commands/`**: Contains modules for each chat command. Each command module defines its name, syntax, permission level, and execution logic.
  - **`core/commandRegistry.js`**: Resides in the `core` directory and acts as a central registry (barrel file) that imports and re-exports all individual command modules from the `commands/` directory. It is auto-generated.
  - **`utils/`**: Provides utility functions used across the addon (e.g., `playerUtils.js` for player-related helpers like `getString`, `notifyAdmins`, `findPlayer`; `worldUtils.js` for world-related helpers).
    - `utils/index.js`: A barrel file for utility modules.
  - **`types.js`**: Contains JSDoc `@typedef` definitions for complex object structures used throughout the addon, like `PlayerAntiCheatData`, `CommandDependencies`, etc.

### Key Data Structures and Flows

- **`PlayerAntiCheatData` (`pData`)**: This is a central object, managed by `playerDataManager.js`, that stores all runtime and some persistent data for each player. This includes their current flags for various cheats, violation counts, mute/ban status, last known positions, velocities, and other states required by different checks.
  - **Critical Note on `pData` Integrity:** The accuracy and effectiveness of almost all cheat detection checks are critically dependent on the integrity, accuracy, and timeliness of the `PlayerAntiCheatData` (`pData`) object for each player. Errors in `pData` acquisition, updates, or serialization can lead to a cascade of malfunctions across various checks, potentially resulting in false positives, false negatives, or unexpected behavior. Developers must exercise extreme caution when modifying `playerDataManager.js` or any logic that interacts with or updates `pData`.
- **Detection-to-Action Flow**:
  1. **Detection**: An event occurs (e.g., player moves, attacks, chats) or a periodic tick check runs.
  2. A specific **check function** (e.g., from `flyCheck.js` or `cpsCheck.js`) analyzes player actions or data.
  3. If a violation is detected, the check function calls `actionManager.executeCheckAction(player, checkType, details, dependencies)`. The `checkType` is a `camelCase` string identifying the specific violation (e.g., `movementFlyHover`, `combatCpsHigh`).
  4. **Immediate Action**: `actionManager` looks up the `checkType` in `core/actionProfiles.js`. Based on the profile, it may:
     - Flag the player by calling `playerDataManager.addFlag(...)`.
     - Log the event using `logManager.addLog(...)`.
     - Notify admins using `playerUtils.notifyAdmins(...)`.
     - Cancel the game event or chat message.
  5. **Automated Moderation (AutoMod)**: When `playerDataManager.addFlag(...)` is called, it can trigger `automodManager.processAutoModActions(...)`.
  6. `automodManager` consults `core/automodConfig.js` using the `checkType` (which is the same as the flag type). If the player's accumulated flag count for that `checkType` meets a defined threshold in the AutoMod rules, further automated actions (like warnings, kicks, mutes, or bans) are executed.

### Text and Localization

- User-facing text for command responses, shared warnings, and configurable messages is managed via `textDatabase.js`. Strings are retrieved using the `playerUtils.getString(key, params)` utility function.
- Static, single-use UI labels and descriptive texts not part of the dynamic panel system are typically hardcoded directly in their respective UI modules (e.g., within modal forms shown by leaf action functions).
- Titles, button texts, and other static display strings for the main, dynamically generated panels (e.g., `!panel` UI) are defined in `AntiCheatsBP/scripts/core/panelLayoutConfig.js`.

## Task Management for Development

To help track the development progress of this addon, especially when working with AI assistants or multiple developers, a simple task management system is maintained within the `Dev/tasks/` directory. This directory contains the following files:

- **`Dev/tasks/completed.md`**: Lists tasks and features that have been successfully implemented, tested (where applicable), and submitted to the main codebase. Each entry should ideally include a brief description of the completed work and a reference to the submission (e.g., date, commit SHA if available).
- **`Dev/tasks/ongoing.md`**: Details the task(s) currently being actively worked on. This file should be updated when a developer or AI assistant begins work on a new task from the `todo.md` list. It should clearly state the objectives of the ongoing task. *This file should be updated by the AI at the start of its work session.*
- **`Dev/tasks/todo.md`**: A list of planned features, improvements, bug fixes, and areas for future investigation. Tasks are generally categorized by priority (e.g., High, Medium, Low) or by type (e.g., New Features, Refactoring, Documentation). When a task is selected for development, it should be moved from this file to `ongoing.md`. *New tasks identified by the AI can be added here.*

Maintaining these files helps ensure clarity on project status and facilitates smoother handoffs or continuations of work.

## Scripting Language Notes

**Current Scripting Language: Plain JavaScript**

The Behavior Pack scripts for this addon (`AntiCheatsBP/scripts/`) are currently written in plain JavaScript (.js files).

- **Rationale:** While TypeScript was initially considered for its benefits (static typing, modern features), complexities were encountered in establishing a consistent and reliable TypeScript-to-JavaScript compilation process within the GitHub Actions CI/CD workflow. To ensure a stable and functional build pipeline for releases, the decision was made to use plain JavaScript directly.
- **Future Considerations for TypeScript:** If TypeScript is to be reintroduced in the future, it would require:
  - A robust local development setup for TypeScript compilation (e.g., using `tsc` with a `tsconfig.json`).
  - A reliable method for managing TypeScript type definitions (e.g., via a `package.json` and `npm install`).
  - Ensuring that the CI/CD workflow can replicate this compilation process consistently to produce valid JavaScript for the game.
- **Guidance for Now:** Please write all new Behavior Pack scripts in plain JavaScript. Ensure that the `entry` point in `AntiCheatsBP/manifest.json` correctly points to the JavaScript main file.

## Important Workflow Notes for AI Assistants

For detailed guidelines, project-specific conventions, and workflow instructions tailored for AI assistants (like Jules) working on this codebase, please refer to the main **[AGENTS.md](../../AGENTS.md)** file located in the root of the repository.

This includes crucial information on:

- Task management using the `Dev/tasks/` directory.
- Responsibilities for updating user-facing documentation (e.g., root `README.md`, files in `Docs/`).
- Adherence to coding standards (`Dev/CodingStyle.md`, `Dev/StandardizationGuidelines.md`) and JSDoc practices.
- Key architectural points and critical naming conventions (e.g., `camelCase` for `checkType` and `actionType`).
