# Ongoing Development Tasks

This document lists tasks currently being worked on. When a task is completed, it should be moved to `Dev/gists/completed.md`. If a task is paused or deferred, it should be moved back to `Dev/tasks/todo.md`.

---
- (High) Diagnose `!ecwipe` command failure for online players (Jules)
  - **Bug Investigation:** The `!ecwipe` command is failing even when used by an online player on themselves. The root cause is unknown.
  - **Objective:** Add diagnostic logging to the command to trace its execution and identify the point of failure, which is suspected to be the `getComponent('minecraft:ender_chest')` call.
  - **Next Step:** Request feedback from the user after they run the modified command.
