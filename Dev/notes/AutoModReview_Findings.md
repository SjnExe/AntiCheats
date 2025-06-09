# AutoMod System Review & Findings

Date: 2024-07-29

## 1. Overview

The AutoMod system is designed to automatically take action against players based on accumulated flags for specific cheat detections. It consists of two main components:
-   **`actionManager.js`**: Handles immediate responses to cheat checks (flagging, logging, admin notifications) based on `checkActionProfiles` in `config.js`. This system appears to be functional.
-   **`automodManager.js`**: Designed for escalating actions (WARN, KICK, TEMP_BAN, etc.) based on flag count thresholds for specific `checkType`s. This manager is invoked by `processAutoModActions`.

## 2. Core Logic of `automodManager.js`

-   Triggered by `processAutoModActions(player, pData, checkType, dependencies)`.
-   Requires an `automodConfig` object within its `dependencies` for:
    -   `automodRules`: Defines flag thresholds, action types, parameters, and flag reset behavior for each `checkType`.
    -   `automodActionMessages`: Provides user-facing messages for AutoMod actions, keyed by `reasonKey`.
    -   `automodPerCheckTypeToggles`: Allows enabling/disabling AutoMod for specific check types.
-   Compares player's current flag count for a `checkType` against `flagThreshold` in rules.
-   Selects the highest applicable rule that hasn't been actioned at the current flag count.
-   Executes actions like WARN, KICK, TEMP_BAN, PERM_BAN, MUTE, FREEZE, REMOVE_ILLEGAL_ITEM via `_executeAutomodAction`.
-   Logs actions and notifies admins.

## 3. Critical Issue: Missing Configuration

-   **The primary finding is that the `automodConfig` object, including `automodRules`, `automodActionMessages`, and `automodPerCheckTypeToggles`, is NOT defined in `config.js` (as of the last review of the file).**
-   Without this configuration, `automodManager.js` cannot function as intended because it will have no rules to process or messages to display. The `enableAutoMod = true;` in `config.js` will enable the manager, but it will effectively do nothing without its rules.

## 4. "Phases 1-5" Interpretation

The term "Phases 1-5" likely refers to the development history:
1.  Initial flagging system (`actionManager.js`).
2.  Development of `automodManager.js` structure.
3.  Implementation of basic AutoMod actions (e.g., WARN, KICK).
4.  Addition of more severe/complex actions (TEMP_BAN, MUTE, etc.), possibly with command delegation.
5.  Refinements (e.g., per-check toggles, flag reset options).
The current state suggests that the code for `automodManager.js` (Phase 2-5 logic) exists, but its necessary data (Phase 2-5 configuration) was not completed or integrated into `config.js`.

## 5. Recommendations & Potential Refinements

**High Priority:**
1.  **Define and Integrate `automodConfig`:**
    *   Define the structure for `automodRules`, `automodActionMessages`, and `automodPerCheckTypeToggles` within `config.js`.
    *   Populate these structures with initial sensible default rules and messages for a few common `checkType`s (e.g., "fly_hover", "speed_ground", "combat_cps_high").
    *   Ensure this `automodConfig` is added to `editableConfigValues` in `config.js`.
    *   Verify that `main.js` correctly loads and passes this `automodConfig` to `automodManager.processAutoModActions` via its `dependencies` object.
2.  **Trigger `processAutoModActions`:**
    *   Ensure `automodManager.processAutoModActions(player, pData, checkType, dependencies)` is called at an appropriate place, likely after a flag is successfully added by `actionManager.executeCheckAction` or from within `playerDataManager.addFlag`.

**Medium Priority (Potential Refinements after core functionality is restored):**
3.  **Configuration for `REMOVE_ILLEGAL_ITEM`:**
    *   The `REMOVE_ILLEGAL_ITEM` action in `automodManager.js` attempts to get `itemToRemoveTypeId` from `pData.lastViolationDetailsMap[checkType]`.
    *   It needs to be confirmed how `pData.lastViolationDetailsMap` is populated. `actionManager.executeCheckAction` should probably store the `violationDetails` into `pData.lastViolationDetailsMap[checkType]` if it's not already doing so.
    *   Alternatively, the `itemToRemoveTypeId` could be a required parameter in the `automodRule` for this action, if the item is known at the time of rule definition.
4.  **Review Default Action Parameters:**
    *   Review default durations and reasons for actions like TEMP_BAN, MUTE to ensure they are sensible.
5.  **Extensibility of `automodActionMessages`:**
    *   Consider if the simple key-value for messages is sufficient or if more complex templating (beyond placeholders filled by `_executeAutomodAction`) might be needed for different languages in the future (links to Localization task). For now, it's adequate.

**Low Priority (Future Enhancements):**
6.  **Advanced Conditions:** Explore adding more complex conditions to rules (e.g., time since last offense, combinations of different flag types). This would increase complexity significantly.
7.  **UI for AutoMod Rules:** Long-term, a UI to manage AutoMod rules could be beneficial but is a large undertaking.

## 6. Performance Considerations
-   The current iteration logic in `processAutoModActions` seems efficient enough for a reasonable number of rules per check type.
-   Performance will depend on how frequently `processAutoModActions` is called and the number of rules defined. If called on every flag, and rules are extensive, it might need optimization, but this is speculative until rules are defined.

## Conclusion
The `automodManager.js` provides a solid foundation for threshold-based automated moderation. However, it is currently non-operational due to missing configuration data in `config.js`. The immediate next step should be to define and implement this configuration.
