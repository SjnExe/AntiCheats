# Completed Development Tasks

This document lists significant tasks that have been completed.

## Global Configuration: Checks Disabled by Default (Session 2024-07-26)
*   **Modified `AntiCheatsBP/scripts/core/automodConfig.js`**:
    *   Set all boolean values in the `automodPerCheckTypeToggles` object to `false`. This ensures that AutoMod actions for all checks are disabled by default.
*   **Modified `AntiCheatsBP/scripts/config.js`**:
    *   Changed all `export const enable[CheckName]Check = true;` (and similar patterns like `enable...AntiGrief`, `enable...Detection`) constant declarations for specific cheat checks to `false`.
    *   Added new toggles `enableChatContentRepeatCheck = false;` and `enableUnicodeAbuseCheck = false;` for recently implemented checks.
    *   Ensured the master `enableAutoMod` flag is also `false` by default.
    *   These changes ensure that individual checks and the AutoMod system's responses are off by default, requiring explicit configuration to enable them.

## AutoMod System Review and `checkType` Verification (Session 2024-07-26)
-   **Verified `checkType` Case Consistency:** Confirmed that all check files use `camelCase` for `checkType`s passed to the action/AutoMod system, consistent with `automodConfig.js`. No code changes were needed for this.
-   **Reviewed `automodConfig.js` Structure and Basic Logic:** Verified `reasonKey`s and `actionType`s. Corrected a rule precedence issue for `movementNetherRoof` (teleportSafe threshold adjusted). Noted that the `teleportSafe` actionType itself needs proper implementation in `automodManager.js`.
-   **Identified and Add Rules for Uncovered Checks:** Confirmed that all `checkType`s from existing check files are already covered by rules in `automodConfig.js`. No new rules were needed for uncovered checks.
-   **Evaluated Granularity for `flyCheck.js` and `speedCheck.js`:** Concluded that current `checkType` granularity is adequate for existing AutoMod functionality. Further granularity would be a new feature.
-   **Implemented `teleportSafe` AutoMod Action:** Added the `teleportSafe` actionType to `automodManager.js` to handle teleporting players, including logic for finding a safe location. Also added required i18n strings (`automod.action.teleportDefaultReason`, `automod.adminNotify.details.teleport`) to `en_US.js`.
-   **Cleaned up Orphaned `chatRepeatSpam` Strings:** Investigated the `automod.chat.repeatspam.*` localization strings. Confirmed they were orphaned due to prior refactoring. Removed the unused strings from `automodConfig.js` (`automodActionMessages`). The strings were not found in `en_US.js`, so no changes were needed there.
-   **Implemented `chatContentRepeat` Check:** Added a new chat check (`checkChatContentRepeat.js`) to detect repeated message content. This includes:
    - Logic to track chat history per player and flag if a message is repeated a configurable number of times.
    - Integration into `eventHandlers.js` (`handleBeforeChatSend`).
    - New AutoMod rules, action messages, and toggle in `automodConfig.js` for the `chatContentRepeat` checkType.
    - New i18n strings in `en_US.js` for the new AutoMod messages.
    - Exporting the new check from `checks/index.js`.
-   **Implemented `chatUnicodeAbuse` Check:** Added a new chat check (`checkUnicodeAbuse.js`) to detect Unicode abuse (e.g., excessive diacritics). This includes:
    - Logic to count diacritics and base characters, flagging based on ratio or absolute count.
    - Integration into `eventHandlers.js` (`handleBeforeChatSend`).
    - New AutoMod rules, action messages, and toggle in `automodConfig.js` for the `chatUnicodeAbuse` checkType.
    - New i18n strings in `en_US.js` for the new AutoMod messages.
    - Exporting the new check from `checks/index.js`.
-   **Enhanced Swear Check for Obfuscation Resistance:** Modified `AntiCheatsBP/scripts/checks/chat/swearCheck.js` to improve detection of obfuscated swear words. This includes:
    - Implementation of a word normalization function (lowercase, remove common separators, collapse character repetitions).
    - Optional Leet speak conversion as part of normalization.
    - Logic to match normalized input words against a pre-normalized swear word list.
    - Placeholder for Levenshtein distance matching (functionality can be fully implemented later).
    - Added new configuration flags (`enableSwearCheckNormalization`, `enableSwearCheckLeetSpeak`, `enableSwearCheckLevenshtein`, `swearCheckLevenshteinDistance`) to `config.js` and `editableConfigValues` to control these enhancements.
    - Updated `violationDetails` to include more context about the match.
