# Ongoing Tasks
*(Date: Current Session)*

## Refactor: Standardize Check Actions & Configurable Punishments
- **Objective:** Create a unified system for how cheat detections trigger actions (flag, log, notify, command execution) and make these actions configurable per check type in `config.js`.
- **Process & Status:**
  - (Completed) Designed `actionManager.js` and `checkActionProfiles` structure in `config.js`.
  - (Completed) Implemented `actionManager.js` to handle flag, log, and notify actions.
  - (Completed) Added `checkActionProfiles` to `config.js` and populated it for refactored checks.
  - (Completed) Integrated `actionManager.executeCheckAction` into `main.js` and `eventHandlers.js` for availability to check scripts.
  - (Completed) Refactored major checks: Fly, Speed, Reach, NoFall, Nuker.
  - (Completed) Refactored combat checks: CPS, ViewSnap (pitch/yaw/invalid), MultiTarget Aura, AttackWhileSleeping.
  - (Completed) Refactored world check: IllegalItemUse/Place.
  - **(Pending / Next for this task):**
    - Perform a final review sweep of all files within `AntiCheatsBP/scripts/checks/` to find any remaining minor check logic or sub-detections that still use direct calls to `addFlag`, `notifyAdmins`, etc. Refactor these if found.
    - Ensure all `checkType` strings used in every refactored check precisely match a defined profile key in `config.js`.
    - Verify overall consistency of the new system.
  - **(Future / Deferred):** Design and implement advanced action configurations (e.g., conditional command execution directly from `actionManager`).
(In Progress as of Current Session - nearing completion of current scope)

---
*Previous tasks, including "Admin Panel UI: View Ban/Mute Logs", "Admin Panel UI: Integrate InvSee", "Admin Panel UI: Quick Actions (Player Inspection)", the "Refactor `commandManager.js`" (modular command system), Reporting System (`!report`, `!viewreports`), `!uinfo` UI implementation, `!help` command verification, `!systeminfo` command, `!copyinv` command, `!vanish` logging, `!clearchat` logging, `!invsee` implementation, Lag Clear via Admin Panel, `!warnings`/`!clearwarnings`/`!resetflags` commands, `!freeze` logging, `!kick` verification, and `todo.md` syntax updates, were completed and documented in `completed.md`.*
