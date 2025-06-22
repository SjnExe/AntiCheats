# Plan for Removing i18n Functionality

This plan outlines the steps to remove the internationalization (i18n) system from the AntiCheatsBP addon, embedding strings directly into the codebase, and subsequently cleaning up related documentation.

## Phase 1: Preparation and Analysis (COMPLETED)

*   **1.1. Backup `AntiCheatsBP/scripts/core/languages/en_US.js`:** *(Conceptual)* Ensure the original language file can be restored if needed.
*   **1.2. Analyze `en_US.js` Structure:** Understand how strings are organized and identify any complex formatting.
*   **1.3. Identify Files for Modification:** Use `grep` to find all occurrences of `getString(` and `i18n` to list all files that interact with the i18n system.

## Phase 2: String Replacement and Code Refactoring (COMPLETED)

Iterate through the identified files in batches, replacing `getString(key, ...args)` calls with either direct string literals or template literals if placeholders are involved. For keys not found in `en_US.js`, placeholders or invented strings were used and noted.

*   **Batch 1: Configuration Files (COMPLETED)**
*   **Batch 2: Core Systems, Managers, and Commands (COMPLETED)**
*   **Batch 3: Check-specific Messages (COMPLETED)**
*   **Batch 4: UI and Other Systems (COMPLETED - Initial Pass)**

## Phase 3: Dismantling the i18n System (COMPLETED, integrated into Phase 4)

*(Original steps for this phase were merged into Phase 4 for a more streamlined cleanup process).*

## Phase 4: Cleanup and Verification (COMPLETED)

*   **4.1. Final Code Review for i18n Remnants:** Perform a final `grep` for `getString` and `i18n`.
*   **4.2. Delete `AntiCheatsBP/scripts/core/i18n.js`**.
*   **4.3. Delete `AntiCheatsBP/scripts/core/languages/en_US.js`**.
*   **4.4. Delete Redundant `AntiCheatsBP/scripts/automodConfig.js`**.
*   **4.5. Verify `setlang` Command Deactivation**.
*   **4.6. Verify `main.js` Cleanup**.
*   **4.7. Verify `config.js` Cleanup**.

## Phase 5: Manual Testing (Simulated Code Review) & `uiManager.js` Refactoring (COMPLETED)

*   **5.1. Review Placeholder Strings:** Systematically review files for placeholders or invented strings.
*   **5.2. `uiManager.js` Full Refactoring:** Replace all `getString()` calls with *invented strings* based on localization keys and UI context. Remove `getString` from `dependencies` parameters.
*   **5.3. Conceptual Functionality Check:** Mentally trace command outputs, check notifications, and UI messages.
*   **5.4. Edge Case Consideration:** Consider error messages and less common scenarios.

## Phase 6: Documentation and Final Cleanup (COMPLETED)

*   **6.1. Delete `Docs/Internationalization.md`.**
*   **6.2. Search for relevant keywords** (language, i18n, localization, translation, getString, setlang) to find files mentioning the old i18n system.
*   **6.3. Review and update identified files:**
    *   `README.md`: Removed references to the i18n feature and language configuration.
    *   `AntiCheatsBP/scripts/config.js`: Changed `generalHelpMessages` from localization keys to direct strings.
    *   `AntiCheatsBP/scripts/commands/uinfo.js`: Updated to use direct strings from `config.generalHelpMessages` for tips.
*   **6.4. Update `Dev/plan.md`** to include these documentation and cleanup steps.

## Phase 7: Submission

*   **7.1. Submit Changes:** Commit all changes with a comprehensive message detailing the removal of the i18n system, direct embedding of strings, `uiManager.js` refactoring, and documentation updates. Use branch name `feature/remove-i18n`.
