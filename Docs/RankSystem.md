# Owner and Rank System

This addon features a simple rank system to visually distinguish players and grant permissions. There are three primary ranks: Owner (highest), Admin, and Member (default). These ranks come with distinct prefixes and colors in chat messages and, in some configurations, above player nametags (e.g., Owner in red, Admin in aqua, Member in gray).

## Configuration

Rank configuration is managed via settings in the `AntiCheatsBP/scripts/config.js` file.

### Owner Rank

The Owner rank is the highest permission level, typically intended for the primary server administrator(s).

[!IMPORTANT]
> To correctly configure the **Owner** rank, you **must** edit the `ownerPlayerName` variable in `AntiCheatsBP/scripts/config.js`.
> Set this variable to the exact in-game name of the player who should be designated as the Owner.
>
> ```javascript
> // Example in AntiCheatsBP/scripts/config.js
> export const ownerPlayerName = "YourExactPlayerName";
> ```
> If `ownerPlayerName` is not set, is empty, or remains as a placeholder like `"PlayerNameHere"`, the Owner rank will not be assigned to anyone.

### Admin Rank

The Admin rank is for trusted players who need administrative capabilities to manage the server and the anti-cheat system.

*   **Configuration:** Admin rank is typically determined by players having a specific Minecraft tag.
*   **Setting:** The tag used to identify admins is defined by the `adminTag` variable in `AntiCheatsBP/scripts/config.js`.
    ```javascript
    // Example in AntiCheatsBP/scripts/config.js
    export const adminTag = "admin"; // Default is often "admin"
    ```
    Players who have this tag will be recognized as Admins by the addon. You can assign this tag to players using Minecraft's built-in `/tag` command (e.g., `/tag YourAdminPlayer add admin`).

### Member Rank

Member is the default rank for all players who are not designated as Owner or Admin. It typically has no special permissions beyond standard player capabilities.

## Visuals

Ranks are usually displayed with distinct prefixes and colors in chat messages and potentially above player nametags, making it easy to identify players with different roles. The specifics of these visuals can sometimes be configured within the addon's settings or related resource pack files if available.
