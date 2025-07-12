/**
 * @file Configuration Validator
 * @module AntiCheatsBP/scripts/core/configValidator
 * This file contains functions to validate the structure and values of configuration files
 * for the AntiCheat system. It helps prevent runtime errors due to misconfigurations.
 */

// --- Helper Functions ---

/**
 * Checks if a value is a string.
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is a string, false otherwise.
 */
function isString(value) {
    return typeof value === 'string';
}

/**
 * Checks if a value is a number.
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is a number, false otherwise.
 */
function isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
}

/**
 * Checks if a value is a boolean.
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is a boolean, false otherwise.
 */
function isBoolean(value) {
    return typeof value === 'boolean';
}

/**
 * Checks if a value is an array.
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is an array, false otherwise.
 */
function isArray(value) {
    return Array.isArray(value);
}

/**
 * Checks if a value is an object (and not an array or null).
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is an object, false otherwise.
 */
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks if a string is a valid Minecraft color code (e.g., §a, §0).
 * @param {string} colorCode - The string to check.
 * @returns {boolean} True if it's a valid color code.
 */
function isValidColorCode(colorCode) {
    return isString(colorCode) && /^§[0-9a-fk-or]$/.test(colorCode);
}

/**
 * Checks if a string is in camelCase.
 * Simple check: starts with lowercase, no spaces or underscores.
 * @param {string} str - The string to check.
 * @returns {boolean} True if it appears to be camelCase.
 */
function isValidCamelCase(str) {
    if (!isString(str) || str.length === 0) {
        return false;
    }
    return /^[a-z]+([A-Z][a-z0-9]*)*$/.test(str);
}

/**
 * Checks if a value is a positive number (greater than 0).
 * @param {*} num - The value to check.
 * @returns {boolean} True if it's a positive number.
 */
function isPositiveNumber(num) {
    return isNumber(num) && num > 0;
}

/**
 * Checks if a value is a non-negative number (0 or greater).
 * @param {*} num - The value to check.
 * @returns {boolean} True if it's a non-negative number.
 */
function isNonNegativeNumber(num) {
    return isNumber(num) && num >= 0;
}


/**
 * Checks if a string is a valid duration format (e.g., "5m", "1h", "30s").
 * This is a simplified check. Real parsing logic is in playerUtils.parseDuration.
 * @param {string} durationStr - The string to check.
 * @returns {boolean} True if it's a valid duration string format.
 */
function isValidDurationString(durationStr) {
    if (!isString(durationStr)) {
        return false;
    }
    return /^\d+[smhd]$/.test(durationStr) || /^\d+$/.test(durationStr); // simple check, assumes number only is seconds
}

/**
 * Ensures an object contains all specified required fields and optionally validates their types.
 * @param {object} obj - The object to check.
 * @param {Array<{name: string, type?: string | string[], validator?: Function, optional?: boolean, arrayElementType?: string, objectProperties?: any}>} fieldDefs - Array of field definitions.
 * @param {string} context - A string describing the context of the validation (e.g., "config.soundEvents").
 * @param {string[]} errors - An array to push error messages into.
 * @returns {boolean} True if all fields are valid, false otherwise.
 */
function ensureFields(obj, fieldDefs, context, errors) {
    if (!isObject(obj)) {
        errors.push(`${context}: Expected an object, but got ${typeof obj}.`);
        return false; // Indicate failure
    }

    let allFieldsValidOverall = true;

    for (const field of fieldDefs) {
        const value = obj[field.name];
        const fieldPath = `${context}.${field.name}`;
        let currentFieldInitialCheckPassed = true; // Tracks if the field itself (not sub-properties) is valid so far

        if (!Object.prototype.hasOwnProperty.call(obj, field.name)) {
            if (!field.optional) {
                errors.push(`${fieldPath}: Required field is missing.`);
                allFieldsValidOverall = false;
            }
            continue; // Next field
        }

        // Type checking
        if (field.type) {
            const expectedTypes = isArray(field.type) ? field.type : [field.type];
            let typeMatch = false;
            for (const type of expectedTypes) {
                switch (type) {
                    case 'string': if (isString(value)) {
                        typeMatch = true;
                    } break;
                    case 'number': if (isNumber(value)) {
                        typeMatch = true;
                    } break;
                    case 'boolean': if (isBoolean(value)) {
                        typeMatch = true;
                    } break;
                    case 'array': if (isArray(value)) {
                        typeMatch = true;
                    } break;
                    case 'object': if (isObject(value)) {
                        typeMatch = true;
                    } break;
                    case 'positiveNumber': if (isPositiveNumber(value)) {
                        typeMatch = true;
                    } break;
                    case 'nonNegativeNumber': if (isNonNegativeNumber(value)) {
                        typeMatch = true;
                    } break;
                    case 'durationString': if (isValidDurationString(value)) {
                        typeMatch = true;
                    } break;
                    case 'colorCode': if (isValidColorCode(value)) {
                        typeMatch = true;
                    } break;
                    case 'camelCaseString': if (isValidCamelCase(value)) {
                        typeMatch = true;
                    } break;
                    case 'any': typeMatch = true; break;
                    default:
                        errors.push(`${fieldPath}: Unknown expected type '${type}' in field definition.`);
                        allFieldsValidOverall = false; // Should not happen if defs are correct
                        break;
                }
                if (typeMatch) {
                    break;
                }
            }
            if (!typeMatch) {
                errors.push(`${fieldPath}: Invalid type. Expected ${expectedTypes.join(' or ')}, but got ${typeof value}.`);
                allFieldsValidOverall = false;
                currentFieldInitialCheckPassed = false;
            }
        }

        // Custom validator
        if (currentFieldInitialCheckPassed && field.validator) {
            if (!field.validator(value, fieldPath, errors)) {
                allFieldsValidOverall = false;
                // currentFieldInitialCheckPassed = false; // Validator might invalidate the field for further checks if needed
            }
        }

        // Array element type validation
        if (currentFieldInitialCheckPassed && field.type === 'array' && field.arrayElementType && isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                const element = value[i];
                const elementPath = `${fieldPath}[${i}]`;
                let elementMatch = false;
                switch (field.arrayElementType) {
                    case 'string': if (isString(element)) {
                        elementMatch = true;
                    } break;
                    case 'number': if (isNumber(element)) {
                        elementMatch = true;
                    } break;
                    case 'object': if (isObject(element)) {
                        elementMatch = true;
                    } break;
                    default:
                        errors.push(`${elementPath}: Unknown expected array element type '${field.arrayElementType}' in field definition.`);
                        allFieldsValidOverall = false; // Definition error
                        break;
                }
                if (!elementMatch) {
                    errors.push(`${elementPath}: Invalid array element type. Expected ${field.arrayElementType}, but got ${typeof element}.`);
                    allFieldsValidOverall = false;
                } else if (field.arrayElementType === 'object' && field.objectProperties) {
                    if (!ensureFields(element, field.objectProperties, elementPath, errors)) {
                        allFieldsValidOverall = false;
                    }
                }
            }
        }

        // Object properties validation (for nested objects)
        if (currentFieldInitialCheckPassed && field.type === 'object' && field.objectProperties && isObject(value)) {
            if (!ensureFields(value, field.objectProperties, fieldPath, errors)) {
                allFieldsValidOverall = false;
            }
        }
    }
    return allFieldsValidOverall;
}


