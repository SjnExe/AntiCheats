# Minecraft Module Versioning Policy

**Important:** Before updating any `@minecraft/*` module versions in `AntiCheatsBP/manifest.json` (e.g., `@minecraft/server`, `@minecraft/server-ui`, `@minecraft/server-gametest`), please adhere to the following:

1.  **Check for User-Specified Versions:** The project owner may have specific, tested versions they intend to use. Look for a designated file or section within the `Dev/` directory that lists these required versions.
2.  **Prioritize User Specifications:** If user-specified versions are found, they take precedence over any automatically determined "latest" or "recommended" versions.
3.  **If No Specifications Found:** If no explicit versions are documented by the user in the `Dev/` folder, you may then proceed with careful research to determine appropriate versions. However, always confirm if this is the desired approach if there's any uncertainty.
4.  **Document Changes:** Clearly document any version changes made and the reasoning in `Dev/tasks/completed.md`.

*This note was added after an incident where module versions were updated incorrectly. Please ensure this guidance is followed to prevent similar issues.*
