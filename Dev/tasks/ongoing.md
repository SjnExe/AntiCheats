# Ongoing Tasks
*(Date: Current Session)*

## Refactor `commandManager.js`
- **Objective:** Improve the organization and maintainability of command handling by splitting commands from `commandManager.js` into individual modules.
- **Process:**
  - Create a new `AntiCheatsBP/scripts/commands/` directory.
  - Define a standard structure for command modules (exporting definition and execute function).
  - Modify `commandManager.js` to dynamically load and dispatch commands from these modules.
  - Iteratively migrate all existing commands to this new structure.
(In Progress as of Current Session)

---
*Previous tasks, including the Reporting System (`!report`, `!viewreports`), `!uinfo` UI implementation, `!help` command verification, `!systeminfo` command, `!copyinv` command, `!vanish` logging, `!clearchat` logging, `!invsee` implementation, Lag Clear via Admin Panel, `!warnings`/`!clearwarnings`/`!resetflags` commands, `!freeze` logging, `!kick` verification, and `todo.md` syntax updates, were completed and documented in `completed.md`.*
