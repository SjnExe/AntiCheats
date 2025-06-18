# World Border System Details

The addon includes a powerful World Border system to define playable areas per dimension, preventing players from accessing unloaded or restricted parts of the map.

## Key Features

-   **Per-Dimension Borders:** Configure unique borders for the Overworld, Nether, and The End. Each dimension can have its own center, size, and shape.
-   **Shapes:** Supports:
    *   'square': Defined by a center coordinate (X, Z) and a half-size (effectively creating a `size` x `size` area).
    *   'circle': Defined by a center coordinate (X, Z) and a radius.
-   **Damage & Teleport:**
    *   Optionally configure damage to be applied to players who are outside the defined border. The damage amount and frequency can often be set in `config.js`.
    *   Players detected outside the border for a certain duration or under specific conditions can be automatically teleported to a safe location within the border or to a predefined spawn point.
-   **Visuals:**
    *   Display configurable particle effects to indicate border proximity or the border itself. This helps players visually understand the boundaries.
    *   Particle types and display frequency can typically be adjusted in `config.js`.
-   **Gradual Resize:**
    *   Administrators can issue commands to make the border shrink or expand gradually over a defined period. This is useful for events or to slowly restrict the playable area.
    *   The target size/radius and duration of the resize are specified in the command.
-   **Pause/Resume Resize:**
    *   Ongoing border resizes can be paused and later resumed. This provides flexibility during server events or maintenance.
-   **Admin Control:**
    *   All aspects of the World Border system are managed via the `!worldborder` command (alias `!wb`).
    *   Use `!wb help` (or `!panel` which includes World Border controls) to see detailed subcommand information for setting, querying, resizing, and managing borders in each dimension.
    *   Examples of subcommands often include `set`, `get`, `resize`, `pause`, `resume`, `reset`.

## Configuration and Data
-   **Default Settings:** Initial default settings for new borders (like particle types, damage defaults, default size/shape if not explicitly set) are typically found in `AntiCheatsBP/scripts/config.js`.
-   **Active Configuration:** The active border configurations for each dimension (center, size, shape, target size/time for resizes) are stored in world dynamic properties. This ensures they persist across server restarts.
-   The `!worldborder` commands directly modify these dynamic properties.
