// This file is a barrel, re-exporting all utility functions for easy access.

import {
    calculateRelativeBlockBreakingPower,
    getOptimalToolForBlock,
    getExpectedBreakTicks,
} from './itemUtils.js';

import {
    getString,
    isAdmin,
    warnPlayer,
    formatDimensionName,
    notifyAdmins,
    log,
    logError,
    debugLog,
    findPlayer,
    parseDuration,
    formatSessionDuration,
    formatTimeDifference,
    playSoundForEvent,
    parsePlayerAndReasonArgs,
    validateCommandTarget,
} from './playerUtils.js';

import {
    isPlayerOutsideBorder,
    getBorderSettings,
    saveBorderSettings,
    processWorldBorderResizing,
    enforceWorldBorderForPlayer,
    clearBorderSettings,
} from './worldBorderManager.js';

import {
    isNetherLocked,
    setNetherLocked,
    isEndLocked,
    setEndLocked,
} from './worldStateUtils.js';

export {
    // from itemUtils
    calculateRelativeBlockBreakingPower,
    getOptimalToolForBlock,
    getExpectedBreakTicks,

    // from playerUtils
    getString,
    isAdmin,
    warnPlayer,
    formatDimensionName,
    notifyAdmins,
    log,
    logError,
    debugLog,
    findPlayer,
    parseDuration,
    formatSessionDuration,
    formatTimeDifference,
    playSoundForEvent,
    parsePlayerAndReasonArgs,
    validateCommandTarget,

    // from worldBorderManager
    isPlayerOutsideBorder,
    getBorderSettings,
    saveBorderSettings,
    processWorldBorderResizing,
    enforceWorldBorderForPlayer,
    clearBorderSettings,

    // from worldStateUtils
    isNetherLocked,
    setNetherLocked,
    isEndLocked,
    setEndLocked,
};
