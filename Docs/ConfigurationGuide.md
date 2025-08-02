# AntiCheats Addon: Configuration Guide

This guide provides an overview of how to configure the AntiCheats Addon. Proper configuration is key to tailoring the addon's behavior to your server's specific needs.

## ⚙️ Configuration Philosophy

The addon's configuration is split across several files, each with a specific purpose. This modular approach keeps settings organized and easier to manage.

- **`config.js`:** The main hub for simple toggles and values. Use this file to enable/disable major features, set command prefixes, and adjust basic parameters.
- **`ranksConfig.js`:** The definitive file for managing all permissions. Use this to define who is an Owner, Admin, or Member, and what they can do.
- **`actionProfiles.js`:** Defines the *immediate* consequences of a cheat detection (e.g., "when a player flies, flag them and notify admins").
- **`automodConfig.js`:** Defines the *escalating* consequences of repeated detections (e.g., "if a player gets 10 fly flags, kick them").
- **`panelLayoutConfig.js`:** Controls the structure and content of the main Admin UI (`!panel`).
- **`textDatabase.js`:** Contains most of the user-facing text for UI, commands, and messages.
- **`kits.js`:** Defines the contents and cooldowns for player kits.

---

## 🛠️ Initial Setup & Permissions

These are the first crucial steps after installing the addon.

### 1. Set the Server Owner (CRITICAL)
This is the most important step for gaining control over the addon.

- **File:** `AntiCheatsBP/scripts/core/ranksConfig.js`
- **Action:** In the `ranks` array, find the `Owner` rank and add your **exact** in-game name (case-sensitive) to the `members` array.
  ```javascript
  // Example in AntiCheatsBP/scripts/core/ranksConfig.js
  {
      name: "Owner",
      permissionLevel: 0,
      members: ["YourExactPlayerName"], // <--- ADD YOUR NAME HERE
      // ... other properties
  },
  ```
- **Importance:** The Owner rank has the highest level of permissions. **If no owner is set, no one will have administrative control.**

### 2. Configure Ranks and Permissions
The entire permission system is managed through ranks. We **strongly recommend** using this system instead of the legacy `adminTag`.

- **File:** `AntiCheatsBP/scripts/core/ranksConfig.js`
- **Action:** Modify the `ranks` array to define your server's roles (e.g., Admin, Moderator, Member). You can set permission levels, chat formats, and nametags for each rank.
- **To Assign a Player to a Rank:**
    - **By Name:** Add their name to the `members` array of the desired rank (as shown above for the Owner).
    - **By Tag:** Add a Minecraft tag to the `requiredTags` array of a rank, then give a player that tag in-game (e.g., `/tag "PlayerName" add admin`).
- **➡️ For a complete guide, see: [Rank System Documentation](RankSystem.md)**

---

## 📄 Core Configuration Files

### `config.js` - The Main Hub
This is the primary file for most top-level settings.

- **File:** `AntiCheatsBP/scripts/config.js`
- **Purpose:**
  - Enable or disable major systems (`enableAutoMod`, `enableTpaSystem`, `enableWorldBorderSystem`, etc.).
  - Set the global command `prefix` (default: `!`).
  - Toggle individual cheat checks on or off.
  - Adjust simple detection parameters (e.g., check intervals).
  - Configure server features like starting economy balance or max homes.
- **In-Game Editing:** Some values in `config.js` (those inside the `editableConfigValues` object) can be modified by Owners in-game via the `!panel` UI.

### `actionProfiles.js` - Immediate Consequences
This file defines what happens *at the moment* a cheat is detected.

- **File:** `AntiCheatsBP/scripts/core/actionProfiles.js`
- **Purpose:** For each `checkType` (e.g., `movementFlyHover`), you can define:
  - Whether to **flag** the player and for how many points.
  - The **reason message** associated with the flag.
  - Whether to send a real-time **notification to admins**.
  - Whether to **cancel** the underlying game event (e.g., stop a chat message or block placement).
- **Example Concept:** "When `chatSwearViolation` occurs, cancel the message, flag the player for 1 point, and log it."

### `automodConfig.js` - Automated Escalation
This file manages the AutoMod system, which punishes players for accumulating flags over time.

- **File:** `AntiCheatsBP/scripts/core/automodConfig.js`
- **Purpose:** Create rule sets for each `checkType` that define a ladder of punishments.
- **Example Concept:** "For the `movementFlyHover` check type: if a player reaches 10 flags, warn them. If they reach 20 flags, kick them. If they reach 30 flags, ban them for 1 day."
- **➡️ For a complete guide, see: [AutoMod System Details](AutoModDetails.md)**

### `panelLayoutConfig.js` - Admin Panel UI
This file controls the layout, buttons, and actions of the `!panel` user interface.

- **File:** `AntiCheatsBP/scripts/core/panelLayoutConfig.js`
- **Purpose:**
  - Add, remove, or reorder categories and buttons.
  - Change button text, icons, and required permission levels.
  - Link buttons to specific actions (like running a command, opening another panel, or calling a script function).
- **Customization:** This file allows you to create a highly customized UI tailored to your server's administrative workflow.

### `textDatabase.js` - User-Facing Text
This file is a central location for most of the text shown to players.

- **File:** `AntiCheatsBP/scripts/core/textDatabase.js`
- **Purpose:** Manage UI text, command responses, and other messages in one place. This makes it easy to change wording or even translate the addon.

### `kits.js` - Player Kits
This file defines the kits that players can claim.

- **File:** `AntiCheatsBP/scripts/core/kits.js`
- **Purpose:** Add, remove, or modify kits, including their items, cooldowns, and descriptions.

---

## ✅ Best Practices for Configuration

- **Read Comments:** The configuration files are well-commented. Read them carefully before changing values.
- **Start Small:** If you're unsure about a setting, change it by a small amount and observe the effect.
- **Test Thoroughly:** After making configuration changes, test them on a non-production server to ensure they work as expected.
- **Backup:** Before major changes, always back up your configuration files.
- **Consult Documentation:** For complex systems, refer to their specific detailed guides in the `Docs/` folder.