// --- Main Config Validation (config.js) ---

/**
 * Validates the main configuration object (from config.js).
 * @param {object} config - The `defaultConfigSettings` object from `config.js`.
 * @param {object} actionProfiles - The `checkActionProfiles` object from `actionProfiles.js`.
 * @param {string[]} knownCommands - An array of known command names from `commandRegistry.js`.
 * @param {object} [commandAliasesMap] - Optional. The `commandAliases` object from `config.js`.
 * @returns {string[]} An array of error messages. Empty if no errors.
 */
export function validateMainConfig(config, actionProfiles, knownCommands, commandAliasesMap) {
    const errors = [];
    const context = 'config.defaultConfigSettings';

    if (!isObject(config)) {
        errors.push(`${context}: Expected an object, but got ${typeof config}.`);
        return errors; // Cannot proceed if the root is not an object
    }

    const actionProfileNames = Object.keys(actionProfiles || {});

    // Define field expectations for config properties
    // This is a partial list, expand as needed for full coverage.
    const configFieldDefs = [
        { name: 'adminTag', type: 'string' },
        { name: 'ownerPlayerName', type: 'string' },
        { name: 'enableDebugLogging', type: 'boolean' },
        { name: 'prefix', type: 'string' },
        { name: 'vanishedPlayerTag', type: 'string' },
        { name: 'frozenPlayerTag', type: 'string' },

        // Welcomer
        { name: 'enableWelcomerMessage', type: 'boolean' },
        { name: 'welcomeMessage', type: 'string' },
        { name: 'notifyAdminOnNewPlayerJoin', type: 'boolean' },
        { name: 'enableDeathCoordsMessage', type: 'boolean' },
        { name: 'deathCoordsMessage', type: 'string' },

        // Combat Log
        { name: 'enableCombatLogDetection', type: 'boolean' },
        { name: 'combatLogThresholdSeconds', type: 'positiveNumber' },
        { name: 'combatLogFlagIncrement', type: 'nonNegativeNumber' },
        { name: 'combatLogMessage', type: 'string' },

        // TPA System
        { name: 'enableTpaSystem', type: 'boolean' },
        { name: 'tpaRequestTimeoutSeconds', type: 'positiveNumber' },
        { name: 'tpaRequestCooldownSeconds', type: 'positiveNumber' },
        { name: 'tpaTeleportWarmupSeconds', type: 'positiveNumber' },
        { name: 'tpaCancelOnMoveDuringWarmup', type: 'boolean' },
        { name: 'tpaMovementTolerance', type: 'nonNegativeNumber' },

        // Server Info & Links
        { name: 'discordLink', type: 'string' },
        { name: 'websiteLink', type: 'string' },
        { name: 'helpLinks', type: 'array', arrayElementType: 'object', objectProperties: [
            { name: 'title', type: 'string' },
            { name: 'url', type: 'string' },
        ] },
        { name: 'generalHelpMessages', type: 'array', arrayElementType: 'string' },

        // Logging
        { name: 'enableDetailedJoinLeaveLogging', type: 'boolean' },

        // Chat Checks
        { name: 'enableSwearCheck', type: 'boolean' },
        { name: 'swearWordList', type: 'array', arrayElementType: 'string' },
        { name: 'swearCheckMuteDuration', type: 'durationString' },
        { name: 'swearCheckActionProfileName', type: 'string',
            /**
             * Validates that the action profile name exists.
             * @param {string} val - The value of the action profile name.
             * @param {string} path - The JSDoc path to the value being validated.
             * @param {string[]} errs - Array to push error messages to.
             * @returns {boolean} True if valid, false otherwise.
             */
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            } },
        { name: 'enableAntiAdvertisingCheck', type: 'boolean' },
        { name: 'antiAdvertisingPatterns', type: 'array', arrayElementType: 'string' },
        { name: 'antiAdvertisingActionProfileName', type: 'string',
            /**
             * Validates that the action profile name exists.
             * @param {string} val - The value of the action profile name.
             * @param {string} path - The JSDoc path to the value being validated.
             * @param {string[]} errs - Array to push error messages to.
             * @returns {boolean} True if valid, false otherwise.
             */
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            } },
        { name: 'enableAdvancedLinkDetection', type: 'boolean' },
        { name: 'advancedLinkRegexList', type: 'array', arrayElementType: 'string',
            /**
             * Validates regex patterns in an array.
             * @param {string[]} val - Array of regex strings.
             * @param {string} path - The JSDoc path to the array.
             * @param {string[]} errs - Array to push error messages to.
             * @returns {boolean} True (as errors are pushed directly).
             */
            validator: (val, path, errs) => {
                val.forEach((regex, index) => {
                    try {
                        RegExp(regex); // Changed from new RegExp(regex)
                    } catch (e) {
                        errs.push(`${path}[${index}]: Invalid regex pattern "${regex}": ${e.message}`);
                    }
                });
                return true; // Validator pushes errors directly
            } },
        { name: 'advertisingWhitelistPatterns', type: 'array', arrayElementType: 'string' }, // Could also be regex
        { name: 'enableCapsCheck', type: 'boolean' },
        { name: 'capsCheckMinLength', type: 'nonNegativeNumber' },
        { name: 'capsCheckUpperCasePercentage', type: 'number',
            /**
             * Validates a number is within a specific range (0-100).
             * @param {number} val - The number to validate.
             * @param {string} path - The JSDoc path to the value.
             * @param {string[]} errs - Array to push error messages to.
             * @returns {boolean} True if valid.
             */
            validator: (val, path, errs) => {
                if (val < 0 || val > 100) {
                    errs.push(`${path}: Must be between 0 and 100. Got ${val}.`);
                }
                return val >= 0 && val <= 100;
            } },
        { name: 'capsCheckActionProfileName', type: 'string',
            /**
             * Validates that the action profile name exists.
             * @param {string} val - The value of the action profile name.
             * @param {string} path - The JSDoc path to the value being validated.
             * @param {string[]} errs - Array to push error messages to.
             * @returns {boolean} True if valid, false otherwise.
             */
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            } },
        // ... (add more chat check fields)
        { name: 'charRepeatActionProfileName', type: 'string',
            /**
             * Validates that the action profile name exists.
             * @param {string} val - The value of the action profile name.
             * @param {string} path - The JSDoc path to the value being validated.
             * @param {string[]} errs - Array to push error messages to.
             * @returns {boolean} True if valid, false otherwise.
             */
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            } },
        { name: 'symbolSpamActionProfileName', type: 'string',
            /**
             * Validates that the action profile name exists.
             * @param {string} val - The value of the action profile name.
             * @param {string} path - The JSDoc path to the value being validated.
             * @param {string[]} errs - Array to push error messages to.
             * @returns {boolean} True if valid, false otherwise.
             */
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            } },
        { name: 'fastMessageSpamActionProfileName', type: 'string',
            /**
             * Validates that the action profile name exists.
             * @param {string} val - The value of the action profile name.
             * @param {string} path - The JSDoc path to the value being validated.
             * @param {string[]} errs - Array to push error messages to.
             * @returns {boolean} True if valid, false otherwise.
             */
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            } },
        { name: 'maxWordsSpamActionProfileName', type: 'string',
            /**
             * Validates that the action profile name exists.
             * @param {string} val - The value of the action profile name.
             * @param {string} path - The JSDoc path to the value being validated.
             * @param {string[]} errs - Array to push error messages to.
             * @returns {boolean} True if valid, false otherwise.
             */
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            } },
        { name: 'chatContentRepeatActionProfileName', type: 'string',
            /**
             * Validates that the action profile name exists.
             * @param {string} val - The value of the action profile name.
             * @param {string} path - The JSDoc path to the value being validated.
             * @param {string[]} errs - Array to push error messages to.
             * @returns {boolean} True if valid, false otherwise.
             */
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            } },
        { name: 'unicodeAbuseActionProfileName', type: 'string',
            /**
             * Validates that the action profile name exists.
             * @param {string} val - The value of the action profile name.
             * @param {string} path - The JSDoc path to the value being validated.
             * @param {string[]} errs - Array to push error messages to.
             * @returns {boolean} True if valid, false otherwise.
             */
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            } },
        { name: 'gibberishActionProfileName', type: 'string',
            /**
             * Validates that the action profile name exists.
             * @param {string} val - The value of the action profile name.
             * @param {string} path - The JSDoc path to the value being validated.
             * @param {string[]} errs - Array to push error messages to.
             * @returns {boolean} True if valid, false otherwise.
             */
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            } },
        { name: 'mentionsActionProfileName', type: 'string',
            /**
             * Validates that the action profile name exists.
             * @param {string} val - The value of the action profile name.
             * @param {string} path - The JSDoc path to the value being validated.
             * @param {string[]} errs - Array to push error messages to.
             * @returns {boolean} True if valid, false otherwise.
             */
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            } },
        { name: 'impersonationActionProfileName', type: 'string',
            /**
             * Validates that the action profile name exists.
             * @param {string} val - The value of the action profile name.
             * @param {string} path - The JSDoc path to the value being validated.
             * @param {string[]} errs - Array to push error messages to.
             * @returns {boolean} True if valid, false otherwise.
             */
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            } },


        // AntiGrief
        { name: 'enableTntAntiGrief', type: 'boolean' },
        { name: 'tntPlacementAction', type: 'string',
            /**
             * Validates the action string against a list of allowed values.
             * @param {string} val - The action string.
             * @param {string} path - The JSDoc path to the value.
             * @param {string[]} errs - Array to push error messages to.
             * @returns {boolean} True if valid.
             */
            validator: (val, path, errs) => {
                const valid = ['remove', 'warn', 'flagOnly'];
                if (!valid.includes(val)) {
                    errs.push(`${path}: Invalid action. Expected one of ${valid.join(', ')}. Got ${val}.`);
                }
                return valid.includes(val);
            } },
        // ... (add more AntiGrief fields)

        // Sound Events
        { name: 'soundEvents', type: 'object',
            /**
             * Validates the structure of the soundEvents object.
             * @param {object} soundEventsObj - The soundEvents object.
             * @param {string} sePath - The JSDoc path to this object.
             * @param {string[]} seErrs - Array to push error messages to.
             * @returns {boolean} True if all sound event definitions are valid.
             */
            validator: (soundEventsObj, sePath, seErrs) => {
                let overallSoundEventsValid = true;
                for (const eventName in soundEventsObj) {
                    if (!Object.prototype.hasOwnProperty.call(soundEventsObj, eventName)) {
                        continue;
                    }
                    const eventPath = `${sePath}.${eventName}`;
                    const eventDef = soundEventsObj[eventName];
                    const soundFieldDefs = [
                        { name: 'enabled', type: 'boolean' },
                        { name: 'soundId', type: 'string', optional: true }, // Can be empty for no sound
                        { name: 'volume', type: 'number', optional: true }, // Specific range check below
                        { name: 'pitch', type: 'number', optional: true },
                        { name: 'target', type: 'string', optional: true,
                            /**
                             * Validates the sound event target string.
                             * @param {string} val - The target string.
                             * @param {string} p - The JSDoc path to the value.
                             * @param {string[]} e - Array to push error messages to.
                             * @returns {boolean} True if valid.
                             */
                            validator: (val, p, e) => {
                                const validTargets = ['player', 'admin', 'targetPlayer', 'global'];
                                if (val && !validTargets.includes(val)) {
                                    e.push(`${p}: Invalid sound event target "${val}". Expected one of ${validTargets.join(', ')}.`);
                                    return false; // Indicate validation failure
                                }
                                return true; // Indicate validation success
                            } },
                        { name: 'description', type: 'string' },
                    ];

                    if (!ensureFields(eventDef, soundFieldDefs, eventPath, seErrs)) {
                        overallSoundEventsValid = false;
                    }

                    // Specific check for volume range, if volume is defined and is a number
                    if (eventDef.volume !== undefined && isNumber(eventDef.volume) && (eventDef.volume < 0 || eventDef.volume > 1.0)) {
                        seErrs.push(`${eventPath}.volume: Must be between 0.0 and 1.0. Got ${eventDef.volume}.`);
                        overallSoundEventsValid = false;
                    }
                }
                return overallSoundEventsValid;
            } },

        // Command Settings
        { name: 'commandSettings', type: 'object',
            /**
             * Validates the commandSettings object.
             * @param {object} cmdSettingsObj - The commandSettings object.
             * @param {string} csPath - The JSDoc path to this object.
             * @param {string[]} csErrs - Array to push error messages to.
             * @returns {boolean} True if all command settings are valid.
             */
            validator: (cmdSettingsObj, csPath, csErrs) => {
                let overallIsValid = true;
                for (const cmdName of Object.keys(cmdSettingsObj)) {
                    let currentCmdLocalValid = true;
                    if (!knownCommands.includes(cmdName)) {
                        csErrs.push(`${csPath}.${cmdName}: Unknown command "${cmdName}" listed in commandSettings.`);
                        currentCmdLocalValid = false;
                    }
                    const cmdDef = cmdSettingsObj[cmdName];
                    const cmdFieldDefs = [{ name: 'enabled', type: 'boolean' }];

                    const errorCountBeforeEnsureFields = csErrs.length;
                    ensureFields(cmdDef, cmdFieldDefs, `${csPath}.${cmdName}`, csErrs);
                    if (csErrs.length > errorCountBeforeEnsureFields) {
                        currentCmdLocalValid = false;
                    }

                    if (!currentCmdLocalValid) {
                        overallIsValid = false;
                    }
                }
                return overallIsValid;
            } },
        { name: 'chatClearLinesCount', type: 'positiveNumber' },
        { name: 'reportsViewPerPage', type: 'positiveNumber' },

        // AutoMod
        { name: 'enableAutoMod', type: 'boolean' },
        { name: 'manualMuteDefaultDuration', type: 'durationString' },

        // Server Rules
        { name: 'serverRules', type: 'string' },

        // General Check Toggles
        { name: 'enableReachCheck', type: 'boolean' },
        // ... (add all general check toggles)
    ];

    // Validate all defined fields in defaultConfigSettings
    ensureFields(config, configFieldDefs, context, errors);

    // Check for unknown keys in defaultConfigSettings
    const knownKeys = configFieldDefs.map(f => f.name);
    // Add keys that are objects/arrays and validated by custom validators but not simple types
    // This is a bit manual; ideally, ensureFields would build up all processed keys.
    const manuallyHandledKeys = ['soundEvents', 'commandSettings']; // Add more if complex objects are validated primarily by custom logic

    for (const key in config) {
        if (!Object.prototype.hasOwnProperty.call(config, key)) {
            continue;
        }
        if (!knownKeys.includes(key) && !manuallyHandledKeys.includes(key)) {
            // This check needs refinement if not all keys in config.js are covered by configFieldDefs
            // For now, we assume configFieldDefs will be comprehensive for primitive types.
            // Complex objects like soundEvents, commandSettings are handled by their specific validators.
            // errors.push(`${context}.${key}: Unknown configuration key found.`);
        }
    }


    // --- Validate commandAliases (not part of defaultConfigSettings but in config.js) ---
    // This needs to be passed in if `commandAliases` is exported directly and not part of the `defaultConfigSettings` object.
    if (commandAliasesMap) {
        if (isObject(commandAliasesMap)) {
            const aliasContext = 'config.commandAliases'; // Keep context string consistent with file structure
            for (const alias in commandAliasesMap) {
                if (!Object.prototype.hasOwnProperty.call(commandAliasesMap, alias)) {
                    continue;
                }
                const originalCommand = commandAliasesMap[alias];
                if (!isString(originalCommand)) {
                    errors.push(`${aliasContext}.${alias}: Original command name for alias must be a string. Got ${typeof originalCommand}.`);
                } else if (knownCommands && !knownCommands.includes(originalCommand)) { // Check knownCommands exists
                    errors.push(`${aliasContext}.${alias}: Alias maps to unknown command "${originalCommand}".`);
                } else if (!knownCommands) {
                    errors.push(`${aliasContext}.${alias}: Cannot validate alias target command "${originalCommand}" as knownCommands list was not provided.`);
                }
            }
        } else {
            errors.push(`config.commandAliases: Expected an object, but got ${typeof commandAliasesMap}.`);
        }
    }


    return errors;
}

