# Addon Development Resources

This folder contains useful resources, documentation links, and potentially helper scripts for the development and debugging of this Minecraft Bedrock Edition addon.

## Official Minecraft Bedrock Creator Documentation

The primary hub for all official Bedrock addon development documentation is:
*   **[Minecraft Creator Documentation (Bedrock)](https://learn.microsoft.com/en-us/minecraft/creator/?view=minecraft-bedrock-stable)**

Below are links to specific sections particularly relevant for Add-On development, with an emphasis on Anti-Cheat capabilities:

### Scripting APIs (`@minecraft/server`)
*   **Overview & Getting Started:**
    *   [Getting Started with Scripting APIs](https://learn.microsoft.com/en-us/minecraft/creator/documents/scriptingintroduction?view=minecraft-bedrock-stable)
    *   [Scripting API Reference (Main Page)](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/?view=minecraft-bedrock-stable)
    *   [Using TypeScript with Minecraft Scripting APIs](https://learn.microsoft.com/en-us/minecraft/creator/documents/scriptinggettingstarted?view=minecraft-bedrock-stable)
*   **Core World & Event Handling:**
    *   [World Class (world, events)](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/world?view=minecraft-bedrock-stable)
    *   [WorldBeforeEvents Class (cancellable events)](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/worldbeforeevents?view=minecraft-bedrock-stable)
    *   [WorldAfterEvents Class (post-action events)](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/worldafterevents?view=minecraft-bedrock-stable)
*   **Entities & Players:**
    *   [Entity Class (base for all entities)](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable)
    *   [Player Class (specific to players)](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable)
    *   [Entity Behavior Introduction](https://learn.microsoft.com/en-us/minecraft/creator/documents/entitybehaviorintroduction?view=minecraft-bedrock-stable)
    *   [Entity Events (JSON-based)](https://learn.microsoft.com/en-us/minecraft/creator/documents/entityevents?view=minecraft-bedrock-stable)
*   **Items:**
    *   [ItemStack Class](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemstack?view=minecraft-bedrock-stable)
    *   [Item Components (JSON-based)](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponents?view=minecraft-bedrock-stable)
*   **Blocks:**
    *   [Block Class](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/block?view=minecraft-bedrock-stable)
    *   [Block Components (JSON-based)](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents?view=minecraft-bedrock-stable)
*   **User Interface (Server-Side):**
    *   [@minecraft/server-ui Module](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/minecraft-server-ui?view=minecraft-bedrock-stable)
    *   [ActionFormData Class](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/actionformdata?view=minecraft-bedrock-stable)
    *   [MessageFormData Class](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/messageformdata?view=minecraft-bedrock-stable)
    *   [ModalFormData Class](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/modalformdata?view=minecraft-bedrock-stable)
*   **Other Useful Links:**
    *   [Introduction to Behavior Packs](https://learn.microsoft.com/en-us/minecraft/creator/documents/behaviorpack?view=minecraft-bedrock-stable)
    *   [manifest.json Reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/addonsreference/filedetails/manifest?view=minecraft-bedrock-stable)
    *   [Commands Introduction](https://learn.microsoft.com/en-us/minecraft/creator/documents/commandsintroduction?view=minecraft-bedrock-stable)
    *   [Command Reference](https://learn.microsoft.com/en-us/minecraft/creator/commands/?view=minecraft-bedrock-stable)

### Official Mojang & Microsoft Samples/Tools
*   **Mojang Bedrock Addon Samples**:
    *   [https://github.com/Mojang/bedrock-samples](https://github.com/Mojang/bedrock-samples)
*   **Mojang Minecraft Creator Tools**:
    *   [https://github.com/Mojang/minecraft-creator-tools](https://github.com/Mojang/minecraft-creator-tools)
*   **Microsoft Minecraft Samples**:
    *   [https://github.com/microsoft/minecraft-samples](https://github.com/microsoft/minecraft-samples)
*   **Mojang Minecraft Scripting Libraries**:
    *   [https://github.com/Mojang/minecraft-scripting-libraries](https://github.com/Mojang/minecraft-scripting-libraries)

## Community Anti-Cheat Projects & Resources

These are community-driven open-source anti-cheat projects that serve as excellent examples and learning resources:
*   **Scythe Anticheat:**
    *   GitHub: [https://github.com/Scythe-Anticheat/Scythe-Anticheat](https://github.com/Scythe-Anticheat/Scythe-Anticheat)
    *   Focuses on a wide range of detections using Beta APIs and mcfunctions. Features include detailed setup, in-game commands, and a configuration file.
*   **SafeGuard Anticheat:**
    *   GitHub: [https://github.com/BlaizerBrumo/SafeGuard](https://github.com/BlaizerBrumo/SafeGuard)
    *   Offers protection against combat, item, and movement hacks. Includes an admin panel item for configuration, Xray alerts, and various utility features.

## Purpose of this Folder

This directory can be used by developers (including AI assistants like Jules) to:
- Store links to relevant external documentation.
- Keep notes on development practices specific to this addon.
- Place utility scripts for debugging or build processes.
- Maintain any other resources that facilitate understanding and working on this addon.

## Target Minecraft Version
The addon currently targets Minecraft Bedrock version 1.21.80 and newer. Please ensure development and testing align with this version.

## Task Management for Development

To help track the development progress of this addon, especially when working with AI assistants or multiple developers, a simple task management system is maintained within the `Dev/tasks/` directory. This directory contains the following files:

*   **`Dev/tasks/completed.md`**: Lists tasks and features that have been successfully implemented, tested (where applicable), and submitted to the main codebase. Each entry should ideally include a brief description of the completed work and a reference to the submission (e.g., date, commit SHA if available).

*   **`Dev/tasks/ongoing.md`**: Details the task(s) currently being actively worked on. This file should be updated when a developer or AI assistant begins work on a new task from the `todo.md` list. It should clearly state the objectives of the ongoing task.

*   **`Dev/tasks/todo.md`**: A list of planned features, improvements, bug fixes, and areas for future investigation. Tasks are generally categorized by priority (e.g., High, Medium, Low) or by type (e.g., New Features, Refactoring, Documentation). When a task is selected for development, it should be moved from this file to `ongoing.md`.

Maintaining these files helps ensure clarity on project status and facilitates smoother handoffs or continuations of work.

## Scripting Language Notes

**Current Scripting Language: Plain JavaScript**

The Behavior Pack scripts for this addon (`AntiCheatsBP/scripts/`) are currently written in plain JavaScript (.js files).

*   **Rationale:** While TypeScript was initially considered for its benefits (static typing, modern features), complexities were encountered in establishing a consistent and reliable TypeScript-to-JavaScript compilation process within the GitHub Actions CI/CD workflow. To ensure a stable and functional build pipeline for releases, the decision was made to use plain JavaScript directly.
*   **Future Considerations for TypeScript:** If TypeScript is to be reintroduced in the future, it would require:
    *   A robust local development setup for TypeScript compilation (e.g., using `tsc` with a `tsconfig.json`).
    *   A reliable method for managing TypeScript type definitions (e.g., via a `package.json` and `npm install`).
    *   Ensuring that the CI/CD workflow can replicate this compilation process consistently to produce valid JavaScript for the game.
*   **Guidance for Now:** Please write all new Behavior Pack scripts in plain JavaScript. Ensure that the `entry` point in `AntiCheatsBP/manifest.json` correctly points to the JavaScript main file.

## Important Workflow Notes for AI Assistants

### Regarding File Deletions

**Issue:** When an AI assistant "deletes" a file in a feature branch, this deletion may not persist correctly when the feature branch is merged into the `main` branch. The file might reappear in `main` despite being deleted in the feature branch.

**Workaround/Procedure:** To ensure a file is properly removed from the project:

1.  **Empty the File:** Remove all content from the file you intend to delete.
2.  **Rename and Move:**
    *   Rename the file to clearly indicate its status and original type, e.g., `deleted_<original_name>.<original_extension>` or `deleted_1.<original_extension>`, `deleted_2.<original_extension>`, etc. if there are multiple.
    *   Move this emptied and renamed file to a dedicated subdirectory within the `Dev/` folder, such as `Dev/files_pending_deletion/`.
3.  **Commit Changes:** Commit the emptied file now located and renamed in the `Dev/files_pending_deletion/` directory.
4.  **Manual Deletion on `main`:** A human developer will then need to manually perform the final `git rm` of these files in the `Dev/files_pending_deletion/` directory directly on the `main` branch (or during the merge process if the platform allows direct commits to main or post-merge cleanups) to ensure they are properly removed from the repository's history.

This process makes the intent to delete clear and works around potential issues with how file deletions in branches are handled by the git tooling or merge process.

### Guidelines for AI Development Sessions (e.g., Jules)

To ensure consistency, continuity, and up-to-date documentation when an AI assistant like Jules works on this addon:

1.  **Maintain Task Files:**
    *   Before starting new work, review `Dev/tasks/ongoing.md` and `Dev/tasks/todo.md`.
    *   If continuing a previous task, ensure `Dev/tasks/ongoing.md` reflects this.
    *   When starting a new task from `Dev/tasks/todo.md`, move it to `Dev/tasks/ongoing.md` and update its description if necessary.
    *   Upon completion and submission of a task, summarize it in `Dev/tasks/completed.md` and clear `Dev/tasks/ongoing.md` (or update it if starting another task immediately).
    *   Add any newly identified future work, bugs, or ideas to `Dev/tasks/todo.md`.

2.  **Update Root `README.md`:**
    *   If significant new user-facing features are added or major changes are made to the addon's functionality, the AI assistant should also update the main project `README.md` (located in the repository root) to reflect these changes. This keeps the primary user documentation current.

3.  **Follow Existing Code Style and Documentation Practices:**
    *   Adhere to the established coding style found in the existing `.js` files.
    *   Add JSDoc comments for new functions and complex logic, similar to existing documentation.
