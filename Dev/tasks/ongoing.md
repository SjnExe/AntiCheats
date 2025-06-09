# Ongoing Tasks

This list tracks features and tasks that are currently under development.

*   **AutoMod System Review & Future Enhancements:** (Partially Completed; Further Enhancements Pending)
    *   **Completed Phase 1 (Review & Initial Implementation):** Reviewed the AutoMod system. Implemented missing `automodConfig` in `config.js` (with rules, messages, toggles for `fly_hover` and `speed_ground` as examples). Ensured `automodConfig` is passed as a dependency. Modified `playerDataManager.addFlag` to call `automodManager.processAutoModActions`, making the threshold-based AutoMod system operational. Findings from the review are in `Dev/notes/AutoModReview_Findings.md`.
    *   **Next Steps:** Define more comprehensive rules for other checkTypes, refine existing rules, and consider further enhancements based on the review.
    *   *(Original description: Conduct a holistic review of the implemented AutoMod system (Phases 1-5) for any further refinements, performance optimizations, or new action types/conditions based on usage.)*