// --- Action Profiles Validation (actionProfiles.js) ---

/**
 * Validates the checkActionProfiles object from actionProfiles.js.
 * @param {object} actionProfiles - The `checkActionProfiles` object.
 * @returns {string[]} An array of error messages. Empty if no errors.
 */
export function validateActionProfiles(actionProfiles) {
    const errors = [];
    const context = 'actionProfiles.checkActionProfiles';

    if (!isObject(actionProfiles)) {
        errors.push(`${context}: Expected an object, but got ${typeof actionProfiles}.`);
        return errors;
    }

    const validCustomActions = ['mutePlayer', 'teleportSafe']; // Add more as they are implemented

    for (const profileName in actionProfiles) {
        if (!Object.prototype.hasOwnProperty.call(actionProfiles, profileName)) {
            continue;
        }
        const profileContext = `${context}.${profileName}`;
        const profile = actionProfiles[profileName];

        if (!isValidCamelCase(profileName)) {
            errors.push(`${profileContext}: Profile name "${profileName}" should be in camelCase.`);
        }

        if (!isObject(profile)) {
            errors.push(`${profileContext}: Expected an object, but got ${typeof profile}.`);
            continue; // Skip further validation for this profile
        }

        const profileFieldDefs = [
            { name: 'enabled', type: 'boolean' },
            { name: 'flag', type: 'object', optional: true, objectProperties: [
                { name: 'increment', type: 'number' },
                { name: 'reason', type: 'string' },
                { name: 'type', type: 'camelCaseString' },
            ] },
            { name: 'notifyAdmins', type: 'object', optional: true, objectProperties: [
                { name: 'message', type: 'string' },
            ] },
            { name: 'log', type: 'object', optional: true, objectProperties: [
                { name: 'actionType', type: 'camelCaseString' },
                { name: 'detailsPrefix', type: 'string', optional: true }, // Made optional as not all logs might have it
                { name: 'includeViolationDetails', type: 'boolean', optional: true },
            ] },
            { name: 'cancelMessage', type: 'boolean', optional: true },
            { name: 'cancelEvent', type: 'boolean', optional: true },
            { name: 'customAction', type: 'string', optional: true,
                /**
                 * Validates the customAction string against a list of known custom actions.
                 * @param {string} val - The custom action string.
                 * @param {string} path - The JSDoc path to the value.
                 * @param {string[]} errs - Array to push error messages to.
                 * @returns {boolean} True if valid.
                 */
                validator: (val, path, errs) => {
                    if (!validCustomActions.includes(val)) {
                        errs.push(`${path}: Invalid customAction "${val}". Expected one of ${validCustomActions.join(', ')}.`);
                    }
                    return validCustomActions.includes(val);
                } },
        ];

        ensureFields(profile, profileFieldDefs, profileContext, errors);

        // Additional specific checks for flag object if it exists
        if (profile.flag) {
            if (!isObject(profile.flag)) {
                // This case should be caught by ensureFields's type check, but as a fallback:
                errors.push(`${profileContext}.flag: Expected an object, but got ${typeof profile.flag}.`);
            } else {
                if (!Object.prototype.hasOwnProperty.call(profile.flag, 'increment') || !isNumber(profile.flag.increment)) {
                    errors.push(`${profileContext}.flag.increment: Required field 'increment' is missing or not a number.`);
                }
                if (!Object.prototype.hasOwnProperty.call(profile.flag, 'reason') || !isString(profile.flag.reason)) {
                    errors.push(`${profileContext}.flag.reason: Required field 'reason' is missing or not a string.`);
                }
                if (!Object.prototype.hasOwnProperty.call(profile.flag, 'type') || !isValidCamelCase(profile.flag.type)) {
                    errors.push(`${profileContext}.flag.type: Required field 'type' is missing or not a camelCase string.`);
                }
            }
        }
        // Additional specific checks for log object if it exists
        if (profile.log) {
            if (!isObject(profile.log)) {
                errors.push(`${profileContext}.log: Expected an object, but got ${typeof profile.log}.`);
            } else {
                if (!Object.prototype.hasOwnProperty.call(profile.log, 'actionType') || !isValidCamelCase(profile.log.actionType)) {
                    errors.push(`${profileContext}.log.actionType: Required field 'actionType' is missing or not a camelCase string.`);
                }
            }
        }
    }
    return errors;
}

