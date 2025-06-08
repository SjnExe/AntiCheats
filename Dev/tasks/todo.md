# To-Do / Future Tasks

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

## High Priority / Next Up
*No high priority tasks currently identified.*

## Medium Priority

*   **Advanced Cheat Detections:**
    *   **Packet Anomalies / Chat Violations:**
        *   **Invalid Max Render Distance:** (API Dependent) If client settings like render distance are accessible or inferable and an invalid value is detected, flag. (Scythe 'BadPackets')
        *   **Sending Messages During Invalid States:** Detect if player sends chat messages while performing actions that should normally restrict chat input (e.g., actively in combat, using an item, chest open - API feasibility varies). (Scythe 'BadPackets')

*   **Admin Tools & Management (Expansion):** SjnExe parity goal where applicable.
    *   **Enhanced Commands:**
        *   `!worldborder <get|set|remove> [params...]`: Manage a configurable world border (API dependent for enforcement).
    *   **UI Enhancements (Admin Panel Concept):** SjnExe parity goal.
        *   *(Existing: Base UI with Inspect, Reset Flags, List Watched)*
        *   Investigate: In-game config editor via UI (for `config.js` values).
        *   (Started) Admin Panel UI: View Ban/Mute Logs. (Warning logs are typically player flags, viewed differently).
        *   (Started) Integrate Player Inventory View (InvSee) into Admin Panel's player inspection UI.
    *   **System Features:** SjnExe parity goal.
        *   **Owner System:** Designate a single player (e.g., via `config.js` or first admin) as "Owner" with immutable admin rights and potentially exclusive commands. *(Core functionality implemented as part of Rank System via `ownerPlayerName` in `config.js`)*
        *   **Rank System:** Visual rank system with chat and nametag display. *(Core functionality IMPLEMENTED)*
            -   **Ranks & Criteria:** *(IMPLEMENTED: Owner, Admin, Member defined; Owner via `ownerPlayerName` in `config.js`, Admin via `adminTag`)*
            -   **Chat Display:** *(IMPLEMENTED: Rank prefix like `[Owner] PlayerName: message` with colors)*
            -   **Nametag Display:** *(IMPLEMENTED: Rank above player name like `Owner\nPlayerName` with colors. Nametag modification via `player.nameTag` was successful.)*
            -   Permissions for AC commands could be tied to ranks. (VERIFIED - System already correctly ties command permissions to Owner/Admin/Normal ranks via `playerUtils.getPlayerPermissionLevel` and `commandManager.js` logic).
            -   Requires persistent storage if not solely derived from config/tags at runtime. *(Still relevant; current implementation is runtime derived from config/tags)*
        *   Investigate: Device Ban (highly API dependent, likely difficult/impossible with Script API alone, might involve external database if server has such capabilities). (SafeGuard)

*   **World Management & Protection:** SjnExe parity goal.
    *   Investigate & Implement: Anti-Grief (e.g., auto-clear placed TNT by non-admins, auto-extinguish excessive fires not from natural sources).

*   **Normal Player Panel Features (`!panel`):**

*   **Improved Banned Player Join Message:** (COMPLETED)
    - When a banned player attempts to join, display a detailed message:
      - Standard message: "You are banned from this server. Contact an admin to appeal."
      - If `config.discordLink` is set and not empty, append: "Discord: [discordLinkValue]".
      - Display who issued the ban (e.g., "Banned by: [AdminName]").
      - Display the reason for the ban.
      - (Future consideration: If ban was by AutoMod, state "Banned by: AutoMod").
    - This requires storing ban details (banner, reason) more persistently or making them accessible at join time.

## Refactoring & Enhancements

## UI/UX Enhancements
- Refactor `!help` command with categorized sections for better readability (COMPLETED).

## Low Priority / Ideas

*   **Automated Actions (AutoMod):** (from original todo, Scythe, SafeGuard)
    *   Implement configurable automated actions (e.g., kick, temporary ban, extended watch period) based on accumulated flag counts or specific severe cheat detections. Requires careful design to minimize false positives and allow for admin review/override.
*   **Player Utilities & Experience:** SjnExe parity goal.
    *   Death Effects: Investigate and implement cosmetic effects on player death.
    *   Chat Formatting (potentially linked to the Rank System).
*   **Logging Enhancements:** SjnExe parity goal.
    *   **Detailed Player Join/Leave Logging:** Log player join/leave events with more context than default debug logs (e.g., IP if available via API - unlikely, device type).
*   **Localization:** (from original todo) Consider options for localizing warning messages and UI elements for a multi-lingual audience.

## TPA System Implementation (COMPLETED)
- **Phase 1: Core Setup & Configuration** (COMPLETED)
- **Phase 2: Basic Request Commands (`!tpa`, `!tpahere`)** (COMPLETED)
- **Phase 3: Responding to Requests (`!tpaccept`, `!tpacancel`)** (COMPLETED)
- **Phase 4: Status & System Mechanics (`!tpastatus`, Expiry)** (COMPLETED)
- **Phase 5: Integration & Finalization (Help, Testing)** (COMPLETED)
  - Update `!help` command for TPA features (COMPLETED)
  - Thoroughly test all TPA functionalities (COMPLETED)
- **Phase 6: Enhancements (Cooldown, Warm-up)** (COMPLETED)
  - Implement cooldown for sending TPA requests (COMPLETED)
  - Implement TPA teleport warm-up with damage cancellation (COMPLETED)

## Documentation & Workflow
*   **Task File Maintenance:** AI assistant should keep `completed.md`, `ongoing.md`, and `todo.md` current.
