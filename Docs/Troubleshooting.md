# Troubleshooting Guide - AddonExe

This guide helps you resolve common issues you might encounter with AddonExe. If your issue isn't listed here, or the steps don't help, please consider [reporting an issue](https://github.com/SjnExe/AddonExe/issues) with as much detail as possible.

---

## Table of Contents

1. [Installation Issues](#1-installation-issues)
2. [Configuration & Permission Problems](#2-configuration--permission-problems)
3. [Commands Not Working](#3-commands-not-working)
4. [Admin UI (`!panel`) Issues](#4-admin-ui-panel-issues)
5. [General Tips](#5-general-tips)
6. [Reporting Bugs Effectively](#6-reporting-bugs-effectively)

---

## 1. Installation Issues

**Problem: The addon doesn't seem to be working at all.**

- **Behavior Pack Order:** Ensure `AddonExeBP` is at the **VERY TOP** of your Behavior Pack list in your world settings. This is the most common cause of issues.
- **Resource Pack Applied:** Make sure `AddonExeRP` is also applied in the Resource Pack section of your world settings.
- **"Beta APIs" Enabled:** In your World Settings under "Experiments", ensure the **"Beta APIs"** toggle is turned ON. The addon will not work without it.
- **Correct Files:** Double-check you've downloaded the latest `.mcaddon` file from the official [GitHub Releases](https://github.com/SjnExe/AddonExe/releases) and applied both packs from it.

**Problem: World fails to load or crashes on load after adding AddonExe.**

- **Pack Order:** Again, verify `AddonExeBP` is at the top.
- **Corrupted Download:** Try re-downloading and reapplying the addon.
- **Addon Conflict:** See [General Tips](#5-general-tips) for testing addon conflicts.

---

## 2. Configuration & Permission Problems

**Problem: I'm not recognized as the Owner, or I can't use owner commands.**

This is the most common setup issue. Follow these steps carefully:
1.  **Open the correct file:** `AddonExeBP/scripts/config.js`.
2.  **Find the `ownerPlayerNames` setting.**
3.  **Add your name:** Add your **exact**, case-sensitive in-game name to the array.
    ```javascript
    // Incorrect:
    // ownerPlayerNames: ['Your•Name•Here'],

    // Correct:
    ownerPlayerNames: ['PlaeyerName123'],
    ```
4.  **Save and re-apply:** If you edited the pack after it was applied to the world, you may need to remove the packs from the world and re-apply them for the changes to take effect.

**Problem: An admin player doesn't have their rank.**

- **Check the `adminTag`:** In `config.js`, verify the `adminTag` value (e.g., `"admin"`).
- **Apply the tag in-game:** Make sure you have given the player the correct tag using `/tag "PlayerName" add admin`.
- **Check for overrides:** The Owner rank will always override the Admin rank. Ensure the player is not also listed in the `ownerPlayerNames`.

**Problem: Changes I made to `config.js` aren't taking effect.**

- **Editing Correct File:** Ensure you are editing the `config.js` within the `AddonExeBP` (Behavior Pack) and not a stray copy.
- **Re-Applying Packs:** If you edit `config.js` *after* the pack is already applied to a world, Minecraft might not always pick up the changes immediately. The most reliable way is to:
  1. Remove `AddonExeBP` and `AddonExeRP` from your world.
  2. Make your changes to `config.js` in your source/downloaded pack.
  3. Re-import the modified `.mcaddon` or re-apply the modified packs to your world.
- **Server vs. Local:** If on a server, ensure the server has fully restarted after updating the pack files.

---

## 3. Commands Not Working

**Problem: Commands like `!help` or `!panel` do nothing.**

1.  **Check Installation:** First, double-check all steps in the [Installation Issues](#1-installation-issues) section. If the addon isn't running, commands won't work.
2.  **Check Command Prefix:** The default command prefix is `!`. This can be changed in `config.js` (`commandPrefix`). If you've changed it, use your custom prefix.
3.  **Check Permissions:**
    - Admin commands (like `!kick`, `!ban`) require appropriate permissions. Ensure you are set up correctly as an Owner or Admin. (See [Configuration & Permission Problems](#2-configuration--permission-problems)).
    - Use `!help` to see the commands available to your rank.
4.  **Check if Command is Disabled:** In `config.js`, there is a `commandSettings` section. Verify that the command you are trying to use is not set to `enabled: false`.
5.  **Check for Typos:** Ensure you're typing the command correctly.

---

## 4. Admin UI (`!panel`) Issues

**Problem: `!panel` (or `!ui`) command doesn't open the UI, or the UI is broken.**

- **Resource Pack:** The UI relies on `AddonExeRP`. Ensure it's applied and active.
- **Permissions:** You need to be Owner or have an Admin rank with UI permissions.
- **Scripting Errors:** If there are underlying scripting errors in the addon (possibly from a bad update or conflict), the UI might fail to load. This would usually show errors in the in-game content log if accessible.
- **Minecraft UI Bugs:** Rarely, Minecraft's UI rendering can have temporary glitches. Try closing and reopening the game or world.

> [!NOTE]
> **Cheat Detections Are a Future Feature**
> The cheat detection and auto-moderation systems from the original addon are not included in this version and are being re-developed. Any issues related to false positives or detections not working are not applicable to this version of the addon.

---

## 5. General Tips

- **Restart:** Sometimes, simply restarting your Minecraft client, server, or world can resolve temporary glitches.
- **Check Minecraft Version:** Ensure your AddonExe version is designed for your current Minecraft Bedrock Edition version. Check the [GitHub Releases](https://github.com/SjnExe/AddonExe/releases) page.
- **Test with No Other Addons:** To rule out addon conflicts, try running AddonExe on a test world with *no other Behavior Packs or Resource Packs* applied. If it works fine, then another addon is likely causing the issue. You can then add your other addons back one by one to find the culprit.
- **Check for Updates:** Make sure you are using the latest version of AddonExe.

---

## 6. Reporting Bugs Effectively

If you've tried these steps and are still facing issues, please help us by reporting the bug. The more information you provide, the faster we can help.

- **AddonExe Version:** Specify the version you are using (e.g., v1.2.0).
- **Minecraft Version:** Specify your Minecraft Bedrock version (e.g., 1.20.80).
- **Clear Description:** What is the problem? What did you expect to happen?
- **Steps to Reproduce:** Provide a clear, step-by-step list of actions to trigger the bug.
- **Screenshots/Videos:** Visual proof can be very helpful.
- **Relevant Configuration:** If the issue is related to a specific setting, share your relevant configuration from `config.js` or `ranksConfig.js`.
- **Error Messages (If Any):** If you see any error messages on screen or in logs (like the Content Log viewer if you have access), please include them.
- **Other Addons:** List any other behavior packs you are using.

**Where to Report:** [GitHub Issues Page](https://github.com/SjnExe/AddonExe/issues)

---

Thank you for using AddonExe!
