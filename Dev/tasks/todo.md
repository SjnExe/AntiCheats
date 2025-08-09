# Todo List: Addon Improvements

This document outlines planned tasks for improving the addon.

---

### High Priority

- *(No high priority tasks currently planned)*

---

### Medium Priority

- **Refactor Configuration System:**
  - **Description:** The current configuration system is highly modular but complex, spread across five main files. A future task should focus on improving its robustness and ease of use.
  - **Proposed Actions:**
    1.  **Implement Configuration Validation:** Create a script (`npm run validate:config`) that loads all config files and validates them against schemas (like those in `Dev/schemas/`). This would catch typos, structural errors, and invalid values before the addon is even run.
    2.  **Consolidate `commandAliases`:** The `commandAliases` map is currently in `config.js`, but documentation suggests it should be handled differently. Move this to a more appropriate location (e.g., a dedicated file or within the `commandManager`) to improve clarity and resolve the documentation conflict.
    3.  **Create a UI Panel Visualization Tool:** The `panelLayoutConfig.js` is very complex. An external script could be developed to parse this file and generate a visual "map" (e.g., a text tree or simple HTML page) of the UI panels and their connections. This would greatly aid in UI development and debugging.
    4.  **Simplify `actionProfiles.js` Message Definitions:** The `rawtext` format for admin notifications is verbose. Create a utility function that can build these complex JSON objects from a simpler template string, reducing clutter in the `actionProfiles.js` file.

---

### Low Priority

- **Full Code-Style Audit:**
  - **Description:** While the most critical `snake_case` issues for identifiers have been addressed, a full audit of the codebase could be performed to ensure 100% compliance with all rules in `Dev/StandardizationGuidelines.md`, including `actionType` and `errorCode` naming conventions. This is a large task that should be tackled incrementally.
