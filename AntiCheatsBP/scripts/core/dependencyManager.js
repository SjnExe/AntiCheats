import * as mc from '@minecraft/server';
import * as mcui from '@minecraft/server-ui';
import { system } from '@minecraft/server';

import { executeCheckAction } from './actionManager.js';
import { automodConfig } from './automodConfig.js';
import { processChatMessage } from './chatProcessor.js';
import { checkActionProfiles } from './actionProfiles.js';
import * as checks from '../checks/index.js';
import {
    initializeCommands,
    getAllRegisteredCommandNames,
} from './commandManager.js';
import * as configModule from '../config.js';
import * as playerDataManager from './playerDataManager.js';
import * as playerUtils from '../utils/playerUtils.js';
import * as rankManager from './rankManager.js';
import * as logManager from './logManager.js';
import * as reportManager from './reportManager.js';
import * as tpaManager from './tpaManager.js';
import * as uiManager from './uiManager.js';
import * as worldBorderManager from '../utils/worldBorderManager.js';
import * as configValidator from './configValidator.js';

export const actionManager = { executeCheckAction };
export const chatProcessor = { processChatMessage };
export const commandManager = {
    reloadCommands: initializeCommands,
    getAllRegisteredCommandNames,
};

export {
    mc,
    mcui,
    system,
    automodConfig,
    checkActionProfiles,
    checks,
    configModule,
    playerDataManager,
    playerUtils,
    rankManager,
    logManager,
    reportManager,
    tpaManager,
    uiManager,
    worldBorderManager,
    configValidator,
};
