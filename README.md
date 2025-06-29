<p align="center">
  <!-- Optional: Add a cool project logo/banner here -->
  <!-- Example: <img src="link_to_your_logo.png" alt="AntiCheats Addon Logo" width="200"/> -->
  <h1 align="center">AntiCheats Addon for Minecraft BE</h1>
</p>

<p align="center">
  <a href="https://github.com/SjnExe/AntiCheats/releases/latest"><img src="https://img.shields.io/github/v/release/SjnExe/AntiCheats?label=latest%20version&display_name=tag&sort=semver&style=for-the-badge" alt="Latest Release"/></a>
  <img src="https://img.shields.io/badge/Minecraft_BE-1.21.90%2B-brightgreen?style=for-the-badge&logo=minecraft" alt="Minecraft BE Version"/>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License: MIT"/></a>
  <a href="https://github.com/SjnExe/AntiCheats/issues"><img src="https://img.shields.io/github/issues/SjnExe/AntiCheats?style=for-the-badge&logo=github" alt="GitHub Issues"/></a>
  <img src="https://img.shields.io/badge/Status-Active-green?style=for-the-badge" alt="Status: Active"/>
  <a href="https://discord.gg/SMUHUnGyyz"><img src="https://img.shields.io/badge/Discord-Join_Us-7289DA?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"/></a>
</p>

<p align="center">
  <strong>The ultimate scripting-based Anti-Cheat solution for your Minecraft Bedrock Edition world!</strong>
  <br />
  Detecting and deterring cheaters to ensure fair and fun gameplay for everyone.
</p>

---

## 🌟 Core Features at a Glance

This addon is packed with features to keep your server clean:

*   ⚔️ **Advanced Cheat Detections:** Movement (Fly, Speed, NoFall), Combat (Reach, CPS), World (Nuker, Illegal Items), Player (AntiGMC, NameSpoof), and much more!
*   🛠️ **Powerful Admin Tools:** Intuitive UI (`!panel`) & comprehensive text commands.
*   💾 **Persistent Player Data:** Flags & violation records are saved across sessions.
*   ⚙️ **Highly Configurable:** Tailor detection sensitivity and actions to your server's needs.
*   🤖 **AutoMod System:** Automated warnings, kicks, and bans.
*   🗺️ **Dynamic World Border:** Per-dimension, resizable borders with visuals & damage.
*   🏅 **Rank System:** Define Owner, Admin, and Member roles with custom visuals.

➡️ **Dive Deeper:** For a full list and details of all features, check out our [**Features Overview in the Docs**](Docs/FeaturesOverview.md)!

---

## 🚀 Quick Start & Setup

Get up and running in minutes!

1.  **Download:** Grab the latest `.mcaddon` from [**GitHub Releases**](https://github.com/SjnExe/AntiCheats/releases).
2.  **Install:** Apply both `AntiCheatsBP` (Behavior Pack) and `AntiCheatsRP` (Resource Pack) to your world.
3.  **Prioritize:** Ensure `AntiCheatsBP` is at the **TOP** of your behavior pack list.
4.  **👑 Set Owner (CRUCIAL!):**
    *   Open `AntiCheatsBP/scripts/config.js`.
    *   Set `ownerPlayerName` to your **exact** in-game name. This grants you full control!
5.  **🎮 Explore:** Join your world and type `!panel` (or `!ui`) to open the Admin UI.
6.  **🔧 Configure (Optional):**
    *   Other core settings (admin tag, command prefix) are in `AntiCheatsBP/scripts/config.js`.
    *   For detailed setup and advanced options, visit our [**Setup and Configuration Guide**](Docs/ConfigurationGuide.md).

---

## 📖 Documentation Hub

All detailed information has been moved to our `Docs` folder for clarity:

*   📜 [**Commands List**](Docs/Commands.md) - Every command for players and admins.
*   🛡️ [**AutoMod System**](Docs/AutoModDetails.md) - Setup and rules for automated moderation.
*   🗺️ [**World Border System**](Docs/WorldBorderDetails.md) - Full guide on using the world border.
*   🏅 [**Rank System**](Docs/RankSystem.md) - How to configure and use ranks.
*   ✨ [**Full Features Overview**](Docs/FeaturesOverview.md) - A detailed breakdown of all addon features.
*   ⚙️ [**Configuration Guide**](Docs/ConfigurationGuide.md) - In-depth look at `config.js` and other settings.

---

## 🤝 Contributing

Contributions are welcome! Help us make this addon even better.

*   **Fork & Branch:** Create your own version to work on.
*   **Code Style:** Follow our [**Coding Style Guide**](Dev/CodingStyle.md).
*   **Test:** Ensure your changes are stable.
*   **Document:** Update relevant docs if needed.
*   **Pull Request:** Submit your changes for review.

➡️ For more on development, see [**Addon Development Resources**](Dev/README.md).

---

<p align="center">Thank you for using the AntiCheats Addon!</p>
