# 🌍 Internationalization (i18n)

This addon is designed with internationalization (i18n) in mind, allowing UI elements and in-game messages to be displayed in different languages.

## Changing Language

The active language for the addon (locale) can typically be set via the `defaultLanguage` option in the main configuration file:
`AntiCheatsBP/scripts/config.js`

> [!NOTE]
> You may need to restart your server or reload the addon (if supported) for language changes to take full effect.

Example in `config.js`:
```javascript
export const defaultLanguage = "en_US"; // "en_US" for English (US), "es_ES" for Spanish (Spain), etc.
```

## Available Languages

As of the last update, the following languages have translation files available:
*   English (en_US)

> [!TIP]
> Language codes typically follow the ISO 639-1 standard for the language and ISO 3166-1 alpha-2 for the country code (e.g., "en_US" for English - United States, "es_ES" for Spanish - Spain, "de_DE" for German - Germany).

## Contributing Translations

We warmly welcome contributions for new languages or improvements to existing translations!

To contribute a new language:
1.  **Navigate** to the languages directory: `AntiCheatsBP/scripts/core/languages/`.
2.  **Copy** an existing language file (e.g., `en_US.js`) and rename it to your target language and country code (e.g., `fr_FR.js` for French - France).
3.  **Translate** the string values within your new language file. Please ensure the keys (variable names) remain unchanged.
    ```javascript
    // Example from en_US.js
    export const lang = {
        "core.prefix": "[AntiCheat]",
        "core.noperm": "You do not have permission to use this command.",
        // ... many more entries
    };

    // Example translation for es_ES.js (Spanish - Spain)
    // export const lang = {
    //     "core.prefix": "[AntiTrampas]",
    //     "core.noperm": "No tienes permiso para usar este comando.",
    //     // ...
    // };
    ```
4.  **Test** your translation in-game by setting it as the `defaultLanguage` in `config.js`.
5.  **Submit a Pull Request** with your new language file.

> [!IMPORTANT]
> When translating, only modify the string values (text within the quotes on the right side of the colon). Do not change the keys (e.g., `"core.noperm"`).

If you find issues with existing translations, please feel free to report them as an issue or submit a pull request with corrections.
