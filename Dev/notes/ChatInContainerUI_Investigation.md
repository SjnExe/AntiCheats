# Investigation: Detecting Open Container UI for Chat Check

**Date:** 2024-07-29

**Objective:** Determine if the `@minecraft/server` Script API (version 2.1.0-beta, corresponding to Minecraft 1.21.90-beta.26) can reliably detect if a player has a container UI (e.g., chest, furnace, enchanting table) open, for the purpose of preventing chat messages while such a UI is active.

## 1. APIs Reviewed & Findings

Based on a review of the `@minecraft/server` API documentation (version 2.1.0-beta as of Minecraft 1.21.90-beta.26):

*   **`Player.onScreenDisplay` (and `ScreenDisplay` class):**
    *   **Finding:** This class is focused on *sending* information to the player's screen (e.g., titles, action bars, HUD element visibility). It does not provide any methods or properties to *read* the current UI screen state of the player, such as what specific game UI or container they might have open.
    *   **Relevance:** Not suitable for detecting an open container UI.

*   **`PlayerInteractWithBlockAfterEvent` & `PlayerInteractWithBlockBeforeEvent`:**
    *   **Finding:** These events trigger when a player interacts with a block. They provide information about the player, the block interacted with, the item used, and the face of the block.
    *   **Relevance:** While these events signal an interaction that *might* open a container UI (if the block is a container), they do not confirm that a UI was actually opened, nor do they provide any state indicating an open UI. Many interactions (e.g., pressing a button, flipping a lever) also trigger these events without opening a full-screen UI.

*   **`Container` Class:**
    *   **Finding:** Represents an inventory (e.g., a chest's inventory, a player's inventory). It allows for manipulation and querying of `ItemStack`s within it.
    *   **Relevance:** Describes the contents of an inventory but provides no information about whether a player is currently viewing or interacting with that container's UI.

*   **`BlockInventoryComponent` (`minecraft:inventory`):**
    *   **Finding:** A component found on blocks that have inventories. It primarily provides access to the block's `Container`.
    *   **Relevance:** Similar to the `Container` class, it allows access to the inventory contents but does not indicate if a player has the UI for this inventory open.

*   **`PlayerCursorInventoryComponent` (`minecraft:cursor_inventory`):**
    *   **Finding:** This component represents the item a player is holding on their cursor within an inventory UI. If `player.getComponent('minecraft:cursor_inventory').item` is not undefined, it implies an inventory UI is open and the player is using cursor-based controls.
    *   **Limitation:** The documentation explicitly states: "Not used with touch controls."
    *   **Relevance:** This is the closest API to detecting an open inventory UI. However, its explicit exclusion of touch controls makes it unreliable for a universal check, as a significant portion of players use touch. It also doesn't specify *which* container is open, only that *an* inventory UI enabling cursor item manipulation is active.

*   **`Player` Class Properties:**
    *   **Finding:** Properties like `isEmoting`, `isFlying`, `isGliding`, `isJumping` describe player states but none relate to UI interaction. There is no property like `Player.currentOpenContainerId` or `Player.isViewingScreen`.
    *   **Relevance:** No direct player property found to indicate an open UI.

*   **Specific Container Open/Close Events:**
    *   **Finding:** The API documentation does not list any specific events like `playerOpenContainerAfterEvent` or `playerCloseContainerAfterEvent`.
    *   **Relevance:** The absence of such events means we cannot directly track the opening and closing of container UIs.

## 2. Potential Approaches & Reliability Assessment

*   **Using `PlayerCursorInventoryComponent`:**
    *   **Approach:** Check if `player.getComponent('minecraft:cursor_inventory').item` is defined.
    *   **Reliability:** Low. Fails for touch control users. Does not identify the specific container.

*   **Using `PlayerInteractWithBlockAfterEvent` (Speculative & Unreliable):**
    *   **Approach:**
        1. Listen to `PlayerInteractWithBlockAfterEvent`.
        2. If the interacted block is a known container type (e.g., `minecraft:chest`), assume a UI is now open for that player and block.
        3. Try to determine when it closes. This is the major problem, as there's no "close container" event.
            *   Could assume closure if the player moves a certain distance from the block. (Highly unreliable due to server lag, player movement patterns, interaction range).
            *   Could assume closure if the player interacts with another block or entity. (Unreliable, player might just look away).
            *   Could assume closure after a timeout. (Arbitrary and error-prone).
    *   **Reliability:** Very Low / Not Feasible. The inability to reliably detect UI closure makes this approach impractical. Many non-UI interactions also trigger this event.

## 3. Feasibility Assessment

**Overall Feasibility: Low / Not Feasible with Current API (as of `@minecraft/server` 2.1.0-beta)**

**Reasoning:**

1.  **No Direct UI State Detection:** The API does not provide a direct way to query what UI screen a player currently has open, or if they have a container UI open specifically.
2.  **Lack of Container Open/Close Events:** Without explicit events for when a player opens or closes a container UI, it's impossible to reliably track this state.
3.  **Unreliability of Proxies:**
    *   `PlayerInteractWithBlockAfterEvent` only indicates interaction, not necessarily UI opening.
    *   `PlayerCursorInventoryComponent` is not supported for touch controls, making it an incomplete solution.
4.  **Complexity of Container Types:** The sheer number of blocks that open UIs (chests, furnaces, enchanting tables, anvils, villager trading, etc.) would require extensive and potentially fragile logic to manage based on interaction events alone, even if open/close events existed.

## 4. Conclusion for Chat Check

Implementing a reliable server-side check to prevent players from chatting while a container UI is open is **not feasible** with the current `@minecraft/server` API (version 2.1.0-beta). The necessary information about the player's current UI state is not exposed by the API in a way that is consistent across all input methods or provides definitive open/close states for container UIs.

Any attempt based on current events would likely be plagued by false positives (blocking chat when no UI is open) or false negatives (allowing chat when a UI is open), especially for touch control users.
