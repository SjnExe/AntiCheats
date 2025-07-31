# Todo List: Addon Improvements

This document outlines the tasks for improving our addon based on the analysis of SafeGuard and Scythe-Anticheat.

## Low Priority

*   **[x] Enhance Configuration Granularity:**
    *   For each cheat detection, add options for `punishment`, `punishmentLength`, and `minVlbeforePunishment`.
*   **[x] Improve Cheat Detection Specificity:**
    *   Break down general cheat detections into more specific checks (e.g., Killaura, Scaffold).
*   **[x] Expand Command System and UI:**
    *   Add more utility commands (`invsee`, `vanish`, etc.).
    *   Improve the UI to allow for in-game configuration editing.
*   **[x] Implement a Robust Flagging System:**
    *   Create a centralized `flag()` function to record violations and handle punishments.
