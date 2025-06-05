# Ongoing Tasks

As of 2024-07-25 *(placeholder date)*:

## Admin Panel UI (`!panel`) Development
*   **Phase 1: Basic Structure & Player List:** (Completed)
    *   Command `!panel open main` (or similar).
    *   Initial UI form displaying a list of currently online players (name, basic stats like flag count).
    *   Selection of a player leads to a "Player Actions" form.
*   **Phase 1.5: Player Actions Form with Reset Flags & Detailed View:** (Completed)
    *   Player Actions form includes "View Detailed Info/Flags" and "Reset Player Flags" (with confirmation).
*   **Phase 2: Integrate Old `!ui` Tools & Dynamic Views:** (Completed with this commit)
    *   Consolidated `!ui` and `!panel` commands. `!panel` is primary, `!ui` is an alias.
    *   `showAdminPanelMain` in `uiManager.js` now dynamically shows:
        *   For Admins/Owners: Buttons for "View Online Players", "Inspect Player (Text)", "Reset Flags (Text)", "List Watched Players", and placeholders for Server Stats/Settings.
        *   For Normal Users: Placeholders for "My Stats", "Server Rules", "Help & Links".
*   **Phase 3: Player Actions - Moderation (TODO)**:
    *   "Kick Player" button with reason input (integrates with kick system). (Completed)
    *   "Mute Player" button with duration/reason input (integrates with mute system).
    *   "Freeze/Unfreeze Player" toggle (integrates with freeze system). (Completed)
*   **Phase 4: Server Management Actions (New Section in Panel) (TODO):**
    *   "View System Info": Basic server stats, AC version.
    *   "Clear Chat" button.
    *   "Lag Clear" button (if implemented).
*   **Phase 5: Configuration & Advanced (Future) (TODO):**
    *   View/Edit parts of `config.js` (read-only first, then consider edits for simple values).
    *   View Ban/Mute/Warning Logs.