-   **Reviewed Newline Spam Handling:** Investigated the existing `chatNewline` check and its associated configurations. Concluded that the current per-message detection, when combined with `flagOnNewline` (for AutoMod escalation) and/or `cancelMessageOnNewline` (for direct prevention), is largely sufficient for handling spam or floods that specifically use newline characters. No new check or significant enhancement for newline-specific floods was deemed immediately necessary.
-   **Implemented `checkGibberish` Detection (V1):** Added an initial version of a chat check (`checkGibberish.js`) to detect gibberish or keyboard-mashed messages. This version focuses on:
    - Analyzing vowel-to-consonant ratios within the alphabetic portion of messages.
    - Detecting excessive consecutive consonants.
    - Requiring a minimum alphabetic content ratio for the check to apply.
    - Integration into `eventHandlers.js` (`handleBeforeChatSend`).
    - New AutoMod rules, action messages, and toggle in `automodConfig.js` for the `chatGibberish` checkType.
    - New i18n strings in `en_US.js`.
    - New configuration options in `config.js` (e.g., `enableGibberishCheck`, thresholds), defaulted to `false`.
    - Exporting the new check from `checks/index.js`.
-   **Implemented `checkExcessiveMentions` Detection:** Added a new chat check (`checkExcessiveMentions.js`) to detect spamming via excessive user mentions in a single message. This includes:
    - Logic to count total unique mentions and maximum repetitions of a single user mention.
    - Integration into `eventHandlers.js` (`handleBeforeChatSend`).
    - New AutoMod rules, action messages, and toggle in `automodConfig.js` for the `chatExcessiveMentions` checkType.
    - New i18n strings in `en_US.js`.
    - New configuration options in `config.js` (e.g., `enableExcessiveMentionsCheck`, thresholds), defaulted to `false`.
    - Exporting the new check from `checks/index.js`.

## Refactor `checkType` Identifiers, AutoMod Fixes, and Verifications (Session YYYY-MM-DD)

This large refactoring effort aimed to standardize `checkType` identifiers across the project to `camelCaseWithAcronyms` and resolve several related critical issues.

### 1. `checkType` Identifier Casing Convention & Refactoring
-   **Resolution**: Decision made to use `camelCaseWithAcronyms` for all `checkType` string identifiers.
-   **Impact**:
    -   `Dev/CodingStyle.md` was updated to specify `camelCaseWithAcronyms` for `checkType` string identifiers, including rules for acronym preservation (e.g., GMC, TPA).
    -   All relevant `checkType` keys and string literals were refactored in:
        -   `AntiCheatsBP/scripts/core/actionProfiles.js` (object keys)
        -   `AntiCheatsBP/scripts/core/automodConfig.js` (object keys in `automodRules` and `automodPerCheckTypeToggles`)
        -   All check scripts in `AntiCheatsBP/scripts/checks/**/*.js` (string literals in `executeCheckAction` or `addFlag` calls)
        -   `AntiCheatsBP/scripts/core/eventHandlers.js` (string literals in `executeCheckAction` or `addFlag` calls)
        -   `AntiCheatsBP/scripts/core/playerDataManager.js` (keys in the `flags` object of `initializeDefaultPlayerData`)

### 2. Critical AutoMod `actionType` Fix (`automodManager.js`)
-   **Issue**: The `switch (actionType)` in `_executeAutomodAction` in `automodManager.js` used `UPPERCASE` (e.g., `WARN`) for `case` conditions, while `automodConfig.js` (after its own refactor) defined `actionType`s in `camelCase` (e.g., `warn`). This would cause AutoMod actions to fail.
-   **Resolution**: The `case` conditions in `automodManager.js` were changed to `camelCase` (e.g., `case "warn":`, `case "tempBan":`) to match the values from `automodConfig.js`, fixing this critical issue for AutoMod functionality.

### 3. `chat_repeat_spam` Resolution & Consolidation
-   **Issue**: Ambiguity and potential misconfiguration regarding `chat_repeat_spam` and its handling.
-   **Resolution**:
    -   The call in `eventHandlers.js` for repeat spam checking (previously `checks.checkSpam` associated with `config.spamRepeatCheckEnabled`) was updated to correctly call `checks.checkMessageRate`. Arguments to `checkMessageRate` were also corrected.
    -   The `automodConfig.js` key `chat_repeat_spam` was removed from `automodRules` and `automodPerCheckTypeToggles`. Functionality is now consolidated under the `chatSpamFastMessage` checkType, which is handled by `checkMessageRate`.
    -   The default value for `fastMessageSPAMActionProfileName` in `config.js` was updated to the refactored `"chatSpamFastMessage"`.

### 4. 'example\_' `checkType` Refactoring
-   **Issue**: Placeholder `checkType`s like `"exampleSpeedGround"` and `"exampleReachAttack"` were used.
-   **Resolution**: These were refactored to more standard, descriptive names:
    -   `"exampleSpeedGround"` is now `"movementSpeedGround"`.
    -   `"exampleReachAttack"` is now `"combatReachAttack"`.
-   **Impact**: Changes were applied to the respective check files (`speedCheck.js`, `reachCheck.js`), `actionProfiles.js` (key renames), and `automodConfig.js` (key renames in `automodRules` and `automodPerCheckTypeToggles`).

### 5. World Border Pause/Resume Logic Verification
-   **Task**: Verify logic in `main.js` for pausing/resuming world border particle effects during resize operations.
-   **Resolution**: This logic was reviewed and confirmed to be functioning as intended. Particle effects should correctly pause during a world border resize and resume with the new border configuration once the resize is complete.
