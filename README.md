<p align="center">
  <!-- TODO: Add a cool project logo/banner here. Example: <img src="link_to_your_logo.png" alt="AntiCheats Addon Logo" width="200"/> -->
  <h1 align="center">AntiCheats Addon for Minecraft BE</h1>
</p>

<p align="center">
  <a href="https://github.com/SjnExe/AntiCheats/releases/latest"><img src="https://img.shields.io/github/v/release/SjnExe/AntiCheats?label=latest%20version&display_name=tag&sort=semver&style=for-the-badge" alt="Latest Release"/></a>
  <a href="https://github.com/SjnExe/AntiCheats/releases"><img src="https://img.shields.io/github/downloads/SjnExe/AntiCheats/total?style=for-the-badge" alt="GitHub All Releases"/></a>
  <img src="https://img.shields.io/badge/Minecraft_BE-1.21.90%2B-brightgreen?style=for-the-badge&logo=minecraft" alt="Minecraft BE Version"/>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License: MIT"/></a>
  <a href="https://github.com/SjnExe/AntiCheats/issues"><img src="https://img.shields.io/github/issues/SjnExe/AntiCheats?style=for-the-badge&logo=github" alt="GitHub Issues"/></a>
  <img src="https://img.shields.io/badge/Status-Active-green?style=for-the-badge" alt="Status: Active"/>
  <a href="https://discord.gg/SMUHUnGyyz"><img src="https://img.shields.io/discord/633296555650318346?style=for-the-badge&logo=discord&logoColor=white&label=Discord&color=7289DA" alt="Discord Server"/></a>
</p>

<p align="center">
  <strong>The ultimate scripting-based Anti-Cheat solution for your Minecraft Bedrock Edition world!</strong>
  <br />
  Designed to be robust, highly configurable, and packed with features to ensure fair and fun gameplay.
</p>

---

## ✨ Why Choose This AntiCheat?

*   **Scripting Power:** Built entirely with the Minecraft Scripting API, offering flexibility and complex detection logic not always possible with traditional methods.
*   **Comprehensive Detection:** A wide array of checks covering movement, combat, world interactions, and player exploits.
*   **User-Friendly Tools:** Manage your server with ease using an intuitive in-game UI (`!panel`) and extensive text commands.
*   **Highly Customizable:** Fine-tune almost every aspect, from detection sensitivity to automated actions, to perfectly suit your server's needs.
*   **Active Development:** Continuously updated with new features, improvements, and compatibility for the latest Minecraft versions.
*   **Open & Documented:** With clear documentation and an open codebase, understand how it works and even contribute!

---

## 🌟 Core Features at a Glance

This addon is packed with features to keep your server clean:

*   ⚔️ **Advanced Cheat Detections:** Movement (Fly, Speed, NoFall), Combat (Reach, CPS), World (Nuker, Illegal Items), Player (AntiGMC, NameSpoof), and much more.
    *   <!-- TODO: Placeholder for a GIF/Screenshot showcasing a cheat detection in action -->
*   🛠️ **Powerful Admin Tools:** Intuitive UI (`!panel`) & comprehensive text commands.
    *   <!-- TODO: Placeholder for a GIF/Screenshot of the !panel UI -->
*   💾 **Persistent Player Data:** Flags & violation records are saved across sessions.
*   ⚙️ **Highly Configurable:** Tailor detection sensitivity and actions to your server's needs via `config.js` and UI settings.
*   🤖 **AutoMod System:** Automated warnings, kicks, and bans based on configurable violation thresholds.
*   🗺️ **Dynamic World Border:** Per-dimension, resizable borders with visual cues & configurable damage.
    *   <!-- TODO: Placeholder for a GIF/Screenshot of the World Border visuals -->
*   🏅 **Rank System:** Define Owner, Admin, and Member roles with custom visual tags and permissions.

➡️ **Dive Deeper:** For a full list and details of all features, check out our [**Features Overview in the Docs**](Docs/FeaturesOverview.md)!

