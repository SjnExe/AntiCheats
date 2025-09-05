# Completed Development Tasks

This document is an archive of completed tasks.

---

## Task: Fix Command Errors and Auto-Save Notifications (Session: [Current Date])

- **Objective:** Resolve two issues:
    1.  Fix a `TypeError: not a function` error affecting `/ban`, `/kick`, and `/restart` commands when executed from the console.
    2.  Change the auto-save notification to only appear in the console when debug mode is on, instead of being sent to all players.
- **Work Done:**
    - **Command Fix:** Investigated the issue and found that the `dimension.runCommand()` method was being used incorrectly. The code was updated in `ban.js`, `kick.js`, and `restartManager.js` to use `world.getDimension('overworld').runCommand()`, which is the correct and stable method for executing server-wide commands.
    - **Notification Fix:** Modified `dataManager.js` to replace the `world.sendMessage()` call for auto-save notifications with `debugLog()`. This ensures the message is only logged to the console when `config.debug` is `true`.
- **Submission:** Changes submitted in branch `fix/command-errors-and-autosave-notifications`.
