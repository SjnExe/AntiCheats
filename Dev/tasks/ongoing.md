# Ongoing Tasks
*(Date: Current Session)*

## Refactor: Standardize Check Actions & Configurable Punishments
- **Objective:** Create a unified system for how cheat detections trigger actions (flag, log, notify, command execution) and make these actions configurable per check type in `config.js`.
- **Process:**
  - Design a standard action handling mechanism/function (e.g., `handleViolation`).
  - Define a structure in `config.js` for specifying actions per check type (e.g., `fly_hover`, `speed_ground`).
  - Refactor existing cheat detection scripts in `AntiCheatsBP/scripts/checks/` to use this new centralized handler.
  - This will replace direct calls to `addFlag`, `notifyAdmins`, etc., within individual check scripts.
(In Progress as of Current Session)

---
*Previous tasks, including "Admin Panel UI: View Ban/Mute Logs", "Admin Panel UI: Integrate InvSee", "Admin Panel UI: Quick Actions (Player Inspection)", the "Refactor `commandManager.js`" (modular command system), Reporting System (`!report`, `!viewreports`), `!uinfo` UI implementation, `!help` command verification, `!systeminfo` command, `!copyinv` command, `!vanish` logging, `!clearchat` logging, `!invsee` implementation, Lag Clear via Admin Panel, `!warnings`/`!clearwarnings`/`!resetflags` commands, `!freeze` logging, `!kick` verification, and `todo.md` syntax updates, were completed and documented in `completed.md`.*