// --- AutoMod Config Validation (automodConfig.js) ---

/**
 * Validates the automodConfig object.
 * @param {object} autoModConfig - The `automodConfig` object.
 * @param {object} actionProfiles - The `checkActionProfiles` object from `actionProfiles.js` for cross-referencing checkTypes.
 * @returns {string[]} An array of error messages. Empty if no errors.
 */
export function validateAutoModConfig(autoModConfig, actionProfiles) {
    const errors = [];
    const context = 'automodConfig';

    if (!isObject(autoModConfig)) {
        errors.push(`${context}: Expected an object, but got ${typeof autoModConfig}.`);
        return errors;
    }

    if (!Object.prototype.hasOwnProperty.call(autoModConfig, 'automodRuleSets') || !isArray(autoModConfig.automodRuleSets)) {
        errors.push(`${context}.automodRuleSets: Required field is missing or not an array.`);
        return errors; // Cannot proceed if this fundamental structure is wrong
    }

    const knownActionProfileNames = Object.keys(actionProfiles || {});
    // Define valid AutoMod action types
    const validAutoModActions = ['warn', 'kick', 'tempBan', 'ban', 'mute', 'flagOnly', 'teleportSafe']; // 'ban' is permanent ban

    autoModConfig.automodRuleSets.forEach((ruleSet, index) => {
        const ruleSetContext = `${context}.automodRuleSets[${index}]`;

        const ruleSetFieldDefs = [
            { name: 'checkType', type: 'string',
                /**
                 * Validates the checkType string.
                 * Ensures it's camelCase or a known actionProfile name.
                 * @param {string} val - The checkType string.
                 * @param {string} path - The JSDoc path to the value.
                 * @param {string[]} errs - Array to push error messages to.
                 * @returns {boolean} True (as errors are pushed directly).
                 */
                validator: (val, path, errs) => {
                // A checkType in automodConfig might not necessarily have a direct 1:1 actionProfile
                // if it's a more abstract grouping or if actionProfiles are fine-grained.
                // For now, we'll keep it as a string. If strict mapping is needed, uncomment below.
                // if (!knownActionProfileNames.includes(val)) {
                //     errs.push(`${path}: checkType "${val}" does not correspond to a known actionProfile name.`);
                // }
                // return knownActionProfileNames.includes(val);
                    if (!isValidCamelCase(val) && !knownActionProfileNames.includes(val)) {
                    // Check if it's a known actionProfile name OR a generic camelCase string if not found in actionProfiles
                    // This allows for checkTypes that might be aggregations or special cases not directly in actionProfiles
                        errs.push(`${path}: checkType "${val}" is not a valid camelCase string or a known actionProfile name.`);
                    }
                    return true; // Validator pushes error
                } },
            { name: 'enabled', type: 'boolean' },
            { name: 'description', type: 'string', optional: true },
            { name: 'resetFlagsAfterSeconds', type: 'positiveNumber', optional: true },
            { name: 'tiers', type: 'array' },
        ];
        ensureFields(ruleSet, ruleSetFieldDefs, ruleSetContext, errors);

        if (ruleSet.tiers && isArray(ruleSet.tiers)) {
            let lastThreshold = -1;
            ruleSet.tiers.forEach((tier, tierIndex) => {
                const tierContext = `${ruleSetContext}.tiers[${tierIndex}]`;
                const tierFieldDefs = [
                    { name: 'flagThreshold', type: 'positiveNumber' },
                    { name: 'actionType', type: 'string',
                        /**
                         * Validates the AutoMod actionType string.
                         * @param {string} val - The actionType string.
                         * @param {string} path - The JSDoc path to the value.
                         * @param {string[]} errs - Array to push error messages to.
                         * @returns {boolean} True if valid.
                         */
                        validator: (val, path, errs) => {
                            if (!validAutoModActions.includes(val)) {
                                errs.push(`${path}: Invalid actionType "${val}". Expected one of ${validAutoModActions.join(', ')}.`);
                            }
                            return validAutoModActions.includes(val);
                        } },
                    { name: 'parameters', type: 'object' }, // Parameters can vary, specific checks below
                    { name: 'resetFlagsAfterAction', type: 'boolean' },
                ];
                ensureFields(tier, tierFieldDefs, tierContext, errors);

                // Validate flagThreshold ordering
                if (isPositiveNumber(tier.flagThreshold)) {
                    if (tier.flagThreshold <= lastThreshold) {
                        errors.push(`${tierContext}.flagThreshold: Tiers must be sorted by 'flagThreshold' in ascending order. Found ${tier.flagThreshold} after ${lastThreshold}.`);
                    }
                    lastThreshold = tier.flagThreshold;
                }

                // Validate parameters based on actionType
                if (tier.parameters && isObject(tier.parameters)) {
                    const paramsContext = `${tierContext}.parameters`;
                    if (tier.actionType === 'tempBan' || tier.actionType === 'mute') {
                        if (!Object.prototype.hasOwnProperty.call(tier.parameters, 'duration') || !isValidDurationString(tier.parameters.duration)) {
                            errors.push(`${paramsContext}.duration: Required and must be a valid duration string for actionType '${tier.actionType}'.`);
                        }
                    }
                    if (tier.actionType === 'teleportSafe') {
                        if (tier.parameters.coordinates && !isObject(tier.parameters.coordinates)) {
                            errors.push(`${paramsContext}.coordinates: If present, must be an object for actionType 'teleportSafe'.`);
                        } else if (tier.parameters.coordinates) {
                            const coordFields = [
                                { name: 'x', type: 'number', optional: true },
                                { name: 'y', type: 'number', optional: true },
                                { name: 'z', type: 'number', optional: true },
                            ];
                            ensureFields(tier.parameters.coordinates, coordFields, `${paramsContext}.coordinates`, errors);
                        }
                    }
                    if (Object.prototype.hasOwnProperty.call(tier.parameters, 'messageTemplate') && !isString(tier.parameters.messageTemplate)) {
                        errors.push(`${paramsContext}.messageTemplate: If present, must be a string.`);
                    }
                    if (Object.prototype.hasOwnProperty.call(tier.parameters, 'adminMessageTemplate') && !isString(tier.parameters.adminMessageTemplate)) {
                        errors.push(`${paramsContext}.adminMessageTemplate: If present, must be a string.`);
                    }
                } else if (tier.actionType !== 'flagOnly' && tier.actionType !== 'kick' && tier.actionType !== 'warn' && tier.actionType !== 'ban') {
                    // Some actions like kick/warn/ban might not always require parameters beyond a message template
                    // flagOnly definitely doesn't.
                    // For others, parameters object is usually expected.
                    if (!tier.parameters) { // if parameters object itself is missing
                        errors.push(`${tierContext}.parameters: Required field is missing for actionType '${tier.actionType}'.`);
                    }
                }
            });
        } else {
            // This error would be caught by ensureFields if 'tiers' is mandatory and not an array.
            // errors.push(`${ruleSetContext}.tiers: Required field 'tiers' is missing or not an array.`);
        }
    });

    return errors;
}

