# Frequently Asked Questions

## How do I change the Server Owner?

Changing the server owner is a two-step process that requires editing a file and then running a command in-game.

1.  **Edit the Config File:**
    -   Stop your server.
    -   Open the file `AddonExeBP/scripts/config.js`.
    -   Find the `ownerPlayerNames` array and replace the name(s) with the new owner's exact in-game name.
    -   Save the file and start your server.

2.  **Reload the Config In-Game:**
    -   Once the server is online, have an admin or operator run the command `!reload`.
    -   This will sync the change from the file, and the new owner will receive their rank.

For more details, see the [Configuration Guide](ConfigurationGuide.md#1-set-the-server-owners).

---

## How do I make myself an Admin?

If you have console access or are an operator in-game, you can grant yourself or others the Admin rank. The Admin rank is assigned to any player who has the `admin` tag (this tag can be changed in `config.js`).

**Step 1: Assign the Admin Tag**

-   **From the Server Console:** The best way to make another player an admin is to use the tag command:
    ```
    /tag "PlayerName" add admin
    ```

-   **From In-Game:** If you have operator permissions, you can give yourself the Admin rank by running:
    ```
    /function admin
    ```
    You can also use the `/tag` command on yourself or others.

**Step 2: Update Your Rank In-Game**

After getting the `admin` tag, you need to tell the addon to update your rank. To do this, run the following command in-game:
```
/function reload
```
This will immediately update your permissions and give you access to all admin commands, without needing a server restart.

For more details, see the [Rank System Guide](RankSystem.md#set-server-admins-optional).
