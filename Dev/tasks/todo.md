# Todo List: Addon Improvements

This document outlines the tasks for improving our addon based on the analysis of SafeGuard and Scythe-Anticheat.

## High Priority

*   **[x] Implement Function-Based Initialization:**
    *   Create a setup function (e.g., `function setup/init`) that administrators must run to initialize the addon for the first time.
    *   This function should create all necessary scoreboard objectives, dynamic properties, and default configurations.
    *   Update the documentation to reflect this new setup process.

## Medium Priority

*   **[ ] Implement a Configuration Migration System:**
    *   Create a system to automatically update user configurations when the addon is updated.
    *   This system should be part of the initialization process and should check the config version.
*   **[ ] Refactor Codebase for Modularity:**
    *   Create a `loader.js` to handle initialization and module loading.
    *   Separate command handlers, cheat detections, and utility functions into their own modules.
    *   Use class extensions for `Player` and `Entity` to add custom methods.
*   **[ ] Add a Watchdog Handler:**
    *   Implement a `system.beforeEvents.watchdogTerminate` event listener to prevent script-related server crashes.

## Low Priority

*   **[ ] Enhance Configuration Granularity:**
    *   For each cheat detection, add options for `punishment`, `punishmentLength`, and `minVlbeforePunishment`.
*   **[ ] Improve Cheat Detection Specificity:**
    *   Break down general cheat detections into more specific checks (e.g., Killaura, Scaffold).
*   **[ ] Expand Command System and UI:**
    *   Add more utility commands (`invsee`, `vanish`, etc.).
    *   Improve the UI to allow for in-game configuration editing.
*   **[ ] Implement a Robust Flagging System:**
    *   Create a centralized `flag()` function to record violations and handle punishments.