// --- Ranks Config Validation (ranksConfig.js) ---

/**
 * Validates the ranksConfig object.
 * @param {object} ranksConfig - The object containing rank definitions and defaults from `ranksConfig.js`.
 * @param {string} mainConfigOwnerName - The `ownerPlayerName` from `config.js` for 'ownerName' condition validation.
 * @param {string} mainConfigAdminTag - The `adminTag` from `config.js` for 'adminTag' condition validation.
 * @returns {string[]} An array of error messages. Empty if no errors.
 */
export function validateRanksConfig(ranksConfig, mainConfigOwnerName, mainConfigAdminTag) {
    const errors = [];
    const context = 'ranksConfig';

    if (!isObject(ranksConfig)) {
        errors.push(`${context}: Expected an object, but got ${typeof ranksConfig}.`);
        return errors;
    }

    // Validate defaultChatFormatting
    const dcfContext = `${context}.defaultChatFormatting`;
    if (!Object.prototype.hasOwnProperty.call(ranksConfig, 'defaultChatFormatting') || !isObject(ranksConfig.defaultChatFormatting)) {
        errors.push(`${dcfContext}: Required field is missing or not an object.`);
    } else {
        const chatFormatFields = [
            { name: 'prefixText', type: 'string', optional: true }, // Defaults exist
            { name: 'prefixColor', type: 'colorCode', optional: true },
            { name: 'nameColor', type: 'colorCode', optional: true },
            { name: 'messageColor', type: 'colorCode', optional: true },
        ];
        ensureFields(ranksConfig.defaultChatFormatting, chatFormatFields, dcfContext, errors);
    }

    // Validate defaultNametagPrefix
    if (!Object.prototype.hasOwnProperty.call(ranksConfig, 'defaultNametagPrefix') || !isString(ranksConfig.defaultNametagPrefix)) {
        errors.push(`${context}.defaultNametagPrefix: Required field is missing or not a string.`);
    }

    // Validate defaultPermissionLevel
    if (!Object.prototype.hasOwnProperty.call(ranksConfig, 'defaultPermissionLevel') || !isNumber(ranksConfig.defaultPermissionLevel)) {
        errors.push(`${context}.defaultPermissionLevel: Required field is missing or not a number.`);
    }

    // Validate rankDefinitions
    const rdContext = `${context}.rankDefinitions`;
    if (!Object.prototype.hasOwnProperty.call(ranksConfig, 'rankDefinitions') || !isArray(ranksConfig.rankDefinitions)) {
        errors.push(`${rdContext}: Required field is missing or not an array.`);
        return errors; // Cannot proceed further without rankDefinitions
    }

    let defaultRankFound = false;
    const rankPriorities = new Set();
    const rankIds = new Set();

    ranksConfig.rankDefinitions.forEach((rankDef, index) => {
        const rankDefContext = `${rdContext}[${index}]`;

        const rankDefFields = [
            { name: 'id', type: 'string',
                /**
                 * Validates the rank ID.
                 * Ensures it is lowercase and unique.
                 * @param {string} val - The rank ID.
                 * @param {string} path - The JSDoc path to the value.
                 * @param {string[]} errs - Array to push error messages to.
                 * @returns {boolean} True (as errors are pushed directly).
                 */
                validator: (val, path, errs) => {
                    if (val !== val.toLowerCase()) {
                        errs.push(`${path}: Rank ID "${val}" must be lowercase.`);
                    }
                    if (rankIds.has(val)) {
                        errs.push(`${path}: Duplicate rank ID "${val}" found.`);
                    }
                    rankIds.add(val);
                    return true; // Validator pushes errors
                } },
            { name: 'name', type: 'string' },
            { name: 'permissionLevel', type: 'number' },
            { name: 'chatFormatting', type: 'object', optional: true, objectProperties: [ // Same as defaultChatFormatting structure
                { name: 'prefixText', type: 'string', optional: true },
                { name: 'prefixColor', type: 'colorCode', optional: true },
                { name: 'nameColor', type: 'colorCode', optional: true },
                { name: 'messageColor', type: 'colorCode', optional: true },
            ] },
            { name: 'nametagPrefix', type: 'string', optional: true },
            { name: 'conditions', type: 'array' },
            { name: 'priority', type: 'number',
                /**
                 * Validates the rank priority.
                 * Ensures it is unique.
                 * @param {number} val - The priority value.
                 * @param {string} path - The JSDoc path to the value.
                 * @param {string[]} errs - Array to push error messages to.
                 * @returns {boolean} True (as errors are pushed directly).
                 */
                validator: (val, path, errs) => {
                    if (rankPriorities.has(val)) {
                        errs.push(`${path}: Duplicate priority ${val} found. Priorities must be unique.`);
                    }
                    rankPriorities.add(val);
                    return true; // Validator pushes errors
                } },
            { name: 'assignableBy', type: 'number', optional: true },
        ];
        ensureFields(rankDef, rankDefFields, rankDefContext, errors);

        if (rankDef.conditions && isArray(rankDef.conditions)) {
            if (rankDef.conditions.length === 0) {
                errors.push(`${rankDefContext}.conditions: Must not be an empty array. Each rank needs at least one condition.`);
            }
            rankDef.conditions.forEach((condition, condIndex) => {
                const condContext = `${rankDefContext}.conditions[${condIndex}]`;
                const validConditionTypes = ['ownerName', 'adminTag', 'manualTagPrefix', 'tag', 'default'];
                const conditionFieldDefs = [
                    { name: 'type', type: 'string',
                        /**
                         * Validates the rank condition type string.
                         * @param {string} val - The condition type string.
                         * @param {string} path - The JSDoc path to the value.
                         * @param {string[]} errs - Array to push error messages to.
                         * @returns {boolean} True if valid.
                         */
                        validator: (val, path, errs) => {
                            if (!validConditionTypes.includes(val)) {
                                errs.push(`${path}: Invalid condition type "${val}". Expected one of ${validConditionTypes.join(', ')}.`);
                            }
                            return validConditionTypes.includes(val);
                        } },
                    { name: 'prefix', type: 'string', optional: true }, // Required by specific types below
                    { name: 'tag', type: 'string', optional: true },    // Required by specific types below
                ];
                ensureFields(condition, conditionFieldDefs, condContext, errors);

                if (isObject(condition)) { // ensureFields would have logged if not an object
                    if (condition.type === 'default') {
                        defaultRankFound = true;
                    }
                    if (condition.type === 'manualTagPrefix' && (!Object.prototype.hasOwnProperty.call(condition, 'prefix') || !isString(condition.prefix))) {
                        errors.push(`${condContext}.prefix: Required string field for condition type 'manualTagPrefix'.`);
                    }
                    if (condition.type === 'tag' && (!Object.prototype.hasOwnProperty.call(condition, 'tag') || !isString(condition.tag))) {
                        errors.push(`${condContext}.tag: Required string field for condition type 'tag'.`);
                    }
                    if (condition.type === 'ownerName' && (!mainConfigOwnerName || mainConfigOwnerName === 'PlayerNameHere' || mainConfigOwnerName.trim() === '')) {
                        errors.push(`${condContext}: Condition type 'ownerName' used, but config.ownerPlayerName is not properly set in main config.`);
                    }
                    if (condition.type === 'adminTag' && (!mainConfigAdminTag || mainConfigAdminTag.trim() === '')) {
                        errors.push(`${condContext}: Condition type 'adminTag' used, but config.adminTag is not properly set in main config.`);
                    }
                }
            });
        } else {
            // ensureFields would catch this if 'conditions' is not optional and not an array
            errors.push(`${rankDefContext}.conditions: Required field 'conditions' is missing or not an array.`);
        }
    });

    if (!defaultRankFound) {
        errors.push(`${rdContext}: No rank with a 'default' condition type was found. One default rank is required.`);
    }

    return errors;
}
