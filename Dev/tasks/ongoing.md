# Ongoing Tasks

As of 2025-06-05

*   **Admin Command Implementation:**
    *   **`!invsee <playername>`**: Implement a command to allow admins to view a read-only representation of another player's inventory. This will involve using the `EntityInventoryComponent` to access the player's `Container`, then iterating through slots to get `ItemStack` details (typeId, amount, nameTag, lore, enchantments, durability). Output format (chat or UI) to be decided. (In Progress - API Investigation Complete)
*   **Documentation:**
    *   Update task files (`ongoing.md`, `completed.md`, `todo.md`) to accurately reflect current work and completions. (Not Started - will be done after command implementation)

*Implementation of `!warnings`, `!resetflags`, and `!clearwarnings` commands was completed on 2025-06-05 and details moved to `completed.md`.*
