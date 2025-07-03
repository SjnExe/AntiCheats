## Documentation Update: Docs/ConfigurationGuide.md (Jules - Session Start: 2024-08-01)

**Objective:** Expand `Docs/ConfigurationGuide.md` to thoroughly cover the structure and customization of `actionProfiles.js` (for immediate cheat detection consequences) and `automodConfig.js` (for escalating automated moderation actions).

**Key Actions:**
*   Reviewed existing `Docs/ConfigurationGuide.md`, `actionProfiles.js`, `automodConfig.js`, and relevant parts of `config.js`.
*   Outlined new detailed sections for explaining `actionProfiles.js` and `automodConfig.js`.
    *   Covered file purpose, data structures (e.g., `checkActionProfiles`, `automodRules`, `automodPerCheckTypeToggles`).
    *   Detailed all relevant properties within these structures (e.g., `flag`, `notifyAdmins`, `log` for action profiles; `flagThreshold`, `actionType`, `parameters`, `resetFlagsAfterAction` for AutoMod rules).
    *   Emphasized `camelCase` conventions for `checkType` and `actionType` identifiers.
    *   Included explanations of placeholder usage in message templates.
    *   Provided examples of how to customize these configurations.
    *   Added important notes and best practices for users editing these files.
*   Drafted and integrated the new sections into `Docs/ConfigurationGuide.md`.
*   Clarified the interaction flow between detections, action profiles, and the AutoMod system.

**Status:**
*   [x] Review of relevant documentation and configuration files complete.
*   [x] Outline for new sections created.
*   [x] Drafting and revision of `Docs/ConfigurationGuide.md` with new sections complete.
*   [ ] Task management files update (this step).
*   [ ] Final submission.
