# Ongoing Tasks
*(Date: Current Session - Handover)*

---
*Previous tasks are documented in completed.md. This file lists tasks to be continued by a new AI assistant session.*

*   **1. Integration: Deferred Player Data Saving**:
    *   **Objective:** Fully implement the triggering mechanism for the deferred player data saving system. The `playerDataManager.js` has been refactored to support this (with `isDirtyForSave` flag and `saveDirtyPlayerData` function).
    *   **Required Next Actions:**
        *   **Modify `AntiCheatsBP/scripts/main.js`**:
            *   Import `saveDirtyPlayerData` from `playerDataManager.js`.
            *   In the main tick loop (`system.runInterval`), add logic to periodically iterate through all active players (e.g., using `world.getAllPlayers()` and `playerDataManager.getPlayerData()`).
            *   For each player, if their `pData.isDirtyForSave` is true, call `await playerDataManager.saveDirtyPlayerData(player)`.
            *   Define and implement a suitable interval for this periodic save (e.g., every 10-30 seconds, perhaps by using a tick counter `currentTick % (20 * 30) === 0`).
        *   **Modify `AntiCheatsBP/scripts/core/eventHandlers.js`**:
            *   Import `saveDirtyPlayerData` from `playerDataManager.js`.
            *   In the `handlePlayerLeave` function, ensure `await playerDataManager.saveDirtyPlayerData(eventData.player)` is called *before* `playerDataManager.cleanupActivePlayerData` or any removal of the player's runtime data. This is to save any pending changes for the leaving player.
    *   **Primary Goal:** Ensure data persistence functions correctly and performantly with the new deferred saving model.

*   **2. Continue: Optimization and Code Efficiency Review**:
    *   **Overall Objective:** Review project files to improve runtime performance (primary goal) and reduce code LoC (secondary goal, where it doesn't conflict with performance).
    *   **Completed Reviews for this Objective (in this session):**
        *   `AntiCheatsBP/scripts/config.js`: Minor comment cleanup.
        *   `AntiCheatsBP/scripts/utils/playerUtils.js`: Refactored for LoC reduction (ternaries, array methods).
        *   `AntiCheatsBP/scripts/utils/itemUtils.js`: Reviewed; no LoC changes made.
        *   `AntiCheatsBP/scripts/core/playerDataManager.js`: Refactored for deferred saving (performance) and constant naming style.
    *   **Next Steps for this Objective (Guidance for new AI session):**
        *   Prioritize larger or performance-critical files/directories next. Good candidates include:
            *   `AntiCheatsBP/scripts/main.js` (especially the main tick loop - overlaps with task 1).
            *   Remaining files in `AntiCheatsBP/scripts/core/` (e.g., `eventHandlers.js`, `commandManager.js`, `uiManager.js`).
            *   The `AntiCheatsBP/scripts/checks/` subdirectories (particularly frequently run checks like movement or combat).
        *   For each selected file/area:
            1.  Analyze with primary focus on runtime performance optimization.
            2.  Secondary focus on LoC reduction if no performance conflict.
            3.  Propose changes.
            4.  Implement approved changes.
            5.  Commit changes along with updates to this task in `ongoing.md` or move to `completed.md`.

*   **3. General Project Review (Implicit ongoing task for any AI session):**
    *   Ensure adherence to `Dev/CodingStyle.md`.
    *   Maintain and update task files (`ongoing.md`, `completed.md`, `todo.md`) accurately with each commit.
    *   Address any new issues or your requests as they arise.
