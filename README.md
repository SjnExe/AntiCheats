<div align="center">

# AntiCheats Addon for Minecraft BE

</div>

<div align="center">

[![Latest Release](https://img.shields.io/github/v/release/SjnExe/AntiCheats?label=latest%20version&display_name=tag&sort=semver&style=for-the-badge)](https://github.com/SjnExe/AntiCheats/releases/latest)
[![GitHub All Releases](https://img.shields.io/github/downloads/SjnExe/AntiCheats/total?style=for-the-badge)](https://github.com/SjnExe/AntiCheats/releases)
![Minecraft BE Version](https://img.shields.io/badge/Minecraft_BE-1.21.90%2B-brightgreen?style=for-the-badge&logo=minecraft)
[![GitHub Issues](https://img.shields.io/github/issues/SjnExe/AntiCheats?style=for-the-badge&logo=github)](https://github.com/SjnExe/AntiCheats/issues)
![Status: Under Development](https://img.shields.io/badge/Status-Under%20Development-orange?style=for-the-badge)
[![Discord Server](https://img.shields.io/discord/633296555650318346?style=for-the-badge&logo=discord&logoColor=white&label=Discord&color=7289DA)](https://discord.gg/SMUHUnGyyz)

</div>

> [!IMPORTANT]
> **CURRENT PROJECT STATUS: EXPERIMENTAL - USE WITH CAUTION**
>
> This AntiCheats Addon is currently **under active development** and should be considered **experimental**.
>
> **Please be aware:**
>
> - The addon may contain **significant bugs or errors**.
> - Functionality is subject to change and may be unstable.
> - **Not recommended for production servers** or public worlds at this stage.
>
> We appreciate your understanding and encourage testers to [report any issues on GitHub](https://github.com/SjnExe/AntiCheats/issues). Your feedback is vital for improvement!

---

<div align="center">

**The ultimate scripting-based Anti-Cheat solution for your Minecraft Bedrock Edition world!**
Designed to be robust, highly configurable, and packed with features to ensure fair and fun gameplay.

</div>

---

## ✨ Why Choose This AntiCheat?

- **Scripting Power:** Built entirely with the Minecraft Scripting API, offering flexibility and complex detection logic not always possible with traditional methods.
- **Comprehensive Detection:** A wide array of checks covering movement, combat, world interactions, and player exploits.
- **User-Friendly Tools:** Manage your server with ease using an intuitive in-game UI (`!panel`) and extensive text commands.
- **Highly Customizable:** Fine-tune almost every aspect, from detection sensitivity to automated actions, to perfectly suit your server's needs.
- **Active Development:** Continuously updated with new features, improvements, and compatibility for the latest Minecraft versions.
- **Open & Documented:** With clear documentation and an open codebase, understand how it works and even contribute!
- **Automatic Configuration Migration:** Your settings won't get lost! The addon automatically updates your configuration to be compatible with the latest version after an update.
- **Enhanced Stability:** Includes a watchdog handler to prevent script-related server crashes, ensuring a more stable experience.

---

## 🌟 Core Features at a Glance

This addon is packed with features to keep your server clean:

- 🛡️ **Comprehensive Cheat Detection Suite:**
  - **Movement:** Fly, Speed, NoFall, NoSlow, Invalid Sprint, Nether Roof exploits, and more.
  - **Combat:** Reach, Clicks Per Second (CPS), View Snapping (Aimbot utils), Multi-Target Aura, State Conflicts (e.g., attacking while eating).
  - **World Interaction:** Nuker, Illegal Item usage/placement, Fast Place/Use, AutoTool, InstaBreak, Anti-Grief (TNT, Fire, Lava, Wither, etc.), Building exploits (Tower, Scaffold).
  - **Player Behavior:** Anti-Gamemode Creative (AntiGMC), NameSpoof, Self-Hurt, Inventory Modifications.
  - **Chat:** Spam (fast message, max words, content repeat), Swear/Advertising filtering, CAPS/Symbol abuse, Unicode abuse, Impersonation.
- 🛠️ **Powerful Admin & Moderation Tools:**
  - Intuitive in-game UI (`!panel` or `!ui`) for player management, server settings, and log viewing.
  - Extensive text commands for all administrative functions.
- 💾 **Persistent Player Data Management:**
  - Flags, violation records, mutes, and bans are saved across player sessions using dynamic properties.
- ⚙️ **Highly Configurable System:**
  - Fine-tune detection sensitivity, toggle checks, and customize actions via `config.js`.
  - Detailed action profiles in `actionProfiles.js` to control immediate consequences of detections.
  - In-game UI settings for many common configurations.
- 🤖 **Automated Moderation (AutoMod):**
  - Define escalating punishments (warn, kick, mute, ban) based on accumulated flag counts for specific cheat types via `automodConfig.js`.
- 🗺️ **Dynamic World Border System:**
  - Per-dimension, resizable (square or circle) borders with visual cues and configurable damage for out-of-bounds players.
- 🏅 **Flexible Rank System:**
  - Define Owner, Admin, Member, and custom roles with specific permissions and visual chat/nametag prefixes via `ranksConfig.js`.
- 📞 **Teleport Request System (TPA/TPAHere):**
  - Allows players to request teleports to others or summon others, with configurable cooldowns and warmup periods.
- 📝 **Reporting System:**
  - Players can report others for violations, viewable by admins.

➡️ **Dive Deeper:** For a full list and details of all features, check out our [**Features Overview in the Docs**](Docs/FeaturesOverview.md)!

---

## 🚀 Quick Start & Setup

Get up and running in minutes!

1. **Download:** Grab the latest `.mcaddon` from [**GitHub Releases**](https://github.com/SjnExe/AntiCheats/releases).
2. **Install:** Apply both `AntiCheatsBP` (Behavior Pack) and `AntiCheatsRP` (Resource Pack) to your world.
3. **Enable Beta APIs (CRITICAL!):**
   - In your world settings, go to the "Experiments" section.
   - **Enable the "Beta APIs" toggle.** This addon relies on beta Minecraft Scripting API features (as specified in its `manifest.json`) and will not function correctly with all features without this setting enabled.
4. **Initialize the Addon (CRITICAL!):**
   - Once in your world, run the command `/function ac`.
   - This command initializes the addon, sets up necessary components, and must be run for the AntiCheat to work.
5. **Prioritize:** Ensure `AntiCheatsBP` is at the **TOP** of your behavior pack list. This is crucial for the AntiCheat to function correctly.
6. **👑 Set Owner (CRUCIAL!):**
   - Open `AntiCheatsBP/scripts/config.js`. (Note: `.mcaddon` files are zip archives; you may need to rename to `.zip` or use an archive tool to access the contents if editing manually.)
   - Set `ownerPlayerName` to your **exact** in-game name (case-sensitive). This grants you full control!
7. **🎮 Explore:** Join your world and type `!panel` (or `!ui`) to open the Admin UI.
8. **🔧 Configure (Optional but Recommended):**
   - Review other core settings (admin tag, command prefix, etc.) in `AntiCheatsBP/scripts/config.js`.
   - Explore the in-game settings panel (`!panel`) for more specific check configurations.
   - For detailed setup and advanced options, visit our [**Setup and Configuration Guide**](Docs/ConfigurationGuide.md).

<details>
<summary><strong>💡 Quick Troubleshooting Tips & Full Guide</strong></summary>

Common quick checks:

- **Enable "Beta APIs":** Make sure the "Beta APIs" experimental toggle is ON in your world settings. This addon requires it.
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

- 📜 [**Commands List**](Docs/Commands.md) - Every command for players and admins.
- 🛡️ [**AutoMod System**](Docs/AutoModDetails.md) - Setup and rules for automated moderation.
- 🗺️ [**World Border System**](Docs/WorldBorderDetails.md) - Full guide on using the world border.
- 🏅 [**Rank System**](Docs/RankSystem.md) - How to configure and use ranks.
- ✨ [**Full Features Overview**](Docs/FeaturesOverview.md) - A detailed breakdown of all addon features.
- ⚙️ [**Configuration Guide**](Docs/ConfigurationGuide.md) - In-depth look at `config.js` and other settings.

---

## Performance Considerations & Profiling

This addon is designed to be as lightweight as possible. However, like any complex system:

- The number of checks enabled and their sensitivity can influence server performance.
- Very high player counts on servers with limited resources might see a slight impact.

We recommend starting with default configurations and adjusting based on your server's specific needs and performance characteristics.

**Performance Profiling:**
To help identify potential bottlenecks, the addon includes a basic performance profiling feature.

- **Enable:** Set `enablePerformanceProfiling: true` in `AntiCheatsBP/scripts/config.js`.
- **Logging:** When enabled, aggregated performance data for the main tick loop, individual checks, and event handlers will be logged periodically to the server console/logs (via `playerUtils.debugLog` with a `PerformanceProfile` tag).
- **Usage:** This data can help developers pinpoint specific areas that might be consuming more resources than expected. It's recommended to only enable this for temporary debugging sessions, as continuous profiling can itself have a minor performance overhead.
- **Configuration:** The logging interval can be adjusted with `logPerformanceProfileIntervalTicks` in the config.

---

## 🤝 Contributing

Contributions are highly welcome and appreciated! Help us make this addon even better.

- **Fork & Branch:** Create your own fork and make changes in a dedicated branch.
- **Code Style:** Follow our 📄 [**Coding Style Guide**](Dev/CodingStyle.md).
- **Test Thoroughly:** Ensure your changes are stable and don't introduce new issues.
- **Document Changes:** Update relevant documentation in the `Docs` folder if you add or modify features.
- **Pull Request:** Submit your changes for review. Explain what you've changed and why.

Looking for a place to start? Check out our [**issues tab**](https://github.com/SjnExe/AntiCheats/issues) – we often tag issues that are great for new contributors (e.g., `good first issue` or `help wanted` when available).

➡️ For more on development processes and resources, see 📄 [**Addon Development Resources**](Dev/README.md).

---

## ❤️ Our Valued Contributors

This project is made possible by the community and all the developers who dedicate their time to contribute. We are incredibly grateful for every contribution, from reporting issues and suggesting new ideas to writing code and improving documentation.

➡️ You can see a list of code contributors on [**GitHub**](https://github.com/SjnExe/AntiCheats/graphs/contributors).

If you're interested in helping, please see our [**Contributing section above**](#-contributing) and the [**Addon Development Resources**](Dev/README.md)!

---

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
Thank you for using the AntiCheats Addon!
We hope it helps create a fairer and more enjoyable Minecraft experience for your community.

</div>
