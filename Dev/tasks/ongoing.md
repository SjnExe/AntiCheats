# Ongoing Tasks
*(Date: Current Session)*

## Refactor: Standardize Check Actions & Configurable Punishments
- **Objective:** Create a unified system for how cheat detections trigger actions (flag, log, notify, command execution) and make these actions configurable per check type in `config.js`.
- **Process:**
  - (Completed) Designed and implemented `actionManager.js` with `executeCheckAction`.
  - (Completed) Defined `checkActionProfiles` structure in `config.js`.
  - (Completed) Plumbed `executeCheckAction` and `logManager` dependencies to check functions via `main.js` and `eventHandlers.js`.
  - (Completed) Refactored initial set of checks: Fly, Speed, Reach, NoFall, Nuker.
  - (Completed) Refactored further checks: CPS, ViewSnap (pitch/yaw/invalid), MultiTarget Aura, AttackWhileSleeping, IllegalItemUse, IllegalItemPlace.
  - (Ongoing) Review remaining check scripts (if any) and overall system integration. Ensure all player-facing messages and admin notifications are appropriate and configurable.
  - (Future) Design and implement advanced action configurations (e.g., conditional command execution, escalating punishments).
(In Progress as of Current Session)

---
*Previous tasks, including "Admin Panel UI: View Ban/Mute Logs", "Admin Panel UI: Integrate InvSee", "Admin Panel UI: Quick Actions (Player Inspection)", the "Refactor `commandManager.js`" (modular command system), Reporting System (`!report`, `!viewreports`), `!uinfo` UI implementation, `!help` command verification, `!systeminfo` command, `!copyinv` command, `!vanish` logging, `!clearchat` logging, `!invsee` implementation, Lag Clear via Admin Panel, `!warnings`/`!clearwarnings`/`!resetflags` commands, `!freeze` logging, `!kick` verification, and `todo.md` syntax updates, were completed and documented in `completed.md`.*
