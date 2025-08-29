# Ongoing Development Tasks

This document lists tasks currently being worked on. When a task is completed, it should be moved to `Dev/gists/completed.md`. If a task is paused or deferred, it should be moved back to `Dev/tasks/todo.md`.

---
- (High) Fix UI bug and implement user requests (Jules)
  - **Bug Fix:** Address the `showPanel failed: not a function` error that occurs after using `functionCall` actions in various UI panels. The fix involves ensuring `showPanel` is called correctly after async operations to refresh the UI state.
  - **Feature:** Implement a `!reload` command for the owner to reload configuration from `config.js`.
  - **Feature:** Enhance the `testPanel` by adding a dynamic player list and new testable actions to help verify the bug fix and improve future testing.
