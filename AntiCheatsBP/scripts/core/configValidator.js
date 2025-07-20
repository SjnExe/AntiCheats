/**
 * @file Validates the structure and values of configuration files.
 * @module AntiCheatsBP/scripts/core/configValidator
 */

/**
 * Checks if a value is a string.
 * @param {*} value The value to check.
 * @returns {boolean}
 */
function isString(value) {
    return typeof value === 'string';
}
/**
 * Checks if a value is a number.
 * @param {*} value The value to check.
 * @returns {boolean}
 */
function isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
}
/**
 * Checks if a value is a boolean.
 * @param {*} value The value to check.
 * @returns {boolean}
 */
function isBoolean(value) {
    return typeof value === 'boolean';
}
/**
 * Checks if a value is an array.
 * @param {*} value The value to check.
 * @returns {boolean}
 */
function isArray(value) {
    return Array.isArray(value);
}
/**
 * Checks if a value is an object.
 * @param {*} value The value to check.
 * @returns {boolean}
 */
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * @param {*} colorCode
 */
function isValidColorCode(colorCode) {
    return isString(colorCode) && /^§[0-9a-fk-or]$/.test(colorCode);
}
/**
 * @param {*} str
 */
function isValidCamelCase(str) {
    if (!isString(str) || str.length === 0) {
        return false;
    }
    return /^[a-z]+([A-Z][a-z0-9]*)*$/.test(str);
}
/**
 * @param {*} num
 */
function isPositiveNumber(num) {
    return isNumber(num) && num > 0;
}
/**
 * @param {*} num
 */
function isNonNegativeNumber(num) {
    return isNumber(num) && num >= 0;
}
/**
 * @param {*} durationStr
 */
function isValidDurationString(durationStr) {
    if (!isString(durationStr)) {
        return false;
    }
    return /^\d+[smhd]$/.test(durationStr) || /^\d+$/.test(durationStr);
}
/**
 * @param {object} obj
 * @param {Array<object>} fieldDefs
 * @param {string} context
 * @param {Array<string>} errors
 */
function ensureFields(obj, fieldDefs, context, errors) {
    if (!isObject(obj)) {
        errors.push(`${context}: Expected an object, but got ${typeof obj}.`);
        return false;
    }
    let allFieldsValidOverall = true;
    for (const field of fieldDefs) {
        const value = obj[field.name];
        const fieldPath = `${context}.${field.name}`;
        let currentFieldInitialCheckPassed = true;
        if (!Object.prototype.hasOwnProperty.call(obj, field.name)) {
            if (!field.optional) {
                errors.push(`${fieldPath}: Required field is missing.`);
                allFieldsValidOverall = false;
            }
            continue;
        }
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
                        allFieldsValidOverall = false;
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
        if (currentFieldInitialCheckPassed && field.validator) {
            if (!field.validator(value, fieldPath, errors)) {
                allFieldsValidOverall = false;
            }
        }
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
                        allFieldsValidOverall = false;
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
        if (currentFieldInitialCheckPassed && field.type === 'object' && field.objectProperties && isObject(value)) {
            if (!ensureFields(value, field.objectProperties, fieldPath, errors)) {
                allFieldsValidOverall = false;
            }
        }
    }
    return allFieldsValidOverall;
}
/**
 * Validates the main configuration object.
 * @param {object} config The `defaultConfigSettings` object.
 * @param {object} actionProfiles The `checkActionProfiles` object.
 * @param {string[]} knownCommands An array of known command names.
 * @param {object} [commandAliasesMap] Optional command aliases map.
 * @returns {string[]} An array of error messages.
 */
