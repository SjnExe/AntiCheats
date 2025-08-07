import * as mc from '@minecraft/server';
import * as mcui from '@minecraft/server-ui';
import { system } from '@minecraft/server';

import { executeCheckAction } from './actionManager.js';
import { automodConfig } from './automodConfig.js';
import { processChatMessage } from './chatProcessor.js';
import { checkActionProfiles } from './actionProfiles.js';
import * as checks from '../modules/detections/index.js';
import {
    initializeCommands,
    getAllRegisteredCommandNames,
} from './commandManager.js';
import { config, updateConfigValue, acVersion, editableConfigValues } from '../config.js';
import * as playerDataManager from './playerDataManager.js';
import * as playerUtils from '../modules/utils/playerUtils.js';
import * as rankManager from './rankManager.js';
import * as logManager from './logManager.js';
import * as reportManager from './reportManager.js';
import * as tpaManager from './tpaManager.js';
import * as uiManager from './uiManager.js';
import * as worldBorderManager from '../modules/utils/worldBorderManager.js';
import * as configValidator from './configValidator.js';
import * as homesManager from './homesManager.js';
import * as kitsManager from './kitsManager.js';
import { kits } from './kits.js';
import * as economyManager from './economyManager.js';

export const actionManager = { executeCheckAction };
export const chatProcessor = { processChatMessage };
export const commandManager = {
    initializeCommands: initializeCommands,
    getAllRegisteredCommandNames,
};

export {
    mc,
    mcui,
    system,
    automodConfig,
    checkActionProfiles,
    checks,
    config,
    updateConfigValue,
    acVersion,
    editableConfigValues,
    playerDataManager,
    playerUtils,
    rankManager,
    logManager,
    reportManager,
    tpaManager,
    uiManager,
    worldBorderManager,
    configValidator,
    homesManager,
    kitsManager,
    kits,
    economyManager,
};
