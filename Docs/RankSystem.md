# Owner and Rank System

This addon features a flexible rank system to visually distinguish players, grant permissions, and customize chat appearances. While "Owner", "Admin", and "Member" are foundational, the system is designed to be extensible through `ranksConfig.js`.

## Core Configuration (`config.js`)

Two key settings in `AntiCheatsBP/scripts/config.js` establish the highest privilege levels:

*   **Owner:**
    *   **Setting:** `ownerPlayerName`
    *   **Action:** Set this to the **exact** in-game Minecraft name (case-sensitive) of the primary server owner.
        ```javascript
        // Example in AntiCheatsBP/scripts/config.js
        export const ownerPlayerName = "YourExactPlayerName";
        ```
    *   **Importance:** The Owner rank (typically permission level 0) has ultimate control. If `ownerPlayerName` is not set correctly, the designated owner rank might not apply.

*   **Admin Tag:**
    *   **Setting:** `adminTag`
    *   **Action:** This defines the Minecraft tag (e.g., `"admin"`) that grants players the main "Admin" rank privileges.
        ```javascript
        // Example in AntiCheatsBP/scripts/config.js
        export const adminTag = "admin";
        ```
    *   **Usage:** Assign this tag using `/tag "PlayerName" add admin`.

## Detailed Rank Definitions (`ranksConfig.js`)

For more comprehensive rank management, including custom ranks, specific permissions, and detailed chat/nametag styling, the primary configuration file is:
**`AntiCheatsBP/scripts/core/ranksConfig.js`**

This file allows you to define an array of `rankDefinitions`. Each definition typically includes:

*   `id` (string): A unique identifier for the rank (e.g., "owner", "admin", "vip", "member"). Processed as lowercase.
*   `name` (string): A user-friendly display name (e.g., "Owner", "Administrator", "VIP", "Member").
*   `permissionLevel` (number): A numeric level determining privileges. **Lower numbers mean higher privileges** (e.g., Owner = 0, Admin = 1, Member = 1024). This is crucial for command access and feature usage.
*   `chatFormatting` (object, optional): Customizes how chat messages from players with this rank appear.
    *   `prefixText` (string): Text before the player's name (e.g., "§c[Owner] ").
    *   `prefixColor` (string): Color code for the prefix.
    *   `nameColor` (string): Color code for the player's name.
    *   `messageColor` (string): Color code for the actual message content.
    *   Defaults are provided in `ranksConfig.js` if not specified per rank.
*   `nametagPrefix` (string, optional): Text displayed above the player's nametag in the world (e.g., "§cOwner §f\n").
*   `conditions` (array of objects): Rules for how a player is assigned this rank.
    *   `type: 'ownerName'`: Matches the `ownerPlayerName` from `config.js`.
    *   `type: 'adminTag'`: Matches the `adminTag` from `config.js`.
    *   `type: 'tag', tag: 'your_custom_tag'`: Matches if the player has the specified custom tag.
    *   `type: 'manualTagPrefix', prefix: 'rank_'`: Matches if the player has a tag like `rank_vip` (where `vip` is the rank `id`).
    *   `type: 'default'`: A fallback, typically used for the base "Member" rank.
*   `assignableBy` (number, optional): The permission level required for another player (e.g., an Admin) to assign or remove this rank using commands like `!rank add` or `!rank remove`.

### Rank Precedence
If a player meets the conditions for multiple ranks, the rank with the **lowest `permissionLevel` number** (which signifies the highest privilege) will be considered their primary rank. This primary rank determines their command permissions, chat formatting, and nametag prefix.

### Example Structure (Conceptual from `ranksConfig.js`):
```javascript
export const rankDefinitions = [
    {
        id: 'owner',
        name: 'Owner',
        permissionLevel: 0,
        conditions: [{ type: 'ownerName' }],
        // ... other properties
    },
    {
        id: 'admin',
        name: 'Admin',
        permissionLevel: 1,
        conditions: [{ type: 'adminTag' }],
        assignableBy: 0,
        // ... other properties
    },
    // Example custom rank:
    // {
    //     id: 'moderator',
    //     name: 'Moderator',
    //     permissionLevel: 100,
    //     chatFormatting: { prefixText: '§a[Mod] ', nameColor: '§a' },
    //     conditions: [{ type: 'tag', tag: 'mod_rank' }],
    //     assignableBy: 1, // Admins can assign Mod
    // },
    {
        id: 'member',
        name: 'Member',
        permissionLevel: 1024, // Default level
        conditions: [{ type: 'default' }],
        // ... other properties
    }
];
```

By editing `ranksConfig.js`, you can create a detailed hierarchy tailored to your server's needs. The `!listranks` command can be used in-game to see defined ranks.
