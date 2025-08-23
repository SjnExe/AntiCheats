# Troubleshooting Guide - AntiCheats Addon

This guide helps you resolve common issues you might encounter with the AntiCheats Addon. If your issue isn't listed here, or the steps don't help, please consider [reporting an issue](https://github.com/SjnExe/AntiCheats/issues) with as much detail as possible.

---

## Table of Contents

1. [Installation Issues](#1-installation-issues)
2. [Configuration Problems](#2-configuration-problems)
3. [Commands Not Working](#3-commands-not-working)
4. [Detections Not Working or False Positives](#4-detections-not-working-or-false-positives)
5. [Admin UI (`!panel`) Issues](#5-admin-ui-panel-issues)
6. [General Tips](#6-general-tips)
7. [Reporting Bugs Effectively](#7-reporting-bugs-effectively)

---

## 1. Installation Issues

**Problem: AntiCheat doesn't seem to be working at all.**

- **Behavior Pack Order:** Ensure `AntiCheatsBP` is at the **VERY TOP** of your Behavior Pack list in your world settings. This is the most common cause of issues.
- **Resource Pack Applied:** Make sure `AntiCheatsRP` is also applied in the Resource Pack section of your world settings.
- **Correct Files:** Double-check you've downloaded the latest `.mcaddon` file from the official [GitHub Releases](https://github.com/SjnExe/AntiCheats/releases) and applied both packs from it.
- **Experimental Gameplay (If Required):** While this addon aims to use stable APIs, future or specific beta features might temporarily rely on certain experimental toggles. The addon's manifest (`manifest.json`) usually handles dependencies, but check the main `README.md` or release notes for any specific requirements for the version you are using. Currently, "Beta APIs" experiment must be enabled.

**Problem: World fails to load or crashes on load after adding the addon.**

- **Pack Order:** Again, verify `AntiCheatsBP` is at the top.
- **Corrupted Download:** Try re-downloading and reapplying the addon.
- **Addon Conflict:** See [General Tips](#6-general-tips) for testing addon conflicts.

---

## 2. Configuration Problems

**Problem: I'm not recognized as the Owner, or I can't use owner commands.**

- **`ownerPlayerName` in `config.js`:**
  - This is **CRITICAL**. Open `AntiCheatsBP/scripts/config.js`. (You may need to extract the `.mcaddon` file, which is a zip archive, to access its contents if you're editing it manually before applying to your world).
  - Ensure `ownerPlayerName` is set to your **exact** in-game Minecraft name. It is **case-sensitive**.
  - If you changed it while the addon was already in your world, you might need to fully restart your Minecraft client or server.
- **Multiple Owners:** The `ownerPlayerName` field in `config.js` is intended for a single primary owner name. For multiple admins, use the in-game rank system (`!addranks`, `!setrank`).

**Problem: Changes I made to `config.js` aren't taking effect.**

- **Editing Correct File:** Ensure you are editing the `config.js` within the `AntiCheatsBP` (Behavior Pack) and not a stray copy.
- **Re-Applying Packs:** If you edit `config.js` *after* the pack is already applied to a world, Minecraft might not always pick up the changes immediately. The most reliable way is to:
  1. Remove `AntiCheatsBP` and `AntiCheatsRP` from your world.
  2. Make your changes to `config.js` in your source/downloaded pack.
  3. Re-import the modified `.mcaddon` or re-apply the modified packs to your world.
- **Server vs. Local:** If on a server, ensure the server has fully restarted after updating the pack files.

---

## 3. Commands Not Working

**Problem: Commands like `!help` or `!panel` do nothing.**

- **Installation:** Double-check the [Installation Issues](#1-installation-issues) section. If the addon isn't running, commands won't work.
- **Command Prefix:** The default command prefix is `!`. This can be changed in `AntiCheatsBP/scripts/config.js` (`commandPrefix`). If you've changed it, use your custom prefix.
- **Permissions:**
  - Basic commands like `!help` should be available to everyone by default.
  - Admin commands (like `!kick`, `!ban`, `!panel`) require appropriate permissions. Ensure you are set as the Owner (see [Configuration Problems](#2-configuration-problems)) or have an Admin rank assigned via the Rank System.
- **Typos:** Ensure you're typing the command correctly. Use `!help` to see available commands.
- **Addon Fails to Load Commands:** If you see an error in the logs like `Failed to load commands`, it may indicate a syntax error in one of the command files. The addon will now attempt to log exactly which command file is causing the failure. Check the logs for a more specific error message to help pinpoint the problematic file.

---

## 4. Detections Not Working or False Positives

**Problem: A specific cheat detection isn't working (e.g., Fly, Speed).**

- **Enabled in Config/UI:** Many detections can be toggled on/off or have their sensitivity adjusted. Check `AntiCheatsBP/scripts/config.js` for master toggles (e.g., `enableFlyCheck`) and specific detection parameters (sensitivity, thresholds for the check to trigger a flag). The `!panel` (Settings section) may also allow adjusting some of these `config.js` values. For automated *responses* to these detections (like auto-kick/ban based on accumulated flags), configure the rules in `AntiCheatsBP/scripts/core/automodConfig.js`.
- **Sensitivity Levels:** If a check is enabled but not catching cheaters, its sensitivity or thresholds (primarily in `config.js`) might be too lenient for your needs. Adjust these settings carefully.
- **Addon Conflicts:** Another addon might be interfering with player data or events in a way that prevents the AntiCheat from working correctly. See [General Tips](#6-general-tips).
- **Minecraft Version Compatibility:** Ensure your addon version is compatible with your Minecraft version. Major Minecraft updates can sometimes break script functionalities.

**Problem: Players are being falsely flagged (false positives).**

- **Sensitivity Levels:** This is the most common cause. High server lag or certain player activities (e.g., using unique items from other addons, specific parkour moves) can sometimes trigger checks. Try slightly reducing the sensitivity or increasing the thresholds for the specific check causing issues (usually in `AntiCheatsBP/scripts/config.js` or adjustable via the `!panel` settings).
- **Lag:** Severe server lag can cause players' movements to appear erratic, potentially triggering movement checks.
- **Specific Scenarios:** Note down exactly what the player was doing when they were falsely flagged. This information is crucial for diagnosing and fixing the issue, or for adjusting configurations.
- **Report It:** If you can consistently reproduce a false positive and can't resolve it through configuration, please [report it as an issue](https://github.com/SjnExe/AntiCheats/issues).

---

## 5. Admin UI (`!panel`) Issues

**Problem: `!panel` (or `!ui`) command doesn't open the UI, or the UI is broken.**

- **Resource Pack:** The UI relies on `AntiCheatsRP`. Ensure it's applied and active.
- **Permissions:** You need to be Owner or have an Admin rank with UI permissions.
- **Scripting Errors:** If there are underlying scripting errors in the addon (possibly from a bad update or conflict), the UI might fail to load. This would usually show errors in the in-game content log if accessible.
- **Minecraft UI Bugs:** Rarely, Minecraft's UI rendering can have temporary glitches. Try closing and reopening the game or world.

---

## 6. General Tips

- **Restart:** Sometimes, simply restarting your Minecraft client, server, or world can resolve temporary glitches.
- **Check Minecraft Version:** Ensure your AntiCheats Addon version is designed for your current Minecraft Bedrock Edition version. Check the [GitHub Releases](https://github.com/SjnExe/AntiCheats/releases) page.
- **Test with No Other Addons:** To rule out addon conflicts, try running the AntiCheats Addon on a test world with *no other Behavior Packs or Resource Packs* applied. If it works fine, then another addon is likely causing the issue. You can then add your other addons back one by one to find the culprit.
- **Check for Updates:** Make sure you are using the latest version of the AntiCheats Addon.

---

## 7. Reporting Bugs Effectively

If you've tried these steps and are still facing issues, please help us by reporting the bug. The more information you provide, the faster we can help.

- **AntiCheat Addon Version:** Specify the version you are using (e.g., v1.2.0).
- **Minecraft Version:** Specify your Minecraft Bedrock version (e.g., 1.20.80).
- **Clear Description:** What is the problem? What did you expect to happen?
- **Steps to Reproduce:** Provide a clear, step-by-step list of actions to trigger the bug.
- **Screenshots/Videos:** Visual proof can be very helpful.
- **Relevant Configuration:** If the issue is related to a specific check or setting, share your relevant configuration from `config.js`, `automodConfig.js`, or UI settings.
- **Error Messages (If Any):** If you see any error messages on screen or in logs (like the Content Log viewer if you have access), please include them.
- **Other Addons:** List any other behavior packs you are using.

**Where to Report:** [GitHub Issues Page](https://github.com/SjnExe/AntiCheats/issues)

---

Thank you for using the AntiCheats Addon!
