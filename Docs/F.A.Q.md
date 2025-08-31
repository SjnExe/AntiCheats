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

If you have console access or are an operator in-game, you can grant a player the Admin rank. The Admin rank is assigned to any player who has the `admin` tag (this tag can be changed in `config.js`).

Simply give the player the `admin` tag. Their permissions will be granted **immediately**. There is no need to restart the server or use any `!reload` commands.

-   **From the Server Console:**
    ```
    /tag "PlayerName" add admin
    ```

-   **From In-Game (as an Operator):**
    ```
    /function admin
    ```
    (This command gives the `admin` tag to the player running it).

For more details, see the [Rank System Guide](RankSystem.md#set-server-admins-optional).
