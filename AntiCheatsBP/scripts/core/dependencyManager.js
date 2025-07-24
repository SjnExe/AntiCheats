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
import {
    ensurePlayerDataInitialized,
    getPlayerData,
    updateTransientPlayerData,
    clearExpiredItemUseStates,
    saveDirtyPlayerData,
} from './playerDataManager.js';
import { debugLog, getString, notifyAdmins, playSoundForEvent, isAdmin, formatSessionDuration } from '../utils/playerUtils.js';
import {
    getPlayerPermissionLevel,
    updatePlayerNametag,
    getPlayerRankFormattedChatElements,
    permissionLevels,
} from './rankManager.js';
import { addLog, persistLogCacheToDisk } from './logManager.js';
import { persistReportsToDisk } from './reportManager.js';
import { clearExpiredRequests, getRequestsInWarmup, checkPlayerMovementDuringWarmup, executeTeleport } from './tpaManager.js';
import * as uiManager from './uiManager.js';
import {
    getBorderSettings,
    saveBorderSettings,
    processWorldBorderResizing,
    enforceWorldBorderForPlayer,
    isPlayerOutsideBorder,
} from '../utils/worldBorderManager.js';
import {
    validateMainConfig,
    validateActionProfiles,
    validateAutoModConfig,
    validateRanksConfig,
} from './configValidator.js';

const mainModuleName = 'DependencyManager';

// These are relatively static and can be reused
const playerDataManager = {
    ensurePlayerDataInitialized,
    getPlayerData,
    updateTransientPlayerData,
    clearExpiredItemUseStates,
    saveDirtyPlayerData,
};

const worldBorderManager = {
    getBorderSettings,
    saveBorderSettings,
    processWorldBorderResizing,
    enforceWorldBorderForPlayer,
    isPlayerOutsideBorder,
};

const commandManager = {
    reloadCommands: initializeCommands,
    getAllRegisteredCommandNames,
};

const playerUtils = {
    debugLog,
    getString,
    notifyAdmins,
    playSoundForEvent,
    isAdmin,
    formatSessionDuration,
};

const rankManager = {
    getPlayerPermissionLevel,
    updatePlayerNametag,
    getPlayerRankFormattedChatElements,
};

const configValidator = {
    validateMainConfig,
    validateActionProfiles,
    validateAutoModConfig,
    validateRanksConfig,
};

const logManager = { addLog, persistLogCacheToDisk };
const reportManager = { persistReportsToDisk };
const tpaManager = { clearExpiredRequests, getRequestsInWarmup, checkPlayerMovementDuringWarmup, executeTeleport };
const chatProcessor = { processChatMessage };


export class DependencyManager {
    constructor() {
        this._dependencies = {};
        this.profilingData = {
            tickLoop: { totalTime: 0, count: 0, maxTime: 0, minTime: Infinity, history: [] },
            playerChecks: {},
            eventHandlers: {},
        };
        this.maxProfilingHistory = 100;
        this.currentTick = 0;
    }

    /**
     * Builds the dependency container.
     * @returns {object} The fully constructed dependency container.
     */
    build() {
        try {
            this._dependencies = {
                get config() { return configModule.editableConfigValues; },
                automodConfig,
                checkActionProfiles,
                currentTick: this.currentTick,
                playerDataManager,
                worldBorderManager,
                actionManager: { executeCheckAction },
                logManager,
                reportManager,
                tpaManager,
                commandManager,
                playerUtils,
                rankManager,
                permissionLevels,
                checks,
                configValidator,
                uiManager,
                ActionFormData: mcui.ActionFormData,
                MessageFormData: mcui.MessageFormData,
                ModalFormData: mcui.ModalFormData,
                system,
                ItemComponentTypes: mc.ItemComponentTypes,
                chatProcessor,
                editableConfig: configModule,
                profilingData: this.profilingData,
                maxProfilingHistory: this.maxProfilingHistory,
            };
            return this._dependencies;
        } catch (error) {
            console.error(`[${mainModuleName}._assembleDependencies CRITICAL] Error during assembly: ${error.stack || error}`);
            throw error;
        }
    }

    /**
     * Sets a dependency, allowing for overrides and mocking.
     * @param {string} name - The name of the dependency to set.
     * @param {*} value - The dependency to inject.
     */
    set(name, value) {
        this._dependencies[name] = value;
    }

    validateDependencies(callContext) {
        const mainContext = `[${mainModuleName}.validateDependencies from ${callContext}]`;
        const errors = [];
        const deps = this._dependencies;

        const dependencyChecks = {
            'playerDataManager.ensurePlayerDataInitialized': 'function',
            'playerUtils.debugLog': 'function',
            'playerUtils.getString': 'function',
            'actionManager.executeCheckAction': 'function',
            'configValidator.validateMainConfig': 'function',
            'chatProcessor.processChatMessage': 'function',
            'checks': 'object',
            'tpaManager.clearExpiredRequests': 'function',
        };

        if (!deps) {
            errors.push('CRITICAL: Dependencies object itself is null or undefined.');
        } else {
            for (const keyPath in dependencyChecks) {
                const expectedType = dependencyChecks[keyPath];
                const keys = keyPath.split('.');
                let current = deps;
                let path = '';
                for (const key of keys) {
                    path = path ? `${path}.${key}` : key;
                    if (current === null || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, key)) {
                        errors.push(`CRITICAL: deps.${path} is missing.`);
                        current = undefined;
                        break;
                    }
                    current = current[key];
                }

                if (current !== undefined && typeof current !== expectedType) {
                    errors.push(`CRITICAL: deps.${keyPath} is NOT a ${expectedType}.`);
                }
            }
        }

        if (errors.length > 0) {
            const fullErrorMessage = `${mainContext} Dependency validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`;
            console.error('!!!! CRITICAL DEPENDENCY VALIDATION FAILURE !!!!');
            console.error(fullErrorMessage);
            throw new Error(fullErrorMessage);
        }

        return true;
    }

    /**
     * @param {string} name The name of the dependency to retrieve.
     * @returns {any} The requested dependency.
     * @throws {Error} If the dependency is not found.
     */
    get(name) {
        if (Object.prototype.hasOwnProperty.call(this._dependencies, name)) {
            return this._dependencies[name];
        }
        throw new Error(`[${mainModuleName}] Dependency '${name}' not found.`);
    }

    /**
     * @returns {object} The dependencies object.
     */
    getAll() {
        return this._dependencies;
    }

    getDependenciesUnsafe() {
        return this._dependencies;
    }

    refreshDependencies() {
        this.build();
        this.validateDependencies('refreshDependencies');
        this.get('playerUtils').debugLog('Dependencies refreshed.', 'System', this.getAll());
    }

    updateCurrentTick(tick) {
        this.currentTick = tick;
        if (this._dependencies) {
            this._dependencies.currentTick = tick;
        }
    }
}
