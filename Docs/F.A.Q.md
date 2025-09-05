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

---

## How do I install AddonExe?

For the best experience, especially for server owners who need to configure the addon, we recommend a manual installation. This ensures you can easily access the configuration files.

1.  **Download the Addon:**
    -   Go to the [**GitHub Releases**](https://github.com/SjnExe/AddonExe/releases) page and download the latest `.mcaddon` file.

2.  **Extract the Packs:**
    -   Do **not** open the `.mcaddon` file directly. Instead, rename it to end in `.zip` (e.g., `AddonExe.mcaddon` -> `AddonExe.zip`).
    -   Unzip the file. You will find two folders inside: `AddonExeBP` (the Behavior Pack) and `AddonExeRP` (the Resource Pack).

3.  **Move the Packs to Minecraft:**
    -   You need to find your Minecraft's `com.mojang` folder. The location varies by device:
        -   **Windows:** `C:\\Users\\<YourUsername>\\AppData\\Local\\Packages\\Microsoft.MinecraftUWP_8wekyb3d8bbwe\\LocalState\\games\\com.mojang`
        -   **Android:** `/Android/data/com.mojang.minecraftpe/files/games/com.mojang/`
        -   **iOS:** The `On My iPad/iPhone/iPod > Minecraft > games > com.mojang` folder inside the Files app.
    -   Move the `AddonExeBP` folder into the `behavior_packs` folder.
    -   Move the `AddonExeRP` folder into the `resource_packs` folder.
    -   If these folders don't exist, you can create them.

4.  **Apply in Your World:**
    -   Open Minecraft and go to the settings of the world you want to add AddonExe to.
    -   Under "Behavior Packs", activate `AddonExeBP`.
    -   Under "Resource Packs", activate `AddonExeRP`.
    -   Make sure the Behavior Pack is at the **top** of the list to ensure it works correctly.

5.  **Enable Required Game Settings:**
    -   In your world settings, under the "Game" section, ensure **"Activate Cheats"** is turned ON.
    -   Under the "Experiments" section, toggle **"Beta APIs"** to ON.
    -   The addon will not work without these settings.

After these steps, the addon should be installed and ready to configure!

### For Bedrock Dedicated Server (BDS)

Installing on a Bedrock Dedicated Server is slightly different, as you manually manage the world files.

1.  **Place the Pack Folders:**
    -   After extracting the `AddonExeBP` and `AddonExeRP` folders, move them into your BDS's main directory.
    -   `AddonExeBP` goes into the `behavior_packs` folder.
    -   `AddonExeRP` goes into the `resource_packs` folder.

2.  **Activate the Packs:**
    -   In your BDS's root directory, you will find two files from the AddonExe release: `world_behavior_packs.json` and `world_resource_packs.json`.
    -   Copy both of these files into the root folder of your world (the same folder that contains your `level.dat`).
    -   The server will read these files on startup and automatically activate the required packs for that world.

3.  **Enable Beta APIs for BDS:**
    -   AddonExe requires the "Beta APIs" experimental feature to be enabled. This can be tricky on BDS. You have two main options:
        -   **Easy Method (Recommended):** Download your world folder from the server. Open the world in a local version of Minecraft (on PC or mobile), go into the world settings, and enable the "Beta APIs" toggle under "Experiments". Then, re-upload the modified world folder to your server.
        -   **Advanced Method:** Use an NBT editor (like [NBTStudio](https://github.com/tryashtar/nbt-studio)) to manually edit your world's `level.dat` file. You need to find the `experiments` tag and add a tag named `gametest` with a value of `1` (byte). This method is powerful but can corrupt your world if done incorrectly.
