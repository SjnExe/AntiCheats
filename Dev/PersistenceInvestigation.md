# Player Data Persistence Investigation

This document outlines the investigation into methods for persisting player data (`pData`) for the AntiCheats addon, ensuring that player flags and other relevant information are not lost on server restart or player rejoin.

## Researched Mechanisms

Two primary mechanisms within the `@minecraft/server` API were investigated:

### 1. Scoreboard Objectives (`world.scoreboard`)

*   **Description:** Allows creating objectives to track numerical scores for entities (including players via `player.scoreboardIdentity`).
*   **Persistence:** Scoreboard data is automatically saved with the world and persists across server restarts.
*   **Data Type:** Stores 32-bit integer numerical values.
*   **Pros:**
    *   Good for simple numerical counters (e.g., individual flag counts).
    *   Scores can be easily viewed or modified via in-game commands by admins (though script interaction is primary).
    *   Potentially efficient for very frequent updates of individual numbers.
*   **Cons:**
    *   Limited to numerical data. Strings, booleans (natively), arrays, or complex objects require workarounds or cannot be stored directly.
    *   Managing a large number of objectives for complex data can be cumbersome (objective name limits, display name limits).
    *   Reconstructing a complex `pData` object requires multiple scoreboard reads.

### 2. Dynamic Properties (on `Entity` and `World` objects)

*   **Description:** Allows attaching custom data to entities or the world itself. Accessed via methods like `entity.getDynamicProperty(id)`, `entity.setDynamicProperty(id, value)`, `world.getDynamicProperty(id)`, etc.
*   **Persistence:** Dynamic properties are automatically saved with the world and persist across server restarts. `Entity.id` is a persistent identifier for entities.
*   **Data Types:** Can store `boolean`, `number`, `string`, and `Vector3`.
*   **Key Feature:** Strings can be used to store serialized JSON, allowing for the storage of complex objects and arrays.
*   **Pros:**
    *   Highly flexible, especially when using JSON stringification for complex data structures (nested objects, arrays of mixed types).
    *   Can store most, if not all, of the `pData` structure in one or a few properties.
    *   `Entity.id` provides a stable way to link data to players across sessions.
*   **Cons:**
    *   JSON serialization and deserialization have performance overhead, especially for frequent read/writes of large objects.
    *   There are limits on the total byte size of dynamic properties for an entity/world, and on the length of string properties. These limits are not always explicitly documented and may require careful management to avoid exceeding them (e.g., `getDynamicPropertyTotalByteCount()` can help monitor usage).
    *   Modifying a single field within a JSON-stored object requires reading the string, parsing, modifying, re-serializing, and writing the entire string back.

## Potential Approaches for `pData` Persistence

### Approach 1: Primarily Entity Dynamic Properties (with JSON Stringification)

*   **Storage:**
    *   A significant portion of `pData` (including `pData.flags` object, `pData.isWatched`, timestamps, event lists like `blockBreakEvents`) would be serialized into a single JSON string.
    *   This JSON string stored under one dynamic property on the `Player` entity (e.g., `anticheat:pdata_json`).
*   **Loading (on `playerJoin`):**
    *   Retrieve the JSON string from the player's dynamic property.
    *   Parse it to reconstruct the `pData` object in the runtime `playerData` map.
    *   Initialize with defaults if no property is found (new player).
*   **Saving:**
    *   On any change to the persisted parts of `pData`, re-serialize the entire `pData` object and save it to the dynamic property.
    *   Also, save on `playerLeave`.
*   **Pros:** Simplicity in managing one main data blob; handles complex data well.
*   **Cons:** Overhead of serializing/deserializing the entire object even for minor changes; potential concerns if the JSON string becomes excessively large.

### Approach 2: Hybrid - Dynamic Properties (JSON) + Selective Scoreboards

*   **Storage:**
    *   **Dynamic Properties (JSON):** Store most of `pData` (complex objects, arrays, non-numeric flags, timestamps that don't need direct scoreboard visibility) as a JSON string in an entity dynamic property (e.g., `anticheat:pdata_core_json`).
    *   **Scoreboards:** Use individual scoreboard objectives for highly critical, frequently updated, or admin-visible simple numerical counters (e.g., `ac_totalFlags`, `ac_flyFlags`).
    *   **Individual Dynamic Properties:** Simple booleans like `pData.isWatched` could be a separate boolean dynamic property for quick access if preferred over including in the main JSON.
*   **Loading/Saving:** Similar to Approach 1, but involves operations on both dynamic properties and selected scoreboard objectives.
*   **Pros:** Balances flexibility of JSON with potential efficiency/visibility of scoreboards for specific counters.
*   **Cons:** More complex to manage data spread across two systems.

## Recommendation

**Start with Approach 1 (Entity Dynamic Properties with a single JSON string for most of `pData`).**
This approach is the most straightforward for handling the existing complexity of `pData`. Performance and data size should be monitored. If specific numerical parts of `pData` later prove to be a bottleneck or require direct scoreboard visibility for admins, elements from Approach 2 (selective scoreboards) can be integrated.

Key considerations for implementation:
*   Define clear, namespaced dynamic property identifiers (e.g., `anticheat:player_data`).
*   Handle potential errors during JSON parsing (e.g., corrupted data).
*   Ensure data is loaded on `playerJoin` before any anti-cheat checks might rely on it.
*   Ensure data is saved reliably, especially on `playerLeave` and potentially periodically or on significant changes.
*   Be mindful of the overall size of the JSON string stored in the dynamic property.

This investigation provides a foundation for implementing data persistence. The next step would be to create a detailed plan for the actual implementation based on the recommended approach.
