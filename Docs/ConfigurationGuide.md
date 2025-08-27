# AddonExe: Configuration Guide

This guide provides an overview of how to configure AddonExe. Proper configuration is key to tailoring the addon's behavior to your server's specific needs.

## ⚙️ Configuration Philosophy

The addon's configuration is split across several files, each with a specific purpose. This modular approach keeps settings organized and easier to manage.

- **`config.js`:** The main hub for most toggles and values. Use this file to enable/disable major features, set the command prefix, define owner/admin access, and adjust feature-specific settings.
- **`ranksConfig.js`:** The definitive file for managing all permissions and visual rank styles (chat, nametags).
- **`panelLayoutConfig.js`:** Controls the structure and content of the main Admin UI (`!panel`).
- **`kitsConfig.js`:** Defines the contents and cooldowns for player kits.

> [!NOTE]
> Other files like `textDatabase.js` (for language/text customization) exist but are not part of the primary configuration workflow.

---

## 🛠️ Initial Setup & Permissions (CRITICAL)

These are the first crucial steps after installing AddonExe.

### 1. Set the Server Owner(s)
This is the most important step for gaining control over the addon.

- **File:** `AddonExeBP/scripts/config.js`
- **Action:** Find the `ownerPlayerNames` setting and add your **exact** in-game name (case-sensitive) to the array. You can add multiple names.
  ```javascript
  // Example in AddonExeBP/scripts/config.js
  ownerPlayerNames: ['YourExactPlayerName', 'AnotherOwnerName'],
  ```
- **Importance:** The Owner rank has the highest level of permissions (Level 0). **If this array is empty, no one will have administrative control.**

### 2. Set Server Admins (Optional)
This is the easiest way to give other players administrative privileges.

- **File:** `AddonExeBP/scripts/config.js`
- **Action:** Find the `adminTag` setting. Players with this Minecraft tag will be granted the "Admin" rank.
  ```javascript
  // Example in AddonExeBP/scripts/config.js
  adminTag: 'admin',
  ```
- **Usage:** In-game, give a player the tag: `/tag "PlayerName" add admin`

### 3. Configure Ranks and Permissions
For more advanced control over permissions and visual styles, you can edit the ranks file.

- **File:** `AddonExeBP/scripts/core/ranksConfig.js`
- **Action:** Modify the `rankDefinitions` array to define your server's roles (e.g., Moderator, VIP). You can set permission levels, chat formats, and nametags for each rank.
- **➡️ For a complete guide, see: [Rank System Documentation](RankSystem.md)**

---

## 📄 Core Configuration Files

### `config.js` - The Main Hub
This is the primary file for most top-level settings.

- **File:** `AddonExeBP/scripts/config.js`
- **Purpose:**
  - Define `ownerPlayerNames` and the `adminTag`.
  - Enable or disable major systems (`tpa.enabled`, `homes.enabled`, `economy.enabled`, etc.).
  - Set the global command `prefix` (default: `!`).
  - Configure server features like starting economy balance, max homes, or welcome messages.
  - Customize server info like Discord links and rules.
  - Toggle individual commands on or off in the `commandSettings` section.

### `ranksConfig.js` - Ranks & Permissions
This file defines the entire hierarchy of roles on your server.

- **File:** `AddonExeBP/scripts/core/ranksConfig.js`
- **Purpose:**
  - Define all available ranks (e.g., Owner, Admin, Member, custom ranks).
  - Set the `permissionLevel` for each rank, which controls access to commands.
  - Customize the visual `chatFormatting` (prefix, name color) for each rank.
  - Set a `nametagPrefix` for each rank.
  - Define the `conditions` for how a rank is assigned (e.g., based on the `ownerPlayerNames` list, the `adminTag`, or being the default).

### `panelLayoutConfig.js` - Admin Panel UI
This file controls the layout, buttons, and actions of the `!panel` user interface.

- **File:** `AddonExeBP/scripts/core/panelLayoutConfig.js`
- **Purpose:**
  - Add, remove, or reorder categories and buttons.
  - Change button text, icons, and required permission levels.
  - Link buttons to specific actions (like running a command or opening another panel).

### `kitsConfig.js` - Player Kits
This file defines the kits that players can claim.

- **File:** `AddonExeBP/scripts/core/kitsConfig.js`
- **Purpose:** Add, remove, or modify kits, including their items, cooldowns, and descriptions.

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
