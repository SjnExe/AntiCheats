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
*   For any constants defined within files (not intended for external configuration via `config.js`), also use **`camelCase`** (e.g., `const maxRetries = 3;`). Avoid using `UPPER_SNAKE_CASE` to maintain consistency. If a value is truly global and fixed, it should ideally still be exposed via `config.js` using `camelCase`.

## JSDoc
*   Use JSDoc comments for all functions, especially exported ones, detailing their purpose, parameters, and return values.
*   Use JSDoc typedefs for complex object structures (e.g., `PlayerAntiCheatData`) and consider placing these in a central `types.js` file in the future to avoid circular dependencies.

## General Formatting
*   Follow existing code formatting for indentation (e.g., 4 spaces), spacing, and brace style.
*   Aim for clarity and readability in code structure.
