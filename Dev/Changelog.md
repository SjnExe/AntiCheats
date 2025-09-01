# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.6.0] - 2025-08-31

### Documentation
- **Comprehensive Review:** Conducted a full review of all user-facing documentation to ensure accuracy, consistency, and clarity.
- **Added Command Docs:** Added documentation for previously undocumented commands: `!admin`, `!payconfirm`, and `!tpastatus`.
- **Clarified TPA Commands:** Clarified the distinction between `!tpadeny` and `!tpacancel` for better user understanding.
- **Added Feature Docs:** Added documentation for major features that were not previously mentioned:
  - Player welcome messages (`playerInfo.welcomeMessage`).
  - Automatic death coordinate messages (`playerInfo.enableDeathCoords`).
  - Configurable sound events for TPA, admin notifications, and more (`soundEvents`).
- **Improved Feature Descriptions:**
  - Updated the `!rules` command description to reflect its configuration from an array.
  - Clarified that the `!panel` (`!ui`) item is craftable by all players and that its content is dynamic based on permissions.
- **Consistency Pass:** Ensured information in `README.md`, `Docs/Commands.md`, and `Docs/FeaturesOverview.md` is consistent.

## [v1.5.3] - 2025-08-31

### Features
- **Automatic Rank Updates:** Player ranks are now updated automatically and immediately when their tags change. This provides a seamless experience for promoting new admins without requiring server restarts or manual reload commands.

### Changed
- **Manifest Metadata:** The `name` and `description` fields in the addon's manifest files have been updated with a new color scheme and more informative text for better in-game clarity.

### Fixed
- **Stability:** Fixed a critical server crash that occurred on some Minecraft versions due to an unsupported API. The rank update system now uses a stable, timer-based approach.

### Documentation
- **Admin Promotion:** The F.A.Q. has been updated to reflect the new, simpler, automatic process for promoting admins.

## [v1.5.2] - 2025-08-31

### Added
- **Owner Name Reload:** Added a `!reload` command that allows server operators to apply changes to the `ownerPlayerNames` in `config.js` after a server restart.
- **Admin Function:** Added a `/function admin` command that allows a player with function permissions to easily grant themselves the Admin rank via the `admin` tag.

### Changed
- **Command Permissions:** The following commands have been changed from Owner-only to Admin-level, making them more accessible to server administrators:
  - `!debug`
  - `!rank`
  - `!setbalance`
  - `!clearreports`
- **Reload Optimization:** The `!reload` command is now highly optimized and only re-evaluates the rank for players affected by an owner name change, instead of all online players.

## [v1.5.0] - 2025-08-30

### Added
- **Teleportation Warmups:**
  - The `!spawn` command now has a configurable warmup period. Teleportation will be canceled if the player moves during the warmup.
  - The TPA system was confirmed to already have a similar warmup and movement-cancellation feature.
- **Teleportation Cooldowns:**
  - The `!spawn` command now has a configurable cooldown to prevent abuse.

### Changed
- **Bounty System:**
  - The Bounty List UI panel now correctly displays all active bounties.
  - The `!lbounty` command now shows bounties for all players (online and offline), not just those who are online.
- **Sorting:**
  - The Bounty List UI panel is now sorted from highest to lowest bounty.
  - The `!lbounty` command output is now sorted from highest to lowest bounty.
- **Configuration:**
  - The default cooldown for the `!spawn` command has been set to 60 seconds.
  - Debug mode is now disabled by default in the configuration file.
  - The default owner name has been set to a placeholder (`Your•Name•Here`) for new setups.

### Fixed
- **Bounty List Panel:**
  - Fixed a critical bug where the Bounty List panel was empty and would not display any information.
- **Scripting Stability:**
  - Resolved a syntax error that could cause the addon to fail on load, related to a duplicate function definition in the UI manager.
