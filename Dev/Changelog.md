# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
