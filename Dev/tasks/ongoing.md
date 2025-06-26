# Ongoing Tasks & Next Steps for Development

This document summarizes the current work-in-progress for the AntiCheat addon.

## Current Focus: Comprehensive Codebase Review, Standardization, and Cleanup

*   **Objective:** Perform a full review of the `AntiCheatsBP/scripts/` codebase.
    *   Identify and remove unused code (variables, functions, imports, files).
    *   Ensure adherence to coding style and standardization guidelines (`Dev/CodingStyle.md`, `Dev/StandardizationGuidelines.md`). This includes naming conventions, JSDoc, formatting, and API usage.
    *   Identify and address "missing things" by ensuring consistency, implementing established patterns where absent, and verifying that documented features are traceable in the code.
    *   Refactor code for clarity, consistency, and maintainability.
*   **Scope:** All JavaScript files within `AntiCheatsBP/scripts/`.
*   **Exclusions:** No automated linting tools will be used for style enforcement; corrections will be manual or pattern-based.
*   **Outcome:** A cleaner, more consistent, and maintainable codebase aligned with project standards. Unused assets will be removed, and potential areas for future improvement may be identified.

### Sub-Tasks (Following the established plan):
1.  Core System Review & Standardization (`core/`, `main.js`, `config.js`)
2.  Checks Review & Standardization (`checks/`)
3.  Commands Review & Standardization (`commands/`)
4.  Utilities & Other Scripts Review (`utils/`, `types.js`)
5.  Global Unused Code Identification & Removal
6.  Final Documentation & Task Management Update

### High Priority / Next Up
*   Currently focused on the comprehensive review as detailed above.

### Medium Priority (Deferred until review completion)

*   **Advanced Cheat Detections:**
    *   **Packet Anomalies:** (Research Phase complete; 'Force Criticals' deemed not feasible. Full research notes in `Dev/notes/PacketAnomalyResearch.md`. Re-evaluate if other specific anomaly detection strategies are viable.)
*   **Admin Tools & Management (Expansion):** SjnExe parity goal where applicable.
*   **UI Enhancements (Admin Panel Concept):** SjnExe parity goal.
*   **World Management & Protection:** SjnExe parity goal.
*   **Normal Player Panel Features (`!panel`):** SjnExe parity goal.

### Low Priority / Ideas (Deferred)

*   **Player Utilities & Experience:** SjnExe parity goal.

### Documentation & Workflow
*   **Task File Maintenance:** AI assistant (Jules) will keep `completed.md`, `ongoing.md`, and `todo.md` current throughout this task.
*   Root `README.md` and `Docs/` directory will be updated if significant functional changes occur.

## Recent User Feedback & Context for Future Work (Post-Review)

*   **UI Command Design:** For future UI-based commands, design them to be accessible by various permission levels, showing different information/buttons contextually.
*   **Development Workflow:** Continue applying cleanup and refactoring "in batches" where appropriate (this review is a large batch).

---
*This summary was updated by Jules to reflect the current comprehensive review task.*
