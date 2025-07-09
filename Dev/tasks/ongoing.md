# Ongoing Development Tasks

This document lists tasks currently being worked on. When a task is completed, it should be moved to `Dev/tasks/completed.md`. If a task is paused or deferred, it should be moved back to `Dev/tasks/todo.md`.

- **(High) Linting: Fix syntax errors and improve linting configuration.** (Jules)
    - Ran ESLint, confirmed no initial errors with existing config.
    - Reviewed ESLint configuration against coding guidelines.
    - Improved ESLint configuration structure for clarity and to correctly apply rules to build scripts.
    - Ensured Node.js globals are defined for build scripts, resolving `no-undef` errors.
    - Added missing JSDoc `@file` overview to the build script.
    - Confirmed all scripts now pass the updated linting rules.