export function validateMainConfig(config, actionProfiles, knownCommands, commandAliasesMap) {
    const errors = [];
    const context = 'config.defaultConfigSettings';
    if (!isObject(config)) {
        errors.push(`${context}: Expected an object, but got ${typeof config}.`);
        return errors;
    }
    const actionProfileNames = Object.keys(actionProfiles || {});
    const configFieldDefs = [
        { name: 'adminTag', type: 'string' },
        { name: 'ownerPlayerName', type: 'string' },
        { name: 'enableDebugLogging', type: 'boolean' },
        { name: 'prefix', type: 'string' },
        { name: 'vanishedPlayerTag', type: 'string' },
        { name: 'frozenPlayerTag', type: 'string' },
        { name: 'enableWelcomerMessage', type: 'boolean' },
        { name: 'welcomeMessage', type: 'string' },
        { name: 'notifyAdminOnNewPlayerJoin', type: 'boolean' },
        { name: 'enableDeathCoordsMessage', type: 'boolean' },
        { name: 'deathCoordsMessage', type: 'string' },
        { name: 'enableCombatLogDetection', type: 'boolean' },
        { name: 'combatLogThresholdSeconds', type: 'positiveNumber' },
        { name: 'combatLogFlagIncrement', type: 'nonNegativeNumber' },
        { name: 'combatLogMessage', type: 'string' },
        { name: 'enableTpaSystem', type: 'boolean' },
        { name: 'tpaRequestTimeoutSeconds', type: 'positiveNumber' },
        { name: 'tpaRequestCooldownSeconds', type: 'positiveNumber' },
        { name: 'tpaTeleportWarmupSeconds', type: 'positiveNumber' },
        { name: 'tpaCancelOnMoveDuringWarmup', type: 'boolean' },
        { name: 'tpaMovementTolerance', type: 'nonNegativeNumber' },
        { name: 'discordLink', type: 'string' },
        { name: 'websiteLink', type: 'string' },
        {
            name: 'helpLinks', type: 'array', arrayElementType: 'object', objectProperties: [
                { name: 'title', type: 'string' },
                { name: 'url', type: 'string' },
            ],
        },
        { name: 'generalHelpMessages', type: 'array', arrayElementType: 'string' },
        { name: 'enableDetailedJoinLeaveLogging', type: 'boolean' },
        {
            name: 'chatChecks', type: 'object', objectProperties: [
                {
                    name: 'swear', type: 'object', objectProperties: [
                        { name: 'enabled', type: 'boolean' },
                        { name: 'words', type: 'array', arrayElementType: 'string' },
                        { name: 'actionProfile', type: 'string' },
                    ],
                },
                {
                    name: 'advertising', type: 'object', objectProperties: [
                        { name: 'enabled', type: 'boolean' },
                        { name: 'patterns', type: 'array', arrayElementType: 'string' },
                        { name: 'whitelist', type: 'array', arrayElementType: 'string' },
                        { name: 'actionProfile', type: 'string' },
                    ],
                },
                {
                    name: 'caps', type: 'object', objectProperties: [
                        { name: 'enabled', type: 'boolean' },
                        { name: 'minLength', type: 'nonNegativeNumber' },
                        { name: 'percentage', type: 'number' },
                        { name: 'actionProfile', type: 'string' },
                    ],
                },
                {
                    name: 'charRepeat', type: 'object', objectProperties: [
                        { name: 'enabled', type: 'boolean' },
                        { name: 'minLength', type: 'nonNegativeNumber' },
                        { name: 'threshold', type: 'positiveNumber' },
                        { name: 'actionProfile', type: 'string' },
                    ],
                },
                {
                    name: 'symbolSpam', type: 'object', objectProperties: [
                        { name: 'enabled', type: 'boolean' },
                        { name: 'minLength', type: 'nonNegativeNumber' },
                        { name: 'percentage', type: 'number' },
                        { name: 'actionProfile', type: 'string' },
                    ],
                },
                {
                    name: 'fastMessage', type: 'object', objectProperties: [
                        { name: 'enabled', type: 'boolean' },
                        { name: 'thresholdMs', type: 'positiveNumber' },
                        { name: 'actionProfile', type: 'string' },
                    ],
                },
            ],
        },
        {
            name: 'maxWordsSpamActionProfileName', type: 'string',
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            },
        },
        {
            name: 'chatContentRepeatActionProfileName', type: 'string',
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            },
        },
        {
            name: 'unicodeAbuseActionProfileName', type: 'string',
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            },
        },
        {
            name: 'gibberishActionProfileName', type: 'string',
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            },
        },
        {
            name: 'mentionsActionProfileName', type: 'string',
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            },
        },
        {
            name: 'impersonationActionProfileName', type: 'string',
            validator: (val, path, errs) => {
                if (!actionProfileNames.includes(val)) {
                    errs.push(`${path}: Action profile "${val}" not found in actionProfiles.js.`);
                }
                return actionProfileNames.includes(val);
            },
        },
        {
            name: 'antiGrief', type: 'object', objectProperties: [
                {
                    name: 'tnt', type: 'object', objectProperties: [
                        { name: 'enabled', type: 'boolean' },
                        { name: 'allowAdmins', type: 'boolean' },
                        { name: 'action', type: 'string' },
                    ],
                },
                {
                    name: 'wither', type: 'object', objectProperties: [
                        { name: 'enabled', type: 'boolean' },
                        { name: 'allowAdmins', type: 'boolean' },
                        { name: 'action', type: 'string' },
                    ],
                },
                {
                    name: 'fire', type: 'object', objectProperties: [
                        { name: 'enabled', type: 'boolean' },
                        { name: 'allowAdmins', type: 'boolean' },
                        { name: 'action', type: 'string' },
                    ],
                },
                {
                    name: 'lava', type: 'object', objectProperties: [
                        { name: 'enabled', type: 'boolean' },
                        { name: 'allowAdmins', type: 'boolean' },
                        { name: 'action', type: 'string' },
                    ],
                },
                {
                    name: 'water', type: 'object', objectProperties: [
                        { name: 'enabled', type: 'boolean' },
                        { name: 'allowAdmins', type: 'boolean' },
                        { name: 'action', type: 'string' },
                    ],
                },
            ],
        },
        {
            name: 'soundEvents', type: 'object',
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
                        { name: 'soundId', type: 'string', optional: true },
                        { name: 'volume', type: 'number', optional: true },
                        { name: 'pitch', type: 'number', optional: true },
                        {
                            name: 'target', type: 'string', optional: true,
                            validator: (val, p, e) => {
                                const validTargets = ['player', 'admin', 'targetPlayer', 'global'];
                                if (val && !validTargets.includes(val)) {
                                    e.push(`${p}: Invalid sound event target "${val}". Expected one of ${validTargets.join(', ')}.`);
                                    return false;
                                }
                                return true;
                            },
                        },
                        { name: 'description', type: 'string' },
                    ];
                    if (!ensureFields(eventDef, soundFieldDefs, eventPath, seErrs)) {
                        overallSoundEventsValid = false;
                    }
                    if (eventDef.volume !== undefined && isNumber(eventDef.volume) && (eventDef.volume < 0 || eventDef.volume > 1.0)) {
                        seErrs.push(`${eventPath}.volume: Must be between 0.0 and 1.0. Got ${eventDef.volume}.`);
                        overallSoundEventsValid = false;
                    }
                }
                return overallSoundEventsValid;
            },
        },
        {
            name: 'commandSettings', type: 'object',
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
            },
        },
        { name: 'chatClearLinesCount', type: 'positiveNumber' },
        { name: 'reportsViewPerPage', type: 'positiveNumber' },
        { name: 'enableAutoMod', type: 'boolean' },
        { name: 'manualMuteDefaultDuration', type: 'durationString' },
        { name: 'serverRules', type: 'string' },
        { name: 'enableReachCheck', type: 'boolean' },
    ];
    ensureFields(config, configFieldDefs, context, errors);
    const knownKeys = configFieldDefs.map(f => f.name);
    const manuallyHandledKeys = ['soundEvents', 'commandSettings'];
    for (const key in config) {
        if (!Object.prototype.hasOwnProperty.call(config, key)) {
            continue;
        }
        if (!knownKeys.includes(key) && !manuallyHandledKeys.includes(key)) {
            errors.push(`${context}.${key}: Unknown key "${key}" found in config. It will be ignored.`);
        }
    }
    if (commandAliasesMap) {
        if (isObject(commandAliasesMap)) {
            const aliasContext = 'config.commandAliases';
            for (const alias in commandAliasesMap) {
                if (!Object.prototype.hasOwnProperty.call(commandAliasesMap, alias)) {
                    continue;
                }
                const originalCommand = commandAliasesMap[alias];
                if (!isString(originalCommand)) {
                    errors.push(`${aliasContext}.${alias}: Original command name for alias must be a string. Got ${typeof originalCommand}.`);
                } else if (knownCommands && !knownCommands.includes(originalCommand)) {
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
/**
 * Validates the checkActionProfiles object.
 * @param {object} actionProfiles The `checkActionProfiles` object.
 * @returns {string[]} An array of error messages.
 */
export function validateActionProfiles(actionProfiles) {
    const errors = [];
    const context = 'actionProfiles.checkActionProfiles';
    if (!isObject(actionProfiles)) {
        errors.push(`${context}: Expected an object, but got ${typeof actionProfiles}.`);
        return errors;
    }
    const validCustomActions = ['mutePlayer', 'teleportSafe'];
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
            continue;
        }
        const profileFieldDefs = [
            { name: 'enabled', type: 'boolean' },
            {
                name: 'flag', type: 'object', optional: true, objectProperties: [
                    { name: 'increment', type: 'number' },
                    { name: 'reason', type: 'string' },
                    { name: 'type', type: 'camelCaseString' },
                ],
            },
            {
                name: 'notifyAdmins', type: 'object', optional: true, objectProperties: [
                    { name: 'message', type: 'string' },
                ],
            },
            {
                name: 'log', type: 'object', optional: true, objectProperties: [
                    { name: 'actionType', type: 'camelCaseString' },
                    { name: 'detailsPrefix', type: 'string', optional: true },
                    { name: 'includeViolationDetails', type: 'boolean', optional: true },
                ],
            },
            { name: 'cancelMessage', type: 'boolean', optional: true },
            { name: 'cancelEvent', type: 'boolean', optional: true },
            {
                name: 'customAction', type: 'string', optional: true,
                validator: (val, path, errs) => {
                    if (!validCustomActions.includes(val)) {
                        errs.push(`${path}: Invalid customAction "${val}". Expected one of ${validCustomActions.join(', ')}.`);
                    }
                    return validCustomActions.includes(val);
                },
            },
        ];
        ensureFields(profile, profileFieldDefs, profileContext, errors);
        if (profile.flag) {
            if (!isObject(profile.flag)) {
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
/**
 * Validates the automodConfig object.
 * @param {object} autoModConfig The `automodConfig` object.
 * @param {object} actionProfiles The `checkActionProfiles` object.
 * @returns {string[]} An array of error messages.
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
        return errors;
    }
    const knownActionProfileNames = Object.keys(actionProfiles || {});
    const validAutoModActions = ['warn', 'kick', 'tempBan', 'ban', 'mute', 'flagOnly', 'teleportSafe'];
    autoModConfig.automodRuleSets.forEach((ruleSet, index) => {
        const ruleSetContext = `${context}.automodRuleSets[${index}]`;
        const ruleSetFieldDefs = [
            {
                name: 'checkType', type: 'string',
                validator: (val, path, errs) => {
                    if (!isValidCamelCase(val) && !knownActionProfileNames.includes(val)) {
                        errs.push(`${path}: checkType "${val}" is not a valid camelCase string or a known actionProfile name.`);
                    }
                    return true;
                },
            },
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
                    {
                        name: 'actionType', type: 'string',
                        validator: (val, path, errs) => {
                            if (!validAutoModActions.includes(val)) {
                                errs.push(`${path}: Invalid actionType "${val}". Expected one of ${validAutoModActions.join(', ')}.`);
                            }
                            return validAutoModActions.includes(val);
                        },
                    },
                    { name: 'parameters', type: 'object' },
                    { name: 'resetFlagsAfterAction', type: 'boolean' },
                ];
                ensureFields(tier, tierFieldDefs, tierContext, errors);
                if (isPositiveNumber(tier.flagThreshold)) {
                    if (tier.flagThreshold <= lastThreshold) {
                        errors.push(`${tierContext}.flagThreshold: Tiers must be sorted by 'flagThreshold' in ascending order. Found ${tier.flagThreshold} after ${lastThreshold}.`);
                    }
                    lastThreshold = tier.flagThreshold;
                }
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
                    if (!tier.parameters) {
                        errors.push(`${tierContext}.parameters: Required field is missing for actionType '${tier.actionType}'.`);
                    }
                }
            });
        } else {
            // Not an array, so no need to validate tiers
        }
    });
    return errors;
}
/**
 * Validates the ranksConfig object.
 * @param {object} ranksConfig The ranks configuration object.
 * @param {string} mainConfigOwnerName The owner's name from the main config.
 * @param {string} mainConfigAdminTag The admin tag from the main config.
 * @returns {string[]} An array of error messages.
 */
export function validateRanksConfig(ranksConfig, mainConfigOwnerName, mainConfigAdminTag) {
    const errors = [];
    const context = 'ranksConfig';
    if (!isObject(ranksConfig)) {
        errors.push(`${context}: Expected an object, but got ${typeof ranksConfig}.`);
        return errors;
    }
    const dcfContext = `${context}.defaultChatFormatting`;
    if (!Object.prototype.hasOwnProperty.call(ranksConfig, 'defaultChatFormatting') || !isObject(ranksConfig.defaultChatFormatting)) {
        errors.push(`${dcfContext}: Required field is missing or not an object.`);
    } else {
        const chatFormatFields = [
            { name: 'prefixText', type: 'string', optional: true },
            { name: 'prefixColor', type: 'colorCode', optional: true },
            { name: 'nameColor', type: 'colorCode', optional: true },
            { name: 'messageColor', type: 'colorCode', optional: true },
        ];
        ensureFields(ranksConfig.defaultChatFormatting, chatFormatFields, dcfContext, errors);
    }
    if (!Object.prototype.hasOwnProperty.call(ranksConfig, 'defaultNametagPrefix') || !isString(ranksConfig.defaultNametagPrefix)) {
        errors.push(`${context}.defaultNametagPrefix: Required field is missing or not a string.`);
    }
    if (!Object.prototype.hasOwnProperty.call(ranksConfig, 'defaultPermissionLevel') || !isNumber(ranksConfig.defaultPermissionLevel)) {
        errors.push(`${context}.defaultPermissionLevel: Required field is missing or not a number.`);
    }
    const rdContext = `${context}.rankDefinitions`;
    if (!Object.prototype.hasOwnProperty.call(ranksConfig, 'rankDefinitions') || !isArray(ranksConfig.rankDefinitions)) {
        errors.push(`${rdContext}: Required field is missing or not an array.`);
        return errors;
    }
    let defaultRankFound = false;
    const rankPriorities = new Set();
    const rankIds = new Set();
    ranksConfig.rankDefinitions.forEach((rankDef, index) => {
        const rankDefContext = `${rdContext}[${index}]`;
        const rankDefFields = [
            {
                name: 'id', type: 'string',
                validator: (val, path, errs) => {
                    if (val !== val.toLowerCase()) {
                        errs.push(`${path}: Rank ID "${val}" must be lowercase.`);
                    }
                    if (rankIds.has(val)) {
                        errs.push(`${path}: Duplicate rank ID "${val}" found.`);
                    }
                    rankIds.add(val);
                    return true;
                },
            },
            { name: 'name', type: 'string' },
            { name: 'permissionLevel', type: 'number' },
            {
                name: 'chatFormatting', type: 'object', optional: true, objectProperties: [
                    { name: 'prefixText', type: 'string', optional: true },
                    { name: 'prefixColor', type: 'colorCode', optional: true },
                    { name: 'nameColor', type: 'colorCode', optional: true },
                    { name: 'messageColor', type: 'colorCode', optional: true },
                ],
            },
            { name: 'nametagPrefix', type: 'string', optional: true },
            { name: 'conditions', type: 'array' },
            {
                name: 'priority', type: 'number',
                validator: (val, path, errs) => {
                    if (rankPriorities.has(val)) {
                        errs.push(`${path}: Duplicate priority ${val} found. Priorities must be unique.`);
                    }
                    rankPriorities.add(val);
                    return true;
                },
            },
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
                    {
                        name: 'type', type: 'string',
                        validator: (val, path, errs) => {
                            if (!validConditionTypes.includes(val)) {
                                errs.push(`${path}: Invalid condition type "${val}". Expected one of ${validConditionTypes.join(', ')}.`);
                            }
                            return validConditionTypes.includes(val);
                        },
                    },
                    { name: 'prefix', type: 'string', optional: true },
                    { name: 'tag', type: 'string', optional: true },
                ];
                ensureFields(condition, conditionFieldDefs, condContext, errors);
                if (isObject(condition)) {
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
            errors.push(`${rankDefContext}.conditions: Required field 'conditions' is missing or not an array.`);
        }
    });
    if (!defaultRankFound) {
        errors.push(`${rdContext}: No rank with a 'default' condition type was found. One default rank is required.`);
    }
    return errors;
}
