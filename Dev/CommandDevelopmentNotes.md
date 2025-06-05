# Command Development Conventions

This document outlines conventions to follow when developing new commands for the AntiCheat system.

## Command Prefixes
- Commands should be directly accessible via the configured `prefix` (e.g., `!`, as defined in `config.js`).
- The previous convention of using `!ac <command>` is deprecated. Commands should now be, for example, `!ban`, `!kick`, `!panel`.

## Command Naming
- Main command names should be descriptive and clear (e.g., `ban`, `kick`, `mute`, `inspect`).
- Avoid overly short or cryptic main command names. Aliases are preferred for brevity.

## Command Aliases
- Most new commands should consider having a short, convenient alias.
- Aliases are defined in `config.js` within the `COMMAND_ALIASES` object. This object maps alias strings to their corresponding main command names.
  - Example: `export const COMMAND_ALIASES = { "b": "ban", "k": "kick", "i": "inspect" };`
- The `commandManager.js` is responsible for checking if an entered command string is an alias and resolving it to the main command name before further processing.
- Aliases should be unique and not conflict with other aliases or main command names.
