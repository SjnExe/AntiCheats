<div align="center">
  
# AddonExe for Minecraft BE
</div>
<div align="center">

[![Latest Release](https://img.shields.io/github/v/release/SjnExe/AddonExe?label=latest%20version&display_name=tag&style=for-the-badge)](https://github.com/SjnExe/AddonExe/releases/latest)
[![GitHub All Releases](https://img.shields.io/github/downloads/SjnExe/AddonExe/total?style=for-the-badge)](https://github.com/SjnExe/AddonExe/releases)
![Minecraft BE Version](https://img.shields.io/badge/Minecraft_BE-1.21.100%2B-brightgreen?style=for-the-badge&logo=minecraft)
[![GitHub Issues](https://img.shields.io/github/issues/SjnExe/AddonExe?style=for-the-badge&logo=github)](https://github.com/SjnExe/AddonExe/issues)
![Status: Beta Release](https://img.shields.io/badge/Status-Beta%20Release-yellow?style=for-the-badge)
[![Discord Server](https://img.shields.io/discord/633296555650318346?style=for-the-badge&logo=discord&logoColor=white&label=Discord&color=7289DA)](https://discord.gg/SMUHUnGyyz)

</div>

> [!IMPORTANT]
> **CURRENT PROJECT STATUS: BETA RELEASE**
>
> This AddonExe is now in **Beta**.
>
> **Please be aware:**
>
> - While more stable than pre-release versions, some bugs may still be present.
> - We encourage you to back up your world before installation.
> - Your feedback is crucial for identifying and fixing remaining issues.
>
> We appreciate your understanding and encourage testers to [report any issues on GitHub](https://github.com/SjnExe/AddonExe/issues). Your feedback is vital for the final release!

---

<div align="center">

**The ultimate scripting-based solution for your Minecraft Bedrock Edition world!**
Designed to be robust, highly configurable, and packed with features to ensure fair and fun gameplay.

</div>

---

## ✨ Why Choose This AddonExe?

- **Scripting Power:** Built entirely with the Minecraft Scripting API, offering flexibility and complex detection logic not always possible with traditional methods.
- **Comprehensive Detection (Coming Soon):** While currently a powerful moderation tool, a full suite of cheat detections is in active development.
- **User-Friendly Tools:** Manage your server with ease using an intuitive in-game UI (`!panel`) and extensive text commands. The `!ui` command is a convenient alias. Features a detailed Player Management panel with sorting, role display, and a wide array of actions.
- **Highly Customizable:** Fine-tune almost every aspect, from feature toggles to command permissions, to perfectly suit your server's needs.
- **Active Development:** Continuously updated with new features, improvements, and compatibility for the latest Minecraft versions.
- **Open & Documented:** With clear documentation and an open codebase, understand how it works and even contribute!
- **Enhanced Stability:** Includes robust error handling and a watchdog to prevent script-related server crashes, ensuring a more stable experience.

---

## 🌟 Core Features at a Glance

This addon is packed with features to keep your server clean:

- 🛠️ **Powerful Admin & Moderation Tools:**
  - A universal, dynamic in-game UI panel that shows each player only the buttons they are permitted to see. The panel item can be crafted by anyone, or spawned directly with the admin-only `!panel` (or `!ui`) command.
  - **Enhanced Player Management Panel:**
    - View online players, sorted by rank and name.
    - Player names are clearly marked with `(Owner)`, `(Admin)`, and `(You)` suffixes.
    - Perform a wide range of actions: Kick, Ban/Unban, Mute/Unmute, Freeze, View/Clear Inventory, Teleport.
  - **New Commands:** `!clear` (clear inventory), `!ecwipe` (wipe ender chest), `!invsee` (view inventory).
  - Extensive text commands for all administrative functions (Note: the `!` prefix is configurable).
- 💾 **Persistent Player Data Management:**
  - Mutes and bans are saved across player sessions using dynamic properties.
- ⚙️ **Highly Configurable System:**
  - Toggle major features, customize messages, and define all permissions and ranks in easy-to-edit configuration files.
- 🏅 **Flexible Rank System:**
  - Define Owner, Admin, Member, and custom roles with specific permissions and visual chat/nametag prefixes.
- 📞 **Teleport Request System (TPA/TPAHere):**
  - Allows players to request teleports to others or summon others, with configurable cooldowns and warmup periods.
- ✨ **Player & Server Utilities:**
  - **Economy & Bounties:** A simple economy system with player balances, payment commands, and a full bounty system.
  - **Homes:** Allows players to set and teleport to their own personal "homes".
  - **Kits:** A system for players to claim predefined kits of items with cooldowns.

> [!NOTE]
> **Cheat Detection Suite Coming Soon!**
> A comprehensive suite of cheat detections is under active development and will be added in a future update.

➡️ **Dive Deeper:** For a full list and details of all features, check out our [**Features Overview in the Docs**](Docs/FeaturesOverview.md)!

---

## 🚀 Quick Start & Setup

Get up and running in minutes!

1. **Download:** Grab the latest `.mcaddon` from [**GitHub Releases**](https://github.com/SjnExe/AddonExe/releases).
2. **Install:** Apply both `AddonExeBP` (Behavior Pack) and `AddonExeRP` (Resource Pack) to your world.
3. **Enable Beta APIs (CRITICAL!):**
   - In your world settings, go to the "Experiments" section.
   - **Enable the "Beta APIs" toggle.** This addon relies on beta Minecraft Scripting API features and will not function correctly without this setting enabled.
4. **Prioritize:** Ensure `AddonExeBP` is at the **TOP** of your behavior pack list. This is crucial for the AddonExe to function correctly.
5. **👑 Set Owner(s) (CRUCIAL!):**
   - After applying the packs, open `AddonExeBP/scripts/config.js` in a text editor. (You may need to extract the `.mcaddon` file to access its contents).
   - Find the `ownerPlayerNames` setting.
   - Add your **exact** in-game name (case-sensitive) to the array. You can add multiple owner names.
     ```javascript
     // Example in AddonExeBP/scripts/config.js
     ownerPlayerNames: ['YourNameHere', 'AnotherOwnerName'],
     ```
   - **Failure to set at least one owner will result in no player having administrative permissions.**
6. **🎮 Explore:** Join your world and open the Admin UI. Admins can get the panel item directly by typing `!panel` or `!ui`. Any player can also craft the item using a single stick.
7. **🔧 Configure (Optional but Recommended):**
   - Review `AddonExeBP/scripts/config.js` for other core settings (like the command `prefix`).
   - For detailed setup and advanced options, visit our [**Setup and Configuration Guide**](Docs/ConfigurationGuide.md).

<details>
<summary><strong>💡 Quick Troubleshooting Tips & Full Guide</strong></summary>

Common quick checks:

- **Enable "Beta APIs":** Make sure the "Beta APIs" experimental toggle is ON in your world settings. This addon requires it.
- Ensure `AddonExeBP` is at the very top of your behavior packs.
- Verify you have added your exact, case-sensitive name to the `ownerPlayerNames` array in `config.js`.
- Check Minecraft version compatibility (see badge above).
- Test for conflicts with other addons, especially those modifying player behavior.

➡️ For a comprehensive guide, see our [**Troubleshooting Guide**](Docs/Troubleshooting.md).

If problems persist after checking the guide, please [report an issue](https://github.com/SjnExe/AddonExe/issues)!

</details>

---

## 📖 Documentation Hub

All detailed information has been moved to our `Docs` folder for clarity:

- 📜 [**Commands List**](Docs/Commands.md) - Every command for players and admins.
- 🏅 [**Rank System**](Docs/RankSystem.md) - How to configure and use ranks.
- ✨ [**Full Features Overview**](Docs/FeaturesOverview.md) - A detailed breakdown of all addon features.
- ⚙️ [**Configuration Guide**](Docs/ConfigurationGuide.md) - In-depth look at `config.js` and other settings.

---

## Performance Considerations

This addon is designed to be as lightweight as possible. However, performance can be influenced by the number of checks enabled, their sensitivity, and the server's player count. We recommend starting with default configurations and adjusting based on your server's needs.

For developers, the addon includes a basic performance profiling feature that can be enabled in `config.js` to help identify potential bottlenecks. For more details, see the [**Developer README**](Dev/README.md).

---

## 🤝 Contributing

Contributions are highly welcome and appreciated! Help us make this addon even better.

- **Fork & Branch:** Create your own fork and make changes in a dedicated branch.
- **Code Style:** Follow our 📄 [**Coding Style Guide**](Dev/CodingStyle.md).
- **Test Thoroughly:** Ensure your changes are stable and don't introduce new issues.
- **Document Changes:** Update relevant documentation in the `Docs` folder if you add or modify features.
- **Pull Request:** Submit your changes for review. Explain what you've changed and why.

Looking for a place to start? Check out our [**issues tab**](https://github.com/SjnExe/AddonExe/issues) – we often tag issues that are great for new contributors.

➡️ For more on development processes, see our [**Developer README**](Dev/README.md).

---

## ❤️ Our Valued Contributors

This project is made possible by the community and all the developers who dedicate their time to contribute. We are incredibly grateful for every contribution, from reporting issues and suggesting new ideas to writing code and improving documentation.

➡️ You can see a list of code contributors on [**GitHub**](https://github.com/SjnExe/AddonExe/graphs/contributors).

---
<div align="center">
  
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
</div>
Thank you for using the AddonExe!
We hope it helps create a fairer and more enjoyable Minecraft experience for your community.
