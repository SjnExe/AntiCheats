# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-23

### Added
- **New Commands:**
  - `!clear [player_name]`: Clears the inventory of the specified player, or your own if no player is provided.
  - `!ecwipe <player_name>`: Wipes the Ender Chest of the specified player.
  - `!invsee <player_name>`: View the inventory of an online player.
- **Player Management Panel:**
  - A comprehensive player management UI accessible via `!panel`.
  - Added a "Back" button for easier navigation in UI panels.
  - Player list is now sorted by permission level (Owner, Admin, Member) and then alphabetically by name.
  - Player names are now suffixed with `(You)`, `(Owner)`, or `(Admin)` for clarity.
  - Added action buttons to the player management screen for:
    - Kick, Ban, Mute, and Unmute players.
    - Freeze and Vanish players.
    - View and Clear player inventories.
    - Teleport to a player or teleport a player to you.
- **Audio Feedback:**
  - Added sound effects for UI interactions like opening panels and clicking buttons.
  - Added audio cues for the success or failure of moderation commands.
- **Build Process:**
  - Implemented a more robust command loader that provides specific error messages, identifying exactly which command file fails to load.

### Changed
- **Panel Item:**
  - The Admin Panel item is now classified as a "common" item.
  - The item now has a glint effect without being enchanted.
  - The item's lore (description) has been updated and is now visible.
- **Icons:**
  - Replaced several invalid or missing button icons in the UI with valid vanilla Minecraft textures.

### Fixed
- Corrected various script import errors that were causing the addon to fail to load.
- Resolved an issue where some UI buttons had invalid icon paths.
- Addressed multiple bugs related to the beta version of the `@minecraft/server` API.
