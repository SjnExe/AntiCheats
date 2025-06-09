# Ongoing Tasks

This list tracks features and tasks that are currently under development.

*   **AutoMod System Review & Future Enhancements:** (Partially Completed; Further Enhancements Pending)
    *   **Completed Phase 1 (Review & Initial Implementation):** Reviewed the AutoMod system. Implemented missing `automodConfig` in `config.js`. Made the threshold-based AutoMod system operational. Findings in `Dev/notes/AutoModReview_Findings.md`.
    *   **Completed Phase 1.1 (Initial Rule Expansion):** Added default AutoMod rules, messages, and toggles to `config.js` for: `example_fly_hover`, `example_speed_ground`, `combat_cps_high`, `movement_nofall`, `world_illegal_item_use`, `player_namespoof`, `example_reach_attack`, `movement_noslow`, `action_fast_use`, and `player_antigmc`. (Corrected `fly_hover` and `speed_ground` keys to `example_fly_hover` and `example_speed_ground`.)
    *   **Next Steps:** Continue defining comprehensive rules for other relevant `checkTypes` from `checkActionProfiles`. Refine existing rules and thresholds based on testing/feedback. Consider further enhancements from the review document.
    *   *(Original description: Conduct a holistic review of the implemented AutoMod system (Phases 1-5) for any further refinements, performance optimizations, or new action types/conditions based on usage.)*
