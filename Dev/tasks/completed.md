# Completed Development Tasks

This document is an archive of completed tasks.

---

- **(Medium) Merge Gamemode Commands and Update Balance Command by Jules**
  - **Objective:** Consolidate gamemode commands into a single file, enable slash commands, and remove an alias from the balance command.
  - **Details:**
    - Merged `gma.js`, `gmc.js`, `gms.js`, and `gmsp.js` into `gamemode.js`.
    - Created a new `/gamemode` command with slash command support and aliases.
    - Preserved legacy gamemode commands like `!gms`.
    - Removed the "credits" alias from the `/balance` command.
    - Updated `Docs/Commands.md` to reflect the changes.

- **(High) Fix and Test Player Kicking by Jules**
  - **Objective:** Implement and test a reliable method for kicking non-admin/owner players.
  - **Details:**
    - Create `test.mcfunction` to experiment with various kicking methods.
    - Fix the `!restart` command's player kicking functionality in `restartManager.js`.
    - Ensure the solution correctly identifies admins and owners based on the existing rank system.
