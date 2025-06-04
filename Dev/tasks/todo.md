# To-Do / Future Tasks

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

## High Priority / Next Up
*No high priority tasks currently identified.*

## Medium Priority

*   **Advanced Cheat Detections:**
    *   **Implement Killaura/Aimbot detection** (based on investigation in `Dev/Killaura_Aimbot_Investigation.md` - e.g., View Snap, Multi-Target, State Conflicts).
        *   *Sub-check: Attacking while using an item (Scythe, SjnExe).*
        *   *Sub-check: "No Swing" detection (Scythe - needs API feasibility check).*
        *   *Sub-check: Attacking while sleeping (Scythe, SjnExe).*
        *   *Sub-check: Attacking while having a chest open (Scythe - low feasibility).*
        *   *Sub-check: Invalid player head rotations (BadPackets from Scythe, SjnExe).*
    *   **Scaffold/Tower Detection:** (Scythe, SjnExe, SafeGuard)
        *   Investigate & Implement: Tower-like upward building.
        *   Investigate & Implement: Flat/Invalid rotation while building.
        *   Investigate & Implement: Placing blocks under self while looking up.
        *   Investigate & Implement: Downward scaffold.
        *   Investigate & Implement: Placing blocks onto air/liquid.
    *   **Timer/FastUse/FastPlace:**
        *   Investigate: Timer (game speed manipulation) (from original todo).
        *   Investigate & Implement: FastUse/FastPlace (using/throwing/placing items/blocks too fast) (Scythe, SjnExe).
    *   **Movement - Advanced:**
        *   Investigate & Implement: Invalid Y Velocity (SafeGuard, SjnExe 'High Velocity').
        *   Investigate & Implement: NoSlow - normal speed while using items that should slow (Scythe, SjnExe).
        *   Investigate & Implement: InvalidSprint (while blind, sneaking, or riding) (Scythe).
    *   **World Interaction - Advanced:**
        *   Investigate & Implement: AutoTool (quick slot switch on break) (Scythe).
        *   Investigate & Implement: InstaBreak (unbreakable blocks) (Scythe).
        *   Investigate & Implement: X-Ray Detection (suspicious ore mining) (SafeGuard, SjnExe).
    *   **Player Behavior - Advanced:**
        *   Investigate & Implement: Namespoof (name too long, invalid chars) (Scythe, SjnExe).
        *   Investigate & Implement: Anti-Gamemode Creative (Anti-GMC) (SafeGuard, SjnExe).
        *   Investigate & Implement: InventoryMods (hotbar switch while moving items) (Scythe).
    *   **Packet Anomalies / Chat Violations (from Scythe 'BadPackets', SafeGuard):**
        *   Investigate & Implement: Abnormal message lengths in chat.
        *   Investigate & Implement: Self-hurt detection.
        *   Investigate & Implement: Newline/carriage return in messages.
        *   Investigate & Implement: Invalid max render distance.
        *   Investigate & Implement: Repeated messages (SafeGuard).
        *   Investigate & Implement: Messages too close together (SafeGuard).
        *   Investigate & Implement: Message too many words (SafeGuard).
        *   Investigate & Implement: Sending messages while moving/swinging/using item/chest open (Scythe).

*   **Admin Tools & Management (Expansion):**
    *   **Enhanced Commands (from SjnExe, SafeGuard):**
        *   `!ac ban <player> [reason] [duration]` & `!ac unban <player>` (Investigate ban management system).
        *   `!ac kick <player> [reason]`
        *   `!ac mute <player> [duration] [reason]` & `!ac unmute <player>` (Investigate mute management).
        *   `!ac freeze <player>` (toggle player movement).
        *   `!ac warnings <player>` (detailed warning list) & `!ac clearwarnings <playername>`.
        *   `!ac invsee <playername>`.
        *   `!ac copyinv <playername>`.
        *   `!ac clearchat`.
        *   `!ac vanish` (admin visibility toggle).
        *   `!ac worldborder <get|set|remove> [params...]`.
        *   `!ac lagclear`.
        *   `!ac systeminfo <playername>` (client details if API allows).
        *   `!ac notify` (global admin notification toggle - Scythe/SafeGuard).
        *   `!ac help` (list commands - Scythe/SafeGuard).
    *   **Reporting System (from SafeGuard):**
        *   `!ac report <player> [reason]`
        *   `!ac viewreports [playername]`
    *   **UI Enhancements (Admin Panel Concept - SjnExe, SafeGuard):**
        *   Consider a simple UI for admins using `@minecraft/server-ui` (original item, now expanded).
        *   Investigate: In-game config editor via UI.
        *   Add Ban/Mute/Kick/Warn actions to player selection in existing UI.
        *   Investigate: View Ban/Mute/Warning Logs in UI.
        *   Investigate: Player inventory view (InvSee) in UI.
    *   **System Features (from SjnExe, SafeGuard):**
        *   **Owner System:** Designate a single super-admin (SjnExe).
        *   **Rank System:** Configurable ranks, permissions, chat formatting (SjnExe).
        *   **Combat Log Detection & Punishment** (SafeGuard).
        *   Investigate: Device Ban (SafeGuard - API dependent).

*   **World Management & Protection (from SafeGuard, SjnExe):**
    *   Investigate & Implement: Anti-Grief (clear explosives, extinguish fires).
    *   Investigate & Implement: Dimension Locks (Nether/End).

## Low Priority / Ideas

*   **Automated Actions (AutoMod):** (from original todo, Scythe, SafeGuard)
    *   Implement configurable automated actions (kick/temp-ban) based on flag counts or specific severe detections. (Requires careful design for false positives).
*   **Player Utilities & Experience (from SafeGuard, SjnExe):**
    *   Welcomer message for new players (show device).
    *   Death Coords / Death Effects.
    *   Chat Formatting (linked to Rank System).
*   **Logging Enhancements (from SjnExe):**
    *   Admin command usage logging.
    *   More detailed Player join/leave logging (beyond debug).
    *   Ban/Mute/Kick action logging.
*   **Performance Optimization:** (from original todo) Profile existing checks under load and optimize if necessary.
*   **Localization:** (from original todo) Consider options for localizing warning messages.
*   **Refactor: Create `types.js`:** (newly added) Define common JSDoc typedefs (e.g., `PlayerAntiCheatData`, `PlayerFlagData`) in a central `types.js` file to avoid potential circular dependencies and improve type management.

## Documentation & Workflow
*   **Task File Maintenance:** AI assistant should keep `completed.md`, `ongoing.md`, and `todo.md` current.
