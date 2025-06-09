# Device Ban Feasibility Investigation

## 1. Objective

To investigate the feasibility of implementing a reliable device ban system using only the `@minecraft/server` Script API. A device ban aims to prevent a user from accessing the server from a specific physical device, regardless of the game account used.

## 2. API Review and Analysis

The following player properties and API features were considered for their potential to provide or contribute to a unique device identifier:

*   **`player.id` (XUID/Persistent ID):**
    *   **Nature:** Unique identifier for a player's game account.
    *   **Suitability for Device Ban:** Identifies the account, not the device. A banned player could use a different account on the same device. This is suitable for account bans, not device bans.

*   **`player.name` / `player.nameTag` (Gamertag):**
    *   **Nature:** Display name of the player.
    *   **Suitability for Device Ban:** Not suitable. Can be changed and is not tied to a device.

*   **`player.clientSystemInfo`:**
    *   Provides details like `.os`, `.platformType`, `.maxRenderDistance`, `.memoryTier`, `.graphicsMode`.
    *   **Suitability for Device Ban:** This information is too generic. Many devices will share the same OS, platform type, and even hardware characteristics (memory tier, common render distances). It does not provide any unique hardware serial numbers or device-specific IDs.

*   **IP Address:**
    *   **Nature:** Network identifier for the client's connection.
    *   **Availability:** The `@minecraft/server` Script API **does not** provide access to player IP addresses, primarily for privacy reasons.
    *   **Suitability for Device Ban (Hypothetical):** Even if available, IP addresses are often dynamic, can be shared (NAT), or masked (VPNs), making them unreliable for uniquely identifying a specific device or even a persistent user.

*   **Dynamic Properties (`player.setDynamicProperty`, `player.getDynamicProperty`):**
    *   **Nature:** Allow storing persistent data associated with a player entity (i.e., their account).
    *   **Suitability for Device Ban:** Data is tied to the account. Cannot be used to identify a device independently of the account.

*   **Player Tags:**
    *   **Nature:** Custom tags stored on the player entity.
    *   **Suitability for Device Ban:** Tied to the account, not the device.

## 3. "Device Fingerprinting" Considerations

An attempt could theoretically be made to create a "fingerprint" by combining multiple pieces of information from `player.clientSystemInfo` (e.g., OS + Platform + Render Distance + Memory Tier).

*   **Challenges and Unreliability:**
    *   **Lack of Uniqueness:** Many common devices would still produce identical fingerprints.
    *   **High Risk of False Positives:** Banning such a fingerprint could easily affect innocent players using similar common hardware/software configurations.
    *   **Mutability:** Some parameters (like render distance or graphics settings) can be changed by the user, altering the fingerprint.
    *   **No Persistent Hardware ID:** This method does not access any underlying persistent hardware identifier.

## 4. External Mechanisms (Out of Scope for Script API)

True device banning often relies on:
*   Access to lower-level hardware identifiers (e.g., MAC address, hardware serials, advertising IDs), which the Script API does not expose.
*   Client-side software (e.g., dedicated anti-cheat clients) that can gather such information, which is not possible with server-side scripts alone.
*   Server platform capabilities beyond the Script API (e.g., advanced logging or plugins on some dedicated server software that might expose more connection details).

## 5. Conclusion

Implementing a reliable and fair **device ban** system using *only* the `@minecraft/server` Script API is **not currently feasible.**

The API lacks the necessary functions to retrieve unique, persistent device identifiers. Available information is either account-specific or too generic to reliably distinguish individual devices. Any attempt to create a device ban system with the current API would likely be ineffective or result in unfair bans of innocent players.

Account-based banning (using `player.id`) remains the primary method for restricting access for specific users.
