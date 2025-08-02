# Minecraft Module Versioning Policy

**Important:** Before updating any `@minecraft/*` module versions in `AntiCheatsBP/manifest.json` (e.g., `@minecraft/server`, `@minecraft/server-ui`, `@minecraft/server-gametest`), you **MUST** adhere to the following strict policy:

1. **Check for User-Specified Versions:** The project owner may provide specific, tested versions they intend to use. Check the user's request or a designated file in the `Dev/` directory for these versions.
2. **Prioritize User Specifications:** If user-specified versions are found, they **MUST** be used.
3. **If No Specifications Are Found: DO NOT CHANGE THE VERSIONS.** Do not research, guess, or update to the "latest" version. The existing versions in `manifest.json` are considered the correct and stable versions unless explicitly told otherwise by the user. Researching versions has led to incorrect updates in the past.
4. **Document Changes:** If, and only if, you are instructed to change a version, you must clearly document the change and the reasoning in `Dev/tasks/completed.md`.

*This policy is strict to prevent incorrect module updates, which have caused issues in the past. Always default to using the existing, committed versions.*
