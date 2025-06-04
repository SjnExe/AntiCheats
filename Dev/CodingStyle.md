# Coding Style Guidelines

This document outlines coding style conventions to be followed for this project to ensure consistency and readability.

## Naming Conventions

### Configuration Variables (`AntiCheatsBP/scripts/config.js`)
*   Configuration variables exported from `config.js` should use **`camelCase`** (e.g., `exampleConfigValue`, `maxAllowedSpeed`).
*   This applies to all new and refactored configuration constants.

### General Variables
*   Local variables and function parameters should use **`camelCase`** (e.g., `let myVariable = ...; function doSomething(someParameter) {}`).

### Functions
*   Function names should use **`camelCase`** (e.g., `function myFunction() {}`).

### Classes (if any used in the future)
*   Class names should use **`PascalCase`** (e.g., `class MyClass {}`).

### Constants (outside of `config.js` exports)
*   If there are true, hardcoded, unchangeable constants defined within files (not meant for external configuration via `config.js`), they can use **`UPPER_SNAKE_CASE`** (e.g., `const MAX_RETRIES = 3;`). However, prefer values from `config.js` where possible.

## JSDoc
*   Use JSDoc comments for all functions, especially exported ones, detailing their purpose, parameters, and return values.
*   Use JSDoc typedefs for complex object structures (e.g., `PlayerAntiCheatData`) and consider placing these in a central `types.js` file in the future to avoid circular dependencies.

## General Formatting
*   Follow existing code formatting for indentation (e.g., 4 spaces), spacing, and brace style.
*   Aim for clarity and readability in code structure.