---

## 🚀 Quick Start & Setup

Get up and running in minutes!

1.  **Download:** Grab the latest `.mcaddon` from [**GitHub Releases**](https://github.com/SjnExe/AntiCheats/releases).
    *   <!-- Optional: Link to a video installation tutorial if one is created -->
    *   <!-- Example: [Watch Video Tutorial](your_video_link_here) -->
2.  **Install:** Apply both `AntiCheatsBP` (Behavior Pack) and `AntiCheatsRP` (Resource Pack) to your world.
3.  **Prioritize:** Ensure `AntiCheatsBP` is at the **TOP** of your behavior pack list. This is crucial for the AntiCheat to function correctly.
4.  **👑 Set Owner (CRUCIAL!):**
    *   Open `AntiCheatsBP/scripts/config.js`. (Note: `.mcaddon` files are zip archives; you may need to rename to `.zip` or use an archive tool to access the contents if editing manually.)
    *   Set `ownerPlayerName` to your **exact** in-game name (case-sensitive). This grants you full control!
5.  **🎮 Explore:** Join your world and type `!panel` (or `!ui`) to open the Admin UI.
6.  **🔧 Configure (Optional but Recommended):**
    *   Review other core settings (admin tag, command prefix, etc.) in `AntiCheatsBP/scripts/config.js`.
    *   Explore the in-game settings panel (`!panel`) for more specific check configurations.
    *   For detailed setup and advanced options, visit our [**Setup and Configuration Guide**](Docs/ConfigurationGuide.md).

<details>
<summary><strong>💡 Quick Troubleshooting Tips & Full Guide</strong></summary>

Common quick checks:
- Ensure `AntiCheatsBP` is at the very top of your behavior packs.
- Verify your `ownerPlayerName` in `config.js` is exact (case-sensitive).
- Check Minecraft version compatibility (see badge above).
- Test for conflicts with other addons, especially those modifying player behavior.

➡️ For a comprehensive guide, see our [**Troubleshooting Guide**](Docs/Troubleshooting.md).

If problems persist after checking the guide, please [report an issue](https://github.com/SjnExe/AntiCheats/issues)!
</details>

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

##  Performance Considerations

This addon is designed to be as lightweight as possible. However, like any complex system:
*   The number of checks enabled and their sensitivity can influence server performance.
*   Very high player counts on servers with limited resources might see a slight impact.
We recommend starting with default configurations and adjusting based on your server's specific needs and performance characteristics.

---

## 🤝 Contributing

Contributions are highly welcome and appreciated! Help us make this addon even better.

*   **Fork & Branch:** Create your own fork and make changes in a dedicated branch.
*   **Code Style:** Follow our [**Coding Style Guide**](Dev/CodingStyle.md).
*   **Test Thoroughly:** Ensure your changes are stable and don't introduce new issues.
*   **Document Changes:** Update relevant documentation in the `Docs` folder if you add or modify features.
*   **Pull Request:** Submit your changes for review. Explain what you've changed and why.

Looking for a place to start? Check out our [**issues tab**](https://github.com/SjnExe/AntiCheats/issues) – we often tag issues that are great for new contributors (e.g., `good first issue` or `help wanted` when available).

➡️ For more on development processes and resources, see [**Addon Development Resources**](Dev/README.md).

---

## ❤️ Our Valued Contributors

This project is made possible by the community and all the developers who dedicate their time to contribute. We are incredibly grateful for every contribution, from reporting issues and suggesting new ideas to writing code and improving documentation.

➡️ You can see a list of code contributors on [**GitHub**](https://github.com/SjnExe/AntiCheats/graphs/contributors).

If you're interested in helping, please see our [**Contributing section above**](#-contributing) and the [**Addon Development Resources**](Dev/README.md)!

---

<p align="center">Thank you for using the AntiCheats Addon!</p>
<p align="center">We hope it helps create a fairer and more enjoyable Minecraft experience for your community.</p>
