# Todo List: Addon Improvements

This document outlines planned tasks for improving the addon.

---

### High Priority

- **Re-implement `!ecwipe` command**
  - **Description:** The original `!ecwipe` command was removed due to technical issues with the scripting API. A new, functional version needs to be created.
  - **Requirement:** The command must be able to reliably clear the Ender Chest of an online player.
  - **Research:** The most promising implementation method is to use a loop of `/item replace` commands executed via `runCommandAsync`. This approach should be investigated and used for the new implementation.

---

### Medium Priority

*(No medium priority tasks currently planned)*

---

### Low Priority

*(No low priority tasks currently planned)*
