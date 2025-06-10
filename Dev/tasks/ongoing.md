# Ongoing Tasks

This list tracks features and tasks that are currently under development.

*   **AutoMod System Review & Future Enhancements:** (Partially Completed; Further Enhancements Pending)
    *   **Completed Phase 1 (Review & Initial Implementation):** Reviewed the AutoMod system. Implemented missing `automodConfig` in `config.js`. Made the threshold-based AutoMod system operational. Findings in `Dev/notes/AutoModReview_Findings.md`.
    *   **Completed Phase 1.1 (Initial Rule Definition for Enabled Checks):** Added default AutoMod rules, messages, and toggles to `config.js` for all `checkTypes` that are currently enabled by default and have corresponding `checkActionProfiles`. This includes (but may not be limited to): `example_fly_hover`, `example_speed_ground`, `combat_cps_high`, `movement_nofall`, `world_illegal_item_use`, `player_namespoof`, `example_reach_attack`, `movement_noslow`, `action_fast_use`, `player_antigmc`, `combat_multitarget_aura`, `world_illegal_item_place`, `movement_invalid_sprint`, `chat_spam_fast_message`, `combat_invalid_pitch`, `combat_attack_while_sleeping`, `world_instabreak_speed`, `chat_spam_max_words`, `combat_viewsnap_pitch`, `combat_viewsnap_yaw`, `combat_attack_while_consuming`, `player_invalid_render_distance`, `combat_attack_while_bow_charging`, `combat_attack_while_shielding`, `player_chat_during_combat`, and `player_chat_during_item_use`. (Key corrections for `example_fly_hover` and `example_speed_ground` were also made.)
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
        *   **Completed Phase 1.3 (Rule Definition for Disabled Checks - Current Session):** Added default AutoMod rules, messages, and toggles to `config.js` for most checks that were disabled by default but had existing `checkActionProfiles`. This ensures they have baseline AutoMod configurations if enabled by an administrator. Affected checks include `world_nuker`, `world_autotool`, `world_instabreak_unbreakable`, `player_inventory_mod`, `world_tower_build`, `world_flat_rotation_building`, `world_downward_scaffold`, `world_air_place`, `world_fast_place`, `chat_swear_violation`, and various Anti-Grief profiles.
        *   **Completed Phase 1.4 (Conservative Refinement of Existing Rules - Current Session):** Made conservative adjustments to some existing TEMP_BAN durations and rule thresholds in `automodConfig.automodRules` in `config.js` for better initial tolerance. This included `player_namespoof`, `player_antigmc`, `combat_multitarget_aura`, `combat_attack_while_sleeping`, `world_instabreak_speed`, and `player_invalid_render_distance`.
        *   **Completed Phase 1.5 (Self-Hurt Check AutoMod Integration - Current Session):** Clarified `checkType` for `enableSelfHurtCheck` as 'player_self_hurt'. Added a new action profile and corresponding AutoMod rules (WARN, KICK, TEMP_BAN), messages, and toggle to `config.js`.
        *   **Completed Phase 1.6 (REMOVE_ILLEGAL_ITEM Action Refactor - Current Session):** Investigated and refactored the `REMOVE_ILLEGAL_ITEM` AutoMod action. Modified `actionManager.js` to correctly store `violationDetails` (specifically `itemTypeId`) into `pData.lastViolationDetailsMap[checkType]`. This allows `automodManager.js` to retrieve the `itemTypeId` and properly execute the item removal. Verified that `checkIllegalItems.js` provides the necessary `itemTypeId` in its `violationDetails`.
    *   **Next Steps:** Refine existing AutoMod rules and thresholds based on live testing and feedback. Consider any other minor enhancements from `Dev/notes/AutoModReview_Findings.md` if applicable.
    *   *(Original description: Conduct a holistic review of the implemented AutoMod system (Phases 1-5) for any further refinements, performance optimizations, or new action types/conditions based on usage.)*

*   **Localization Implementation - Phase 2e (TPA Commands) Complete**
    *   **Objective:** To make the addon's user-facing strings localizable to support multiple languages.
    *   **Completed Phase 1 (Core Setup & Key Modules):**
        *   Created `AntiCheatsBP/scripts/core/localizationManager.js` with a `getString(key, args)` function and a `translations` object.
        *   Populated initial "en_US" strings for core messages from `config.js` (`welcomeMessage`, `deathCoordsMessage`, etc.), all messages in `uinfo.js`, key messages in `help.js`, and selected messages in `eventHandlers.js`.
        *   Refactored `config.js` to store localization keys instead of hardcoded strings for the above messages.
        *   Refactored `uinfo.js` fully, and `help.js` (partially), and `eventHandlers.js` (partially) to use `localizationManager.getString()`.
    *   **Completed Phase 2a (More Commands & Language Switching):**
        *   Refactored `ban.js`, `kick.js`, and `mute.js` command modules to use the localization manager.
        *   Added `defaultServerLanguage` to `config.js` and updated `localizationManager.js` to use this for initializing `currentLanguage`.
        *   Implemented the `!setlang <language_code>` command for administrators to change the server's default language for AntiCheat messages at runtime.
    *   **Completed Phase 2b (UI & Worldborder Command Localization):**
        *   Refactored all user-facing strings in `AntiCheatsBP/scripts/commands/worldborder.js` to use the localization manager.
        *   Refactored all user-facing strings in `AntiCheatsBP/scripts/commands/panel.js` and the entirety of `AntiCheatsBP/scripts/core/uiManager.js` (all forms and UI elements) to use the localization manager.
        *   Added a comprehensive set of new keys and English strings to `localizationManager.js` for these modules.
    *   **Completed Phase 2c (Key Admin Commands Localization):**
        *   Refactored `vanish.js`, `tp.js`, and `invsee.js` command modules to use the localization manager.
        *   Added new localization keys and English translations to `localizationManager.js` for these commands, including their static descriptions.
    *   **Completed Phase 2d (Admin Utility Commands Localization):**
        *   Refactored gamemode commands (`gma.js`, `gmc.js`, `gms.js`, `gmsp.js`) to use the localization manager.
        *   Refactored dimension lock commands (`netherlock.js`, `endlock.js`) to use the localization manager.
        *   Refactored notification toggle commands (`notify.js`, `xraynotify.js`) to use the localization manager.
        *   Refactored punishment reversal commands (`unmute.js`, `unban.js`) to use the localization manager.
        *   Refactored flag/warning clearing commands (`resetflags.js` and its alias `clearwarnings.js`) to use the localization manager.
        *   Added new localization keys and English translations to `localizationManager.js` for all these commands, including their static descriptions.
    *   **Completed Phase 2e (TPA Command Suite Localization):** Refactored `tpa.js`, `tpahere.js`, `tpaccept.js`, `tpacancel.js`, and `tpastatus.js` to use the localization system. Added all necessary string keys to `localizationManager.js`.
    *   **Next Steps: Phase 2f - Refactor remaining miscellaneous command modules (e.g., `help.js` if not fully covered, `info.js`, `ping.js`, `stats.js`, `list.js`, etc.) and any other remaining user-facing strings in the system. Final review of all modules.**
        *   Externalize user-facing strings from all check files (e.g., violation detail messages if any are directly sent from checks) and manager notifications (e.g., `playerDataManager` flag reasons, `automodManager` admin notifications not already covered by command localization).
        *   Add translation files/entries for other languages (e.g., "es_ES", "de_DE").
