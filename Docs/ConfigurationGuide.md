# AddonExe: Configuration Guide

This guide provides an overview of how to configure AddonExe. Proper configuration is key to tailoring the addon's behavior to your server's specific needs.

## ⚙️ Configuration Philosophy

The addon's configuration is split across several files, each with a specific purpose. This modular approach keeps settings organized and easier to manage.

- **`config.js`:** The main hub for most toggles and values. Use this file to enable/disable major features, set the chat command prefix, define owner/admin access, and adjust feature-specific settings.
- **`ranksConfig.js`:** The definitive file for managing all permissions and visual rank styles (chat, nametags).
- **`panelLayoutConfig.js`:** Controls the structure and content of the main Admin UI (`/panel`).
- **`kitsConfig.js`:** Defines the contents and cooldowns for player kits.

> [!NOTE]
> Other files like `textDatabase.js` (for language/text customization) exist but are not part of the primary configuration workflow.

---

## 🛠️ Initial Setup & Permissions (CRITICAL)

Follow these steps to gain administrative control of the addon.

### 1. Set the Server Owner(s)
- **File:** `AddonExeBP/scripts/config.js`
- **Action:** Find `ownerPlayerNames` and add your **exact** in-game name (case-sensitive).
  ```javascript
  // Example in AddonExeBP/scripts/config.js
  ownerPlayerNames: ['YourExactPlayerName', 'AnotherOwnerName'],
  ```
- **Applying Changes:** After editing `config.js`, simply run `/xreload` in-game as an Admin. A full server restart is no longer required for most config changes.
- **➡️ For a summary, see the [F.A.Q.](F.A.Q.md#how-do-i-change-the-server-owner)**

### 2. Set Server Admins (Optional)
- **File:** `AddonExeBP/scripts/config.js`
- **Action:** The `adminTag` setting (default: `"admin"`) determines who gets the Admin rank.
- **Usage:** To make someone an admin, give them the tag: `/tag "PlayerName" add admin`.
- **➡️ For a summary, see the [F.A.Q.](F.A.Q.md#how-do-i-make-myself-an-admin)**

### 3. Configure Ranks and Permissions
For more advanced control over permissions and visual styles, you can edit the ranks file.

- **File:** `AddonExeBP/scripts/core/ranksConfig.js`
- **Action:** Modify the `rankDefinitions` array to define your server's roles (e.g., Moderator, VIP). You can set permission levels, chat formats, and nametags for each rank.
- **➡️ For a complete guide, see: [Rank System Documentation](RankSystem.md)**

---

## 🔄 Reloading the Configuration

AddonExe features a smart reloading system to apply configuration changes without needing to restart your server.

- **Command:** `/xreload` (or `!reload` in chat)
- **Permission:** Admin

### How it Works
The addon uses a two-state configuration system to prevent accidental loss of in-game changes (like a player's balance set via a command).

1.  **Live Config:** This is the configuration currently being used by the addon. It can be modified by in-game commands.
2.  **Last Loaded Config:** This is a snapshot of the `config.js` file from the last time the server started or `/xreload` was used.

When you run `/xreload`, the addon compares the current `config.js` file on disk to the `Last Loaded Config`.

-   **If a setting has been changed in the file:** The addon will update the live config with the new value from the file. This means changes in the file always take priority.
-   **If a setting has NOT been changed in the file:** The addon will leave the live config value untouched, preserving any changes made through in-game commands.

After the reload, a new snapshot is taken, and the process repeats on the next `/xreload`.

> [!IMPORTANT]
> The `/xreload` command applies to settings in `config.js` and `kitsConfig.js`. For structural changes in other files like `ranksConfig.js` or `panelLayoutConfig.js`, a full server restart is still required to ensure they are applied correctly.

---

## 📄 Core Configuration Files

### `config.js` - The Main Hub
This is the primary file for most top-level settings. **Changes to this file can be reloaded with `/xreload`**.

- **File:** `AddonExeBP/scripts/config.js`
- **Purpose:**
  - Define `ownerPlayerNames` and the `adminTag`.
  - Enable or disable major systems (`tpa.enabled`, `homes.enabled`, `economy.enabled`, etc.).
  - Set the global chat command `prefix` (default: `!`).
  - Configure server features like starting economy balance, max homes, or welcome messages.
  - Customize server info like Discord links and rules.
  - Toggle individual commands on or off in the `commandSettings` section.

### `kitsConfig.js` - Player Kits
This file defines the kits that players can claim. **Changes to this file can be reloaded with `/xreload`**.

- **File:** `AddonExeBP/scripts/core/kitsConfig.js`
- **Purpose:** Add, remove, or modify kits, including their items, cooldowns, and descriptions.

### `ranksConfig.js` - Ranks & Permissions
This file defines the entire hierarchy of roles on your server. **Requires a server restart to apply changes.**

- **File:** `AddonExeBP/scripts/core/ranksConfig.js`
- **Purpose:**
  - Define all available ranks (e.g., Owner, Admin, Member, custom ranks).
  - Set the `permissionLevel` for each rank, which controls access to commands.
  - Customize the visual `chatFormatting` (prefix, name color) for each rank.
  - Set a `nametagPrefix` for each rank.
  - Define the `conditions` for how a rank is assigned (e.g., based on the `ownerPlayerNames` list, the `adminTag`, or being the default).

### `panelLayoutConfig.js` - Admin Panel UI
This file controls the layout, buttons, and actions of the `/panel` user interface. **Requires a server restart to apply changes.**

- **File:** `AddonExeBP/scripts/core/panelLayoutConfig.js`
- **Purpose:**
  - Add, remove, or reorder categories and buttons.
  - Change button text, icons, and required permission levels.
  - Link buttons to specific actions (like running a command or opening another panel).

> [!IMPORTANT]
> **Cheat Detection Configuration Coming Soon**
>
> The full suite of cheat detections and automated responses (`actionProfiles`, `automodConfig`) is currently being re-developed and is not part of the addon. Configuration for these features will be added in a future update.

---

## ✅ Best Practices for Configuration

- **Read Comments:** The configuration files are well-commented. Read them carefully before changing values.
- **Start Small:** If you're unsure about a setting, change it by a small amount and observe the effect.
- **Test Thoroughly:** After making configuration changes, test them on a non-production server to ensure they work as expected.
- **Backup:** Before major changes, always back up your configuration files.
- **Consult Documentation:** For complex systems, refer to their specific detailed guides in the `Docs/` folder.
