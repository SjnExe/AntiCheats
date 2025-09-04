# Frequently Asked Questions

## How do I change the Server Owner?

Changing the server owner is a two-step process that requires editing a file and then running a command in-game.

1.  **Edit the Config File:**
    -   Stop your server.
    -   Open the file `AddonExeBP/scripts/config.js`.
    -   Find the `ownerPlayerNames` array and replace the name(s) with the new owner's exact in-game name.
    -   Save the file and start your server.

2.  **Reload the Config In-Game:**
    -   Once the server is online, have an admin or operator run the command `/xreload`.
    -   This will sync the change from the file, and the new owner will receive their rank.

For more details, see the [Configuration Guide](ConfigurationGuide.md#1-set-the-server-owners).

---

## How do I make someone an admin?

There are a few ways to grant admin permissions, with different results:

*   **Recommended Method (Instant Permissions):** Use the in-game command if you are already an admin:
    *   `/admin add <target: player>`
    *   This will give the player the admin tag and update their permissions immediately.

*   **Operator Method (Instant Permissions):** If you have operator permissions but not the admin rank yet, you can grant it to yourself with:
    *   `/function admin`
    *   This will give you the admin tag and update your permissions immediately.

*   **Alternative Method (Delayed Permissions):** Use the vanilla `/tag` command:
    *   `/tag "<playerName>" add admin`
    *   **Important:** If you use this method on an online player, their permissions will **not** update until they rejoin the server.
