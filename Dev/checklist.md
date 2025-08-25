# Addon Development Checklist

This file tracks features that have been discussed but not yet implemented. This can be used to maintain context between development sessions.

## 1. UI-Based Reporting System
- [x] **Player-side:** Add a "Report Player" button to one of the public-facing panels.
- [x] **Report Form:** This button should open a form where a player can type a reason for the report.
- [x] **Admin-side:** Create a "Report Management" panel for admins.
- [x] **Report List:** The panel should list all active reports.
- [x] **Report Actions:** Admins should be able to select a report to view details, assign it to themselves, resolve it, or clear it individually.
- [x] **Commands:** Re-implement the `!report`, `!reports`, and `!clearreports` commands to interact with this new UI system.

## 2. Ore Mining Notification System
- [ ] **Detection:** Create a system that detects when a player mines specific valuable ores (Diamond Ore, Deepslate Diamond Ore, Ancient Debris).
- [ ] **Admin Notification:** When detected, send a notification to online admins.
- [ ] **User Toggle:** Add a command (e.g., `!togglenotifs ore`) for admins to disable or enable these specific notifications for themselves, so they aren't spammed.

## 3. Dimension Lockdown Commands
- [ ] **`!endlock` command:** Create a command for admins to prevent players from entering the End dimension.
- [ ] **`!netherlock` command:** Create a command for admins to prevent players from entering the Nether dimension.
- [ ] **Mechanism:** This will likely involve checking a player's location when they change dimensions and teleporting them back if the corresponding lockdown is active.

## 5. Missing Player Management Panel Features
- [ ] **View Detailed Flags:** Add a button to show a player's specific anti-cheat violation counts.
- [ ] **Reset Player Flags:** Add a button to reset a player's flags to zero.
- [ ] **Toggle Watch:** Add a button to add/remove a player from a "watch list" for easier monitoring.

## 6. Other Missing Commands
- [ ] `inspect`: A text-based command to get detailed player information.
- [ ] `myflags`: A command for players to check their own flag count.
- [ ] `listranks`: A command to list all configured ranks.
- [ ] `listwatched`: A command to list all players on the watch list.
- [ ] `purgeflags`: A command to wipe a player's flag data.
- [ ] `worldborder`: A command/system to manage the world border.
