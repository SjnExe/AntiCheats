# Ongoing Tasks

This list tracks features and tasks that are currently under development.

*   **Detailed Player Join/Leave Logging:** (In Progress)
    *   **Objective:** Implement more detailed logging for player join and leave events. This includes information like player ID, name, device, game mode, and location upon joining, and player ID and name upon leaving.
    *   **Status:** Currently being implemented.
*   **AutoMod System Review & Future Enhancements:** (Partially Completed; Further Enhancements Pending)
    *   **Completed Phase 1 (Review & Initial Implementation):** Reviewed the AutoMod system. Implemented missing `automodConfig` in `config.js`. Made the threshold-based AutoMod system operational. Findings in `Dev/notes/AutoModReview_Findings.md`.
    *   **Completed Phase 1.1 (Rule Expansion):** Added default AutoMod rules, messages, and toggles to `config.js` for: `example_fly_hover`, `example_speed_ground`, `combat_cps_high`, `movement_nofall`, `world_illegal_item_use`, `player_namespoof`, `example_reach_attack`, `movement_noslow`, `action_fast_use`, `player_antigmc`, `combat_multitarget_aura`, `world_illegal_item_place`, `movement_invalid_sprint`, `chat_spam_fast_message`, `combat_invalid_pitch`, `combat_attack_while_sleeping`, `world_instabreak_speed`, `chat_spam_max_words`, `combat_viewsnap_pitch`, `combat_viewsnap_yaw`, `combat_attack_while_consuming`, `player_invalid_render_distance`, `combat_attack_while_bow_charging`, `combat_attack_while_shielding`, `player_chat_during_combat`, and `player_chat_during_item_use`. (Corrected `fly_hover` and `speed_ground` keys to `example_fly_hover` and `example_speed_ground`.)
    *   **Completed Phase 1.2 (Tolerance and Flag Reset Refinements):**
        *   Adjusted default enable status for several checks (`enableFlyCheck`, `enableSpeedCheck`, `enableNoSlowCheck`, `enableAutoToolCheck`, `enableInventoryModCheck`) to `false` in `config.js` to reduce potential false positives during initial setup.
        *   Reviewed and updated existing AutoMod rules in `config.js` (`automodConfig.automodRules` and `automodConfig.automodActionMessages`) to be more tolerable (higher thresholds, more warnings, shorter initial tempban durations).
        *   Implemented flag reset on manual punishment reversal:
            *   Modified `banInfo` and `muteInfo` in `playerDataManager.js` to store `isAutoMod: boolean` and `triggeringCheckType: string | null`.
            *   Updated `automodManager.js` (`_executeAutomodAction`) to correctly pass `isAutoMod` and `triggeringCheckType` when applying bans/mutes via `playerDataManager` or delegating to command modules.
            *   Added `clearFlagsForCheckType(player, checkType, dependencies)` to `playerDataManager.js` to reset flags and AutoMod state for a specific check.
            *   Updated `ban.js`, `unban.js`, `mute.js`, and `unmute.js` command modules:
                *   `ban.js` and `mute.js` now accept additional parameters to indicate if they are called by AutoMod and pass this context to `playerDataManager.addBan/addMute`.
                *   `unban.js` and `unmute.js` now call `clearFlagsForCheckType` if the ban/mute being reversed was originally issued by AutoMod.
    *   **Next Steps:** Continue defining/refining rules for other `checkTypes`. Monitor system for false positives and adjust check sensitivities or AutoMod rules accordingly. Consider other enhancements from the review document or user feedback. Test AutoMod behavior with various player actions.
    *   *(Original description: Conduct a holistic review of the implemented AutoMod system (Phases 1-5) for any further refinements, performance optimizations, or new action types/conditions based on usage.)*
